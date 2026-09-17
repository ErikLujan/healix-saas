import { Injectable } from '@angular/core';
import { jsPDF } from 'jspdf';
import { toast } from 'ngx-sonner';
import {
  MedicalRecordConRelaciones,
  DynamicMedicalData,
} from '../models/medical-record.model';

/** Nombre de la clínica utilizado en el membrete del PDF. */
const CLINIC_NAME = 'Healix';

/** Título del documento exportado. */
const REPORT_TITLE = 'HISTORIAL CLÍNICO PERMANENTE';

/** Margen horizontal del documento en milímetros. */
const MARGIN_X = 14;

/** Ancho útil del documento en milímetros (A4 = 210 - 2 * 14). */
const CONTENT_WIDTH = 182;

/** Color corporativo Deep Teal Healix. */
const BRAND_TEAL: readonly [number, number, number] = [15, 76, 74];

/** Color de fondo para tarjetas de resumen. */
const CARD_BG: readonly [number, number, number] = [248, 250, 252];

/** Color de borde para tarjetas de resumen. */
const CARD_BORDER: readonly [number, number, number] = [226, 232, 240];

/** Color de texto secundario. */
const TEXT_SECONDARY: readonly [number, number, number] = [107, 114, 128];

/** Mapa de prefijos técnicos conocidos y sus reemplazos limpios. */
const PREFIX_MAP: Record<string, string> = {
  '_s5_': '',
  '_s3_': '',
  '_s4_': '',
  '_s2_': '',
  '_s1_': '',
};

/** Mapa de palabras compuestas que requieren tilde o formato especial. */
const SPANISH_WORDS: Record<string, string> = {
  evaluacion: 'Evaluación',
  dolor: 'Dolor',
  frecuencia: 'Frecuencia',
  cardiaca: 'Cardíaca',
  cardiaco: 'Cardíaco',
  alergias: 'Alergias',
  referidas: 'Referidas',
  presion: 'Presión',
  arterial: 'Arterial',
  temperatura: 'Temperatura',
  peso: 'Peso',
  altura: 'Altura',
  imc: 'IMC',
  saturacion: 'Saturación',
  oxigeno: 'Oxígeno',
  glucometria: 'Glucometría',
  glucosa: 'Glucosa',
  cholesterol: 'Colesterol',
  colesterol: 'Colesterol',
  trigliceridos: 'Triglicéridos',
  hemoglobina: 'Hemoglobina',
  hematocrito: 'Hematocrito',
  creatinina: 'Creatinina',
  diagnostico: 'Diagnóstico',
  tratamiento: 'Tratamiento',
  observaciones: 'Observaciones',
  motivos: 'Motivos',
  consulta: 'Consulta',
  antecedentes: 'Antecedentes',
  familiares: 'Familiares',
  personales: 'Personales',
  patologicos: 'Patológicos',
  quirurgicos: 'Quirúrgicos',
  toxicos: 'Tóxicos',
  habitos: 'Hábitos',
  vacunacion: 'Vacunación',
  vacunas: 'Vacunas',
  desarrollo: 'Desarrollo',
  plan: 'Plan',
  indicaciones: 'Indicaciones',
  estudios: 'Estudios',
  complementarios: 'Complementarios',
  derivaciones: 'Derivaciones',
  interconsultas: 'Interconsultas',
  evolucion: 'Evolución',
  estado: 'Estado',
  mental: 'Mental',
  general: 'General',
  localizacion: 'Localización',
  intensidad: 'Intensidad',
  caracter: 'Carácter',
  duracion: 'Duración',
  frecuente: 'Frecuente',
  infrecuente: 'Infrecuente',
  bilateral: 'Bilateral',
  unilateral: 'Unilateral',
  anterior: 'Anterior',
  posterior: 'Posterior',
  superior: 'Superior',
  inferior: 'Inferior',
  izquierdo: 'Izquierdo',
  derecho: 'Derecho',
  ambos: 'Ambos',
  ninguno: 'Ninguno',
  activo: 'Activo',
  pasivo: 'Pasivo',
  sedentario: 'Sedentario',
  deportista: 'Deportista',
  fumador: 'Fumador',
  no_fumador: 'No fumador',
  alcoholicos: 'Alcohólicos',
  drogas: 'Drogas',
};

