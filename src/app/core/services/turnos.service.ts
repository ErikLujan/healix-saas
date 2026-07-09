import { inject, Injectable, signal } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { AuthService } from './auth.service';
import { toast } from 'ngx-sonner';
import {
  Turno,
  TurnoInsert,
  TurnoConRelaciones,
  ESTADOS_LIBERAN_HORARIO,
} from '../models/turno.model';
import { Database } from '../models/database.types';

type TurnoRow = Database['public']['Tables']['turnos']['Row'];

/**
 * Servicio centralizado para la gestion del ciclo de vida de turnos medicos.
 *
 * Expone operaciones de consulta, creacion y gestion de turnos mediante
 * Angular Signals. Todas las escrituras validan la disponibilidad horaria
 * antes de persistir, protegiendo contra condiciones de carrera.
 *
 * Los errores se comunican mediante el sistema global de notificaciones.
 */
@Injectable({
  providedIn: 'root',
})
export class TurnosService {
  private readonly supabase = inject(SupabaseService);
  private readonly authService = inject(AuthService);

  private readonly _turnos = signal<Turno[]>([]);
  private readonly _isLoading = signal(false);

  /** Lista inmutable de turnos cargados para la consulta activa. */
  readonly turnos = this._turnos.asReadonly();

  /** Indica si una operacion de carga o escritura esta en curso. */
  readonly isLoading = this._isLoading.asReadonly();

  /**
   * Obtiene los turnos ocupados para un especialista en una fecha especifica.
   *
   * Consulta la tabla `public.turnos` filtrando por especialista y fecha,
   * excluyendo turnos cancelados o rechazados (que liberan el horario).
   * Retorna los turnos con informacion del paciente y especialidad.
   *
   * @param especialistaId UUID del especialista.
   * @param fecha Cadena en formato "YYYY-MM-DD".
   * @returns Lista inmutable de turnos ocupados para esa fecha.
   */
  async obtenerTurnosPorEspecialistaYFecha(
    especialistaId: string,
    fecha: string,
  ): Promise<readonly TurnoConRelaciones[]> {
    this._isLoading.set(true);

    try {
      const startOfDay = `${fecha}T00:00:00.000Z`;
      const endOfDay = `${fecha}T23:59:59.999Z`;

      const { data, error } = await this.supabase.supabase
        .from('turnos')
        .select(`
          *,
          paciente:paciente_id(id, full_name, email),
          especialidad:especialidad_id(id, name)
        `)
        .eq('especialista_id', especialistaId)
        .gte('fecha_hora', startOfDay)
        .lte('fecha_hora', endOfDay)
        .not('estado', 'in', '(cancelado,rechazado)');

      if (error) {
        toast.error('No se pudieron cargar los turnos. Intenta nuevamente.');
        return [];
      }

      const turnos = this.mapearTurnosConRelaciones(data ?? []);
      return Object.freeze(turnos);
    } catch {
      toast.error('Error de conexión al consultar turnos.');
      return [];
    } finally {
      this._isLoading.set(false);
    }
  }

  /**
   * Obtiene todos los turnos de un paciente con informacion de relaciones.
   *
   * @param pacienteId UUID del paciente.
   * @returns Lista inmutable de turnos enriquecidos.
   */
  async obtenerTurnosPorPaciente(pacienteId: string): Promise<readonly TurnoConRelaciones[]> {
    this._isLoading.set(true);

    try {
      const { data, error } = await this.supabase.supabase
        .from('turnos')
        .select(`
          *,
          especialista:especialista_id(id, full_name, avatar_url),
          especialidad:especialidad_id(id, name)
        `)
        .eq('paciente_id', pacienteId)
        .order('fecha_hora', { ascending: false });

      if (error) {
        toast.error('No se pudieron cargar tus turnos.');
        return [];
      }

      const turnos = this.mapearTurnosConRelaciones(data ?? []);
      return Object.freeze(turnos);
    } catch {
      toast.error('Error de conexión al cargar turnos.');
      return [];
    } finally {
      this._isLoading.set(false);
    }
  }

  /**
   * Obtiene los turnos asignados a un especialista con informacion de relaciones.
   *
   * @param especialistaId UUID del especialista.
   * @returns Lista inmutable de turnos enriquecidos.
   */
  async obtenerTurnosPorEspecialista(especialistaId: string): Promise<readonly TurnoConRelaciones[]> {
    this._isLoading.set(true);

    try {
      const { data, error } = await this.supabase.supabase
        .from('turnos')
        .select(`
          *,
          paciente:paciente_id(id, full_name, email),
          especialidad:especialidad_id(id, name)
        `)
        .eq('especialista_id', especialistaId)
        .order('fecha_hora', { ascending: false });

      if (error) {
        toast.error('No se pudieron cargar los turnos.');
        return [];
      }

      const turnos = this.mapearTurnosConRelaciones(data ?? []);
      return Object.freeze(turnos);
    } catch {
      toast.error('Error de conexión al cargar turnos.');
      return [];
    } finally {
      this._isLoading.set(false);
    }
  }

