import { Component, inject, OnInit, signal } from '@angular/core';
import { NgClass } from '@angular/common';
import { SupabaseService } from '@core/services/supabase.service';
import { EspecialidadInfo } from '@core/models/turno.model';
import { WizardTurnoService } from '../../services/wizard-turno.service';

@Component({
  selector: 'app-step-specialty',
  standalone: true,
  imports: [NgClass],
  templateUrl: './step-specialty.component.html',
})
export class StepSpecialtyComponent implements OnInit {
  private readonly supabase = inject(SupabaseService);
  private readonly wizard = inject(WizardTurnoService);

  readonly especialidades = signal<readonly EspecialidadInfo[]>([]);
  readonly isLoading = signal(true);
  readonly seleccionada = this.wizard.especialidadSeleccionada;

  async ngOnInit(): Promise<void> {
    await this.cargarEspecialidades();
  }

  async cargarEspecialidades(): Promise<void> {
    this.isLoading.set(true);

    const { data, error } = await this.supabase.supabase
      .from('specialties')
      .select('id, name')
      .eq('is_active', true)
      .order('name');

    if (error || !data) {
      this.isLoading.set(false);
      return;
    }

    const especialidades: EspecialidadInfo[] = data.map((row) => ({
      id: row['id'] as string,
      name: row['name'] as string,
    }));

    this.especialidades.set(Object.freeze(especialidades));
    this.isLoading.set(false);
  }

  seleccionar(especialidad: EspecialidadInfo): void {
    this.wizard.seleccionarEspecialidad(especialidad);
  }
}
