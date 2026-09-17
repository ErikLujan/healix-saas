import { Component, computed, inject, signal, HostListener, DestroyRef, OnInit } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { UpperCasePipe } from '@angular/common';
import { LucideDynamicIcon } from '@lucide/angular';
import { toast } from 'ngx-sonner';
import { AuthService } from '@core/services/auth.service';
import { TurnosService } from '@core/services/turnos.service';
import { MedicalRecordsService } from '@features/medical-history/services/medical-records.service';
import { MedicalRecordConRelaciones } from '@features/medical-history/models/medical-record.model';
import { PacienteAtendido } from '../../models/patient-portfolio.model';
import { FormatDniPipe } from '@shared/pipes/format-dni.pipe';
import { PatientDrawerComponent } from '../../components/patient-drawer/patient-drawer.component';

@Component({
  selector: 'app-patient-list',
  standalone: true,
  imports: [UpperCasePipe, LucideDynamicIcon, FormatDniPipe, PatientDrawerComponent],
  templateUrl: './patient-list.component.html',
  styleUrls: ['./patient-list.component.scss'],
})
export class PatientListComponent implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly turnosService = inject(TurnosService);
  private readonly medicalRecordsService = inject(MedicalRecordsService);
  private readonly destroyRef = inject(DestroyRef);

  readonly pacientes = signal<readonly PacienteAtendido[]>([]);
  readonly isLoading = signal(true);
  readonly searchQuery = signal('');

  /**
   * Pacientes filtrados por busqueda libre.
   * El correo es opcional tras el endurecimiento RLS (solo propietario
   * y administrador pueden leerlo), por eso se protege con `?? ''`.
   */
  readonly filteredPatients = computed(() => {
    const query = this.searchQuery().trim().toLowerCase();
    const list = this.pacientes();
    if (!query) return list;
    return list.filter(
      (p) =>
        p.full_name.toLowerCase().includes(query) ||
        (p.email ?? '').toLowerCase().includes(query) ||
        (p.dni && p.dni.includes(query)),
    );
  });

  readonly isDrawerOpen = signal(false);
  readonly drawerPaciente = signal<PacienteAtendido | null>(null);
  readonly drawerRecords = signal<readonly MedicalRecordConRelaciones[]>([]);
  readonly isDrawerLoading = signal(false);

  ngOnInit(): void {
    this.cargarPacientesAtendidos();
  }

  @HostListener('window:keydown.escape')
  onEscapeKey(): void {
    if (this.isDrawerOpen()) this.closeDrawer();
  }

  private cargarPacientesAtendidos(): void {
    this.isLoading.set(true);
    const perfil = this.authService.userProfile();

    if (!perfil) {
      this.isLoading.set(false);
      return;
    }

    const userRole = this.authService.userRole();

    if (userRole === 'administrador') {
      this.cargarPacientesAdmin(perfil.id);
    } else {
      this.cargarPacientesEspecialista(perfil.id);
    }
  }

  private cargarPacientesEspecialista(especialistaId: string): void {
    this.turnosService.obtenerTurnosPorEspecialista(especialistaId)
      .then((turnos) => {
        const turnosFinalizados = turnos.filter((t) => t.estado === 'finalizado');
        this.pacientes.set(this.construirPortfolio(turnosFinalizados));
        this.isLoading.set(false);
      })
      .catch(() => {
        toast.error('No se pudo cargar el portafolio de pacientes. Intenta nuevamente.');
        this.isLoading.set(false);
      });
  }

  private cargarPacientesAdmin(adminId: string): void {
    this.medicalRecordsService.getAllRecords()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
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
                dni: record.paciente.dni,
                avatar_url: record.paciente.avatar_url ?? undefined,
                totalConsultas: 1,
              });
            }
          }

          this.pacientes.set(Array.from(pacientesMap.values()));
          this.isLoading.set(false);
        },
        error: () => {
          toast.error('No se pudieron cargar los pacientes. Intenta nuevamente.');
          this.isLoading.set(false);
        },
      });
  }

  /**
   * Construye el portafolio deduplicado de pacientes desde turnos.
   * El correo puede ausentarse tras el endurecimiento RLS de `profiles`.
   *
   * @param turnos Turnos finalizados con relacion de paciente resuelta.
   * @returns Portafolio deduplicado con conteo de consultas.
   */
  private construirPortfolio(
    turnos: readonly { paciente_id: string; paciente?: { id: string; full_name: string; email?: string; avatar_url?: string | null } }[],
  ): PacienteAtendido[] {
    const pacientesMap = new Map<string, PacienteAtendido>();

    for (const turno of turnos) {
      if (!turno.paciente) continue;

      const existing = pacientesMap.get(turno.paciente_id);
      if (existing) {
        pacientesMap.set(turno.paciente_id, {
          ...existing,
          totalConsultas: existing.totalConsultas + 1,
        });
      } else {
        pacientesMap.set(turno.paciente_id, {
          id: turno.paciente.id,
          full_name: turno.paciente.full_name,
          email: turno.paciente.email,
          avatar_url: turno.paciente.avatar_url ?? undefined,
          totalConsultas: 1,
        });
      }
    }

    return Array.from(pacientesMap.values());
  }

  openDrawer(paciente: PacienteAtendido): void {
    this.drawerPaciente.set(paciente);
    this.isDrawerOpen.set(true);
    this.isDrawerLoading.set(true);
    this.drawerRecords.set([]);

    this.medicalRecordsService.getHistoryByPatientId(paciente.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (records) => {
          this.drawerRecords.set(records);
          this.isDrawerLoading.set(false);
        },
        error: () => {
          toast.error('No se pudo cargar el historial clínico del paciente.');
          this.isDrawerLoading.set(false);
        },
      });
  }

  closeDrawer(): void {
    this.isDrawerOpen.set(false);
    this.drawerPaciente.set(null);
    this.drawerRecords.set([]);
  }

  onSearchInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.searchQuery.set(input.value);
  }

  clearSearch(): void {
    this.searchQuery.set('');
  }
}
