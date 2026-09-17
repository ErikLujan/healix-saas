import { inject, Injectable } from '@angular/core';
import { SupabaseService } from '@core/services/supabase.service';
import { EspecialidadInfo } from '@core/models/turno.model';
import { DiaSemana } from '@core/models/disponibilidad.model';
import { EspecialistaWizard } from './wizard-turno.service';
import { toast } from 'ngx-sonner';

/**
 * Interfaz para los registros crudos de la tabla turnos
 * utilizados en la verificación de disponibilidad.
 */
interface TurnoOcupado {
  readonly fecha_hora: string;
}

/**
 * Servicio de datos para el asistente de solicitud de turnos.
 *
 * Centraliza todas las consultas a Supabase relacionadas con
 * la carga de especialidades, especialistas aprobados, fechas
 * disponibles y bloques horarios. Los componentes de paso
 * inyectan este servicio en lugar de SupabaseService directamente.
 *
 * Todas las lecturas están optimizadas para minimizar la cantidad
 * de consultas y incluyen manejo de errores centralizado.
 */
@Injectable({
  providedIn: 'root',
})
export class AppointmentRequestService {
  private readonly supabase = inject(SupabaseService);

  /**
   * Carga todas las especialidades activas del catálogo.
   *
   * Consulta la tabla `specialties` filtrando únicamente las
   * especialidades con `is_active = true`, ordenadas alfabéticamente.
   *
   * @returns Lista congelada de especialidades activas.
   */
  async cargarEspecialidades(): Promise<ReadonlyArray<EspecialidadInfo>> {
    const { data, error } = await this.supabase.supabase
      .from('specialties')
      .select('id, name')
      .eq('is_active', true)
      .order('name');

    if (error || !data) {
      return Object.freeze([]);
    }

    const especialidades: EspecialidadInfo[] = data.map((row) => ({
      id: row['id'] as string,
      name: row['name'] as string,
    }));

    return Object.freeze(especialidades);
  }

  /**
   * Carga los especialistas aprobados que practican una especialidad específica.
   *
   * Executa tres consultas secuenciales:
   * 1. Obtiene los IDs de especialistas vinculados a la especialidad.
   * 2. Filtra únicamente los perfiles con `is_approved = true` en la tabla `especialistas`.
   * 3. Resuelve todas las especialidades de cada especialista aprobado.
   *
   * @param especialidadId UUID de la especialidad seleccionada.
   * @returns Lista congelada de especialistas aprobados con sus especialidades.
   */
  async cargarEspecialistasAprobados(especialidadId: string): Promise<ReadonlyArray<EspecialistaWizard>> {
    const { data: relaciones, error: relError } = await this.supabase.supabase
      .from('especialista_especialidad')
      .select('especialista_id')
      .eq('especialidad_id', especialidadId);

    if (relError || !relaciones || relaciones.length === 0) {
      return Object.freeze([]);
    }

    const idsMedicos = [...new Set(relaciones.map(r => r.especialista_id))];

    /**
     * Lee identidad basica desde la vista publica (sin correo ni
     * documentos) para respetar el RLS endurecido de `profiles`.
     */
    const { data: perfiles, error: profilesError } = await this.supabase.supabase
      .from('vista_perfiles_publicos')
      .select('id, full_name, avatar_url')
      .in('id', idsMedicos);

    if (profilesError || !perfiles) {
      toast.error('Error al cargar los especialistas. Intenta nuevamente.');
      return Object.freeze([]);
    }

    const idsAprobados = await this.filtrarEspecialistasAprobados(
      perfiles.map(p => p.id),
    );

    const mapaEspecialistas = new Map<string, EspecialistaWizard>();

    for (const perfil of perfiles) {
      if (!idsAprobados.has(perfil.id)) continue;

      mapaEspecialistas.set(perfil.id, {
        id: perfil.id,
        full_name: perfil.full_name,
        avatar_url: perfil.avatar_url ?? null,
        especialidades: [],
      });
    }

    if (mapaEspecialistas.size === 0) {
      return Object.freeze([]);
    }

    await this.enriquecerEspecialidades(mapaEspecialistas);

    return Object.freeze(Array.from(mapaEspecialistas.values()));
  }

