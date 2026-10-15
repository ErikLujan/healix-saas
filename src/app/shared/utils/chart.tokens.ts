/**
 * Paleta de gráficos derivada de los tokens CSS de la aplicación.
 *
 * Resuelve los valores de `@theme` en tiempo de ejecución para que
 * Chart.js reciba colores concretos sin duplicar literales en cada
 * configuración. Los respaldos replican los valores de `styles.scss`.
 */

/** Nombres de tokens CSS utilizados por los gráficos. */
const TOKEN_MARCA_700 = '--color-brand-700';const TOKEN_MARCA_500 = '--color-brand-500';
const TOKEN_MARCA_900 = '--color-brand-900';
const TOKEN_EXITO = '--color-success';
const TOKEN_PENDIENTE = '--color-pendiente';
const TOKEN_FINALIZADO = '--color-finalizado';
const TOKEN_CANCELADO = '--color-cancelado';
const TOKEN_RECHAZADO = '--color-rechazado';
const TOKEN_TEXTO = '--color-text-primary';
const TOKEN_TEXTO_SUTIL = '--color-text-subtle';
const TOKEN_BORDE = '--color-border';
const TOKEN_SUPERFICIE = '--color-surface';

/**
 * Lee un token CSS del documento con un respaldo fijo.
 *
 * @param nombre Nombre del token CSS con prefijo `--`.
 * @param respaldo Valor utilizado si el token no está definido.
 * @returns Color concreto para Chart.js.
 */
export function leerTokenCss(nombre: string, respaldo: string): string {
  const valor = getComputedStyle(document.documentElement).getPropertyValue(nombre).trim();
  return valor || respaldo;
}

/**
 * Aplica un canal alfa a un color hexadecimal `#RRGGBB`.
 *
 * @param hexadecimal Color base en formato hexadecimal.
 * @param alfa Opacidad entre 0 y 1.
 * @returns Color en formato `rgba()`.
 */
export function aplicarAlfa(hexadecimal: string, alfa: number): string {
  const limpio = hexadecimal.replace('#', '');
  const rojo = parseInt(limpio.substring(0, 2), 16);
  const verde = parseInt(limpio.substring(2, 4), 16);
  const azul = parseInt(limpio.substring(4, 6), 16);
  return `rgba(${rojo}, ${verde}, ${azul}, ${alfa})`;
}

/**
 * Resuelve la paleta completa de gráficos desde los tokens vigentes.
 *
 * @returns Colores concretos para datasets, ejes, leyendas y tooltips.
 */
export function paletaGraficos(): {
  readonly marca700: string;
  readonly marca500: string;
  readonly marca900: string;
  readonly exito: string;
  readonly pendiente: string;
  readonly finalizado: string;
  readonly cancelado: string;
  readonly rechazo: string;
  readonly texto: string;
  readonly textoSutil: string;
  readonly borde: string;
  readonly superficie: string;
  readonly fuente: string;
} {
  return {
    marca700: leerTokenCss(TOKEN_MARCA_700, '#0F4C4A'),
    marca500: leerTokenCss(TOKEN_MARCA_500, '#2A857F'),
    marca900: leerTokenCss(TOKEN_MARCA_900, '#0B3A38'),
    exito: leerTokenCss(TOKEN_EXITO, '#0F766E'),
    pendiente: leerTokenCss(TOKEN_PENDIENTE, '#B45309'),
    finalizado: leerTokenCss(TOKEN_FINALIZADO, '#475569'),
    cancelado: leerTokenCss(TOKEN_CANCELADO, '#92400E'),
    rechazo: leerTokenCss(TOKEN_RECHAZADO, '#B91C1C'),
    texto: leerTokenCss(TOKEN_TEXTO, '#0F172A'),
    textoSutil: leerTokenCss(TOKEN_TEXTO_SUTIL, '#6B7280'),
    borde: leerTokenCss(TOKEN_BORDE, '#E5E7EB'),
    superficie: leerTokenCss(TOKEN_SUPERFICIE, '#FFFFFF'),
    fuente: "'Inter', system-ui, sans-serif",
  };
}

/**
 * Detecta tokens de gráficos sin resolver en el documento.
 *
 * Utilizada por la aserción de arranque: en desarrollo falla rápido
 * cuando `@theme` no aplicó los valores, evitando que los respaldos
 * documentados silencien un tema roto.
 *
 * @returns Nombres de tokens CSS ausentes o vacíos.
 */
export function tokensGraficosFaltantes(): readonly string[] {
  const tokens = [
    TOKEN_MARCA_700,
    TOKEN_MARCA_500,
    TOKEN_MARCA_900,
    TOKEN_EXITO,
    TOKEN_PENDIENTE,
    TOKEN_FINALIZADO,
    TOKEN_CANCELADO,
    TOKEN_RECHAZADO,
    TOKEN_TEXTO,
    TOKEN_TEXTO_SUTIL,
    TOKEN_BORDE,
    TOKEN_SUPERFICIE,
  ];
  return tokens.filter(nombre => leerTokenCss(nombre, '').trim() === '');
}

/**
 * Paleta categórica para gráficos de torta, solo con tonos del sistema.
 *
 * @returns Siete colores diferenciables para segmentos.
 */
export function paletaTorta(): readonly string[] {
  const paleta = paletaGraficos();
  return [
    paleta.marca700,
    paleta.marca500,
    paleta.exito,
    paleta.pendiente,
    paleta.finalizado,
    paleta.cancelado,
    paleta.rechazo,
  ];
}
