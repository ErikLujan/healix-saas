import { Component, inject, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { AdminUsersService } from '../../services/admin-users.service';
import { ImageCropperComponent } from '@shared/components/image-cropper/image-cropper.component';
import { FileUploadComponent } from '@shared/components/file-upload/file-upload.component';
import { modalBackdrop, modalContent } from '../../animations/admin-animations';
import { toast } from 'ngx-sonner';

/**
 * Modal para creacion de administradores desde el panel de usuarios.
 *
 * Incluye formulario reactivo con validacion, cropper de imagen
 * obligatoria y retroalimentacion semantica via ngx-sonner para
 * los tres escenarios de error: campos incompletos, falta de imagen
 * y errores de red o duplicacion.
 */
@Component({
  selector: 'app-admin-users-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, ImageCropperComponent, FileUploadComponent],
  templateUrl: './admin-users-modal.component.html',
  styleUrl: './admin-users-modal.component.scss',
  animations: [modalBackdrop, modalContent],
})
export class AdminUsersModalComponent {
  private readonly fb = inject(FormBuilder);
  private readonly adminUsersService = inject(AdminUsersService);

  readonly closed = output<void>();
  readonly created = output<void>();

  readonly isSubmitting = signal(false);
  readonly showPassword = signal(false);
  readonly imageFile = signal<File | null>(null);
  readonly croppedDataUrl = signal<string | null>(null);
  readonly showCropper = signal(false);

  readonly form: FormGroup = this.fb.group({
    firstName: ['', [Validators.required, Validators.minLength(2)]],
    lastName: ['', [Validators.required, Validators.minLength(2)]],
    dni: ['', [Validators.required, Validators.pattern(/^\d{7,8}$/)]],
    edad: ['', [Validators.required, Validators.min(1), Validators.max(120)]],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(8)]],
  });

  get f() {
    return this.form.controls;
  }

  onFileSelected(file: File): void {
    this.imageFile.set(file);
    this.showCropper.set(true);
  }

  onCropped(dataUrl: string): void {
    this.croppedDataUrl.set(dataUrl);
    this.showCropper.set(false);
  }

  onCropCancelled(): void {
    this.showCropper.set(false);
    this.imageFile.set(null);
  }

  removeImage(): void {
    this.croppedDataUrl.set(null);
    this.imageFile.set(null);
  }

  /**
   * Valida el formulario, la imagen recortada y ejecuta la creacion
   * del administrador a traves del servicio. Muestra toasts semanticos
   * para cada escenario de error y resetea el estado de carga en finally.
   */
  async onSubmit(): Promise<void> {
    if (this.form.invalid || this.isSubmitting()) {
      this.form.markAllAsTouched();
      toast.error('Campos incompletos', {
        description: 'Por favor, complete los datos obligatorios marcados en rojo.',
      });
      return;
    }

    if (!this.croppedDataUrl()) {
      toast.warning('Imagen de perfil obligatoria', {
        description: 'Debe cargar y ajustar una fotografia para poder dar de alta al administrador.',
      });
      return;
    }

    this.isSubmitting.set(true);

    try {
      const { firstName, lastName, dni, edad, email, password } = this.form.value;
      const fullName = `${firstName} ${lastName}`;
      await this.adminUsersService.createAdmin(email, password, fullName, dni, Number(edad), this.croppedDataUrl());
      this.created.emit();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Ocurrió un error inesperado.';
      toast.error('No se pudo crear el usuario', { description: message });
    } finally {
      this.isSubmitting.set(false);
    }
  }

  onClose(): void {
    this.closed.emit();
  }

  onBackdropClick(event: MouseEvent): void {
    if (event.target === event.currentTarget) {
      this.onClose();
    }
  }
}
