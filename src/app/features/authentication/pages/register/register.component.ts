import { Component, inject, signal } from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '@core/services/auth.service';
import { SupabaseService } from '@core/services/supabase.service';
import { FileUploadComponent } from '@shared/components/file-upload/file-upload.component';
import { CaptchaComponent } from '@shared/components/captcha/captcha.component';
import { ImageCropperComponent } from '@shared/components/image-cropper/image-cropper.component';
import { toast } from 'ngx-sonner';
import { slideUp } from '@core/animations/route-animations';

/**
 * Pantalla de registro multi-perfil para pacientes y especialistas.
 *
 * Administra el formulario reactivo dinamico segun el perfil seleccionado,
 * el recorte de imagenes via cropper, la verificacion de captcha y la
 * subida de archivos a Supabase Storage. Los metadatos se envian al
 * signUp() del AuthService para que el trigger de PostgreSQL popule
 * las tablas de extension automaticamente.
 */
@Component({
  selector: 'app-register',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    RouterLink,
    FileUploadComponent,
    CaptchaComponent,
    ImageCropperComponent,
  ],
  templateUrl: './register.component.html',
  styleUrl: './register.component.scss',
  animations: [slideUp],
})
export class RegisterComponent {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly supabase = inject(SupabaseService);
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

  /**
   * Carga el catalogo de especialidades activas desde Supabase
   * para mostrar en el selector de especialidades del especialista.
   */
  private async loadSpecialties(): Promise<void> {
    const { data } = await this.supabase.supabase
      .from('specialties')
      .select('id, name')
      .eq('is_active', true)
      .order('name');

    if (data) {
      this.specialties.set(data as { id: string; name: string }[]);
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

  /**
   * Cambia el perfil seleccionado y reconfigura los validadores
   * del formulario dinamicamente (obra social solo para pacientes).
   *
   * @param profile Tipo de perfil seleccionado.
   */
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

  /**
   * Alterna la seleccion de una especialidad en la lista de IDs seleccionados.
   *
   * @param specialtyId Identificador de la especialidad a togglear.
   */
  toggleSpecialty(specialtyId: string): void {
    this.selectedSpecialtyIds.update(ids =>
      ids.includes(specialtyId)
        ? ids.filter(id => id !== specialtyId)
        : [...ids, specialtyId],
    );
  }

  /**
   * Valida todos los campos del formulario, ejecuta el signUp en Supabase
   * Auth, sube las imagenes a Storage y vincula las especialidades
   * (si aplica). Muestra retroalimentacion via toast para cada
   * escenario de exito o error.
   */
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
      const fullName = `${firstName} ${lastName}`;

      const metadata: Record<string, unknown> = {
        role: this.selectedProfile(),
        full_name: fullName,
        dni,
        edad: Number(edad),
      };

      if (this.selectedProfile() === 'paciente') {
        metadata['obra_social'] = obraSocial;
      }

      const { userId, error: signUpError } = await this.authService.signUp(email, password, metadata);

      if (signUpError || !userId) {
        console.error('[Register] signUp failed:', signUpError?.message ?? 'no userId returned');
        this.isSubmitting.set(false);
        return;
      }

      console.log('[Register] signUp success, userId:', userId);

      if (this.selectedProfile() === 'paciente') {
        const frontalUrl = await this.uploadImage(userId, 'frontal', this.frontalCroppedData()!);
        const secondaryUrl = await this.uploadImage(userId, 'secundario', this.secondaryCroppedData()!);

        console.log('[Register] images uploaded, patching paciente record');

        const { error: patchError } = await this.supabase.supabase
          .from('pacientes')
          .update({ avatar_url_frontal: frontalUrl, avatar_url_secundario: secondaryUrl })
          .eq('id', userId);

        if (patchError) {
          console.error('[Register] paciente patch error:', patchError.message);
        } else {
          console.log('[Register] paciente record updated with image URLs');
        }

        await this.supabase.supabase
          .from('profiles')
          .update({ avatar_url: frontalUrl })
          .eq('id', userId);
      } else {
        const avatarUrl = await this.uploadImage(userId, 'avatar', this.frontalCroppedData()!);

        await this.supabase.supabase
          .from('profiles')
          .update({ avatar_url: avatarUrl })
          .eq('id', userId);

        const specialtyPairs = this.selectedSpecialtyIds().map(specialtyId =>
          this.supabase.supabase.from('especialista_especialidad').insert({
            especialista_id: userId,
            especialidad_id: specialtyId,
          }),
        );

        await Promise.all(specialtyPairs);
        console.log('[Register] specialties linked:', this.selectedSpecialtyIds().length);
      }

      toast.success('Cuenta creada exitosamente');
      this.router.navigate(['/auth']);
    } catch (err) {
      console.error('[Register] unexpected error:', err);
      toast.error('Ocurrio un error inesperado. Intenta nuevamente');
    } finally {
      this.isSubmitting.set(false);
    }
  }

  /**
   * Convierte una data URL a blob y la sube a Supabase Storage
   * en la carpeta del usuario, retornando la URL publica.
   *
   * @param userId Identificador del usuario propietario de la imagen.
   * @param type Tipo de imagen (frontal, secundario, avatar).
   * @param dataUrl Cadena data URL de la imagen recortada.
   * @returns URL publica de la imagen subida.
   */
  private async uploadImage(userId: string, type: string, dataUrl: string): Promise<string> {
    const response = await fetch(dataUrl);
    const blob = await response.blob();
    const fileName = `${type}.png`;
    const filePath = `${userId}/${fileName}`;

    const { error: uploadError } = await this.supabase.supabase.storage
      .from('user-profiles')
      .upload(filePath, blob, { contentType: 'image/png', upsert: true });

    if (uploadError) {
      console.error(`[Register] image upload error (${type}):`, uploadError.message);
    }

    const { data: urlData } = this.supabase.supabase.storage
      .from('user-profiles')
      .getPublicUrl(filePath);

    return urlData.publicUrl;
  }
}
