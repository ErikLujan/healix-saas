import { Injectable } from '@angular/core';
import { jsPDF } from 'jspdf';
import { toast } from 'ngx-sonner';
import {
  MedicalRecordConRelaciones,
  DynamicMedicalData,
} from '../models/medical-record.model';

/** Nombre de la clínica utilizado en el membrete del PDF. */
const CLINIC_NAME = 'Clinica Online';

/** Título del documento exportado. */
const REPORT_TITLE = 'HISTORIAL CLINICO PERMANENTE';

/** Margen horizontal del documento en milimetros. */
const MARGIN_X = 15;

/** Ancho útil del documento en milímetros (A4 = 210 - 2 * 15). */
const CONTENT_WIDTH = 180;

/** Color institucional principal (azul). */
const PRIMARY_COLOR: readonly [number, number, number] = [37, 99, 235];

/** Color de texto secundario. */
const TEXT_SECONDARY_COLOR: readonly [number, number, number] = [107, 114, 128];

/**
 * Servicio de exportación de historias clínicas a formato PDF.
 *
 * Genera documentos institucionales con membrete, título,
 * fecha de emisión y el listado cronológico de consultas
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
   * - Logo/nombre de la clínica (membrete)
   * - Título del informe
   * - Fecha de emisión automatizada con hora
   * - Datos generales del paciente (nombre, DNI, email, edad)
   * - Listado cronológico de consultas con todos los campos clínicos
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
      yOffset = this.dibujarDatosPaciente(doc, pacienteNombre, dni, email, edad, records.length, yOffset);
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
   * Dibuja el membrete institucional con logo, nombre de clínica y fecha.
   *
   * @param doc Instancia del documento jsPDF.
   * @param logoBase64 Logo en formato base64 (puede ser vacío).
   * @returns La posición Y después de dibujar el membrete.
   */
  private dibujarMembrete(doc: jsPDF, logoBase64: string): number {
    let yInicio = 18;

    if (logoBase64) {
      doc.addImage(logoBase64, 'PNG', MARGIN_X, 10, 18, 18);
      doc.setFontSize(20);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...PRIMARY_COLOR);
      doc.text(CLINIC_NAME, MARGIN_X + 22, 18);
      yInicio = 30;
    } else {
      doc.setFontSize(20);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...PRIMARY_COLOR);
      doc.text(CLINIC_NAME, MARGIN_X, 20);
      yInicio = 28;
    }

    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0);
    doc.text(REPORT_TITLE, MARGIN_X, yInicio);
    yInicio += 6;

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

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...TEXT_SECONDARY_COLOR);
    doc.text(`Emitido el: ${fechaCompleta} a las ${horaCompleta} hs`, MARGIN_X, yInicio);
    yInicio += 4;

    doc.setDrawColor(...PRIMARY_COLOR);
    doc.setLineWidth(0.5);
    doc.line(MARGIN_X, yInicio, MARGIN_X + CONTENT_WIDTH, yInicio);
    yInicio += 6;

    doc.setTextColor(0);
    return yInicio;
  }

  /**
   * Dibuja los datos generales del paciente en el documento.
   *
   * @param doc Instancia del documento jsPDF.
   * @param nombre Nombre completo del paciente.
   * @param dni Número de DNI del paciente.
   * @param email Correo electrónico del paciente.
   * @param edad Edad del paciente.
   * @param totalConsultas Cantidad total de consultas.
   * @param y Posición Y actual en el documento.
   * @returns La posición Y después de dibujar los datos.
   */
  private dibujarDatosPaciente(
    doc: jsPDF,
    nombre: string,
    dni: string | undefined,
    email: string | undefined,
    edad: number | undefined,
    totalConsultas: number,
    y: number,
  ): number {
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(MARGIN_X, y - 3, CONTENT_WIDTH, 24, 2, 2, 'F');

    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0);
    doc.text('Datos del Titular', MARGIN_X + 3, y + 2);
    y += 7;

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(55, 65, 81);

    const campos: string[] = [`Nombre: ${nombre}`];
    if (dni) campos.push(`DNI: ${dni}`);
    if (email) campos.push(`Email: ${email}`);
    if (edad) campos.push(`Edad: ${edad} años`);
    campos.push(`Total de consultas: ${totalConsultas}`);

    const lineaCompleta = campos.join('  |  ');
    const lineas = doc.splitTextToSize(lineaCompleta, CONTENT_WIDTH - 6);
    for (const linea of lineas) {
      doc.text(linea, MARGIN_X + 3, y);
      y += 4;
    }

    y += 4;
    doc.setTextColor(0);
    return y;
  }

  /**
   * Renderiza el listado cronológico de todas las consultas médicas.
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

      if (y > 245) {
        doc.addPage();
        y = 20;
      }

      y = this.dibujarConsulta(doc, record, i + 1, y);
      y += 4;
    }

    return y;
  }

  /**
   * Renderiza una única consulta médica con todos sus campos.
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
    doc.setFillColor(245, 247, 250);
    doc.roundedRect(MARGIN_X, y - 4, CONTENT_WIDTH, 7, 1, 1, 'F');

    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0);
    const fechaConsulta = this.formatearFecha(record.created_at);
    const especialista = record.especialista?.full_name ?? 'No especificado';
    doc.text(`Consulta #${numero} - ${fechaConsulta} - Dr. ${especialista}`, MARGIN_X + 2, y);
    y += 7;

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');

    const especialidad = record.especialidad?.name ?? 'No especificada';
    doc.text(`Especialidad: ${especialidad}`, MARGIN_X + 2, y);
    y += 5;

    if (record.turno?.resena_diagnostico) {
      y = this.dibujarCampoMultilinea(doc, `Reseña: ${record.turno.resena_diagnostico}`, MARGIN_X + 2, y, CONTENT_WIDTH - 4);
      y += 2;
    }

    y = this.dibujarParametrosFisiologicos(doc, record, MARGIN_X + 2, y);

    if (record.datos_dinamicos && record.datos_dinamicos.length > 0) {
      y = this.dibujarDatosDinamicos(doc, record.datos_dinamicos, MARGIN_X + 2, y);
    }

    doc.setDrawColor(220);
    doc.line(MARGIN_X, y, MARGIN_X + CONTENT_WIDTH, y);
    y += 3;

    return y;
  }

  /**
   * Dibuja los parámetros fisiológicos registrados en la consulta.
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
    doc.setTextColor(0);
    doc.text('Parámetros Fisiológicos:', x, y);
    y += 5;

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(55, 65, 81);
    const parametros = [
      `Altura: ${record.altura} cm`,
      `Peso: ${record.peso} kg`,
      `Temperatura: ${record.temperatura} C`,
      `Presión Arterial: ${record.presion_arterial}`,
    ];

    for (const param of parametros) {
      doc.text(`  ${param}`, x, y);
      y += 4;
    }

    return y;
  }

  /**
   * Renderiza los datos dinámicos JSONB de la consulta.
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
    doc.setTextColor(0);
    doc.text('Datos Adicionales:', x, y);
    y += 5;

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(55, 65, 81);
    for (const dato of datos) {
      doc.text(`  ${dato.clave}: ${dato.valor}`, x, y);
      y += 4;
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
      y += 4;
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
