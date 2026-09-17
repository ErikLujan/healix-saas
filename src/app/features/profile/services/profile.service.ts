import { inject, Injectable, signal } from '@angular/core';
import { SupabaseService } from '@core/services/supabase.service';
import { AuthService } from '@core/services/auth.service';
import {
  DatosRol,
  EspecialidadPerfil,
  ProfileUpdatePayload,
} from '../models/profile.model';

/**
 * Tipos MIME de imagen permitidos para avatares de perfil.
 * Se excluye SVG por su capacidad de portar scripts ejecutables.
 */
const TIPOS_AVATAR_PERMITIDOS: readonly string[] = ['image/jpeg', 'image/png', 'image/webp'];

/** Tamaño máximo de avatar permitido (2 MB). */
const TAMANO_MAXIMO_AVATAR_BYTES = 2 * 1024 * 1024;

/**
 * Extensiones de archivo permitidas para avatares, como segunda
 * barrera junto a la validación del tipo MIME declarado.
 */
const EXTENSIONES_AVATAR_PERMITIDAS: readonly string[] = ['jpg', 'jpeg', 'png', 'webp'];

/**
 * Servicio de datos dedicado a la funcionalidad de perfil.
 *
 * Centraliza las interacciones con Supabase para la gestión del perfil:
 * obtención de datos por rol, actualización de perfil, subida de
 * avatares y consultas de especialidades. Los componentes nunca deben
 * llamar directamente a Supabase; este servicio es la única fuente de verdad.
 */
@Injectable({ providedIn: 'root' })
export class ProfileService {
  private readonly supabase = inject(SupabaseService);
  private readonly authService = inject(AuthService);

  /** Datos extendidos según el rol (DNI, edad, obra social, etc.). */
  readonly datosRol = signal<DatosRol | null>(null);

  /** Especialidades vinculadas al especialista actual. */
  readonly especialidades = signal<readonly EspecialidadPerfil[]>([]);

  /**
   * Resuelve la tabla hija segun el rol del usuario.
   * Patient → pacientes, Specialist → especialistas, Admin → administradores.
   * El retorno es una union literal para conservar el tipado de Supabase.
   */
  private get tablaRol(): 'pacientes' | 'especialistas' | 'administradores' {
    const rol = this.authService.userRole();
    if (rol === 'paciente') return 'pacientes';
    if (rol === 'especialista') return 'especialistas';
    return 'administradores';
  }

  /**
   * Obtiene los datos extendidos del rol desde su tabla hija.
   *
   * Selecciona únicamente las columnas válidas según el rol para evitar
   * errores 400 de PostgREST: `pacientes` posee obra social y avatares,
   * `especialistas` posee aprobación y `administradores` solo dni y edad.
   *
   * El ID del usuario se obtiene directamente de la sesion activa.
   * @throws Error si la consulta falla.
   */
  async cargarDatosRol(): Promise<void> {
    const user = this.authService.currentUser();
    if (!user) {
      throw new Error('No hay usuario autenticado.');
    }

    const rol = this.authService.userRole();
    let columnas = 'dni, edad';
    if (rol === 'paciente') {
      columnas = 'dni, edad, obra_social, avatar_url_frontal, avatar_url_secundario';
    } else if (rol === 'especialista') {
      columnas = 'dni, edad, is_approved';
    }

    const { data, error } = await this.supabase.supabase
      .from(this.tablaRol)
      .select(columnas)
      .eq('id', user.id)
      .maybeSingle();

    if (error || !data) {
      throw new Error('No se pudieron cargar los datos del perfil.');
    }

    const row = data as unknown as Record<string, unknown>;
    this.datosRol.set({
      dni: row['dni'] as string,
      edad: row['edad'] as number,
      obra_social: row['obra_social'] as string | undefined,
      avatar_url_frontal: row['avatar_url_frontal'] as string | null | undefined,
      avatar_url_secundario: row['avatar_url_secundario'] as string | null | undefined,
      is_approved: row['is_approved'] as boolean | undefined,
    });
  }

