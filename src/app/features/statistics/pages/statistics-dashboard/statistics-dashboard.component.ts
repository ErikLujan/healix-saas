import { Component, inject, OnInit, signal, computed, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TitleCasePipe } from '@angular/common';
import { BaseChartDirective } from 'ng2-charts';
import { LucideDynamicIcon } from '@lucide/angular';
import { fadeIn, slideUp } from '@core/animations/route-animations';
import { StatisticsService, DateRangeFilter } from '../../services/statistics.service';
import {
  exportarTurnosPorEspecialidadExcel,
  exportarTurnosPorEspecialidadPDF,
  exportarTurnosPorDiaExcel,
  exportarTurnosPorDiaPDF,
  exportarTurnosPorMedicoExcel,
  exportarTurnosPorMedicoPDF,
  exportarLogAccesosExcel,
  exportarLogAccesosPDF,
} from '../../utils/export.utils';
import type { ChartConfiguration, ChartData } from 'chart.js';

@Component({
  selector: 'app-statistics-dashboard',
  standalone: true,
  imports: [FormsModule, BaseChartDirective, LucideDynamicIcon, TitleCasePipe],
  animations: [fadeIn, slideUp],
  template: `
    <div @fadeIn class="min-h-full overflow-x-hidden">
      <div @slideUp class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-xl bg-brand-50 flex items-center justify-center">
            <svg lucideIcon="bar-chart-3" class="w-5 h-5 text-brand-700"></svg>
          </div>
          <div>
            <h1 class="text-2xl font-semibold text-text-primary font-display tracking-tight">Panel de Estadísticas e Informes</h1>
            <p class="text-sm text-text-secondary mt-0.5">Métricas operativas y auditoría de accesos en tiempo real.</p>
          </div>
        </div>
      </div>

      @if (stats.isLoading()) {
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          @for (i of [1,2,3,4]; track i) {
            <div class="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs">
              <div class="flex items-start justify-between mb-3">
                <div class="h-3 w-24 animate-shimmer rounded"></div>
                <div class="w-10 h-10 rounded-xl animate-shimmer"></div>
              </div>
              <div class="h-8 w-16 animate-shimmer rounded mb-2"></div>
              <div class="h-3 w-20 animate-shimmer rounded"></div>
            </div>
          }
        </div>
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          @for (i of [1,2]; track i) {
            <div class="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs">
              <div class="flex items-center justify-between mb-4">
                <div class="h-4 w-40 animate-shimmer rounded"></div>
                <div class="flex gap-2">
                  <div class="h-8 w-8 animate-shimmer rounded-lg"></div>
                  <div class="h-8 w-8 animate-shimmer rounded-lg"></div>
                </div>
              </div>
              <div class="h-56 animate-shimmer rounded-xl"></div>
            </div>
          }
        </div>
        <div class="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs mb-8">
          <div class="flex items-center justify-between mb-4">
            <div class="h-4 w-48 animate-shimmer rounded"></div>
            <div class="flex gap-2">
              <div class="h-8 w-8 animate-shimmer rounded-lg"></div>
              <div class="h-8 w-8 animate-shimmer rounded-lg"></div>
            </div>
          </div>
          <div class="h-64 animate-shimmer rounded-xl"></div>
        </div>
        <div class="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs">
          <div class="h-4 w-44 animate-shimmer rounded mb-4"></div>
          <div class="space-y-3">
            @for (i of [1,2,3,4,5]; track i) {
              <div class="h-12 animate-shimmer rounded-lg"></div>
            }
          </div>
        </div>
      } @else if (isDataEmpty()) {
        <div class="flex flex-col items-center justify-center py-20 bg-white border border-slate-200/80 rounded-2xl shadow-xs">
          <div class="w-16 h-16 mb-4 rounded-full bg-brand-50 flex items-center justify-center">
            <svg lucideIcon="bar-chart-3" class="w-8 h-8 text-brand-500"></svg>
          </div>
          <h3 class="text-lg font-semibold text-text-primary mb-1">Sin registros disponibles</h3>
          <p class="text-sm text-text-secondary text-center max-w-md">
            No se encontraron registros clínicos en el rango de fechas seleccionado.
          </p>
        </div>
      } @else {
        <div class="bg-white/80 backdrop-blur-md border border-slate-200/80 rounded-2xl p-4 shadow-xs flex flex-wrap items-center justify-between gap-4 mb-8">
          <div class="flex flex-wrap items-center gap-3">
            <div class="flex items-center gap-2">
              <label class="text-xs font-medium text-text-secondary">Desde:</label>
              <input type="date" [ngModel]="filtroFecha().desde" (ngModelChange)="onFechaDesdeChange($event)"
                class="px-3 py-1.5 text-sm border border-slate-200 rounded-xl outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 transition-all" />
            </div>
            <div class="flex items-center gap-2">
              <label class="text-xs font-medium text-text-secondary">Hasta:</label>
              <input type="date" [ngModel]="filtroFecha().hasta" (ngModelChange)="onFechaHastaChange($event)"
                class="px-3 py-1.5 text-sm border border-slate-200 rounded-xl outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 transition-all" />
            </div>
          </div>
          <div class="flex flex-wrap items-center gap-2">
            <button type="button" (click)="applyPreset('7d')"
              class="px-3 py-1.5 text-xs font-medium rounded-xl border border-slate-200 text-text-secondary hover:bg-slate-50 hover:border-slate-300 active:scale-[0.98] transition-all">
              Últimos 7 días
            </button>
            <button type="button" (click)="applyPreset('month')"
              class="px-3 py-1.5 text-xs font-medium rounded-xl border border-slate-200 text-text-secondary hover:bg-slate-50 hover:border-slate-300 active:scale-[0.98] transition-all">
              Este mes
            </button>
            <button type="button" (click)="applyPreset('all')"
              class="px-3 py-1.5 text-xs font-medium rounded-xl border border-slate-200 text-text-secondary hover:bg-slate-50 hover:border-slate-300 active:scale-[0.98] transition-all">
              Todo el historial
            </button>
          </div>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          @for (card of kpiCards(); track card.label) {
            <div class="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 relative overflow-hidden">
              <div class="absolute left-0 top-0 bottom-0 w-1 rounded-l-2xl" [style.background]="card.gradient"></div>
              <div class="flex items-start justify-between pl-3">
                <div>
                  <p class="text-[11px] font-semibold text-text-subtle uppercase tracking-widest mb-2">{{ card.label }}</p>
                  <p class="text-3xl font-extrabold tracking-tight tabular-nums" [class]="card.color">{{ card.value }}</p>
                </div>
                <div class="w-10 h-10 rounded-xl flex items-center justify-center" [style.background]="card.iconBg">
                  <svg [lucideIcon]="card.icon" class="w-5 h-5" [style.color]="card.iconColor"></svg>
                </div>
              </div>
            </div>
          }
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <div class="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs flex flex-col justify-between">
            <div class="flex items-center justify-between mb-4">
              <div class="flex items-center gap-2.5">
                <div class="w-8 h-8 rounded-lg bg-teal-50 flex items-center justify-center">
                  <svg lucideIcon="activity" class="w-4 h-4 text-teal-600"></svg>
                </div>
                <div>
                  <h3 class="text-sm font-semibold text-text-primary">Turnos por especialidad</h3>
                  <p class="text-xs text-text-subtle">Distribución por área médica</p>
                </div>
              </div>
              <div class="flex gap-1">
                <button type="button" (click)="exportarEspecialidadExcel()" title="Exportar Excel"
                  class="p-2 text-text-subtle hover:text-teal-600 hover:bg-teal-50 rounded-xl active:scale-[0.95] transition-all">
                  <svg lucideIcon="file-spreadsheet" class="w-4 h-4"></svg>
                </button>
                <button type="button" (click)="exportarEspecialidadPDF()" title="Exportar PDF"
                  class="p-2 text-text-subtle hover:text-teal-600 hover:bg-teal-50 rounded-xl active:scale-[0.95] transition-all">
                  <svg lucideIcon="file-text" class="w-4 h-4"></svg>
                </button>
              </div>
            </div>
            @if (stats.turnosPorEspecialidad().length > 0) {
              <div class="relative h-64 flex items-center justify-center">
                <canvas baseChart #donutChart [data]="donutChartData()" type="doughnut" [options]="donutChartOptions"></canvas>
              </div>
            } @else {
              <div class="h-64 flex items-center justify-center text-sm text-text-subtle">Sin datos para esta categoría</div>
            }
          </div>

          <div class="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs flex flex-col justify-between">
            <div class="flex items-center justify-between mb-4">
              <div class="flex items-center gap-2.5">
                <div class="w-8 h-8 rounded-lg bg-cyan-50 flex items-center justify-center">
                  <svg lucideIcon="calendar" class="w-4 h-4 text-cyan-600"></svg>
                </div>
                <div>
                  <h3 class="text-sm font-semibold text-text-primary">Turnos por día</h3>
                  <p class="text-xs text-text-subtle">Volumen acumulado por día de la semana</p>
                </div>
              </div>
              <div class="flex gap-1">
                <button type="button" (click)="exportarDiaExcel()" title="Exportar Excel"
                  class="p-2 text-text-subtle hover:text-cyan-600 hover:bg-cyan-50 rounded-xl active:scale-[0.95] transition-all">
                  <svg lucideIcon="file-spreadsheet" class="w-4 h-4"></svg>
                </button>
                <button type="button" (click)="exportarDiaPDF()" title="Exportar PDF"
                  class="p-2 text-text-subtle hover:text-cyan-600 hover:bg-cyan-50 rounded-xl active:scale-[0.95] transition-all">
                  <svg lucideIcon="file-text" class="w-4 h-4"></svg>
                </button>
              </div>
            </div>
            @if (stats.turnosPorDia().length > 0) {
              <div class="relative h-64">
                <canvas baseChart #barChart [data]="barChartData()" type="bar" [options]="barChartOptions"></canvas>
              </div>
            } @else {
              <div class="h-64 flex items-center justify-center text-sm text-text-subtle">Sin datos para esta categoría</div>
            }
          </div>
        </div>

        <div class="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs mb-8">
          <div class="flex items-center justify-between mb-4">
            <div class="flex items-center gap-2.5">
              <div class="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center">
                <svg lucideIcon="stethoscope" class="w-4 h-4 text-emerald-600"></svg>
              </div>
              <div>
                <h3 class="text-sm font-semibold text-text-primary">Turnos por especialista</h3>
                <p class="text-xs text-text-subtle">Comparativa de turnos solicitados vs. finalizados</p>
              </div>
            </div>
            <div class="flex gap-1">
              <button type="button" (click)="exportarMedicoExcel()" title="Exportar Excel"
                class="p-2 text-text-subtle hover:text-emerald-600 hover:bg-emerald-50 rounded-xl active:scale-[0.95] transition-all">
                <svg lucideIcon="file-spreadsheet" class="w-4 h-4"></svg>
              </button>
              <button type="button" (click)="exportarMedicoPDF()" title="Exportar PDF"
                class="p-2 text-text-subtle hover:text-emerald-600 hover:bg-emerald-50 rounded-xl active:scale-[0.95] transition-all">
                <svg lucideIcon="file-text" class="w-4 h-4"></svg>
              </button>
            </div>
          </div>
          @if (stats.turnosPorMedico().length > 0) {
            <div class="relative h-72">
              <canvas baseChart #medicoChart [data]="medicoChartData()" type="bar" [options]="medicoChartOptions"></canvas>
            </div>
          } @else {
            <div class="h-48 flex items-center justify-center text-sm text-text-subtle">No hay datos de médicos para el rango de fechas seleccionado</div>
          }
        </div>

        <div class="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs">
          <div class="flex items-center justify-between mb-4">
            <div class="flex items-center gap-2.5">
              <div class="w-8 h-8 rounded-lg bg-violet-50 flex items-center justify-center">
                <svg lucideIcon="clock" class="w-4 h-4 text-violet-600"></svg>
              </div>
              <div>
                <h3 class="text-sm font-semibold text-text-primary">Log de accesos al sistema</h3>
                <p class="text-xs text-text-subtle">Auditoría de ingresos recientes de usuarios</p>
              </div>
            </div>
            <div class="flex gap-1">
              <button type="button" (click)="exportarLogExcel()" title="Exportar Excel"
                class="p-2 text-text-subtle hover:text-violet-600 hover:bg-violet-50 rounded-xl active:scale-[0.95] transition-all">
                <svg lucideIcon="file-spreadsheet" class="w-4 h-4"></svg>
              </button>
              <button type="button" (click)="exportarLogPDF()" title="Exportar PDF"
                class="p-2 text-text-subtle hover:text-violet-600 hover:bg-violet-50 rounded-xl active:scale-[0.95] transition-all">
                <svg lucideIcon="file-text" class="w-4 h-4"></svg>
              </button>
            </div>
          </div>
          <div class="w-full overflow-x-auto -mx-5 px-5">
            <table class="w-full min-w-[640px] text-left border-collapse" role="table" aria-label="Log de accesos al sistema">
              <caption class="sr-only">Registro de ingresos recientes al sistema</caption>
              <thead>
                <tr class="border-b border-slate-200">
                  <th scope="col" class="py-3 px-3 text-[11px] font-semibold text-text-subtle uppercase tracking-wider whitespace-nowrap">Usuario</th>
                  <th scope="col" class="py-3 px-3 text-[11px] font-semibold text-text-subtle uppercase tracking-wider whitespace-nowrap">Email</th>
                  <th scope="col" class="py-3 px-3 text-[11px] font-semibold text-text-subtle uppercase tracking-wider whitespace-nowrap">Rol</th>
                  <th scope="col" class="py-3 px-3 text-[11px] font-semibold text-text-subtle uppercase tracking-wider whitespace-nowrap">Fecha/Hora</th>
                </tr>
              </thead>
              <tbody>
                @for (entry of paginatedAccessLogs(); track entry.userId) {
                  <tr class="border-b border-slate-100 hover:bg-slate-50/80 transition-colors">
                    <td class="py-3 px-3 text-text-primary font-medium whitespace-nowrap">{{ entry.fullName }}</td>
                    <td class="py-3 px-3 text-text-secondary max-w-[220px] truncate">{{ entry.email }}</td>
                    <td class="py-3 px-3 whitespace-nowrap">
                      <span class="px-2.5 py-1 text-[11px] font-semibold rounded-full"
                        [class]="getRoleBadgeClass(entry.role)">
                        {{ entry.role | titlecase }}
                      </span>
                    </td>
                    <td class="py-3 px-3 text-text-secondary tabular-nums text-sm whitespace-nowrap">{{ formatDate(entry.loginAt) }}</td>
                  </tr>
                } @empty {
                  <tr>
                    <td colspan="4" class="py-8 text-center text-sm text-text-subtle">No hay registros de accesos</td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
          @if (stats.accessLogs().length > logsPageSize()) {
            <div class="flex flex-col sm:flex-row items-center justify-between gap-3 mt-4 pt-4 border-t border-slate-100">
              <p class="text-center text-xs text-text-subtle tabular-nums sm:text-left">{{ logsRangeText() }}</p>
              <div class="flex max-w-full flex-wrap items-center justify-center gap-1 overflow-x-auto">
                <button type="button" (click)="prevLogsPage()" [disabled]="logsPage() === 1"
                  class="px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-200 text-text-secondary hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all">
                  Anterior
                </button>
                @for (page of logsPageNumbers(); track page) {
                  <button type="button" (click)="goToLogsPage(page)"
                    class="w-8 h-8 text-xs font-semibold rounded-lg transition-all"
                    [class]="page === logsPage()
                      ? 'bg-[#0F4C4A] text-white shadow-sm'
                      : 'text-text-secondary hover:bg-slate-100'">
                    {{ page }}
                  </button>
                }
                <button type="button" (click)="nextLogsPage()" [disabled]="logsPage() === totalLogsPages()"
                  class="px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-200 text-text-secondary hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all">
                  Siguiente
                </button>
              </div>
            </div>
          }
        </div>
      }
    </div>
  `,
})
export class StatisticsDashboardComponent implements OnInit {
  readonly stats = inject(StatisticsService);

