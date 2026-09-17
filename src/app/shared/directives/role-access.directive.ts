import { Directive, effect, inject, input, TemplateRef, ViewContainerRef } from '@angular/core';
import { AuthService } from '@core/services/auth.service';

/**
 * Directiva estructural que controla la existencia en el DOM de un bloque
 * de interfaz segun el rol autenticado del usuario.
 *
 * Evalua de forma reactiva el rol actual proporcionado por `AuthService` y
 * renderiza o elimina el contenido huésped dependiendo de si el rol se
 * encuentra dentro de la lista de roles autorizados.
 *
 * Cuando el usuario posee uno de los roles indicados, el contenido se
 * renderiza normalmente. En caso contrario, el elemento no existe dentro
 * del DOM (no se oculta con estilos, se remueve completamente).
 *
 * Esta directiva constituye un mecanismo de representacion visual exclusivamente.
 * No reemplaza las politicas de seguridad implementadas mediante Guards ni
 * las reglas RLS configuradas en Supabase.
 *
 * @example
 * En una plantilla Angular:
 * <button *roleAccess="['administrador']">
 *   Eliminar usuario
 * </button>
 *
 * @example
 * Para múltiples roles:
 * <nav *roleAccess="['administrador', 'especialista']">
 *   Panel de gestion
 * </nav>
 *
 * @selector [roleAccess]
 */
@Directive({
  selector: '[roleAccess]',
  standalone: true,
})
export class RoleAccessDirective {
  /** Lista de roles autorizados para renderizar el contenido. */
  readonly roleAccess = input<readonly string[]>([]);

  private readonly templateRef = inject(TemplateRef<unknown>);
  private readonly viewContainer = inject(ViewContainerRef);
  private readonly authService = inject(AuthService);

  private viewCreated = false;

  constructor() {
    effect(() => {
      const rolActual = this.authService.userRole();
      const rolesPermitidos = this.roleAccess();
      const tieneAcceso = rolActual !== null && rolesPermitidos.includes(rolActual);

      if (tieneAcceso && !this.viewCreated) {
        this.viewContainer.createEmbeddedView(this.templateRef);
        this.viewCreated = true;
      } else if (!tieneAcceso && this.viewCreated) {
        this.viewContainer.clear();
        this.viewCreated = false;
      }
    });
  }
}
