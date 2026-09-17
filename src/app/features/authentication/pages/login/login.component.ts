import { Component, inject, signal } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '@core/services/auth.service';
import { NgClass } from '@angular/common';
import { toast } from 'ngx-sonner';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, NgClass],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss',
})
export class LoginComponent {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  readonly form: FormGroup;
  readonly isSubmitting = signal(false);
  readonly showPassword = signal(false);
  readonly loginError = signal<string | null>(null);

  constructor() {
    this.form = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
    });
  }

  togglePassword(): void {
    this.showPassword.update(v => !v);
  }

  dismissError(): void {
    this.loginError.set(null);
  }

  async onSubmit(): Promise<void> {
    if (this.isSubmitting()) return;

    this.loginError.set(null);

    if (this.form.invalid) {
      const missing: string[] = [];
      if (this.form.get('email')?.invalid) missing.push('El correo electronico');
      if (this.form.get('password')?.invalid) missing.push('La contrasena');
      toast.error(`Faltan completar: ${missing.join(', ')}`);
      this.form.markAllAsTouched();
      return;
    }

    this.isSubmitting.set(true);

    const { email, password } = this.form.value;
    const { error } = await this.authService.signIn(email, password);

    if (error) {
      this.loginError.set(this.mapLoginError(error.message));
      this.isSubmitting.set(false);
      return;
    }

    toast.success('Inicio de sesion exitoso');
    this.router.navigate(['/panel-principal']);
    this.isSubmitting.set(false);
  }

  private mapLoginError(message: string): string {
    const map: Record<string, string> = {
      'Invalid login credentials': 'Correo o contrasena incorrectos',
      'Email not confirmed': 'Por favor confirma tu correo electronico antes de iniciar sesion',
      'Too many requests': 'Demasiados intentos. Intenta nuevamente en unos minutos',
    };
    return map[message] || 'Ocurrio un error inesperado. Intenta nuevamente';
  }
}