  /**
   * Verifica qué días de los próximos 15 tienen al menos un slot disponible.
   *
   * Para cada día (excluyendo domingos), consulta la disponibilidad
   * del especialista y cruza con los turnos existentes para determinar
   * si queda al menos un bloque libre.
   *
   * @param especialistaId UUID del especialista.
   * @returns Lista congelada de objetos con fecha y día de la semana.
   */
   async cargarFechasDisponibles(
    especialistaId: string,
  ): Promise<ReadonlyArray<{
    fecha: string;
    diaSemana: DiaSemana;
  }>> {
    const hoy = new Date();
    const fechas: { fecha: string; diaSemana: DiaSemana }[] = [];

    const disponibilidades = await this.cargarBloquesDisponibilidad(especialistaId);

    const mapaDisponibilidad = new Map<DiaSemana, Array<{ hora_inicio: string; hora_fin: string }>>();
    for (const d of disponibilidades) {
      const existentes = mapaDisponibilidad.get(d.dia_semana) ?? [];
      mapaDisponibilidad.set(d.dia_semana, [...existentes, d]);
    }

    const fechasStr: string[] = [];
    for (let i = 0; i < 15; i++) {
      const fecha = new Date(hoy);
      fecha.setDate(hoy.getDate() + i);
      const diaSemana = fecha.getDay() as DiaSemana;

      if (diaSemana === 0) continue;

      const fechaStr = this.formatearFecha(fecha);
      fechasStr.push(fechaStr);
    }

    const turnosPorFecha = await this.cargarTurnosRango(
      especialistaId,
      fechasStr,
    );

    for (let i = 0; i < 15; i++) {
      const fecha = new Date(hoy);
      fecha.setDate(hoy.getDate() + i);
      const diaSemana = fecha.getDay() as DiaSemana;

      if (diaSemana === 0) continue;

      const fechaStr = this.formatearFecha(fecha);
      const bloques = mapaDisponibilidad.get(diaSemana);

      if (!bloques || bloques.length === 0) continue;

      const totalSlots = this.calcularTotalSlots(bloques);
      const turnosOcupados = turnosPorFecha.get(fechaStr)?.length ?? 0;

      if (turnosOcupados < totalSlots) {
        fechas.push({ fecha: fechaStr, diaSemana });
      }
    }

    return Object.freeze(fechas);
  }

  /**
   * Genera los bloques horarios disponibles para una fecha específica.
   *
   * Obtiene la disponibilidad del especialista para el día de la semana
   * correspondiente, genera slots de 30 minutos y los marca como
   * libres u ocupados según los turnos existentes.
   *
   * @param especialistaId UUID del especialista.
   * @param fechaStr Fecha en formato "YYYY-MM-DD".
   * @returns Lista congelada de bloques con hora y estado de disponibilidad.
   */
  async cargarBloquesHorarios(
    especialistaId: string,
    fechaStr: string,
  ): Promise<ReadonlyArray<{ hora: string; disponible: boolean }>> {
    const diaSemana = this.obtenerDiaSemana(fechaStr);

    const { data: disponibilidad } = await this.supabase.supabase
      .from('disponibilidad_especialista')
      .select('hora_inicio, hora_fin')
      .eq('especialista_id', especialistaId)
      .eq('dia_semana', diaSemana);

    if (!disponibilidad || disponibilidad.length === 0) {
      return Object.freeze([]);
    }

    const slotsBase = this.generarSlots(disponibilidad);

    const startOfDay = `${fechaStr}T00:00:00.000Z`;
    const endOfDay = `${fechaStr}T23:59:59.999Z`;

    const { data: turnosOcupados } = await this.supabase.supabase
      .from('turnos')
      .select('fecha_hora')
      .eq('especialista_id', especialistaId)
      .gte('fecha_hora', startOfDay)
      .lte('fecha_hora', endOfDay)
      .not('estado', 'in', '(cancelado,rechazado)');

    const horasOcupadas = new Set(
      (turnosOcupados ?? []).map((t: TurnoOcupado) => {
        const iso = t.fecha_hora;
        return iso.substring(11, 16);
      }),
    );

    const bloques = slotsBase.map(slot => ({
      hora: slot,
      disponible: !horasOcupadas.has(slot),
    }));

    return Object.freeze(bloques);
  }