/**
 * Convierte una clave técnica de JSONB en una etiqueta legible en español.
 *
 * Elimina prefijos técnicos (_s5_, _s3_, etc.), reemplaza guiones bajos
 * por espacios y capitaliza cada palabra aplicando acentos correctos.
 *
 * @param key Clave técnica del campo dinámico.
 * @returns Etiqueta limpia y capitalizada para presentación.
 *
 * @example
 * formatDynamicKeyLabel('_s5_evaluacion_dolor') devuelve 'Evaluación de Dolor'.
 * formatDynamicKeyLabel('_s5_frecuencia_cardiaca') devuelve 'Frecuencia Cardíaca'.
 */
export function formatDynamicKeyLabel(key: string): string {
  let cleaned = key;

  for (const [prefix, replacement] of Object.entries(PREFIX_MAP)) {
    if (cleaned.toLowerCase().startsWith(prefix)) {
      cleaned = cleaned.substring(prefix.length);
      break;
    }
  }

  cleaned = cleaned
    .replace(/^_+/, '')
    .replace(/[_-]+/g, ' ')
    .trim();

  const words = cleaned.split(/\s+/);
  const capitalized = words.map(word => {
    const lower = word.toLowerCase();
    if (SPANISH_WORDS[lower]) {
      return SPANISH_WORDS[lower];
    }
    return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
  });

  return capitalized.join(' ');
}

/**
 * Convierte un valor crudo de JSONB en una representación legible.
 *
 * Convierte booleanos a "Sí"/"No", agrega unidades de medida según
 * la clave del campo, y aplica formato de presentación para números.
 *
 * @param value Valor crudo del campo dinámico.
 * @param key Clave del campo (opcional, determina las unidades a mostrar).
 * @returns Cadena formateada para presentación en PDF.
 *
 * @example
 * formatDynamicValue(true, 'fumador') devuelve 'Sí'.
 * formatDynamicValue(72, 'frecuencia_cardiaca') devuelve '72 bpm'.
 * formatDynamicValue(36.5, 'temperatura') devuelve '36.5 °C'.
 */
export function formatDynamicValue(value: unknown, key?: string): string {
  if (value === null || value === undefined) return '-';
  if (typeof value === 'boolean') return value ? 'Sí' : 'No';

  const keyLower = (key ?? '').toLowerCase();

  if (typeof value === 'number') {
    if (keyLower.includes('frecuencia_cardiaca') || keyLower.includes('pulso')) {
      return `${value} bpm`;
    }
    if (keyLower.includes('temperatura')) {
      return `${value} °C`;
    }
    if (keyLower.includes('saturacion') || keyLower.includes('oxigeno')) {
      return `${value} %`;
    }
    if (keyLower.includes('peso')) {
      return `${value} kg`;
    }
    if (keyLower.includes('altura')) {
      return `${value} cm`;
    }
    if (keyLower.includes('presion')) {
      return `${value} mmHg`;
    }
    if (keyLower.includes('glucosa') || keyLower.includes('glucometria')) {
      return `${value} mg/dL`;
    }
    if (keyLower.includes('imc')) {
      return value.toFixed(1);
    }
    return String(value);
  }

  if (typeof value === 'string') {
    const numVal = Number(value);
    if (!isNaN(numVal) && keyLower) {
      return formatDynamicValue(numVal, key);
    }
    return value;
  }

  return String(value);
}

/**
 * Servicio de exportación de historias clínicas a formato PDF.
 *
 * Genera documentos institucionales con membrete Healix Deep Teal,
 * título, fecha de emisión y el listado cronológico de consultas
 * médicas del paciente. Utiliza la librería jsPDF para la
 * construcción del documento completamente en el cliente.
 *
 * El servicio está desacoplado de cualquier componente visual.
 * Únicamente recibe datos y produce un archivo descargable.
 */
