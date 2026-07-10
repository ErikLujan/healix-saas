import { inject, Injectable } from '@angular/core';
import { Observable, from, throwError } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { SupabaseService } from '@core/services/supabase.service';
import { toast } from 'ngx-sonner';
import {
  MedicalRecord,
  MedicalRecordInsert,
  MedicalRecordConRelaciones,
  MAX_DATOS_DINAMICOS,
} from '../models/medical-record.model';

type MedicalRecordRow = MedicalRecord & Record<string, unknown>;

/**
 * Servicio centralizado para la gestión de historias clínicas.
 *
 * Responsable de la comunicación con la tabla `public.historias_clinicas`
 * en Supabase. Expone operaciones de consulta y creación mediante
 * Observables de RxJS, permitiendo que los componentes consuman
 * el estado de forma reactiva.
 *
 * Validaciones de negocio implementadas:
 * - Máximo 3 datos dinámicos por historia clínica.
 * - Unicidad estricta de turno_id (1 turno = 1 historia clínica).
 *
 * Nota sobre persistencia transaccional:
 * El backend ejecuta el trigger `trigger_sync_medical_history` que
 * actualiza automáticamente el estado del turno a 'finalizado' al
 * insertar una historia clínica. Este servicio NO realiza una segunda
 * actualización del turno; la inserción exitosa consolida el alta
 * médica en una sola operación.
 */
@Injectable({
  providedIn: 'root',
})
export class MedicalRecordsService {
  private readonly supabase = inject(SupabaseService);

  /**
   * Persiste una nueva historia clínica en la base de datos.
   *
   * Realiza una validación previa del array de datos dinámicos
   * para asegurar que no exceda el límite operativo de 3 elementos.
   * Si la validación falla, retorna un error controlado sin
   * realizar la consulta a Supabase.
   *
   * La inserción exitosa en la tabla `historias_clinicas` dispara
   * automáticamente el trigger del backend que finaliza el turno
   * asociado, consolidando el alta médica en una única operación.
   *
   * @param record Payload de la historia clínica sin id ni created_at.
   * @returns Observable que emite la historia clínica persistida.
   * @throws Error si los datos dinámicos superan el límite o Supabase falla.
   */
  createMedicalRecord(record: MedicalRecordInsert): Observable<MedicalRecord> {
    if (record.datos_dinamicos.length > MAX_DATOS_DINAMICOS) {
      const error = new Error(
        `No se pueden registrar más de ${MAX_DATOS_DINAMICOS} datos dinámicos. `
        + `Se intentaron enviar ${record.datos_dinamicos.length}.`,
      );
      toast.error(error.message);
      return throwError(() => error);
    }

    const payload = {
      turno_id: record.turno_id,
      paciente_id: record.paciente_id,
      especialista_id: record.especialista_id,
      altura: record.altura,
      peso: record.peso,
      temperatura: record.temperatura,
      presion_arterial: record.presion_arterial,
      datos_dinamicos: [...record.datos_dinamicos],
    };

    const operation$ = from(
      this.supabase.supabase
        .from('historias_clinicas')
        .insert(payload)
        .select()
        .single(),
    );

    return operation$.pipe(
      map(({ data, error }) => {
        if (error) {
          console.error('[MedicalRecordsService] Supabase insert error:', error.message, error.details, error.hint);
          throw new Error('No se pudo registrar la historia clínica.');
        }
        return data as MedicalRecord;
      }),
      catchError((err) => {
        console.error('[MedicalRecordsService] createMedicalRecord exception:', err);
        const mensaje = err instanceof Error
          ? err.message
          : 'Error inesperado al crear la historia clínica.';
        toast.error(mensaje);
        return throwError(() => new Error(mensaje));
      }),
    );
  }

  /**
   * Recupera la historia clínica asociada a un turno específico.
   *
   * Aprovecha la restricción de unicidad del campo `turno_id` para
   * garantizar que retorno como máximo un registro. Si no existe
   * historia clínica para el turno dado, retorna null.
   *
   * @param turnoId UUID del turno a consultar.
   * @returns Observable que emite la historia clínica o null.
   */
  getRecordByAppointmentId(turnoId: string): Observable<MedicalRecord | null> {
    const operation$ = from(
      this.supabase.supabase
        .from('historias_clinicas')
        .select('*')
        .eq('turno_id', turnoId)
        .maybeSingle(),
    );

    return operation$.pipe(
      map(({ data, error }) => {
        if (error) {
          throw new Error('No se pudo recuperar la historia clínica del turno.');
        }
        return data as MedicalRecord | null;
      }),
      catchError((err) => {
        const mensaje = err instanceof Error
          ? err.message
          : 'Error inesperado al consultar la historia clínica.';
        toast.error(mensaje);
        return throwError(() => new Error(mensaje));
      }),
    );
  }

  /**
   * Recupera el historial clínico completo de un paciente.
   *
   * Consulta todas las historias clínicas asociadas al paciente
   * específico, enriquecidas con información del especialista,
   * especialidad y turno. Los resultados se ordenan cronológicamente
   * desde el registro más reciente hacia el más antiguo.
   *
   * @param pacienteId UUID del paciente cuyo historial se desea consultar.
   * @returns Observable que emite la lista cronológica de historias clínicas.
   */
  getHistoryByPatientId(pacienteId: string): Observable<MedicalRecordConRelaciones[]> {
    const operation$ = from(
      this.supabase.supabase
        .from('historias_clinicas')
        .select(`
          *,
          paciente:paciente_id(id, full_name, email),
          especialista:especialista_id(id, full_name, avatar_url),
          turno:turno_id(id, fecha_hora, estado, resena_diagnostico)
        `)
        .eq('paciente_id', pacienteId)
        .order('created_at', { ascending: false }),
    );

    return operation$.pipe(
      map(({ data, error }) => {
        if (error) {
          throw new Error('No se pudo cargar el historial clínico del paciente.');
        }
        return this.mapearRegistrosConRelaciones(data ?? []);
      }),
      catchError((err) => {
        const mensaje = err instanceof Error
          ? err.message
          : 'Error inesperado al cargar el historial clínico.';
        toast.error(mensaje);
        return throwError(() => new Error(mensaje));
      }),
    );
  }

