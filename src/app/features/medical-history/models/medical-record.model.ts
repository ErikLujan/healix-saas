/**
 * Modelos de dominio para el módulo de Historias Clínicas.
 *
 * Define las interfaces que representan los registros de la tabla
 * `public.historias_clinicas` y los tipos auxiliares para datos
 * clínicos fijos y dinámicos almacenados en formato JSONB.
 *
 * Sprint 5: Se incorporan tres parámetros clínicos obligatorios
 * que se persisten dentro del campo `datos_dinamicos` con claves
 * internas prefijadas para diferenciarlos de los datos libres
 * ingresados por el especialista.
 */

/** Límite operativo de datos dinámicos libres por historia clínica. */
export const MAX_DATOS_DINAMICOS = 3;

/**
 * Claves internas reservadas para los parámetros clínicos obligatorios.
 *
 * Se utilizan prefijos `_s5_` (Sprint 5) para aislar los campos
 * obligatorios de los datos dinámicos libres que ingresa el especialista.
 * Esto garantiza que la visualización pueda identificar y renderizar
 * cada tipo de dato con el componente visual correspondiente.
 */
export const CLAVES_OBLIGATORIAS = {
  /** Evaluación de dolor en escala visual (0-10). */
  RANGO_DOLOR: '_s5_evaluacion_dolor',
  /** Valor numérico de frecuencia cardíaca (lpm). */
  FRECUENCIA_CARDIACA: '_s5_frecuencia_cardiaca',
  /** Indicador booleano: ¿el paciente refirió alergias? */
  ALERGIAS_REFIRIDAS: '_s5_alergias_refiridas',
} as const;

/**
 * Tipo que representa las claves obligatorias del Sprint 5.
 */
export type ClaveObligatoria = typeof CLAVES_OBLIGATORIAS[keyof typeof CLAVES_OBLIGATORIAS];

/**
 * Par clave-valor que representa un dato clínico adicional.
 *
 * Cada especialista podrá registrar información específica de la
 * consulta que no forma parte de los campos obligatorios. La
 * estructura se almacena como array de objetos dentro del campo
 * JSONB `datos_dinamicos` de Supabase.
 *
 * Los datos se dividen en dos categorías:
 * - **Obligatorios** (prefijo `_s5_`): campos controlados por
 *   la plataforma que el especialista debe completar en todo alta.
 * - **Libres**: pares clave-valor que el especialista agrega
 *   voluntariamente para registrar información adicional.
 *
 * @property clave Nombre del indicador clínico (ej: "colesterol" o "_s5_evaluacion_dolor").
 * @property valor Valor registrado para ese indicador (ej: "200 mg/dl" o "7").
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
 * Valores del formulario de alta médica del especialista.
 *
 * Representa el estado completo del formulario reactivo que
 * el especialista completa al finalizar una consulta. Incluye
 * los parámetros fijos, los tres controles obligatorios del
 * Sprint 5 y los datos dinámicos libres opcionales.
 */
export interface MedicalRecordFormValues {
  /** Altura del paciente en centímetros. */
  readonly altura: number;
  /** Peso del paciente en kilogramos. */
  readonly peso: number;
  /** Temperatura corporal en grados Celsius. */
  readonly temperatura: number;
  /** Presión arterial en formato "sistólica/diastólica". */
  readonly presion_arterial: string;
  /** Evaluación de dolor en escala visual 0-10 (rango). */
  readonly evaluacion_dolor: number;
  /** Frecuencia cardíaca en latidos por minuto (numérico). */
  readonly frecuencia_cardiaca: number;
  /** Indicador booleano: ¿el paciente refirió alergias? */
  readonly alergias_refiridas: boolean;
  /** Reseña clínica textual de la consulta. */
  readonly resena: string;
  /** Datos dinámicos libres adicionales (máximo 3). */
  readonly datos_libres: readonly DynamicMedicalData[];
}

/**
 * Perfil básico del paciente para consultas relacionadas.
 * Se obtiene mediante la vista `vista_perfiles_publicos`.
 * El correo es opcional: solo el propietario y el administrador
 * pueden leerlo desde la tabla base `profiles`.
 */
export interface PacienteInfo {
  readonly id: string;
  readonly full_name: string;
  readonly email?: string;
  readonly avatar_url?: string | null;
  readonly dni?: string;
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
