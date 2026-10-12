/**
 * Utilidades de formato de fecha para la configuración regional es-AR.
 *
 * Centraliza el recorte de marcas ISO y los nombres de mes y fecha
 * legible mediante `Intl`, evitando mapas manuales duplicados.
 */

const FORMATO_MES_LARGO = new Intl.DateTimeFormat('es-AR', { month: 'long' });

const FORMATO_MES_CORTO = new Intl.DateTimeFormat('es-AR', { month: 'short' });

const FORMATO_DIA_LARGO = new Intl.DateTimeFormat('es-AR', { weekday: 'long' });

const FORMATO_DIA_CORTO = new Intl.DateTimeFormat('es-AR', { weekday: 'short' });

const FORMATO_FECHA_LEGIBLE = new Intl.DateTimeFormat('es-AR', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});

const FORMATO_FECHA_CORTA_LEGIBLE = new Intl.DateTimeFormat('es-AR', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
});

const FORMATO_FECHA_LARGA = new Intl.DateTimeFormat('es-AR', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});

/**
 * Fecha local actual en formato `YYYY-MM-DD` sin conversión de zona.
 *
 * @returns Fecha local del dispositivo.
 */
export function fechaLocalHoy(): string {
  const ahora = new Date();
  const anio = ahora.getFullYear();
  const mes = String(ahora.getMonth() + 1).padStart(2, '0');
  const dia = String(ahora.getDate()).padStart(2, '0');
  return `${anio}-${mes}-${dia}`;
}

/**
 * Fecha y hora local actual en formato `YYYY-MM-DDTHH:mm`.
 *
 * Permite comparar marcas de agenda en hora local de la clínica
 * mediante orden lexicográfico, sin conversiones de zona.
 *
 * @returns Marca local del dispositivo.
 */
export function fechaHoraLocalActual(): string {
  const ahora = new Date();
  const horas = String(ahora.getHours()).padStart(2, '0');
  const minutos = String(ahora.getMinutes()).padStart(2, '0');
  return `${fechaLocalHoy()}T${horas}:${minutos}`;
}

/**
 * Año local actual del dispositivo.
 *
 * @returns Año en curso.
 */
export function anioActual(): number {
  return new Date().getFullYear();
}

/**
 * Nombre del día de la semana en español rioplatense.
 *
 * @param fecha Fecha base para resolver el día.
 * @returns Nombre del día con inicial mayúscula.
 */
export function nombreDiaEsAR(fecha: Date): string {
  const crudo = FORMATO_DIA_LARGO.format(fecha);
  return crudo.charAt(0).toUpperCase() + crudo.slice(1);
}

/**
 * Nombre corto del día de la semana en español rioplatense.
 *
 * @param diaSemana Día `0-6` según `Date.getDay()`.
 * @returns Abreviatura con inicial mayúscula o cadena vacía si es inválido.
 */
export function nombreDiaCortoEsAR(diaSemana: number): string {
  if (!Number.isInteger(diaSemana) || diaSemana < 0 || diaSemana > 6) return '';
  const crudo = FORMATO_DIA_CORTO.format(new Date(2026, 0, 4 + diaSemana)).replace(/\./g, '').trim();
  return crudo.charAt(0).toUpperCase() + crudo.slice(1);
}

/**
 * Nombre corto del mes en español rioplatense.
 *
 * @param mes Mes como número `1-12` o cadena `01-12`.
 * @returns Abreviatura con inicial mayúscula o el valor original si es inválido.
 */
export function nombreMesCortoEsAR(mes: string | number): string {
  const numero = typeof mes === 'string' ? Number(mes) : mes;
  if (!Number.isInteger(numero) || numero < 1 || numero > 12) return String(mes);
  const crudo = FORMATO_MES_CORTO.format(new Date(2026, numero - 1, 1)).replace(/\./g, '').trim();
  return crudo.charAt(0).toUpperCase() + crudo.slice(1);
}

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

/**
 * Formatea una marca ISO como fecha corta legible es-AR.
 *
 * @param valor Marca de tiempo ISO del dominio.
 * @returns Fecha corta legible o cadena vacía si no hay valor.
 */
export function formatearFechaCortaLegibleEsAR(valor: string | null | undefined): string {
  if (!valor) return '';
  const [anio, mes, dia] = extraerFechaCorta(valor).split('-').map(Number);
  if (!anio || !mes || !dia) return valor.substring(0, 10);
  return FORMATO_FECHA_CORTA_LEGIBLE.format(new Date(anio, mes - 1, dia));
}

/**
 * Formatea una marca ISO como fecha larga es-AR con día de semana.
 *
 * @param valor Marca de tiempo ISO del dominio.
 * @returns Fecha larga o cadena vacía si no hay valor.
 */
export function formatearFechaLargaEsAR(valor: string | null | undefined): string {
  if (!valor) return '';
  const [anio, mes, dia] = extraerFechaCorta(valor).split('-').map(Number);
  if (!anio || !mes || !dia) return valor.substring(0, 10);
  const crudo = FORMATO_FECHA_LARGA.format(new Date(anio, mes - 1, dia));
  return crudo.charAt(0).toUpperCase() + crudo.slice(1);
}

/**
 * Fecha corta `YYYY-MM-DD` desde un objeto Date en hora local.
 *
 * @param fecha Objeto Date a formatear.
 * @returns Cadena en formato de fecha corta.
 */
export function formatearFechaCorta(fecha: Date): string {
  const anio = fecha.getFullYear();
  const mes = String(fecha.getMonth() + 1).padStart(2, '0');
  const dia = String(fecha.getDate()).padStart(2, '0');
  return `${anio}-${mes}-${dia}`;
}

/**
 * Día de la semana local desde una fecha corta, sin conversión de zona.
 *
 * @param fechaCorta Fecha `YYYY-MM-DD`.
 * @returns Día `0-6` según `Date.getDay()` local.
 */
export function obtenerDiaSemanaLocal(fechaCorta: string): number {
  const [anio, mes, dia] = fechaCorta.split('-').map(Number);
  if (!anio || !mes || !dia) return 0;
  return new Date(anio, mes - 1, dia).getDay();
}

/**
 * Construye la marca ISO de un turno desde fecha y hora locales.
 *
 * Convención vigente de la clínica: la hora local seleccionada se
 * almacena como ISO con sufijo `Z`, y todos los lectores la interpretan
 * como hora local mediante recorte (`extraerFechaCorta`, `extraerHora`),
 * nunca mediante conversión `Date` a UTC. Mantener esta convención en
 * escritura y lectura evita desplazamientos de zona y dobles reservas.
 * Fuente requerida para migrar a zona real: cambio de almacenamiento
 * a `timestamptz` con conversión local en cada lector.
 *
 * @param fecha Fecha `YYYY-MM-DD` seleccionada.
 * @param hora Hora `HH:mm` seleccionada.
 * @returns Marca ISO del turno.
 */
export function construirFechaHoraISO(fecha: string, hora: string): string {
  return `${fecha}T${hora}:00.000Z`;
}

/**
 * Límite inferior ISO de un día de agenda en hora local.
 *
 * @param fecha Fecha `YYYY-MM-DD`.
 * @returns Inicio del día en la convención de la clínica.
 */
export function inicioDiaISO(fecha: string): string {
  return `${fecha}T00:00:00.000Z`;
}

/**
 * Límite superior ISO de un día de agenda en hora local.
 *
 * @param fecha Fecha `YYYY-MM-DD`.
 * @returns Fin del día en la convención de la clínica.
 */
export function finDiaISO(fecha: string): string {
  return `${fecha}T23:59:59.999Z`;
}
