import { computed, Injectable, signal } from '@angular/core';
import { Router } from '@angular/router';
import { User, AuthError } from '@supabase/supabase-js';
import { SupabaseService } from './supabase.service';
import { toast } from 'ngx-sonner';
import { Database } from '../models/database.types';

/** Tipos de rol disponibles en el sistema clinico. */
export type UserRole = 'paciente' | 'especialista' | 'administrador';

/**
 * Perfil basico del usuario extraido de la tabla public.profiles.
 * Representa los datos minimos necesarios para la capa de presentacion.
 */
export interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  avatar_url: string | null;
  role: UserRole;
}

/**
 * Servicio central de autenticacion y gestion de sesion.
 *
 * Responsable del ciclo de vida completo del usuario autenticado:
 * restauracion de sesion, inicio/registro/cierre, y sincronizacion
 * del perfil desde Supabase Auth hacia la tabla public.profiles.
 *
 * Expone Signals reactivas para que Guards y componentes consuman
 * el estado de autenticacion sin acoplarse al SDK de Supabase.
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
   * Promesa que se resuelve cuando Supabase ha completado la recuperacion
   * inicial de la sesion. Los Guards deben esperar esta senal antes de
   * tomar decisiones de redireccionamiento, evitando carreras de tiempo
   * en refrescos de pagina donde la sesion aun no esta disponible.
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
   * Restaura la sesion desde el Storage local de Supabase y configura
   * el listener de cambios de autenticacion. Resuelve sessionReady
   * independientemente del resultado para desbloquear los Guards.
   *
   * Se ignora el evento INITIAL_SESSION para evitar consultas
   * fantasma con tokens potencialmente obsoletos en recargas de pagina.
   * Solo se carga el perfil cuando el evento es SIGNED_IN o
   * TOKEN_REFRESHED con una sesion activa confirmada.
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
   * @param userId Identificador unico del usuario autenticado en Auth.
   */
  private async loadUserProfile(userId: string): Promise<void> {
    const { data, error } = await this.supabase.supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

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
   * Autentica al usuario con credenciales de correo y contrasena.
   * Muestra toast de error en caso de fallo.
   *
   * @param email Correo electronico del usuario.
   * @param password Contrasena en texto plano.
   * @returns Objeto con error null si la autenticacion fue exitosa.
   */
  async signIn(email: string, password: string): Promise<{ error: AuthError | null }> {
    const { error } = await this.supabase.supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      const message = this.mapAuthError(error.message);
      toast.error(message);
    }

    return { error };
  }

  /**
   * Registra un nuevo usuario en Supabase Auth con metadatos de perfil.
   * El trigger handle_new_user_sync popula las tablas de extension
   * (profiles, pacientes/especialistas/administradores) automaticamente.
   *
   * @param email Correo electronico unico para la cuenta.
   * @param password Contrasena minima de 8 caracteres.
   * @param metadata Metadatos del perfil (role, full_name, dni, edad, etc.).
   * @returns Identificador del usuario creado o error en caso de fallo.
   */
  async signUp(email: string, password: string, metadata: Record<string, unknown>): Promise<{ userId: string | null; error: AuthError | null }> {
    const { data, error } = await this.supabase.supabase.auth.signUp({
      email,
      password,
      options: { data: metadata },
    });

    if (error) {
      const message = this.mapAuthError(error.message);
      toast.error(message);
      console.error('[AuthService] signUp error:', error.message);
      return { userId: null, error };
    }

    console.log('[AuthService] signUp success, userId:', data.user?.id);
    return { userId: data.user?.id ?? null, error: null };
  }

  /**
   * Cierra la sesion activa, limpia el estado local y redirige
   * al usuario a la pantalla de autenticacion.
   */
  async signOut(): Promise<void> {
    await this.supabase.supabase.auth.signOut();
    this.currentUserSignal.set(null);
    this.userProfileSignal.set(null);
    this.router.navigate(['/auth']);
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
      .single();

    if (!data) return null;

    const specialist = data as Database['public']['Tables']['especialistas']['Row'];
    return specialist.is_approved;
  }

  /**
   * Transforma los mensajes de error tecnicos de Supabase Auth
   * en mensajes comprensibles para el usuario final en espanol.
   *
   * @param errorMessage Mensaje original devuelto por Supabase.
   * @returns Mensaje amigable traducido al espanol.
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
}
