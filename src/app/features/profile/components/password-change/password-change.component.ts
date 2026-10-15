import { Component, inject, signal } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AuthService } from '@core/services/auth.service';
import { LONGITUD_MINIMA_PASSWORD_PERFIL } from '@shared/utils/auth-policy.constants';
import { toast } from 'ngx-sonner';

@Component({
  selector: 'app-password-change',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './password-change.component.html',
  styleUrl: './password-change.component.scss',
})
export class PasswordChangeComponent {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);

  readonly isLoading = signal(false);

  /** Longitud mínima vigente documentada en las constantes de política. */
  readonly longitudMinima = LONGITUD_MINIMA_PASSWORD_PERFIL;

  readonly form: FormGroup = this.fb.group(
    {
      newPassword: ['', [Validators.required, Validators.minLength(LONGITUD_MINIMA_PASSWORD_PERFIL)]],
      confirmPassword: ['', [Validators.required]],
    },
    { validators: this.passwordMatchValidator },
  );

  private passwordMatchValidator(group: FormGroup): { passwordMismatch: boolean } | null {
    const newPwd = group.get('newPassword')?.value;
    const confirm = group.get('confirmPassword')?.value;
    return newPwd && confirm && newPwd !== confirm ? { passwordMismatch: true } : null;
  }

  async onSubmit(): Promise<void> {
    if (this.form.invalid) return;

    this.isLoading.set(true);

    try {
      const newPassword = this.form.get('newPassword')!.value;

      const { error } = await this.authService.updatePassword(newPassword);

      if (error) {
        toast.error('No se pudo actualizar la contrasena. Intenta nuevamente.');
        return;
      }

      toast.success('Contrasena actualizada correctamente.');
      this.form.reset();
    } catch {
      toast.error('Error inesperado al actualizar la contrasena.');
    } finally {
      this.isLoading.set(false);
    }
  }
}
