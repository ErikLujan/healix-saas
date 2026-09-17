import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { NgClass } from '@angular/common';
import { WizardTurnoService, EspecialistaWizard } from '../../services/wizard-turno.service';
import { AppointmentRequestService } from '../../services/appointment-request.service';
import { FallbackAvatarDirective } from '@shared/directives/fallback-avatar.directive';

const ITEMS_PER_PAGE = 6;

@Component({
  selector: 'app-step-specialist',
  standalone: true,
  imports: [NgClass, FallbackAvatarDirective],
  templateUrl: './step-specialist.component.html',
})
export class StepSpecialistComponent implements OnInit {
  private readonly requestService = inject(AppointmentRequestService);
  private readonly wizard = inject(WizardTurnoService);

  readonly especialistas = signal<readonly EspecialistaWizard[]>([]);
  readonly isLoading = signal(true);
  readonly seleccionado = this.wizard.especialistaSeleccionado;

  readonly paginaActual = signal(0);

  readonly totalPaginas = computed(() =>
    Math.max(1, Math.ceil(this.especialistas().length / ITEMS_PER_PAGE))
  );

  readonly especialistasPaginados = computed(() => {
    const inicio = this.paginaActual() * ITEMS_PER_PAGE;
    return this.especialistas().slice(inicio, inicio + ITEMS_PER_PAGE);
  });

  async ngOnInit(): Promise<void> {
    await this.cargarEspecialistas();
  }

  async cargarEspecialistas(): Promise<void> {
    const especialidad = this.wizard.especialidadSeleccionada();
    if (!especialidad) {
      this.isLoading.set(false);
      return;
    }

    this.especialistas.set(
      await this.requestService.cargarEspecialistasAprobados(especialidad.id),
    );
    this.isLoading.set(false);
  }

  seleccionar(especialista: EspecialistaWizard): void {
    this.wizard.seleccionarEspecialista(especialista);
  }

  paginaSiguiente(): void {
    if (this.paginaActual() < this.totalPaginas() - 1) {
      this.paginaActual.update(p => p + 1);
    }
  }

  paginaAnterior(): void {
    if (this.paginaActual() > 0) {
      this.paginaActual.update(p => p - 1);
    }
  }
}
