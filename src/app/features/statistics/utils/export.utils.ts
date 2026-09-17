import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import { toast } from 'ngx-sonner';
import type { TurnoPorEspecialidad, TurnoPorDia, TurnoPorMedico, AccessLogEntry } from '../services/statistics.service';

/** Color corporativo Deep Teal Healix. */
const BRAND_TEAL: readonly [number, number, number] = [15, 76, 74];

/** Color de fondo de encabezado de tabla. */
const HEADER_BG: readonly [number, number, number] = [15, 76, 74];

/** Color de texto del encabezado de tabla. */
const HEADER_TEXT: readonly [number, number, number] = [255, 255, 255];

/** Color de fila alternada en tabla. */
const ALT_ROW_BG: readonly [number, number, number] = [248, 250, 252];

/** Color de texto secundario. */
const TEXT_SECONDARY: readonly [number, number, number] = [107, 114, 128];

/** Nombre de la clínica. */
const CLINIC_NAME = 'Healix';

/** Descarga un archivo Excel a partir de una hoja de calculo. */
function descargarExcel(worksheet: XLSX.WorkSheet, nombreArchivo: string): void {
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Datos');
  XLSX.writeFile(workbook, `${nombreArchivo}.xlsx`);
}

/**
 * Neutraliza un texto contra inyección de fórmulas en Excel.
 *
 * Si el texto comienza con `=`, `+`, `-` o `@`, las planillas lo
 * interpretan como fórmula al abrir el archivo. Prefijar con
 * apóstrofe fuerza el tratamiento como texto literal.
 *
 * @param valor Texto original de la celda.
 * @returns Texto seguro para escribir en la planilla.
 */
function neutralizarFormulaExcel(valor: string): string {
  const inicial = valor.trimStart().charAt(0);
  if (inicial === '=' || inicial === '+' || inicial === '-' || inicial === '@') {
    return `'${valor}`;
  }
  return valor;
}

/** Capitaliza la primera letra de un texto de rol. */
function capitalizeRole(role: string): string {
  if (!role) return '';
  return role.charAt(0).toUpperCase() + role.slice(1);
}

/**
 * Carga la imagen del logo institucional y la convierte a base64.
 *
 * @returns Promise con el string base64 del logo o string vacío si falla.
 */
async function cargarLogoBase64(): Promise<string> {
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
 * Dibuja el membrete corporativo Healix en el documento PDF.
 *
 * Ubica el logo en la esquina superior izquierda (x:14, y:12, w:22, h:22),
 * el título en negrita Deep Teal (x:42, y:18), la marca de tiempo de
 * emisión y un divisor horizontal corporativo.
 *
 * @param doc Instancia del documento jsPDF.
 * @param logoBase64 Logo en base64.
 * @param titulo Título del reporte.
 * @param rangoFechas Rango de fechas del filtro (opcional).
 * @returns La posición Y después del membrete.
 */
function dibujarMembrete(
  doc: jsPDF,
  logoBase64: string,
  titulo: string,
  rangoFechas?: string,
): number {
  let y = 12;

  if (logoBase64) {
    doc.addImage(logoBase64, 'PNG', 14, y, 22, 22);
  }

  const xTitulo = 42;
  y = 20;

  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...BRAND_TEAL);
  doc.text(CLINIC_NAME, xTitulo, y);
  y += 7;

  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0);
  doc.text(titulo, xTitulo, y);
  y += 5;

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...TEXT_SECONDARY);
  const now = new Date();
  const fechaEmision = now.toLocaleDateString('es-AR', {
    year: 'numeric', month: '2-digit', day: '2-digit',
  });
  const horaEmision = now.toLocaleTimeString('es-AR', {
    hour: '2-digit', minute: '2-digit', hour12: false,
  });
  let lineaMeta = `Emitido: ${fechaEmision} ${horaEmision} hs`;
  if (rangoFechas) lineaMeta += `  |  ${rangoFechas}`;
  doc.text(lineaMeta, xTitulo, y);
  y += 5;

  doc.setDrawColor(...BRAND_TEAL);
  doc.setLineWidth(0.5);
  doc.line(14, y, 196, y);
  y += 6;

  doc.setTextColor(0);
  return y;
}

/**
 * Dibuja una imagen de gráfico centrada en el documento PDF.
 *
 * Inserta la imagen del canvas de Chart.js en una posición fija
 * con dimensiones predefinidas para mantener consistencia visual
 * en todos los reportes.
 *
 * @param doc Instancia del documento jsPDF.
 * @param chartImageBase64 Imagen en base64 del gráfico.
 * @param y Posición Y inicial.
 * @returns La posición Y después de la imagen.
 */
