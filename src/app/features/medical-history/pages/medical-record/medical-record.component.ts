import { Component, inject, signal, computed } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { catchError, tap, of } from 'rxjs';
import { LucideDynamicIcon } from '@lucide/angular';
import { toast } from 'ngx-sonner';
import { AuthService } from '@core/services/auth.service';
import { MedicalRecordsService } from '../../services/medical-records.service';
import { PdfExportService } from '../../services/pdf-export.service';
import { MedicalRecordConRelaciones } from '../../models/medical-record.model';
import { MedicalHistoryListComponent } from '../../components/medical-history-list/medical-history-list.component';

@Component({
  selector: 'app-medical-record',
  standalone: true,
  imports: [LucideDynamicIcon, MedicalHistoryListComponent],
  template: `
    <div class="min-h-full overflow-x-hidden">
      <div class="mb-6">
        <h1 class="text-2xl font-semibold text-text-primary font-display tracking-tight">{{ pageTitle() }}</h1>
        <p class="mt-1 text-sm text-text-secondary">
          {{ pageSubtitle() }}
        </p>
      </div>

      @if (isLoading()) {
        <div class="space-y-4">
          @for (i of [1,2,3]; track i) {
            <div class="rounded-2xl border border-slate-200/80 bg-surface p-5 space-y-4">
              <div class="flex items-center gap-3">
                <div class="h-10 w-10 rounded-xl animate-shimmer"></div>
                <div class="space-y-2 flex-1">
                  <div class="h-4 w-40 rounded-full animate-shimmer"></div>
                  <div class="h-3 w-28 rounded-full animate-shimmer"></div>
                </div>
              </div>
              <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div class="h-16 rounded-xl animate-shimmer"></div>
                <div class="h-16 rounded-xl animate-shimmer"></div>
                <div class="h-16 rounded-xl animate-shimmer"></div>
                <div class="h-16 rounded-xl animate-shimmer"></div>
              </div>
            </div>
          }
        </div>
      } @else if (records().length > 0) {
        <div class="mb-4 flex justify-end">
          <button
            type="button"
            (click)="exportarPDF()"
            [disabled]="isExporting()"
            class="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-brand-700 text-white text-sm font-semibold hover:bg-brand-900 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 active:scale-[0.97]">
            @if (isExporting()) {
              <div class="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              <span>Exportando...</span>
            } @else {
              <svg lucideIcon="download" class="h-4 w-4"></svg>
              <span>Exportar PDF</span>
            }
          </button>
        </div>

        <app-medical-history-list [records]="records()" />
      } @else {
        <div class="flex flex-col items-center justify-center py-16 px-4 rounded-2xl border border-slate-200/80 bg-surface">
          <div class="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 mb-4">
            <svg lucideIcon="folder-open" class="h-8 w-8 text-slate-400"></svg>
          </div>
          <h3 class="text-lg font-semibold text-text-primary mb-1">{{ emptyTitle() }}</h3>
          <p class="text-sm text-text-secondary text-center max-w-sm">
            {{ emptyDescription() }}
          </p>
        </div>
      }
    </div>
  `,
})
export class MedicalRecordComponent {
  private readonly authService = inject(AuthService);
  private readonly medicalRecordsService = inject(MedicalRecordsService);
  private readonly pdfExportService = inject(PdfExportService);

  private readonly perfil = this.authService.userProfile();
  private readonly isSpecialist = computed(() => this.authService.userRole() === 'especialista');

  private readonly _isLoading = signal(true);
  readonly isLoading = this._isLoading.asReadonly();
  readonly isExporting = signal(false);

  readonly pageTitle = computed(() =>
    this.isSpecialist()
      ? 'Historial Clínico — Mis Pacientes'
      : 'Mi Historial Clínico',
  );

  readonly pageSubtitle = computed(() =>
    this.isSpecialist()
      ? 'Consulta cronológica de las atenciones médicas de tus pacientes.'
      : 'Consulta cronológica de todas tus atenciones médicas.',
  );

  readonly emptyTitle = computed(() =>
    this.isSpecialist()
      ? 'Sin historial clínico'
      : 'Sin historial clínico',
  );

  readonly emptyDescription = computed(() =>
    this.isSpecialist()
      ? 'No hay historias clínicas registradas para tus pacientes atendidos.'
      : 'Aún no tienes consultas médicas registradas en el sistema.',
  );

  readonly records = toSignal(
    this.perfil
      ? (this.isSpecialist()
          ? this.medicalRecordsService.getHistoryBySpecialistId(this.perfil.id)
          : this.medicalRecordsService.getHistoryByPatientId(this.perfil.id)
        ).pipe(
          catchError(() => {
            toast.error('No se pudo cargar el historial clínico. Intenta nuevamente.');
            return of([] as readonly MedicalRecordConRelaciones[]);
          }),
          tap(() => this._isLoading.set(false)),
        )
      : of([] as readonly MedicalRecordConRelaciones[]).pipe(
          tap(() => this._isLoading.set(false)),
        ),
    { initialValue: [] as readonly MedicalRecordConRelaciones[] },
  );

  async exportarPDF(): Promise<void> {
    if (!this.perfil || this.records().length === 0) return;

    this.isExporting.set(true);

    try {
      await this.pdfExportService.exportarHistorialPaciente(
        this.records(),
        this.perfil.full_name,
      );
    } catch {
      toast.error('No se pudo exportar el PDF. Intenta nuevamente.');
    } finally {
      this.isExporting.set(false);
    }
  }
}
