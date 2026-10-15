import { Pipe, PipeTransform } from '@angular/core';
import { extraerFechaCorta, extraerHora, formatearFechaCortaLegibleEsAR, formatearFechaLegibleEsAR } from '@shared/utils/date-locale.utils';

type FormatoFecha = 'corta' | 'cortaLegible' | 'hora' | 'legible';

/**
 * Pipe puro para formatear marcas de tiempo ISO del dominio de turnos.
 *
 * Formatos soportados:
 * - `corta`        → "2026-10-12"
 * - `cortaLegible` → "12 oct 2026" (es-AR)
 * - `hora`         → "HH:mm"
 * - `legible`      → "12 de octubre de 2026"
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
      case 'cortaLegible':
        return formatearFechaCortaLegibleEsAR(value);
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
