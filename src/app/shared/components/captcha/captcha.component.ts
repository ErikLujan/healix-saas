import { Component, output, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';

@Component({
  selector: 'app-captcha',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './captcha.component.html',
  styleUrl: './captcha.component.scss',
})
export class CaptchaComponent {
  solved = output<boolean>();

  a = signal(0);
  b = signal(0);
  control = new FormControl<string | number | null>(null);

  readonly verified = signal(false);
  readonly errorMessage = signal('');

  constructor() {
    this.refresh();
  }

  get correctAnswer(): number {
    return this.a() + this.b();
  }

  verify(): void {
    const userValue = this.control.value;

    if (userValue === null || userValue === undefined || userValue === '') {
      this.errorMessage.set('Ingresá un resultado');
      this.verified.set(false);
      this.solved.emit(false);
      return;
    }

    const numericValue = Number(userValue);

    if (numericValue === this.correctAnswer) {
      this.errorMessage.set('');
      this.verified.set(true);
      this.control.disable();
      this.solved.emit(true);
    } else {
      this.errorMessage.set('Resultado incorrecto, intentá de nuevo');
      this.verified.set(false);
      this.solved.emit(false);
    }
  }

  refresh(): void {
    this.a.set(Math.floor(Math.random() * 10) + 1);
    this.b.set(Math.floor(Math.random() * 10) + 1);
    this.control.reset();
    this.control.enable();
    this.verified.set(false);
    this.errorMessage.set('');
    this.solved.emit(false);
  }

  onInput(): void {
    this.control.markAsDirty();
    if (this.errorMessage()) {
      this.errorMessage.set('');
    }
  }
}
