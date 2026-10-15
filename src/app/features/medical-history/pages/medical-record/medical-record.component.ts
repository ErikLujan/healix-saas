import { Component, DestroyRef, inject, signal, computed, OnInit } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { LucideDynamicIcon } from '@lucide/angular';
import { toast } from 'ngx-sonner';
import { AuthService } from '@core/services/auth.service';
import { MedicalRecordsService } from '../../services/medical-records.service';
import { PdfExportService } from '../../services/pdf-export.service';
import { MedicalRecordConRelaciones } from '../../models/medical-record.model';
import { MedicalHistoryListComponent } from '../../components/medical-history-list/medical-history-list.component';
import { filtrarHistoriasClinicas } from '../../utils/medical-record-filter';

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
            <div class="rounded-2xl border border-divider bg-surface p-5 space-y-4">
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
      } @else if (huboError() && records().length === 0) {
        <div class="flex flex-col items-center justify-center py-16 px-4 rounded-2xl border border-danger/20 bg-surface" role="alert">
          <div class="flex h-16 w-16 items-center justify-center rounded-2xl bg-danger/5 mb-4">
            <svg lucideIcon="alert-triangle" class="h-8 w-8 text-danger/60"></svg>
          </div>
          <h3 class="text-lg font-semibold text-text-primary mb-1">No se pudo cargar el historial</h3>
          <p class="text-sm text-text-secondary text-center max-w-sm">
            Revisá tu conexión e intentalo nuevamente.
          </p>
          <button
            type="button"
            (click)="recargar()"
            class="mt-4 inline-flex items-center gap-2 rounded-xl bg-brand-700 px-4 py-2 text-sm font-semibold text-white transition-all hover:bg-brand-700/90 active:scale-[0.97] focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2">
            Reintentar
          </button>
        </div>
      } @else if (records().length > 0) {
        <div class="relative mb-4">
          <svg lucideIcon="search" class="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-text-subtle"></svg>
          <input type="text"
            [value]="filtroBusqueda()"
            (input)="onFiltroInput($event)"
            placeholder="Buscar por paciente, especialista, fecha o indicador..."
            aria-label="Buscar en el historial clínico"
            class="w-full rounded-2xl border border-border bg-surface py-2.5 pl-10 pr-10 text-sm text-text-primary placeholder:text-text-subtle focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all" />
          @if (filtroBusqueda()) {
            <button type="button" (click)="limpiarFiltro()" aria-label="Limpiar búsqueda"
              class="absolute right-3 top-1/2 -translate-y-1/2 rounded-xl p-1 text-text-subtle hover:bg-surface-sunken hover:text-text-primary transition-colors active:scale-95 focus:outline-none focus:ring-2 focus:ring-brand-500/20">
              <svg lucideIcon="x" class="h-4 w-4"></svg>
            </button>
          }
        </div>

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

        @if (recordsFiltrados().length > 0) {
          <app-medical-history-list [records]="recordsFiltrados()" />
        } @else {
          <div class="flex flex-col items-center justify-center py-16 px-4 rounded-2xl border border-divider bg-surface">
            <h3 class="text-lg font-semibold text-text-primary mb-1">Sin resultados</h3>
            <p class="text-sm text-text-secondary text-center max-w-sm">
              No hay registros que coincidan con "{{ filtroBusqueda() }}".
            </p>
            <button
              type="button"
              (click)="limpiarFiltro()"
              class="mt-4 inline-flex items-center gap-2 rounded-xl border border-border px-4 py-2 text-sm font-semibold text-text-secondary hover:bg-surface-sunken transition-all focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2">
              Limpiar búsqueda
            </button>
          </div>
        }
      } @else {
        <div class="flex flex-col items-center justify-center py-16 px-4 rounded-2xl border border-divider bg-surface">
          <div class="flex h-16 w-16 items-center justify-center rounded-2xl bg-surface-sunken mb-4">
            <svg lucideIcon="folder-open" class="h-8 w-8 text-text-subtle"></svg>
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
export class MedicalRecordComponent implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly medicalRecordsService = inject(MedicalRecordsService);
  private readonly pdfExportService = inject(PdfExportService);
  private readonly destroyRef = inject(DestroyRef);

  private readonly perfil = this.authService.userProfile();
  private readonly isSpecialist = computed(() => this.authService.userRole() === 'especialista');

  private readonly _isLoading = signal(true);
  readonly isLoading = this._isLoading.asReadonly();
  readonly isExporting = signal(false);
  readonly huboError = signal(false);

  readonly records = signal<readonly MedicalRecordConRelaciones[]>([]);
  readonly filtroBusqueda = signal('');

  readonly recordsFiltrados = computed(() =>
    filtrarHistoriasClinicas(this.records(), this.filtroBusqueda()),
  );

  ngOnInit(): void {
    this.cargarHistorial();
  }

  /** Loads the clinical history with error state for retry. */
  cargarHistorial(): void {
    if (!this.perfil) {
      this._isLoading.set(false);
      return;
    }

    this._isLoading.set(true);
    this.huboError.set(false);

    const fuente$ = this.isSpecialist()
      ? this.medicalRecordsService.getHistoryBySpecialistId(this.perfil.id)
      : this.medicalRecordsService.getHistoryByPatientId(this.perfil.id);

    fuente$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (records) => {
        this.records.set(records);
        this._isLoading.set(false);
      },
      error: () => {
        this.huboError.set(true);
        this._isLoading.set(false);
        toast.error('No se pudo cargar el historial clínico. Intenta nuevamente.');
      },
    });
  }

  /** Reloads the history after a load error. */
  recargar(): void {
    this.cargarHistorial();
  }

  onFiltroInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.filtroBusqueda.set(input.value);
  }

  limpiarFiltro(): void {
    this.filtroBusqueda.set('');
  }

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
