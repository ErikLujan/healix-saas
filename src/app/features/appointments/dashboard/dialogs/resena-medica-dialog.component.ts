import { Component, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

/**
 * Dialogo para la carga de resena medica obligatoria.
 *
 * Utilizado por el especialista al finalizar un turno.
 * Contiene un textarea validado que impide la finalizacion
 * sin registrar la informacion clinica correspondiente.
 */
@Component({
  selector: 'app-resena-medica-dialog',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './resena-medica-dialog.component.html',
})
export class ResenaMedicaDialogComponent {
  /** Evento emitido con la resena medica al confirmar. */
  readonly onConfirmar = output<string>();

  /** Evento emitido al cerrar el dialogo sin confirmar. */
  readonly onCerrar = output<void>();

  /** Texto de la resena medica. */
  readonly resena = signal('');

  /** Indica si el dialogo esta visible. */
  readonly isVisible = signal(false);

  /** Abre el dialogo. */
  abrir(): void {
    this.resena.set('');
    this.isVisible.set(true);
  }

  /** Cierra el dialogo. */
  cerrar(): void {
    this.isVisible.set(false);
    this.resena.set('');
    this.onCerrar.emit();
  }

  /** Confirma la accion con la resena ingresada. */
  confirmar(): void {
    const texto = this.resena().trim();
    if (!texto) return;
    this.isVisible.set(false);
    this.onConfirmar.emit(texto);
    this.resena.set('');
  }

  /** Actualiza el texto de la resena. */
  actualizarResena(valor: string): void {
    this.resena.set(valor);
  }
}
