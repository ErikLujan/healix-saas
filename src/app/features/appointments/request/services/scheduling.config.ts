/**
 * Reglas de agenda para la solicitud de turnos.
 *
 * Fuente única de la ventana de búsqueda y el día de descanso
 * semanal de la clínica. La duración del bloque se reexporta desde
 * el modelo de disponibilidad, que es la definición canonical
 * compartida con la vista previa del especialista.
 */
export { DURACION_SLOT_MINUTOS } from '@core/models/disponibilidad.model';

export const VENTANA_DIAS_SOLICITUD = 15;

export const DIA_DESCANSO_DOMINGO = 0;
