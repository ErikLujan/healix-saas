import { Component, inject, signal } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AuthService } from '@core/services/auth.service';
import { toast } from 'ngx-sonner';

@Component({
  selector: 'app-password-change',
  standalone: true,
  imports: [ReactiveFormsModule],
  template: `
    <div class="bg-surface rounded-2xl border border-divider p-6 sm:p-8">
      <h3 class="text-lg font-semibold text-text-primary mb-1">Cambiar Contrasena</h3>
      <p class="text-sm text-text-secondary mb-6">
        Actualiza tu contrasena de acceso. Asegurate de elegir una contrasena segura.
      </p>

      <form [formGroup]="form" (ngSubmit)="onSubmit()" class="max-w-md space-y-4">
        <div>
          <label for="newPassword" class="block text-xs font-medium text-text-subtle mb-1.5">
            Nueva contrasena
          </label>
          <input
            id="newPassword"
            type="password"
            formControlName="newPassword"
            placeholder="Minimo 6 caracteres"
            autocomplete="new-password"
            class="w-full px-4 py-2.5 text-sm rounded-xl border border-divider bg-surface text-text-primary font-medium
                   placeholder:text-text-subtle/50
                   focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all"
          />
          @if (form.get('newPassword')?.touched && form.get('newPassword')?.invalid) {
            <p class="mt-1 text-xs text-red-600">La contrasena debe tener al menos 6 caracteres.</p>
          }
        </div>

        <div>
          <label for="confirmPassword" class="block text-xs font-medium text-text-subtle mb-1.5">
            Confirmar contrasena
          </label>
          <input
            id="confirmPassword"
            type="password"
            formControlName="confirmPassword"
            placeholder="Repeti tu contrasena"
            autocomplete="new-password"
            class="w-full px-4 py-2.5 text-sm rounded-xl border border-divider bg-surface text-text-primary font-medium
                   placeholder:text-text-subtle/50
                   focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all"
          />
          @if (form.get('confirmPassword')?.touched && form.hasError('passwordMismatch')) {
            <p class="mt-1 text-xs text-red-600">Las contrasenas no coinciden.</p>
          }
        </div>

        <div class="pt-2">
          <button
            type="submit"
            [disabled]="form.invalid || isLoading()"
            class="inline-flex items-center gap-2 rounded-xl bg-brand-700 px-5 py-2.5 text-sm font-semibold text-white
                   shadow-sm transition-all hover:bg-brand-700/90
                   focus:outline-none focus:ring-2 focus:ring-brand-700 focus:ring-offset-2
                   disabled:opacity-50 disabled:cursor-not-allowed"
          >
            @if (isLoading()) {
              <div class="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
              Actualizando...
            } @else {
              Actualizar contrasena
            }
          </button>
        </div>
      </form>
    </div>
  `,
})
export class PasswordChangeComponent {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);

  readonly isLoading = signal(false);

  readonly form: FormGroup = this.fb.group(
    {
      newPassword: ['', [Validators.required, Validators.minLength(6)]],
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
