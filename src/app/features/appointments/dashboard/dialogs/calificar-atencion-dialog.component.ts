import { Component, output, signal, computed, HostListener } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgClass } from '@angular/common';
import { LucideDynamicIcon } from '@lucide/angular';

@Component({
  selector: 'app-calificar-atencion-dialog',
  standalone: true,
  imports: [FormsModule, NgClass, LucideDynamicIcon],
  templateUrl: './calificar-atencion-dialog.component.html',
})
export class CalificarAtencionDialogComponent {
  readonly esLectura = signal(false);

  readonly estrellas = signal(0);
  readonly comentario = signal('');
  readonly isVisible = signal(false);
  readonly isEnviando = signal(false);
  readonly estrellaHover = signal(0);
  readonly onConfirmar = output<{ comentario: string; estrellas: number }>();
  readonly onCerrar = output<void>();

  readonly botonDeshabilitado = computed(() =>
    this.isEnviando() || this.estrellas() === 0 || !this.comentario().trim(),
  );

  readonly estrellasArray = [1, 2, 3, 4, 5];

  @HostListener('window:keydown.escape')
  onEscapeKey(): void {
    if (this.isVisible() && !this.isEnviando()) this.cerrar();
  }

  abrir(estrellas?: number, comentario?: string): void {
    this.esLectura.set(false);
    this.estrellas.set(estrellas ?? 0);
    this.comentario.set(comentario ?? '');
    this.estrellaHover.set(0);
    this.isEnviando.set(false);
    this.isVisible.set(true);
  }

  abrirLectura(estrellas: number, comentario: string): void {
    this.esLectura.set(true);
    this.estrellas.set(estrellas);
    this.comentario.set(comentario);
    this.estrellaHover.set(0);
    this.isEnviando.set(false);
    this.isVisible.set(true);
  }

  cerrar(): void {
    if (this.isEnviando()) return;
    this.isVisible.set(false);
    this.onCerrar.emit();
  }

  onBackdropClick(event: MouseEvent): void {
    if (event.target === event.currentTarget) {
      this.cerrar();
    }
  }

  seleccionarEstrellas(valor: number): void {
    if (this.esLectura()) return;
    this.estrellas.set(valor);
  }

  actualizarComentario(valor: string): void {
    if (this.esLectura()) return;
    this.comentario.set(valor);
  }

  confirmar(): void {
    if (this.botonDeshabilitado()) return;
    this.isVisible.set(false);
    this.onConfirmar.emit({
      comentario: this.comentario().trim(),
      estrellas: this.estrellas(),
    });
  }
}
