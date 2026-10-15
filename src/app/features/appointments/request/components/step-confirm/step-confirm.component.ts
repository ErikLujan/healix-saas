import { Component, inject, signal } from '@angular/core';
import { LucideDynamicIcon } from '@lucide/angular';
import { WizardTurnoService } from '../../services/wizard-turno.service';
import { TurnosService } from '@core/services/turnos.service';
import { AuthService } from '@core/services/auth.service';
import { Router } from '@angular/router';
import { CaptchaDirective } from '@shared/directives/captcha.directive';
import { EmptyValuePipe } from '@shared/pipes/empty-value.pipe';
import { construirFechaHoraISO, formatearFechaLargaEsAR } from '@shared/utils/date-locale.utils';
import { toast } from 'ngx-sonner';

@Component({
  selector: 'app-step-confirm',
  standalone: true,
  imports: [LucideDynamicIcon, CaptchaDirective, EmptyValuePipe],
  templateUrl: './step-confirm.component.html',
})
export class StepConfirmComponent {
  private readonly wizard = inject(WizardTurnoService);
  private readonly turnosService = inject(TurnosService);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  readonly estado = this.wizard.estado;
  readonly isCreando = signal(false);
  readonly captchaSolved = signal(false);
  readonly errorCrear = signal<string | null>(null);

  readonly especialidad = this.wizard.especialidadSeleccionada;
  readonly especialista = this.wizard.especialistaSeleccionado;
  readonly fecha = this.wizard.fechaSeleccionada;
  readonly hora = this.wizard.horaSeleccionada;
  readonly paciente = this.wizard.pacienteSeleccionado;

  get fechaFormateada(): string {
    return formatearFechaLargaEsAR(this.fecha());
  }

  onCaptchaSolved(solved: boolean): void {
    this.captchaSolved.set(solved);
  }

  /**
   * Confirma la solicitud del turno pendiente y navega al listado.
   *
   * Crea el turno en estado pendiente y luego navega a `/turnos`.
   * El estado del wizard se reinicia recién cuando la navegación
   * concluye, de modo que la vista saliente conserva el paso de
   * confirmación durante la animación de salida y nunca parpadea
   * el paso inicial sobre el listado de turnos.
   */
  async confirmar(): Promise<void> {
    if (!this.captchaSolved()) {
      toast.error('Por favor, completa el desafio de seguridad CAPTCHA antes de continuar.');
      return;
    }

    const especialista = this.especialista();
    const especialidad = this.especialidad();
    const fecha = this.fecha();
    const hora = this.hora();
    const perfil = this.authService.userProfile();
    const paciente = this.paciente();

    if (!especialidad) {
      toast.warning('Falta la especialidad. Volvé al paso de especialidad para elegirla.');
      return;
    }

    if (!especialista) {
      toast.warning('Falta el especialista. Volvé al paso de especialista para elegirlo.');
      return;
    }

    if (!fecha) {
      toast.warning('Falta la fecha. Volvé al paso de fecha para elegirla.');
      return;
    }

    if (!hora) {
      toast.warning('Falta el horario. Volvé al paso de horario para elegirlo.');
      return;
    }

    if (!perfil) {
      toast.warning('No se pudo identificar tu sesión. Ingresá nuevamente.');
      return;
    }

    if (this.authService.userRole() === 'administrador' && !paciente) {
      toast.warning('Seleccioná un paciente antes de confirmar la solicitud.');
      return;
    }

    const pacienteId = paciente?.id ?? perfil.id;

    this.isCreando.set(true);
    this.errorCrear.set(null);

    try {
      const fechaHoraISO = construirFechaHoraISO(fecha, hora);

      await this.turnosService.crearTurnoPendiente({
        paciente_id: pacienteId,
        especialista_id: especialista.id,
        especialidad_id: especialidad.id,
        fecha_hora: fechaHoraISO,
      });

      try {
        await this.router.navigate(['/turnos']);
      } finally {
        this.wizard.reiniciar();
      }
    } catch {
      this.errorCrear.set('No se pudo registrar el turno. Podés reintentarlo.');
      this.isCreando.set(false);
    }
  }
}
