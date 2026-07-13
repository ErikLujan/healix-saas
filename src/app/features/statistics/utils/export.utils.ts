import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import type { TurnoPorEspecialidad, TurnoPorDia, TurnoPorMedico, AccessLogEntry } from '../services/statistics.service';

/**
 * Descarga un archivo Excel a partir de una hoja de calculo.
 *
 * @param worksheet Hoja de calculo XLSX.
 * @param nombreArchivo Nombre del archivo sin extension.
 */
function descargarExcel(worksheet: XLSX.WorkSheet, nombreArchivo: string): void {
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Datos');
  XLSX.writeFile(workbook, `${nombreArchivo}.xlsx`);
}

/**
 * Exporta turnos por especialidad a formato Excel.
 *
 * @param data Arreglo de turnos por especialidad.
 */
export function exportarTurnosPorEspecialidadExcel(data: readonly TurnoPorEspecialidad[]): void {
  const rows = data.map(d => ({ Especialidad: d.especialidad, Cantidad: d.cantidad }));
  const worksheet = XLSX.utils.json_to_sheet(rows);
  descargarExcel(worksheet, 'turnos-por-especialidad');
}

/**
 * Exporta turnos por especialidad a formato PDF.
 *
 * @param data Arreglo de turnos por especialidad.
 */
export function exportarTurnosPorEspecialidadPDF(data: readonly TurnoPorEspecialidad[]): void {
  const doc = new jsPDF();
  doc.setFontSize(16);
  doc.text('Turnos por Especialidad', 14, 22);
  doc.setFontSize(10);
  doc.text(`Fecha: ${new Date().toLocaleDateString('es-AR')}`, 14, 30);

  let y = 42;
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('Especialidad', 14, y);
  doc.text('Cantidad', 120, y);
  y += 4;
  doc.setDrawColor(0);
  doc.line(14, y, 196, y);
  y += 6;

  doc.setFont('helvetica', 'normal');
  for (const item of data) {
    if (y > 270) { doc.addPage(); y = 20; }
    doc.text(item.especialidad.substring(0, 40), 14, y);
    doc.text(String(item.cantidad), 120, y);
    y += 8;
  }

  doc.save('turnos-por-especialidad.pdf');
}

/**
 * Exporta turnos por dia a formato Excel.
 *
 * @param data Arreglo de turnos por dia.
 */
export function exportarTurnosPorDiaExcel(data: readonly TurnoPorDia[]): void {
  const rows = data.map(d => ({ Dia: d.dia, Cantidad: d.cantidad }));
  const worksheet = XLSX.utils.json_to_sheet(rows);
  descargarExcel(worksheet, 'turnos-por-dia');
}

/**
 * Exporta turnos por dia a formato PDF.
 *
 * @param data Arreglo de turnos por dia.
 */
export function exportarTurnosPorDiaPDF(data: readonly TurnoPorDia[]): void {
  const doc = new jsPDF();
  doc.setFontSize(16);
  doc.text('Turnos por Dia de la Semana', 14, 22);
  doc.setFontSize(10);
  doc.text(`Fecha: ${new Date().toLocaleDateString('es-AR')}`, 14, 30);

  let y = 42;
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('Dia', 14, y);
  doc.text('Cantidad', 120, y);
  y += 4;
  doc.line(14, y, 196, y);
  y += 6;

  doc.setFont('helvetica', 'normal');
  for (const item of data) {
    doc.text(item.dia, 14, y);
    doc.text(String(item.cantidad), 120, y);
    y += 8;
  }

  doc.save('turnos-por-dia.pdf');
}

/**
 * Exporta turnos por medico a formato Excel.
 *
 * @param data Arreglo de turnos por medico.
 */
export function exportarTurnosPorMedicoExcel(data: readonly TurnoPorMedico[]): void {
  const rows = data.map(d => ({
    Medico: d.medico,
    Solicitados: d.solicitados,
    Finalizados: d.finalizados,
  }));
  const worksheet = XLSX.utils.json_to_sheet(rows);
  descargarExcel(worksheet, 'turnos-por-medico');
}

/**
 * Exporta turnos por medico a formato PDF.
 *
 * @param data Arreglo de turnos por medico.
 */
export function exportarTurnosPorMedicoPDF(data: readonly TurnoPorMedico[]): void {
  const doc = new jsPDF();
  doc.setFontSize(16);
  doc.text('Turnos por Medico', 14, 22);
  doc.setFontSize(10);
  doc.text(`Fecha: ${new Date().toLocaleDateString('es-AR')}`, 14, 30);

  let y = 42;
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('Medico', 14, y);
  doc.text('Solicitados', 100, y);
  doc.text('Finalizados', 145, y);
  y += 4;
  doc.line(14, y, 196, y);
  y += 6;

  doc.setFont('helvetica', 'normal');
  for (const item of data) {
    if (y > 270) { doc.addPage(); y = 20; }
    doc.text(item.medico.substring(0, 35), 14, y);
    doc.text(String(item.solicitados), 100, y);
    doc.text(String(item.finalizados), 145, y);
    y += 8;
  }

  doc.save('turnos-por-medico.pdf');
}

/**
 * Exporta el log de accesos a formato Excel.
 *
 * @param data Arreglo de entradas del log de accesos.
 */
export function exportarLogAccesosExcel(data: readonly AccessLogEntry[]): void {
  const rows = data.map(d => ({
    Usuario: d.fullName,
    Email: d.email,
    Rol: d.role,
    'Fecha de ingreso': new Date(d.loginAt).toLocaleString('es-AR'),
  }));
  const worksheet = XLSX.utils.json_to_sheet(rows);
  descargarExcel(worksheet, 'log-accesos');
}

/**
 * Exporta el log de accesos a formato PDF.
 *
 * @param data Arreglo de entradas del log de accesos.
 */
export function exportarLogAccesosPDF(data: readonly AccessLogEntry[]): void {
  const doc = new jsPDF({ orientation: 'landscape' });
  doc.setFontSize(16);
  doc.text('Log de Accesos al Sistema', 14, 22);
  doc.setFontSize(10);
  doc.text(`Fecha: ${new Date().toLocaleDateString('es-AR')}`, 14, 30);

  let y = 42;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('Usuario', 14, y);
  doc.text('Email', 70, y);
  doc.text('Rol', 130, y);
  doc.text('Fecha/Hora', 160, y);
  y += 4;
  doc.line(14, y, 283, y);
  y += 6;

  doc.setFont('helvetica', 'normal');
  for (const item of data) {
    if (y > 190) { doc.addPage(); y = 20; }
    doc.text(item.fullName.substring(0, 25), 14, y);
    doc.text(item.email.substring(0, 30), 70, y);
    doc.text(item.role, 130, y);
    doc.text(new Date(item.loginAt).toLocaleString('es-AR'), 160, y);
    y += 7;
  }

  doc.save('log-accesos.pdf');
}
