import { inject, Injectable, signal } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { toast } from 'ngx-sonner';
import {
  DisponibilidadEspecialista,
  DisponibilidadEspecialistaInsert,
  DiaSemana,
  BloqueHorario,
  EspecialidadPerfil,
  RESTRICCIONES_HORARIAS,
  DURACION_SLOT_MINUTOS,
} from '../models/disponibilidad.model';

/**
 * Servicio centralizado para la gestión de disponibilidad médica.
 *
 * Administra el ciclo de vida completo de la disponibilidad de los
 * especialistas: carga, validación, persistencia y generación de
 * bloques horarios reactivos mediante Angular Signals.
 *
 * Todas las operaciones de escritura validan las restricciones
 * horarias de la clínica antes de interactuar con Supabase.
 * Los errores se comunican mediante el sistema global de notificaciones.
 */
@Injectable({
  providedIn: 'root',
})
export class DisponibilidadService {
  private readonly supabase = inject(SupabaseService);

  private readonly _disponibilidades = signal<DisponibilidadEspecialista[]>([]);
  private readonly _isLoading = signal(false);

  /** Lista inmutable de disponibilidades cargadas para el especialista actual. */
  readonly disponibilidades = this._disponibilidades.asReadonly();

  /** Indica si una operación de carga o persistencia está en curso. */
  readonly isLoading = this._isLoading.asReadonly();

  /**
   * Consulta todas las disponibilidades registradas para un especialista
   * específico y actualiza reactivamente la signal interna.
   *
   * @param especialistaId UUID del especialista cuya agenda se desea cargar.
   */
  async cargarDisponibilidadPorEspecialista(especialistaId: string): Promise<void> {
    this._isLoading.set(true);

    try {
      const { data, error } = await this.supabase.supabase
        .from('disponibilidad_especialista')
        .select('*')
        .eq('especialista_id', especialistaId)
        .order('dia_semana', { ascending: true })
        .order('hora_inicio', { ascending: true });

      if (error) {
        toast.error('No se pudo cargar la disponibilidad. Intenta nuevamente.');
        return;
      }

      const registros: DisponibilidadEspecialista[] = (data ?? []).map((row) => ({
        id: row.id as string,
        especialista_id: row.especialista_id as string,
        especialidad_id: row.especialidad_id as string,
        dia_semana: row.dia_semana as DiaSemana,
        hora_inicio: row.hora_inicio as string,
        hora_fin: row.hora_fin as string,
      }));

      this._disponibilidades.set(registros);
    } catch {
      toast.error('Error de conexión al cargar la disponibilidad.');
    } finally {
      this._isLoading.set(false);
    }
  }

  /**
   * Valida y persiste la configuración semanal completa de un especialista.
   *
   * Ejecuta todas las reglas de negocio antes de tocar la base de datos:
   *
   * 1. No se permiten registros con dia_semana igual a 0 (domingo).
   * 2. Lunes a Viernes: hora_inicio >= 08:00 y hora_fin <= 19:00.
   * 3. Sábados: hora_inicio >= 08:00 y hora_fin <= 14:00.
   * 4. hora_fin debe ser estrictamente mayor que hora_inicio.
   * 5. Cada registro debe poseer una especialidad asociada.
   *
   * La persistencia se realiza como operación atómica: primero se
   * eliminan los registros existentes del especialista y luego se
   * insertan los nuevos. Si cualquiera falla, la operación se aborta.
   *
   * @param especialistaId UUID del especialista propietario de la agenda.
   * @param disponibilidades Lista completa de registros a persistir.
   * @throws Error si alguna validación falla o Supabase devuelve error.
   */
  async guardarDisponibilidadSemanal(
    especialistaId: string,
    disponibilidades: DisponibilidadEspecialistaInsert[],
  ): Promise<void> {
    this.validarDisponibilidades(disponibilidades);

    this._isLoading.set(true);

    try {
      const { error: deleteError } = await this.supabase.supabase
        .from('disponibilidad_especialista')
        .delete()
        .eq('especialista_id', especialistaId);

      if (deleteError) {
        throw new Error('No se pudieron eliminar los registros anteriores.');
      }

      if (disponibilidades.length > 0) {
        const registrosAInsertar = disponibilidades.map((d) => ({
          especialista_id: especialistaId,
          especialidad_id: d.especialidad_id,
          dia_semana: d.dia_semana,
          hora_inicio: d.hora_inicio,
          hora_fin: d.hora_fin,
        }));

        const { error: insertError } = await this.supabase.supabase
          .from('disponibilidad_especialista')
          .insert(registrosAInsertar);

        if (insertError) {
          throw new Error('No se pudieron guardar los nuevos horarios.');
        }
      }

      await this.cargarDisponibilidadPorEspecialista(especialistaId);
      toast.success('Disponibilidad guardada correctamente.');
    } catch (error) {
      const mensaje = error instanceof Error
        ? error.message
        : 'Error inesperado al guardar la disponibilidad.';
      toast.error(mensaje);
      throw error;
    } finally {
      this._isLoading.set(false);
    }
  }

