import { Pipe, PipeTransform } from '@angular/core';

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
  private static readonly MESES: readonly string[] = [
    'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
    'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
  ];

  transform(value: string | null | undefined, formato: FormatoFecha = 'legible'): string {
    if (!value) return '';

    switch (formato) {
      case 'corta':
        return value.substring(0, 10);
      case 'hora':
        return value.substring(11, 16);
      case 'legible': {
        const fechaStr = value.substring(0, 10);
        const [anio, mes, dia] = fechaStr.split('-').map(Number);
        const mesNombre = FechaFormatPipe.MESES[mes - 1] ?? String(mes);
        return `${dia} de ${mesNombre} de ${anio}`;
      }
      default:
        return value.substring(0, 10);
    }
  }
}
