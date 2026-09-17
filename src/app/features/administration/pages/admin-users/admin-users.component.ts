import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminUsersService, AdminUser } from '../../services/admin-users.service';
import { AdminUsersModalComponent } from '../admin-users-modal/admin-users-modal.component';
import { PaginationComponent } from '@shared/components/pagination/pagination.component';
import { modalBackdrop, modalContent, tableRowStagger, fadeSlideRow, statusBadge, slideDown } from '../../animations/admin-animations';
import { ExcelExportService } from '@features/medical-history/services/excel-export.service';
import { MedicalRecordsService } from '@features/medical-history/services/medical-records.service';
import { MedicalHistoryListComponent } from '@features/medical-history/components/medical-history-list/medical-history-list.component';
import { MedicalRecordConRelaciones } from '@features/medical-history/models/medical-record.model';
import { FallbackAvatarDirective } from '@shared/directives/fallback-avatar.directive';

/**
 * Panel unificado de administracion de usuarios.
 *
 * Muestra la grilla completa de usuarios del sistema con busqueda
 * elastica, filtro por rol, paginacion reactiva de 5 registros
 * y acciones de aprobar/rechazar especialistas. Incluye modal
 * para creacion de nuevos administradores.
 */
@Component({
  selector: 'app-admin-users',
  standalone: true,
  imports: [CommonModule, FormsModule, AdminUsersModalComponent, PaginationComponent, MedicalHistoryListComponent, FallbackAvatarDirective],
  templateUrl: './admin-users.component.html',
  styleUrl: './admin-users.component.scss',
  animations: [modalBackdrop, modalContent, tableRowStagger, fadeSlideRow, statusBadge, slideDown],
})
export class AdminUsersComponent implements OnInit {
  private readonly adminUsersService = inject(AdminUsersService);
  private readonly excelExportService = inject(ExcelExportService);
  private readonly medicalRecordsService = inject(MedicalRecordsService);

  readonly users = this.adminUsersService.users;
  readonly isLoading = this.adminUsersService.isLoading;
  readonly searchQuery = signal('');
  readonly selectedRole = signal<string>('all');
  readonly showModal = signal(false);
  readonly loadingApprovalId = signal<string | null>(null);

  readonly currentPage = signal(1);

  /** Paciente seleccionado para auditar su historial clinico. */
  readonly pacienteSeleccionado = signal<AdminUser | null>(null);

  /** Historial clinico del paciente seleccionado. */
  readonly historialPaciente = signal<readonly MedicalRecordConRelaciones[]>([]);

  /** Estado de carga del historial. */
  readonly isLoadingHistorial = signal(false);

  /** Estado de exportacion Excel. */
  readonly isExportingExcel = signal(false);

  /** Cantidad de registros visibles por pagina en la tabla. */
  private readonly ITEMS_PER_PAGE = 5;

  /** Total de usuarios que coinciden con los filtros activos (busqueda + rol). */
  readonly totalFilteredCount = computed(() => {
    let result = this.users();
    const query = this.searchQuery().toLowerCase().trim();
    const role = this.selectedRole();

    if (query) {
      result = result.filter(u =>
        u.full_name.toLowerCase().includes(query) ||
        u.email.toLowerCase().includes(query),
      );
    }

    if (role !== 'all') {
      result = result.filter(u => u.role === role);
    }

    return result.length;
  });

  /** Porcion paginada del array filtrado para la pagina actual. */
  readonly filteredUsers = computed(() => {
    let result = this.users();
    const query = this.searchQuery().toLowerCase().trim();
    const role = this.selectedRole();

    if (query) {
      result = result.filter(u =>
        u.full_name.toLowerCase().includes(query) ||
        u.email.toLowerCase().includes(query),
      );
    }

    if (role !== 'all') {
      result = result.filter(u => u.role === role);
    }

    const start = (this.currentPage() - 1) * this.ITEMS_PER_PAGE;
    const end = start + this.ITEMS_PER_PAGE;
    return result.slice(start, end);
  });

  /** Cantidad total de paginas disponibles segun el total filtrado. */
  readonly totalPages = computed(() =>
    Math.ceil(this.totalFilteredCount() / this.ITEMS_PER_PAGE),
  );

  /** Cantidad de especialistas con is_approved en false. */
  readonly pendingCount = computed(() =>
    this.users().filter(u => u.role === 'especialista' && u.especialistas && !u.especialistas.is_approved).length,
  );

  /** KPI: Total de usuarios registrados. */
  readonly totalUsuarios = computed(() => this.users().length);

  /** KPI: Pacientes verificados (is_verified = true). */
  readonly pacientesVerificados = computed(() =>
    this.users().filter(u => u.role === 'paciente').length,
  );

  /** KPI: Especialistas aprobados (is_approved = true). */
  readonly especialistasAprobados = computed(() =>
    this.users().filter(u => u.role === 'especialista' && u.especialistas?.is_approved).length,
  );

  /** KPI: Administradores totales. */
  readonly totalAdmins = computed(() =>
    this.users().filter(u => u.role === 'administrador').length,
  );

