import { Component, inject, signal } from '@angular/core';
import { WizardTurnoService } from '../../services/wizard-turno.service';
import { TurnosService } from '@core/services/turnos.service';
import { AuthService } from '@core/services/auth.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-step-confirm',
  standalone: true,
  templateUrl: './step-confirm.component.html',
})
export class StepConfirmComponent {
  private readonly wizard = inject(WizardTurnoService);
  private readonly turnosService = inject(TurnosService);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  readonly estado = this.wizard.estado;
  readonly isCreando = signal(false);

  readonly especialidad = this.wizard.especialidadSeleccionada;
  readonly especialista = this.wizard.especialistaSeleccionado;
  readonly fecha = this.wizard.fechaSeleccionada;
  readonly hora = this.wizard.horaSeleccionada;

  get fechaFormateada(): string {
    const fecha = this.fecha();
    if (!fecha) return '';
    const [anio, mes, dia] = fecha.split('-').map(Number);
    const fechaObj = new Date(anio, mes - 1, dia);
    return fechaObj.toLocaleDateString('es-AR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  }

  async confirmar(): Promise<void> {
    const especialista = this.especialista();
    const especialidad = this.especialidad();
    const fecha = this.fecha();
    const hora = this.hora();
    const perfil = this.authService.userProfile();

    if (!especialista || !especialidad || !fecha || !hora || !perfil) return;

    this.isCreando.set(true);

    try {
      const fechaHoraISO = `${fecha}T${hora}:00.000Z`;

      await this.turnosService.crearTurnoPendiente({
        paciente_id: perfil.id,
        especialista_id: especialista.id,
        especialidad_id: especialidad.id,
        fecha_hora: fechaHoraISO,
      });

      this.wizard.reiniciar();
      this.router.navigate(['/appointments']);
    } catch {
      this.isCreando.set(false);
    }
  }
}
