import { Component, input, output, signal } from '@angular/core';
import { toast } from 'ngx-sonner';

/**
 * Tipos MIME de imagen permitidos para la subida de avatares.
 * Solo formatos estándar de imagen; se rechaza SVG por riesgo de XSS.
 */
const TIPOS_MIME_PERMITIDOS: readonly string[] = ['image/jpeg', 'image/png', 'image/webp'];

/**
 * Tamaño máximo de archivo permitido para avatares (2 MB).
 * Limita el consumo de Storage y la superficie de abuso.
 */
const TAMANO_MAXIMO_BYTES = 2 * 1024 * 1024;

/**
 * Componente de subida de archivos con validación de seguridad previa.
 *
 * Valida el tipo MIME real y el tamaño del archivo antes de emitirlo
 * al formulario padre. Los archivos SVG, ejecutables o sobredimensionados
 * se rechazan con un aviso sin abandonar el formulario.
 */
@Component({
  selector: 'app-file-upload',
  standalone: true,
  templateUrl: './file-upload.component.html',
  styleUrl: './file-upload.component.scss',
})
export class FileUploadComponent {
  label = input<string>('');
  previewUrl = input<string | null>(null);
  fileSelected = output<File>();

  isDragOver = signal(false);

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver.set(true);
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver.set(false);
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver.set(false);

    const files = event.dataTransfer?.files;
    if (files && files.length > 0) {
      this.processFile(files[0]);
    }
  }

  onFileSelect(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.processFile(input.files[0]);
    }
  }

  /**
   * Valida el tipo y tamaño del archivo antes de emitirlo.
   * Solo acepta JPEG, PNG y WEBP de hasta 2 MB.
   * @param file Archivo seleccionado por el usuario.
   */
  private processFile(file: File): void {
    const extension = file.name.split('.').pop()?.toLowerCase() ?? '';
    const mimeValido = TIPOS_MIME_PERMITIDOS.includes(file.type);
    const extensionValida = extension === 'jpg' || extension === 'jpeg' || extension === 'png' || extension === 'webp';

    if (!mimeValido || !extensionValida) {
      toast.error('Formato de imagen no soportado. Use JPG, PNG o WEBP.');
      return;
    }
    if (file.size > TAMANO_MAXIMO_BYTES) {
      toast.error('El archivo excede el tamaño máximo permitido de 2MB.');
      return;
    }
    if (file.size === 0) {
      toast.error('El archivo seleccionado está vacío.');
      return;
    }
    this.fileSelected.emit(file);
  }
}
