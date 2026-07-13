import { Component, input, output, computed } from '@angular/core';
import { NgClass } from '@angular/common';
import type { PaginationRange } from './pagination.types';

/**
 * Componente generico de paginacion reactiva.
 *
 * Calcula internamente el total de paginas y los numeros visibles
 * a partir de los inputs proporcionados. Emite un evento cada vez
 * que el usuario selecciona una pagina diferente.
 *
 * La coleccion original permanece inmutable. El componente opera
 * exclusivamente sobre memoria, derivando el subconjunto visible
 * mediante computed(). No contiene logica de negocio ni realiza
 * consultas a Supabase.
 *
 * Utiliza Angular Signals y computed() para mantener la reactividad
 * sin ciclo de vida manual. Optimizado para ser reutilizado en
 * cualquier grilla o listado del sistema.
 *
 * @example
 * // En una plantilla Angular:
 * <app-pagination
 *   [totalItems]="records().length"
 *   [currentPage]="paginaActual()"
 *   [pageSize]="4"
 *   (pageChange)="onPageChange($event)" />
 */
@Component({
  selector: 'app-pagination',
  standalone: true,
  imports: [NgClass],
  templateUrl: './pagination.component.html',
  styleUrls: ['./pagination.component.scss'],
})
export class PaginationComponent {
  /** Página activa actual (1-indexed). */
  readonly currentPage = input<number>(1);

  /** Cantidad total de elementos en la colección filtrada. */
  readonly totalItems = input<number>(0);

  /** Tamaño de segmento por página. */
  readonly pageSize = input<number>(4);

  /** Emite el nuevo número de página al hacer clic. */
  readonly pageChange = output<number>();

  /** Total de páginas disponibles. */
  readonly totalPages = computed(() => {
    const total = this.totalItems();
    const size = this.pageSize();
    if (size <= 0) return 0;
    return Math.ceil(total / size);
  });

  /** Array de números de página para renderizar los botones. */
  readonly pageNumbers = computed(() => {
    const total = this.totalPages();
    const pages: number[] = [];
    for (let i = 1; i <= total; i++) {
      pages.push(i);
    }
    return pages;
  });

  /** Rango de indices visibles para el contador informativo. */
  readonly paginationRange = computed((): PaginationRange => {
    const total = this.totalItems();
    if (total === 0) return { start: 0, end: 0, total: 0 };

    const size = this.pageSize();
    const page = this.currentPage();
    const start = (page - 1) * size + 1;
    const end = Math.min(page * size, total);
    return { start, end, total };
  });

  /** Indica si el botón Anterior debe estar deshabilitado. */
  readonly isFirstPage = computed(() => this.currentPage() <= 1);

  /** Indica si el botón Siguiente debe estar deshabilitado. */
  readonly isLastPage = computed(() => this.currentPage() >= this.totalPages());

  /** Navega a la página anterior. */
  goToPreviousPage(): void {
    if (!this.isFirstPage()) {
      this.pageChange.emit(this.currentPage() - 1);
    }
  }

  /** Navega a la página siguiente. */
  goToNextPage(): void {
    if (!this.isLastPage()) {
      this.pageChange.emit(this.currentPage() + 1);
    }
  }

  /** Navega a una página específica por número. */
  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages() && page !== this.currentPage()) {
      this.pageChange.emit(page);
    }
  }
}
