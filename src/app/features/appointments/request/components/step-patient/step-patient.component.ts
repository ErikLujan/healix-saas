import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { NgClass } from '@angular/common';
import { WizardTurnoService, PacienteWizard } from '../../services/wizard-turno.service';
import { AdminUsersService } from '@features/administration/services/admin-users.service';
import { FallbackAvatarDirective } from '@shared/directives/fallback-avatar.directive';

@Component({
  selector: 'app-step-patient',
  standalone: true,
  imports: [NgClass, FallbackAvatarDirective],
  templateUrl: './step-patient.component.html',
})
export class StepPatientComponent implements OnInit {
  private readonly wizard = inject(WizardTurnoService);
  private readonly adminUsersService = inject(AdminUsersService);

  readonly isLoading = signal(true);
  readonly seleccionado = this.wizard.pacienteSeleccionado;
  readonly busqueda = signal('');
  readonly errorCarga = this.adminUsersService.lastError;

  readonly pacientesFiltrados = computed(() => {
    const termino = this.busqueda().toLowerCase().trim();
    const lista = this.wizard.pacientes();
    if (!termino) return lista;
    return lista.filter(p =>
      p.full_name.toLowerCase().includes(termino) ||
      p.email.toLowerCase().includes(termino)
    );
  });

  ngOnInit(): void {
    this.cargarPacientes();
  }

  async cargarPacientes(): Promise<void> {
    this.isLoading.set(true);
    if (this.adminUsersService.users().length === 0) {
      await this.adminUsersService.loadUsers();
    }
    this.isLoading.set(false);
  }

  async reintentar(): Promise<void> {
    await this.cargarPacientes();
  }

  seleccionar(paciente: PacienteWizard): void {
    this.wizard.seleccionarPaciente(paciente);
  }

  onBusquedaChange(valor: string): void {
    this.busqueda.set(valor);
  }
}
