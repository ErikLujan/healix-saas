import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { RouterLink } from '@angular/router';
import { BaseChartDirective } from 'ng2-charts';
import { LucideDynamicIcon } from '@lucide/angular';
import { fadeIn, slideUp } from '@core/animations/route-animations';
import { TurnosService } from '@core/services/turnos.service';
import { AdminUsersService } from '@features/administration/services/admin-users.service';
import { MedicalRecordsService } from '@features/medical-history/services/medical-records.service';
import { TurnoConRelaciones } from '@core/models/turno.model';
import type { ChartConfiguration, ChartData } from 'chart.js';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [RouterLink, BaseChartDirective, LucideDynamicIcon],
  animations: [fadeIn, slideUp],
  template: `
    <div @fadeIn class="min-h-full">
      <div @slideUp class="mb-8">
        <h1 class="text-2xl font-semibold text-fg font-display tracking-tight">
          Panel de administracion
        </h1>
        <p class="text-sm text-fg-muted mt-1">
          Vista general del sistema y metricas globales.
        </p>
      </div>

      @if (isLoading()) {
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          @for (i of [1,2,3,4]; track i) {
            <div class="bg-surface border border-divider rounded-xl p-5 animate-pulse">
              <div class="h-3 w-24 bg-slate-200 rounded mb-3"></div>
              <div class="h-8 w-16 bg-slate-200 rounded mb-2"></div>
              <div class="h-3 w-20 bg-slate-100 rounded"></div>
            </div>
          }
        </div>
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div class="bg-surface border border-divider rounded-xl p-6 animate-pulse">
            <div class="h-4 w-32 bg-slate-200 rounded mb-6"></div>
            <div class="h-48 bg-slate-100 rounded-lg"></div>
          </div>
          <div class="bg-surface border border-divider rounded-xl p-6 animate-pulse">
            <div class="h-4 w-40 bg-slate-200 rounded mb-6"></div>
            <div class="space-y-4">
              @for (i of [1,2,3]; track i) {
                <div class="h-12 bg-slate-100 rounded-lg"></div>
              }
            </div>
          </div>
        </div>
      } @else {
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          @for (card of kpiCards(); track card.label) {
            <a
              [routerLink]="card.link || null"
              class="group bg-surface border border-divider rounded-xl p-5 transition-all duration-300 hover:shadow-sm hover:-translate-y-0.5 hover:border-brand-100 relative overflow-hidden"
              [class.cursor-pointer]="card.link"
              [class.cursor-default]="!card.link"
            >
              <div class="absolute left-0 top-0 bottom-0 w-1" [style.background]="card.gradient"></div>
              <div class="flex items-start justify-between pl-3">
                <div>
                  <p class="text-[11px] font-semibold text-fg-subtle uppercase tracking-widest mb-2">
                    {{ card.label }}
                  </p>
                  <p class="text-3xl font-extrabold tracking-tight tabular-nums" [class]="card.color">
                    {{ card.value }}
                  </p>
                </div>
                <div class="w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-300 group-hover:scale-110" [style.background]="card.iconBg">
                  <svg [lucideIcon]="card.icon" class="w-5 h-5" [style.color]="card.iconColor"></svg>
                </div>
              </div>
              @if (card.link) {
                <div class="mt-3 pt-3 border-t border-divider pl-3">
                  <span class="text-brand-700 text-xs font-semibold group-hover:text-brand-600 transition-colors">
                    Ver detalles
                  </span>
                </div>
              }
            </a>
          }
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <div class="bg-surface border border-divider rounded-xl p-6">
            <p class="text-[11px] font-semibold text-fg-subtle uppercase tracking-widest mb-1">ANALITICA</p>
            <h3 class="text-sm font-semibold text-fg mb-5">Turnos por especialidad</h3>
            @if (hasChartData()) {
              <div class="relative h-52">
                <canvas baseChart
                  [data]="barChartData()"
                  [options]="barChartOptions()"
                  [type]="'bar'">
                </canvas>
              </div>
            } @else {
              <div class="h-52 bg-surface-sunken rounded-lg flex items-center justify-center">
                <p class="text-sm text-fg-subtle">Sin datos disponibles</p>
              </div>
            }
          </div>

          <div class="bg-surface border border-divider rounded-xl p-6">
            <p class="text-[11px] font-semibold text-fg-subtle uppercase tracking-widest mb-1">ACCESOS RAPIDOS</p>
            <h3 class="text-sm font-semibold text-fg mb-5">Gestion del sistema</h3>
            <div class="space-y-2">
              <a routerLink="/especialistas" class="flex items-center gap-3 p-3 rounded-xl hover:bg-brand-50 transition-all duration-200 group">
                <div class="w-9 h-9 rounded-lg bg-purple-50 flex items-center justify-center shrink-0">
                  <svg lucideIcon="stethoscope" class="w-4 h-4 text-purple-600"></svg>
                </div>
                <div class="flex-1 min-w-0">
                  <p class="text-sm font-semibold text-fg group-hover:text-brand-700 transition-colors">Gestionar especialistas</p>
                  <p class="text-xs text-fg-muted">Aprobar, rechazar y administrar</p>
                </div>
                <svg lucideIcon="chevron-right" class="w-4 h-4 text-fg-subtle shrink-0"></svg>
              </a>
              <a routerLink="/administracion/usuarios" class="flex items-center gap-3 p-3 rounded-xl hover:bg-brand-50 transition-all duration-200 group">
                <div class="w-9 h-9 rounded-lg bg-emerald-50 flex items-center justify-center shrink-0">
                  <svg lucideIcon="users" class="w-4 h-4 text-emerald-600"></svg>
                </div>
                <div class="flex-1 min-w-0">
                  <p class="text-sm font-semibold text-fg group-hover:text-brand-700 transition-colors">Administrar usuarios</p>
                  <p class="text-xs text-fg-muted">Crear y gestionar cuentas</p>
                </div>
                <svg lucideIcon="chevron-right" class="w-4 h-4 text-fg-subtle shrink-0"></svg>
              </a>
              <a routerLink="/estadisticas" class="flex items-center gap-3 p-3 rounded-xl hover:bg-brand-50 transition-all duration-200 group">
                <div class="w-9 h-9 rounded-lg bg-amber-50 flex items-center justify-center shrink-0">
                  <svg lucideIcon="bar-chart-2" class="w-4 h-4 text-amber-600"></svg>
                </div>
                <div class="flex-1 min-w-0">
                  <p class="text-sm font-semibold text-fg group-hover:text-brand-700 transition-colors">Ver estadisticas</p>
                  <p class="text-xs text-fg-muted">Reportes y graficos del sistema</p>
                </div>
                <svg lucideIcon="chevron-right" class="w-4 h-4 text-fg-subtle shrink-0"></svg>
              </a>
            </div>
          </div>
        </div>

        <div class="bg-surface border border-divider rounded-xl p-6">
          <p class="text-[11px] font-semibold text-fg-subtle uppercase tracking-widest mb-1">RESUMEN</p>
          <h3 class="text-sm font-semibold text-fg mb-5">Metricas del sistema</h3>
          <div class="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div class="text-center p-4 bg-surface-sunken rounded-lg">
              <p class="text-2xl font-bold text-fg tabular-nums">{{ totalUsuarios() }}</p>
              <p class="text-xs text-fg-muted mt-1">Usuarios totales</p>
            </div>
            <div class="text-center p-4 bg-surface-sunken rounded-lg">
              <p class="text-2xl font-bold text-emerald-600 tabular-nums">{{ especialistasAprobados() }}</p>
              <p class="text-xs text-fg-muted mt-1">Especialistas activos</p>
            </div>
            <div class="text-center p-4 bg-surface-sunken rounded-lg">
              <p class="text-2xl font-bold text-amber-600 tabular-nums">{{ especialistasPendientes() }}</p>
              <p class="text-xs text-fg-muted mt-1">Pendientes revision</p>
            </div>
            <div class="text-center p-4 bg-surface-sunken rounded-lg">
              <p class="text-2xl font-bold text-purple-600 tabular-nums">{{ totalTurnos() }}</p>
              <p class="text-xs text-fg-muted mt-1">Turnos totales</p>
            </div>
          </div>
        </div>
      }
    </div>
  `,
})
export class AdminDashboardComponent implements OnInit {
  private readonly adminUsersService = inject(AdminUsersService);
  private readonly turnosService = inject(TurnosService);
  private readonly medicalRecordsService = inject(MedicalRecordsService);

