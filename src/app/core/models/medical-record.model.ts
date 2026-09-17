/**
 * Re-export de tipos de dominio compartidos del modulo de Historias Clinicas.
 *
 * Estos tipos son consumidos por multiples features del sistema
 * (appointments, dashboard, patients, profile, administration).
 * Se re-exportan desde core/models para centralizar la ruta de
 * acceso y respetar la direccion de dependencias del proyecto.
 *
 * La fuente canonical permanece en @features/medical-history/models/.
 * Este archivo existe unicamente como punto de re-exportacion.
 */
export type {
  MedicalRecord,
  MedicalRecordInsert,
  MedicalRecordConRelaciones,
  DynamicMedicalData,
  PacienteInfo,
  EspecialistaInfo as EspecialistaInfoHistoria,
  EspecialidadInfo as EspecialidadInfoHistoria,
  TurnoInfo,
  ClaveObligatoria,
  MedicalRecordFormValues,
} from '@features/medical-history/models/medical-record.model';

export { MAX_DATOS_DINAMICOS, CLAVES_OBLIGATORIAS } from '@features/medical-history/models/medical-record.model';
