import { computed, Injectable, signal } from '@angular/core';
import { Router } from '@angular/router';
import { User, AuthError } from '@supabase/supabase-js';
import { SupabaseService } from './supabase.service';
import { toast } from 'ngx-sonner';
import { Database } from '../models/database.types';

/** Tipos de rol disponibles en el sistema clínico. */
export type UserRole = 'paciente' | 'especialista' | 'administrador';

/**
 * Perfil básico del usuario extraído de la tabla public.profiles.
 * Representa los datos mínimos necesarios para la capa de presentación.
 */
export interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  avatar_url: string | null;
  role: UserRole;
}

/**
 * Servicio central de autenticación y gestión de sesión.
 *
 * Responsable del ciclo de vida completo del usuario autenticado:
 * restauración de sesión, inicio/registro/cierre, y sincronización
 * del perfil desde Supabase Auth hacia la tabla public.profiles.
 *
 * Expone Signals reactivas para que Guards y componentes consuman
 * el estado de autenticación sin acoplarse al SDK de Supabase.
 */
@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly currentUserSignal = signal<User | null>(null);
  private readonly userProfileSignal = signal<UserProfile | null>(null);
  private readonly isLoadingSignal = signal(true);
  private readonly isAuthReadySignal = signal(false);

  private sessionReadyResolve: (() => void) | null = null;

  readonly currentUser = this.currentUserSignal.asReadonly();
  readonly userProfile = this.userProfileSignal.asReadonly();
  readonly isLoading = this.isLoadingSignal.asReadonly();
  readonly isAuthReady = this.isAuthReadySignal.asReadonly();
  readonly isAuthenticated = computed(() => !!this.currentUserSignal());
  readonly userRole = computed(() => this.userProfileSignal()?.role ?? null);

  /**
   * Promesa que se resuelve cuando Supabase ha completado la recuperación
   * inicial de la sesión. Los Guards deben esperar esta señal antes de
   * tomar decisiones de redireccionamiento, evitando carreras de tiempo
   * en refrescos de página donde la sesión aún no está disponible.
   */
  readonly sessionReady: Promise<void> = new Promise(resolve => {
    this.sessionReadyResolve = resolve;
  });

  constructor(
    private readonly supabase: SupabaseService,
    private readonly router: Router,
  ) {
    this.initializeSession();
  }

  /**
   * Restaura la sesión desde el Storage local de Supabase y configura
   * el listener de cambios de autenticación. Resuelve sessionReady
   * independientemente del resultado para desbloquear los Guards.
   *
   * Se ignora el evento INITIAL_SESSION para evitar consultas
   * fantasma con tokens potencialmente obsoletos en recargas de página.
   * Solo se carga el perfil cuando el evento es SIGNED_IN o
   * TOKEN_REFRESHED con una sesión activa confirmada.
   */
  private async initializeSession(): Promise<void> {
    try {
      const { data: { session } } = await this.supabase.supabase.auth.getSession();

      if (session?.user) {
        this.currentUserSignal.set(session.user);
        await this.loadUserProfile(session.user.id);
      }

      this.supabase.supabase.auth.onAuthStateChange(async (event, session) => {
        if (event === 'INITIAL_SESSION') {
          this.isLoadingSignal.set(false);
          return;
        }

        if (session?.user) {
          this.currentUserSignal.set(session.user);
          await this.loadUserProfile(session.user.id);
        } else {
          this.currentUserSignal.set(null);
          this.userProfileSignal.set(null);
        }
        this.isLoadingSignal.set(false);
      });
    } catch {
      this.currentUserSignal.set(null);
      this.userProfileSignal.set(null);
      this.isLoadingSignal.set(false);
    } finally {
      this.isLoadingSignal.set(false);
      this.isAuthReadySignal.set(true);
      this.sessionReadyResolve?.();
    }
  }

  /**
   * Consulta la tabla public.profiles para obtener el perfil completo
   * del usuario y poblar userProfileSignal con los datos de rol.
   *
   * @param userId Identificador único del usuario autenticado en Auth.
   */
  private async loadUserProfile(userId: string): Promise<void> {
    const { data, error } = await this.supabase.supabase
      .from('profiles')
      .select('id, email, full_name, avatar_url, role')
      .eq('id', userId)
      .maybeSingle();

    if (error || !data) {
      return;
    }

    const profile = data as Database['public']['Tables']['profiles']['Row'];

    this.userProfileSignal.set({
      id: profile.id,
      email: profile.email,
      full_name: profile.full_name,
      avatar_url: profile.avatar_url,
      role: profile.role,
    });
  }

  /**
   * Inicia sesión con correo y contraseña mediante Supabase Auth.
   * Sincroniza el perfil local y registra el acceso en la auditoría.
   *
   * @param email Correo electrónico de la cuenta.
   * @param password Contraseña de la cuenta.
   * @returns Objeto con el error de autenticación o null si el acceso fue exitoso.
   */
  async signIn(email: string, password: string): Promise<{ error: AuthError | null }> {
    const { data, error } = await this.supabase.supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      const message = this.mapAuthError(error.message);
      toast.error(message);
      return { error };
    }

    if (data.user) {
      this.currentUserSignal.set(data.user);
      await this.loadUserProfile(data.user.id);
      this.registrarAcceso(data.user.id);
    }

    return { error: null };
  }

  /**
   * Registra un nuevo usuario en Supabase Auth con metadatos de perfil.
   * El trigger handle_new_user_sync popula las tablas de extensión
   * (profiles, pacientes/especialistas/administradores) automáticamente.
   *
   * Los roles permitidos para auto-registro son exclusivamente
   * 'paciente' y 'especialista'. Cualquier intento de inyectar
   * un rol administrativo es rechazado en el cliente.
   *
   * @param email Correo electrónico único para la cuenta.
   * @param password Contraseña mínima de 8 caracteres.
   * @param metadata Metadatos del perfil (role, full_name, dni, edad, etc.).
   * @returns Identificador del usuario creado o error en caso de fallo.
   */
  async signUp(email: string, password: string, metadata: Record<string, unknown>): Promise<{ userId: string | null; error: AuthError | null }> {
    const rolesPermitidos: readonly UserRole[] = ['paciente', 'especialista'];
    const rolSolicitado = metadata['role'];

    if (typeof rolSolicitado !== 'string' || !rolesPermitidos.includes(rolSolicitado as UserRole)) {
      toast.error('No fue posible completar el registro. Rol no valido.');
      return { userId: null, error: null };
    }

    const metadataSegura: Record<string, unknown> = { ...metadata, role: rolSolicitado };

    const { data, error } = await this.supabase.supabase.auth.signUp({
      email,
      password,
      options: { data: metadataSegura },
    });

    if (error) {
      const message = this.mapAuthError(error.message);
      toast.error(message);
      return { userId: null, error };
    }

    return { userId: data.user?.id ?? null, error: null };
  }

  /**
   * Cierra la sesión activa, limpia el estado local y redirige
   * al usuario a la pantalla de autenticación.
   */
  async signOut(): Promise<void> {
    await this.supabase.supabase.auth.signOut();
    this.currentUserSignal.set(null);
    this.userProfileSignal.set(null);
    this.router.navigate(['/autenticacion']);
  }

  /**
   * Verifica si el especialista actual se encuentra aprobado
   * por un administrador. Utilizado por specialistApprovalGuard
   * para bloquear el acceso a especialistas no habilitados.
   *
   * @returns true si esta aprobado, false si no, null si no hay usuario.
   */
  async getSpecialistApprovalStatus(): Promise<boolean | null> {
    const user = this.currentUserSignal();
    if (!user) return null;

    const { data } = await this.supabase.supabase
      .from('especialistas')
      .select('is_approved')
      .eq('id', user.id)
      .maybeSingle();

    if (!data) return null;

    const specialist = data as Database['public']['Tables']['especialistas']['Row'];
    return specialist.is_approved;
  }

  /**
   * Verifica si el paciente actual se encuentra verificado.
   * Utilizado por patientVerificationGuard para bloquear el acceso
   * a pacientes que no han completado la verificacion de cuenta.
   *
   * @returns true si esta verificado, false si no, null si no hay usuario o no es paciente.
   */
  async getPatientVerificationStatus(): Promise<boolean | null> {
    const user = this.currentUserSignal();
    if (!user) return null;

    if (this.userProfileSignal()?.role !== 'paciente') return null;

    const { data } = await this.supabase.supabase
      .from('pacientes')
      .select('is_verified')
      .eq('id', user.id)
      .maybeSingle();

    if (!data) return null;

    const patient = data as Database['public']['Tables']['pacientes']['Row'];
    return patient.is_verified;
  }

  /**
   * Actualiza el signal local de perfil con datos parciales.
   * Es el único método público para modificar el estado del perfil;
   * los componentes nunca deben acceder directamente al signal interno.
   *
   * @param updates Campos parciales del perfil a fusionar con el perfil actual.
   */
  updateUserProfile(updates: Partial<Pick<UserProfile, 'full_name' | 'avatar_url' | 'email'>>): void {
    const current = this.userProfileSignal();
    if (!current) return;
    this.userProfileSignal.set({ ...current, ...updates });
  }

  /**
   * Actualiza la contraseña del usuario autenticado mediante Supabase Auth.
   *
   * @param newPassword Nueva contraseña a establecer (mínimo 6 caracteres).
   * @returns Objeto con el error si la operación falló.
   */
  async updatePassword(newPassword: string): Promise<{ error: AuthError | null }> {
    const { error } = await this.supabase.supabase.auth.updateUser({
      password: newPassword,
    });

    if (error) {
      const message = this.mapAuthError(error.message);
      toast.error(message);
      return { error };
    }

    return { error: null };
  }

  /**
   * Reenvía el enlace de verificación al usuario autenticado actual.
   * Se utiliza para pacientes no verificados en la pantalla de espera de aprobación.
   *
   * @returns Objeto con el error si la operación falló.
   */
  async resendVerificationEmail(): Promise<{ error: AuthError | null }> {
    const user = this.currentUserSignal();
    if (!user?.email) {
      toast.error('No se pudo reenviar el correo. Inicia sesion nuevamente.');
      return { error: null };
    }

    const { error } = await this.supabase.supabase.auth.resend({
      type: 'signup',
      email: user.email,
    });

    if (error) {
      const message = this.mapAuthError(error.message);
      toast.error(message);
      return { error };
    }

    toast.success('Correo de verificacion reenviado. Revisa tu bandeja de entrada.');
    return { error: null };
  }

  /**
   * Transforma los mensajes de error técnicos de Supabase Auth
   * en mensajes comprensibles para el usuario final en español.
   *
   * @param errorMessage Mensaje original devuelto por Supabase.
   * @returns Mensaje amigable traducido al español.
   */
  private mapAuthError(errorMessage: string): string {
    const errorMap: Record<string, string> = {
      'Correo o contraseña incorrectos': 'Correo o contraseña incorrectos',
      'User not found': 'No existe una cuenta con este correo electrónico',
      'Email not confirmed': 'Por favor confirma tu correo electrónico antes de iniciar sesión',
      'Too many requests': 'Demasiados intentos. Intenta nuevamente en unos minutos',
      'Password should be at least 6 caracteres': 'La contraseña debe tener al menos 6 caracteres',
      'User already registered': 'Ya existe una cuenta registrada con este correo electrónico',
      'Signup is disabled': 'El registro se encuentra temporalmente deshabilitado',
    };

    return errorMap[errorMessage] || 'Ocurrió un error inesperado. Intenta nuevamente';
  }

  /**
   * Registra el ingreso del usuario en la tabla de auditoría logs_accesos.
   *
   * La inserción se ejecuta de forma aspiracional: si la red falla
   * no bloquea la-redirección del usuario al panel principal.
   *
   * @param userId Identificador único del usuario autenticado.
   */
  private registrarAcceso(userId: string): void {
    const client = this.supabase.supabase as unknown as {
      from: (table: string) => {
        insert: (payload: Record<string, unknown>) => Promise<{ error: { message: string } | null }>;
      };
    };
    client
      .from('logs_accesos')
      .insert({ user_id: userId })
      .then(({ error }) => {
        if (error) {
          toast.error('No fue posible registrar el acceso. Por favor, verifica los datos e intenta nuevamente.');
        }
      });
  }
}