  readonly isLoading = signal(true);

  readonly totalUsuarios = signal(0);
  readonly especialistasPendientes = signal(0);
  readonly especialistasAprobados = signal(0);
  readonly especialidadesActivas = signal(0);
  readonly totalTurnos = signal(0);
  readonly totalHistorias = signal(0);
  readonly turnosData = signal<readonly TurnoConRelaciones[]>([]);

  readonly kpiCards = computed(() => [
    {
      label: 'Usuarios totales',
      value: this.totalUsuarios(),
      icon: 'users',
      color: 'text-brand-700',
      gradient: 'linear-gradient(180deg, #6366f1, #4f46e5)',
      iconBg: 'rgba(99, 102, 241, 0.1)',
      iconColor: '#6366f1',
      link: '/administracion/usuarios',
    },
    {
      label: 'Especialistas activos',
      value: this.especialistasAprobados(),
      icon: 'stethoscope',
      color: 'text-emerald-600',
      gradient: 'linear-gradient(180deg, #10b981, #059669)',
      iconBg: 'rgba(16, 185, 129, 0.1)',
      iconColor: '#10b981',
      link: '/especialistas',
    },
    {
      label: 'Pendientes aprobacion',
      value: this.especialistasPendientes(),
      icon: 'clock',
      color: 'text-amber-600',
      gradient: 'linear-gradient(180deg, #f59e0b, #d97706)',
      iconBg: 'rgba(245, 158, 11, 0.1)',
      iconColor: '#f59e0b',
      link: '/especialistas',
    },
    {
      label: 'Turnos totales',
      value: this.totalTurnos(),
      icon: 'calendar',
      color: 'text-purple-600',
      gradient: 'linear-gradient(180deg, #a855f7, #9333ea)',
      iconBg: 'rgba(168, 85, 247, 0.1)',
      iconColor: '#a855f7',
    },
  ]);

