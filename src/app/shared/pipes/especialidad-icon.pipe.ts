import { Pipe, PipeTransform } from '@angular/core';

/**
 * Pipe puro que asocia un nombre de especialidad medica con un identificador
 * de icono de Lucide Angular.
 *
 * Realiza una busqueda insensible a mayusculas/minusculas contra un catalogo
 * de especialidades conocidas. Si la especialidad no se encuentra en el
 * catalogo, se devuelve un icono por defecto que representa atencion medica
 * general.
 *
 * El pipe solo devuelve el nombre del icono como cadena; nunca accede a
 * servicios, base de datos ni realiza llamadas HTTP.
 *
 * @example
 * En una plantilla Angular, {{ 'Cardiología' | especialidadIcon }} produce "heart-pulse".
 *
 * @example
 * En una plantilla Angular, {{ 'Especialidad Desconocida' | especialidadIcon }} produce "stethoscope".
 */
@Pipe({
  name: 'especialidadIcon',
  standalone: true,
  pure: true,
})
export class EspecialidadIconPipe implements PipeTransform {
  /**
   * Catálogo normalizado sin tildes ni mayúsculas.
   * La normalización del input elimina duplicados con y sin acento.
   */
  private static readonly MAPA_ICONOS: Record<string, string> = {
    'cardiologia': 'heart-pulse',
    'dermatologia': 'scan-face',
    'pediatria': 'baby',
    'traumatologia': 'bone',
    'ginecologia': 'heart-handshake',
    'oftalmologia': 'eye',
    'odontologia': 'smile',
    'clinica': 'stethoscope',
    'clinica medica': 'stethoscope',
    'neurologia': 'brain',
    'urologia': 'droplets',
    'psiquiatria': 'brain',
    'otorrinolaringologia': 'ear',
    'endocrinologia': 'activity',
    'gastroenterologia': 'pill',
    'neumologia': 'wind',
    'reumatologia': 'hand',
    'nefrologia': 'droplet',
    'oncologia': 'ribbon',
    'cirugia general': 'scissors',
    'medicina general': 'stethoscope',
    'clinica general': 'stethoscope',
  };

  private static readonly ICONO_POR_DEFECTO = 'stethoscope';

  /**
   * Resuelve el identificador del icono Lucide para una especialidad dada.
   *
   * Normaliza tildes y mayúsculas para que las variantes con y sin
   * acento resuelvan el mismo icono sin duplicar el catálogo.
   *
   * @param value Nombre de la especialidad médica.
   * @returns Identificador del icono Lucide o el icono por defecto.
   */
  transform(value: string | null | undefined): string {
    if (!value) {
      return EspecialidadIconPipe.ICONO_POR_DEFECTO;
    }

    const clave = EspecialidadIconPipe.normalizar(value);

    return EspecialidadIconPipe.MAPA_ICONOS[clave] ?? EspecialidadIconPipe.ICONO_POR_DEFECTO;
  }

  /**
   * Normaliza un nombre a minúsculas sin tildes para la búsqueda.
   *
   * @param value Texto a normalizar.
   * @returns Clave normalizada sin diacríticos.
   */
  private static normalizar(value: string): string {
    return value.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  }
}
