import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { NgClass } from '@angular/common';
import { SupabaseService } from '@core/services/supabase.service';
import { WizardTurnoService } from '../../services/wizard-turno.service';
import { DiaSemana } from '@core/models/disponibilidad.model';

interface FechaDisponible {
  readonly fecha: string;
  readonly diaSemana: number;
  readonly diaNombre: string;
  readonly diaNumero: number;
  readonly mesNombre: string;
  readonly esHoy: boolean;
}

const NOMBRES_DIAS_CORTOS: Record<number, string> = {
  0: 'Dom', 1: 'Lun', 2: 'Mar', 3: 'Mié', 4: 'Jue', 5: 'Vie', 6: 'Sáb',
};

const NOMBRES_MESES: Record<number, string> = {
  0: 'Ene', 1: 'Feb', 2: 'Mar', 3: 'Abr', 4: 'May', 5: 'Jun',
  6: 'Jul', 7: 'Ago', 8: 'Sep', 9: 'Oct', 10: 'Nov', 11: 'Dic',
};

@Component({
  selector: 'app-step-date',
  standalone: true,
  imports: [NgClass],
  templateUrl: './step-date.component.html',
})
export class StepDateComponent implements OnInit {
  private readonly supabase = inject(SupabaseService);
  private readonly wizard = inject(WizardTurnoService);

  readonly fechasDisponibles = signal<readonly FechaDisponible[]>([]);
  readonly isLoading = signal(true);
  readonly seleccionada = this.wizard.fechaSeleccionada;
  readonly especialista = this.wizard.especialistaSeleccionado;

  readonly agrupadasPorMes = computed(() => {
    const fechas = this.fechasDisponibles();
    const agrupadas = new Map<string, readonly FechaDisponible[]>();

    for (const fecha of fechas) {
      const clave = `${fecha.mesNombre}`;
      const existentes = agrupadas.get(clave) ?? [];
      agrupadas.set(clave, [...existentes, fecha]);
    }

    return Array.from(agrupadas.entries());
  });

  async ngOnInit(): Promise<void> {
    await this.cargarFechasDisponibles();
  }

  async cargarFechasDisponibles(): Promise<void> {
    this.isLoading.set(true);
    const especialista = this.especialista();
    if (!especialista) {
      this.isLoading.set(false);
      return;
    }

    const hoy = new Date();
    const fechas: FechaDisponible[] = [];

    for (let i = 0; i < 15; i++) {
      const fecha = new Date(hoy);
      fecha.setDate(hoy.getDate() + i);

      const diaSemana = fecha.getDay();

      if (diaSemana === 0) continue;

      const fechaStr = this.formatearFecha(fecha);

      const tieneDisponibilidad = await this.verificarDisponibilidadDia(
        especialista.id,
        diaSemana as DiaSemana,
        fechaStr,
      );

      if (tieneDisponibilidad) {
        fechas.push({
          fecha: fechaStr,
          diaSemana,
          diaNombre: NOMBRES_DIAS_CORTOS[diaSemana],
          diaNumero: fecha.getDate(),
          mesNombre: NOMBRES_MESES[fecha.getMonth()],
          esHoy: i === 0,
        });
      }
    }

    this.fechasDisponibles.set(Object.freeze(fechas));
    this.isLoading.set(false);
  }

  seleccionar(fecha: FechaDisponible): void {
    this.wizard.seleccionarFecha(fecha.fecha);
  }

  private async verificarDisponibilidadDia(
    especialistaId: string,
    diaSemana: DiaSemana,
    fechaStr: string,
  ): Promise<boolean> {
    const { data } = await this.supabase.supabase
      .from('disponibilidad_especialista')
      .select('id')
      .eq('especialista_id', especialistaId)
      .eq('dia_semana', diaSemana)
      .limit(1);

    if (!data || data.length === 0) return false;

    const startOfDay = `${fechaStr}T00:00:00.000Z`;
    const endOfDay = `${fechaStr}T23:59:59.999Z`;

    const { data: turnosOcupados } = await this.supabase.supabase
      .from('turnos')
      .select('id')
      .eq('especialista_id', especialistaId)
      .gte('fecha_hora', startOfDay)
      .lte('fecha_hora', endOfDay)
      .not('estado', 'in', '(cancelado,rechazado)');

    if (turnosOcupados && turnosOcupados.length > 0) {
      const { data: todosBloques } = await this.supabase.supabase
        .from('disponibilidad_especialista')
        .select('hora_inicio, hora_fin')
        .eq('especialista_id', especialistaId)
        .eq('dia_semana', diaSemana);

      if (!todosBloques || todosBloques.length === 0) return false;

      const totalSlots = this.calcularTotalSlots(todosBloques);
      const slotsOcupados = turnosOcupados.length;

      return slotsOcupados < totalSlots;
    }

    return true;
  }

  private calcularTotalSlots(bloques: Array<Record<string, string>>): number {
    let total = 0;
    for (const bloque of bloques) {
      const inicio = bloque['hora_inicio'];
      const fin = bloque['hora_fin'];
      const minutosInicio = this.parsearMinutos(inicio);
      const minutosFin = this.parsearMinutos(fin);
      total += Math.floor((minutosFin - minutosInicio) / 30);
    }
    return total;
  }

  private parsearMinutos(hora: string): number {
    const [horas, minutos] = hora.split(':').map(Number);
    return horas * 60 + minutos;
  }

  private formatearFecha(fecha: Date): string {
    const anio = fecha.getFullYear();
    const mes = String(fecha.getMonth() + 1).padStart(2, '0');
    const dia = String(fecha.getDate()).padStart(2, '0');
    return `${anio}-${mes}-${dia}`;
  }
}