  readonly barChartData = computed((): ChartData<'bar'> => {
    const turnos = this.turnosData();
    const specialtyMap = new Map<string, number>();

    turnos.forEach(t => {
      const name = t.especialidad?.name ?? 'Sin especialidad';
      specialtyMap.set(name, (specialtyMap.get(name) ?? 0) + 1);
    });

    const labels = Array.from(specialtyMap.keys());
    const data = Array.from(specialtyMap.values());

    return {
      labels,
      datasets: [{
        data,
        label: 'Turnos',
        backgroundColor: 'rgba(99, 102, 241, 0.8)',
        borderColor: 'rgba(99, 102, 241, 1)',
        borderWidth: 1,
        borderRadius: 6,
        maxBarThickness: 48,
      }],
    };
  });

  readonly barChartOptions = computed((): ChartConfiguration<'bar'>['options'] => ({
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: '#1e293b',
        titleFont: { size: 12, weight: 'bold' },
        bodyFont: { size: 12 },
        padding: 10,
        cornerRadius: 8,
      },
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { font: { size: 11 }, color: '#94a3b8' },
      },
      y: {
        beginAtZero: true,
        grid: { color: 'rgba(226, 232, 240, 0.5)' },
        ticks: { font: { size: 11 }, color: '#94a3b8', stepSize: 1 },
      },
    },
  }));

  readonly hasChartData = computed(() => this.barChartData().datasets[0].data.length > 0);

  async ngOnInit(): Promise<void> {
    this.isLoading.set(true);

    await this.adminUsersService.loadUsers();

    const users = this.adminUsersService.users();
    this.totalUsuarios.set(users.length);
    this.especialistasPendientes.set(
      users.filter(u => u.especialistas && !u.especialistas.is_approved).length,
    );
    this.especialistasAprobados.set(
      users.filter(u => u.especialistas && u.especialistas.is_approved).length,
    );

    const turnos = await this.turnosService.obtenerTodosLosTurnosAdmin();
    this.totalTurnos.set(turnos.length);
    this.turnosData.set(turnos);

    const historias = await this.medicalRecordsService.getAllRecords().toPromise();
    this.totalHistorias.set(historias?.length ?? 0);

    this.isLoading.set(false);
  }
}