  /**
   * Recupera las historias clínicas asociadas a pacientes atendidos
   * por un especialista específico.
   *
   * Filtra únicamente los registros donde el especialista coincide
   * con el parámetro proporcionado. Los resultados se ordenan
   * cronológicamente desde el más reciente.
   *
   * @param especialistaId UUID del especialista.
   * @returns Observable que emite la lista de historias clínicas del especialista.
   */
  getHistoryBySpecialistId(especialistaId: string): Observable<MedicalRecordConRelaciones[]> {
    const operation$ = from(
      this.supabase.supabase
        .from('historias_clinicas')
        .select(`
          *,
          paciente:paciente_id(id, full_name, email),
          especialista:especialista_id(id, full_name, avatar_url),
          turno:turno_id(id, fecha_hora, estado, resena_diagnostico)
        `)
        .eq('especialista_id', especialistaId)
        .order('created_at', { ascending: false }),
    );

    return operation$.pipe(
      map(({ data, error }) => {
        if (error) {
          throw new Error('No se pudo cargar las historias clínicas del especialista.');
        }
        return this.mapearRegistrosConRelaciones(data ?? []);
      }),
      catchError((err) => {
        const mensaje = err instanceof Error
          ? err.message
          : 'Error inesperado al cargar las historias clínicas.';
        toast.error(mensaje);
        return throwError(() => new Error(mensaje));
      }),
    );
  }

  /**
   * Recupera todas las historias clínicas del sistema.
   *
   * Utilizado exclusivamente por el panel de administración para
   * funciones de auditoría. Retorna registros enriquecidos con
   * información de todas las relaciones.
   *
   * @returns Observable que emite la lista completa de historias clínicas.
   */
  getAllRecords(): Observable<MedicalRecordConRelaciones[]> {
    const operation$ = from(
      this.supabase.supabase
        .from('historias_clinicas')
        .select(`
          *,
          paciente:paciente_id(id, full_name, email),
          especialista:especialista_id(id, full_name, avatar_url),
          turno:turno_id(id, fecha_hora, estado, resena_diagnostico)
        `)
        .order('created_at', { ascending: false }),
    );

    return operation$.pipe(
      map(({ data, error }) => {
        if (error) {
          throw new Error('No se pudieron cargar las historias clínicas.');
        }
        return this.mapearRegistrosConRelaciones(data ?? []);
      }),
      catchError((err) => {
        const mensaje = err instanceof Error
          ? err.message
          : 'Error inesperado al cargar las historias clínicas.';
        toast.error(mensaje);
        return throwError(() => new Error(mensaje));
      }),
    );
  }

  /**
   * Mapea los registros crudos de Supabase a objetos MedicalRecordConRelaciones.
   *
   * Extrae las relaciones anidadas (paciente, especialista, turno)
   * y las distribuye en el objeto de dominio tipado.
   *
   * @param registros Datos crudos del resultado de Supabase con joins.
   * @returns Array tipado de historias clínicas con relaciones.
   */
  private mapearRegistrosConRelaciones(
    registros: Array<Record<string, unknown>>,
  ): MedicalRecordConRelaciones[] {
    return registros.map((row) => {
      const paciente = row['paciente'] as Record<string, unknown> | null;
      const especialista = row['especialista'] as Record<string, unknown> | null;
      const turno = row['turno'] as Record<string, unknown> | null;

      const registroBase: MedicalRecord = {
        id: row['id'] as string,
        turno_id: row['turno_id'] as string,
        paciente_id: row['paciente_id'] as string,
        especialista_id: row['especialista_id'] as string,
        altura: row['altura'] as number,
        peso: row['peso'] as number,
        temperatura: row['temperatura'] as number,
        presion_arterial: row['presion_arterial'] as string,
        datos_dinamicos: (row['datos_dinamicos'] as readonly { clave: string; valor: string }[]) ?? [],
        created_at: row['created_at'] as string,
      };

      const pacienteData = (paciente && typeof paciente === 'object')
        ? {
            id: paciente['id'] as string,
            full_name: paciente['full_name'] as string,
            email: paciente['email'] as string,
          }
        : undefined;

      const especialistaData = (especialista && typeof especialista === 'object')
        ? {
            id: especialista['id'] as string,
            full_name: especialista['full_name'] as string,
            avatar_url: (especialista['avatar_url'] as string) ?? null,
          }
        : undefined;

      const turnoData = (turno && typeof turno === 'object')
        ? {
            id: turno['id'] as string,
            fecha_hora: turno['fecha_hora'] as string,
            estado: turno['estado'] as string,
            resena_diagnostico: (turno['resena_diagnostico'] as string) ?? null,
          }
        : undefined;

      const resultado: MedicalRecordConRelaciones = {
        ...registroBase,
        ...(pacienteData ? { paciente: pacienteData } : {}),
        ...(especialistaData ? { especialista: especialistaData } : {}),
        ...(turnoData ? { turno: turnoData } : {}),
      };

      return resultado;
    });
  }
}
