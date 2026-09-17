import { Injectable } from '@angular/core';
import * as XLSX from 'xlsx';
import { toast } from 'ngx-sonner';
import { MedicalRecordConRelaciones } from '../models/medical-record.model';

/**
 * Servicio de exportación de historias clínicas a formato Excel.
 *
 * Genera archivos XLSX estructurados con columnas claramente
 * definidas para análisis y tratamiento posterior de la
 * información clínica. Orientado principalmente al perfil
 * de administrador para funciones de auditoría.
 *
 * El servicio está completamente desacoplado de la interfaz.
 * Recibe datos y produce un archivo descargable.
 */
@Injectable({
  providedIn: 'root',
})
export class ExcelExportService {
  /** Encabezados de las columnas para el historial clínico. */
  private readonly COLUMNAS_HISTORIAL = [
    'ID Registro',
    'Fecha Consulta',
    'Paciente',
    'Especialista',
    'Especialidad',
    'Reseña Clínica',
    'Altura (cm)',
    'Peso (kg)',
    'Temperatura (C)',
    'Presión Arterial',
    'Datos Dinámicos',
  ];

  /**
   * Genera y descarga un archivo Excel con el historial clínico.
   *
   * Cada consulta ocupa una fila independiente con todas las
   * columnas clínicas requeridas por la especificación.
   *
   * @param records Array de historias clínicas ordenadas cronológicamente.
   * @param nombreArchivo Nombre base del archivo a generar.
   */
  exportarHistorialClinico(
    records: readonly MedicalRecordConRelaciones[],
    nombreArchivo: string = 'historial-clinico',
  ): void {
    if (records.length === 0) {
      toast.warning('No hay registros para exportar.');
      return;
    }

    try {
      const datos = records.map((record) => this.mapearRegistroAFila(record));
      const worksheet = XLSX.utils.aoa_to_sheet([
        this.COLUMNAS_HISTORIAL,
        ...datos,
      ]);

      this.ajustarAnchoColumnas(worksheet);

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Historial Clínico');

      XLSX.writeFile(workbook, `${nombreArchivo}.xlsx`);
      toast.success('Archivo Excel exportado correctamente.');
    } catch {
      toast.error('Error al generar el archivo Excel.');
    }
  }

  /**
   * Genera y descarga un archivo Excel con informacion de usuarios.
   *
   * Orientado al perfil administrador para auditoría de usuarios
   * registrados en el sistema.
   *
   * @param usuarios Array de perfiles de usuario a exportar.
   * @param nombreArchivo Nombre base del archivo a generar.
   */
  exportarUsuarios(
    usuarios: readonly {
      id: string;
      full_name: string;
      email: string;
      dni?: string;
      edad?: number;
      role: string;
      created_at: string;
    }[],
    nombreArchivo: string = 'usuarios-registrados',
  ): void {
    if (usuarios.length === 0) {
      toast.warning('No hay usuarios para exportar.');
      return;
    }

    try {
      const columnas = ['ID', 'Nombre Completo', 'Email', 'DNI', 'Edad', 'Rol', 'Fecha Registro'];
      const datos = usuarios.map((u) => [
        u.id,
        this.neutralizarFormula(u.full_name),
        this.neutralizarFormula(u.email),
        this.neutralizarFormula(u.dni ?? '-'),
        u.edad ?? '-',
        this.neutralizarFormula(this.formatearRol(u.role)),
        this.formatearFechaCorta(u.created_at),
      ]);

      const worksheet = XLSX.utils.aoa_to_sheet([columnas, ...datos]);
      this.ajustarAnchoColumnas(worksheet);

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Usuarios');

      XLSX.writeFile(workbook, `${nombreArchivo}.xlsx`);
      toast.success('Archivo de usuarios exportado correctamente.');
    } catch {
      toast.error('Error al generar el archivo de usuarios.');
    }
  }

  /**
   * Neutraliza un valor de celda contra inyección de fórmulas.
   *
   * Los contenidos generados por usuarios (nombres, reseñas, datos
   * dinámicos) se escriben tal cual en el XLSX. Si un texto comienza
   * con `=`, `+`, `-` o `@`, las planillas lo interpretan como
   * fórmula al abrir el archivo. Prefijar con apóstrofe fuerza el
   * tratamiento como texto literal sin alterar lo visible.
   *
   * @param valor Valor original de la celda.
   * @returns Valor seguro para escribir en la planilla.
   */
  private neutralizarFormula(valor: string | number): string | number {
    if (typeof valor !== 'string') return valor;
    const inicial = valor.trimStart().charAt(0);
    if (inicial === '=' || inicial === '+' || inicial === '-' || inicial === '@') {
      return `'${valor}`;
    }
    return valor;
  }

  /**
   * Mapea un registro de historia clínica a un array de valores
   * para una fila del Excel.
   *
   * @param record Historia clínica con relaciones.
   * @returns Array de valores para cada columna.
   */
  private mapearRegistroAFila(record: MedicalRecordConRelaciones): (string | number)[] {
    const datosDinamicos = (record.datos_dinamicos ?? [])
      .map((d) => `${d.clave}: ${d.valor}`)
      .join('; ');

    return [
      record.id,
      this.formatearFechaCorta(record.created_at),
      this.neutralizarFormula(record.paciente?.full_name ?? '-'),
      this.neutralizarFormula(record.especialista?.full_name ?? '-'),
      this.neutralizarFormula(record.especialidad?.name ?? '-'),
      this.neutralizarFormula(record.turno?.resena_diagnostico ?? '-'),
      record.altura,
      record.peso,
      record.temperatura,
      this.neutralizarFormula(record.presion_arterial),
      this.neutralizarFormula(datosDinamicos || '-'),
    ];
  }

  /**
   * Ajusta automáticamente el ancho de las columnas según
   * el contenido máximo de cada una.
   *
   * @param worksheet Hoja de cálculo a ajustar.
   */
  private ajustarAnchoColumnas(worksheet: XLSX.WorkSheet): void {
    const range = XLSX.utils.decode_range(worksheet['!ref'] ?? 'A1');
    const columnWidths: number[] = [];

    for (let col = range.s.c; col <= range.e.c; col++) {
      let maxLen = 10;
      for (let row = range.s.r; row <= range.e.r; row++) {
        const cellAddress = XLSX.utils.encode_cell({ r: row, c: col });
        const cell = worksheet[cellAddress];
        if (cell?.v) {
          const len = String(cell.v).length;
          if (len > maxLen) maxLen = len;
        }
      }
      columnWidths.push(Math.min(maxLen + 2, 40));
    }

    worksheet['!cols'] = columnWidths.map((w) => ({ wch: w }));
  }

  /**
   * Formatea una fecha ISO a formato corto legible.
   *
   * @param fecha ISO string de la fecha.
   * @returns Fecha formateada (ej: "15/03/2024").
   */
  private formatearFechaCorta(fecha: string): string {
    return new Date(fecha).toLocaleDateString('es-AR');
  }

  /**
   * Convierte el identificador de rol a su etiqueta legible.
   *
   * @param rol Identificador interno del rol.
   * @returns Etiqueta en español.
   */
  private formatearRol(rol: string): string {
    const etiquetas: Record<string, string> = {
      paciente: 'Paciente',
      especialista: 'Especialista',
      administrador: 'Administrador',
    };
    return etiquetas[rol] ?? rol;
  }
}