  @ViewChild('donutChart') donutChart?: BaseChartDirective;
  @ViewChild('barChart') barChart?: BaseChartDirective;
  @ViewChild('medicoChart') medicoChart?: BaseChartDirective;

  readonly logsPage = signal<number>(1);
  readonly logsPageSize = signal<number>(6);

  readonly totalLogsPages = computed(() =>
    Math.ceil(this.stats.accessLogs().length / this.logsPageSize()) || 1
  );

  readonly paginatedAccessLogs = computed(() => {
    const logs = this.stats.accessLogs();
    const start = (this.logsPage() - 1) * this.logsPageSize();
    return logs.slice(start, start + this.logsPageSize());
  });

  readonly logsPageNumbers = computed(() => {
    const total = this.totalLogsPages();
    const current = this.logsPage();
    const pages: number[] = [];
    for (let i = 1; i <= total; i++) {
      pages.push(i);
    }
    return pages;
  });

  readonly logsRangeText = computed(() => {
    const logs = this.stats.accessLogs();
    const total = logs.length;
    if (total === 0) return 'Sin registros';
    const start = (this.logsPage() - 1) * this.logsPageSize() + 1;
    const end = Math.min(this.logsPage() * this.logsPageSize(), total);
    return `Mostrando ${start} - ${end} de ${total} registros`;
  });

