import { Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { LucideDynamicIcon } from '@lucide/angular';
import { fadeIn, slideUp } from '@core/animations/route-animations';
import { SpecialtiesService, SpecialtyWithCount } from '../../services/specialties.service';
import { ConfirmDialogComponent } from '@shared/components/confirm-dialog/confirm-dialog.component';

/**
 * Pagina de gestion de especialidades medicas para el perfil de Administrador.
 *
 * Permite al administrador visualizar, crear, activar/desactivar y eliminar
 * especialidades del sistema. La grilla muestra tarjetas con icono, nombre,
 * descripcion, conteo de especialistas y toggle de estado.
 *
 * Caracteristicas:
 * - Grilla responsiva de tarjetas de especialidades
 * - Formulario de creacion con validaciones
 * - Toggle activo/inactivo reactivos
 * - Eliminacion con confirmacion
 * - Feedback visual mediante ngx-sonner
 */
@Component({
  selector: 'app-admin-specialties',
  standalone: true,
  imports: [FormsModule, LucideDynamicIcon, ConfirmDialogComponent],
  animations: [fadeIn, slideUp],
  template: `
    <div @fadeIn class="min-h-full">
      <div @slideUp class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 class="text-2xl font-bold text-text-primary">Especialidades</h1>
          <p class="text-sm text-text-secondary mt-1">
            Categorias medicas disponibles para reservar turnos.
          </p>
        </div>
        <button
          type="button"
          (click)="showForm.set(!showForm())"
          class="inline-flex items-center gap-2 px-4 py-2.5 bg-brand-700 text-white text-sm font-medium rounded-lg hover:bg-brand-900 transition-colors">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
          </svg>
          Nueva especialidad
        </button>
      </div>

      @if (showForm()) {
        <div @slideUp class="bg-surface border border-border rounded-xl p-5 mb-6 shadow-sm">
          <h3 class="text-sm font-semibold text-text-primary mb-3">Crear nueva especialidad</h3>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label class="block text-xs font-medium text-text-secondary mb-1">Nombre *</label>
              <input
                type="text"
                [(ngModel)]="newName"
                placeholder="Ej: Cardiologia"
                class="w-full px-3 py-2 text-sm border border-border rounded-lg focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 outline-none transition-all" />
            </div>
            <div>
              <label class="block text-xs font-medium text-text-secondary mb-1">Descripcion</label>
              <input
                type="text"
                [(ngModel)]="newDescription"
                placeholder="Breve descripcion de la especialidad"
                class="w-full px-3 py-2 text-sm border border-border rounded-lg focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 outline-none transition-all" />
            </div>
          </div>
          <div class="flex gap-2 mt-4">
            <button
              type="button"
              (click)="createSpecialty()"
              [disabled]="!newName().trim()"
              class="px-4 py-2 bg-brand-700 text-white text-sm font-medium rounded-lg hover:bg-brand-900 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
              Crear
            </button>
            <button
              type="button"
              (click)="cancelForm()"
              class="px-4 py-2 text-sm text-text-secondary hover:bg-surface-sunken rounded-lg transition-colors">
              Cancelar
            </button>
          </div>
        </div>
      }

      @if (specialtiesService.isLoading()) {
        <div class="flex justify-center py-16">
          <div class="w-10 h-10 border-4 border-brand-100 border-t-brand-700 rounded-full animate-spin"></div>
        </div>
      } @else if (specialtiesService.lastError()) {
        <div class="flex flex-col items-center justify-center py-16 text-center" role="alert">
          <div class="w-16 h-16 mb-4 rounded-full bg-danger/5 flex items-center justify-center">
            <svg lucideIcon="alert-triangle" class="w-8 h-8 text-danger/60"></svg>
          </div>
          <h3 class="text-lg font-semibold text-text-primary mb-1">No se pudieron cargar las especialidades</h3>
          <p class="text-sm text-text-secondary">{{ specialtiesService.lastError() }} Revisá tu conexión.</p>
          <button
            type="button"
            (click)="recargar()"
            class="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-brand-700 text-white text-sm font-semibold rounded-lg hover:bg-brand-900 transition-colors focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2">
            Reintentar
          </button>
        </div>
      } @else if (specialtiesService.specialties().length === 0) {
        <div class="flex flex-col items-center justify-center py-16">
          <div class="w-16 h-16 mb-4 rounded-full bg-surface-sunken flex items-center justify-center">
            <svg class="w-8 h-8 text-text-subtle" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
            </svg>
          </div>
          <h3 class="text-lg font-semibold text-text-primary mb-1">Sin especialidades</h3>
          <p class="text-sm text-text-secondary">Crea la primera especialidad medica del sistema.</p>
        </div>
      } @else {
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          @for (specialty of specialtiesService.specialties(); track specialty.id) {
            <div class="bg-surface border border-border rounded-xl p-5 hover:shadow-md transition-shadow duration-200">
              <div class="flex items-start justify-between mb-3">
                <div class="w-10 h-10 rounded-xl bg-brand-50 flex items-center justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5 text-brand-700" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M4.8 2.3A.3.3 0 1 0 5 2H4a2 2 0 0 0-2 2v5a6 6 0 0 0 6 6v0a6 6 0 0 0 6-6V4a2 2 0 0 0-2-2h-1a.2.2 0 1 0 .3.3"/>
                    <path d="M8 15v1a6 6 0 0 0 6 6v0a6 6 0 0 0 6-6v-4"/>
                    <circle cx="20" cy="10" r="2"/>
                  </svg>
                </div>
                <div class="flex gap-1">
                  <button
                    type="button"
                    (click)="solicitarEliminar(specialty)"
                    class="p-1.5 text-danger hover:bg-danger/10 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-danger/30"
                    title="Eliminar"
                    aria-label="Eliminar especialidad">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>
              <h3 class="text-base font-semibold text-text-primary mb-1">{{ specialty.name }}</h3>
              <p class="text-xs text-text-secondary mb-4 line-clamp-2">
                {{ specialty.description || 'Sin descripcion' }}
              </p>
              <div class="flex items-center justify-between pt-3 border-t border-divider">
                <span class="text-xs text-text-secondary">
                  {{ specialty.specialistCount }} especialista{{ specialty.specialistCount !== 1 ? 's' : '' }}
                </span>
                <label class="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    [checked]="specialty.is_active"
                    (change)="toggleActive(specialty)"
                    class="sr-only peer" />
                  <div class="w-9 h-5 bg-border peer-focus:ring-2 peer-focus:ring-brand-500/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-border-strong after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-brand-700"></div>
                  <span class="ml-2 text-xs font-medium" [class]="specialty.is_active ? 'text-brand-700' : 'text-text-secondary'">
                    {{ specialty.is_active ? 'Activa' : 'Inactiva' }}
                  </span>
                </label>
              </div>
            </div>
          }
        </div>
      }
      @if (confirmDelete(); as specialty) {
        <app-confirm-dialog
          titulo="Eliminar especialidad"
          [descripcion]="'¿Eliminar la especialidad ' + specialty.name + '? Esta acción no se puede deshacer.'"
          textoConfirmar="Eliminar"
          [isProcessing]="isDeleting()"
          (confirmado)="confirmarEliminar()"
          (cancelado)="cancelarEliminar()" />
      }
    </div>
  `,
})
export class AdminSpecialtiesComponent implements OnInit {
  readonly specialtiesService = inject(SpecialtiesService);

  readonly showForm = signal(false);
  readonly newName = signal('');
  readonly newDescription = signal('');

  /** Especialidad pendiente de confirmación de eliminación. */
  readonly confirmDelete = signal<SpecialtyWithCount | null>(null);

  /** Indica si la eliminación está en curso. */
  readonly isDeleting = signal(false);

  ngOnInit(): void {
    this.specialtiesService.loadSpecialties();
  }

  /** Recarga la grilla tras un error de carga. */
  recargar(): void {
    this.specialtiesService.loadSpecialties();
  }

  /**
   * Crea una nueva especialidad con el formulario actual.
   */
  async createSpecialty(): Promise<void> {
    const name = this.newName().trim();
    if (!name) return;

    await this.specialtiesService.createSpecialty(name, this.newDescription());
    this.cancelForm();
  }

  /**
   * Alterna el estado activo/inactivo de una especialidad.
   *
   * @param specialty Especialidad a actualizar.
   */
  async toggleActive(specialty: SpecialtyWithCount): Promise<void> {
    await this.specialtiesService.toggleActive(specialty.id, !specialty.is_active);
  }

  /**
   * Abre el diálogo de confirmación de eliminación.
   *
   * @param specialty Especialidad a eliminar.
   */
  solicitarEliminar(specialty: SpecialtyWithCount): void {
    this.confirmDelete.set(specialty);
  }

  /**
   * Cierra el diálogo sin eliminar.
   */
  cancelarEliminar(): void {
    if (!this.isDeleting()) {
      this.confirmDelete.set(null);
    }
  }

  /**
   * Elimina la especialidad confirmada en el diálogo.
   */
  async confirmarEliminar(): Promise<void> {
    const specialty = this.confirmDelete();
    if (!specialty) return;

    this.isDeleting.set(true);
    try {
      await this.specialtiesService.deleteSpecialty(specialty.id);
    } finally {
      this.isDeleting.set(false);
      this.confirmDelete.set(null);
    }
  }

  /**
   * Limpia y cierra el formulario de creacion.
   */
  cancelForm(): void {
    this.showForm.set(false);
    this.newName.set('');
    this.newDescription.set('');
  }
}
