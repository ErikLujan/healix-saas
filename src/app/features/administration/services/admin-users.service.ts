import { inject, Injectable, signal, OnDestroy } from '@angular/core';
import { createClient } from '@supabase/supabase-js';
import { SupabaseService } from '@core/services/supabase.service';
import { environment } from '@env/environment';
import { toast } from 'ngx-sonner';

/**
 * Modelo de usuario administrativo retornado por la consulta
 * unificada de profiles con sus tablas de extension (pacientes,
 * especialistas, administradores).
 */
export interface AdminUser {
  id: string;
  email: string;
  full_name: string;
  avatar_url: string | null;
  role: string;
  created_at: string;
  pacientes: { dni: string; edad: number; obra_social: string } | null;
  especialistas: { dni: string; edad: number; is_approved: boolean } | null;
  administradores: { dni: string; edad: number } | null;
}

/**
 * Servicio de gestion de usuarios del panel administrativo.
 *
 * Responsable de cargar, aprobar, rechazar y crear usuarios
 * desde la vista de administracion. Utiliza suscripciones
 * Realtime de Supabase para mantener la grilla sincronizada
 * en tiempo real entre multiples dispositivos.
 */
@Injectable({ providedIn: 'root' })
export class AdminUsersService implements OnDestroy {
  private readonly supabase = inject(SupabaseService);

  readonly users = signal<AdminUser[]>([]);
  readonly isLoading = signal(false);

  private readonly channel = this.supabase.supabase
    .channel('admin-users-realtime')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => this.loadUsers())
    .on('postgres_changes', { event: '*', schema: 'public', table: 'especialistas' }, () => this.loadUsers())
    .on('postgres_changes', { event: '*', schema: 'public', table: 'pacientes' }, () => this.loadUsers())
    .on('postgres_changes', { event: '*', schema: 'public', table: 'administradores' }, () => this.loadUsers())
    .subscribe();

  ngOnDestroy(): void {
    this.supabase.supabase.removeChannel(this.channel);
  }

  /**
   * Consulta la tabla profiles conJOINs a las tablas de extension
   * y actualiza la signal users con el resultado completo.
   */
  async loadUsers(): Promise<void> {
    this.isLoading.set(true);

    const { data, error } = await this.supabase.supabase
      .from('profiles')
      .select('*, pacientes(*), especialistas(*), administradores(*)')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[AdminUsersService] loadUsers error:', error.message);
      toast.error('Error al cargar los usuarios');
      this.isLoading.set(false);
      return;
    }

    this.users.set(data as AdminUser[]);
    this.isLoading.set(false);
  }

  /**
   * Habilita el acceso de un especialista configurando is_approved a true.
   * Actualiza la signal local para reflejar el cambio sin recargar.
   *
   * @param userId Identificador del especialista a aprobar.
   */
  async approveSpecialist(userId: string): Promise<void> {
    const { error } = await this.supabase.supabase
      .from('especialistas')
      .update({ is_approved: true })
      .eq('id', userId);

    if (error) {
      console.error('[AdminUsersService] approve error:', error.message);
      toast.error('Error al aprobar al especialista');
      return;
    }

    this.users.update(list =>
      list.map(u =>
        u.id === userId && u.especialistas
          ? { ...u, especialistas: { ...u.especialistas, is_approved: true } }
          : u,
      ),
    );
    toast.success('Especialista aprobado correctamente');
  }

  /**
   * Deniega el acceso de un especialista configurando is_approved a false.
   * Actualiza la signal local para reflejar el cambio sin recargar.
   *
   * @param userId Identificador del especialista a rechazar.
   */
  async rejectSpecialist(userId: string): Promise<void> {
    const { error } = await this.supabase.supabase
      .from('especialistas')
      .update({ is_approved: false })
      .eq('id', userId);

    if (error) {
      console.error('[AdminUsersService] reject error:', error.message);
      toast.error('Error al rechazar al especialista');
      return;
    }

    this.users.update(list =>
      list.map(u =>
        u.id === userId && u.especialistas
          ? { ...u, especialistas: { ...u.especialistas, is_approved: false } }
          : u,
      ),
    );
    toast.success('Especialista rechazado');
  }

  /**
   * Crea un nuevo usuario administrador utilizando un cliente Supabase
   * aislado (tempClient) para evitar que el signUp muta la sesion del
   * administrador activo. El trigger de PostgreSQL crea la fila base
   * en administradores con dni/edad NULL, y este metodo los sobrescribe
   * mediante .update() usando el cliente principal con permisos RLS.
   *
   * @param email Correo electronico unico para la cuenta.
   * @param password Contrasena minima de 8 caracteres.
   * @param fullName Nombre completo del administrador.
   * @param dni Numero de documento de identidad.
   * @param edad Edad del administrador.
   * @param avatarDataUrl Data URL de la imagen recortada del perfil.
   */
  async createAdmin(
    email: string,
    password: string,
    fullName: string,
    dni: string,
    edad: number,
    avatarDataUrl: string | null,
  ): Promise<void> {
    const tempClient = createClient(environment.supabaseUrl, environment.supabaseKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
        storage: {
          getItem: () => null,
          setItem: () => {},
          removeItem: () => {},
        },
      },
    });

    const { data, error: signUpError } = await tempClient.auth.signUp({
      email,
      password,
      options: {
        data: {
          role: 'administrador',
          full_name: fullName,
        },
      },
    });

    if (signUpError || !data?.user?.id) {
      throw new Error(signUpError?.message ?? 'No se pudo crear el usuario');
    }

    const userId = data.user.id;

    if (avatarDataUrl) {
      const response = await fetch(avatarDataUrl);
      const blob = await response.blob();
      const filePath = `${userId}/avatar.png`;

      const { error: uploadError } = await tempClient.storage
        .from('user-profiles')
        .upload(filePath, blob, { contentType: 'image/png', upsert: true });

      if (uploadError) {
        throw new Error(uploadError.message);
      }

      const { data: urlData } = tempClient.storage
        .from('user-profiles')
        .getPublicUrl(filePath);

      await tempClient
        .from('profiles')
        .update({ avatar_url: urlData.publicUrl })
        .eq('id', userId);
    }

    const { error: updateError } = await this.supabase.supabase
      .from('administradores')
      .update({
        dni,
        edad: Number(edad),
      })
      .eq('id', userId);

    if (updateError) {
      throw new Error(updateError.message);
    }

    toast.success('Administrador creado exitosamente');
    await this.loadUsers();
  }
}