function dibujarImagenChart(
  doc: jsPDF,
  chartImageBase64: string,
  y: number,
): number {
  const imgX = 35;
  const imgW = 140;
  const imgH = 70;

  doc.addImage(chartImageBase64, 'PNG', imgX, y, imgW, imgH);
  return y + imgH + 6;
}

/**
 * Dibuja una tabla de datos con encabezado corporativo y filas alternadas.
 *
 * @param doc Instancia del documento jsPDF.
 * @param headers Encabezados de columna.
 * @param rows Filas de datos.
 * @param columnWidths Anchos de columna en milímetros.
 * @param columnPositions Posiciones X de cada columna.
 * @param y Posición Y inicial.
 * @returns La posición Y después de la tabla.
 */
function dibujarTabla(
  doc: jsPDF,
  headers: readonly string[],
  rows: readonly (readonly string[])[],
  columnWidths: readonly number[],
  columnPositions: readonly number[],
  y: number,
): number {
  doc.setFillColor(...HEADER_BG);
  doc.rect(14, y - 4, 182, 8, 'F');
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...HEADER_TEXT);
  for (let i = 0; i < headers.length; i++) {
    doc.text(headers[i], columnPositions[i], y);
  }
  y += 6;

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(55, 65, 81);
  for (let r = 0; r < rows.length; r++) {
    if (y > 270) {
      doc.addPage();
      y = 20;
    }

    if (r % 2 === 0) {
      doc.setFillColor(...ALT_ROW_BG);
      doc.rect(14, y - 4, 182, 7, 'F');
    }

    doc.setFontSize(7.5);
    for (let c = 0; c < rows[r].length; c++) {
      doc.text(rows[r][c], columnPositions[c], y);
    }
    y += 7;
  }

  return y;
}

/**
 * Exporta turnos por especialidad a formato Excel.
 *
 * @param data Arreglo de turnos por especialidad.
 */
export function exportarTurnosPorEspecialidadExcel(data: readonly TurnoPorEspecialidad[]): void {
  const rows = data.map(d => ({ Especialidad: neutralizarFormulaExcel(d.especialidad), Cantidad: d.cantidad }));
  const worksheet = XLSX.utils.json_to_sheet(rows);
  descargarExcel(worksheet, 'turnos-por-especialidad');
  toast.success('Reporte exportado exitosamente', { description: 'turnos-por-especialidad.xlsx' });
}

/**
 * Exporta turnos por especialidad a formato PDF con membrete corporativo.
 *
 * @param data Arreglo de turnos por especialidad.
 * @param chartImageBase64 Imagen opcional del gráfico para embeber.
 */
export async function exportarTurnosPorEspecialidadPDF(
  data: readonly TurnoPorEspecialidad[],
  chartImageBase64?: string,
): Promise<void> {
  const doc = new jsPDF();
  const logoBase64 = await cargarLogoBase64();
  let y = dibujarMembrete(doc, logoBase64, 'Turnos por Especialidad');

  if (chartImageBase64) {
    y = dibujarImagenChart(doc, chartImageBase64, y);
  }

  const headers = ['Especialidad', 'Cantidad'];
  const colPos: readonly number[] = [14, 140];
  const colWidths: readonly number[] = [126, 56];
  const tableRows = data.map(d => [
    d.especialidad.substring(0, 50),
    String(d.cantidad),
  ]);

  y = dibujarTabla(doc, headers, tableRows, colWidths, colPos, y);

  doc.save('turnos-por-especialidad.pdf');
  toast.success('Reporte exportado exitosamente', { description: 'turnos-por-especialidad.pdf' });
}

/**
 * Exporta turnos por dia a formato Excel.
 *
 * @param data Arreglo de turnos por dia.
 */
export function exportarTurnosPorDiaExcel(data: readonly TurnoPorDia[]): void {
  const rows = data.map(d => ({ Dia: neutralizarFormulaExcel(d.dia), Cantidad: d.cantidad }));
  const worksheet = XLSX.utils.json_to_sheet(rows);
  descargarExcel(worksheet, 'turnos-por-dia');
  toast.success('Reporte exportado exitosamente', { description: 'turnos-por-dia.xlsx' });
}

/**
 * Exporta turnos por dia a formato PDF con membrete corporativo.
 *
 * @param data Arreglo de turnos por dia.
 * @param chartImageBase64 Imagen opcional del gráfico para embeber.
 */
