import {
  trigger,
  transition,
  style,
  animate,
  query,
  stagger,
} from '@angular/animations';

export const modalBackdrop = trigger('modalBackdrop', [
  transition(':enter', [
    style({ opacity: 0 }),
    animate('200ms ease-out', style({ opacity: 1 })),
  ]),
  transition(':leave', [
    animate('150ms ease-in', style({ opacity: 0 })),
  ]),
]);

export const modalContent = trigger('modalContent', [
  transition(':enter', [
    style({ opacity: 0, transform: 'scale(0.95) translateY(10px)' }),
    animate('250ms 100ms ease-out', style({ opacity: 1, transform: 'scale(1) translateY(0)' })),
  ]),
  transition(':leave', [
    animate('150ms ease-in', style({ opacity: 0, transform: 'scale(0.95) translateY(10px)' })),
  ]),
]);

export const tableRowStagger = trigger('tableRowStagger', [
  transition('* => *', [
    query(':enter', [
      style({ opacity: 0, transform: 'translateY(8px)' }),
      stagger('30ms', [
        animate('250ms ease-out', style({ opacity: 1, transform: 'translateY(0)' })),
      ]),
    ], { optional: true }),
  ]),
]);

export const fadeSlideRow = trigger('fadeSlideRow', [
  transition(':enter', [
    style({ opacity: 0, transform: 'translateX(-12px)' }),
    animate('200ms ease-out', style({ opacity: 1, transform: 'translateX(0)' })),
  ]),
  transition(':leave', [
    animate('150ms ease-in', style({ opacity: 0, transform: 'translateX(12px)' })),
  ]),
]);

export const statusBadge = trigger('statusBadge', [
  transition('* => *', [
    style({ opacity: 0, transform: 'scale(0.8)' }),
    animate('200ms ease-out', style({ opacity: 1, transform: 'scale(1)' })),
  ]),
]);

export const slideDown = trigger('slideDown', [
  transition(':enter', [
    style({ opacity: 0, transform: 'translateY(-8px)' }),
    animate('200ms ease-out', style({ opacity: 1, transform: 'translateY(0)' })),
  ]),
  transition(':leave', [
    animate('150ms ease-in', style({ opacity: 0, transform: 'translateY(-8px)' })),
  ]),
]);

export const overlayFade = trigger('overlayFade', [
  transition(':enter', [
    style({ opacity: 0 }),
    animate('300ms ease-out', style({ opacity: 1 })),
  ]),
  transition(':leave', [
    animate('200ms ease-in', style({ opacity: 0 })),
  ]),
]);