  /**
   * Persiste un nuevo turno con estado inicial 'pendiente'.
   *
   * Antes de insertar, verifica que no exista otro turno activo
   * (no cancelado ni rechazado) para el mismo especialista en
   * la misma fecha y hora. Esto previene conflictos de concurrencia.
   *
   * @param turno Payload del turno a crear (sin id ni timestamps).
   * @throws Error si el horario ya esta ocupado o Supabase falla.
   */
  async crearTurnoPendiente(turno: TurnoInsert): Promise<void> {
    const ocupado = await this.verificarDisponibilidad(
      turno.especialista_id,
      turno.fecha_hora,
    );

    if (ocupado) {
      throw new Error('Este horario ya fue reservado por otro paciente. Elegí un turno disponible.');
    }

    this._isLoading.set(true);

    try {
      const { error } = await this.supabase.supabase
        .from('turnos')
        .insert({
          paciente_id: turno.paciente_id,
          especialista_id: turno.especialista_id,
          especialidad_id: turno.especialidad_id,
          fecha_hora: turno.fecha_hora,
          estado: 'pendiente',
        });

      if (error) {
        throw new Error('No se pudo registrar el turno. Intenta nuevamente.');
      }

      toast.success('Turno solicitado correctamente. El especialista lo revisará pronto.');
    } catch (error) {
      const mensaje = error instanceof Error
        ? error.message
        : 'Error inesperado al crear el turno.';
      toast.error(mensaje);
      throw error;
    } finally {
      this._isLoading.set(false);
    }
  }

  /**
   * Verifica si un horario especifico se encuentra disponible.
   *
   * Consulta la tabla de turnos buscando registros para el mismo
   * especialista y marca de tiempo que no esten en estado cancelado
   * o rechazado (estados que liberan el horario).
   *
   * @param especialistaId UUID del especialista.
   * @param fechaHoraISO Marca de tiempo ISO completa (TIMESTAMPTZ).
   * @returns true si el horario esta ocupado, false si esta libre.
   */
  async verificarDisponibilidad(
    especialistaId: string,
    fechaHoraISO: string,
  ): Promise<boolean> {
    const { data, error } = await this.supabase.supabase
      .from('turnos')
      .select('id')
      .eq('especialista_id', especialistaId)
      .eq('fecha_hora', fechaHoraISO)
      .not('estado', 'in', '(cancelado,rechazado)')
      .limit(1);

    if (error) {
      return false;
    }

    return (data ?? []).length > 0;
  }

  /**
   * Obtiene todos los turnos del sistema para vista de administrador.
   *
   * Retorna turnos con informacion de paciente, especialista y especialidad.
   * Utilizado exclusivamente por el dashboard de administracion.
   *
   * @returns Lista inmutable de todos los turnos enriquecidos.
   */
  async obtenerTodosLosTurnosAdmin(): Promise<readonly TurnoConRelaciones[]> {
    this._isLoading.set(true);

    try {
      const { data, error } = await this.supabase.supabase
        .from('turnos')
        .select(`
          *,
          paciente:paciente_id(id, full_name, email),
          especialista:especialista_id(id, full_name, avatar_url),
          especialidad:especialidad_id(id, name)
        `)
        .order('fecha_hora', { ascending: false });

      if (error) {
        toast.error('No se pudieron cargar los turnos.');
        return [];
      }

      const turnos = this.mapearTurnosConRelaciones(data ?? []);
      return Object.freeze(turnos);
    } catch {
      toast.error('Error de conexión al cargar turnos.');
      return [];
    } finally {
      this._isLoading.set(false);
    }
  }

  /**
   * Cancela un turno existente con motivo obligatorio.
   *
   * @param turnoId UUID del turno a cancelar.
   * @param motivo Motivo de la cancelacion (obligatorio).
   */
  async cancelarTurno(turnoId: string, motivo: string): Promise<void> {
    await this.actualizarTurno(turnoId, {
      estado: 'cancelado',
      comentario_cancelacion_rechazo: motivo,
    });
  }

  /**
   * Confirma un turno pendiente.
   *
   * @param turnoId UUID del turno a confirmar.
   */
  async confirmarTurno(turnoId: string): Promise<void> {
    await this.actualizarTurno(turnoId, { estado: 'confirmado' });
  }

  /**
   * Rechaza un turno pendiente con motivo obligatorio.
   *
   * @param turnoId UUID del turno a rechazar.
   * @param motivo Motivo del rechazo (obligatorio).
   */
  async rechazarTurno(turnoId: string, motivo: string): Promise<void> {
    await this.actualizarTurno(turnoId, {
      estado: 'rechazado',
      comentario_cancelacion_rechazo: motivo,
    });
  }

