import { Component, inject, OnInit, computed } from '@angular/core';
import { NgClass } from '@angular/common';
import { LucideDynamicIcon } from '@lucide/angular';
import { WizardTurnoService } from '../../services/wizard-turno.service';
import { AuthService } from '@core/services/auth.service';
import { StepPatientComponent } from '../../components/step-patient/step-patient.component';
import { StepSpecialtyComponent } from '../../components/step-specialty/step-specialty.component';
import { StepSpecialistComponent } from '../../components/step-specialist/step-specialist.component';
import { StepDateComponent } from '../../components/step-date/step-date.component';
import { StepTimeComponent } from '../../components/step-time/step-time.component';
import { StepConfirmComponent } from '../../components/step-confirm/step-confirm.component';

@Component({
  selector: 'app-request-page',
  standalone: true,
  imports: [
    NgClass,
    LucideDynamicIcon,
    StepPatientComponent,
    StepSpecialtyComponent,
    StepSpecialistComponent,
    StepDateComponent,
    StepTimeComponent,
    StepConfirmComponent,
  ],
  templateUrl: './request-page.component.html',
})
export class RequestPageComponent implements OnInit {
  private readonly wizard = inject(WizardTurnoService);
  private readonly authService = inject(AuthService);

  readonly pasoActual = this.wizard.pasoActual;
  readonly tituloPaso = this.wizard.tituloPasoActual;
  readonly puedeAvanzar = this.wizard.puedeAvanzar;
  readonly puedeRetroceder = this.wizard.puedeRetroceder;

  readonly isAdmin = computed(() => this.authService.userRole() === 'administrador');
  readonly tienePaciente = computed(() => this.wizard.pacienteSeleccionado() !== null);

  readonly pasos = computed(() => {
    if (this.isAdmin()) {
      return [
        { numero: 1, titulo: 'Paciente' },
        { numero: 2, titulo: 'Especialidad' },
        { numero: 3, titulo: 'Especialista' },
        { numero: 4, titulo: 'Fecha' },
        { numero: 5, titulo: 'Confirmar' },
      ];
    }
    return [
      { numero: 1, titulo: 'Especialidad' },
      { numero: 2, titulo: 'Especialista' },
      { numero: 3, titulo: 'Fecha' },
      { numero: 4, titulo: 'Horario' },
      { numero: 5, titulo: 'Confirmar' },
    ];
  });

  ngOnInit(): void {
    this.wizard.reiniciar();
  }

  retroceder(): void {
    this.wizard.retrocederPaso();
  }

  irAPaso(paso: number): void {
    this.wizard.irAPaso(paso);
  }
}
