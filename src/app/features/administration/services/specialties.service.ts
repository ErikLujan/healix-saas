import { inject, Injectable, signal } from '@angular/core';
import { SupabaseService } from '@core/services/supabase.service';
import { toast } from 'ngx-sonner';

/**
 * Modelo de especialidad tal como se almacena en la tabla `specialties`.
 */
export interface Specialty {
  readonly id: string;
  readonly name: string;
  readonly description: string | null;
  readonly is_active: boolean;
  readonly created_at: string;
}

/**
 * Especialidad enriquecida con el conteo de especialistas asociados.
 */
export interface SpecialtyWithCount extends Specialty {
  readonly specialistCount: number;
}

/**
 * Servicio de gestion de especialidades medicas.
 *
 * Responsable de las operaciones CRUD sobre la tabla `specialties`
 * de Supabase. Expone signals reactivas para mantener la interfaz
 * sincronizada. No contiene logica de presentacion.
 */
@Injectable({ providedIn: 'root' })
export class SpecialtiesService {
  private readonly supabase = inject(SupabaseService);

  readonly specialties = signal<readonly SpecialtyWithCount[]>([]);
  readonly isLoading = signal(false);

  /**
   * Carga todas las especialidades con el conteo de especialistas asociados.
   * Actualiza la signal `specialties` con el resultado.
   */
  async loadSpecialties(): Promise<void> {
    this.isLoading.set(true);

    const { data, error } = await this.supabase.supabase
      .from('specialties')
      .select('*')
      .order('name', { ascending: true });

    if (error) {
      console.error('[SpecialtiesService] load error:', error.message);
      toast.error('Error al cargar las especialidades');
      this.isLoading.set(false);
      return;
    }

    const specialtiesWithCount: SpecialtyWithCount[] = await Promise.all(
      (data ?? []).map(async (sp) => {
        const { count } = await this.supabase.supabase
          .from('especialista_especialidad')
          .select('*', { count: 'exact', head: true })
          .eq('especialidad_id', sp.id);

        return { ...sp, specialistCount: count ?? 0 };
      }),
    );

    this.specialties.set(specialtiesWithCount);
    this.isLoading.set(false);
  }

  /**
   * Crea una nueva especialidad en la base de datos.
   *
   * @param name Nombre de la especialidad.
   * @param description Descripcion opcional de la especialidad.
   */
  async createSpecialty(name: string, description: string): Promise<void> {
    const { error } = await this.supabase.supabase
      .from('specialties')
      .insert({ name: name.trim(), description: description.trim() || null });

    if (error) {
      console.error('[SpecialtiesService] create error:', error.message);
      toast.error('Error al crear la especialidad');
      return;
    }

    toast.success('Especialidad creada correctamente');
    await this.loadSpecialties();
  }

  /**
   * Actualiza el estado activo/inactivo de una especialidad.
   *
   * @param specialtyId ID de la especialidad a actualizar.
   * @param isActive Nuevo estado de la especialidad.
   */
  async toggleActive(specialtyId: string, isActive: boolean): Promise<void> {
    const { error } = await this.supabase.supabase
      .from('specialties')
      .update({ is_active: isActive })
      .eq('id', specialtyId);

    if (error) {
      console.error('[SpecialtiesService] toggle error:', error.message);
      toast.error('Error al actualizar la especialidad');
      return;
    }

    this.specialties.update(list =>
      list.map(s => s.id === specialtyId ? { ...s, is_active: isActive } : s),
    );

    toast.success(isActive ? 'Especialidad activada' : 'Especialidad desactivada');
  }

  /**
   * Elimina una especialidad de la base de datos.
   *
   * @param specialtyId ID de la especialidad a eliminar.
   */
  async deleteSpecialty(specialtyId: string): Promise<void> {
    const { error } = await this.supabase.supabase
      .from('specialties')
      .delete()
      .eq('id', specialtyId);

    if (error) {
      console.error('[SpecialtiesService] delete error:', error.message);
      toast.error('Error al eliminar la especialidad');
      return;
    }

    toast.success('Especialidad eliminada');
    await this.loadSpecialties();
  }
}
