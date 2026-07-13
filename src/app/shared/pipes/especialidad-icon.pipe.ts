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
 * // En una plantilla Angular:
 * // {{ 'Cardiología' | especialidadIcon }}
 * // Salida: "heart-pulse"
 *
 * @example
 * // {{ 'Especialidad Desconocida' | especialidadIcon }}
 * // Salida: "stethoscope"
 */
@Pipe({
  name: 'especialidadIcon',
  standalone: true,
  pure: true,
})
export class EspecialidadIconPipe implements PipeTransform {
  private static readonly MAPA_ICONOS: Record<string, string> = {
    'cardiologia': 'heart-pulse',
    'cardiología': 'heart-pulse',
    'dermatologia': 'scan-face',
    'dermatología': 'scan-face',
    'pediatria': 'baby',
    'pediatría': 'baby',
    'traumatologia': 'bone',
    'traumatología': 'bone',
    'ginecologia': 'heart-handshake',
    'ginecología': 'heart-handshake',
    'oftalmologia': 'eye',
    'oftalmología': 'eye',
    'odontologia': 'smile',
    'odontología': 'smile',
    'clinica': 'stethoscope',
    'clínica': 'stethoscope',
    'clinica medica': 'stethoscope',
    'clínica médica': 'stethoscope',
    'neurologia': 'brain',
    'neurología': 'brain',
    'urologia': 'droplets',
    'urología': 'droplets',
    'psiquiatria': 'brain',
    'psiquiatría': 'brain',
    'otorrinolaringologia': 'ear',
    'otorrinolaringología': 'ear',
    'endocrinologia': 'activity',
    'endocrinología': 'activity',
    'gastroenterologia': 'pill',
    'gastroenterología': 'pill',
    'neumologia': 'wind',
    'neumología': 'wind',
    'reumatologia': 'hand',
    'reumatología': 'hand',
    'nefrologia': 'droplet',
    'nefrología': 'droplet',
    'oncologia': 'ribbon',
    'oncología': 'ribbon',
    'cirugia general': 'scissors',
    'cirugía general': 'scissors',
    'medicina general': 'stethoscope',
    'clinica general': 'stethoscope',
    'clínica general': 'stethoscope',
  };

  private static readonly ICONO_POR_DEFECTO = 'stethoscope';

  /**
   * Resuelve el identificador del icono Lucide para una especialidad dada.
   *
   * @param value Nombre de la especialidad medica.
   * @returns Identificador del icono Lucide o el icono por defecto.
   */
  transform(value: string | null | undefined): string {
    if (!value) {
      return EspecialidadIconPipe.ICONO_POR_DEFECTO;
    }

    const clave = value.trim().toLowerCase();

    return EspecialidadIconPipe.MAPA_ICONOS[clave] ?? EspecialidadIconPipe.ICONO_POR_DEFECTO;
  }
}