@Injectable({
  providedIn: 'root',
})
export class PdfExportService {
  /**
   * Genera y descarga un PDF con el historial clínico del paciente.
   *
   * El documento incluye obligatoriamente:
   * - Logo/nombre de la clínica (membrete corporativo)
   * - Título del informe
   * - Fecha de emisión automatizada con hora
   * - Tarjeta de resumen del paciente
   * - Listado cronológico de consultas con tarjetas estilizadas
   *
   * @param records Array de historias clínicas ordenadas cronológicamente.
   * @param pacienteNombre Nombre completo del paciente para el encabezado.
   * @param dni Número de DNI del paciente.
   * @param email Correo electrónico del paciente.
   * @param edad Edad del paciente.
   */
  async exportarHistorialPaciente(
    records: readonly MedicalRecordConRelaciones[],
    pacienteNombre: string,
    dni?: string,
    email?: string,
    edad?: number,
  ): Promise<void> {
    if (records.length === 0) {
      toast.warning('No hay registros para exportar.');
      return;
    }

    try {
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

      const logoBase64 = await this.cargarLogo();
      let yOffset = this.dibujarMembrete(doc, logoBase64);
      yOffset = this.dibujarTarjetaPaciente(doc, pacienteNombre, dni, email, edad, records.length, yOffset);
      yOffset = this.dibujarListadoConsultas(doc, records, yOffset);

      this.descargarArchivo(doc, `historial-clinico-${this.sanearNombre(pacienteNombre)}.pdf`);
      toast.success('PDF exportado correctamente.');
    } catch {
      toast.error('Error al generar el documento PDF.');
    }
  }

