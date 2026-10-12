import { Pipe, PipeTransform } from '@angular/core';
import { extraerFechaCorta, extraerHora, formatearFechaLegibleEsAR } from '@shared/utils/date-locale.utils';

type FormatoFecha = 'corta' | 'hora' | 'legible';

/**
 * Pipe puro para formatear marcas de tiempo ISO del dominio de turnos.
 *
 * Formatos soportados:
 * - `corta`  → "YYYY-MM-DD"
 * - `hora`   → "HH:mm"
 * - `legible` → "1 de enero de 2026"
 */
@Pipe({
  name: 'fechaFormat',
  standalone: true,
  pure: true,
})
export class FechaFormatPipe implements PipeTransform {
  transform(value: string | null | undefined, formato: FormatoFecha = 'legible'): string {
    if (!value) return '';

    switch (formato) {
      case 'corta':
        return extraerFechaCorta(value);
      case 'hora':
        return extraerHora(value);
      case 'legible': {
        return formatearFechaLegibleEsAR(value);
      }
      default:
        return extraerFechaCorta(value);
    }
  }
}
