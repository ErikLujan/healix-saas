import { Component, input, output, computed } from '@angular/core';
import { NgClass } from '@angular/common';

/**
 * Componente generico de paginacion reactiva.
 *
 * Calcula internamente el total de paginas y los numeros visibles
 * a partir de los inputs proporcionados. Emite un evento cada vez
 * que el usuario selecciona una pagina diferente.
 *
 * Utiliza Angular Signals y computed() para mantener la reactividad
 * sin ciclo de vida manual. Optimizado para ser reutilizado en
 * cualquier grilla o listado del sistema.
 */
@Component({
  selector: 'app-pagination',
  standalone: true,
  imports: [NgClass],
  templateUrl: './pagination.component.html',
})
export class PaginationComponent {
  /** Pagina activa actual (1-indexed). */
  readonly currentPage = input<number>(1);

  /** Cantidad total de elementos en la coleccion filtrada. */
  readonly totalItems = input<number>(0);

  /** Tamano de segmento por pagina. */
  readonly pageSize = input<number>(4);

  /** Emite el nuevo numero de pagina al hacer clic. */
  readonly pageChange = output<number>();

  /** Total de paginas disponibles. */
  readonly totalPages = computed(() => {
    const total = this.totalItems();
    const size = this.pageSize();
    if (size <= 0) return 0;
    return Math.ceil(total / size);
  });

  /** Array de numeros de pagina para renderizar los botones. */
  readonly pageNumbers = computed(() => {
    const total = this.totalPages();
    const pages: number[] = [];
    for (let i = 1; i <= total; i++) {
      pages.push(i);
    }
    return pages;
  });

  /** Rango de indices visibles para el contador informativo. */
  readonly paginationRange = computed(() => {
    const total = this.totalItems();
    if (total === 0) return { start: 0, end: 0, total: 0 };

    const size = this.pageSize();
    const page = this.currentPage();
    const start = (page - 1) * size + 1;
    const end = Math.min(page * size, total);
    return { start, end, total };
  });

  /** Indica si el boton Anterior debe estar deshabilitado. */
  readonly isFirstPage = computed(() => this.currentPage() <= 1);

  /** Indica si el boton Siguiente debe estar deshabilitado. */
  readonly isLastPage = computed(() => this.currentPage() >= this.totalPages());

  /** Navega a la pagina anterior. */
  goToPreviousPage(): void {
    if (!this.isFirstPage()) {
      this.pageChange.emit(this.currentPage() - 1);
    }
  }

  /** Navega a la pagina siguiente. */
  goToNextPage(): void {
    if (!this.isLastPage()) {
      this.pageChange.emit(this.currentPage() + 1);
    }
  }

  /** Navega a una pagina especifica por numero. */
  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages() && page !== this.currentPage()) {
      this.pageChange.emit(page);
    }
  }
}
