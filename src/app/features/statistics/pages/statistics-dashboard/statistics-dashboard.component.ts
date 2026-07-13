import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { BaseChartDirective } from 'ng2-charts';
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

/**
 * Pagina de estadisticas y reportes exclusiva del administrador.
 *
 * Visualiza graficos interactivos con datos reales de Supabase:
 * - Log de accesos al sistema
 * - Turnos por especialidad (donut)
 * - Turnos por dia de la semana (barras)
 * - Turnos por medico (barras agrupadas, filtrable por fecha)
 * - Turnos finalizados por medico (barras agrupadas, filtrable por fecha)
 *
 * Cada grafico incluye controles de exportacion Excel/PDF.
 */
@Component({
  selector: 'app-statistics-dashboard',
  standalone: true,
  imports: [FormsModule, BaseChartDirective],
  animations: [fadeIn, slideUp],
  template: `
    <div @fadeIn class="min-h-full">
      <div @slideUp class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 class="text-2xl font-bold text-gray-900">Estadisticas</h1>
          <p class="text-sm text-gray-500 mt-1">
            Metricas operativas y de calidad de servicio.
          </p>
        </div>
      </div>

      @if (stats.isLoading()) {
        <div class="flex flex-col items-center justify-center py-20">
          <div class="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mb-4"></div>
          <p class="text-sm text-gray-500">Cargando estadisticas...</p>
        </div>
      } @else if (isDataEmpty()) {
        <div class="flex flex-col items-center justify-center py-20 bg-white border border-gray-200 rounded-xl">
          <div class="w-16 h-16 mb-4 rounded-full bg-gray-100 flex items-center justify-center">
            <svg class="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h3 class="text-lg font-semibold text-gray-700 mb-1">Sin registros disponibles</h3>
          <p class="text-sm text-gray-500 text-center max-w-md">
            No se encontraron registros clinicos en el rango de fechas seleccionado.
          </p>
        </div>
      } @else {
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div class="bg-white border border-gray-200 rounded-xl p-5">
            <p class="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Total usuarios</p>
            <p class="text-3xl font-bold text-blue-600">{{ stats.totalUsuarios() }}</p>
          </div>
          <div class="bg-white border border-gray-200 rounded-xl p-5">
            <p class="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Turnos del mes</p>
            <p class="text-3xl font-bold text-emerald-600">{{ stats.turnosDelMes() }}</p>
          </div>
          <div class="bg-white border border-gray-200 rounded-xl p-5">
            <p class="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Pendientes aprobacion</p>
            <p class="text-3xl font-bold text-amber-600">{{ stats.especialistasPendientes() }}</p>
          </div>
          <div class="bg-white border border-gray-200 rounded-xl p-5">
            <p class="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Historias clinicas</p>
            <p class="text-3xl font-bold text-purple-600">{{ stats.totalHistorias() }}</p>
          </div>
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <div class="bg-white border border-gray-200 rounded-xl p-5">
            <div class="flex items-center justify-between mb-4">
              <div>
                <h3 class="text-sm font-semibold text-gray-700">Turnos por especialidad</h3>
                <p class="text-xs text-gray-500">Distribucion por area medica</p>
              </div>
              <div class="flex gap-1">
                <button type="button" (click)="exportarEspecialidadExcel()" class="p-2 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors" title="Exportar Excel">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                </button>
                <button type="button" (click)="exportarEspecialidadPDF()" class="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Exportar PDF">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                </button>
              </div>
            </div>
            @if (stats.turnosPorEspecialidad().length > 0) {
              <canvas baseChart
                [data]="donutData()"
                [options]="donutOptions"
                type="doughnut">
              </canvas>
            } @else {
              <p class="text-sm text-gray-400 text-center py-8">Sin datos disponibles</p>
            }
          </div>

          <div class="bg-white border border-gray-200 rounded-xl p-5">
            <div class="flex items-center justify-between mb-4">
              <div>
                <h3 class="text-sm font-semibold text-gray-700">Turnos por dia de la semana</h3>
                <p class="text-xs text-gray-500">Promedio historico</p>
              </div>
              <div class="flex gap-1">
                <button type="button" (click)="exportarDiaExcel()" class="p-2 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors" title="Exportar Excel">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                </button>
                <button type="button" (click)="exportarDiaPDF()" class="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Exportar PDF">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                </button>
              </div>
            </div>
            @if (stats.turnosPorDia().length > 0) {
              <canvas baseChart
                [data]="barData()"
                [options]="barOptions"
                type="bar">
              </canvas>
            } @else {
              <p class="text-sm text-gray-400 text-center py-8">Sin datos disponibles</p>
            }
          </div>
        </div>

        <div class="bg-white border border-gray-200 rounded-xl p-5 mb-8">
          <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
            <div>
              <h3 class="text-sm font-semibold text-gray-700">Turnos por medico</h3>
              <p class="text-xs text-gray-500">Solicitados vs finalizados en rango de fechas</p>
            </div>
            <div class="flex flex-wrap items-center gap-3">
              <div class="flex items-center gap-2">
                <label class="text-xs text-gray-500">Desde:</label>
                <input type="date" [ngModel]="filtroFecha().desde" (ngModelChange)="onFechaDesdeChange($event)" class="px-2 py-1 text-xs border border-gray-200 rounded-lg outline-none focus:border-blue-300" />
              </div>
              <div class="flex items-center gap-2">
                <label class="text-xs text-gray-500">Hasta:</label>
                <input type="date" [ngModel]="filtroFecha().hasta" (ngModelChange)="onFechaHastaChange($event)" class="px-2 py-1 text-xs border border-gray-200 rounded-lg outline-none focus:border-blue-300" />
              </div>
              <div class="flex gap-1">
                <button type="button" (click)="exportarMedicoExcel()" class="p-2 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors" title="Exportar Excel">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                </button>
                <button type="button" (click)="exportarMedicoPDF()" class="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Exportar PDF">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                </button>
              </div>
            </div>
          </div>
          @if (stats.turnosPorMedico().length > 0) {
            <canvas baseChart
              [data]="medicoData()"
              [options]="medicoOptions"
              type="bar">
            </canvas>
          } @else {
            <p class="text-sm text-gray-400 text-center py-8">Selecciona un rango de fechas para ver los datos</p>
          }
        </div>

        <div class="bg-white border border-gray-200 rounded-xl p-5">
          <div class="flex items-center justify-between mb-4">
            <div>
              <h3 class="text-sm font-semibold text-gray-700">Log de accesos al sistema</h3>
              <p class="text-xs text-gray-500">Registro de ingresos recientes</p>
            </div>
            <div class="flex gap-1">
              <button type="button" (click)="exportarLogExcel()" class="p-2 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors" title="Exportar Excel">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
              </button>
              <button type="button" (click)="exportarLogPDF()" class="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Exportar PDF">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
              </button>
            </div>
          </div>
          <div class="overflow-x-auto">
            <table class="w-full text-sm">
              <thead>
                <tr class="border-b border-gray-200">
                  <th class="text-left py-2 text-xs font-semibold text-gray-500">Usuario</th>
                  <th class="text-left py-2 text-xs font-semibold text-gray-500">Email</th>
                  <th class="text-left py-2 text-xs font-semibold text-gray-500">Rol</th>
                  <th class="text-left py-2 text-xs font-semibold text-gray-500">Fecha/Hora</th>
                </tr>
              </thead>
              <tbody>
                @for (entry of stats.accessLogs(); track entry.userId) {
                  <tr class="border-b border-gray-50 hover:bg-gray-50">
                    <td class="py-2.5 text-gray-900 font-medium">{{ entry.fullName }}</td>
                    <td class="py-2.5 text-gray-500">{{ entry.email }}</td>
                    <td class="py-2.5">
                      <span class="px-2 py-0.5 text-xs font-medium rounded-full"
                        [class]="entry.role === 'administrador' ? 'bg-purple-100 text-purple-700' : entry.role === 'especialista' ? 'bg-blue-100 text-blue-700' : 'bg-emerald-100 text-emerald-700'">
                        {{ entry.role }}
                      </span>
                    </td>
                    <td class="py-2.5 text-gray-500">{{ formatDate(entry.loginAt) }}</td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        </div>
      }
    </div>
  `,
})
export class StatisticsDashboardComponent implements OnInit {
  readonly stats = inject(StatisticsService);

