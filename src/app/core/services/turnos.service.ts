import { inject, Injectable, signal } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { AuthService, UserRole } from './auth.service';
import { toast } from 'ngx-sonner';
import {
  Turno,
  TurnoInsert,
  TurnoConRelaciones,
  EncuestaSatisfaccion,
} from '../models/turno.model';
import { TurnoEstado } from '../models/database.types';

/**
 * Mapa exhaustivo de transiciones de estado permitidas por el ciclo de vida
 * de un turno medico, definido en business-rules.md.
 *
 * Cada clave representa el estado actual y contiene el conjunto de estados
 * destino validos. Los estados terminales (rechazado, cancelado, finalizado)
 * no poseen transiciones salientes.
 */
const TRANSICIONES_ESTADO_PERMITIDAS: ReadonlyMap<TurnoEstado, ReadonlySet<TurnoEstado>> =
  new Map<TurnoEstado, ReadonlySet<TurnoEstado>>([
    ['pendiente', new Set<TurnoEstado>(['confirmado', 'rechazado', 'cancelado'])],
    ['confirmado', new Set<TurnoEstado>(['cancelado', 'finalizado'])],
  ]);

/**
 * Columnas escalares de `public.turnos` sin relaciones embebidas.
 * Las relaciones se resuelven por lotes contra vistas publicas
 * (ver `enriquecerTurnosConVistas`) para respetar el RLS endurecido.
 */
const SELECT_TURNO_BASE = 'id, paciente_id, especialista_id, especialidad_id, fecha_hora, estado, comentario_cancelacion_rechazo, resena_diagnostico, calificacion_comentario, calificacion_estrellas, encuesta_satisfaccion, created_at, updated_at';

/**
 * Fila minima de la vista `vista_perfiles_publicos` para enriquecer turnos.
 * No incluye correo: reservado al propietario y al administrador.
 */
interface VistaPerfilPublico {
  readonly id: string;
  readonly full_name: string;
  readonly avatar_url: string | null;
}

/**
 * Fila minima del catalogo `specialties` para enriquecer turnos.
 */
