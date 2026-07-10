import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

/**
 * Guard funcional que protege rutas autenticadas. Antes de evaluar el
 * estado de la sesión, espera a que AuthService haya completado la
 * recuperación asíncrona de la sesión de Supabase (sessionReady).
 * Esto previene que un refresh de página cause un redirect incorrecto
 * al login mientras la sesión aún se está restaurando.
 */
export const authGuard: CanActivateFn = async () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  await authService.sessionReady;

  if (!authService.isAuthenticated()) {
    router.navigate(['/autenticacion']);
    return false;
  }

  return true;
};