  readonly isDataEmpty = computed(() =>
    !this.stats.isLoading() &&
    this.stats.accessLogs().length === 0 &&
    this.stats.turnosPorEspecialidad().length === 0 &&
    this.stats.turnosPorDia().length === 0 &&
    this.stats.turnosPorMedico().length === 0
  );

  readonly filtroFecha = signal<DateRangeFilter>({
    desde: this.getDefaultDesde(),
    hasta: this.getDefaultHasta(),
  });

  readonly kpiCards = computed(() => [
    {
      label: 'Total Usuarios',
      value: this.stats.totalUsuarios(),
      color: 'text-violet-700',
      gradient: 'linear-gradient(to bottom, #8b5cf6, #6366f1)',
      iconBg: '#f5f3ff',
      iconColor: '#7c3aed',
      icon: 'users',
    },
    {
      label: 'Aprobaciones Pendientes',
      value: this.stats.especialistasPendientes(),
      color: 'text-amber-700',
      gradient: 'linear-gradient(to bottom, #f59e0b, #d97706)',
      iconBg: '#fffbeb',
      iconColor: '#d97706',
      icon: 'clock',
    },
    {
      label: 'Turnos del Mes',
      value: this.stats.turnosDelMes(),
      color: 'text-teal-700',
      gradient: 'linear-gradient(to bottom, #0d9488, #0891b2)',
      iconBg: '#f0fdf4',
      iconColor: '#0d9488',
      icon: 'calendar',
    },
    {
      label: 'Historias Clínicas',
      value: this.stats.totalHistorias(),
      color: 'text-emerald-700',
      gradient: 'linear-gradient(to bottom, #10b981, #059669)',
      iconBg: '#ecfdf5',
      iconColor: '#059669',
      icon: 'file-text',
    },
  ]);