  ngOnInit(): void {
    this.adminUsersService.loadUsers();
  }

  /**
   * Actualiza el texto de busqueda y resetea la paginacion a la primera pagina.
   *
   * @param value Texto de busqueda ingresado por el usuario.
   */
  onSearchChange(value: string): void {
    this.searchQuery.set(value);
    this.currentPage.set(1);
  }

  /**
   * Filtra por rol seleccionado y resetea la paginacion a la primera pagina.
   *
   * @param value Codigo del rol seleccionado ('all' para todos).
   */
  onRoleChange(value: string): void {
    this.selectedRole.set(value);
    this.currentPage.set(1);
  }

  /** Maneja el cambio de pagina desde el componente de paginacion. */
  onPageChange(page: number): void {
    this.currentPage.set(page);
  }

  /**
   * Extrae las iniciales de un nombre completo para el avatar generico.
   *
   * @param name Nombre completo del usuario.
   * @returns Hasta 2 iniciales en mayusculas.
   */
  getInitials(name: string): string {
    return name
      .split(' ')
      .map(part => part.charAt(0))
      .slice(0, 2)
      .join('')
      .toUpperCase();
  }

  /**
   * Retorna las clases de Tailwind CSS para el badge de rol.
   *
   * @param role Codigo del rol del usuario.
   * @returns Cadena de clases CSS para el badge.
   */
  getRoleBadgeClass(role: string): string {
    const base = 'px-2.5 py-0.5 rounded-full text-xs font-medium';
    switch (role) {
      case 'paciente':
        return `${base} bg-emerald-100 text-emerald-700`;
      case 'especialista':
        return `${base} bg-brand-100 text-brand-700`;
      case 'administrador':
        return `${base} bg-violet-100 text-violet-700`;
      default:
        return `${base} bg-gray-100 text-gray-700`;
    }
  }

  /**
   * Verifica si un especialista se encuentra pendiente de aprobacion.
   *
   * @param user Objeto de usuario a evaluar.
   * @returns true si es especialista y no esta aprobado.
   */
  isPendingSpecialist(user: AdminUser): boolean {
    return user.role === 'especialista' && !!user.especialistas && !user.especialistas.is_approved;
  }

  /**
   * Verifica si un especialista se encuentra activo (aprobado).
   *
   * @param user Objeto de usuario a evaluar.
   * @returns true si es especialista y esta aprobado.
   */
  isActiveSpecialist(user: AdminUser): boolean {
    return user.role === 'especialista' && !!user.especialistas && user.especialistas.is_approved;
  }

  /**
   * Formatea una cadena ISO de fecha al formato argentino dd/mm/yyyy.
   *
   * @param dateStr Cadena de fecha en formato ISO.
   * @returns Fecha formateada en locales es-AR.
   */
  formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString('es-AR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  }

  /**
   * Aprueba un especialista activando su cuenta y recargando la grilla.
   *
   * @param userId Identificador del especialista a aprobar.
   */
  async onApprove(userId: string): Promise<void> {
    this.loadingApprovalId.set(userId);
    await this.adminUsersService.approveSpecialist(userId);
    this.loadingApprovalId.set(null);
  }

  /**
   * Rechaza un especialista desactivando su cuenta y recargando la grilla.
   *
   * @param userId Identificador del especialista a rechazar.
   */
  async onReject(userId: string): Promise<void> {
    this.loadingApprovalId.set(userId);
    await this.adminUsersService.rejectSpecialist(userId);
    this.loadingApprovalId.set(null);
  }

  openModal(): void {
    this.showModal.set(true);
  }

  closeModal(): void {
    this.showModal.set(false);
  }

  onUserCreated(): void {
    this.closeModal();
  }

  /**
   * Exporta la lista completa de usuarios a un archivo Excel.
   * Incluye todos los usuarios sin importar el filtro activo.
   */
  exportarExcelUsuarios(): void {
    this.isExportingExcel.set(true);

    const usuariosParaExportar = this.users().map((u) => ({
      id: u.id,
      full_name: u.full_name,
      email: u.email,
      dni: u.pacientes?.dni ?? u.especialistas?.dni ?? u.administradores?.dni,
      edad: u.pacientes?.edad ?? u.especialistas?.edad ?? u.administradores?.edad,
      role: u.role,
      created_at: u.created_at,
    }));

    setTimeout(() => {
      this.excelExportService.exportarUsuarios(usuariosParaExportar, 'usuarios-registrados');
      this.isExportingExcel.set(false);
    }, 100);
  }

  /**
   * Selecciona un paciente para auditar su historial clinico.
   *
   * @param user Usuario paciente a seleccionar.
   */
  seleccionarPacienteHistorial(user: AdminUser): void {
    this.pacienteSeleccionado.set(user);
    this.cargarHistorialPaciente(user.id);
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
   * Cierra el panel de historial clinico.
   */
  cerrarPanelHistorial(): void {
    this.pacienteSeleccionado.set(null);
    this.historialPaciente.set([]);
  }
}
