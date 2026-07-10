import { Component, inject, OnInit, signal } from '@angular/core';
import { AuthService } from '@core/services/auth.service';
import { MedicalRecordsService } from '../../services/medical-records.service';
import { PdfExportService } from '../../services/pdf-export.service';
import { MedicalRecordConRelaciones } from '../../models/medical-record.model';
import { MedicalHistoryListComponent } from '../../components/medical-history-list/medical-history-list.component';

/**
 * Página de visualización del historial clínico para el perfil de Paciente.
 *
 * Componente smart/container que carga las historias clínicas propias
 * del paciente autenticado y las presenta mediante el componente
 * MedicalHistoryListComponent.
 *
 * Incluye botón de exportación a PDF que genera un documento
 * institucional con el historial completo del paciente.
 */
@Component({
  selector: 'app-medical-record',
  standalone: true,
  imports: [MedicalHistoryListComponent],
  template: `
    <div class="min-h-full">
      <div class="mb-6">
        <h1 class="text-2xl font-bold text-gray-900">Mi Historial Clínico</h1>
        <p class="text-sm text-gray-500 mt-1">
          Consulta cronológica de todas tus atenciones médicas.
        </p>
      </div>

      @if (isLoading()) {
        <div class="flex flex-col items-center justify-center py-16">
          <div class="w-10 h-10 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mb-4"></div>
          <p class="text-sm text-gray-500">Cargando historial clínico...</p>
        </div>
      } @else if (records().length > 0) {
        <div class="mb-4 flex justify-end">
          <button
            type="button"
            (click)="exportarPDF()"
            [disabled]="isExporting()"
            class="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
            @if (isExporting()) {
              <div class="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              <span>Exportando...</span>
            } @else {
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span>Exportar PDF</span>
            }
          </button>
        </div>

        <app-medical-history-list [records]="records()" />
      } @else {
        <div class="flex flex-col items-center justify-center py-16 px-4">
          <div class="w-16 h-16 mb-4 rounded-full bg-gray-100 flex items-center justify-center">
            <svg class="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h3 class="text-lg font-semibold text-gray-700 mb-1">Sin historial clínico</h3>
          <p class="text-sm text-gray-500 text-center max-w-sm">
            Aún no tienes consultas médicas registradas en el sistema.
          </p>
        </div>
      }
    </div>
  `,
})
export class MedicalRecordComponent implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly medicalRecordsService = inject(MedicalRecordsService);
  private readonly pdfExportService = inject(PdfExportService);

  /** Historial clínico del paciente. */
  readonly records = signal<readonly MedicalRecordConRelaciones[]>([]);

  /** Estado de carga inicial. */
  readonly isLoading = signal(true);

  /** Estado de exportación PDF. */
  readonly isExporting = signal(false);

  async ngOnInit(): Promise<void> {
    await this.cargarHistorial();
  }

  /**
   * Carga las historias clínicas del paciente autenticado.
   */
  private async cargarHistorial(): Promise<void> {
    this.isLoading.set(true);
    const perfil = this.authService.userProfile();

    if (!perfil) {
      this.isLoading.set(false);
      return;
    }

    this.medicalRecordsService.getHistoryByPatientId(perfil.id).subscribe({
      next: (records) => {
        this.records.set(records);
        this.isLoading.set(false);
      },
      error: () => {
        this.isLoading.set(false);
      },
    });
  }

  /**
   * Dispara la exportación del historial clínico a PDF.
   */
  async exportarPDF(): Promise<void> {
    const perfil = this.authService.userProfile();
    if (!perfil || this.records().length === 0) return;

    this.isExporting.set(true);

    try {
      await this.pdfExportService.exportarHistorialPaciente(
        this.records(),
        perfil.full_name,
      );
    } finally {
      this.isExporting.set(false);
    }
  }
}
