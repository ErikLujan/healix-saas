import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TitleCasePipe } from '@angular/common';
import { LucideDynamicIcon } from '@lucide/angular';
import { fadeIn, slideUp } from '@core/animations/route-animations';
import { AuthService } from '@core/services/auth.service';
import { TurnosService } from '@core/services/turnos.service';
import { MedicalRecordsService } from '@features/medical-history/services/medical-records.service';
import { TurnoConRelaciones } from '@core/models/turno.model';

@Component({
  selector: 'app-patient-dashboard',
  standalone: true,
  imports: [RouterLink, TitleCasePipe, LucideDynamicIcon],
  animations: [fadeIn, slideUp],
  template: `
    <div @fadeIn class="min-h-full">
      <div @slideUp class="mb-8">
        <h1 class="text-2xl font-semibold text-fg font-display tracking-tight">
          Mi clinica
        </h1>
        <p class="text-sm text-fg-muted mt-1">
          Acceso rapido a tus servicios medicos.
        </p>
      </div>

      @if (isLoading()) {
        <div class="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-6 mb-6">
          <div class="bg-surface border border-divider rounded-xl p-6 animate-pulse">
            <div class="h-3 w-32 bg-slate-200 rounded mb-4"></div>
            <div class="h-6 w-48 bg-slate-200 rounded mb-4"></div>
            <div class="space-y-3 mb-5">
              <div class="h-4 w-40 bg-slate-100 rounded"></div>
              <div class="h-4 w-32 bg-slate-100 rounded"></div>
            </div>
            <div class="flex gap-3">
              <div class="h-10 w-32 bg-slate-200 rounded-lg"></div>
              <div class="h-10 w-24 bg-slate-100 rounded-lg"></div>
            </div>
          </div>
          <div class="bg-surface border border-divider rounded-xl p-6 animate-pulse flex flex-col items-center justify-center">
            <div class="h-3 w-24 bg-slate-200 rounded mb-4"></div>
            <div class="h-10 w-32 bg-slate-200 rounded-lg"></div>
          </div>
        </div>
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          @for (i of [1,2,3,4]; track i) {
            <div class="bg-surface border border-divider rounded-xl p-5 animate-pulse">
              <div class="h-3 w-24 bg-slate-200 rounded mb-3"></div>
              <div class="h-8 w-16 bg-slate-200 rounded"></div>
            </div>
          }
        </div>
      } @else {
        <div class="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-6 mb-6">
          @if (nextAppointment()) {
            <div class="bg-surface border border-divider rounded-xl p-6 relative overflow-hidden">
              <div class="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-brand-500 to-brand-700"></div>
              <div class="pl-3">
                <p class="text-[11px] font-semibold text-fg-subtle uppercase tracking-widest mb-2">TU PROXIMA CONSULTA</p>
                <h2 class="text-xl font-bold text-fg mb-4">
                  {{ nextAppointment()!.especialidad?.name ?? 'Sin especialidad' }}
                  <span class="text-fg-muted font-normal">&middot;</span>
                  {{ nextAppointment()!.especialista?.full_name ?? 'Sin especialista' }}
                </h2>
                <div class="space-y-2 mb-4">
                  <div class="flex items-center gap-2 text-sm text-fg-muted">
                    <svg lucideIcon="calendar" class="w-4 h-4 text-fg-subtle"></svg>
                    <span>{{ formatDate(nextAppointment()!.fecha_hora) }}</span>
                  </div>
                  <div class="flex items-center gap-2 text-sm text-fg-muted">
                    <svg lucideIcon="clock" class="w-4 h-4 text-fg-subtle"></svg>
                    <span>{{ formatTime(nextAppointment()!.fecha_hora) }}</span>
                  </div>
                </div>
                <div class="flex flex-wrap gap-3">
                  <a routerLink="/turnos" class="inline-flex items-center gap-1.5 bg-brand-700 text-white text-sm font-semibold px-4 py-2.5 rounded-lg hover:bg-brand-600 transition-colors">
                    Ver mis turnos
                  </a>
                  <button class="inline-flex items-center gap-1.5 border border-divider text-fg text-sm font-semibold px-4 py-2.5 rounded-lg hover:bg-surface-sunken transition-colors">
                    Reagendar
                  </button>
                  <button class="inline-flex items-center gap-1.5 text-red-600 text-sm font-semibold px-4 py-2.5 rounded-lg hover:bg-red-50 transition-colors">
                    Cancelar
                  </button>
                </div>
              </div>
            </div>
          } @else {
            <div class="bg-surface border border-divider rounded-xl p-6 flex items-center justify-center">
              <div class="text-center">
                <svg lucideIcon="calendar" class="w-12 h-12 text-fg-subtle mx-auto mb-3 opacity-40"></svg>
                <p class="text-sm font-medium text-fg">No tenes turnos proximos</p>
                <p class="text-xs text-fg-muted mt-1">Reserva un turno para comenzar.</p>
              </div>
            </div>
          }

          <div class="bg-surface border border-divider rounded-xl p-6 flex flex-col items-center justify-center text-center">
            <p class="text-[11px] font-semibold text-fg-subtle uppercase tracking-widest mb-3">NUEVO TURNO</p>
            <a routerLink="/turnos/solicitar" class="inline-flex items-center gap-1.5 bg-brand-700 text-white text-sm font-semibold px-5 py-2.5 rounded-lg hover:bg-brand-600 transition-colors">
              Reservar turno
            </a>
          </div>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          @for (card of kpiCards(); track card.label) {
            <a
              [routerLink]="card.link"
              class="bg-surface border border-divider rounded-xl shadow-xs p-5 transition-all duration-300 hover:shadow-sm hover:-translate-y-0.5 hover:border-brand-100 relative overflow-hidden"
            >
              <div class="absolute left-0 top-0 bottom-0 w-1" [style.background]="card.gradient"></div>
              <div class="pl-3">
                <p class="text-[11px] font-semibold text-fg-subtle uppercase tracking-widest mb-2">
                  {{ card.label }}
                </p>
                <p class="text-3xl font-extrabold tracking-tight tabular-nums" [class]="card.color">
                  {{ card.value }}
                </p>
                @if (card.subtext) {
                  <p class="text-xs text-fg-muted mt-1">{{ card.subtext }}</p>
                }
              </div>
            </a>
          }
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-5 gap-6 mb-6">
          <div class="lg:col-span-3 bg-surface border border-divider rounded-xl p-6">
            <p class="text-[11px] font-semibold text-fg-subtle uppercase tracking-widest mb-1">AGENDA</p>
            <h3 class="text-sm font-semibold text-fg mb-5">Proximos turnos</h3>

            @if (upcomingTurnos().length === 0) {
              <div class="text-center py-8 bg-surface-sunken rounded-xl">
                <svg lucideIcon="calendar" class="w-10 h-10 text-fg-subtle mx-auto mb-2 opacity-40"></svg>
                <p class="text-sm text-fg-muted">Sin turnos programados</p>
              </div>
            } @else {
              <div class="space-y-4">
                @for (turno of upcomingTurnos(); track turno.id) {
                  <div class="border border-divider rounded-xl p-4 hover:border-brand-100 transition-colors">
                    <div class="flex items-start justify-between mb-2">
                      <div>
                        <p class="text-sm font-bold text-fg">
                          {{ turno.especialista?.full_name ?? 'Sin especialista' }}
                          <span class="text-fg-muted font-normal">&middot;</span>
                          {{ turno.especialidad?.name ?? '' }}
                        </p>
                        <p class="text-xs text-fg-muted">{{ formatDate(turno.fecha_hora) }}</p>
                      </div>
                      <span
                        class="text-xs font-semibold px-2.5 py-1 rounded-full"
                        [class]="getStatusClass(turno.estado)"
                      >
                        {{ turno.estado | titlecase }}
                      </span>
                    </div>
                    <div class="flex items-center gap-4 text-xs text-fg-muted mt-2">
                      <span class="flex items-center gap-1">
                        <svg lucideIcon="clock" class="w-3 h-3"></svg>
                        {{ formatTime(turno.fecha_hora) }}
                      </span>
                    </div>
                  </div>
                }
              </div>
            }
          </div>

          <div class="lg:col-span-2 bg-surface border border-divider rounded-xl p-6">
            <p class="text-[11px] font-semibold text-fg-subtle uppercase tracking-widest mb-1">HISTORIA</p>
            <h3 class="text-sm font-semibold text-fg mb-5">Consultas anteriores</h3>

            @if (recentHistory().length === 0) {
              <div class="text-center py-8 bg-surface-sunken rounded-xl">
                <svg lucideIcon="file-text" class="w-10 h-10 text-fg-subtle mx-auto mb-2 opacity-40"></svg>
                <p class="text-sm text-fg-muted">Sin historial clinico</p>
              </div>
            } @else {
              <div class="relative pl-5 space-y-5">
                <div class="absolute left-[7px] top-1.5 bottom-1.5 w-px bg-divider"></div>
                @for (record of recentHistory(); track record.id) {
                  <div class="relative">
                    <span class="absolute -left-5 top-1.5 w-2.5 h-2.5 rounded-full bg-brand-700 ring-2 ring-surface"></span>
                    <p class="text-xs text-fg-muted">{{ formatDate(record.created_at) }}</p>
                    <p class="text-sm font-semibold text-fg">{{ record.especialista?.full_name ?? 'Sin especialista' }}</p>
                    <p class="text-xs text-fg-muted">{{ record.datos_dinamicos.length }} datos clinicos registrados</p>
                  </div>
                }
              </div>
              <a routerLink="/historial-clinico" class="inline-flex items-center gap-1.5 text-brand-700 text-sm font-semibold mt-5 hover:text-brand-600 transition-colors">
                Ver historia clinica completa
              </a>
            }
          </div>
        </div>
      }
    </div>
  `,
})
export class PatientDashboardComponent implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly turnosService = inject(TurnosService);
  private readonly medicalRecordsService = inject(MedicalRecordsService);

  readonly isLoading = signal(true);

  readonly turnosDelPaciente = signal(0);
  readonly historialPaciente = signal(0);

  readonly nextAppointment = signal<TurnoConRelaciones | null>(null);
  readonly upcomingTurnos = signal<readonly TurnoConRelaciones[]>([]);
  readonly recentHistory = signal<readonly import('@features/medical-history/models/medical-record.model').MedicalRecordConRelaciones[]>([]);

  readonly kpiCards = computed(() => [
    {
      label: 'Proximos turnos',
      value: this.turnosDelPaciente(),
      color: 'text-brand-700',
      gradient: 'linear-gradient(180deg, #0d9488, #0f766e)',
      link: '/turnos',
    },
    {
      label: 'Consultas 2026',
      value: this.historialPaciente(),
      color: 'text-emerald-600',
      gradient: 'linear-gradient(180deg, #10b981, #059669)',
      subtext: `${this.historialPaciente()} realizadas`,
    },
    {
      label: 'Solicitar turno',
      value: '+',
      color: 'text-purple-600',
      gradient: 'linear-gradient(180deg, #a855f7, #9333ea)',
      link: '/turnos/solicitar',
    },
    {
      label: 'Mi perfil',
      value: '\u2192',
      color: 'text-slate-600',
      gradient: 'linear-gradient(180deg, #64748b, #475569)',
      link: '/perfil',
    },
  ]);

  async ngOnInit(): Promise<void> {
    this.isLoading.set(true);
    const perfil = this.authService.userProfile();

    if (!perfil) {
      this.isLoading.set(false);
      return;
    }

    const [turnos, historial] = await Promise.all([
      this.turnosService.obtenerTurnosPorPaciente(perfil.id),
      this.medicalRecordsService.getHistoryByPatientId(perfil.id).toPromise(),
    ]);

    const now = new Date();
    const upcoming = turnos
      .filter(t => new Date(t.fecha_hora) > now && t.estado !== 'cancelado' && t.estado !== 'rechazado')
      .sort((a, b) => new Date(a.fecha_hora).getTime() - new Date(b.fecha_hora).getTime());

    this.turnosDelPaciente.set(upcoming.length);
    this.historialPaciente.set(historial?.length ?? 0);
    this.nextAppointment.set(upcoming.length > 0 ? upcoming[0] : null);
    this.upcomingTurnos.set(upcoming.slice(0, 3));
    this.recentHistory.set(historial?.slice(0, 3) ?? []);

    this.isLoading.set(false);
  }

  formatDate(fechaHora: string): string {
    const date = new Date(fechaHora);
    return date.toLocaleDateString('es-AR', { day: 'numeric', month: 'long', year: 'numeric' });
  }

  formatTime(fechaHora: string): string {
    const date = new Date(fechaHora);
    return date.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
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
}
