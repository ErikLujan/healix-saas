import { Directive, ElementRef, HostListener, inject, Renderer2 } from '@angular/core';

/**
 * Directiva de atributo que enriquece la interaccion visual de tarjetas.
 *
 * Aplica transiciones suaves de sombra y elevacion al pasar el cursor por
 * sobre el elemento huésped, transmitiendo sensacion de profundidad e
 * interaccion. Al retirar el cursor, el elemento recupera automaticamente
 * su estado visual original.
 *
 * Es completamente reutilizable sobre cualquier componente visual tipo tarjeta:
 * tarjetas de especialistas, pacientes, turnos, paneles administrativos, etc.
 *
 * @example
 * // En una plantilla Angular:
 * <div class="bg-white rounded-lg p-4" resaltarCard>
 *   Contenido de la tarjeta
 * </div>
 *
 * @selector [resaltarCard]
 */
@Directive({
  selector: '[resaltarCard]',
  standalone: true,
})
export class ResaltarCardDirective {
  private readonly el = inject(ElementRef<HTMLElement>);
  private readonly renderer = inject(Renderer2);

  constructor() {
    this.renderer.setStyle(this.el.nativeElement, 'transition', 'box-shadow 0.2s ease, transform 0.2s ease');
  }

  /** Aplica sombra elevada y ligera elevacion al ingresar el cursor. */
  @HostListener('mouseenter')
  onmouseenter(): void {
    const el = this.el.nativeElement;
    this.renderer.setStyle(el, 'box-shadow', '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.06)');
    this.renderer.setStyle(el, 'transform', 'translateY(-2px)');
  }

  /** Restaura el estado visual original al retirar el cursor. */
  @HostListener('mouseleave')
  onmouseleave(): void {
    const el = this.el.nativeElement;
    this.renderer.removeStyle(el, 'box-shadow');
    this.renderer.removeStyle(el, 'transform');
  }
}
