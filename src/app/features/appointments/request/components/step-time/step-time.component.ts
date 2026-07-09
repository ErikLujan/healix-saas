import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { NgClass } from '@angular/common';
import { SupabaseService } from '@core/services/supabase.service';
import { WizardTurnoService, BloqueDisponible } from '../../services/wizard-turno.service';
import { DiaSemana } from '@core/models/disponibilidad.model';

@Component({
  selector: 'app-step-time',
  standalone: true,
  imports: [NgClass],
  templateUrl: './step-time.component.html',
})
export class StepTimeComponent implements OnInit {
  private readonly supabase = inject(SupabaseService);
  private readonly wizard = inject(WizardTurnoService);

  readonly bloques = signal<readonly BloqueDisponible[]>([]);
  readonly isLoading = signal(true);
  readonly seleccionada = this.wizard.horaSeleccionada;
  readonly especialista = this.wizard.especialistaSeleccionado;
  readonly fechaSeleccionada = this.wizard.fechaSeleccionada;

  readonly bloquesDisponibles = computed(() =>
    this.bloques().filter(b => b.disponible),
  );

  readonly totalDisponibles = computed(() => this.bloquesDisponibles().length);

  async ngOnInit(): Promise<void> {
    await this.cargarBloques();
  }

  async cargarBloques(): Promise<void> {
    this.isLoading.set(true);
    const especialista = this.especialista();
    const fecha = this.fechaSeleccionada();

    if (!especialista || !fecha) {
      this.isLoading.set(false);
      return;
    }

    const diaSemana = this.obtenerDiaSemana(fecha);

    const { data: disponibilidad } = await this.supabase.supabase
      .from('disponibilidad_especialista')
      .select('hora_inicio, hora_fin')
      .eq('especialista_id', especialista.id)
      .eq('dia_semana', diaSemana);

    if (!disponibilidad || disponibilidad.length === 0) {
      this.bloques.set(Object.freeze([]));
      this.isLoading.set(false);
      return;
    }

    const bloquesBase = this.generarSlots(disponibilidad);

    const startOfDay = `${fecha}T00:00:00.000Z`;
    const endOfDay = `${fecha}T23:59:59.999Z`;

    const { data: turnosOcupados } = await this.supabase.supabase
      .from('turnos')
      .select('fecha_hora')
      .eq('especialista_id', especialista.id)
      .gte('fecha_hora', startOfDay)
      .lte('fecha_hora', endOfDay)
      .not('estado', 'in', '(cancelado,rechazado)');

    const horasOcupadas = new Set(
      (turnosOcupados ?? []).map(t => {
        const iso = t['fecha_hora'] as string;
        return iso.substring(11, 16);
      }),
    );

    const bloques: BloqueDisponible[] = bloquesBase.map(slot => ({
      hora: slot,
      disponible: !horasOcupadas.has(slot),
    }));

    this.bloques.set(Object.freeze(bloques));
    this.isLoading.set(false);
  }

  seleccionar(hora: string): void {
    this.wizard.seleccionarHora(hora);
  }

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

  private parsearMinutos(hora: string): number {
    const [horas, minutos] = hora.split(':').map(Number);
    return horas * 60 + minutos;
  }

  private obtenerDiaSemana(fechaStr: string): DiaSemana {
    const [anio, mes, dia] = fechaStr.split('-').map(Number);
    const fecha = new Date(anio, mes - 1, dia);
    return fecha.getDay() as DiaSemana;
  }
}
