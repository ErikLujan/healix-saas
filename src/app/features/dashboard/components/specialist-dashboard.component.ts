import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TitleCasePipe } from '@angular/common';
import { LucideDynamicIcon } from '@lucide/angular';
import { fadeIn, slideUp } from '@core/animations/route-animations';
import { AuthService } from '@core/services/auth.service';
import { TurnosService } from '@core/services/turnos.service';
import { MedicalRecordsService } from '@features/medical-history/services/medical-records.service';
import { TurnoConRelaciones } from '@core/models/turno.model';
import { extraerFechaCorta, extraerHora, fechaLocalHoy, nombreDiaEsAR } from '@shared/utils/date-locale.utils';

@Component({
  selector: 'app-specialist-dashboard',
  standalone: true,
  imports: [RouterLink, TitleCasePipe, LucideDynamicIcon],
  animations: [fadeIn, slideUp],
  template: `
    <div @fadeIn class="min-h-full">
      <div @slideUp class="mb-8">
        <h1 class="text-2xl font-semibold text-text-primary font-display tracking-tight">
          Mi panel de trabajo
        </h1>
        <p class="text-sm text-text-secondary mt-1">
          Resumen de tu actividad clinica del dia.
        </p>
      </div>

      @if (isLoading()) {
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          @for (i of [1,2,3,4]; track i) {
            <div class="bg-surface border border-divider rounded-xl p-5 animate-pulse">
              <div class="h-3 w-24 bg-border rounded mb-3"></div>
              <div class="h-8 w-16 bg-border rounded mb-2"></div>
              <div class="h-3 w-20 bg-surface-sunken rounded"></div>
            </div>
          }
        </div>
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div class="lg:col-span-2 bg-surface border border-divider rounded-xl p-6 animate-pulse">
            <div class="h-4 w-32 bg-border rounded mb-6"></div>
            <div class="space-y-4">
              @for (i of [1,2,3]; track i) {
                <div class="h-20 bg-surface-sunken rounded-lg"></div>
              }
            </div>
          </div>
          <div class="bg-surface border border-divider rounded-xl p-6 animate-pulse">
            <div class="h-4 w-40 bg-border rounded mb-6"></div>
            <div class="space-y-4">
              @for (i of [1,2]; track i) {
                <div class="h-16 bg-surface-sunken rounded-lg"></div>
              }
            </div>
          </div>
        </div>
      } @else if (errorCarga()) {
        <div class="bg-surface border border-danger/20 rounded-xl p-6 text-center" role="alert">
          <svg lucideIcon="alert-triangle" class="w-10 h-10 text-danger/60 mx-auto mb-2"></svg>
          <p class="text-sm font-medium text-text-primary">No se pudo cargar tu panel.</p>
          <p class="text-xs text-text-secondary mt-1">{{ errorCarga() }}</p>
          <button type="button" (click)="recargar()"
            class="mt-4 inline-flex items-center gap-1.5 bg-brand-700 text-white text-sm font-semibold px-5 py-2.5 rounded-lg hover:bg-brand-600 transition-colors focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:outline-none">
            Reintentar
          </button>
        </div>
      } @else {
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          @for (card of kpiCards(); track card.label) {
            <div class="bg-surface border border-divider rounded-xl shadow-xs p-5 relative overflow-hidden">
              <div class="absolute left-0 top-0 bottom-0 w-1 bg-brand-500"></div>
              <div class="pl-3">
                <p class="text-[11px] font-semibold text-text-subtle uppercase tracking-widest mb-2">
                  {{ card.label }}
                </p>
                <p class="text-3xl font-extrabold tracking-tight tabular-nums" [class]="card.color">
                  {{ card.value }}
                </p>
                @if (card.subtext) {
                  <p class="text-xs text-text-secondary mt-1">{{ card.subtext }}</p>
                }
              </div>
            </div>
          }
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <div class="lg:col-span-2 bg-surface border border-divider rounded-xl p-6">
            <div class="flex items-center justify-between mb-5">
              <div>
                <p class="text-[11px] font-semibold text-text-subtle uppercase tracking-widest mb-1">AGENDA DE HOY</p>
                <h2 class="text-lg font-bold text-text-primary">Turnos programados</h2>
              </div>
              <a routerLink="/turnos" class="text-brand-700 text-sm font-semibold hover:text-brand-600 transition-colors focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:outline-none">
                Ver todos
              </a>
            </div>

            @if (todayTurnos().length === 0) {
              <div class="text-center py-12 bg-surface-sunken rounded-xl">
                <svg lucideIcon="calendar" class="w-12 h-12 text-text-subtle mx-auto mb-3 opacity-40"></svg>
                <p class="text-sm font-medium text-text-primary">Sin turnos programados hoy</p>
                <p class="text-xs text-text-secondary mt-1">No tenes consultas agendadas para este dia.</p>
              </div>
            } @else {
              <div class="space-y-3">
                @for (turno of todayTurnos(); track turno.id) {
                  <div class="flex items-center gap-4 p-4 border border-divider rounded-xl hover:border-brand-100 transition-colors">
                    <div class="w-16 text-sm font-bold text-text-primary text-center shrink-0">
                      {{ formatTime(turno.fecha_hora) }}
                    </div>
                    <div class="flex-1 min-w-0">
                      <p class="text-sm font-semibold text-text-primary">{{ turno.paciente?.full_name ?? 'Sin paciente' }}</p>
                      <p class="text-xs text-text-secondary">{{ turno.especialidad?.name ?? 'Sin especialidad' }}</p>
                    </div>
                    <span
                      class="text-xs font-semibold px-2.5 py-1 rounded-full shrink-0"
                      [class]="getStatusClass(turno.estado)"
                    >
                      {{ turno.estado | titlecase }}
                    </span>
                    <a routerLink="/turnos" class="text-sm font-semibold text-brand-700 hover:text-brand-600 transition-colors shrink-0 focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:outline-none rounded">
                      Abrir
                    </a>
                  </div>
                }
              </div>
            }
          </div>

          <div class="space-y-6">
            <div class="bg-surface border border-divider rounded-xl p-6">
              <p class="text-[11px] font-semibold text-text-subtle uppercase tracking-widest mb-1">PACIENTE EN CONTEXTO</p>
              <h2 class="text-sm font-semibold text-text-primary mb-4">Detalle rapido</h2>
              @if (nextPatient()) {
                <div class="space-y-3 mb-5">
                  <div class="flex items-center justify-between py-2 border-b border-divider">
                    <span class="text-sm text-text-secondary">Nombre</span>
                    <span class="text-sm font-bold text-text-primary">{{ nextPatient()!.paciente?.full_name ?? '-' }}</span>
                  </div>
                  <div class="flex items-center justify-between py-2 border-b border-divider">
                    <span class="text-sm text-text-secondary">Especialidad</span>
                    <span class="text-sm font-bold text-text-primary">{{ nextPatient()!.especialidad?.name ?? '-' }}</span>
                  </div>
                  <div class="flex items-center justify-between py-2">
                    <span class="text-sm text-text-secondary">Horario</span>
                    <span class="text-sm font-bold text-text-primary">{{ formatTime(nextPatient()!.fecha_hora) }}</span>
                  </div>
                </div>
                <a routerLink="/turnos" class="w-full inline-flex items-center justify-center gap-1.5 bg-brand-700 text-white text-sm font-semibold px-4 py-2.5 rounded-lg hover:bg-brand-600 transition-colors focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:outline-none">
                  Abrir consulta
                </a>
              } @else {
                <div class="text-center py-6">
                  <p class="text-sm text-text-secondary">No hay pacientes en cola.</p>
                </div>
              }
            </div>

            <div class="bg-surface border border-divider rounded-xl p-6">
              <p class="text-[11px] font-semibold text-text-subtle uppercase tracking-widest mb-1">RECORDATORIO</p>
              <p class="text-sm text-text-secondary mt-2">Tenés {{ pendingRecords() }} historia(s) clinica(s) pendiente(s) de firmar.</p>
            </div>
          </div>
        </div>
      }
    </div>
  `,
})
export class SpecialistDashboardComponent implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly turnosService = inject(TurnosService);
  private readonly medicalRecordsService = inject(MedicalRecordsService);

  readonly isLoading = signal(true);
  readonly errorCarga = signal<string | null>(null);

  readonly turnosDelDia = signal(0);
  readonly turnosPendientes = signal(0);
  readonly pacientesAtendidos = signal(0);
  readonly pendingRecords = signal(0);

  readonly todayTurnos = signal<readonly TurnoConRelaciones[]>([]);

  readonly kpiCards = computed(() => [
    {
      label: 'Turnos hoy',
      value: this.turnosDelDia(),
      color: 'text-brand-700',
      subtext: this.getDayName(),
    },
    {
      label: 'Pendientes',
      value: this.turnosPendientes(),
      color: 'text-brand-700',
      subtext: 'Requieren accion',
    },
    {
      label: 'Pacientes atendidos',
      value: this.pacientesAtendidos(),
      color: 'text-brand-700',
      subtext: 'Total historial',
    },
    {
      label: 'Historias clinicas',
      value: this.pendingRecords(),
      color: 'text-brand-700',
      subtext: 'Pendientes de firma',
    },
  ]);

  readonly nextPatient = computed(() => {
    const turnos = this.todayTurnos();
    return turnos.length > 0 ? turnos[0] : null;
  });

  async ngOnInit(): Promise<void> {
    await this.cargarPanel();
  }

  async recargar(): Promise<void> {
    await this.cargarPanel();
  }

  private async cargarPanel(): Promise<void> {
    this.isLoading.set(true);
    this.errorCarga.set(null);
    const perfil = this.authService.userProfile();

    if (!perfil) {
      this.isLoading.set(false);
      return;
    }

    try {
      const [turnosAll, historial] = await Promise.all([
        this.turnosService.obtenerTurnosPorEspecialista(perfil.id),
        this.medicalRecordsService.getHistoryBySpecialistId(perfil.id).toPromise(),
      ]);

      const cargaError = this.turnosService.lastError();
      if (cargaError) {
        this.errorCarga.set(cargaError);
        return;
      }

      const hoy = fechaLocalHoy();
      const todayTurnos = turnosAll.filter(t => extraerFechaCorta(t.fecha_hora) === hoy);

      this.turnosDelDia.set(todayTurnos.length);
      this.turnosPendientes.set(
        turnosAll.filter(t => t.estado === 'pendiente').length,
      );
      this.pacientesAtendidos.set(
        new Set(turnosAll.map(t => t.paciente_id)).size,
      );
      this.pendingRecords.set(
        Math.max(0, (historial?.length ?? 0) - turnosAll.filter(t => t.estado === 'finalizado').length),
      );
      this.todayTurnos.set(todayTurnos);
    } catch {
      this.errorCarga.set('No se pudo cargar tu panel. Revisá tu conexión.');
    } finally {
      this.isLoading.set(false);
    }
  }

  formatTime(fechaHora: string): string {
    return extraerHora(fechaHora);
  }

  getStatusClass(estado: string): string {
    switch (estado) {
      case 'confirmado': return 'bg-emerald-50 text-emerald-700';
      case 'pendiente': return 'bg-amber-50 text-amber-700';
      case 'finalizado': return 'bg-slate-100 text-slate-600';
      case 'cancelado': return 'bg-red-50 text-red-600';
      case 'rechazado': return 'bg-red-50 text-red-600';
      default: return 'bg-slate-100 text-slate-600';
    }
  }

  private getDayName(): string {
    return nombreDiaEsAR(new Date());
  }
}
