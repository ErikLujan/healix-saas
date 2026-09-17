import { inject, Injectable, signal } from '@angular/core';
import { SupabaseService } from '@core/services/supabase.service';
import { toast } from 'ngx-sonner';

export interface SpecialtyItem {
  readonly id: string;
  readonly name: string;
}

export interface SpecialistListItem {
  readonly id: string;
  readonly full_name: string;
  readonly email: string;
  readonly avatar_url: string | null;
  readonly created_at: string;
  readonly is_approved: boolean;
  readonly dni: string;
  readonly edad: number;
  readonly specialties: readonly SpecialtyItem[];
}

/**
 * Gestiona el listado de especialistas y su estado de aprobación.
 *
 * Centraliza las consultas a Supabase para el panel de administración.
 * Los componentes consumen los signals expuestos sin acceder a Supabase.
 */
@Injectable({ providedIn: 'root' })
export class SpecialistsService {
  private readonly supabase = inject(SupabaseService);

  /** Listado inmutable de especialistas con sus especialidades. */
  readonly specialists = signal<readonly SpecialistListItem[]>([]);
  /** Indica si la carga del listado está en curso. */
  readonly isLoading = signal(false);

  /**
   * Carga el listado de especialistas con sus datos de aprobación.
   */
  async loadSpecialists(): Promise<void> {
    this.isLoading.set(true);

    const { data, error } = await this.supabase.supabase
      .from('profiles')
      .select(`
        id,
        full_name,
        email,
        avatar_url,
        created_at,
        especialistas(
          is_approved,
          dni,
          edad,
          especialista_especialidad(
            especialidad_id,
            specialties(
              id,
              name
            )
          )
        )
      `)
      .eq('role', 'especialista')
      .order('created_at', { ascending: false });

    if (error) {
      toast.error('No fue posible cargar la lista de especialistas. Por favor, verifica los datos e intenta nuevamente.');
      this.isLoading.set(false);
      return;
    }

    const items: SpecialistListItem[] = (data ?? []).map((row) => {
      const raw = row as Record<string, unknown>;

      const espRaw = Array.isArray(raw['especialistas'])
        ? (raw['especialistas'][0] as Record<string, unknown> | null)
        : (raw['especialistas'] as Record<string, unknown> | null);

      const isApproved = (espRaw?.['is_approved'] as boolean) ?? false;
      const dni = (espRaw?.['dni'] as string) ?? '';
      const edad = (espRaw?.['edad'] as number) ?? 0;

      const espRel = espRaw?.['especialista_especialidad'];
      const relArray = Array.isArray(espRel) ? espRel : [];

      const specialties: SpecialtyItem[] = [];
      for (const item of relArray) {
        const specObj = (item as Record<string, unknown>)['specialties'] as Record<string, unknown> | null;
        if (specObj && typeof specObj === 'object') {
          specialties.push({
            id: (specObj['id'] as string) ?? ((item as Record<string, unknown>)['especialidad_id'] as string) ?? '',
            name: (specObj['name'] as string) ?? 'Especialidad',
          });
        }
      }

      return {
        id: raw['id'] as string,
        full_name: (raw['full_name'] as string) ?? 'Especialista',
        email: (raw['email'] as string) ?? '',
        avatar_url: (raw['avatar_url'] as string) ?? null,
        created_at: raw['created_at'] as string,
        is_approved: isApproved,
        dni,
        edad,
        specialties,
      };
    });

    this.specialists.set(items);
    this.isLoading.set(false);
  }

  /**
   * Alterna el estado de aprobación de un especialista y actualiza el listado local.
   *
   * @param specialistId Identificador del especialista.
   * @param currentStatus Estado de aprobación actual.
   */
  async toggleApproval(specialistId: string, currentStatus: boolean): Promise<void> {
    const newStatus = !currentStatus;

    const { error } = await this.supabase.supabase
      .from('especialistas')
      .update({ is_approved: newStatus })
      .eq('id', specialistId);

    if (error) {
      toast.error('No fue posible actualizar el estado del especialista. Por favor, verifica los datos e intenta nuevamente.');
      return;
    }

    this.specialists.update((list) =>
      list.map((s) =>
        s.id === specialistId ? { ...s, is_approved: newStatus } : s,
      ),
    );

    toast.success(
      newStatus
        ? 'Especialista aprobado correctamente'
        : 'Especialista desactivado',
    );
  }
}
