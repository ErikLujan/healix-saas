import { Component, OnInit, computed, inject, signal } from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { NgClass } from '@angular/common';
import { AuthService } from '@core/services/auth.service';
import { toast } from 'ngx-sonner';

/**
 * Formulario tipado de actualización de contraseña con confirmación.
 */
interface RecoveryUpdateForm {
  newPassword: FormControl<string>;
  confirmPassword: FormControl<string>;
}

/**
 * Validador a nivel de grupo que exige coincidencia exacta
 * entre la contraseña nueva y su confirmación.
 *
 * @param group Grupo del formulario de actualización.
 * @returns Error de coincidencia o null cuando ambas claves coinciden.
 */
export function passwordsMatchValidator(group: AbstractControl): ValidationErrors | null {
  const values = group.value as { newPassword?: string; confirmPassword?: string };
  if (!values.confirmPassword) return null;
  return values.newPassword === values.confirmPassword ? null : { passwordsMismatch: true };
}

/**
 * Pantalla aislada de creación de nueva contraseña.
 *
 * Vive fuera de cualquier layout con encabezado para impedir fugas
 * visuales de sesión. Valida el enlace de recuperación, exige
 * coincidencia estricta y cierra la sesión tras actualizar.
 */
@Component({
  selector: 'app-recovery-update',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, NgClass],
  templateUrl: './recovery-update.component.html',
  styleUrl: './recovery-update.component.scss',
})
export class RecoveryUpdateComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  readonly form: FormGroup<RecoveryUpdateForm>;
  readonly isVerifying = signal(true);
  readonly sessionValid = signal(false);
  readonly isSubmitting = signal(false);
  readonly updateSuccess = signal(false);
  readonly updateError = signal<string | null>(null);
  readonly showNewPassword = signal(false);
  readonly showConfirmPassword = signal(false);

  readonly passwordsMismatch = computed(() => {
    const hasError = this.form.errors?.['passwordsMismatch'] === true;
    const confirmTouched = this.form.controls.confirmPassword.touched || this.form.controls.confirmPassword.dirty;
    return hasError && confirmTouched;
  });

  constructor() {
    this.form = this.fb.group<RecoveryUpdateForm>(
      {
        newPassword: this.fb.control('', {
          nonNullable: true,
          validators: [Validators.required, Validators.minLength(8)],
        }),
        confirmPassword: this.fb.control('', {
          nonNullable: true,
          validators: [Validators.required, Validators.minLength(8)],
        }),
      },
      { validators: [passwordsMatchValidator] },
    );
  }

  /**
   * Verifica la sesión de recuperación creada por el enlace del correo.
   * Una sesión ausente indica un enlace inválido, expirado o reutilizado.
   */
  async ngOnInit(): Promise<void> {
    try {
      const session = await this.authService.getRecoverySession();
      this.sessionValid.set(!!session);
    } catch {
      this.sessionValid.set(false);
    } finally {
      this.isVerifying.set(false);
    }
  }

  /**
   * Alterna la visibilidad de la contraseña nueva.
   */
  toggleNewPassword(): void {
    this.showNewPassword.update((visible) => !visible);
  }

  /**
   * Alterna la visibilidad de la confirmación de contraseña.
   */
  toggleConfirmPassword(): void {
    this.showConfirmPassword.update((visible) => !visible);
  }

  /**
   * Limpia el banner de error de actualización.
   */
  dismissError(): void {
    this.updateError.set(null);
  }

  /**
   * Valida coincidencia exacta, actualiza la contraseña y fuerza
   * un cierre de sesión limpio con redirección al inicio de sesión.
   */
  async onSubmit(): Promise<void> {
    if (this.isSubmitting() || !this.sessionValid()) return;

    this.updateError.set(null);

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.form.markAsDirty();
      if (this.form.errors?.['passwordsMismatch']) {
        toast.error('Las contraseñas no coinciden. Verifícalas e intenta nuevamente');
      } else {
        toast.error('Completa ambas contraseñas con al menos 8 caracteres');
      }
      return;
    }

    this.isSubmitting.set(true);

    const newPassword = this.form.controls.newPassword.value;
    const { error } = await this.authService.updatePassword(newPassword);

    if (error) {
      this.updateError.set('No pudimos actualizar tu contraseña. Solicita un nuevo enlace e intenta nuevamente.');
      this.isSubmitting.set(false);
      return;
    }

    this.updateSuccess.set(true);
    this.isSubmitting.set(false);
    toast.success('Contraseña actualizada. Inicia sesión con tu nueva clave');
    await this.authService.signOut();
    this.router.navigate(['/autenticacion']);
  }
}
