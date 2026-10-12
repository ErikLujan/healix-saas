/**
 * Utilidades de formato de fecha para la configuración regional es-AR.
 *
 * Centraliza el recorte de marcas ISO y los nombres de mes y fecha
 * legible mediante `Intl`, evitando mapas manuales duplicados.
 */

const FORMATO_MES_LARGO = new Intl.DateTimeFormat('es-AR', { month: 'long' });

const FORMATO_FECHA_LEGIBLE = new Intl.DateTimeFormat('es-AR', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});

/**
 * Extrae la fecha corta `YYYY-MM-DD` de una marca ISO sin conversión de zona.
 *
 * @param valor Marca de tiempo ISO del dominio.
 * @returns Fecha corta o cadena vacía si no hay valor.
 */
export function extraerFechaCorta(valor: string | null | undefined): string {
  if (!valor) return '';
  return valor.substring(0, 10);
}

/**
 * Extrae la hora `HH:mm` de una marca ISO sin conversión de zona.
 *
 * @param valor Marca de tiempo ISO del dominio.
 * @returns Hora o cadena vacía si no hay valor.
 */
export function extraerHora(valor: string | null | undefined): string {
  if (!valor) return '';
  return valor.substring(11, 16);
}

/**
 * Resuelve el nombre del mes en español rioplatense.
 *
 * @param mes Mes como número `1-12` o cadena `01-12`.
 * @returns Nombre del mes o el valor original si es inválido.
 */
export function nombreMesEsAR(mes: string | number): string {
  const numero = typeof mes === 'string' ? Number(mes) : mes;
  if (!Number.isInteger(numero) || numero < 1 || numero > 12) return String(mes);
  return FORMATO_MES_LARGO.format(new Date(2026, numero - 1, 1));
}

/**
 * Formatea una marca ISO como fecha legible es-AR.
 *
 * @param valor Marca de tiempo ISO del dominio.
 * @returns Fecha legible o cadena vacía si no hay valor.
 */
export function formatearFechaLegibleEsAR(valor: string | null | undefined): string {
  if (!valor) return '';
  const [anio, mes, dia] = extraerFechaCorta(valor).split('-').map(Number);
  if (!anio || !mes || !dia) return valor.substring(0, 10);
  return FORMATO_FECHA_LEGIBLE.format(new Date(anio, mes - 1, dia));
}
