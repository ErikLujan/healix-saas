import { inject, Injectable, signal } from '@angular/core';
import { SupabaseService } from '@core/services/supabase.service';

/**
 * Filtro de rango de fechas para consultas estadisticas.
 */
export interface DateRangeFilter {
  readonly desde: string;
  readonly hasta: string;
}

/**
 * Registro del log de ingresos al sistema.
 */
export interface AccessLogEntry {
  readonly userId: string;
  readonly fullName: string;
  readonly email: string;
  readonly role: string;
  readonly loginAt: string;
}

/**
 * Dato para grafico de turnos por especialidad.
 */
export interface TurnoPorEspecialidad {
  readonly especialidad: string;
  readonly cantidad: number;
}

/**
 * Dato para grafico de turnos por dia.
 */
export interface TurnoPorDia {
  readonly dia: string;
  readonly cantidad: number;
}

/**
 * Dato para grafico de turnos por medico.
 */
export interface TurnoPorMedico {
  readonly medico: string;
  readonly solicitados: number;
  readonly finalizados: number;
}

/**
 * Servicio centralizado de estadisticas para el panel de administracion.
 *
 * Realiza consultas reales a Supabase para obtener metricas globales
 * del sistema. Todos los datos provienen de tablas reales; no se
 * utilizan datos hardcodeados ni simulados.
 */
@Injectable({ providedIn: 'root' })
export class StatisticsService {
  private readonly supabase = inject(SupabaseService);

  readonly isLoading = signal(false);

  /** Log de accesos recientes. */
  readonly accessLogs = signal<readonly AccessLogEntry[]>([]);
  /** Turnos por especialidad. */
  readonly turnosPorEspecialidad = signal<readonly TurnoPorEspecialidad[]>([]);
  /** Turnos por dia de la semana. */
  readonly turnosPorDia = signal<readonly TurnoPorDia[]>([]);
  /** Turnos por medico (solicitados y finalizados). */
  readonly turnosPorMedico = signal<readonly TurnoPorMedico[]>([]);

  /** Total de usuarios registrados. */
  readonly totalUsuarios = signal(0);
  /** Especialistas pendientes de aprobacion. */
  readonly especialistasPendientes = signal(0);
  /** Total de turnos del mes. */
  readonly turnosDelMes = signal(0);
  /** Total de historias clinicas. */
  readonly totalHistorias = signal(0);

  /**
   * Carga todos los datos estadisticos desde Supabase.
   * Ejecuta las consultas en paralelo para optimizar el tiempo de carga.
   */
  async loadAllStats(): Promise<void> {
    this.isLoading.set(true);

    await Promise.all([
      this.loadKPIs(),
      this.loadAccessLogs(),
      this.loadTurnosPorEspecialidad(),
      this.loadTurnosPorDia(),
    ]);

    this.isLoading.set(false);
  }

  /**
   * Carga los KPIs globales del sistema.
   */
  private async loadKPIs(): Promise<void> {
    const now = new Date();
    const primerDiaMes = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

    const [usuariosResult, pendientesResult, turnosMesResult, historiasResult] = await Promise.all([
      this.supabase.supabase.from('profiles').select('id', { count: 'exact', head: true }),
      this.supabase.supabase.from('especialistas').select('id', { count: 'exact', head: true }).eq('is_approved', false),
      this.supabase.supabase.from('turnos').select('id', { count: 'exact', head: true }).gte('created_at', primerDiaMes),
      this.supabase.supabase.from('historias_clinicas').select('id', { count: 'exact', head: true }),
    ]);

    this.totalUsuarios.set(usuariosResult.count ?? 0);
    this.especialistasPendientes.set(pendientesResult.count ?? 0);
    this.turnosDelMes.set(turnosMesResult.count ?? 0);
    this.totalHistorias.set(historiasResult.count ?? 0);
  }

