import { Injectable, signal } from '@angular/core';
import {
  NavigationCancel,
  NavigationError,
  RouteConfigLoadEnd,
  RouteConfigLoadStart,
  Router,
} from '@angular/router';
import { filter } from 'rxjs';

/**
 * Servicio global de carga auténtica para la aplicación.
 *
 * Solo reacciona a la carga diferida de chunks lazy-loaded
 * (`RouteConfigLoadStart` / `RouteConfigLoadEnd`) y nunca a
 * `NavigationStart`. De este modo, los cambios síncronos de
 * componentes mediante `@if` / `@switch` o las navegaciones
 * entre rutas hijas ya resueltas NO disparan el splash.
 *
 * Incluye un umbral anti-parpadeo: el indicador solo se hace
 * visible si la carga del chunk supera los 150 ms.
 */
@Injectable({
  providedIn: 'root',
})
export class LoadingService {
  /** Número de chunks lazy en vuelo. Fuente de verdad interna. */
  private readonly pendingChunksSignal = signal(0);

  /** Visibilidad real del loader (con debounce anti-flash). */
  private readonly visibleSignal = signal(false);

  /**
   * Señal pública de solo lectura que controla `PageLoaderComponent`.
   * Es `true` únicamente durante la resolución de chunks pesados.
   */
  readonly isLoading = this.visibleSignal.asReadonly();

  /** Temporizador del umbral anti-parpadeo. */
  private revealTimer: ReturnType<typeof setTimeout> | null = null;

  /** Temporizador de ocultamiento diferido por tiempo mínimo visible. */
  private hideTimer: ReturnType<typeof setTimeout> | null = null;

  /** Instante en que el loader se hizo visible (anti-flash de salida). */
  private shownAt: number | null = null;

  /** Retraso mínimo antes de mostrar el loader para evitar flashes. */
  private static readonly REVEAL_THRESHOLD_MS = 150;

  /**
   * Tiempo mínimo que el loader permanece visible una vez mostrado.
   * Evita el parpadeo cuando un chunk termina justo después de otro:
   * sin esta permanencia, el indicador se destruye y recrea en ráfaga,
   * reiniciando la animación de la barra en cada ciclo.
   */
  private static readonly MIN_VISIBLE_MS = 350;

  constructor(private readonly router: Router) {
    this.router.events
      .pipe(
        filter(
          (event): event is
            | RouteConfigLoadStart
            | RouteConfigLoadEnd
            | NavigationCancel
            | NavigationError =>
            event instanceof RouteConfigLoadStart ||
            event instanceof RouteConfigLoadEnd ||
            event instanceof NavigationCancel ||
            event instanceof NavigationError,
        ),
      )
      .subscribe((event) => {
        if (event instanceof RouteConfigLoadStart) {
          this.onChunkStart();
        } else if (event instanceof RouteConfigLoadEnd) {
          this.onChunkEnd();
        } else {
          this.onNavigationSettled();
        }
      });
  }

  /**
   * Registra el inicio de un chunk lazy y programa la
   * visualización diferida del indicador.
   * Un chunk nuevo cancela cualquier ocultamiento pendiente.
   */
  private onChunkStart(): void {
    this.pendingChunksSignal.update((count) => count + 1);
    this.clearHideTimer();

    if (this.revealTimer !== null || this.visibleSignal()) {
      return;
    }

    this.revealTimer = setTimeout(() => {
      this.revealTimer = null;
      if (this.pendingChunksSignal() > 0) {
        this.mostrarIndicador();
      }
    }, LoadingService.REVEAL_THRESHOLD_MS);
  }

  /**
   * Registra la resolución de un chunk lazy y oculta el
   * indicador cuando no quedan cargas pendientes, respetando
   * el tiempo mínimo de visibilidad.
   */
  private onChunkEnd(): void {
    this.pendingChunksSignal.update((count) => Math.max(0, count - 1));

    if (this.pendingChunksSignal() === 0) {
      this.clearRevealTimer();
      this.programarOcultamiento();
    }
  }

  /**
   * Restablece el estado ante cancelaciones o errores de
   * navegación para no dejar el loader bloqueado, respetando
   * el tiempo mínimo de visibilidad si ya se estaba mostrando.
   */
  private onNavigationSettled(): void {
    this.pendingChunksSignal.set(0);
    this.clearRevealTimer();
    this.programarOcultamiento();
  }

  /** Cancela el temporizador anti-parpadeo si sigue pendiente. */
  private clearRevealTimer(): void {
    if (this.revealTimer !== null) {
      clearTimeout(this.revealTimer);
      this.revealTimer = null;
    }
  }

  /**
   * Muestra el indicador y registra el instante de aparición
   * para calcular la permanencia mínima.
   */
  private mostrarIndicador(): void {
    this.clearHideTimer();
    this.shownAt = Date.now();
    this.visibleSignal.set(true);
  }

  /**
   * Oculta el indicador respetando el tiempo mínimo visible.
   * Si el loader lleva menos de `MIN_VISIBLE_MS` en pantalla,
   * difiere el ocultamiento; si nunca llegó a mostrarse, no hace nada.
   */
  private programarOcultamiento(): void {
    if (!this.visibleSignal()) {
      return;
    }

    this.clearHideTimer();

    const elapsed = Date.now() - (this.shownAt ?? 0);
    const remaining = LoadingService.MIN_VISIBLE_MS - elapsed;

    if (remaining <= 0) {
      this.visibleSignal.set(false);
      this.shownAt = null;
      return;
    }

    this.hideTimer = setTimeout(() => {
      this.hideTimer = null;
      if (this.pendingChunksSignal() === 0) {
        this.visibleSignal.set(false);
        this.shownAt = null;
      }
    }, remaining);
  }

  /** Cancela el ocultamiento diferido si sigue pendiente. */
  private clearHideTimer(): void {
    if (this.hideTimer !== null) {
      clearTimeout(this.hideTimer);
      this.hideTimer = null;
    }
  }
}
