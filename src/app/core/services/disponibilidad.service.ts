import { inject, Injectable, signal } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { toast } from 'ngx-sonner';
import {
  DisponibilidadEspecialista,
  DisponibilidadEspecialistaInsert,
  DiaSemana,
  RESTRICCIONES_HORARIAS,
  DURACION_SLOT_MINUTOS,
} from '../models/disponibilidad.model';

/**
 * Servicio centralizado para la gestion de disponibilidad medica.
 *
 * Administra el ciclo de vida completo de la disponibilidad de los
 * especialistas: carga, validacion, persistencia y generacion de
 * bloques horarios reactivos mediante Angular Signals.
 *
 * Todas las operaciones de escritura validan las restricciones
 * horarias de la clinica antes de interactuar con Supabase.
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

  /** Indica si una operacion de carga o persistencia esta en curso. */
  readonly isLoading = this._isLoading.asReadonly();

  /**
   * Consulta todas las disponibilidades registradas para un especialista
   * especifico y actualiza reactivamente la signal interna.
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
   * Valida y persiste la configuracion semanal completa de un especialista.
   *
   * Ejecuta todas las reglas de negocio antes de tocar la base de datos:
   *
   * 1. No se permiten registros con dia_semana igual a 0 (domingo).
   * 2. Lunes a Viernes: hora_inicio >= 08:00 y hora_fin <= 19:00.
   * 3. Sabados: hora_inicio >= 08:00 y hora_fin <= 14:00.
   * 4. hora_fin debe ser estrictamente mayor que hora_inicio.
   * 5. Cada registro debe poseer una especialidad asociada.
   *
   * La persistencia se realiza como operacion atomica: primero se
   * eliminan los registros existentes del especialista y luego se
   * insertan los nuevos. Si cualquiera falla, la operacion se aborta.
   *
   * @param especialistaId UUID del especialista propietario de la agenda.
   * @param disponibilidades Lista completa de registros a persistir.
   * @throws Error si alguna validacion falla o Supabase devuelve error.
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
   * Funcion algoritmica pura que fragmenta un rango horario en bloques
   * fijos de 30 minutos.
   *
   * Ejemplo:
   * - entrada: ("08:00", "10:00")
   * - salida:  ["08:00", "08:30", "09:00", "09:30"]
   *
   * La funcion no incluye la hora de fin como slot porque representa
   * el cierre del ultimo bloque, no un inicio de atencion.
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
   * Ejecuta el conjunto completo de validaciones de negocio sobre
   * un array de disponibilidades antes de permitir su persistencia.
   *
   * Lanza una excepcion con un mensaje descriptivo si cualquiera
   * de las reglas es violada.
   *
   * @param disponibilidades Registros a validar.
   */
  private validarDisponibilidades(disponibilidades: DisponibilidadEspecialistaInsert[]): void {
    for (const registro of disponibilidades) {
      if (registro.dia_semana === 0) {
        throw new Error('Los domingos no pueden configurarse como dia de atencion.');
      }

      if (!registro.especialidad_id) {
        throw new Error('Cada bloque horario debe estar asociado a una especialidad.');
      }

      const restriccion = RESTRICCIONES_HORARIAS[registro.dia_semana];
      if (!restriccion) {
        throw new Error(`Dia de la semana no valido: ${registro.dia_semana}.`);
      }

      if (registro.hora_inicio < restriccion.inicio || registro.hora_inicio >= restriccion.fin) {
        throw new Error(
          `La hora de inicio ${registro.hora_inicio} esta fuera del rango permitido `
          + `(${restriccion.inicio} - ${restriccion.fin}) para el dia ${registro.dia_semana}.`,
        );
      }

      if (registro.hora_fin > restriccion.fin || registro.hora_fin <= restriccion.inicio) {
        throw new Error(
          `La hora de fin ${registro.hora_fin} esta fuera del rango permitido `
          + `(${restriccion.inicio} - ${restriccion.fin}) para el dia ${registro.dia_semana}.`,
        );
      }

      if (registro.hora_fin <= registro.hora_inicio) {
        throw new Error(
          `La hora de fin (${registro.hora_fin}) debe ser posterior a la hora de inicio (${registro.hora_inicio}).`,
        );
      }
    }
  }
}
