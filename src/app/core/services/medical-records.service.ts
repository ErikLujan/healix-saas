/**
 * Re-export del servicio de Historias Clinicas.
 *
 * MedicalRecordsService es consumido por multiples features
 * (appointments, dashboard, patients, profile, administration).
 * Se re-exporta desde core/services para centralizar la ruta
 * de acceso y respetar la direccion de dependencias.
 *
 * La fuente canonical permanece en @features/medical-history/services/.
 * Este archivo existe unicamente como punto de re-exportacion.
 */
export { MedicalRecordsService } from '@features/medical-history/services/medical-records.service';
