import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { NgClass } from '@angular/common';
import { WizardTurnoService } from '../../services/wizard-turno.service';
import { AppointmentRequestService } from '../../services/appointment-request.service';
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
  private readonly requestService = inject(AppointmentRequestService);
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
    const especialista = this.especialista();
    if (!especialista) {
      this.isLoading.set(false);
      return;
    }

    const hoy = new Date();
    const fechasRaw = await this.requestService.cargarFechasDisponibles(especialista.id);

    const fechas: FechaDisponible[] = fechasRaw.map((f, i) => {
      const [anio, mes, dia] = f.fecha.split('-').map(Number);
      const fechaDate = new Date(anio, mes - 1, dia);

      return {
        fecha: f.fecha,
        diaSemana: f.diaSemana,
        diaNombre: NOMBRES_DIAS_CORTOS[f.diaSemana],
        diaNumero: dia,
        mesNombre: NOMBRES_MESES[fechaDate.getMonth()],
        esHoy: i === 0,
      };
    });

    this.fechasDisponibles.set(Object.freeze(fechas));
    this.isLoading.set(false);
  }

  seleccionar(fecha: FechaDisponible): void {
    this.wizard.seleccionarFecha(fecha.fecha);
  }
}
