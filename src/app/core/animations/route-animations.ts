import {
  trigger,
  transition,
  style,
  animate,
  query,
  group,
  animateChild,
  stagger,
} from '@angular/animations';

/**
 * Curva elástica de entrada: arranque inmediato y asentamiento suave.
 * Equivalente al spring `cubic-bezier(0.16, 1, 0.3, 1)` de Emil.
 */
const SPRING = 'cubic-bezier(0.16, 1, 0.3, 1)';

/**
 * Salida rápida con desaceleración fuerte.
 * Sustituye a `ease-in`: nunca se usa `ease-in` en UI porque
 * retrasa el movimiento inicial y la interfaz se percibe lenta.
 */
const EXIT = 'cubic-bezier(0.33, 1, 0.68, 1)';

/** Curva tipo iOS para drawers laterales. */
const DRAWER = 'cubic-bezier(0.32, 0.72, 0, 1)';

/** Entradas siempre por debajo de 300 ms (percepción de rapidez). */
const ENTER_MS = 220;
/** Salidas siempre más rápidas que las entradas. */
const LEAVE_MS = 140;
/** Retardo máximo entre elementos de un stagger decorativo. */
const STAGGER_MS = 40;

/**
 * Contención base: fija ambas vistas en el mismo espacio de
 * coordenadas para que la vista saliente nunca empuje a la
 * entrante. Solo anima `transform` y `opacity` (compositor GPU).
 */
const baseContainment = [
  query(
    ':enter, :leave',
    [
      style({
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        willChange: 'transform, opacity',
      }),
    ],
    { optional: true },
  ),
];

/**
 * Revelado escalonado opcional para contenido interior.
 * Solo se aplica a nodos marcados con `[data-route-stagger]`
 * para no recalcular estilos de todo el árbol en cada ruta.
 */
const innerStagger = [
  query(
    ':enter [data-route-stagger]',
    [
      style({ opacity: 0, transform: 'translateY(8px)' }),
      stagger(STAGGER_MS, [
        animate(
          `${ENTER_MS}ms ${SPRING}`,
          style({ opacity: 1, transform: 'translateY(0)' }),
        ),
      ]),
    ],
    { optional: true },
  ),
];

/**
 * Animaciones de ruta de la aplicación.
 *
 * Decisiones de diseño (filosofía Emil Kowalski):
 * - Solo `transform` + `opacity`: nada de `width`, `height`,
 *   `margin`, `top` o `left` animados (evitan layout/paint).
 * - Entradas `ease-out` elástico, salidas más rápidas que entradas.
 * - Duraciones de ruta entre 180-240 ms; nada supera 300 ms.
 * - Sin `scale()` sobre contenedores de página completa: escalar
 *   toda la vista obliga a re-rasterizar y hunde los FPS.
 * - Transiciones CSS interruptibles en lugar de keyframes para
 *   navegaciones rápidas consecutivas.
 */
export const routeAnimations = trigger('routeAnimations', [
  /**
   * Login <=> Register: deslizamiento direccional leve + fade.
   * Desplazamiento corto (12 px) para no marear en un flujo
   * que el usuario puede repetir varias veces.
   */
  transition('login <=> register', [
    ...baseContainment,
    group([
      query(
        ':leave',
        [
          style({ opacity: 1, transform: 'translateX(0)' }),
          animate(
            `${LEAVE_MS}ms ${EXIT}`,
            style({ opacity: 0, transform: 'translateX(-12px)' }),
          ),
        ],
        { optional: true },
      ),
      query(
        ':enter',
        [
          style({ opacity: 0, transform: 'translateX(16px)' }),
          animate(
            `${ENTER_MS}ms ${SPRING}`,
            style({ opacity: 1, transform: 'translateX(0)' }),
          ),
        ],
        { optional: true },
      ),
    ]),
    ...innerStagger,
    query(':enter', animateChild(), { optional: true }),
  ]),

  /**
   * Transición por defecto: elevación mínima + cross-fade.
   * Cubre landing, dashboard, turnos, perfil y estadísticas con
   * un único movimiento coherente en lugar de siete coreografías
   * distintas de 400-500 ms que se percibían lentas.
   */
  transition('* <=> *', [
    ...baseContainment,
    query(
      ':leave',
      [animate(`${LEAVE_MS}ms ${EXIT}`, style({ opacity: 0 }))],
      { optional: true },
    ),
    query(
      ':enter',
      [
        style({ opacity: 0, transform: 'translateY(8px)' }),
        animate(
          `${ENTER_MS}ms ${SPRING}`,
          style({ opacity: 1, transform: 'translateY(0)' }),
        ),
      ],
      { optional: true },
    ),
    ...innerStagger,
    query(':enter', animateChild(), { optional: true }),
  ]),
]);