  /**
   * Carga el log de accesos recientes al sistema.
   * Consulta la tabla logs_accesos unida con profiles para obtener
   * el nombre, email y rol del usuario junto con la marca de tiempo
   * real del ingreso.
   */
  private async loadAccessLogs(): Promise<void> {
    const typedClient = this.supabase.supabase as unknown as {
      from: (table: string) => {
        select: (cols: string) => {
          order: (col: string, opts: { ascending: boolean }) => {
            limit: (n: number) => Promise<{ data: Record<string, unknown>[] | null; error: { message: string } | null }>;
          };
        };
      };
    };

    const { data, error } = await typedClient
      .from('logs_accesos')
      .select('id, user_id, created_at, profiles:user_id(full_name, email, role)')
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      return;
    }

    const logs: AccessLogEntry[] = (data ?? []).map(row => {
      const perfil = row['profiles'] as Record<string, unknown> | null;
      return {
        userId: row['user_id'] as string,
        fullName: (perfil?.['full_name'] as string) ?? 'Sin nombre',
        email: (perfil?.['email'] as string) ?? '',
        role: (perfil?.['role'] as string) ?? '',
        loginAt: row['created_at'] as string,
      };
    });

    this.accessLogs.set(logs);
  }

  /**
   * Carga la distribucion de turnos por especialidad.
   */
  private async loadTurnosPorEspecialidad(): Promise<void> {
    const { data, error } = await this.supabase.supabase
      .from('turnos')
      .select('especialidad_id, specialties!inner(name)');

    if (error) {
      return;
    }

    const counts = new Map<string, number>();
    for (const row of data ?? []) {
      const nested = row['specialties'] as Record<string, unknown> | null;
      const nombre = (nested?.['name'] as string) ?? 'Sin especialidad';
      counts.set(nombre, (counts.get(nombre) ?? 0) + 1);
    }

    const result: TurnoPorEspecialidad[] = Array.from(counts.entries())
      .map(([especialidad, cantidad]) => ({ especialidad, cantidad }))
      .sort((a, b) => b.cantidad - a.cantidad);

    this.turnosPorEspecialidad.set(result);
  }

  /**
   * Carga la cantidad de turnos por dia de la semana.
   */
  private async loadTurnosPorDia(): Promise<void> {
    const { data, error } = await this.supabase.supabase
      .from('turnos')
      .select('fecha_hora');

    if (error) {
      return;
    }

    const diasSemana = ['Dom', 'Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab'];
    const counts = new Map<string, number>();
    for (const dia of diasSemana) counts.set(dia, 0);

    for (const row of data ?? []) {
      const fecha = new Date(row.fecha_hora);
      const dia = diasSemana[fecha.getDay()];
      counts.set(dia, (counts.get(dia) ?? 0) + 1);
    }

    const result: TurnoPorDia[] = diasSemana.map(dia => ({
      dia,
      cantidad: counts.get(dia) ?? 0,
    }));

    this.turnosPorDia.set(result);
  }

  /**
   * Carga los turnos solicitados y finalizados por medico en un rango de fechas.
   *
   * @param range Rango de fechas para filtrar (desde/hasta).
   */
  async loadTurnosPorMedico(range: DateRangeFilter): Promise<void> {
    const { data, error } = await this.supabase.supabase
      .from('turnos')
      .select('especialista_id, estado, profiles!especialista_id(full_name)')
      .gte('fecha_hora', range.desde)
      .lte('fecha_hora', range.hasta + 'T23:59:59');

    if (error) {
      return;
    }

    const medicosMap = new Map<string, { nombre: string; solicitados: number; finalizados: number }>();

    for (const row of data ?? []) {
      const raw = row as Record<string, unknown>;
      const nested = raw['profiles'] as Record<string, unknown> | null;
      const nombre = (nested?.['full_name'] as string) ?? 'Desconocido';
      const id = raw['especialista_id'] as string;

      if (!medicosMap.has(id)) {
        medicosMap.set(id, { nombre, solicitados: 0, finalizados: 0 });
      }

      const medico = medicosMap.get(id)!;
      medico.solicitados++;
      if (raw['estado'] === 'finalizado') {
        medico.finalizados++;
      }
    }

    const result: TurnoPorMedico[] = Array.from(medicosMap.values())
      .map(m => ({ medico: m.nombre, solicitados: m.solicitados, finalizados: m.finalizados }))
      .sort((a, b) => b.solicitados - a.solicitados);

    this.turnosPorMedico.set(result);
  }
}
