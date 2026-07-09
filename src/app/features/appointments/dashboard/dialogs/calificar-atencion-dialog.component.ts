import { Component, output, signal, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgClass } from '@angular/common';

/**
 * Dialogo modal para que el paciente califique la atencion medica.
 *
 * Presenta un selector interactivo de estrellas (1-5) y un campo de
 * texto para opinion. El boton de envio permanece deshabilitado
 * mientras no se ingrese un comentario y se seleccione al menos
 * una estrella.
 */
@Component({
  selector: 'app-calificar-atencion-dialog',
  standalone: true,
  imports: [FormsModule, NgClass],
  templateUrl: './calificar-atencion-dialog.component.html',
})
export class CalificarAtencionDialogComponent {
  /** Puntuacion seleccionada (0 = sin seleccion). */
  readonly estrellas = signal(0);

  /** Texto de opinion del paciente. */
  readonly comentario = signal('');

  /** Indica si el dialogo esta visible. */
  readonly isVisible = signal(false);

  /** Indica si hay una operacion en curso. */
  readonly isEnviando = signal(false);

  /** Indica si el hover esta sobre una estrella. */
  readonly estrellaHover = signal(0);

  /** Evento emitido con los datos de calificacion al confirmar. */
  readonly onConfirmar = output<{ comentario: string; estrellas: number }>();

  /** Evento emitido al cerrar el dialogo. */
  readonly onCerrar = output<void>();

  /** El boton de enviar esta deshabilitado si no cumple las condiciones. */
  readonly botonDeshabilitado = computed(() =>
    this.isEnviando() || this.estrellas() === 0 || !this.comentario().trim(),
  );

  /** Arreglo de estrellas para iterar en el template. */
  readonly estrellasArray = [1, 2, 3, 4, 5];

  /** Abre el dialogo. */
  abrir(): void {
    this.estrellas.set(0);
    this.comentario.set('');
    this.estrellaHover.set(0);
    this.isEnviando.set(false);
    this.isVisible.set(true);
  }

  /** Cierra el dialogo. */
  cerrar(): void {
    if (this.isEnviando()) return;
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

  /** Selecciona una puntuacion de estrellas. */
  seleccionarEstrellas(valor: number): void {
    this.estrellas.set(valor);
  }

  /** Actualiza el texto del comentario. */
  actualizarComentario(valor: string): void {
    this.comentario.set(valor);
  }

  /** Confirma la calificacion y emite el evento. */
  confirmar(): void {
    if (this.botonDeshabilitado()) return;
    this.isVisible.set(false);
    this.onConfirmar.emit({
      comentario: this.comentario().trim(),
      estrellas: this.estrellas(),
    });
  }
}
