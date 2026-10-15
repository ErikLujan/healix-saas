/**
 * Políticas de autenticación y archivos vigentes por contexto.
 *
 * Fuente única documentada: los valores difieren entre contextos por
 * decisión de producto pendiente de unificación. No endurecer ni
 * relajar estos límites sin una decisión explícita de producto.
 *
 * Divergencias conocidas:
 * - Contraseña mínima: 6 (perfil propio) frente a 8 (alta de administrador).
 * - Avatar máximo: 2 MB (perfil propio) frente a indicación 5 MB (alta de administrador).
 */
export const LONGITUD_MINIMA_PASSWORD_PERFIL = 6;

export const LONGITUD_MINIMA_PASSWORD_ADMIN = 8;

export const TAMANO_MAXIMO_AVATAR_PERFIL_BYTES = 2 * 1024 * 1024;
