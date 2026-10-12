import { Injectable, inject, signal } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs';

/**
 * Título de la página actual para la miga de pan del shell autenticado.
 *
 * Recorre la instantánea de la ruta hasta la hija más profunda y usa
 * el primer `title` definido (o `data.breadcrumb` como anulación),
 * con repliegue a Panel Principal. Quita el prefijo de marca para
 * mostrar solo el nombre de la página junto al enlace Healix.
 */
@Injectable({ providedIn: 'root' })
export class BreadcrumbService {
  private readonly router = inject(Router);

  readonly title = signal<string>('Panel Principal');

  constructor() {
    this.resolve();
    this.router.events
      .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
      .subscribe(() => this.resolve());
  }

  /**
   * Resuelve el título desde la ruta activa más profunda hacia la raíz.
   */
  private resolve(): void {
    let snapshot = this.router.routerState.snapshot.root;
    const chain = [snapshot];
    while (snapshot.firstChild) {
      snapshot = snapshot.firstChild;
      chain.push(snapshot);
    }
    for (let i = chain.length - 1; i >= 0; i--) {
      const candidate = chain[i];
      const dataTitle = candidate.data?.['breadcrumb'] as string | undefined;
      const routeTitle = typeof candidate.title === 'string' ? candidate.title : undefined;
      const raw = dataTitle ?? routeTitle;
      if (raw) {
        this.title.set(raw.replace(/^Healix\s*\|\s*/, ''));
        return;
      }
    }
    this.title.set('Panel Principal');
  }
}
