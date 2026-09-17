/**
 * Modelos de dominio para el módulo de disponibilidad y agenda médica.
 *
 * Define las interfaces que representan los registros de la tabla
 * `public.disponibilidad_especialista` y los tipos auxiliares
 * utilizados por el algoritmo de generación de bloques horarios.
 */

/**
 * Representa un registro persistente de disponibilidad en la base de datos.
 *
 * Cada fila indica que un especialista puede atender una especialidad
 * determinada en un dia de la semana dentro de un rango horario especifico.
 *
 * Restricciones de negocio:
 * - dia_semana: 0 (domingo) está prohibido por política de la clínica.
 * - hora_fin debe ser estrictamente mayor que hora_inicio.
 * - Lunes a Viernes: rango válido 08:00 - 19:00.
 * - Sábados: rango válido 08:00 - 14:00.
 */
export interface DisponibilidadEspecialista {
  readonly id: string;
  readonly especialista_id: string;
  readonly especialidad_id: string;
  readonly dia_semana: DiaSemana;
  readonly hora_inicio: string;
  readonly hora_fin: string;
}

/**
 * Tipo auxiliar para el payload de inserción de disponibilidad.
 * Omite el campo `id` ya que es generado automáticamente por la base de datos.
 */
export type DisponibilidadEspecialistaInsert = Omit<DisponibilidadEspecialista, 'id'>;

/**
 * Dias de la semana representados como enteros.
 *
 * 0 = Domingo (prohibido por regla de negocio)
 * 1 = Lunes
 * 2 = Martes
 * 3 = Miércoles
 * 4 = Jueves
 * 5 = Viernes
 * 6 = Sábado
 */
export type DiaSemana = 0 | 1 | 2 | 3 | 4 | 5 | 6;

/**
 * Constantes que definen los límites horarios permitidos por la clínica.
 *
 * Lunes a Viernes: 08:00 - 19:00
 * Sábados: 08:00 - 14:00
 * Domingos: no configurable
 */
export const RESTRICCIONES_HORARIAS: Readonly<Record<number, { readonly inicio: string; readonly fin: string }>> = {
  1: { inicio: '08:00', fin: '19:00' },
  2: { inicio: '08:00', fin: '19:00' },
  3: { inicio: '08:00', fin: '19:00' },
  4: { inicio: '08:00', fin: '19:00' },
  5: { inicio: '08:00', fin: '19:00' },
  6: { inicio: '08:00', fin: '14:00' },
} as const;

/** Duración fija en minutos de cada bloque de atención generado. */
export const DURACION_SLOT_MINUTOS = 30;

/** Nombre legible de cada dia de la semana para la interfaz. */
export const NOMBRES_DIAS: ReadonlyArray<string> = [
  'Domingo',
  'Lunes',
  'Martes',
  'Miércoles',
  'Jueves',
  'Viernes',
  'Sábado',
] as const;

/**
 * Representa un bloque horario generado dinámicamente a partir
 * de la disponibilidad configurada por el especialista.
 *
 * No es una entidad persistente. Es un modelo de presentación
 * utilizado por la grilla de agenda y por el wizard de reserva
 * de turnos del paciente.
 *
 * @property hora - Cadena horaria en formato "HH:mm".
 * @property ocupado - Indica si el bloque ya fue reservado por un turno confirmado.
 * @property especialidad_id - Identificador de la especialidad asociada al bloque.
 */
export interface TimeSlot {
  readonly hora: string;
  readonly ocupado: boolean;
  readonly especialidad_id: string;
}

/**
 * Configuración temporal que el especialista define para un día
 * específico de la semana. Utilizado como estado intermedio
 * durante la edición de la agenda antes de persistir en Supabase.
 */
export interface ConfiguracionDia {
  readonly habilitado: boolean;
  readonly bloques: ReadonlyArray<BloqueHorario>;
}

/**
 * Un bloque horario individual dentro de la configuración semanal.
 * Representa un intervalo de inicio-fin asociado a una especialidad.
 */
export interface BloqueHorario {
  readonly especialidad_id: string;
  readonly hora_inicio: string;
  readonly hora_fin: string;
}

/**
 * Estado completo de la configuración semanal del especialista.
 * Clave: día de la semana (1-6). Valor: configuración del día.
 */
export type AgendaSemanal = Readonly<Record<number, ConfiguracionDia>>;

/**
 * Especialidad vinculada al perfil de un especialista.
 * Utilizado por el formulario de disponibilidad y la vista previa.
 */
export interface EspecialidadPerfil {
  readonly id: string;
  readonly name: string;
}

/**
 * Información de un día de la semana para la interfaz.
 */
export interface DiaInfo {
  readonly id: DiaSemana;
  readonly nombre: string;
}
