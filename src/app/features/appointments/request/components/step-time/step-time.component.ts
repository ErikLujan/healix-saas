import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { NgClass } from '@angular/common';
import { WizardTurnoService, BloqueDisponible } from '../../services/wizard-turno.service';
import { AppointmentRequestService } from '../../services/appointment-request.service';

@Component({
  selector: 'app-step-time',
  standalone: true,
  imports: [NgClass],
  templateUrl: './step-time.component.html',
})
export class StepTimeComponent implements OnInit {
  private readonly requestService = inject(AppointmentRequestService);
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
    const especialista = this.especialista();
    const fecha = this.fechaSeleccionada();

    if (!especialista || !fecha) {
      this.isLoading.set(false);
      return;
    }

    const bloquesRaw = await this.requestService.cargarBloquesHorarios(especialista.id, fecha);

    this.bloques.set(Object.freeze(bloquesRaw));
    this.isLoading.set(false);
  }

  seleccionar(hora: string): void {
    this.wizard.seleccionarHora(hora);
  }
}
