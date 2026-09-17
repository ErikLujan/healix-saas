import { Component, model, input } from '@angular/core';

/**
 * Control clinico de tipo booleano para indicadores binarios.
 *
 * Renderiza un toggle switch con dos estados visibles: Si / No.
 * El componente emite un valor booleano que representa la
 * seleccion actual del especialista.
 *
 * Se utiliza en el formulario de alta medica para indicar si
 * el paciente refirio alergias conocidas durante la consulta.
 */
@Component({
  selector: 'app-clinical-boolean',
  standalone: true,
  template: `
    <div class="space-y-3">
      <label class="text-sm font-medium text-text-primary">
        {{ titulo() }}
      </label>

      <div class="flex items-center gap-3">
        <button
          type="button"
          (click)="toggle()"
          [class]="clasesBoton()"
          role="switch"
          [attr.aria-checked]="valor()">
          <span class="sr-only">{{ titulo() }}</span>
          <span
            class="pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition-transform duration-200 ease-in-out"
            [class.translate-x-5]="valor()"
            [class.translate-x-0]="!valor()">
          </span>
        </button>

        <span class="text-sm font-medium" [class.text-emerald-600]="valor()" [class.text-text-secondary]="!valor()">
          {{ valor() ? 'Si' : 'No' }}
        </span>
      </div>

      <p class="text-xs text-text-secondary">{{ descripcion() }}</p>
    </div>
  `,
})
export class ClinicalBooleanComponent {
  /** Titulo descriptivo del campo. */
  readonly titulo = input<string>('Indicador');

  /** Descripcion contextual debajo del toggle. */
  readonly descripcion = input<string>('');

  /** Valor booleano actual. Admite enlace bidireccional. */
  readonly valor = model<boolean>(false);

  /** Alterna el valor booleano. */
  toggle(): void {
    this.valor.set(!this.valor());
  }

  /** Clases CSS del boton toggle segun el estado. */
  clasesBoton(): string {
    const base = 'relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2';
    return this.valor()
      ? `${base} bg-primary`
      : `${base} bg-gray-200`;
  }
}