  readonly isDataEmpty = computed(() =>
    this.stats.totalUsuarios() === 0 &&
    this.stats.turnosDelMes() === 0 &&
    this.stats.totalHistorias() === 0
  );

  readonly filtroFecha = signal<DateRangeFilter>({
    desde: this.getDefaultDesde(),
    hasta: this.getDefaultHasta(),
  });

  readonly donutOptions: ChartConfiguration<'doughnut'>['options'] = {
    responsive: true,
    maintainAspectRatio: true,
    plugins: {
      legend: { position: 'right', labels: { boxWidth: 12, padding: 12 } },
    },
  };

  readonly barOptions: ChartConfiguration<'bar'>['options'] = {
    responsive: true,
    maintainAspectRatio: true,
    plugins: { legend: { display: false } },
    scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } },
  };

  readonly medicoOptions: ChartConfiguration<'bar'>['options'] = {
    responsive: true,
    maintainAspectRatio: true,
    plugins: { legend: { position: 'top', labels: { boxWidth: 12 } } },
    scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } },
  };

  readonly COLORES = [
    '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6',
    '#EC4899', '#06B6D4', '#84CC16', '#F97316', '#6366F1',
  ];

  readonly donutData = signal<ChartData<'doughnut'>>({
    labels: [],
    datasets: [{ data: [], backgroundColor: this.COLORES }],
  });

  readonly barData = signal<ChartData<'bar'>>({
    labels: [],
    datasets: [{ data: [], backgroundColor: '#3B82F6', borderRadius: 6 }],
  });

  readonly medicoData = signal<ChartData<'bar'>>({
    labels: [],
    datasets: [
      { label: 'Solicitados', data: [], backgroundColor: '#3B82F6', borderRadius: 6 },
      { label: 'Finalizados', data: [], backgroundColor: '#10B981', borderRadius: 6 },
    ],
  });

  ngOnInit(): void {
    this.stats.loadAllStats().then(() => {
      this.updateChartData();
      this.loadMedicoData();
    });
  }

  private updateChartData(): void {
    const espData = this.stats.turnosPorEspecialidad();
    this.donutData.set({
      labels: espData.map(d => d.especialidad),
      datasets: [{ data: espData.map(d => d.cantidad), backgroundColor: this.COLORES }],
    });

    const diaData = this.stats.turnosPorDia();
    this.barData.set({
      labels: diaData.map(d => d.dia),
      datasets: [{ data: diaData.map(d => d.cantidad), backgroundColor: '#3B82F6', borderRadius: 6 }],
    });
  }

  private async loadMedicoData(): Promise<void> {
    await this.stats.loadTurnosPorMedico(this.filtroFecha());
    const medData = this.stats.turnosPorMedico();
    this.medicoData.set({
      labels: medData.map(d => d.medico),
      datasets: [
        { label: 'Solicitados', data: medData.map(d => d.solicitados), backgroundColor: '#3B82F6', borderRadius: 6 },
        { label: 'Finalizados', data: medData.map(d => d.finalizados), backgroundColor: '#10B981', borderRadius: 6 },
      ],
    });
  }

  onFechaDesdeChange(value: string): void {
    this.filtroFecha.update(f => ({ ...f, desde: value }));
    this.loadMedicoData();
  }

  onFechaHastaChange(value: string): void {
    this.filtroFecha.update(f => ({ ...f, hasta: value }));
    this.loadMedicoData();
  }

  formatDate(iso: string): string {
    return new Date(iso).toLocaleString('es-AR', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
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
  exportarEspecialidadPDF(): void { exportarTurnosPorEspecialidadPDF(this.stats.turnosPorEspecialidad()); }
  exportarDiaExcel(): void { exportarTurnosPorDiaExcel(this.stats.turnosPorDia()); }
  exportarDiaPDF(): void { exportarTurnosPorDiaPDF(this.stats.turnosPorDia()); }
  exportarMedicoExcel(): void { exportarTurnosPorMedicoExcel(this.stats.turnosPorMedico()); }
  exportarMedicoPDF(): void { exportarTurnosPorMedicoPDF(this.stats.turnosPorMedico()); }
  exportarLogExcel(): void { exportarLogAccesosExcel(this.stats.accessLogs()); }
  exportarLogPDF(): void { exportarLogAccesosPDF(this.stats.accessLogs()); }
}
