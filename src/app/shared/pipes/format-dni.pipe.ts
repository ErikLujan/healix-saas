import { Pipe, PipeTransform } from '@angular/core';

/**
 * Pipe puro que formatea documentos de identidad (DNI) con separadores de miles.
 *
 * Transforma un valor numerico o cadena sin formato en una representacion
 * visual con puntos como separadores de miles, siguiendo el formato regional
 * argentino (ej: 32123456 → "32.123.456").
 *
 * La transformacion es exclusivamente visual; el valor original nunca se modifica.
 * Si el valor recibido no puede transformarse correctamente, se devuelve el
 * contenido original sin provocar errores en la interfaz.
 *
 * @example
 * // En una plantilla Angular:
 * // {{ 32123456 | formatDni }}
 * // Salida: "32.123.456"
 *
 * @example
 * // {{ '12345678' | formatDni }}
 * // Salida: "12.345.678"
 */
@Pipe({
  name: 'formatDni',
  standalone: true,
  pure: true,
})
export class FormatDniPipe implements PipeTransform {
  /**
   * Transforma un documento de identidad en su representacion formateada.
   *
   * @param value Documento a formatear (numero o cadena de texto).
   * @returns Cadena con separadores de miles o el valor original si no es valido.
   */
  transform(value: number | string): string {
    if (value === null || value === undefined) {
      return '';
    }

    const cadenaLimpia = String(value).replace(/[\.\-\s]/g, '');

    if (!/^\d+$/.test(cadenaLimpia)) {
      return String(value);
    }

    return cadenaLimpia.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  }
}
