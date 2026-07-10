import { Component, inject, OnInit, signal } from '@angular/core';
import { UpperCasePipe } from '@angular/common';
import { AuthService } from '@core/services/auth.service';
import { MedicalRecordsService } from '@features/medical-history/services/medical-records.service';
import { MedicalRecordConRelaciones } from '@features/medical-history/models/medical-record.model';
import { MedicalHistoryListComponent } from '@features/medical-history/components/medical-history-list/medical-history-list.component';

/**
 * Interfaz para el paciente atendido por el especialista.
 * Se extrae de las historias clinicas para evitar consultas adicionales.
 */
interface PacienteAtendido {
  readonly id: string;
  readonly full_name: string;
  readonly email: string;
  readonly totalConsultas: number;
}

/**
 * Pagina de gestion de pacientes para el perfil de Especialista.
 *
 * Muestra unicamente los pacientes que el especialista autenticado
 * haya atendido al menos una vez. Al seleccionar un paciente de
 * la lista, despliega un panel con su historial clinico completo.
 *
 * Caracteristicas:
 * - Lista filtrada de pacientes atendidos
 * - Panel expandible con historial cronologico
 * - Diseño responsive con Tailwind CSS v4
 */
@Component({
  selector: 'app-patient-list',
  standalone: true,
  imports: [MedicalHistoryListComponent, UpperCasePipe],
  template: `
    <div class="min-h-full">
      <div class="mb-6">
        <h1 class="text-2xl font-bold text-gray-900">Mis Pacientes</h1>
        <p class="text-sm text-gray-500 mt-1">
          Pacientes que has atendido al menos una vez.
        </p>
      </div>

      @if (isLoading()) {
        <div class="flex flex-col items-center justify-center py-16">
          <div class="w-10 h-10 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mb-4"></div>
          <p class="text-sm text-gray-500">Cargando pacientes...</p>
        </div>
      } @else if (pacientes().length === 0) {
        <div class="flex flex-col items-center justify-center py-16 px-4">
          <div class="w-16 h-16 mb-4 rounded-full bg-gray-100 flex items-center justify-center">
            <svg class="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"
                d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <h3 class="text-lg font-semibold text-gray-700 mb-1">Sin pacientes atendidos</h3>
          <p class="text-sm text-gray-500 text-center max-w-sm">
            Aun no has realizado consultas medicas con ningun paciente.
          </p>
        </div>
      } @else {
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div class="lg:col-span-1 space-y-3">
            <h2 class="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
              Pacientes ({{ pacientes().length }})
            </h2>
            @for (paciente of pacientes(); track paciente.id) {
              <button
                type="button"
                (click)="seleccionarPaciente(paciente)"
                [class]="pacienteSeleccionado()?.id === paciente.id
                  ? 'w-full px-4 py-3 bg-blue-50 border-2 border-blue-200 rounded-xl text-left transition-all duration-200'
                  : 'w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-left hover:border-blue-200 hover:bg-blue-50/30 transition-all duration-200'">
                <div class="flex items-center justify-between">
                  <div class="flex items-center gap-3 min-w-0">
                    <div class="flex-shrink-0 w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                      <span class="text-sm font-semibold text-blue-600">
                        {{ paciente.full_name.charAt(0) | uppercase }}
                      </span>
                    </div>
                    <div class="min-w-0">
                      <p class="text-sm font-semibold text-gray-900 truncate">{{ paciente.full_name }}</p>
                      <p class="text-xs text-gray-500 truncate">{{ paciente.email }}</p>
                    </div>
                  </div>
                  <span class="flex-shrink-0 text-xs font-medium text-blue-600 bg-blue-100 px-2 py-1 rounded-full">
                    {{ paciente.totalConsultas }} consulta{{ paciente.totalConsultas > 1 ? 's' : '' }}
                  </span>
                </div>
              </button>
            }
          </div>

          <div class="lg:col-span-2">
            @if (pacienteSeleccionado()) {
              <div class="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
                <div class="flex items-center justify-between mb-4">
                  <div>
                    <h2 class="text-lg font-semibold text-gray-900">
                      Historial de {{ pacienteSeleccionado()!.full_name }}
                    </h2>
                    <p class="text-sm text-gray-500">{{ pacienteSeleccionado()!.email }}</p>
                  </div>
                  <button
                    type="button"
                    (click)="cerrarPanel()"
                    class="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                    title="Cerrar panel">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                @if (isLoadingHistorial()) {
                  <div class="flex flex-col items-center justify-center py-12">
                    <div class="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mb-3"></div>
                    <p class="text-sm text-gray-500">Cargando historial...</p>
                  </div>
                } @else {
                  <app-medical-history-list [records]="historialPaciente()" />
                }
              </div>
            } @else {
              <div class="flex flex-col items-center justify-center py-16 px-4 bg-white border border-gray-200 rounded-xl">
                <div class="w-12 h-12 mb-3 rounded-full bg-blue-50 flex items-center justify-center">
                  <svg class="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"
                      d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
                  </svg>
                </div>
                <p class="text-sm text-gray-500 text-center">
                  Selecciona un paciente de la izquierda para ver su historial clinico.
                </p>
              </div>
            }
          </div>
        </div>
      }
    </div>
  `,
})
export class PatientListComponent implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly medicalRecordsService = inject(MedicalRecordsService);

  /** Lista de pacientes atendidos por el especialista. */
  readonly pacientes = signal<readonly PacienteAtendido[]>([]);

  /** Paciente actualmente seleccionado. */
  readonly pacienteSeleccionado = signal<PacienteAtendido | null>(null);

  /** Historial clinico del paciente seleccionado. */
  readonly historialPaciente = signal<readonly MedicalRecordConRelaciones[]>([]);

  /** Estado de carga inicial. */
  readonly isLoading = signal(true);

  /** Estado de carga del historial. */
  readonly isLoadingHistorial = signal(false);

  async ngOnInit(): Promise<void> {
    await this.cargarPacientesAtendidos();
  }

  /**
   * Carga la lista de pacientes unicos atendidos por el especialista.
   * Extrae pacientes unicos de las historias clinicas del especialista.
   */
  private async cargarPacientesAtendidos(): Promise<void> {
    this.isLoading.set(true);
    const perfil = this.authService.userProfile();

    if (!perfil) {
      this.isLoading.set(false);
      return;
    }

    this.medicalRecordsService.getHistoryBySpecialistId(perfil.id).subscribe({
      next: (records) => {
        const pacientesMap = new Map<string, PacienteAtendido>();

        for (const record of records) {
          if (!record.paciente) continue;

          const existing = pacientesMap.get(record.paciente_id);
          if (existing) {
            pacientesMap.set(record.paciente_id, {
              ...existing,
              totalConsultas: existing.totalConsultas + 1,
            });
          } else {
            pacientesMap.set(record.paciente_id, {
              id: record.paciente.id,
              full_name: record.paciente.full_name,
              email: record.paciente.email,
              totalConsultas: 1,
            });
          }
        }

        this.pacientes.set(Array.from(pacientesMap.values()));
        this.isLoading.set(false);
      },
      error: () => {
        this.isLoading.set(false);
      },
    });
  }

  /**
   * Selecciona un paciente y carga su historial clinico completo.
   *
   * @param paciente Paciente seleccionado de la lista.
   */
  seleccionarPaciente(paciente: PacienteAtendido): void {
    this.pacienteSeleccionado.set(paciente);
    this.cargarHistorialPaciente(paciente.id);
  }

  /**
   * Carga el historial clinico completo de un paciente.
   *
   * @param pacienteId UUID del paciente.
   */
  private cargarHistorialPaciente(pacienteId: string): void {
    this.isLoadingHistorial.set(true);
    this.historialPaciente.set([]);

    this.medicalRecordsService.getHistoryByPatientId(pacienteId).subscribe({
      next: (records) => {
        this.historialPaciente.set(records);
        this.isLoadingHistorial.set(false);
      },
      error: () => {
        this.isLoadingHistorial.set(false);
      },
    });
  }

  /**
   * Cierra el panel de historial y deselecciona el paciente.
   */
  cerrarPanel(): void {
    this.pacienteSeleccionado.set(null);
    this.historialPaciente.set([]);
  }
}