  /**
   * Carga todos los bloques de disponibilidad de un especialista.
   *
   * @param especialistaId UUID del especialista.
   * @returns Lista de registros de disponibilidad.
   */
  private async cargarBloquesDisponibilidad(
    especialistaId: string,
  ): Promise<Array<{ dia_semana: DiaSemana; hora_inicio: string; hora_fin: string }>> {
    const { data } = await this.supabase.supabase
      .from('disponibilidad_especialista')
      .select('dia_semana, hora_inicio, hora_fin')
      .eq('especialista_id', especialistaId);

    return (data ?? []).map((row) => ({
      dia_semana: row['dia_semana'] as DiaSemana,
      hora_inicio: row['hora_inicio'] as string,
      hora_fin: row['hora_fin'] as string,
    }));
  }

  /**
   * Carga los turnos ocupados para un rango de fechas específico.
   *
   * @param especialistaId UUID del especialista.
   * @param fechasStr Array de fechas en formato "YYYY-MM-DD".
   * @returns Mapa de fecha → cantidad de turnos ocupados.
   */
  private async cargarTurnosRango(
    especialistaId: string,
    fechasStr: string[],
  ): Promise<Map<string, TurnoOcupado[]>> {
    if (fechasStr.length === 0) return new Map();

    const primeraFecha = fechasStr[0];
    const ultimaFecha = fechasStr[fechasStr.length - 1];

    const startOfDay = `${primeraFecha}T00:00:00.000Z`;
    const endOfDay = `${ultimaFecha}T23:59:59.999Z`;

    const { data: turnos } = await this.supabase.supabase
      .from('turnos')
      .select('fecha_hora')
      .eq('especialista_id', especialistaId)
      .gte('fecha_hora', startOfDay)
      .lte('fecha_hora', endOfDay)
      .not('estado', 'in', '(cancelado,rechazado)');

    const mapa = new Map<string, TurnoOcupado[]>();

    for (const turno of (turnos ?? []) as TurnoOcupado[]) {
      const fecha = turno.fecha_hora.substring(0, 10);
      const existentes = mapa.get(fecha) ?? [];
      mapa.set(fecha, [...existentes, turno]);
    }

    return mapa;
  }

  /**
   * Filtra una lista de IDs de perfiles contra la vista publica de
   * especialistas, retornando únicamente aquellos con `is_approved = true`.
   * No expone DNI ni edad tras el endurecimiento RLS de la tabla base.
   *
   * @param perfilesIds Array de IDs de perfiles a verificar.
   * @returns Set con los IDs de especialistas aprobados.
   */
  private async filtrarEspecialistasAprobados(
    perfilesIds: string[],
  ): Promise<Set<string>> {
    if (perfilesIds.length === 0) {
      return new Set();
    }

    const { data: especialistasData } = await this.supabase.supabase
      .from('vista_especialistas_publicos')
      .select('id')
      .in('id', perfilesIds)
      .eq('is_approved', true);

    return new Set((especialistasData ?? []).map(e => e['id'] as string));
  }

