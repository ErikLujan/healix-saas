import { Injectable, inject } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { toast } from 'ngx-sonner';

export interface Specialty {
  id: string;
  name: string;
}

export interface PatientRegistrationData {
  userId: string;
  dni: string;
  edad: number;
  obraSocial: string;
  frontalDataUrl: string;
  secondaryDataUrl: string;
}

export interface SpecialistRegistrationData {
  userId: string;
  dni: string;
  edad: number;
  profileDataUrl: string;
  specialtyIds: string[];
}

/**
 * Tamaño máximo de imagen de registro permitido (2 MB).
 * Las imágenes provienen del recortador y se suben como PNG.
 */
const TAMANO_MAXIMO_REGISTRO_BYTES = 2 * 1024 * 1024;

/**
 * Gestiona el registro complementario de pacientes y especialistas.
 *
 * Completa las tablas relacionales y el almacenamiento de imágenes
 * posteriores al alta en Supabase Auth. Ante un fallo revierte
 * la sesión para evitar cuentas parciales.
 */
@Injectable({ providedIn: 'root' })
export class RegistrationService {
  private readonly supabase = inject(SupabaseService);

  /**
   * Obtiene las especialidades activas disponibles para el registro.
   *
   * @returns Lista de especialidades activas ordenadas por nombre.
   */
  async getActiveSpecialties(): Promise<Specialty[]> {
    const { data, error } = await this.supabase.supabase
      .from('specialties')
      .select('id, name')
      .eq('is_active', true)
      .order('name');

    if (error || !data) return [];
    return data as Specialty[];
  }

  /**
   * Registra los datos complementarios del paciente y sus imágenes.
   *
   * @param data Datos de registro del paciente con URLs de imágenes.
   * @returns Objeto con el mensaje de error o null si el registro fue exitoso.
   */
  async registerPatient(data: PatientRegistrationData): Promise<{ error: string | null }> {
    try {
      const [frontalUrl, secondaryUrl] = await Promise.all([
        this.uploadImage(data.userId, 'frontal', data.frontalDataUrl),
        this.uploadImage(data.userId, 'secundario', data.secondaryDataUrl),
      ]);

      const { error: pacientesError } = await this.supabase.supabase
        .from('pacientes')
        .update({ avatar_url_frontal: frontalUrl, avatar_url_secundario: secondaryUrl })
        .eq('id', data.userId);

      if (pacientesError) {
        await this.rollbackRegistration();
        return { error: 'Error al guardar la foto de perfil. La sesión ha sido cerrada.' };
      }

      const { error: profileError } = await this.supabase.supabase
        .from('profiles')
        .update({ avatar_url: frontalUrl })
        .eq('id', data.userId);

      if (profileError) {
        await this.rollbackRegistration();
        return { error: 'Error al actualizar el perfil. La sesión ha sido cerrada.' };
      }

      return { error: null };
    } catch {
      await this.rollbackRegistration();
      return { error: 'Error al procesar el registro. La sesión ha sido cerrada.' };
    }
  }

  /**
   * Registra los datos complementarios del especialista y vincula sus especialidades.
   *
   * @param data Datos de registro del especialista con especialidades seleccionadas.
   * @returns Objeto con el mensaje de error o null si el registro fue exitoso.
   */
  async registerSpecialist(data: SpecialistRegistrationData): Promise<{ error: string | null }> {
    try {
      let avatarUrl: string;
      try {
        avatarUrl = await this.uploadImage(data.userId, 'avatar', data.profileDataUrl);
      } catch {
        await this.rollbackRegistration();
        return { error: 'Error al subir la foto de perfil. La sesión ha sido cerrada.' };
      }

      const { error: profileError } = await this.supabase.supabase
        .from('profiles')
        .update({ avatar_url: avatarUrl })
        .eq('id', data.userId);

      if (profileError) {
        await this.rollbackRegistration();
        return { error: 'Error al actualizar el perfil. La sesión ha sido cerrada.' };
      }

      const { error: especialistaError } = await this.supabase.supabase
        .from('especialistas')
        .update({ dni: data.dni, edad: data.edad })
        .eq('id', data.userId);

      if (especialistaError) {
        await this.rollbackRegistration();
        return { error: 'Error al guardar los datos del especialista. La sesión ha sido cerrada.' };
      }

      const { data: { session } } = await this.supabase.supabase.auth.getSession();

      if (!session) {
        return { error: '__EMAIL_CONFIRMATION__' };
      }

      const { error: specialtyError } = await this.linkSpecialties(data.userId, data.specialtyIds);

      if (specialtyError) {
        await this.rollbackRegistration();
        return { error: 'Error al vincular las especialidades. La sesión ha sido cerrada.' };
      }

      return { error: null };
    } catch {
      await this.rollbackRegistration();
      return { error: 'Error inesperado al completar el registro. La sesión ha sido cerrada.' };
    }
  }

  private async linkSpecialties(userId: string, specialtyIds: string[]): Promise<{ error: string | null }> {
    if (!specialtyIds || specialtyIds.length === 0) {
      return { error: 'Debe seleccionar al menos una especialidad.' };
    }

    const results = await Promise.all(
      specialtyIds.map(specialtyId =>
        this.supabase.supabase.from('especialista_especialidad').insert({
          especialista_id: userId,
          especialidad_id: specialtyId,
        }),
      ),
    );

    const errors = results.filter(r => r.error);
    if (errors.length > 0) {
      return { error: 'Error al vincular las especialidades.' };
    }

    return { error: null };
  }

  private async uploadImage(userId: string, type: string, dataUrl: string): Promise<string> {
    const response = await fetch(dataUrl);
    const blob = await response.blob();

    if (blob.size === 0 || blob.size > TAMANO_MAXIMO_REGISTRO_BYTES) {
      throw new Error('La imagen debe pesar entre 1 byte y 2MB.');
    }

    if (!blob.type.startsWith('image/') || blob.type.includes('svg')) {
      throw new Error('Formato de imagen no soportado. Use JPG, PNG o WEBP.');
    }

    const filePath = `${userId}/${type}.png`;

    const { error: uploadError } = await this.supabase.supabase.storage
      .from('user-profiles')
      .upload(filePath, blob, { contentType: 'image/png', upsert: true });

    if (uploadError) {
      throw new Error('No fue posible subir la imagen. Por favor, intenta nuevamente.');
    }

    const { data: urlData } = this.supabase.supabase.storage
      .from('user-profiles')
      .getPublicUrl(filePath);

    return urlData.publicUrl;
  }

  /**
   * Revierte un registro fallido cerrando la sesión del usuario.
   * Evita cuentas parciales en Supabase Auth cuando fallan
   * las inserciones relacionales posteriores al alta inicial.
   */
  private async rollbackRegistration(): Promise<void> {
    try {
      await this.supabase.supabase.auth.signOut();
      toast.error('La sesión ha sido cerrada debido a un error en el registro. Intenta nuevamente.');
    } catch {
      toast.error('No fue posible cerrar la sesion. Por favor, recarga la pagina.');
    }
  }
}
