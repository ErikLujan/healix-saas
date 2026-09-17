import { Component, model, input, signal } from '@angular/core';

/**
 * Control clinico de tipo numerico estricto para frecuencia cardiaca.
 *
 * Solo acepta caracteres numericos (0-9). Rechaza cualquier entrada
 * de texto, signos de puntuacion o caracteres especiales. Incluye
 * validacion en tiempo real con indicador visual de estado.
 *
 * Se utiliza en el formulario de alta medica para capturar la
 * frecuencia cardiaca del paciente en latidos por minuto.
 */
@Component({
  selector: 'app-clinical-numeric',
  standalone: true,
  template: `
    <div class="space-y-3">
      <label class="text-sm font-medium text-text-primary">
        {{ titulo() }}
      </label>

      <div class="relative">
        <input
          type="text"
          [value]="valor()"
          (input)="onInput($event)"
          (keydown)="onKeydown($event)"
          (paste)="onPaste($event)"
          [placeholder]="placeholder()"
          maxlength="3"
          inputmode="numeric"
          class="w-full rounded-xl border bg-background px-4 py-3 text-sm text-text-primary placeholder:text-text-secondary/50 transition-all focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
          [class.border-red-500]="tieneError()"
          [class.border-border]="!tieneError()" />

        <div class="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
          <span class="text-xs text-text-secondary font-medium">{{ unidad() }}</span>
          @if (valor()) {
            <span class="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-100">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3">
                <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </span>
          }
        </div>
      </div>

      @if (tieneError()) {
        <p class="text-xs text-red-500">Solo se permiten valores numericos</p>
      }
    </div>
  `,
})
export class ClinicalNumericComponent {
  /** Titulo descriptivo del campo. */
  readonly titulo = input<string>('Campo numerico');

  /** Unidad de medida mostrada como sufijo. */
  readonly unidad = input<string>('lpm');

  /** Placeholder del input. */
  readonly placeholder = input<string>('0');

  /** Valor actual del campo (solo dígitos). Admite enlace bidireccional. */
  readonly valor = model<string>('');

  /** Indica si se detecto una entrada invalida. */
  readonly tieneError = signal(false);

  /** Filtra la entrada para permitir solo digitos. */
  onInput(event: Event): void {
    const target = event.target as HTMLInputElement;
    const filtrado = target.value.replace(/[^0-9]/g, '');
    target.value = filtrado;
    this.valor.set(filtrado);
    if (this.tieneError()) {
      this.tieneError.set(false);
    }
  }

  /** Bloquea teclas que no son numericas. */
  onKeydown(event: KeyboardEvent): void {
    const teclasPermitidas = [
      'Backspace', 'Delete', 'Tab', 'Escape', 'Enter',
      'ArrowLeft', 'ArrowRight', 'Home', 'End',
    ];

    if (teclasPermitidas.includes(event.key)) return;

    if ((event.ctrlKey || event.metaKey) && ['a', 'c', 'v', 'x'].includes(event.key)) return;

    if (!/^[0-9]$/.test(event.key)) {
      event.preventDefault();
      this.tieneError.set(true);
    }
  }

  /** Filtra el portapapeles para pegar solo digitos. */
  onPaste(event: ClipboardEvent): void {
    event.preventDefault();
    const texto = event.clipboardData?.getData('text') ?? '';
    const filtrado = texto.replace(/[^0-9]/g, '').slice(0, 3);
    const target = event.target as HTMLInputElement;
    target.value = filtrado;
    this.valor.set(filtrado);
  }
}
