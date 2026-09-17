import { Component, output, signal, computed, HostListener } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgClass } from '@angular/common';
import { LucideDynamicIcon } from '@lucide/angular';

/** Longitud minima requerida para motivos de cancelacion y rechazo. */
const LONGITUD_MINIMA_MOTIVO = 10;

@Component({
  selector: 'app-comentario-dialog',
  standalone: true,
  imports: [FormsModule, NgClass, LucideDynamicIcon],
  templateUrl: './comentario-dialog.component.html',
})
export class ComentarioDialogComponent {
  readonly titulo = signal('Cancelar turno');
  readonly placeholder = signal('Describe el motivo de la cancelación...');
  readonly textoConfirmar = signal('Confirmar cancelación');
  readonly descripcion = signal('');
  readonly modoSoloConfirmacion = signal(false);
  readonly onConfirmar = output<string>();
  readonly onCerrar = output<void>();
  readonly comentario = signal('');
  readonly isVisible = signal(false);

  /** Indica si el comentario cumple con la longitud minima. */
  readonly comentarioValido = computed(() => {
    if (this.modoSoloConfirmacion()) return true;
    return this.comentario().trim().length >= LONGITUD_MINIMA_MOTIVO;
  });

  @HostListener('window:keydown.escape')
  onEscapeKey(): void {
    if (this.isVisible()) this.cerrar();
  }

  /**
   * Abre el dialogo en modo comentario (textarea visible).
   */
  abrir(config: { titulo: string; placeholder: string; textoConfirmar: string }): void {
    this.titulo.set(config.titulo);
    this.placeholder.set(config.placeholder);
    this.textoConfirmar.set(config.textoConfirmar);
    this.descripcion.set('');
    this.modoSoloConfirmacion.set(false);
    this.comentario.set('');
    this.isVisible.set(true);
  }

  /**
   * Abre el dialogo en modo solo confirmacion (sin textarea).
   * Emite el texto de descripcion como comentario al confirmar.
   */
  abrirConfirmacion(config: { titulo: string; descripcion: string; textoConfirmar: string }): void {
    this.titulo.set(config.titulo);
    this.descripcion.set(config.descripcion);
    this.textoConfirmar.set(config.textoConfirmar);
    this.modoSoloConfirmacion.set(true);
    this.comentario.set('');
    this.isVisible.set(true);
  }

  cerrar(): void {
    this.isVisible.set(false);
    this.comentario.set('');
    this.onCerrar.emit();
  }

  confirmar(): void {
    if (this.modoSoloConfirmacion()) {
      this.isVisible.set(false);
      this.onConfirmar.emit(this.descripcion());
      return;
    }

    const texto = this.comentario().trim();
    if (texto.length < LONGITUD_MINIMA_MOTIVO) return;
    this.isVisible.set(false);
    this.onConfirmar.emit(texto);
    this.comentario.set('');
  }

  actualizarComentario(valor: string): void {
    this.comentario.set(valor);
  }
}
