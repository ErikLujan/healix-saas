import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Location } from '@angular/common';

@Component({
  selector: 'app-not-found',
  standalone: true,
  imports: [RouterLink],
  template: `
    <div class="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4">
      <div class="text-center max-w-md">
        <p class="text-7xl sm:text-8xl font-bold text-brand-700 leading-none font-display tabular-nums">404</p>
        <h1 class="text-xl font-semibold text-fg mt-4 mb-2">Página no encontrada</h1>
        <p class="text-sm text-fg-muted mb-8">
          La página que está buscando no existe o ha sido movida.
        </p>
        <div class="flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            (click)="goBack()"
            class="inline-flex items-center gap-2 bg-brand-700 text-white px-6 py-3 rounded-lg font-medium text-sm hover:bg-brand-900 transition-all duration-200"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/>
            </svg>
            Volver a la página anterior
          </button>
          <a
            routerLink="/"
            class="inline-flex items-center gap-2 border border-slate-300 text-slate-700 px-6 py-3 rounded-lg font-medium text-sm hover:bg-slate-50 transition-all duration-200"
          >
            Ir al Inicio
          </a>
        </div>
      </div>
    </div>
  `,
})
export class NotFoundComponent {
  private readonly location = inject(Location);

  goBack(): void {
    this.location.back();
  }
}
