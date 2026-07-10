import { Component, inject, signal } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '@core/services/auth.service';
import { toast } from 'ngx-sonner';
import { slideUp } from '@core/animations/route-animations';

/**
 * Pantalla de inicio de sesion con formulario reactivo,
 * selector de rol y acceso rapido para usuarios de prueba.
 * Redirige al dashboard despues de una autenticacion exitosa.
 */
@Component({
  selector: 'app-login',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss',
  animations: [slideUp],
})
export class LoginComponent {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  readonly form: FormGroup;
  readonly isSubmitting = signal(false);
  readonly showPassword = signal(false);
  readonly selectedRole = signal<'paciente' | 'especialista' | 'administrador'>('paciente');

  readonly roleTabs: Array<{ value: 'paciente' | 'especialista' | 'administrador'; label: string }> = [
    { value: 'paciente', label: 'Paciente' },
    { value: 'especialista', label: 'Especialista' },
    { value: 'administrador', label: 'Admin' },
  ];

  readonly quickAccessUsers = [
    {
      label: 'Administrador',
      email: 'admin@clinica.com',
      password: 'Admin123!',
    },
    {
      label: 'Paciente',
      email: 'bippogamer05@gmail.com',
      password: 'Pepe123!',
    },
    {
      label: 'Esp. Habilitado',
      email: 'santysanchez245@gmail.com',
      password: 'Especialista123!',
    },
    {
      label: 'Esp. No Habilitado',
      email: 'ricardotapia67@gmail.com',
      password: 'Especialista123!',
    },
  ];

  constructor() {
    this.form = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
    });
  }

  selectRole(role: 'paciente' | 'especialista' | 'administrador'): void {
    this.selectedRole.set(role);
  }

  togglePassword(): void {
    this.showPassword.update(v => !v);
  }

  /**
   * Valida el formulario y ejecuta la autenticacion contra Supabase.
   * Muestra toast de error si las credenciales son invalidas o
   * redirige al dashboard en caso de exito.
   */
  async onSubmit(): Promise<void> {
    if (this.isSubmitting()) return;

    if (this.form.invalid) {
      const missing: string[] = [];
      if (this.form.get('email')?.invalid) missing.push('El correo electrónico');
      if (this.form.get('password')?.invalid) missing.push('La contraseña');
      toast.error(`Faltan completar: ${missing.join(', ')}`);
      this.form.markAllAsTouched();
      return;
    }

    this.isSubmitting.set(true);

    const { email, password } = this.form.value;
    const { error } = await this.authService.signIn(email, password);

    if (!error) {
      toast.success('Inicio de sesión exitoso');
      this.router.navigate(['/panel-principal']);
    }

    this.isSubmitting.set(false);
  }

  /**
   * Rellena el formulario con las credenciales de un usuario de prueba
   * y ejecuta el envio automatico para facilitar el testing.
   *
   * @param user Objeto con email y password del usuario de acceso rapido.
   */
  quickLogin(user: typeof this.quickAccessUsers[number]): void {
    this.form.patchValue({ email: user.email, password: user.password });
    this.form.markAsDirty();
    this.onSubmit();
  }
}
