import { Pipe, PipeTransform } from '@angular/core';

/**
 * Sustituye valores vacíos por un marcador legible.
 *
 * Centraliza los fallbacks de texto que antes se repetían como
 * literales en plantillas, garantizando un marcador único.
 */
@Pipe({
  name: 'emptyValue',
  standalone: true,
  pure: true,
})
export class EmptyValuePipe implements PipeTransform {
  transform(value: string | null | undefined, fallback = '—'): string {
    if (value === null || value === undefined) return fallback;
    return value.trim().length > 0 ? value : fallback;
  }
}