export async function exportarTurnosPorDiaPDF(
  data: readonly TurnoPorDia[],
  chartImageBase64?: string,
): Promise<void> {
  const doc = new jsPDF();
  const logoBase64 = await cargarLogoBase64();
  let y = dibujarMembrete(doc, logoBase64, 'Turnos por Día de la Semana');

  if (chartImageBase64) {
    y = dibujarImagenChart(doc, chartImageBase64, y);
  }

  const headers = ['Día', 'Cantidad'];
  const colPos: readonly number[] = [14, 140];
  const colWidths: readonly number[] = [126, 56];
  const tableRows = data.map(d => [d.dia, String(d.cantidad)]);

  y = dibujarTabla(doc, headers, tableRows, colWidths, colPos, y);

  doc.save('turnos-por-dia.pdf');
  toast.success('Reporte exportado exitosamente', { description: 'turnos-por-dia.pdf' });
}

/**
 * Exporta turnos por medico a formato Excel.
 *
 * @param data Arreglo de turnos por medico.
 */
export function exportarTurnosPorMedicoExcel(data: readonly TurnoPorMedico[]): void {
  const rows = data.map(d => ({
    Medico: neutralizarFormulaExcel(d.medico),
    Solicitados: d.solicitados,
    Finalizados: d.finalizados,
  }));
  const worksheet = XLSX.utils.json_to_sheet(rows);
  descargarExcel(worksheet, 'turnos-por-medico');
  toast.success('Reporte exportado exitosamente', { description: 'turnos-por-medico.xlsx' });
}

/**
 * Exporta turnos por medico a formato PDF con membrete corporativo.
 *
 * @param data Arreglo de turnos por medico.
 * @param chartImageBase64 Imagen opcional del gráfico para embeber.
 */
export async function exportarTurnosPorMedicoPDF(
  data: readonly TurnoPorMedico[],
  chartImageBase64?: string,
): Promise<void> {
  const doc = new jsPDF();
  const logoBase64 = await cargarLogoBase64();
  let y = dibujarMembrete(doc, logoBase64, 'Turnos por Especialista');

  if (chartImageBase64) {
    y = dibujarImagenChart(doc, chartImageBase64, y);
  }

  const headers = ['Médico', 'Solicitados', 'Finalizados'];
  const colPos: readonly number[] = [14, 120, 156];
  const colWidths: readonly number[] = [106, 36, 40];
  const tableRows = data.map(d => [
    d.medico.substring(0, 40),
    String(d.solicitados),
    String(d.finalizados),
  ]);

  y = dibujarTabla(doc, headers, tableRows, colWidths, colPos, y);

  doc.save('turnos-por-medico.pdf');
  toast.success('Reporte exportado exitosamente', { description: 'turnos-por-medico.pdf' });
}

/**
 * Exporta el log de accesos a formato Excel.
 *
 * @param data Arreglo de entradas del log de accesos.
 */
export function exportarLogAccesosExcel(data: readonly AccessLogEntry[]): void {
  const rows = data.map(d => ({
    Usuario: neutralizarFormulaExcel(d.fullName),
    Email: neutralizarFormulaExcel(d.email),
    Rol: capitalizeRole(d.role),
    'Fecha de ingreso': new Date(d.loginAt).toLocaleString('es-AR'),
  }));
  const worksheet = XLSX.utils.json_to_sheet(rows);
  descargarExcel(worksheet, 'log-accesos');
  toast.success('Reporte exportado exitosamente', { description: 'log-accesos.xlsx' });
}

/**
 * Exporta el log de accesos a formato PDF con membrete corporativo.
 *
 * @param data Arreglo de entradas del log de accesos.
 */
export async function exportarLogAccesosPDF(data: readonly AccessLogEntry[]): Promise<void> {
  const doc = new jsPDF({ orientation: 'landscape' });
  const logoBase64 = await cargarLogoBase64();
  let y = dibujarMembrete(doc, logoBase64, 'Log de Accesos al Sistema');

  const headers = ['Usuario', 'Email', 'Rol', 'Fecha/Hora'];
  const colPos: readonly number[] = [14, 70, 130, 160];
  const colWidths: readonly number[] = [56, 60, 30, 123];
  const tableRows = data.map(d => [
    d.fullName.substring(0, 28),
    d.email.substring(0, 32),
    capitalizeRole(d.role),
    new Date(d.loginAt).toLocaleString('es-AR'),
  ]);

  y = dibujarTabla(doc, headers, tableRows, colWidths, colPos, y);

  doc.save('log-accesos.pdf');
  toast.success('Reporte exportado exitosamente', { description: 'log-accesos.pdf' });
}