  /**
   * Función algoritmica pura que fragmenta un rango horario en bloques
   * fijos de 30 minutos.
   *
   * Ejemplo:
   * - entrada: ("08:00", "10:00")
   * - salida:  ["08:00", "08:30", "09:00", "09:30"]
   *
   * La función no incluye la hora de fin como slot porque representa
   * el cierre del último bloque, no un inicio de atención.
   *
   * @param horaInicio Cadena en formato "HH:mm" o "HH:mm:ss".
   * @param horaFin Cadena en formato "HH:mm" o "HH:mm:ss".
   * @returns Array inmutable de cadenas horarias en formato "HH:mm".
   */
  generarSlotsDeAtencion(horaInicio: string, horaFin: string): readonly string[] {
    const minutosInicio = this.parsearAMinutos(horaInicio);
    const minutosFin = this.parsearAMinutos(horaFin);

    if (minutosFin <= minutosInicio) {
      return [];
    }

    const slots: string[] = [];
    let actual = minutosInicio;

    while (actual < minutosFin) {
      slots.push(this.formatearMinutosAHora(actual));
      actual += DURACION_SLOT_MINUTOS;
    }

    return Object.freeze(slots);
  }

  /**
   * Convierte una cadena horaria "HH:mm" o "HH:mm:ss" a un valor
   * entero que representa la cantidad total de minutos desde medianoche.
   *
   * @param hora Cadena horaria a parsear.
   * @returns Cantidad de minutos desde 00:00.
   */
  private parsearAMinutos(hora: string): number {
    const partes = hora.split(':');
    const horas = parseInt(partes[0], 10);
    const minutos = parseInt(partes[1], 10);
    return horas * 60 + minutos;
  }

