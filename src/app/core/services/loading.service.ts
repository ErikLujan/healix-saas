import { Injectable, signal } from '@angular/core';
import { NavigationEnd, NavigationStart, Router } from '@angular/router';
import { filter } from 'rxjs';

/**
 * Servicio global de indicador de carga para transiciones de ruta.
 *
 * Expone una Signal booleana que se activa al iniciar una navegacion
 * y se desactiva 150ms despues de completarse, permitiendo que el
 * PageLoaderComponent muestre retroalimentacion visual al usuario
 * durante la carga de modulos lazy-loaded.
 */
@Injectable({
  providedIn: 'root',
})
export class LoadingService {
  private readonly isLoadingSignal = signal(false);

  readonly isLoading = this.isLoadingSignal.asReadonly();

  constructor(private readonly router: Router) {
    this.router.events
      .pipe(
        filter(event => event instanceof NavigationStart || event instanceof NavigationEnd),
      )
      .subscribe(event => {
        if (event instanceof NavigationStart) {
          this.isLoadingSignal.set(true);
        } else if (event instanceof NavigationEnd) {
          setTimeout(() => this.isLoadingSignal.set(false), 150);
        }
      });
  }
}
