import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminUsersService, AdminUser } from '../../services/admin-users.service';
import { AdminUsersModalComponent } from '../admin-users-modal/admin-users-modal.component';
import { PaginationComponent } from '@shared/components/pagination/pagination.component';
import { modalBackdrop, modalContent, tableRowStagger, fadeSlideRow, statusBadge, slideDown } from '../../animations/admin-animations';

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
  imports: [CommonModule, FormsModule, AdminUsersModalComponent, PaginationComponent],
  templateUrl: './admin-users.component.html',
  styleUrl: './admin-users.component.scss',
  animations: [modalBackdrop, modalContent, tableRowStagger, fadeSlideRow, statusBadge, slideDown],
})
export class AdminUsersComponent implements OnInit {
  private readonly adminUsersService = inject(AdminUsersService);

  readonly users = this.adminUsersService.users;
  readonly isLoading = this.adminUsersService.isLoading;
  readonly searchQuery = signal('');
  readonly selectedRole = signal<string>('all');
  readonly showModal = signal(false);
  readonly loadingApprovalId = signal<string | null>(null);

  readonly currentPage = signal(1);

  /** Cantidad de registros visibles por pagina en la tabla. */
  private readonly ITEMS_PER_PAGE = 5;

  readonly roleOptions = [
    { value: 'all', label: 'Todos los roles' },
    { value: 'paciente', label: 'Paciente' },
    { value: 'especialista', label: 'Especialista' },
    { value: 'administrador', label: 'Administrador' },
  ];

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
        return `${base} bg-blue-100 text-blue-700`;
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
}
