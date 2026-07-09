/**
 * Modelos de dominio para la entidad Turno.
 *
 * Define la interfaz estructurada que representa un registro de la tabla
 * `public.turnos`, los tipos auxiliares para insercion y los tipos
 * relacionados con encuestas, calificaciones y comentarios operativos.
 */

import { TurnoEstado } from '../models/database.types';

/**
 * Representa un turno medico completo con todas sus relaciones y campos operativos.
 *
 * Cada turno conecta un paciente con un especialista para una especialidad
 * determinada en una fecha y hora especificas. Atraviesa un ciclo de vida
 * definido por el ENUM `turno_estado`.
 *
 * Restricciones de negocio:
 * - Solo puede existir un turno confirmado por especialista y fecha_hora.
 * - El estado inicial siempre es 'pendiente'.
 * - Los campos de comentario y encuesta se completan segun el estado.
 */
export interface Turno {
  readonly id: string;
  readonly paciente_id: string;
  readonly especialista_id: string;
  readonly especialidad_id: string;
  readonly fecha_hora: string;
  readonly estado: TurnoEstado;
  readonly comentario_cancelacion_rechazo: string | null;
  readonly resena_diagnostico: string | null;
  readonly calificacion_comentario: string | null;
  readonly calificacion_estrellas: number | null;
  readonly encuesta_satisfaccion: EncuestaSatisfaccion | null;
  readonly created_at: string;
  readonly updated_at: string;
}

/**
 * Payload para la creacion de un nuevo turno.
 *
 * Omite campos automaticos (id, created_at, updated_at) y establece
 * el estado inicial como 'pendiente' por defecto.
 * Los campos operativos (comentarios, encuesta, etc.) son opcionales.
 */
export interface TurnoInsert {
  readonly paciente_id: string;
  readonly especialista_id: string;
  readonly especialidad_id: string;
  readonly fecha_hora: string;
  readonly estado?: TurnoEstado;
  readonly comentario_cancelacion_rechazo?: string | null;
  readonly resena_diagnostico?: string | null;
  readonly calificacion_comentario?: string | null;
  readonly calificacion_estrellas?: number | null;
  readonly encuesta_satisfaccion?: EncuestaSatisfaccion | null;
}

/**
 * Payload para actualizacion parcial de un turno.
 * Solo se utilizan campos que cambian durante el ciclo de vida.
 */
export type TurnoUpdate = Partial<Pick<Turno,
  | 'estado'
  | 'comentario_cancelacion_rechazo'
  | 'resena_diagnostico'
  | 'calificacion_comentario'
  | 'calificacion_estrellas'
  | 'encuesta_satisfaccion'
>>;

/**
 * Estructura JSONB de la encuesta de satisfaccion.
 * Se almacena como objeto JSON en la columna `encuesta_satisfaccion`.
 */
export interface EncuestaSatisfaccion {
  readonly atencion: number;
  readonly puntualidad: number;
  readonly instalaciones: number;
  readonly comentarios: string;
}

/**
 * Perfil basico del especialista para consultas relacionadas.
 * Se obtiene mediante join con la tabla `profiles`.
 */
export interface PerfilEspecialista {
  readonly id: string;
  readonly full_name: string;
  readonly avatar_url: string | null;
}

/**
 * Perfil basico del paciente para consultas relacionadas.
 * Se obtiene mediante join con la tabla `profiles`.
 */
export interface PerfilPaciente {
  readonly id: string;
  readonly full_name: string;
  readonly email: string;
}

/**
 * Nombre legible de la especialidad para consultas relacionadas.
 * Se obtiene mediante join con la tabla `specialties`.
 */
export interface EspecialidadInfo {
  readonly id: string;
  readonly name: string;
}

/**
 * Turno enriquecido con datos de perfil del paciente, especialista y especialidad.
 * Utilizado para listados y dashboards donde se necesita mostrar informacion
 * completa sin consultas adicionales.
 */
export interface TurnoConRelaciones extends Turno {
  readonly paciente?: PerfilPaciente;
  readonly especialista?: PerfilEspecialista;
  readonly especialidad?: EspecialidadInfo;
}

/**
 * Estados del turno como constantes tipadas para uso en comparaciones.
 */
export const ESTADOS_TURNO = {
  PENDIENTE: 'pendiente' as const,
  CONFIRMADO: 'confirmado' as const,
  RECHAZADO: 'rechazado' as const,
  CANCELADO: 'cancelado' as const,
  FINALIZADO: 'finalizado' as const,
} as const;

/**
 * Estados que representan fin de ciclo (no permiten transiciones posteriores).
 */
export const ESTADOS_TERMINALES: ReadonlySet<TurnoEstado> = new Set<TurnoEstado>([
  'rechazado',
  'cancelado',
  'finalizado',
]);

/**
 * Estados que permiten que el horario sea reutilizado por otro turno.
 */
export const ESTADOS_LIBERAN_HORARIO: ReadonlySet<TurnoEstado> = new Set<TurnoEstado>([
  'cancelado',
  'rechazado',
]);