  /**
   * Obtiene las especialidades vinculadas al especialista actual mediante la tabla intermedia.
   * El ID del usuario se obtiene directamente de la sesión activa.
   */
  async cargarEspecialidades(): Promise<void> {
    const user = this.authService.currentUser();
    if (!user) {
      throw new Error('No hay usuario autenticado.');
    }

    const { data: joinData, error: joinError } = await this.supabase.supabase
      .from('especialista_especialidad')
      .select('especialidad_id')
      .eq('especialista_id', user.id);

    if (joinError) {
      throw new Error('No se pudieron cargar las especialidades vinculadas.');
    }

    if (!joinData?.length) {
      this.especialidades.set([]);
      return;
    }

    const ids = joinData.map((j: Record<string, unknown>) => j['especialidad_id'] as string);

    const { data: specialtiesData, error: specError } = await this.supabase.supabase
      .from('specialties')
      .select('id, name')
      .in('id', ids)
      .eq('is_active', true);

    if (specError) {
      throw new Error('No se pudieron cargar las especialidades.');
    }

    this.especialidades.set(
      Object.freeze(
        (specialtiesData ?? []).map((e: Record<string, unknown>) => ({
          id: e['id'] as string,
          name: e['name'] as string,
        })),
      ),
    );
  }

  /**
   * Actualiza el nombre del perfil del usuario en la tabla profiles.
   * Los cambios de correo se excluyen intencionalmente y deben
   * gestionarse mediante Supabase Auth para mantener la consistencia.
   * El ID del usuario se obtiene directamente de la sesión activa.
   *
   * @param payload Datos de actualización (solo full_name).
   */
  async actualizarPerfil(payload: ProfileUpdatePayload): Promise<void> {
    const user = this.authService.currentUser();
    if (!user) {
      throw new Error('No hay usuario autenticado.');
    }

    const { error } = await this.supabase.supabase
      .from('profiles')
      .update({ full_name: payload.full_name })
      .eq('id', user.id);

    if (error) {
      throw new Error('No se pudieron guardar los cambios.');
    }

    this.authService.updateUserProfile({ full_name: payload.full_name });
  }

  /**
   * Sube una nueva imagen de avatar a Supabase Storage y actualiza
   * tanto la url principal del perfil como el slot activo correspondiente
   * (avatar_url_frontal o avatar_url_secundario) en la tabla de pacientes.
   *
   * Detecta automaticamente que slot esta activo comparando la url actual
   * del perfil con las url de los slots, ignorando parametros de cache-busting.
   * Agrega un parametro de cache-busting unico a la url publica resultante.
   *
   * El ID del usuario se obtiene directamente de la sesion activa.
   *
   * @param file El archivo de imagen a subir.
   * @returns La URL publica con cache-busting del avatar subido.
   */
  async subirAvatar(file: File): Promise<string> {
    this.validarArchivoAvatar(file);

    const user = this.authService.currentUser();
    if (!user) {
      throw new Error('No hay usuario autenticado.');
    }

    const userId = user.id;
    const extension = this.resolverExtensionSegura(file);
    const filePath = `${userId}/${Date.now()}_avatar.${extension}`;

    const { error: uploadError } = await this.supabase.supabase.storage
      .from('user-profiles')
      .upload(filePath, file, { upsert: true });

    if (uploadError) {
      throw new Error('No se pudo subir la imagen. Intenta nuevamente.');
    }

    const { data: urlData } = this.supabase.supabase.storage
      .from('user-profiles')
      .getPublicUrl(filePath);

    const cacheBust = `?t=${Date.now()}`;
    const publicUrl = `${urlData.publicUrl}${cacheBust}`;

    const slotActivo = await this.detectarSlotActivo(userId, publicUrl);

    const { error: updateError } = await this.supabase.supabase
      .from('profiles')
      .update({ avatar_url: publicUrl })
      .eq('id', userId);

    if (updateError) {
      throw new Error('No se pudo actualizar la foto de perfil.');
    }

    if (this.authService.userRole() === 'paciente') {
      const pacienteUpdate: { avatar_url_frontal?: string; avatar_url_secundario?: string } = slotActivo === 'secundario'
        ? { avatar_url_secundario: publicUrl }
        : { avatar_url_frontal: publicUrl };

      const { error: slotError } = await this.supabase.supabase
        .from('pacientes')
        .update(pacienteUpdate)
        .eq('id', userId);

      if (slotError) {
        throw new Error('No se pudo actualizar el slot de avatar del paciente.');
      }
    }

    this.authService.updateUserProfile({ avatar_url: publicUrl });
    return publicUrl;
  }