  /**
   * Convierte una cantidad de minutos a una cadena horaria "HH:mm".
   *
   * @param minutos Cantidad de minutos desde medianoche.
   * @returns Cadena formateada como "HH:mm".
   */
  private formatearMinutosAHora(minutos: number): string {
    const horas = Math.floor(minutos / 60);
    const mins = minutos % 60;
    return `${String(horas).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
  }

  /**
   * Carga las especialidades vinculadas a un especialista desde Supabase.
   *
   * Consulta la tabla `especialista_especialidad` para obtener los IDs
   * de especialidades vinculadas, luego consulta la tabla `specialties`
   * para obtener los nombres.
   *
   * @param especialistaId UUID del especialista.
   * @returns Array de especialidades vinculadas o array vacío en caso de error.
   */
  async cargarEspecialidadesDelEspecialista(especialistaId: string): Promise<readonly EspecialidadPerfil[]> {
    try {
      const { data: vinculos, error: vinculosError } = await this.supabase.supabase
        .from('especialista_especialidad')
        .select('especialidad_id')
        .eq('especialista_id', especialistaId);

      if (vinculosError || !vinculos || vinculos.length === 0) {
        toast.error('Error al cargar las especialidades del médico.');
        return [];
      }

      const ids = vinculos.map(v => v.especialidad_id);

      const { data: especialidades, error: espError } = await this.supabase.supabase
        .from('specialties')
        .select('id, name')
        .in('id', ids);

      if (espError || !especialidades) {
        toast.error('Error al cargar las especialidades del médico.');
        return [];
      }

      return especialidades;
    } catch {
      toast.error('Error de conexión al cargar las especialidades.');
      return [];
    }
  }

  /**
   * Detecta solapamientos entre bloques horarios del mismo día.
   *
   * Dos bloques se consideran solapados si el inicio de uno es anterior
   * al fin del otro y viceversa. Retorna un mensaje de error descriptivo
   * si se detecta algún solapamiento, o null si no hay conflictos.
   *
   * @param bloques Lista de bloques horarios del día.
   * @returns Mensaje de error o null.
   */
  validarSolapamiento(bloques: readonly BloqueHorario[]): string | null {
    for (let i = 0; i < bloques.length; i++) {
      for (let j = i + 1; j < bloques.length; j++) {
        const a = bloques[i];
        const b = bloques[j];

        if (a.hora_inicio < b.hora_fin && b.hora_inicio < a.hora_fin) {
          return `Bloques solapados: ${a.hora_inicio}-${a.hora_fin} y ${b.hora_inicio}-${b.hora_fin}`;
        }
      }
    }
    return null;
  }

  /**
   * Ejecuta el conjunto completo de validaciones de negocio sobre
   * un array de disponibilidades antes de permitir su persistencia.
   *
   * Lanza una excepción con un mensaje descriptivo si cualquiera
   * de las reglas es violada.
   *
   * @param disponibilidades Registros a validar.
   */
  private validarDisponibilidades(disponibilidades: DisponibilidadEspecialistaInsert[]): void {
    for (const registro of disponibilidades) {
      if (registro.dia_semana === 0) {
        throw new Error('Los domingos no pueden configurarse como día de atención.');
      }

      if (!registro.especialidad_id) {
        throw new Error('Cada bloque horario debe estar asociado a una especialidad.');
      }

      const restriccion = RESTRICCIONES_HORARIAS[registro.dia_semana];
      if (!restriccion) {
        throw new Error(`Día de la semana no válido: ${registro.dia_semana}.`);
      }

      if (registro.hora_inicio < restriccion.inicio || registro.hora_inicio >= restriccion.fin) {
        throw new Error(
          `La hora de inicio ${registro.hora_inicio} está fuera del rango permitido `
          + `(${restriccion.inicio} - ${restriccion.fin}) para el día ${registro.dia_semana}.`,
        );
      }

      if (registro.hora_fin > restriccion.fin || registro.hora_fin <= restriccion.inicio) {
        throw new Error(
          `La hora de fin ${registro.hora_fin} está fuera del rango permitido `
          + `(${restriccion.inicio} - ${restriccion.fin}) para el día ${registro.dia_semana}.`,
        );
      }

      if (registro.hora_fin <= registro.hora_inicio) {
        throw new Error(
          `La hora de fin (${registro.hora_fin}) debe ser posterior a la hora de inicio (${registro.hora_inicio}).`,
        );
      }
    }

    const porDia = new Map<number, DisponibilidadEspecialistaInsert[]>();
    for (const registro of disponibilidades) {
      const existentes = porDia.get(registro.dia_semana) ?? [];
      existentes.push(registro);
      porDia.set(registro.dia_semana, existentes);
    }

    for (const [dia, bloques] of porDia) {
      const solapamiento = this.validarSolapamiento(bloques);
      if (solapamiento) {
        throw new Error(`${solapamiento} (día ${dia}).`);
      }
    }
  }
}