  /**
   * Carga la imagen del logo institucional y la convierte a base64.
   *
   * Utiliza fetch para obtener la imagen y Canvas para la conversión
   * a formato PNG base64 compatible con jsPDF.addImage().
   *
   * @returns Promise con el string base64 del logo o string vacío si falla.
   */
  private async cargarLogo(): Promise<string> {
    try {
      const response = await fetch('assets/images/icono.png');
      if (!response.ok) return '';

      const blob = await response.blob();
      return await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = () => resolve('');
        reader.readAsDataURL(blob);
      });
    } catch {
      return '';
    }
  }

  /**
   * Dibuja el membrete institucional con logo, título y divisor corporativo.
   *
   * Ubica el logo en la esquina superior izquierda (x:14, y:12) y el
   * título a la derecha para evitar solapamientos visuales.
   *
   * @param doc Instancia del documento jsPDF.
   * @param logoBase64 Logo en formato base64 (puede ser vacío).
   * @returns La posición Y después de dibujar el membrete.
   */
  private dibujarMembrete(doc: jsPDF, logoBase64: string): number {
    let yLogo = 12;

    if (logoBase64) {
      doc.addImage(logoBase64, 'PNG', MARGIN_X, yLogo, 22, 22);
    }

    const xTitulo = logoBase64 ? MARGIN_X + 28 : MARGIN_X;
    yLogo = 20;

    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...BRAND_TEAL);
    doc.text(CLINIC_NAME, xTitulo, yLogo);
    yLogo += 8;

    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0);
    doc.text(REPORT_TITLE, xTitulo, yLogo);
    yLogo += 5;

    const now = new Date();
    const fechaCompleta = now.toLocaleDateString('es-AR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    const horaCompleta = now.toLocaleTimeString('es-AR', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });

    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...TEXT_SECONDARY);
    doc.text(`Emitido el: ${fechaCompleta} a las ${horaCompleta} hs`, xTitulo, yLogo);
    yLogo += 6;

    doc.setDrawColor(...BRAND_TEAL);
    doc.setLineWidth(0.6);
    doc.line(MARGIN_X, yLogo, MARGIN_X + CONTENT_WIDTH, yLogo);
    yLogo += 6;

    doc.setTextColor(0);
    return yLogo;
  }

  /**
   * Dibuja una tarjeta de resumen del paciente con fondo estilizado.
   *
   * Renderiza nombre, DNI, email, edad y total de consultas dentro
   * de un contenedor con fondo claro y borde sutil.
   *
   * @param doc Instancia del documento jsPDF.
   * @param nombre Nombre completo del paciente.
   * @param dni Número de DNI del paciente.
   * @param email Correo electrónico del paciente.
   * @param edad Edad del paciente.
   * @param totalConsultas Cantidad total de consultas.
   * @param y Posición Y actual en el documento.
   * @returns La posición Y después de dibujar la tarjeta.
   */
  private dibujarTarjetaPaciente(
    doc: jsPDF,
    nombre: string,
    dni: string | undefined,
    email: string | undefined,
    edad: number | undefined,
    totalConsultas: number,
    y: number,
  ): number {
    const altoTarjeta = 22;

    doc.setFillColor(...CARD_BG);
    doc.setDrawColor(...CARD_BORDER);
    doc.setLineWidth(0.3);
    doc.roundedRect(MARGIN_X, y, CONTENT_WIDTH, altoTarjeta, 2, 2, 'FD');

    doc.setFillColor(...BRAND_TEAL);
    doc.roundedRect(MARGIN_X, y, 3, altoTarjeta, 1, 1, 'F');

    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0);
    doc.text('Datos del Titular', MARGIN_X + 8, y + 5);

    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(55, 65, 81);

    const campos: string[] = [`Nombre: ${nombre}`];
    if (dni) campos.push(`DNI: ${dni}`);
    if (email) campos.push(`Email: ${email}`);
    if (edad !== undefined) campos.push(`Edad: ${edad} años`);
    campos.push(`Consultas: ${totalConsultas}`);

    const lineaCompleta = campos.join('  |  ');
    const lineas = doc.splitTextToSize(lineaCompleta, CONTENT_WIDTH - 12);
    let textoY = y + 10;
    for (const linea of lineas) {
      doc.text(linea, MARGIN_X + 8, textoY);
      textoY += 4;
    }

    doc.setTextColor(0);
    return y + altoTarjeta + 5;
  }

  /**
   * Renderiza el listado cronológico de todas las consultas médicas.
   *
   * Verifica la disponibilidad de espacio antes de cada consulta
   * para evitar que el contenido se corte entre páginas.
   *
   * @param doc Instancia del documento jsPDF.
   * @param records Historias clínicas a renderizar.
   * @param y Posición Y inicial.
   * @returns La posición Y final del documento.
   */
  private dibujarListadoConsultas(
    doc: jsPDF,
    records: readonly MedicalRecordConRelaciones[],
    y: number,
  ): number {
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0);
    doc.text('Consultas Médicas', MARGIN_X, y);
    y += 8;

    for (let i = 0; i < records.length; i++) {
      const record = records[i];

      if (y > 220) {
        doc.addPage();
        y = 20;
      }

      y = this.dibujarConsulta(doc, record, i + 1, y);
      y += 5;
    }

    return y;
  }

  /**
   * Renderiza una única consulta médica como tarjeta con acento vertical.
   *
   * Calcula primero la altura total del contenido (encabezado, especialidad,
   * reseña, parámetros fisiológicos y datos dinámicos) para dibujar el
   * fondo de la tarjeta con las dimensiones correctas.
   *
   * @param doc Instancia del documento jsPDF.
   * @param record Historia clínica a renderizar.
   * @param numero Número secuencial de la consulta.
   * @param y Posición Y inicial.
   * @returns La posición Y después de dibujar la consulta.
   */
  private dibujarConsulta(
    doc: jsPDF,
    record: MedicalRecordConRelaciones,
    numero: number,
    y: number,
  ): number {
    const altoInicio = y;
    const xContenido = MARGIN_X + 6;
    const anchoContenido = CONTENT_WIDTH - 10;
    let altoEstimado = 11;

    const especialidad = record.especialidad?.name ?? 'No especificada';
    altoEstimado += 4;

    if (record.turno?.resena_diagnostico) {
      const lineasResena = doc.splitTextToSize(`Reseña: ${record.turno.resena_diagnostico}`, anchoContenido);
      altoEstimado += lineasResena.length * 3.5 + 2;
    }

    altoEstimado += 12;

    if (record.datos_dinamicos && record.datos_dinamicos.length > 0) {
      altoEstimado += 4 + record.datos_dinamicos.length * 3.5;
    }

    if (y + altoEstimado > 270) {
      doc.addPage();
      y = 20;
    }

    doc.setFillColor(...BRAND_TEAL);
    doc.roundedRect(MARGIN_X, y - 3, 2.5, altoEstimado, 1, 1, 'F');

    doc.setFillColor(...CARD_BG);
    doc.roundedRect(MARGIN_X + 4, y - 3, CONTENT_WIDTH - 4, altoEstimado, 1, 1, 'F');

    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0);
    const fechaConsulta = this.formatearFecha(record.created_at);
    const especialista = record.especialista?.full_name ?? 'No especificado';
    doc.text(`Consulta #${numero}  —  ${fechaConsulta}  —  Dr. ${especialista}`, xContenido, y + 0.5);
    y += 7;

    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text(`Especialidad: ${especialidad}`, xContenido, y);
    y += 4;

    if (record.turno?.resena_diagnostico) {
      y = this.dibujarCampoMultilinea(doc, `Reseña: ${record.turno.resena_diagnostico}`, xContenido, y, anchoContenido);
      y += 2;
    }

    y = this.dibujarParametrosFisiologicos(doc, record, xContenido, y);

    if (record.datos_dinamicos && record.datos_dinamicos.length > 0) {
      y = this.dibujarDatosDinamicos(doc, record.datos_dinamicos, xContenido, y);
    }

    doc.setDrawColor(...CARD_BORDER);
    doc.setLineWidth(0.2);
    doc.line(MARGIN_X + 4, y, MARGIN_X + CONTENT_WIDTH, y);
    y += 3;

    return y;
  }

  /**
   * Dibuja los parámetros fisiológicos registrados en la consulta
   * utilizando una cuadrícula de 2 columnas y 2 filas.
   *
   * @param doc Instancia del documento jsPDF.
   * @param record Historia clínica con los parámetros.
   * @param x Posición X inicial.
   * @param y Posición Y inicial.
   * @returns La posición Y después de dibujar los parámetros.
   */
  private dibujarParametrosFisiologicos(
    doc: jsPDF,
    record: MedicalRecordConRelaciones,
    x: number,
    y: number,
  ): number {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(0);
    doc.text('Parámetros Fisiológicos:', x, y);
    y += 4;

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(55, 65, 81);

    const colIzq = x;
    const colDer = x + (CONTENT_WIDTH - 10) / 2 + 4;

    const fila1: Array<{ label: string; value: string }> = [
      { label: 'Altura', value: `${record.altura} cm` },
      { label: 'Peso', value: `${record.peso} kg` },
    ];
    const fila2: Array<{ label: string; value: string }> = [
      { label: 'Temperatura', value: `${record.temperatura} °C` },
      { label: 'Presión Arterial', value: record.presion_arterial },
    ];

    doc.text(`${fila1[0].label}: ${fila1[0].value}`, colIzq, y);
    doc.text(`${fila1[1].label}: ${fila1[1].value}`, colDer, y);
    y += 4;
    doc.text(`${fila2[0].label}: ${fila2[0].value}`, colIzq, y);
    doc.text(`${fila2[1].label}: ${fila2[1].value}`, colDer, y);
    y += 4;

    return y;
  }

  /**
   * Renderiza los datos dinámicos JSONB de la consulta procesándolos
   * con las funciones de sanitización de claves y formato de valores.
   *
   * @param doc Instancia del documento jsPDF.
   * @param datos Array de pares clave-valor.
   * @param x Posición X inicial.
   * @param y Posición Y inicial.
   * @returns La posición Y después de dibujar los datos.
   */
  private dibujarDatosDinamicos(
    doc: jsPDF,
    datos: readonly DynamicMedicalData[],
    x: number,
    y: number,
  ): number {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(0);
    doc.text('Datos Adicionales:', x, y);
    y += 4;

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(55, 65, 81);
    for (const dato of datos) {
      const label = formatDynamicKeyLabel(dato.clave);
      const valor = formatDynamicValue(dato.valor, dato.clave);
      doc.text(`  ${label}: ${valor}`, x, y);
      y += 3.5;
    }

    return y;
  }

  /**
   * Renderiza un campo de texto que puede ocupar múltiples líneas.
   *
   * @param doc Instancia del documento jsPDF.
   * @param texto Texto a renderizar.
   * @param x Posición X inicial.
   * @param y Posición Y inicial.
   * @param max_width Ancho máximo en milímetros.
   * @returns La posición Y después del texto.
   */
  private dibujarCampoMultilinea(
    doc: jsPDF,
    texto: string,
    x: number,
    y: number,
    max_width: number,
  ): number {
    const lineas = doc.splitTextToSize(texto, max_width);
    for (const linea of lineas) {
      doc.text(linea, x, y);
      y += 3.5;
    }
    return y;
  }

  /**
   * Descarga el documento generado como archivo PDF.
   *
   * @param doc Instancia del documento jsPDF.
   * @param nombreArchivo Nombre del archivo a descargar.
   */
  private descargarArchivo(doc: jsPDF, nombreArchivo: string): void {
    doc.save(nombreArchivo);
  }

  /**
   * Formatea una fecha ISO a formato legible en español.
   *
   * @param fecha ISO string de la fecha.
   * @returns Fecha formateada (ej: "15 de marzo de 2024").
   */
  private formatearFecha(fecha: string): string {
    return new Date(fecha).toLocaleDateString('es-AR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }

  /**
   * Limpia un nombre para usarlo como nombre de archivo.
   *
   * @param nombre Nombre original.
   * @returns Nombre sin caracteres especiales.
   */
  private sanearNombre(nombre: string): string {
    return nombre
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '')
      .substring(0, 50);
  }
}
