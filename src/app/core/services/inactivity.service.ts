import { Injectable, OnDestroy, inject } from '@angular/core';
import { Router } from '@angular/router';
import { fromEvent, merge, timer, Subscription, throttleTime, startWith, switchMap } from 'rxjs';
import { toast } from 'ngx-sonner';
import { AuthService } from './auth.service';

/**
 * Duración máxima de inactividad permitida antes del cierre automático.
 * Quince minutos, estándar de seguridad para software con datos clínicos.
 */
const TIEMPO_MAXIMO_INACTIVIDAD_MS = 15 * 60 * 1000;

/**
 * Ventana de limitación de eventos de actividad para evitar
 * degradación del rendimiento ante ráfagas de mousemove o scroll.
 */
const VENTANA_LIMITACION_EVENTOS_MS = 2000;

/**
 * Servicio de cierre automático de sesión por inactividad.
 *
 * Escucha eventos globales de actividad del usuario (movimiento de ratón,
 * teclado, tacto, clic y desplazamiento) mediante RxJS y reinicia un
 * temporizador de quince minutos ante cada actividad. Al agotarse el
 * temporizador sin actividad, cierra la sesión de Supabase y redirige
 * al inicio de sesión con un aviso visible.
 *
 * El temporizador solo actúa cuando existe una sesión autenticada; si no
 * hay usuario activo, el vencimiento se ignora silenciosamente. Al cerrar
 * sesión, el temporizador se detiene para evitar fugas de memoria.
 */
@Injectable({
  providedIn: 'root',
})
export class InactivityService implements OnDestroy {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  private suscripcion: Subscription | null = null;

  /**
   * Inicia la vigilancia de inactividad. Llamar una sola vez desde el
   * componente raíz mientras el usuario permanece en la aplicación.
   * Las invocaciones repetidas no crean suscripciones duplicadas.
   */
  iniciar(): void {
    if (this.suscripcion) {
      return;
    }

    const actividad$ = merge(
      fromEvent(document, 'mousemove'),
      fromEvent(document, 'keydown'),
      fromEvent(document, 'touchstart'),
      fromEvent(document, 'click'),
      fromEvent(document, 'scroll', { capture: true }),
      fromEvent(document, 'wheel', { passive: true }),
    ).pipe(
      throttleTime(VENTANA_LIMITACION_EVENTOS_MS),
      startWith(null),
      switchMap(() => timer(TIEMPO_MAXIMO_INACTIVIDAD_MS)),
    );

    this.suscripcion = actividad$.subscribe(() => {
      void this.cerrarPorInactividad();
    });
  }

  /**
   * Detiene la vigilancia de inactividad y libera la suscripción activa.
   * Llamar al destruir el componente raíz o tras el cierre de sesión.
   */
  detener(): void {
    this.suscripcion?.unsubscribe();
    this.suscripcion = null;
  }

  /** Libera la suscripción al destruir el servicio. */
  ngOnDestroy(): void {
    this.detener();
  }

  /**
   * Cierra la sesión por inactividad vencida.
   *
   * Solo actúa si existe un usuario autenticado; en pantallas públicas
   * (inicio de sesión, registro) el vencimiento se ignora sin aviso.
   * Tras cerrar la sesión, detiene el temporizador y redirige al acceso.
   */
  private async cerrarPorInactividad(): Promise<void> {
    if (!this.authService.isAuthenticated()) {
      return;
    }

    this.detener();

    try {
      await this.authService.signOut();
    } finally {
      toast.warning('Sesión expirada por inactividad. Inicia sesión nuevamente.');
      await this.router.navigate(['/autenticacion']);
    }
  }
}