  /**
   * Valida el archivo de avatar antes de subirlo al Storage.
   *
   * Rechaza tipos MIME fuera de la lista permitida, extensiones no
   * coincidentes, archivos vacíos y archivos mayores a 2 MB. La
   * validación del servidor (RLS de Storage) sigue siendo el control
   * autoritativo; esta barrera evita tráfico malicioso evidente.
   *
   * @param file Archivo de imagen seleccionado por el usuario.
   * @throws Error con mensaje genérico si el archivo no es válido.
   */
  private validarArchivoAvatar(file: File): void {
    const extension = file.name.split('.').pop()?.toLowerCase() ?? '';
    const mimeValido = TIPOS_AVATAR_PERMITIDOS.includes(file.type);
    const extensionValida = (EXTENSIONES_AVATAR_PERMITIDAS as readonly string[]).includes(extension);

    if (!mimeValido || !extensionValida) {
      throw new Error('Formato de imagen no soportado. Use JPG, PNG o WEBP.');
    }

    if (file.size === 0 || file.size > TAMANO_MAXIMO_AVATAR_BYTES) {
      throw new Error('La imagen debe pesar entre 1 byte y 2MB.');
    }
  }

  /**
   * Resuelve una extensión de archivo segura a partir del MIME validado.
   *
   * Nunca reutiliza la extensión original sin validar, evitando
   * nombres con doble extensión o tipos camuflados.
   *
   * @param file Archivo de imagen ya validado.
   * @returns Extensión normalizada sin punto.
   */
  private resolverExtensionSegura(file: File): string {
    if (file.type === 'image/png') return 'png';
    if (file.type === 'image/webp') return 'webp';
    return 'jpg';
  }

  /**
   * Detecta que slot de avatar esta activo para el usuario.
   * Compara la url actual del perfil con las url de los slots,
   * ignorando parametros de cache-busting (query strings).
   *
   * @param userId El ID del usuario.
   * @param newUrl La nueva url del avatar (para determinar slot si es primer upload).
   * @returns El tipo de slot activo ('frontal' | 'secundario').
   */
  private async detectarSlotActivo(userId: string, newUrl: string): Promise<'frontal' | 'secundario'> {
    const { data } = await this.supabase.supabase
      .from('pacientes')
      .select('avatar_url_frontal, avatar_url_secundario')
      .eq('id', userId)
      .maybeSingle();

    if (!data) return 'frontal';

    const row = data as Record<string, unknown>;
    const frontalUrl = (row['avatar_url_frontal'] as string | null) ?? '';
    const secundarioUrl = (row['avatar_url_secundario'] as string | null) ?? '';

    const perfilActual = this.authService.userProfile();
    const currentAvatar = perfilActual?.avatar_url ?? '';
    const cleanCurrent = this.stripCacheBust(currentAvatar);
    const cleanSecundario = this.stripCacheBust(secundarioUrl);

    if (cleanCurrent && cleanSecundario && cleanCurrent === cleanSecundario) {
      return 'secundario';
    }

    if (!frontalUrl && secundarioUrl) {
      return 'secundario';
    }

    return 'frontal';
  }

  /**
   * Elimina parametros de query string de una URL para comparaciones limpias.
   *
   * @param url La URL original.
   * @returns La URL sin parametros de query.
   */
  private stripCacheBust(url: string): string {
    try {
      const parsed = new URL(url);
      parsed.search = '';
      return parsed.toString();
    } catch {
      const idx = url.indexOf('?');
      return idx >= 0 ? url.substring(0, idx) : url;
    }
  }

  /**
   * Establece un avatar de documento como avatar principal del paciente.
   * El ID del usuario se obtiene directamente de la sesion activa.
   *
   * @param avatarUrl La URL publica del avatar seleccionado.
   * @param tipo Tipo de avatar ('frontal' | 'secundario').
   */
  async actualizarAvatarPrincipal(avatarUrl: string, tipo: 'frontal' | 'secundario'): Promise<void> {
    const user = this.authService.currentUser();
    if (!user) {
      throw new Error('No hay usuario autenticado.');
    }

    const { error } = await this.supabase.supabase
      .from('profiles')
      .update({ avatar_url: avatarUrl })
      .eq('id', user.id);

    if (error) {
      throw new Error('No se pudo actualizar el avatar principal.');
    }

    this.authService.updateUserProfile({ avatar_url: avatarUrl });
  }
}
