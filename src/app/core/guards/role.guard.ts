import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService, UserRole } from '../services/auth.service';

/**
 * Guard funcional que valida el rol del usuario contra los roles
 * permitidos definidos en la data de la ruta. Espera la resolución
 * de sessionReady antes de evaluar, evitando rebotes en hard reload.
 */
export const roleGuard: CanActivateFn = async (route) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  await authService.sessionReady;

  const allowedRoles = route.data?.['roles'] as UserRole[] | undefined;

  if (!authService.isAuthenticated()) {
    router.navigate(['/autenticacion']);
    return false;
  }

  const userRole = authService.userRole();

  if (!allowedRoles || allowedRoles.length === 0) {
    return true;
  }

  if (!userRole || !allowedRoles.includes(userRole)) {
    router.navigate(['/']);
    return false;
  }

  return true;
};

/**
 * Guard funcional exclusivo para especialistas. Verifica que la cuenta
 * haya sido aprobada por un administrador antes de permitir el acceso
 * a rutas del dashboard. Destruye la sesión y redirige a aprobacion-pendiente
 * si el especialista no está habilitado.
 */
export const specialistApprovalGuard: CanActivateFn = async () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  await authService.sessionReady;

  if (!authService.isAuthenticated()) {
    router.navigate(['/autenticacion']);
    return false;
  }

  if (authService.userRole() !== 'especialista') {
    return true;
  }

  const isApproved = await authService.getSpecialistApprovalStatus();

  if (isApproved === false) {
    router.navigate(['/aprobacion-pendiente']);
    return false;
  }

  return true;
};
