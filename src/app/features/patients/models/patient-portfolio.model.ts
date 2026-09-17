/**
 * Modelos de dominio para el portafolio de pacientes del especialista.
 *
 * Define la interfaz estructurada que representa un paciente atendido
 * por un especialista, utilizado en la vista de listado y en el
 * componente de detalle (drawer).
 *
 * Regla de negocio: Un especialista mantiene relación profesional
 * únicamente con pacientes que ha atendido al menos una vez
 * (turno con estado 'finalizado').
 */

/**
 * Representa un paciente atendido por un especialista en el portafolio.
 *
 * Se construye mediante la deduplicación de turnos finalizados,
 * agrupando por `paciente_id` y contabilizando el total de consultas
 * realizadas.
 *
 * @property id UUID del paciente (de profiles.id).
 * @property full_name Nombre completo del paciente.
 * @property email Correo electrónico del paciente (opcional: solo visible
 * para el propietario y el administrador tras el endurecimiento RLS).
 * @property dni Documento Nacional de Identidad (opcional, de pacientes.dni).
 * @property avatar_url URL del avatar del paciente (opcional).
 * @property totalConsultas Cantidad de turnos finalizados con este especialista.
 */
export interface PacienteAtendido {
  readonly id: string;
  readonly full_name: string;
  readonly email?: string;
  readonly dni?: string;
  readonly avatar_url?: string;
  readonly totalConsultas: number;
}
