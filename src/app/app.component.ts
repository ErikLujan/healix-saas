import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { NgxSonnerToaster } from 'ngx-sonner';
import { PageLoaderComponent } from './shared/components/page-loader/page-loader.component';
import { routeAnimations } from './core/animations/route-animations';
import { InactivityService } from './core/services/inactivity.service';

/**
 * Raíz de la aplicación.
 *
 * Aloja el outlet principal con transición de ruta ligera
 * (solo `transform` + `opacity`) y el loader auténtico de
 * chunks lazy. Los cambios síncronos con `@if` / `@switch`
 * dentro de cada página no atraviesan este outlet y por tanto
 * nunca disparan ni animación de ruta ni splash.
 *
 * Activa la vigilancia de inactividad al iniciar para cerrar
 * automáticamente sesiones clínicas abandonadas; la detiene
 * al destruirse el componente raíz.
 */
@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, NgxSonnerToaster, PageLoaderComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
  animations: [routeAnimations],
})
export class AppComponent implements OnInit, OnDestroy {
  private readonly inactividad = inject(InactivityService);

  /** Activa el cierre automático por inactividad de la sesión clínica. */
  ngOnInit(): void {
    this.inactividad.iniciar();
  }

  /** Detiene la vigilancia de inactividad al destruir la raíz. */
  ngOnDestroy(): void {
    this.inactividad.detener();
  }

  /**
   * Resuelve la clave de animación de la ruta activada.
   * @param outlet Outlet principal del router.
   * @returns Clave `animation` del `data` de ruta o cadena vacía.
   */
  getRouteAnimationData(outlet: RouterOutlet): string {
    return outlet?.activatedRouteData?.['animation'] ?? '';
  }
}
