import { inject, Injectable, signal, Signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { Observable, from, throwError } from 'rxjs';
import { map, catchError, switchMap } from 'rxjs/operators';
import { SupabaseService } from '@core/services/supabase.service';
import { toast } from 'ngx-sonner';
import {
  MedicalRecord,
  MedicalRecordInsert,
  MedicalRecordConRelaciones,
  MAX_DATOS_DINAMICOS,
} from '../models/medical-record.model';

type MedicalRecordRow = MedicalRecord & Record<string, unknown>;

/** Fila mínima del perfil público para enriquecer historias clínicas. */
interface PerfilRelacion {
  readonly id: string;
  readonly full_name: string;
  readonly email?: string;
  readonly avatar_url: string | null;
}

/**
 * Origen de lectura de perfiles para el enriquecimiento.
 * `vista`: vista publica sin correo (flujos paciente y especialista).
 * `base`: tabla `profiles` con correo (reservado al administrador via RLS).
 */
type FuentePerfiles = 'vista' | 'base';

/** Fila mínima de paciente para resolver el DNI. */
interface PacienteDni {
  readonly id: string;
  readonly dni: string;
}

/** Fila mínima del turno asociado a una historia clínica. */
interface TurnoRelacion {
  readonly id: string;
  readonly fecha_hora: string;
  readonly estado: string;
  readonly especialidad_id: string;
  readonly resena_diagnostico: string | null;
}

/** Fila mínima del catálogo de especialidades para enriquecer historias clínicas. */
interface EspecialidadRelacion {
  readonly id: string;
  readonly name: string;
}

/**
 * Columnas base de `historias_clinicas` sin joins embebidos.
 * Se evitan los embeds `paciente:paciente_id(...)` porque dependen
 * de metadatos FK que devuelven 400 cuando no existen o difieren.
 */
const SELECT_BASE = 'id, turno_id, paciente_id, especialista_id, altura, peso, temperatura, presion_arterial, datos_dinamicos, created_at';

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
        .select('id, turno_id, paciente_id, especialista_id, altura, peso, temperatura, presion_arterial, datos_dinamicos, created_at')
        .single(),
    );

    return operation$.pipe(
      map(({ data, error }) => {
        if (error) {
          throw new Error('No se pudo registrar la historia clinica.');
        }
        return data as MedicalRecord;
      }),
      catchError((err) => {
        const mensaje = err instanceof Error
          ? err.message
          : 'Error inesperado al crear la historia clinica.';
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
        .select('id, turno_id, paciente_id, especialista_id, altura, peso, temperatura, presion_arterial, datos_dinamicos, created_at')
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
   * Consulta primero las filas base de `historias_clinicas` y luego
   * enriquece con perfiles, DNI y turnos mediante consultas separadas.
   * Los perfiles se resuelven desde la vista publica (sin correo ajeno)
   * para respetar el RLS endurecido.
   *
   * @param pacienteId UUID del paciente cuyo historial se desea consultar.
   * @returns Observable que emite la lista cronológica de historias clínicas.
   */
  getHistoryByPatientId(pacienteId: string): Observable<MedicalRecordConRelaciones[]> {
    const operation$ = from(
      this.supabase.supabase
        .from('historias_clinicas')
        .select(SELECT_BASE)
        .eq('paciente_id', pacienteId)
        .order('created_at', { ascending: false }),
    );

    return operation$.pipe(
      map(({ data, error }) => {
        if (error) {
          throw new Error('No se pudo cargar el historial clínico del paciente.');
        }
        return (data as unknown as MedicalRecord[]) ?? [];
      }),
      switchMap((base) => from(this.enriquecerRegistros(base, 'vista'))),
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
   * Los perfiles se resuelven desde la vista publica (sin correo ajeno)
   * para respetar el RLS endurecido.
   *
   * @param especialistaId UUID del especialista.
   * @returns Observable que emite la lista de historias clínicas del especialista.
   */
  getHistoryBySpecialistId(especialistaId: string): Observable<MedicalRecordConRelaciones[]> {
    const operation$ = from(
      this.supabase.supabase
        .from('historias_clinicas')
        .select(SELECT_BASE)
        .eq('especialista_id', especialistaId)
        .order('created_at', { ascending: false }),
    );

    return operation$.pipe(
      map(({ data, error }) => {
        if (error) {
          throw new Error('No se pudo cargar las historias clínicas del especialista.');
        }
        return (data as unknown as MedicalRecord[]) ?? [];
      }),
      switchMap((base) => from(this.enriquecerRegistros(base, 'vista'))),
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
   * Reservado al rol administrador: enriquece desde la tabla base
   * `profiles` (con correo), amparado por el acceso total de admin via RLS.
   * Los demas roles deben usar las consultas por paciente o especialista.
   *
   * @returns Observable que emite la lista completa de historias clínicas.
   */
  getAllRecords(): Observable<MedicalRecordConRelaciones[]> {
    const operation$ = from(
      this.supabase.supabase
        .from('historias_clinicas')
        .select(SELECT_BASE)
        .order('created_at', { ascending: false }),
    );

    return operation$.pipe(
      map(({ data, error }) => {
        if (error) {
          throw new Error('No se pudieron cargar las historias clínicas.');
        }
        return (data as unknown as MedicalRecord[]) ?? [];
      }),
      switchMap((base) => from(this.enriquecerRegistros(base, 'base'))),
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
   * Enriquece registros base con perfiles, DNI de pacientes, turnos y especialidades.
   *
   * Ejecuta cuatro consultas por lotes con `in()` en lugar de un único
   * `select` con relaciones embebidas, por lo que no depende de que
   * existan claves foráneas registradas en PostgREST. Los perfiles se
   * leen desde la vista publica (sin correo ajeno) salvo en el flujo
   * de administracion, que usa la tabla base amparado por RLS de admin.
   * La especialidad se resuelve desde el catálogo público `specialties`
   * a partir del `especialidad_id` de cada turno, evitando el texto
   * de respaldo "Especialidad no indicada" cuando el dato existe.
   *
   * @param base Filas base de `historias_clinicas` sin relaciones.
   * @param fuente Origen de lectura de perfiles (`vista` o `base`).
   * @returns Registros tipados con relaciones resueltas.
   */
  private async enriquecerRegistros(base: readonly MedicalRecord[], fuente: FuentePerfiles): Promise<MedicalRecordConRelaciones[]> {
    if (base.length === 0) {
      return [];
    }

    const pacienteIds: readonly string[] = [...new Set(base.map((r) => r.paciente_id))];
    const especialistaIds: readonly string[] = [...new Set(base.map((r) => r.especialista_id))];
    const turnoIds: readonly string[] = [...new Set(base.map((r) => r.turno_id))];
    const perfilIds: readonly string[] = [...new Set([...pacienteIds, ...especialistaIds])];

    const columnasPerfil = fuente === 'base'
      ? 'id, full_name, email, avatar_url'
      : 'id, full_name, avatar_url';

    const [perfilesRes, dniRes, turnosRes] = await Promise.all([
      fuente === 'base'
        ? this.supabase.supabase
          .from('profiles')
          .select(columnasPerfil)
          .in('id', [...perfilIds])
        : this.supabase.supabase
          .from('vista_perfiles_publicos')
          .select(columnasPerfil)
          .in('id', [...perfilIds]),
      this.supabase.supabase
        .from('pacientes')
        .select('id, dni')
        .in('id', [...pacienteIds]),
      this.supabase.supabase
        .from('turnos')
        .select('id, fecha_hora, estado, especialidad_id, resena_diagnostico')
        .in('id', [...turnoIds]),
    ]);

    if (perfilesRes.error || dniRes.error || turnosRes.error) {
      throw new Error('No se pudieron cargar las historias clínicas.');
    }

    const turnosLista: readonly TurnoRelacion[] = (turnosRes.data as unknown as TurnoRelacion[]) ?? [];
    const especialidadIds: readonly string[] = [
      ...new Set(turnosLista.map((t) => t.especialidad_id).filter((id): id is string => typeof id === 'string' && id.length > 0)),
    ];

    const especialidadesRes = especialidadIds.length > 0
      ? await this.supabase.supabase
        .from('specialties')
        .select('id, name')
        .in('id', [...especialidadIds])
      : { data: [] as EspecialidadRelacion[], error: null };

    if (especialidadesRes.error) {
      throw new Error('No se pudieron cargar las historias clínicas.');
    }

    const perfiles = new Map<string, PerfilRelacion>(
      ((perfilesRes.data as unknown as PerfilRelacion[]) ?? []).map((p) => [p.id, p]),
    );
    const dnis = new Map<string, string>(
      ((dniRes.data as unknown as PacienteDni[]) ?? []).map((p) => [p.id, p.dni]),
    );
    const turnos = new Map<string, TurnoRelacion>(
      turnosLista.map((t) => [t.id, t]),
    );
    const especialidades = new Map<string, EspecialidadRelacion>(
      ((especialidadesRes.data as unknown as EspecialidadRelacion[]) ?? []).map((e) => [e.id, e]),
    );

    return base.map((row) => {
      const perfilPaciente: PerfilRelacion | undefined = perfiles.get(row.paciente_id);
      const perfilEspecialista: PerfilRelacion | undefined = perfiles.get(row.especialista_id);
      const turno: TurnoRelacion | undefined = turnos.get(row.turno_id);
      const dni: string | undefined = dnis.get(row.paciente_id);
      const especialidad: EspecialidadRelacion | undefined = turno ? especialidades.get(turno.especialidad_id) : undefined;

      const resultado: MedicalRecordConRelaciones = {
        ...row,
        paciente: {
          id: row.paciente_id,
          full_name: perfilPaciente?.full_name ?? 'Paciente',
          ...(perfilPaciente?.email ? { email: perfilPaciente.email } : {}),
          avatar_url: perfilPaciente?.avatar_url ?? null,
          ...(dni ? { dni } : {}),
        },
        ...(perfilEspecialista
          ? {
              especialista: {
                id: perfilEspecialista.id,
                full_name: perfilEspecialista.full_name,
                avatar_url: perfilEspecialista.avatar_url,
              },
            }
          : {}),
        ...(especialidad
          ? {
              especialidad: {
                id: especialidad.id,
                name: especialidad.name,
              },
            }
          : {}),
        ...(turno
          ? {
              turno: {
                id: turno.id,
                fecha_hora: turno.fecha_hora,
                estado: turno.estado,
                resena_diagnostico: turno.resena_diagnostico,
              },
            }
          : {}),
      };

      return resultado;
    });
  }

  /**
   * Expone un signal con la historia clínica del paciente indicado.
   * Debe llamarse dentro de un contexto de inyección válido.
   *
   * @param pacienteId Identificador del paciente.
   */
  getHistoryByPatientIdSignal(pacienteId: string): Signal<readonly MedicalRecordConRelaciones[]> {
    return toSignal(this.getHistoryByPatientId(pacienteId), { initialValue: [] });
  }

  /**
   * Expone un signal con la historia clínica del especialista indicado.
   * Debe llamarse dentro de un contexto de inyección válido.
   *
   * @param especialistaId Identificador del especialista.
   */
  getHistoryBySpecialistIdSignal(especialistaId: string): Signal<readonly MedicalRecordConRelaciones[]> {
    return toSignal(this.getHistoryBySpecialistId(especialistaId), { initialValue: [] });
  }

  /**
   * Expone un signal con todas las historias clínicas disponibles.
   * Debe llamarse dentro de un contexto de inyección válido.
   */
  getAllRecordsSignal(): Signal<readonly MedicalRecordConRelaciones[]> {
    return toSignal(this.getAllRecords(), { initialValue: [] });
  }
}
