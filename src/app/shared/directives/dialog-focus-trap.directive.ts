import { Directive, ElementRef, OnDestroy, OnInit, AfterViewInit, inject } from '@angular/core';

/**
 * Atrapa el foco del teclado dentro de un diálogo modal.
 *
 * Al activarse guarda el elemento enfocado, mueve el foco al primer
 * control del diálogo y restaura el foco original al destruirse.
 * Limita la navegación con `Tab` al contenido del diálogo.
 */
@Directive({
  selector: '[appDialogFocusTrap]',
  standalone: true,
})
export class DialogFocusTrapDirective implements OnInit, AfterViewInit, OnDestroy {
  private readonly host = inject(ElementRef<HTMLElement>);
  private elementoPrevio: Element | null = null;

  private readonly alPulsarTecla = (evento: KeyboardEvent): void => {
    if (evento.key !== 'Tab') return;
    const enfocables = this.obtenerEnfocables();
    if (enfocables.length === 0) {
      evento.preventDefault();
      return;
    }
    const primero = enfocables[0];
    const ultimo = enfocables[enfocables.length - 1];
    if (evento.shiftKey && document.activeElement === primero) {
      ultimo.focus();
      evento.preventDefault();
    } else if (!evento.shiftKey && document.activeElement === ultimo) {
      primero.focus();
      evento.preventDefault();
    }
  };

  ngOnInit(): void {
    this.elementoPrevio = document.activeElement;
    this.host.nativeElement.addEventListener('keydown', this.alPulsarTecla);
  }

  ngAfterViewInit(): void {
    const enfocables = this.obtenerEnfocables();
    if (enfocables.length > 0) {
      enfocables[0].focus();
    }
  }

  ngOnDestroy(): void {
    this.host.nativeElement.removeEventListener('keydown', this.alPulsarTecla);
    if (this.elementoPrevio instanceof HTMLElement) {
      this.elementoPrevio.focus();
    }
  }

  /**
   * Recolecta los controles enfocables visibles del diálogo.
   *
   * @returns Lista ordenada de elementos enfocables.
   */
  private obtenerEnfocables(): HTMLElement[] {
    const raiz: HTMLElement = this.host.nativeElement;
    const nodos = raiz.querySelectorAll(
      'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
    );
    return Array.from(nodos).filter((nodo): nodo is HTMLElement => nodo instanceof HTMLElement);
  }
}
