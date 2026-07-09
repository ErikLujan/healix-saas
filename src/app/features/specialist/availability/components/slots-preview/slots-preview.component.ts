import { Component, input, computed, inject } from '@angular/core';
import { DisponibilidadService } from '@core/services/disponibilidad.service';
import { ConfiguracionDia, DiaSemana } from '@core/models/disponibilidad.model';

interface EspecialidadPerfil {
  readonly id: string;
  readonly name: string;
}

interface DiaInfo {
  readonly id: DiaSemana;
  readonly nombre: string;
}

@Component({
  selector: 'app-slots-preview',
  standalone: true,
  templateUrl: './slots-preview.component.html',
})
export class SlotsPreviewComponent {
  private readonly disponibilidadService = inject(DisponibilidadService);

  readonly configuracion = input.required<Record<number, ConfiguracionDia>>();
  readonly especialidades = input.required<readonly EspecialidadPerfil[]>();
  readonly diasDisponibles = input.required<readonly DiaInfo[]>();

  readonly diasConSlots = computed(() => {
    const config = this.configuracion();
    const resultado: { readonly dia: DiaInfo; readonly slots: readonly string[] }[] = [];

    for (const dia of this.diasDisponibles()) {
      const diaConfig = config[dia.id];
      if (!diaConfig?.habilitado || diaConfig.bloques.length === 0) continue;

      const todosLosSlots: string[] = [];

      for (const bloque of diaConfig.bloques) {
        const slots = this.disponibilidadService.generarSlotsDeAtencion(
          bloque.hora_inicio,
          bloque.hora_fin,
        );
        todosLosSlots.push(...slots);
      }

      resultado.push({
        dia,
        slots: Object.freeze(todosLosSlots),
      });
    }

    return resultado;
  });

  readonly totalSlots = computed(() =>
    this.diasConSlots().reduce((sum, d) => sum + d.slots.length, 0),
  );

  getNombreEspecialidad(especialidadId: string): string {
    return this.especialidades().find(e => e.id === especialidadId)?.name ?? '';
  }
}
