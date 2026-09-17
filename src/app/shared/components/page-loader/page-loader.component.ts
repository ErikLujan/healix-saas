import { Component, inject } from '@angular/core';
import { LoadingService } from '@core/services/loading.service';
import { overlayFade } from '@core/animations/route-animations';

/**
 * Indicador global de carga auténtica.
 *
 * Solo se muestra durante la resolución de chunks lazy-loaded
 * (ver `LoadingService`). Las navegaciones síncronas y los
 * cambios con `@if` / `@switch` nunca lo activan.
 */
@Component({
  selector: 'app-page-loader',
  standalone: true,
  templateUrl: './page-loader.component.html',
  styleUrl: './page-loader.component.scss',
  animations: [overlayFade],
})
export class PageLoaderComponent {
  private readonly loadingService = inject(LoadingService);

  /** Visibilidad del loader con umbral anti-parpadeo incluido. */
  readonly isLoading = this.loadingService.isLoading;
}
