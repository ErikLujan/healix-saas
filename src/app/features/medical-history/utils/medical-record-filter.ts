import { MedicalRecordConRelaciones, DynamicMedicalData } from '../models/medical-record.model';

/**
 * Convierte un valor arbitrario a representacion textual segura.
 *
 * Transforma numbers, booleans, strings, null y undefined a una cadena
 * lowercase normalizada. Objetos complejos se serializan via JSON
 * para garantizar que cualquier contenido sea inspeccionable por el
 * motor de busqueda.
 *
 * @param value Valor a convertir.
 * @returns Cadena en minusculas o cadena vacia si el valor es nulo/undefined.
 */
function toSearchableText(value: unknown): string {
  if (value === null || value === undefined) {
    return '';
  }

  if (typeof value === 'string') {
    return value.toLowerCase();
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value).toLowerCase();
  }

  return '';
}

/**
 * Expande recursivamente un array de datos dinamicos a un array plano
 * de cadenas de texto searchables.
 *
 * Recorre cada par clave-valor del array. Las claves se incluyen como
 * terminos de busqueda para permitir localizar registros por el nombre
 * del indicador clinico. Los valores se convierten a texto plano
 * soportando strings, numeros, booleanos y arrays anidados.
 *
 * La recursividad maneja estructuras JSON arbitraritas sin romper el
 * tipado del dominio, utilizando un barrido seguro de tipos.
 *
 * @param datos Array de pares clave-valor dinamicos.
 * @returns Array plano de cadenas normalizadas para comparacion.
 */
function expandirDatosDinamicos(datos: readonly DynamicMedicalData[]): string[] {
  const terminos: string[] = [];

  for (const par of datos) {
    terminos.push(toSearchableText(par.clave));
    terminos.push(toSearchableText(par.valor));

    if (typeof par.valor === 'object' && par.valor !== null) {
      const subtexto = JSON.stringify(par.valor).toLowerCase();
      terminos.push(subtexto);
    }
  }

  return terminos;
}

/**
 * Verifica si un registro de historia clinica coincide con un termino
 * de busqueda libre.
 *
 * Realiza un recorrido en una sola pasada sobre todos los campos clínicos fijos
 * del registro (paciente, especialista, especialidad, fecha, resena,
 * parametros fisiologicos, estado del turno) y sobre la totalidad del
 * array datos_dinamicos (claves y valores).
 *
 * La busqueda es case-insensitive y se realiza sobre cadenas normalizadas.
 * Un solo hit en cualquier campo es suficiente para incluir el registro
 * en el resultado final.
 *
 * @param record Historia clinica enriquecida con relaciones.
 * @param termino Termino de busqueda normalizado (lowercase, trimmed).
 * @returns true si el registro contiene el termino en algun campo.
 */
export function coincideConBusqueda(
  record: MedicalRecordConRelaciones,
  termino: string,
): boolean {
  if (!termino) {
    return true;
  }

  const campos: string[] = [
    toSearchableText(record.paciente?.full_name),
    toSearchableText(record.paciente?.email),
    toSearchableText(record.especialista?.full_name),
    toSearchableText(record.especialidad?.name),
    toSearchableText(record.turno?.fecha_hora),
    toSearchableText(record.turno?.resena_diagnostico),
    toSearchableText(record.turno?.estado),
    toSearchableText(record.presion_arterial),
    toSearchableText(record.altura),
    toSearchableText(record.peso),
    toSearchableText(record.temperatura),
    toSearchableText(record.created_at),
  ];

  for (const campo of campos) {
    if (campo.includes(termino)) {
      return true;
    }
  }

  if (record.datos_dinamicos && record.datos_dinamicos.length > 0) {
    const terminosDinamicos = expandirDatosDinamicos(record.datos_dinamicos);

    for (const terminoDinamico of terminosDinamicos) {
      if (terminoDinamico.includes(termino)) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Filtra una coleccion de historias clinicas segun un termino de busqueda
 * unificado.
 *
 * Función pura que no muta la colección original. Recorre cada registro
 * una única vez evaluando la coincidencia contra todos los
 * campos clinicos fijos y los datos dinamicos JSON.
 *
 * @param records Coleccion inmutable de historias clinicas con relaciones.
 * @param terminoBusqueda Texto de busqueda introducido por el usuario.
 * @returns Nueva coleccion con unicamente los registros que coinciden.
 */
export function filtrarHistoriasClinicas(
  records: readonly MedicalRecordConRelaciones[],
  terminoBusqueda: string,
): MedicalRecordConRelaciones[] {
  const terminoNormalizado = terminoBusqueda.trim().toLowerCase();

  if (!terminoNormalizado) {
    return [...records];
  }

  return records.filter((record) => coincideConBusqueda(record, terminoNormalizado));
}