interface EspecialidadBase {
  readonly id: string;
  readonly name: string;
}

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
   * Las relaciones se enriquecen por lotes desde vistas publicas para
   * respetar el RLS endurecido (sin correo de terceros).
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
        .select(SELECT_TURNO_BASE)
        .eq('especialista_id', especialistaId)
        .gte('fecha_hora', startOfDay)
        .lte('fecha_hora', endOfDay)
        .not('estado', 'in', '(cancelado,rechazado)');

      if (error) {
        toast.error('No se pudieron cargar los turnos. Intenta nuevamente.');
        return [];
      }

      const turnos = await this.enriquecerTurnosConVistas((data ?? []) as Turno[]);
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
   * Las relaciones se enriquecen por lotes desde vistas publicas para
   * respetar el RLS endurecido (sin correo de terceros).
   *
   * @param pacienteId UUID del paciente.
   * @returns Lista inmutable de turnos enriquecidos.
   */
  async obtenerTurnosPorPaciente(pacienteId: string): Promise<readonly TurnoConRelaciones[]> {
    this._isLoading.set(true);

    try {
      const { data, error } = await this.supabase.supabase
        .from('turnos')
        .select(SELECT_TURNO_BASE)
        .eq('paciente_id', pacienteId)
        .order('fecha_hora', { ascending: false });

      if (error) {
        toast.error('No se pudieron cargar tus turnos.');
        return [];
      }

      const turnos = await this.enriquecerTurnosConVistas((data ?? []) as Turno[]);
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
   * Las relaciones se enriquecen por lotes desde vistas publicas para
   * respetar el RLS endurecido (sin correo de terceros).
   *
   * @param especialistaId UUID del especialista.
   * @returns Lista inmutable de turnos enriquecidos.
   */
  async obtenerTurnosPorEspecialista(especialistaId: string): Promise<readonly TurnoConRelaciones[]> {
    this._isLoading.set(true);

    try {
      const { data, error } = await this.supabase.supabase
        .from('turnos')
        .select(SELECT_TURNO_BASE)
        .eq('especialista_id', especialistaId)
        .order('fecha_hora', { ascending: false });

      if (error) {
        toast.error('No se pudieron cargar los turnos.');
        return [];
      }

      const turnos = await this.enriquecerTurnosConVistas((data ?? []) as Turno[]);
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
    const perfil = this.authService.currentUser();
    const rol = this.authService.userRole();

    if (!perfil || (rol !== 'administrador' && turno.paciente_id !== perfil.id)) {
      toast.error('No tienes permiso para crear este turno.');
      throw new Error('No tienes permiso para crear este turno.');
    }

    const ocupado = await this.verificarDisponibilidad(
      turno.especialista_id,
      turno.fecha_hora,
    );

    if (ocupado) {
      throw new Error('Este horario ya fue reservado por otro paciente. Elegí un turno disponible.');
    }

    this._isLoading.set(true);

    try {
      const ocupadoAhora = await this.verificarDisponibilidad(
        turno.especialista_id,
        turno.fecha_hora,
      );

      if (ocupadoAhora) {
        throw new Error('El horario seleccionado ya no se encuentra disponible. Por favor, elige otro turno.');
      }

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
   * Retorna turnos con informacion de paciente, especialista y especialidad
   * mediante relaciones embebidas. Reservado al rol administrador, unico
   * con lectura total sobre `profiles` via RLS (incluye correo).
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
          id,
          paciente_id,
          especialista_id,
          especialidad_id,
          fecha_hora,
          estado,
          comentario_cancelacion_rechazo,
          resena_diagnostico,
          calificacion_comentario,
          calificacion_estrellas,
          encuesta_satisfaccion,
          created_at,
          updated_at,
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
   * Valida que el turno se encuentre en un estado que permita
   * cancelacion antes de aplicar el cambio optimista en la UI.
   * Si la API falla, revierte el estado local al valor anterior.
   *
   * @param turnoId UUID del turno a cancelar.
   * @param motivo Motivo de la cancelacion (obligatorio).
   */
  async cancelarTurno(turnoId: string, motivo: string): Promise<void> {
    await this.exigirAccesoTurno(turnoId, ['paciente', 'especialista', 'administrador']);

    const estadoActual = await this.obtenerEstadoTurno(turnoId);

    if (estadoActual && !this.validarTransicionEstado(estadoActual, 'cancelado')) {
      const mensaje = `No se puede cancelar un turno en estado "${estadoActual}".`;
      toast.error(mensaje);
      throw new Error(mensaje);
    }

    const snapshot = this.aplicarCambioOptimista(turnoId, {
      estado: 'cancelado',
      comentario_cancelacion_rechazo: motivo,
    });

    try {
      await this.actualizarTurno(turnoId, {
        estado: 'cancelado',
        comentario_cancelacion_rechazo: motivo,
      });
    } catch {
      this.revertirCambioOptimista(snapshot);
    }
  }

  /**
   * Confirma un turno pendiente.
   *
   * Valida que el turno se encuentre en estado 'pendiente' antes
   * de aplicar el cambio optimista. Si la API falla, revierte
   * el estado local al valor anterior.
   *
   * @param turnoId UUID del turno a confirmar.
   */
  async confirmarTurno(turnoId: string): Promise<void> {
    await this.exigirAccesoTurno(turnoId, ['especialista', 'administrador']);

    const estadoActual = await this.obtenerEstadoTurno(turnoId);

    if (estadoActual && !this.validarTransicionEstado(estadoActual, 'confirmado')) {
      const mensaje = `No se puede confirmar un turno en estado "${estadoActual}".`;
      toast.error(mensaje);
      throw new Error(mensaje);
    }

    const snapshot = this.aplicarCambioOptimista(turnoId, { estado: 'confirmado' });

    try {
      await this.actualizarTurno(turnoId, { estado: 'confirmado' });
    } catch {
      this.revertirCambioOptimista(snapshot);
    }
  }

  /**
   * Rechaza un turno pendiente con motivo obligatorio.
   *
   * Valida que el turno se encuentre en un estado que permita
   * rechazo antes de aplicar el cambio optimista. Si la API falla,
   * revierte el estado local al valor anterior.
   *
   * @param turnoId UUID del turno a rechazar.
   * @param motivo Motivo del rechazo (obligatorio).
   */
  async rechazarTurno(turnoId: string, motivo: string): Promise<void> {
    await this.exigirAccesoTurno(turnoId, ['especialista', 'administrador']);

    const estadoActual = await this.obtenerEstadoTurno(turnoId);

    if (estadoActual && !this.validarTransicionEstado(estadoActual, 'rechazado')) {
      const mensaje = `No se puede rechazar un turno en estado "${estadoActual}".`;
      toast.error(mensaje);
      throw new Error(mensaje);
    }

    const snapshot = this.aplicarCambioOptimista(turnoId, {
      estado: 'rechazado',
      comentario_cancelacion_rechazo: motivo,
    });

    try {
      await this.actualizarTurno(turnoId, {
        estado: 'rechazado',
        comentario_cancelacion_rechazo: motivo,
      });
    } catch {
      this.revertirCambioOptimista(snapshot);
    }
  }

  /**
   * Finaliza un turno medico inyectando la resena clinica obligatoria.
   *
   * Valida que el turno se encuentre en estado 'confirmado' antes de
   * proceder con la finalizacion. Aplica un cambio optimista en la UI
   * antes de persistir. Si la API falla, revierte el estado local.
   *
   * @param turnoId Identificador unico del turno (UUID).
   * @param resenaTexto Texto clinico ingresado por el especialista.
   */
  async finalizarTurno(turnoId: string, resenaTexto: string): Promise<void> {
    await this.exigirAccesoTurno(turnoId, ['especialista', 'administrador']);

    const estadoActual = await this.obtenerEstadoTurno(turnoId);

    if (estadoActual && !this.validarTransicionEstado(estadoActual, 'finalizado')) {
      const mensaje = `No se puede finalizar un turno en estado "${estadoActual}". Solo los turnos confirmados pueden finalizarse.`;
      toast.error(mensaje);
      throw new Error(mensaje);
    }

    const snapshot = this.aplicarCambioOptimista(turnoId, {
      estado: 'finalizado',
      resena_diagnostico: resenaTexto,
    });

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
      this.revertirCambioOptimista(snapshot);
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
   * Aplica un cambio optimista en la UI antes de persistir.
   *
   * @param turnoId UUID del turno a calificar.
   * @param comentario Texto de opinion del paciente.
   * @param estrellas Puntuacion del 1 al 5.
   */
  async calificarTurno(turnoId: string, comentario: string, estrellas: number): Promise<void> {
    await this.exigirAccesoTurno(turnoId, ['paciente', 'administrador']);

    const snapshot = this.aplicarCambioOptimista(turnoId, {
      calificacion_comentario: comentario,
      calificacion_estrellas: estrellas,
    });

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
      this.revertirCambioOptimista(snapshot);
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
   * Guarda la encuesta de satisfaccion del paciente para un turno finalizado.
   *
   * Persiste el objeto JSONB de la encuesta en la columna
   * `encuesta_satisfaccion` de la tabla `public.turnos`.
   *
   * @param turnoId UUID del turno a encuestar.
   * @param encuesta Datos de la encuesta de satisfaccion.
   */
  async guardarEncuesta(turnoId: string, encuesta: EncuestaSatisfaccion): Promise<void> {
    await this.exigirAccesoTurno(turnoId, ['paciente', 'administrador']);

    const snapshot = this.aplicarCambioOptimista(turnoId, {
      encuesta_satisfaccion: encuesta,
    });

    this._isLoading.set(true);

    try {
      const { error } = await this.supabase.supabase
        .from('turnos')
        .update({ encuesta_satisfaccion: encuesta as unknown as Record<string, unknown> })
        .eq('id', turnoId);

      if (error) {
        throw new Error('No se pudo guardar la encuesta.');
      }

      toast.success('Encuesta enviada correctamente. ¡Gracias por tu opinión!');
    } catch (error) {
      this.revertirCambioOptimista(snapshot);
      const mensaje = error instanceof Error
        ? error.message
        : 'Error inesperado al guardar la encuesta.';
      toast.error(mensaje);
      throw error;
    } finally {
      this._isLoading.set(false);
    }
  }

  /**
   * Valida si una transicion de estado es permitida segun el ciclo de vida
   * definido en business-rules.md.
   *
   * @param estadoActual Estado actual del turno.
   * @param nuevoEstado Estado destino deseado.
   * @returns true si la transicion es valida, false en caso contrario.
   */
  validarTransicionEstado(estadoActual: TurnoEstado, nuevoEstado: TurnoEstado): boolean {
    if (estadoActual === nuevoEstado) return true;

    const transicionesPermitidas = TRANSICIONES_ESTADO_PERMITIDAS.get(estadoActual);
    if (!transicionesPermitidas) return false;

    return transicionesPermitidas.has(nuevoEstado);
  }

  /**
   * Aplica un cambio optimista al signal de turnos.
   *
   * Busca el turno por ID, crea una copia con los campos actualizados
   * y retorna el array anterior para poder revertirlo si la API falla.
   *
   * @param turnoId UUID del turno a modificar.
   * @param cambios Campos a actualizar en el turno.
   * @returns Snapshot del array anterior para rollback.
   */
  private aplicarCambioOptimista(
    turnoId: string,
    cambios: Partial<Pick<Turno, 'estado' | 'comentario_cancelacion_rechazo' | 'resena_diagnostico' | 'calificacion_comentario' | 'calificacion_estrellas' | 'encuesta_satisfaccion'>>,
  ): Turno[] {
    const snapshot = [...this._turnos()];
    const turnosActualizados = snapshot.map((t) =>
      t.id === turnoId ? { ...t, ...cambios } : t,
    );
    this._turnos.set(turnosActualizados as Turno[]);
    return snapshot;
  }

  /**
   * Revierte un cambio optimista restaurando el snapshot anterior.
   *
   * @param snapshot Array de turnos previo al cambio optimista.
   */
  private revertirCambioOptimista(snapshot: Turno[]): void {
    this._turnos.set(snapshot);
  }

  /**
   * Exige que el usuario autenticado tenga rol permitido y pertenencia
   * sobre el turno antes de ejecutar una acción sensible.
   *
   * Barrera de defensa en profundidad del lado cliente: oculta errores
   * de uso y evita llamadas indebidas, pero la autorización autoritativa
   * reside en las políticas RLS de la tabla `public.turnos`.
   *
   * @param turnoId UUID del turno objetivo.
   * @param rolesPermitidos Roles habilitados para la acción solicitada.
   * @throws Error genérico si el usuario no está autorizado.
   */
  private async exigirAccesoTurno(turnoId: string, rolesPermitidos: readonly UserRole[]): Promise<void> {
    const usuario = this.authService.currentUser();
    const rol = this.authService.userRole();

    if (!usuario || !rol || !rolesPermitidos.includes(rol)) {
      toast.error('No tienes permiso para realizar esta acción.');
      throw new Error('No tienes permiso para realizar esta acción.');
    }

    if (rol === 'administrador') {
      return;
    }

    const { data, error } = await this.supabase.supabase
      .from('turnos')
      .select('paciente_id, especialista_id')
      .eq('id', turnoId)
      .maybeSingle();

    const fila = data as { paciente_id: string; especialista_id: string } | null;

    if (error || !fila) {
      toast.error('No se pudo verificar el turno. Intenta nuevamente.');
      throw new Error('No se pudo verificar el turno.');
    }

    const esPropietario = rol === 'paciente'
      ? fila.paciente_id === usuario.id
      : fila.especialista_id === usuario.id;

    if (!esPropietario) {
      toast.error('No tienes permiso para realizar esta acción.');
      throw new Error('No tienes permiso para realizar esta acción.');
    }
  }

  /**
   * Obtiene el turno actual desde la base de datos para validar transiciones.
   *
   * @param turnoId UUID del turno a consultar.
   * @returns El estado actual del turno o null si no se encontro.
   */
  private async obtenerEstadoTurno(turnoId: string): Promise<TurnoEstado | null> {
    const { data, error } = await this.supabase.supabase
      .from('turnos')
      .select('estado')
      .eq('id', turnoId)
      .maybeSingle();

    if (error || !data) return null;
    return data.estado as TurnoEstado;
  }

  /**
   * Actualiza el estado de un turno existente.
   *
   * Valida que la transicion de estado sea legal segun las reglas
   * del ciclo de vida antes de persistir el cambio. Si se proporciona
   * un estado destino, verifica la transicion contra el estado actual
   * consultado desde la base de datos.
   *
   * @param turnoId UUID del turno a actualizar.
   * @param actualizacion Campos a modificar (estado y comentarios operativos).
   */
  async actualizarTurno(turnoId: string, actualizacion: {
    estado?: Turno['estado'];
    comentario_cancelacion_rechazo?: string;
    resena_diagnostico?: string;
  }): Promise<void> {
    await this.exigirAccesoTurno(turnoId, ['paciente', 'especialista', 'administrador']);

    if (actualizacion.estado) {
      const estadoActual = await this.obtenerEstadoTurno(turnoId);

      if (estadoActual && !this.validarTransicionEstado(estadoActual, actualizacion.estado)) {
        const mensaje = `No se puede cambiar el turno de "${estadoActual}" a "${actualizacion.estado}". Transición no permitida.`;
        toast.error(mensaje);
        throw new Error(mensaje);
      }
    }

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
   * Enriquece turnos base con perfiles y especialidades desde vistas publicas.
   *
   * Resuelve pacientes y especialistas mediante `vista_perfiles_publicos`
   * (sin correo de terceros) y especialidades desde el catalogo publico,
   * con consultas por lotes `in()` en lugar de relaciones embebidas sobre
   * `profiles`, bloqueadas por el RLS endurecido para no propietarios.
   *
   * @param base Filas base de `turnos` sin relaciones.
   * @returns Turnos tipados con relaciones resueltas.
   */
  private async enriquecerTurnosConVistas(base: readonly Turno[]): Promise<TurnoConRelaciones[]> {
    if (base.length === 0) {
      return [];
    }

    const pacienteIds = [...new Set(base.map((t) => t.paciente_id))];
    const especialistaIds = [...new Set(base.map((t) => t.especialista_id))];
    const especialidadIds = [...new Set(base.map((t) => t.especialidad_id))];
    const perfilIds = [...new Set([...pacienteIds, ...especialistaIds])];

    const [perfilesRes, especialidadesRes] = await Promise.all([
      this.supabase.supabase
        .from('vista_perfiles_publicos')
        .select('id, full_name, avatar_url')
        .in('id', perfilIds),
      this.supabase.supabase
        .from('specialties')
        .select('id, name')
        .in('id', especialidadIds),
    ]);

    if (perfilesRes.error || especialidadesRes.error) {
      throw new Error('No se pudieron cargar los turnos.');
    }

    const perfiles = new Map<string, VistaPerfilPublico>(
      ((perfilesRes.data as unknown as VistaPerfilPublico[]) ?? []).map((p) => [p.id, p]),
    );
    const especialidades = new Map<string, EspecialidadBase>(
      ((especialidadesRes.data as unknown as EspecialidadBase[]) ?? []).map((e) => [e.id, e]),
    );

    return base.map((turno) => {
      const paciente = perfiles.get(turno.paciente_id);
      const especialista = perfiles.get(turno.especialista_id);
      const especialidad = especialidades.get(turno.especialidad_id);

      const resultado: TurnoConRelaciones = {
        ...turno,
        ...(paciente
          ? { paciente: { id: paciente.id, full_name: paciente.full_name, avatar_url: paciente.avatar_url } }
          : {}),
        ...(especialista
          ? { especialista: { id: especialista.id, full_name: especialista.full_name, avatar_url: especialista.avatar_url } }
          : {}),
        ...(especialidad
          ? { especialidad: { id: especialidad.id, name: especialidad.name } }
          : {}),
      };

      return resultado;
    });
  }

  /**
   * Mapea los registros crudos de Supabase a objetos TurnoConRelaciones.
   *
   * Extrae las relaciones anidadas (paciente, especialista, especialidad)
   * y las distribuye en el objeto de dominio tipado. Reservado al flujo
   * de administracion, unico con embeds sobre `profiles` via RLS.
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
            avatar_url: (paciente['avatar_url'] as string) ?? null,
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
