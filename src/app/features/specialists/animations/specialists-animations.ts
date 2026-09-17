import { trigger, transition, style, animate } from '@angular/animations';

/**
 * Curva elástica de entrada para filas y badges.
 * Se evita `ease-in`: retrasa el inicio y se percibe lento.
 */
const ENTER_CURVE = 'cubic-bezier(0.23, 1, 0.32, 1)';
const EXIT_CURVE = 'cubic-bezier(0.33, 1, 0.68, 1)';

/**
 * Aparición de filas: fade + elevación mínima.
 * Solo `transform` y `opacity` (capas del compositor GPU).
 */
export const fadeSlideRow = trigger('fadeSlideRow', [
  transition(':enter', [
    style({ opacity: 0, transform: 'translateY(8px)' }),
    animate(`200ms ${ENTER_CURVE}`, style({ opacity: 1, transform: 'translateY(0)' })),
  ]),
  transition(':leave', [
    animate(
      `120ms ${EXIT_CURVE}`,
      style({ opacity: 0, transform: 'translateY(-6px)' }),
    ),
  ]),
]);

/**
 * Cambio de estado del badge: escala desde 0.95, nunca desde 0.
 * Nada en el mundo real aparece desde la nada.
 */
export const statusBadge = trigger('statusBadge', [
  transition('* => *', [
    style({ opacity: 0, transform: 'scale(0.95)' }),
    animate(`160ms ${ENTER_CURVE}`, style({ opacity: 1, transform: 'scale(1)' })),
  ]),
]);
