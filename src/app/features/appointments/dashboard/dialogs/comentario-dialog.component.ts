import { Component, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

/**
 * Dialogo modular para captura de comentarios obligatorios.
 *
 * Utilizado para cancelaciones y rechazos de turnos.
 * El boton de confirmacion permanece deshabilitado mientras el
 * texto este vacio, garantizando la captura obligatoria.
 */
@Component({
  selector: 'app-comentario-dialog',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './comentario-dialog.component.html',
})
export class ComentarioDialogComponent {
  /** Texto del titulo del dialogo. */
  readonly titulo = signal('Cancelar turno');

  /** Texto del placeholder del textarea. */
  readonly placeholder = signal('Describe el motivo de la cancelación...');

  /** Texto del boton de confirmacion. */
  readonly textoConfirmar = signal('Confirmar cancelación');

  /** Evento emitido con el texto del comentario al confirmar. */
  readonly onConfirmar = output<string>();

  /** Evento emitido al cerrar el dialogo sin confirmar. */
  readonly onCerrar = output<void>();

  /** Texto actual del textarea. */
  readonly comentario = signal('');

  /** Indica si el dialogo esta visible. */
  readonly isVisible = signal(false);

  /** Abre el dialogo con la configuracion indicada. */
  abrir(config: { titulo: string; placeholder: string; textoConfirmar: string }): void {
    this.titulo.set(config.titulo);
    this.placeholder.set(config.placeholder);
    this.textoConfirmar.set(config.textoConfirmar);
    this.comentario.set('');
    this.isVisible.set(true);
  }

  /** Cierra el dialogo y emite el evento de cierre. */
  cerrar(): void {
    this.isVisible.set(false);
    this.comentario.set('');
    this.onCerrar.emit();
  }

  /** Confirma la accion con el comentario ingresado. */
  confirmar(): void {
    const texto = this.comentario().trim();
    if (!texto) return;
    this.isVisible.set(false);
    this.onConfirmar.emit(texto);
    this.comentario.set('');
  }

  /** Actualiza el texto del comentario. */
  actualizarComentario(valor: string): void {
    this.comentario.set(valor);
  }
}
