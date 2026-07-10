/**
 * Modelos de dominio para el módulo de Historias Clínicas.
 *
 * Define las interfaces que representan los registros de la tabla
 * `public.historias_clinicas` y los tipos auxiliares para datos
 * clínicos fijos y dinámicos almacenados en formato JSONB.
 */

/** Límite operativo de datos dinámicos por historia clínica. */
export const MAX_DATOS_DINAMICOS = 3;

/**
 * Par clave-valor que representa un dato clínico adicional.
 *
 * Cada especialista podrá registrar información específica de la
 * consulta que no forma parte de los campos obligatorios. La
 * estructura se almacena como array de objetos dentro del campo
 * JSONB `datos_dinamicos` de Supabase.
 *
 * @property clave Nombre del indicador clínico (ej: "colesterol").
 * @property valor Valor registrado para ese indicador (ej: "200 mg/dl").
 */
export interface DynamicMedicalData {
  readonly clave: string;
  readonly valor: string;
}

/**
 * Representa un registro completo de historia clínica persistido
 * en la tabla `public.historias_clinicas`.
 *
 * Cada registro corresponde a la atención médica realizada durante
 * un turno finalizado. La relación con el turno es de 1:1 estricta
 * mediante la restricción de unicidad sobre `turno_id`.
 *
 * El backend ejecuta automáticamente el trigger `trigger_sync_medical_history`
 * que actualiza el estado del turno a 'finalizado' al insertar con éxito
 * una historia clínica. El frontend no debe gestionar esa transición.
 */
export interface MedicalRecord {
  readonly id: string;
  readonly turno_id: string;
  readonly paciente_id: string;
  readonly especialista_id: string;
  readonly altura: number;
  readonly peso: number;
  readonly temperatura: number;
  readonly presion_arterial: string;
  readonly datos_dinamicos: readonly DynamicMedicalData[];
  readonly created_at: string;
}

/**
 * Payload para la inserción de una nueva historia clínica.
 *
 * Omite campos generados automáticamente por la base de datos
 * (id y created_at). El turno_id actúa como clave única que
 * garantiza la cardinalidad 1:1 con un turno.
 */
export type MedicalRecordInsert = Omit<MedicalRecord, 'id' | 'created_at'>;

/**
 * Perfil básico del paciente para consultas relacionadas.
 * Se obtiene mediante join con la tabla `profiles`.
 */
export interface PacienteInfo {
  readonly id: string;
  readonly full_name: string;
  readonly email: string;
}

/**
 * Perfil básico del especialista para consultas relacionadas.
 * Se obtiene mediante join con la tabla `profiles`.
 */
export interface EspecialistaInfo {
  readonly id: string;
  readonly full_name: string;
  readonly avatar_url: string | null;
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
 * Información del turno asociado a una historia clínica.
 * Se obtiene mediante join con la tabla `turnos`.
 */
export interface TurnoInfo {
  readonly id: string;
  readonly fecha_hora: string;
  readonly estado: string;
  readonly resena_diagnostico: string | null;
}

/**
 * Historia clínica enriquecida con datos de relaciones.
 *
 * Extiende MedicalRecord incorporando la información del paciente,
 * especialista, especialidad y turno asociados. Utilizada para
 * listados y vistas detalladas donde se necesita mostrar información
 * completa sin consultas adicionales.
 */
export interface MedicalRecordConRelaciones extends MedicalRecord {
  readonly paciente?: PacienteInfo;
  readonly especialista?: EspecialistaInfo;
  readonly especialidad?: EspecialidadInfo;
  readonly turno?: TurnoInfo;
}
