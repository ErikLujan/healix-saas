/**
 * Definiciones de tipos y firmas de datos para el componente de paginacion.
 *
 * Centraliza las interfaces y tipos utilizados por el componente de paginacion
 * y sus consumidores, garantizando tipado estricto en toda la comunicacion
 * entre componentes.
 */

/**
 * Rango de indices resultante de aplicar paginacion sobre una coleccion.
 *
 * Representa el subconjunto visible de registros para la pagina actual,
 * util para mostrar contadores informativos tipo "Mostrando X de Y".
 */
export interface PaginationRange {
  /** Indice del primer elemento visible (1-indexed). */
  readonly start: number;
  /** Indice del ultimo elemento visible (1-indexed). */
  readonly end: number;
  /** Cantidad total de elementos en la coleccion. */
  readonly total: number;
}

/**
 * Evento emitido cuando el usuario selecciona una nueva pagina.
 *
 * Contiene unicamente el numero de pagina destino. El componente
 * consumidor es responsable de actualizar su estado y re-emitir
 * el nuevo valor como input para mantener la sincronizacion reactiva.
 */
export type PageChangeEvent = number;
