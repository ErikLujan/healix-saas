import { Component, output, signal, HostListener } from '@angular/core';
import { LucideDynamicIcon } from '@lucide/angular';

@Component({
  selector: 'app-resena-modal',
  standalone: true,
  imports: [LucideDynamicIcon],
  templateUrl: './resena-modal.component.html',
})
export class ResenaModalComponent {
  readonly resenaTexto = signal('');
  readonly isVisible = signal(false);
  readonly onCerrar = output<void>();

  @HostListener('window:keydown.escape')
  onEscapeKey(): void {
    if (this.isVisible()) this.cerrar();
  }

  abrir(texto: string): void {
    this.resenaTexto.set(texto);
    this.isVisible.set(true);
  }

  cerrar(): void {
    this.isVisible.set(false);
    this.onCerrar.emit();
  }

  onBackdropClick(event: MouseEvent): void {
    if (event.target === event.currentTarget) {
      this.cerrar();
    }
  }
}
