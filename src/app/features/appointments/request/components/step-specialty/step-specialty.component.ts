import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { NgClass } from '@angular/common';
import { EspecialidadInfo } from '@core/models/turno.model';
import { WizardTurnoService } from '../../services/wizard-turno.service';
import { AppointmentRequestService } from '../../services/appointment-request.service';
import { ResaltarCardDirective } from '@shared/directives/resaltar-card.directive';

const ITEMS_PER_PAGE = 6;

@Component({
  selector: 'app-step-specialty',
  standalone: true,
  imports: [NgClass, ResaltarCardDirective],
  templateUrl: './step-specialty.component.html',
})
export class StepSpecialtyComponent implements OnInit {
  private readonly requestService = inject(AppointmentRequestService);
  private readonly wizard = inject(WizardTurnoService);

  readonly especialidades = signal<readonly EspecialidadInfo[]>([]);
  readonly isLoading = signal(true);
  readonly seleccionada = this.wizard.especialidadSeleccionada;

  readonly paginaActual = signal(0);

  readonly totalPaginas = computed(() =>
    Math.max(1, Math.ceil(this.especialidades().length / ITEMS_PER_PAGE))
  );

  readonly especialidadesPaginadas = computed(() => {
    const inicio = this.paginaActual() * ITEMS_PER_PAGE;
    return this.especialidades().slice(inicio, inicio + ITEMS_PER_PAGE);
  });

  async ngOnInit(): Promise<void> {
    await this.cargarEspecialidades();
  }

  async cargarEspecialidades(): Promise<void> {
    this.especialidades.set(await this.requestService.cargarEspecialidades());
    this.isLoading.set(false);
  }

  seleccionar(especialidad: EspecialidadInfo): void {
    this.wizard.seleccionarEspecialidad(especialidad);
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
