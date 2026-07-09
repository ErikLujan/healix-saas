import { Component, output, signal } from '@angular/core';

/**
 * Modal elegante para visualizar la resena medica clinica de un turno.
 *
 * Presenta el diagnostico del especialista con tipografia cuidada
 * sobre un panel con backdrop translucido. Se cierra con click
 * externo, boton o tecla Escape.
 */
@Component({
  selector: 'app-resena-modal',
  standalone: true,
  templateUrl: './resena-modal.component.html',
})
export class ResenaModalComponent {
  /** Texto de la resena medica a mostrar. */
  readonly resenaTexto = signal('');

  /** Indica si el modal esta visible. */
  readonly isVisible = signal(false);

  /** Evento emitido al cerrar el modal. */
  readonly onCerrar = output<void>();

  /** Abre el modal con el texto de la resena. */
  abrir(texto: string): void {
    this.resenaTexto.set(texto);
    this.isVisible.set(true);
  }

  /** Cierra el modal. */
  cerrar(): void {
    this.isVisible.set(false);
    this.onCerrar.emit();
  }

  /** Cierra al hacer click en el backdrop. */
  onBackdropClick(event: MouseEvent): void {
    if (event.target === event.currentTarget) {
      this.cerrar();
    }
  }

  /** Cierra con la tecla Escape. */
  onKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      this.cerrar();
    }
  }
}