  /**
   * Enriquece el mapa de especialistas con todas sus especialidades.
   *
   * Consulta la relación M:N `especialista_especialidad` y el catálogo
   * `specialties` para resolver los nombres de cada especialidad.
   *
   * @param mapaEspecialistas Mapa mutable a enriquecer (modificación in-place).
   */
  private async enriquecerEspecialidades(
    mapaEspecialistas: Map<string, EspecialistaWizard>,
  ): Promise<void> {
    const { data: todasRelaciones } = await this.supabase.supabase
      .from('especialista_especialidad')
      .select('especialista_id, especialidad_id');

    if (!todasRelaciones) return;

    const todasIds = [...new Set(todasRelaciones.map(r => r.especialidad_id))];

    const { data: todasEspecialidades } = await this.supabase.supabase
      .from('specialties')
      .select('id, name')
      .in('id', todasIds);

    const mapaEsp = new Map<string, string>();
    if (todasEspecialidades) {
      for (const esp of todasEspecialidades) {
        mapaEsp.set(esp.id, esp.name);
      }
    }

    for (const row of todasRelaciones) {
      const userId = row.especialista_id;
      const espName = mapaEsp.get(row.especialidad_id);
      const especialista = mapaEspecialistas.get(userId);

      if (especialista && espName) {
        const nuevasEspecialidades = [
          ...especialista.especialidades,
          { id: row.especialidad_id, name: espName },
        ];
        mapaEspecialistas.set(userId, {
          ...especialista,
          especialidades: Object.freeze(nuevasEspecialidades),
        });
      }
    }
  }

  /**
   * Fragmenta un array de bloques de disponibilidad en slots de 30 minutos.
   *
   * @param bloques Array de registros con hora_inicio y hora_fin.
   * @returns Array de cadenas horarias en formato "HH:mm".
   */
  private generarSlots(bloques: Array<Record<string, string>>): string[] {
    const slots: string[] = [];

    for (const bloque of bloques) {
      const inicio = bloque['hora_inicio'];
      const fin = bloque['hora_fin'];

      let minutosActuales = this.parsearMinutos(inicio);
      const minutosFin = this.parsearMinutos(fin);

      while (minutosActuales < minutosFin) {
        const horas = Math.floor(minutosActuales / 60);
        const minutos = minutosActuales % 60;
        slots.push(
          `${String(horas).padStart(2, '0')}:${String(minutos).padStart(2, '0')}`,
        );
        minutosActuales += 30;
      }
    }

    return slots;
  }

  /**
   * Calcula el total de slots de 30 minutos que caben en los bloques dados.
   *
   * @param bloques Array de bloques con hora_inicio y hora_fin.
   * @returns Número total de slots.
   */
  private calcularTotalSlots(bloques: Array<{ hora_inicio: string; hora_fin: string }>): number {
    let total = 0;
    for (const bloque of bloques) {
      const minutosInicio = this.parsearMinutos(bloque.hora_inicio);
      const minutosFin = this.parsearMinutos(bloque.hora_fin);
      total += Math.floor((minutosFin - minutosInicio) / 30);
    }
    return total;
  }

  /**
   * Convierte una cadena horaria "HH:mm" a minutos desde medianoche.
   *
   * @param hora Cadena horaria a parsear.
   * @returns Cantidad total de minutos.
   */
  private parsearMinutos(hora: string): number {
    const [horas, minutos] = hora.split(':').map(Number);
    return horas * 60 + minutos;
  }

  /**
   * Formatea un objeto Date a cadena "YYYY-MM-DD".
   *
   * @param fecha Objeto Date a formatear.
   * @returns Cadena en formato ISO de fecha.
   */
  private formatearFecha(fecha: Date): string {
    const anio = fecha.getFullYear();
    const mes = String(fecha.getMonth() + 1).padStart(2, '0');
    const dia = String(fecha.getDate()).padStart(2, '0');
    return `${anio}-${mes}-${dia}`;
  }

  /**
   * Determina el día de la semana a partir de una cadena de fecha.
   *
   * @param fechaStr Cadena en formato "YYYY-MM-DD".
   * @returns Día de la semana como número (0-6).
   */
  private obtenerDiaSemana(fechaStr: string): DiaSemana {
    const [anio, mes, dia] = fechaStr.split('-').map(Number);
    const fecha = new Date(anio, mes - 1, dia);
    return fecha.getDay() as DiaSemana;
  }
}
