import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { NgClass } from '@angular/common';
import { WizardTurnoService } from '../../services/wizard-turno.service';
import { AppointmentRequestService } from '../../services/appointment-request.service';
import { VENTANA_DIAS_SOLICITUD } from '../../services/scheduling.config';
import { fechaLocalHoy, nombreDiaCortoEsAR, nombreMesCortoEsAR } from '@shared/utils/date-locale.utils';

interface FechaDisponible {
  readonly fecha: string;
  readonly diaSemana: number;
  readonly diaNombre: string;
  readonly diaNumero: number;
  readonly mesNombre: string;
  readonly anio: number;
  readonly esHoy: boolean;
}

interface GrupoMensual {
  readonly clave: string;
  readonly etiqueta: string;
  readonly fechas: readonly FechaDisponible[];
}

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
  readonly errorCarga = signal<string | null>(null);
  readonly seleccionada = this.wizard.fechaSeleccionada;
  readonly especialista = this.wizard.especialistaSeleccionado;
  readonly ventanaDias = VENTANA_DIAS_SOLICITUD;

  readonly agrupadasPorMes = computed(() => {
    const fechas = this.fechasDisponibles();
    const agrupadas = new Map<string, GrupoMensual>();

    for (const fecha of fechas) {
      const clave = `${fecha.anio}-${fecha.mesNombre}`;
      const existente = agrupadas.get(clave);
      if (existente) {
        agrupadas.set(clave, { ...existente, fechas: [...existente.fechas, fecha] });
      } else {
        agrupadas.set(clave, {
          clave,
          etiqueta: `${fecha.mesNombre} ${fecha.anio}`,
          fechas: [fecha],
        });
      }
    }

    return Array.from(agrupadas.values());
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

    this.isLoading.set(true);
    this.errorCarga.set(null);

    try {
      const fechasRaw = await this.requestService.cargarFechasDisponibles(especialista.id);
      const hoyLocal = fechaLocalHoy();

      const fechas: FechaDisponible[] = fechasRaw.map((f) => {
        const [anio, mes, dia] = f.fecha.split('-').map(Number);

        return {
          fecha: f.fecha,
          diaSemana: f.diaSemana,
          diaNombre: nombreDiaCortoEsAR(f.diaSemana),
          diaNumero: dia,
          mesNombre: nombreMesCortoEsAR(mes),
          anio,
          esHoy: f.fecha === hoyLocal,
        };
      });

      this.fechasDisponibles.set(Object.freeze(fechas));
    } catch {
      this.errorCarga.set('No se pudieron cargar las fechas disponibles.');
    } finally {
      this.isLoading.set(false);
    }
  }

  async reintentar(): Promise<void> {
    await this.cargarFechasDisponibles();
  }

  seleccionar(fecha: FechaDisponible): void {
    this.wizard.seleccionarFecha(fecha.fecha);
  }
}
