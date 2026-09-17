import { Injectable, inject, signal } from '@angular/core';
import { SupabaseService } from '@core/services/supabase.service';

interface LandingSpecialty {
  readonly id: string;
  readonly name: string;
  readonly description: string | null;
}

interface LandingSpecialist {
  readonly id: string;
  readonly full_name: string;
  readonly specialty: string;
  readonly specialty_id: string | null;
  readonly avatar_url: string | null;
}

@Injectable({ providedIn: 'root' })
export class LandingService {
  private readonly supabase = inject(SupabaseService);

  readonly specialties = signal<readonly LandingSpecialty[]>([]);
  readonly specialists = signal<readonly LandingSpecialist[]>([]);
  readonly specialistCounts = signal<Map<string, number>>(new Map());
  readonly isLoadingSpecialties = signal(true);
  readonly isLoadingSpecialists = signal(true);

  async loadSpecialties(): Promise<void> {
    this.isLoadingSpecialties.set(true);

    const { data, error } = await this.supabase.supabase
      .from('specialties')
      .select('id, name, description')
      .eq('is_active', true)
      .order('name', { ascending: true });

    if (error) {
      this.isLoadingSpecialties.set(false);
      return;
    }

    this.specialties.set((data ?? []) as LandingSpecialty[]);
    this.isLoadingSpecialties.set(false);
  }

  /**
   * Carga los especialistas aprobados para la pagina publica.
   *
   * Lee identidad desde `vista_perfiles_publicos` y filtra aprobados
   * mediante `vista_especialistas_publicos`, sin exponer correo, DNI
   * ni edad tras el endurecimiento RLS de las tablas base.
   */
  async loadSpecialists(): Promise<void> {
    this.isLoadingSpecialists.set(true);

    const { data: perfiles, error: perfilesError } = await this.supabase.supabase
      .from('vista_perfiles_publicos')
      .select('id, full_name, avatar_url')
      .eq('role', 'especialista')
      .order('full_name', { ascending: true });

    if (perfilesError || !perfiles) {
      this.isLoadingSpecialists.set(false);
      return;
    }

    const ids = (perfiles as { id: string }[]).map((p) => p.id);

    if (ids.length === 0) {
      this.specialists.set([]);
      this.specialistCounts.set(new Map());
      this.isLoadingSpecialists.set(false);
      return;
    }

    const { data: aprobados } = await this.supabase.supabase
      .from('vista_especialistas_publicos')
      .select('id')
      .in('id', ids)
      .eq('is_approved', true);

    const idsAprobados = new Set(((aprobados as { id: string }[]) ?? []).map((a) => a.id));

    if (idsAprobados.size === 0) {
      this.specialists.set([]);
      this.specialistCounts.set(new Map());
      this.isLoadingSpecialists.set(false);
      return;
    }

    const { data: relaciones } = await this.supabase.supabase
      .from('especialista_especialidad')
      .select('especialista_id, especialidad_id')
      .in('especialista_id', [...idsAprobados]);

    const especialidadIds = [...new Set(((relaciones ?? []) as { especialidad_id: string }[]).map((r) => r.especialidad_id))];

    const nombres = new Map<string, string>();
    if (especialidadIds.length > 0) {
      const { data: especialidades } = await this.supabase.supabase
        .from('specialties')
        .select('id, name')
        .in('id', especialidadIds);

      for (const e of ((especialidades as { id: string; name: string }[] | null) ?? [])) {
        nombres.set(e.id, e.name);
      }
    }
    const primeraEspecialidad = new Map<string, { specialty: string; specialty_id: string }>();
    for (const rel of ((relaciones ?? []) as { especialista_id: string; especialidad_id: string }[])) {
      if (!primeraEspecialidad.has(rel.especialista_id)) {
        primeraEspecialidad.set(rel.especialista_id, {
          specialty: nombres.get(rel.especialidad_id) ?? 'Especialista',
          specialty_id: rel.especialidad_id,
        });
      }
    }

    const specialists = ((perfiles as { id: string; full_name: string; avatar_url: string | null }[]))
      .filter((row) => idsAprobados.has(row.id))
      .map((row) => {
        const extra = primeraEspecialidad.get(row.id);

        return {
          id: row.id,
          full_name: row.full_name,
          specialty: extra?.specialty ?? 'Especialista',
          specialty_id: extra?.specialty_id ?? null,
          avatar_url: row.avatar_url ?? null,
        };
      });

    this.specialists.set(specialists);

    const counts = new Map<string, number>();
    for (const s of specialists) {
      if (s.specialty_id) {
        counts.set(s.specialty_id, (counts.get(s.specialty_id) ?? 0) + 1);
      }
    }
    this.specialistCounts.set(counts);
    this.isLoadingSpecialists.set(false);
  }
}
