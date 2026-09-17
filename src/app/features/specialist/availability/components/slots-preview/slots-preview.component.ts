import { Component, input, computed, inject } from '@angular/core';
import { DisponibilidadService } from '@core/services/disponibilidad.service';
import {
  ConfiguracionDia,
  DiaSemana,
  EspecialidadPerfil,
  DiaInfo,
  DURACION_SLOT_MINUTOS,
} from '@core/models/disponibilidad.model';

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

  readonly totalHorasSemanales = computed(() => {
    const totalMinutos = this.totalSlots() * DURACION_SLOT_MINUTOS;
    return totalMinutos / 60;
  });

  readonly horasPorEspecialidad = computed(() => {
    const config = this.configuracion();
    const acumulador = new Map<string, number>();

    for (const diaConfig of Object.values(config)) {
      if (!diaConfig.habilitado) continue;

      for (const bloque of diaConfig.bloques) {
        const minutosInicio = this.parsearAMinutos(bloque.hora_inicio);
        const minutosFin = this.parsearAMinutos(bloque.hora_fin);
        const minutos = minutosFin - minutosInicio;
        const actual = acumulador.get(bloque.especialidad_id) ?? 0;
        acumulador.set(bloque.especialidad_id, actual + minutos);
      }
    }

    const resultado: { readonly nombre: string; readonly horas: number }[] = [];
    for (const [id, minutos] of acumulador) {
      const esp = this.especialidades().find(e => e.id === id);
      if (esp) {
        resultado.push({ nombre: esp.name, horas: minutos / 60 });
      }
    }

    return resultado;
  });

  getNombreEspecialidad(especialidadId: string): string {
    return this.especialidades().find(e => e.id === especialidadId)?.name ?? '';
  }

  private parsearAMinutos(hora: string): number {
    const partes = hora.split(':');
    return parseInt(partes[0], 10) * 60 + parseInt(partes[1], 10);
  }
}