  readonly donutChartData = computed<ChartData<'doughnut'>>(() => {
    const data = this.stats.turnosPorEspecialidad();
    return {
      labels: data.map(d => d.especialidad),
      datasets: [
        {
          data: data.map(d => d.cantidad),
          backgroundColor: ['#0d9488', '#0284c7', '#8b5cf6', '#10b981', '#f59e0b', '#ec4899', '#6366f1'],
          borderWidth: 2,
          borderColor: '#ffffff',
          hoverOffset: 6,
        },
      ],
    };
  });

  readonly donutChartOptions: ChartConfiguration<'doughnut'>['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '70%',
    plugins: {
      legend: {
        position: 'right',
        labels: {
          usePointStyle: true,
          boxWidth: 8,
          font: { size: 12, family: 'sans-serif' },
          padding: 14,
        },
      },
    },
  };

  readonly barChartData = computed<ChartData<'bar'>>(() => {
    const data = this.stats.turnosPorDia();
    return {
      labels: data.map(d => d.dia),
      datasets: [
        {
          data: data.map(d => d.cantidad),
          backgroundColor: '#0891b2',
          hoverBackgroundColor: '#0e7490',
          borderRadius: 8,
          borderSkipped: false,
        },
      ],
    };
  });

  readonly barChartOptions: ChartConfiguration<'bar'>['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { font: { size: 12 } },
      },
      y: {
        beginAtZero: true,
        ticks: { stepSize: 1, font: { size: 12 } },
        grid: { color: 'rgba(226, 232, 240, 0.6)' },
      },
    },
  };

  readonly medicoChartData = computed<ChartData<'bar'>>(() => {
    const data = this.stats.turnosPorMedico();
    return {
      labels: data.map(d => d.medico),
      datasets: [
        {
          label: 'Solicitados',
          data: data.map(d => d.solicitados),
          backgroundColor: '#0d9488',
          hoverBackgroundColor: '#0f766e',
          borderRadius: 6,
        },
        {
          label: 'Finalizados',
          data: data.map(d => d.finalizados),
          backgroundColor: '#10b981',
          hoverBackgroundColor: '#059669',
          borderRadius: 6,
        },
      ],
    };
  });

  readonly medicoChartOptions: ChartConfiguration<'bar'>['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    indexAxis: 'y',
    plugins: {
      legend: {
        position: 'top',
        align: 'end',
        labels: { usePointStyle: true, boxWidth: 8, font: { size: 12 } },
      },
    },
    scales: {
      x: {
        beginAtZero: true,
        ticks: { stepSize: 1, font: { size: 12 } },
        grid: { color: 'rgba(226, 232, 240, 0.6)' },
      },
      y: {
        grid: { display: false },
        ticks: { font: { size: 12 } },
      },
    },
  };

  ngOnInit(): void {
    this.stats.loadAllStats();
    this.stats.loadTurnosPorMedico(this.filtroFecha());
  }

  onFechaDesdeChange(desde: string): void {
    this.filtroFecha.update(f => ({ ...f, desde }));
    this.stats.loadTurnosPorMedico(this.filtroFecha());
  }

  onFechaHastaChange(hasta: string): void {
    this.filtroFecha.update(f => ({ ...f, hasta }));
    this.stats.loadTurnosPorMedico(this.filtroFecha());
  }

  applyPreset(preset: '7d' | 'month' | 'all'): void {
    const hasta = new Date().toISOString().split('T')[0];
    let desde = this.getDefaultDesde();

    if (preset === '7d') {
      const d = new Date();
      d.setDate(d.getDate() - 7);
      desde = d.toISOString().split('T')[0];
    } else if (preset === 'month') {
      const d = new Date();
      d.setDate(1);
      desde = d.toISOString().split('T')[0];
    } else if (preset === 'all') {
      desde = '2020-01-01';
    }

    this.filtroFecha.set({ desde, hasta });
    this.stats.loadTurnosPorMedico(this.filtroFecha());
  }

  formatDate(iso: string): string {
    if (!iso) return '-';
    return new Date(iso).toLocaleString('es-AR', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  }

  getRoleBadgeClass(role: string): string {
    switch (role) {
      case 'administrador': return 'bg-violet-100 text-violet-700';
      case 'especialista': return 'bg-teal-100 text-teal-700';
      case 'paciente': return 'bg-emerald-100 text-emerald-700';
      default: return 'bg-slate-100 text-slate-600';
    }
  }

  private getDefaultDesde(): string {
    const d = new Date();
    d.setMonth(d.getMonth() - 1);
    return d.toISOString().split('T')[0];
  }

  private getDefaultHasta(): string {
    return new Date().toISOString().split('T')[0];
  }

  exportarEspecialidadExcel(): void { exportarTurnosPorEspecialidadExcel(this.stats.turnosPorEspecialidad()); }
  exportarEspecialidadPDF(): void {
    const chartImg = this.donutChart?.chart?.toBase64Image();
    exportarTurnosPorEspecialidadPDF(this.stats.turnosPorEspecialidad(), chartImg);
  }
  exportarDiaExcel(): void { exportarTurnosPorDiaExcel(this.stats.turnosPorDia()); }
  exportarDiaPDF(): void {
    const chartImg = this.barChart?.chart?.toBase64Image();
    exportarTurnosPorDiaPDF(this.stats.turnosPorDia(), chartImg);
  }
  exportarMedicoExcel(): void { exportarTurnosPorMedicoExcel(this.stats.turnosPorMedico()); }
  exportarMedicoPDF(): void {
    const chartImg = this.medicoChart?.chart?.toBase64Image();
    exportarTurnosPorMedicoPDF(this.stats.turnosPorMedico(), chartImg);
  }
  exportarLogExcel(): void { exportarLogAccesosExcel(this.stats.accessLogs()); }
  exportarLogPDF(): void { exportarLogAccesosPDF(this.stats.accessLogs()); }

  nextLogsPage(): void {
    if (this.logsPage() < this.totalLogsPages()) {
      this.logsPage.update(p => p + 1);
    }
  }

  prevLogsPage(): void {
    if (this.logsPage() > 1) {
      this.logsPage.update(p => p - 1);
    }
  }

  goToLogsPage(page: number): void {
    if (page >= 1 && page <= this.totalLogsPages()) {
      this.logsPage.set(page);
    }
  }
}