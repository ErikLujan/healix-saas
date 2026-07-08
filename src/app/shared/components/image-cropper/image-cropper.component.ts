import { Component, ElementRef, ViewChild, output, signal, input, effect } from '@angular/core';

@Component({
  selector: 'app-image-cropper',
  standalone: true,
  templateUrl: './image-cropper.component.html',
  styleUrl: './image-cropper.component.scss',
})
export class ImageCropperComponent {
  @ViewChild('canvas', { static: true }) canvasRef!: ElementRef<HTMLCanvasElement>;

  imageFile = input.required<File>();
  cropped = output<string>();
  cancelled = output<void>();

  scale = signal(1);
  offsetX = signal(0);
  offsetY = signal(0);

  private isDragging = false;
  private lastX = 0;
  private lastY = 0;
  private image: HTMLImageElement | null = null;

  constructor() {
    effect(() => {
      const file = this.imageFile();
      if (file) {
        this.loadImage(file);
      }
    });
  }

  private loadImage(file: File): void {
    const reader = new FileReader();
    reader.onload = () => {
      this.image = new Image();
      this.image.onload = () => this.drawImage();
      this.image.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  }

  private drawImage(): void {
    const canvas = this.canvasRef.nativeElement;
    const ctx = canvas.getContext('2d');
    if (!ctx || !this.image) return;

    const size = canvas.parentElement?.clientWidth ?? 400;
    canvas.width = size;
    canvas.height = size;

    ctx.clearRect(0, 0, size, size);
    ctx.save();

    const imgAspect = this.image.width / this.image.height;
    let drawW: number;
    let drawH: number;

    if (imgAspect > 1) {
      drawH = size * this.scale();
      drawW = drawH * imgAspect;
    } else {
      drawW = size * this.scale();
      drawH = drawW / imgAspect;
    }

    const x = (size - drawW) / 2 + this.offsetX();
    const y = (size - drawH) / 2 + this.offsetY();

    ctx.beginPath();
    ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
    ctx.clip();

    ctx.drawImage(this.image, x, y, drawW, drawH);
    ctx.restore();
  }

  startDrag(event: MouseEvent): void {
    this.isDragging = true;
    this.lastX = event.clientX;
    this.lastY = event.clientY;
  }

  onDrag(event: MouseEvent): void {
    if (!this.isDragging) return;
    this.offsetX.set(this.offsetX() + (event.clientX - this.lastX));
    this.offsetY.set(this.offsetY() + (event.clientY - this.lastY));
    this.lastX = event.clientX;
    this.lastY = event.clientY;
    this.drawImage();
  }

  endDrag(): void {
    this.isDragging = false;
  }

  startDragTouch(event: TouchEvent): void {
    this.isDragging = true;
    this.lastX = event.touches[0].clientX;
    this.lastY = event.touches[0].clientY;
  }

  onDragTouch(event: TouchEvent): void {
    if (!this.isDragging) return;
    event.preventDefault();
    this.offsetX.set(this.offsetX() + (event.touches[0].clientX - this.lastX));
    this.offsetY.set(this.offsetY() + (event.touches[0].clientY - this.lastY));
    this.lastX = event.touches[0].clientX;
    this.lastY = event.touches[0].clientY;
    this.drawImage();
  }

  onZoom(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.scale.set(parseFloat(input.value));
    this.drawImage();
  }

  onCrop(): void {
    const canvas = this.canvasRef.nativeElement;
    const dataUrl = canvas.toDataURL('image/png');
    this.cropped.emit(dataUrl);
  }

  onCancel(): void {
    this.cancelled.emit();
  }
}
