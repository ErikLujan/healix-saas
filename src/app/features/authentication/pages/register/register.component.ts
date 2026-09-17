import { Component, inject, signal, computed } from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { NgClass } from '@angular/common';
import { AuthService } from '@core/services/auth.service';
import { RegistrationService } from '@core/services/registration.service';
import { FileUploadComponent } from '@shared/components/file-upload/file-upload.component';
import { CaptchaDirective } from '@shared/directives/captcha.directive';
import { ImageCropperComponent } from '@shared/components/image-cropper/image-cropper.component';
import { toast } from 'ngx-sonner';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    RouterLink,
    FileUploadComponent,
    CaptchaDirective,
    ImageCropperComponent,
    NgClass,
  ],
  templateUrl: './register.component.html',
  styleUrl: './register.component.scss',
})
export class RegisterComponent {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly registrationService = inject(RegistrationService);
  private readonly router = inject(Router);

  readonly form: FormGroup;
  readonly isSubmitting = signal(false);
  readonly showPassword = signal(false);
  readonly selectedProfile = signal<'paciente' | 'especialista'>('paciente');
  readonly captchaSolved = signal(false);

  readonly frontalImageFile = signal<File | null>(null);
  readonly frontalImagePreview = signal<string | null>(null);
  readonly secondaryImageFile = signal<File | null>(null);
  readonly secondaryImagePreview = signal<string | null>(null);
  readonly frontalCroppedData = signal<string | null>(null);
  readonly secondaryCroppedData = signal<string | null>(null);
  readonly showFrontalCropper = signal(false);
  readonly showSecondaryCropper = signal(false);

  readonly specialties = signal<{ id: string; name: string }[]>([]);
  readonly selectedSpecialtyIds = signal<string[]>([]);
  readonly specialtySearch = signal('');

  readonly filteredSpecialties = computed(() => {
    const query = this.specialtySearch().toLowerCase().trim();
    const all = this.specialties();
    if (!query) return all;
    return all.filter(s => s.name.toLowerCase().includes(query));
  });

  readonly obraSocialOptions = [
    'OSDE',
    'Swiss Medical',
    'Galeno',
    'SanCor Salud',
    'Medicus',
    'Federada Salud',
    'IAF',
    'Otra',
  ];

