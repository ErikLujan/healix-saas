import { Component, model, computed } from '@angular/core';

/**
 * Control clinico de tipo rango para evaluacion de dolor visual (EVA).
 *
 * Renderiza un slider continuo con escala numerica del 0 al 10.
 * Incluye indicador de nivel de color que varia de verde (sin dolor)
 * a rojo (dolor extremo) segun la posicion del cursor.
 *
 * Se utiliza en el formulario de alta medica para capturar la
 * evaluacion subjetiva del dolor reportada por el paciente.
 */
@Component({
  selector: 'app-clinical-range',
  standalone: true,
  template: `
    <div class="space-y-3">
      <div class="flex items-center justify-between">
        <label class="text-sm font-medium text-text-primary">
          Evaluacion de dolor
        </label>
        <span class="flex items-center gap-1.5 text-sm font-semibold" [style.color]="colorEvaluacion()">
          {{ valor() }}/10
        </span>
      </div>

      <div class="relative">
        <input
          type="range"
          [min]="0"
          [max]="10"
          [step]="1"
          [value]="valor()"
          (input)="onInput($event)"
          class="w-full h-2 rounded-full appearance-none cursor-pointer accent-primary"
          [style.background]="trackGradient()" />

        <div class="flex justify-between mt-2 text-xs text-text-secondary">
          <span>Sin dolor</span>
          <span>Dolor moderado</span>
          <span>Dolor extremo</span>
        </div>
      </div>
    </div>
  `,
})
export class ClinicalRangeComponent {
  /** Valor actual del rango (0-10). Admite enlace bidireccional con ngModel. */
  readonly valor = model<number>(5);

  /** Indice semantico del nivel de dolor para seleccion de color. */
  readonly nivelColor = computed(() => {
    const v = this.valor();
    if (v <= 3) return 'bajo';
    if (v <= 6) return 'medio';
    return 'alto';
  });

  /** Color CSS asociado al nivel de dolor actual. */
  readonly colorEvaluacion = computed(() => {
    switch (this.nivelColor()) {
      case 'bajo': return '#10b981';
      case 'medio': return '#f59e0b';
      case 'alto': return '#ef4444';
    }
  });

  /** Gradiente CSS para el track del slider reflejando el nivel. */
  readonly trackGradient = computed(() => {
    const porcentaje = (this.valor() / 10) * 100;
    const color = this.colorEvaluacion();
    return `linear-gradient(to right, ${color} ${porcentaje}%, #e5e7eb ${porcentaje}%)`;
  });

  /** Handler del evento input del range. */
  onInput(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.valor.set(Number(target.value));
  }
}
