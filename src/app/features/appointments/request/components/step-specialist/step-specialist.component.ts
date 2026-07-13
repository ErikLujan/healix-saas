import { Component, inject, OnInit, signal } from '@angular/core';
import { NgClass } from '@angular/common';
import { SupabaseService } from '@core/services/supabase.service';
import { WizardTurnoService, EspecialistaWizard } from '../../services/wizard-turno.service';
import { FallbackAvatarDirective } from '@shared/directives/fallback-avatar.directive';
import { toast } from 'ngx-sonner';

@Component({
  selector: 'app-step-specialist',
  standalone: true,
  imports: [NgClass, FallbackAvatarDirective],
  templateUrl: './step-specialist.component.html',
})
export class StepSpecialistComponent implements OnInit {
  private readonly supabase = inject(SupabaseService);
  private readonly wizard = inject(WizardTurnoService);

  readonly especialistas = signal<readonly EspecialistaWizard[]>([]);
  readonly isLoading = signal(true);
  readonly seleccionado = this.wizard.especialistaSeleccionado;

  async ngOnInit(): Promise<void> {
    await this.cargarEspecialistas();
  }

  async cargarEspecialistas(): Promise<void> {
    this.isLoading.set(true);
    const especialidad = this.wizard.especialidadSeleccionada();
    if (!especialidad) {
      this.isLoading.set(false);
      return;
    }

    const { data: relaciones, error: relError } = await this.supabase.supabase
      .from('especialista_especialidad')
      .select('especialista_id')
      .eq('especialidad_id', especialidad.id);

    if (relError || !relaciones || relaciones.length === 0) {
      this.especialistas.set(Object.freeze([]));
      this.isLoading.set(false);
      return;
    }

    const idsMedicos = [...new Set(relaciones.map(r => r.especialista_id))];

    const { data: perfiles, error: profilesError } = await this.supabase.supabase
      .from('profiles')
      .select('id, full_name, avatar_url')
      .in('id', idsMedicos);

    if (profilesError || !perfiles) {
      toast.error('Error al cargar los especialistas. Intenta nuevamente.');
      this.especialistas.set(Object.freeze([]));
      this.isLoading.set(false);
      return;
    }

    const mapaEspecialistas = new Map<string, EspecialistaWizard>();

    for (const perfil of perfiles) {
      mapaEspecialistas.set(perfil.id, {
        id: perfil.id,
        full_name: perfil.full_name,
        avatar_url: perfil.avatar_url ?? null,
        especialidades: [],
      });
    }

    const { data: todasRelaciones } = await this.supabase.supabase
      .from('especialista_especialidad')
      .select('especialista_id, especialidad_id');

    if (todasRelaciones) {
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

    const especialistas = Array.from(mapaEspecialistas.values());
    this.especialistas.set(Object.freeze(especialistas));
    this.isLoading.set(false);
  }

  seleccionar(especialista: EspecialistaWizard): void {
    this.wizard.seleccionarEspecialista(especialista);
  }
}
