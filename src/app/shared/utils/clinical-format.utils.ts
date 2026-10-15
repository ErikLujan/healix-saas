/**
 * Formato clínico compartido para historias médicas.
 *
 * Centraliza unidades de parámetros fisiológicos, umbrales de dolor
 * EVA y el mapa de claves dinámicas para que todas las vistas de
 * historial presenten los mismos textos y estilos.
 */

/**
 * Unidades de los parámetros fisiológicos fijos.
 */
export const UNIDADES_CLINICAS = {
  altura: 'cm',
  peso: 'kg',
  temperatura: '°C',
  frecuenciaCardiaca: 'lpm',
} as const;

/**
 * Mapa de claves dinámicas a etiquetas legibles.
 */
const MAPA_CLAVES_DINAMICAS: Readonly<Record<string, string>> = {
  colesterol: 'Colesterol',
  glucosa: 'Glucosa',
  'frecuencia cardiaca': 'Frec. Cardíaca',
  'saturacion de oxigeno': 'Saturación O₂',
  imc: 'IMC',
  'grupo sanguineo': 'Grupo Sanguíneo',
  'factor rh': 'Factor Rh',
  observaciones: 'Observaciones',
};

/**
 * Describe un nivel de dolor EVA 0-10.
 *
 * @param valor Nivel como cadena numérica.
 * @returns Etiqueta con nivel y severidad, o el valor original si no es numérico.
 */
export function formatearNivelDolor(valor: string): string {
  const nivel = parseInt(valor, 10);
  if (isNaN(nivel)) return valor;
  if (nivel <= 3) return `${nivel}/10 - Leve`;
  if (nivel <= 6) return `${nivel}/10 - Moderado`;
  return `${nivel}/10 - Intenso`;
}

/**
 * Clases de distintivo para un nivel de dolor EVA 0-10.
 *
 * @param valor Nivel como cadena numérica.
 * @returns Clases de fondo y texto del sistema de tokens.
 */
export function clasesNivelDolor(valor: string): string {
  const nivel = parseInt(valor, 10);
  if (isNaN(nivel)) return 'bg-surface-sunken text-text-secondary';
  if (nivel <= 3) return 'bg-emerald-100 text-emerald-700';
  if (nivel <= 6) return 'bg-amber-100 text-amber-700';
  return 'bg-red-100 text-red-700';
}

/**
 * Convierte una clave dinámica en etiqueta legible.
 *
 * @param clave Clave almacenada del dato dinámico.
 * @returns Etiqueta conocida o clave capitalizada por palabras.
 */
export function formatearClaveDinamica(clave: string): string {
  if (MAPA_CLAVES_DINAMICAS[clave]) return MAPA_CLAVES_DINAMICAS[clave];
  return clave
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (caracter) => caracter.toUpperCase());
}