/**
 * Fundido simple de entrada y salida.
 * Uso: overlays ligeros y contenedores de página.
 */
export const fadeIn = trigger('fadeIn', [
  transition(':enter', [
    style({ opacity: 0 }),
    animate(`180ms ${SPRING}`, style({ opacity: 1 })),
  ]),
  transition(':leave', [animate(`120ms ${EXIT}`, style({ opacity: 0 }))]),
]);

/**
 * Deslizamiento vertical ascendente con fade.
 * Uso: tarjetas y bloques que aparecen bajo el pliegue.
 */
export const slideUp = trigger('slideUp', [
  transition(':enter', [
    style({ opacity: 0, transform: 'translateY(12px)' }),
    animate(
      `220ms ${SPRING}`,
      style({ opacity: 1, transform: 'translateY(0)' }),
    ),
  ]),
  transition(':leave', [
    animate(
      `${LEAVE_MS}ms ${EXIT}`,
      style({ opacity: 0, transform: 'translateY(-8px)' }),
    ),
  ]),
]);

/**
 * Deslizamiento horizontal desde la izquierda.
 * Uso: sidebar de escritorio en el primer montaje.
 */
export const slideInLeft = trigger('slideInLeft', [
  transition(':enter', [
    style({ opacity: 0, transform: 'translateX(-16px)' }),
    animate(
      `220ms ${SPRING}`,
      style({ opacity: 1, transform: 'translateX(0)' }),
    ),
  ]),
  transition(':leave', [
    animate(
      `${LEAVE_MS}ms ${EXIT}`,
      style({ opacity: 0, transform: 'translateX(12px)' }),
    ),
  ]),
]);

/**
 * Transición para dropdowns y popovers.
 * Escala desde 0.97 (nunca desde 0) y nace del punto de
 * origen del disparador mediante `--transform-origin`.
 */
export const dropdownFade = trigger('dropdownFade', [
  transition(':enter', [
    style({ opacity: 0, transform: 'translateY(-4px) scale(0.97)' }),
    animate(
      `160ms ${SPRING}`,
      style({ opacity: 1, transform: 'translateY(0) scale(1)' }),
    ),
  ]),
  transition(':leave', [
    animate(
      `120ms ${EXIT}`,
      style({ opacity: 0, transform: 'translateY(-4px) scale(0.97)' }),
    ),
  ]),
]);

/**
 * Fundido para fondos de modales y drawers.
 * Solo `opacity`: el elemento con blur nunca se anima con
 * filtro, solo su opacidad, para no repintar cada frame.
 */
export const overlayFade = trigger('overlayFade', [
  transition(':enter', [
    style({ opacity: 0 }),
    animate(`160ms ${EXIT}`, style({ opacity: 1 })),
  ]),
  transition(':leave', [animate(`120ms ${EXIT}`, style({ opacity: 0 }))]),
]);

/**
 * Deslizamiento lateral para el drawer móvil.
 * Curva iOS con salida más rápida que la entrada.
 */
export const drawerSlide = trigger('drawerSlide', [
  transition(':enter', [
    style({ transform: 'translateX(-100%)' }),
    animate(`240ms ${DRAWER}`, style({ transform: 'translateX(0)' })),
  ]),
  transition(':leave', [
    animate(`160ms ${EXIT}`, style({ transform: 'translateX(-100%)' })),
  ]),
]);
