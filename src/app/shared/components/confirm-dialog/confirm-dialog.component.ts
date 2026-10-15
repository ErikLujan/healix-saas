import { Component, HostListener, input, output } from '@angular/core';
import { LucideDynamicIcon } from '@lucide/angular';
import { DialogFocusTrapDirective } from '@shared/directives/dialog-focus-trap.directive';

/**
 * Diálogo genérico de confirmación para acciones destructivas.
 *
 * Recibe título, descripción y etiquetas mediante inputs y comunica
 * la decisión mediante outputs. Atrapa el foco, cierra con Escape
 * y devuelve el foco al elemento que lo abrió.
 */
@Component({
  selector: 'app-confirm-dialog',
  standalone: true,
  imports: [LucideDynamicIcon, DialogFocusTrapDirective],
  templateUrl: './confirm-dialog.component.html',
  styleUrl: './confirm-dialog.component.scss',
})
export class ConfirmDialogComponent {
  readonly titulo = input('Confirmar acción');
  readonly descripcion = input('');
  readonly textoConfirmar = input('Confirmar');
  readonly textoCancelar = input('Cancelar');
  readonly isProcessing = input(false);

  readonly confirmado = output<void>();
  readonly cancelado = output<void>();

  @HostListener('window:keydown.escape')
  onEscapeKey(): void {
    this.cancelar();
  }

  confirmar(): void {
    if (this.isProcessing()) return;
    this.confirmado.emit();
  }

  cancelar(): void {
    if (this.isProcessing()) return;
    this.cancelado.emit();
  }
}