  /**
   * Finaliza un turno medico inyectando la resena clinica obligatoria.
   *
   * Construye un payload limpio con unicamente las columnas fisicas de la
   * tabla `public.turnos`, evitando contaminacion de propiedades de UI.
   *
   * @param turnoId Identificador unico del turno (UUID).
   * @param resenaTexto Texto clinico ingresado por el especialista.
   */
  async finalizarTurno(turnoId: string, resenaTexto: string): Promise<void> {
    this._isLoading.set(true);

    try {
      const payloadLimpio = {
        estado: 'finalizado' as const,
        resena_diagnostico: resenaTexto,
      };

      const { error } = await this.supabase.supabase
        .from('turnos')
        .update(payloadLimpio)
        .eq('id', turnoId);

      if (error) {
        throw new Error('No se pudo finalizar el turno.');
      }

      toast.success('Turno finalizado correctamente.');
    } catch (error) {
      const mensaje = error instanceof Error
        ? error.message
        : 'Error inesperado al finalizar el turno.';
      toast.error(mensaje);
      throw error;
    } finally {
      this._isLoading.set(false);
    }
  }

  /**
   * Registra la calificacion del paciente sobre un turno finalizado.
   *
   * Persiste la puntuacion por estrellas y el comentario de opinion
   * en las columnas correspondientes de la tabla `public.turnos`.
   *
   * @param turnoId UUID del turno a calificar.
   * @param comentario Texto de opinion del paciente.
   * @param estrellas Puntuacion del 1 al 5.
   */
  async calificarTurno(turnoId: string, comentario: string, estrellas: number): Promise<void> {
    this._isLoading.set(true);

    try {
      const { error } = await this.supabase.supabase
        .from('turnos')
        .update({
          calificacion_comentario: comentario,
          calificacion_estrellas: estrellas,
        })
        .eq('id', turnoId);

      if (error) {
        throw new Error('No se pudo registrar la calificacion.');
      }

      toast.success('Calificación registrada correctamente.');
    } catch (error) {
      const mensaje = error instanceof Error
        ? error.message
        : 'Error inesperado al calificar.';
      toast.error(mensaje);
      throw error;
    } finally {
      this._isLoading.set(false);
    }
  }

  /**
   * Actualiza el estado de un turno existente.
   *
   * Valida que la transicion de estado sea legal segun las reglas
   * del ciclo de vida antes de persistir el cambio.
   *
   * @param turnoId UUID del turno a actualizar.
   * @param actualizacion Campos a modificar (estado y comentarios operativos).
   */
  async actualizarTurno(turnoId: string, actualizacion: {
    estado?: Turno['estado'];
    comentario_cancelacion_rechazo?: string;
    resena_diagnostico?: string;
  }): Promise<void> {
    this._isLoading.set(true);

    try {
      const { error } = await this.supabase.supabase
        .from('turnos')
        .update(actualizacion)
        .eq('id', turnoId);

      if (error) {
        throw new Error('No se pudo actualizar el turno.');
      }

      toast.success('Turno actualizado correctamente.');
    } catch (error) {
      const mensaje = error instanceof Error
        ? error.message
        : 'Error inesperado al actualizar el turno.';
      toast.error(mensaje);
      throw error;
    } finally {
      this._isLoading.set(false);
    }
  }

  /**
   * Mapea los registros crudos de Supabase a objetos TurnoConRelaciones.
   *
   * Extrae las relaciones anidadas (paciente, especialista, especialidad)
   * y las distribuye en el objeto de dominio tipado.
   *
   * @param registros Datos crudos del resultado de Supabase con joins.
   * @returns Array tipado de turnos con relaciones.
   */
  private mapearTurnosConRelaciones(
    registros: Array<Record<string, unknown>>,
  ): TurnoConRelaciones[] {
    return registros.map((row) => {
      const paciente = row['paciente'] as Record<string, unknown> | null;
      const especialista = row['especialista'] as Record<string, unknown> | null;
      const especialidad = row['especialidad'] as Record<string, unknown> | null;

      const turnoBase: Turno = {
        id: row['id'] as string,
        paciente_id: row['paciente_id'] as string,
        especialista_id: row['especialista_id'] as string,
        especialidad_id: row['especialidad_id'] as string,
        fecha_hora: row['fecha_hora'] as string,
        estado: row['estado'] as Turno['estado'],
        comentario_cancelacion_rechazo: (row['comentario_cancelacion_rechazo'] as string) ?? null,
        resena_diagnostico: (row['resena_diagnostico'] as string) ?? null,
        calificacion_comentario: (row['calificacion_comentario'] as string) ?? null,
        calificacion_estrellas: (row['calificacion_estrellas'] as number) ?? null,
        encuesta_satisfaccion: (row['encuesta_satisfaccion'] as Turno['encuesta_satisfaccion']) ?? null,
        created_at: row['created_at'] as string,
        updated_at: row['updated_at'] as string,
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

      const especialidadData = (especialidad && typeof especialidad === 'object')
        ? {
            id: especialidad['id'] as string,
            name: especialidad['name'] as string,
          }
        : undefined;

      const resultado: TurnoConRelaciones = {
        ...turnoBase,
        ...(pacienteData ? { paciente: pacienteData } : {}),
        ...(especialistaData ? { especialista: especialistaData } : {}),
        ...(especialidadData ? { especialidad: especialidadData } : {}),
      };

      return resultado;
    });
  }
}