  constructor() {
    this.form = this.fb.group({
      firstName: ['', [Validators.required, Validators.minLength(2)]],
      lastName: ['', [Validators.required, Validators.minLength(2)]],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(8)]],
      dni: ['', [Validators.required, Validators.pattern(/^\d{7,8}$/)]],
      edad: ['', [Validators.required, Validators.min(1), Validators.max(120)]],
      obraSocial: ['', [Validators.required]],
      acceptTerms: [false, Validators.requiredTrue],
    });

    this.loadSpecialties();
  }

  private async loadSpecialties(): Promise<void> {
    const data = await this.registrationService.getActiveSpecialties();
    if (data.length > 0) {
      this.specialties.set(data);
    }
  }

  get f(): Record<string, AbstractControl> {
    return this.form.controls;
  }

  get showPatientFields(): boolean {
    return this.selectedProfile() === 'paciente';
  }

  get showSpecialistFields(): boolean {
    return this.selectedProfile() === 'especialista';
  }

  isSpecialtySelected(specialtyId: string): boolean {
    return this.selectedSpecialtyIds().includes(specialtyId);
  }

  selectProfile(profile: 'paciente' | 'especialista'): void {
    this.selectedProfile.set(profile);
    if (profile === 'paciente') {
      this.form.get('dni')?.setValidators([Validators.required, Validators.pattern(/^\d{7,8}$/)]);
      this.form.get('edad')?.setValidators([Validators.required, Validators.min(1), Validators.max(120)]);
      this.form.get('obraSocial')?.setValidators([Validators.required]);
    } else {
      this.form.get('dni')?.setValidators([Validators.required, Validators.pattern(/^\d{7,8}$/)]);
      this.form.get('edad')?.setValidators([Validators.required, Validators.min(1), Validators.max(120)]);
      this.form.get('obraSocial')?.clearValidators();
    }
    this.form.get('dni')?.updateValueAndValidity();
    this.form.get('edad')?.updateValueAndValidity();
    this.form.get('obraSocial')?.updateValueAndValidity();
  }

  togglePassword(): void {
    this.showPassword.update(v => !v);
  }

  onCaptchaSolved(solved: boolean): void {
    this.captchaSolved.set(solved);
  }

  onFrontalFileSelected(file: File): void {
    this.frontalImageFile.set(file);
    this.showFrontalCropper.set(true);
  }

  onSecondaryFileSelected(file: File): void {
    this.secondaryImageFile.set(file);
    this.showSecondaryCropper.set(true);
  }

  onFrontalCropped(dataUrl: string): void {
    this.frontalCroppedData.set(dataUrl);
    this.frontalImagePreview.set(dataUrl);
    this.showFrontalCropper.set(false);
  }

  onSecondaryCropped(dataUrl: string): void {
    this.secondaryCroppedData.set(dataUrl);
    this.secondaryImagePreview.set(dataUrl);
    this.showSecondaryCropper.set(false);
  }

  onCropperCancelled(): void {
    this.showFrontalCropper.set(false);
    this.showSecondaryCropper.set(false);
  }

  toggleSpecialty(specialtyId: string): void {
    this.selectedSpecialtyIds.update(ids =>
      ids.includes(specialtyId)
        ? ids.filter(id => id !== specialtyId)
        : [...ids, specialtyId],
    );
  }

  onSpecialtySearchInput(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.specialtySearch.set(value);
  }

  async onSubmit(): Promise<void> {
    if (this.isSubmitting()) return;

    const missing: string[] = [];

    if (this.form.get('firstName')?.invalid) missing.push('El nombre');
    if (this.form.get('lastName')?.invalid) missing.push('El apellido');
    if (this.form.get('email')?.invalid) missing.push('El correo electronico');
    if (this.form.get('password')?.invalid) missing.push('La contrasena');

    if (this.showPatientFields) {
      if (this.form.get('dni')?.invalid) missing.push('El DNI');
      if (this.form.get('edad')?.invalid) missing.push('La edad');
      if (this.form.get('obraSocial')?.invalid) missing.push('La obra social');
      if (!this.frontalCroppedData()) missing.push('La foto frontal');
      if (!this.secondaryCroppedData()) missing.push('La foto secundaria');
    }

    if (this.showSpecialistFields) {
      if (this.form.get('dni')?.invalid) missing.push('El DNI');
      if (this.form.get('edad')?.invalid) missing.push('La edad');
      if (!this.frontalCroppedData()) missing.push('La foto de perfil');
      if (this.selectedSpecialtyIds().length === 0) missing.push('Al menos una especialidad');
    }

    if (!this.captchaSolved()) missing.push('La verificacion del captcha');
    if (this.form.get('acceptTerms')?.invalid) missing.push('Los terminos y la politica de privacidad');

    if (missing.length > 0) {
      toast.error(`Faltan completar: ${missing.join(', ')}`);
      this.form.markAllAsTouched();
      return;
    }

    this.isSubmitting.set(true);

    try {
      const { firstName, lastName, email, password, dni, edad, obraSocial } = this.form.value;
      const fullName = `${firstName} ${lastName}`.trim();

      const metadata: Record<string, unknown> = {
        role: this.selectedProfile(),
        full_name: fullName,
        dni: String(dni).trim(),
        edad: Number(edad),
      };

      if (this.selectedProfile() === 'paciente') {
        metadata['obra_social'] = obraSocial;
      }

      const { userId, error: signUpError } = await this.authService.signUp(email, password, metadata);

      if (signUpError || !userId) {
        this.isSubmitting.set(false);
        return;
      }

      if (this.selectedProfile() === 'paciente') {
        const result = await this.registrationService.registerPatient({
          userId,
          dni: String(dni).trim(),
          edad: Number(edad),
          obraSocial,
          frontalDataUrl: this.frontalCroppedData()!,
          secondaryDataUrl: this.secondaryCroppedData()!,
        });

        if (result.error) {
          toast.error(result.error);
          this.isSubmitting.set(false);
          return;
        }
      } else {
        const result = await this.registrationService.registerSpecialist({
          userId,
          dni: String(dni).trim(),
          edad: Number(edad),
          profileDataUrl: this.frontalCroppedData()!,
          specialtyIds: this.selectedSpecialtyIds(),
        });

        if (result.error) {
          if (result.error === '__EMAIL_CONFIRMATION__') {
            toast.success('Cuenta creada exitosamente. Verifica tu correo electronico para activar tu perfil medico y confirmar tus especialidades.');
            this.router.navigate(['/autenticacion']);
            return;
          }
          toast.error(result.error);
          this.isSubmitting.set(false);
          return;
        }
      }

      toast.success('Cuenta creada exitosamente');
      this.router.navigate(['/autenticacion']);
    } catch {
      toast.error('Ocurrio un error inesperado. Intenta nuevamente');
    } finally {
      this.isSubmitting.set(false);
    }
  }
}
