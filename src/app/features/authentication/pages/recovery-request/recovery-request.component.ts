import { Component, inject, signal } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { NgClass } from '@angular/common';
import { AuthService } from '@core/services/auth.service';
import { toast } from 'ngx-sonner';

/**
 * Formulario tipado de solicitud de recuperación de contraseña.
 */
interface RecoveryRequestForm {
  email: FormControl<string>;
}

/**
 * Pantalla aislada de solicitud de recuperación de contraseña.
 *
 * Vive fuera de cualquier layout con encabezado para impedir fugas
 * visuales de sesión. Envía el enlace de recuperación y responde con
 * un mensaje genérico que no revela si la cuenta existe.
 */
@Component({
  selector: 'app-recovery-request',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, NgClass],
  templateUrl: './recovery-request.component.html',
  styleUrl: './recovery-request.component.scss',
})
export class RecoveryRequestComponent {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);

  readonly form: FormGroup<RecoveryRequestForm>;
  readonly isSubmitting = signal(false);
  readonly emailSent = signal(false);
  readonly requestError = signal<string | null>(null);

  constructor() {
    this.form = this.fb.group<RecoveryRequestForm>({
      email: this.fb.control('', {
        nonNullable: true,
        validators: [Validators.required, Validators.email],
      }),
    });
  }

  /**
   * Envía la solicitud de recuperación y muestra un estado genérico
   * de éxito para prevenir la enumeración de cuentas existentes.
   */
  async onSubmit(): Promise<void> {
    if (this.isSubmitting()) return;

    this.requestError.set(null);

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.form.markAsDirty();
      toast.error('Ingresa un correo electrónico válido para continuar');
      return;
    }

    this.isSubmitting.set(true);

    const email = this.form.controls.email.value.trim().toLowerCase();
    const { error } = await this.authService.requestPasswordReset(email);

    if (error) {
      this.requestError.set('No pudimos procesar tu solicitud. Intenta nuevamente en unos minutos.');
      this.isSubmitting.set(false);
      return;
    }

    this.emailSent.set(true);
    this.isSubmitting.set(false);
    toast.success('Enlace de recuperación enviado');
  }

  /**
   * Limpia el banner de error de la solicitud.
   */
  dismissError(): void {
    this.requestError.set(null);
  }

  /**
   * Permite solicitar un nuevo enlace con otro correo electrónico.
   */
  requestAnother(): void {
    this.emailSent.set(false);
    this.form.reset();
  }
}
