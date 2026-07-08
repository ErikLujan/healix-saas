import {
  trigger,
  transition,
  style,
  animate,
  query,
  group,
  animateChild,
} from '@angular/animations';

const easeOutExpo = 'cubic-bezier(0.16, 1, 0.3, 1)';
const easeInExpo = 'cubic-bezier(0.7, 0, 0.84, 0)';

/** Transicion de rutas principal: sale el componente actual con fade-up y entra el nuevo con fade-down. */
export const routeAnimations = trigger('routeAnimations', [
  transition('* <=> *', [
    query(':enter', [
      style({ opacity: 0, transform: 'translateY(20px) scale(0.98)' }),
    ], { optional: true }),
    group([
      query(':leave', [
        animate(`200ms ${easeInExpo}`, style({ opacity: 0, transform: 'translateY(-12px) scale(0.98)' })),
      ], { optional: true }),
      query(':enter', [
        animate(`400ms 80ms ${easeOutExpo}`, style({ opacity: 1, transform: 'translateY(0) scale(1)' })),
      ], { optional: true }),
    ]),
    query(':enter', animateChild(), { optional: true }),
  ]),
]);

/** Fade simple de entrada y salida para elementos que aparecen/desaparecen. */
export const fadeIn = trigger('fadeIn', [
  transition(':enter', [
    style({ opacity: 0 }),
    animate(`300ms ${easeOutExpo}`, style({ opacity: 1 })),
  ]),
  transition(':leave', [
    animate(`200ms ${easeInExpo}`, style({ opacity: 0 })),
  ]),
]);

/** Deslizamiento vertical hacia arriba con fade para listas y tarjetas. */
export const slideUp = trigger('slideUp', [
  transition(':enter', [
    style({ opacity: 0, transform: 'translateY(20px) scale(0.98)' }),
    animate(`400ms 100ms ${easeOutExpo}`, style({ opacity: 1, transform: 'translateY(0) scale(1)' })),
  ]),
  transition(':leave', [
    animate(`250ms ${easeInExpo}`, style({ opacity: 0, transform: 'translateY(-12px) scale(0.98)' })),
  ]),
]);

/** Deslizamiento horizontal desde la izquierda para paneles laterales. */
export const slideInLeft = trigger('slideInLeft', [
  transition(':enter', [
    style({ opacity: 0, transform: 'translateX(-24px)' }),
    animate(`350ms ${easeOutExpo}`, style({ opacity: 1, transform: 'translateX(0)' })),
  ]),
  transition(':leave', [
    animate(`200ms ${easeInExpo}`, style({ opacity: 0, transform: 'translateX(24px)' })),
  ]),
]);

/** Transicion para dropdowns: aparece con scale-up desde arriba. */
export const dropdownFade = trigger('dropdownFade', [
  transition(':enter', [
    style({ opacity: 0, transform: 'translateY(-4px) scale(0.97)' }),
    animate(`180ms ${easeOutExpo}`, style({ opacity: 1, transform: 'translateY(0) scale(1)' })),
  ]),
  transition(':leave', [
    animate(`120ms ${easeInExpo}`, style({ opacity: 0, transform: 'translateY(-4px) scale(0.97)' })),
  ]),
]);

/** Fade para overlay de fondo de modales y drawers. */
export const overlayFade = trigger('overlayFade', [
  transition(':enter', [
    style({ opacity: 0 }),
    animate(`200ms ${easeOutExpo}`, style({ opacity: 1 })),
  ]),
  transition(':leave', [
    animate(`150ms ${easeInExpo}`, style({ opacity: 0 })),
  ]),
]);

/** Deslizamiento horizontal desde la izquierda para drawers moviles. */
export const drawerSlide = trigger('drawerSlide', [
  transition(':enter', [
    style({ transform: 'translateX(-100%)' }),
    animate(`300ms ${easeOutExpo}`, style({ transform: 'translateX(0)' })),
  ]),
  transition(':leave', [
    animate(`200ms ${easeInExpo}`, style({ transform: 'translateX(-100%)' })),
  ]),
]);
