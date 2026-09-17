import { Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { fadeIn, slideUp } from '@core/animations/route-animations';
import { SpecialtiesService, SpecialtyWithCount } from '../../services/specialties.service';

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
  imports: [FormsModule],
  animations: [fadeIn, slideUp],
  template: `
    <div @fadeIn class="min-h-full">
      <div @slideUp class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 class="text-2xl font-bold text-gray-900">Especialidades</h1>
          <p class="text-sm text-gray-500 mt-1">
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
        <div @slideUp class="bg-white border border-gray-200 rounded-xl p-5 mb-6 shadow-sm">
          <h3 class="text-sm font-semibold text-gray-700 mb-3">Crear nueva especialidad</h3>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label class="block text-xs font-medium text-gray-500 mb-1">Nombre *</label>
              <input
                type="text"
                [(ngModel)]="newName"
                placeholder="Ej: Cardiologia"
                class="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:border-brand-300 focus:ring-2 focus:ring-brand-100 outline-none transition-all" />
            </div>
            <div>
              <label class="block text-xs font-medium text-gray-500 mb-1">Descripcion</label>
              <input
                type="text"
                [(ngModel)]="newDescription"
                placeholder="Breve descripcion de la especialidad"
                class="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:border-brand-300 focus:ring-2 focus:ring-brand-100 outline-none transition-all" />
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
              class="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
              Cancelar
            </button>
          </div>
        </div>
      }

      @if (specialtiesService.isLoading()) {
        <div class="flex justify-center py-16">
          <div class="w-10 h-10 border-4 border-brand-100 border-t-brand-700 rounded-full animate-spin"></div>
        </div>
      } @else if (specialtiesService.specialties().length === 0) {
        <div class="flex flex-col items-center justify-center py-16">
          <div class="w-16 h-16 mb-4 rounded-full bg-gray-100 flex items-center justify-center">
            <svg class="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
            </svg>
          </div>
          <h3 class="text-lg font-semibold text-gray-700 mb-1">Sin especialidades</h3>
          <p class="text-sm text-gray-500">Crea la primera especialidad medica del sistema.</p>
        </div>
      } @else {
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          @for (specialty of specialtiesService.specialties(); track specialty.id) {
            <div class="bg-white border border-gray-200 rounded-xl p-5 hover:shadow-md transition-shadow duration-200">
              <div class="flex items-start justify-between mb-3">
                <div class="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M4.8 2.3A.3.3 0 1 0 5 2H4a2 2 0 0 0-2 2v5a6 6 0 0 0 6 6v0a6 6 0 0 0 6-6V4a2 2 0 0 0-2-2h-1a.2.2 0 1 0 .3.3"/>
                    <path d="M8 15v1a6 6 0 0 0 6 6v0a6 6 0 0 0 6-6v-4"/>
                    <circle cx="20" cy="10" r="2"/>
                  </svg>
                </div>
                <div class="flex gap-1">
                  <button
                    type="button"
                    (click)="deleteSpecialty(specialty)"
                    class="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title="Eliminar">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>
              <h3 class="text-base font-semibold text-gray-900 mb-1">{{ specialty.name }}</h3>
              <p class="text-xs text-gray-500 mb-4 line-clamp-2">
                {{ specialty.description || 'Sin descripcion' }}
              </p>
              <div class="flex items-center justify-between pt-3 border-t border-gray-100">
                <span class="text-xs text-gray-500">
                  {{ specialty.specialistCount }} especialista{{ specialty.specialistCount !== 1 ? 's' : '' }}
                </span>
                <label class="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    [checked]="specialty.is_active"
                    (change)="toggleActive(specialty)"
                    class="sr-only peer" />
                  <div class="w-9 h-5 bg-gray-200 peer-focus:ring-2 peer-focus:ring-brand-100 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-brand-700"></div>
                  <span class="ml-2 text-xs font-medium" [class]="specialty.is_active ? 'text-brand-700' : 'text-gray-500'">
                    {{ specialty.is_active ? 'Activa' : 'Inactiva' }}
                  </span>
                </label>
              </div>
            </div>
          }
        </div>
      }
    </div>
  `,
})
export class AdminSpecialtiesComponent implements OnInit {
  readonly specialtiesService = inject(SpecialtiesService);

  readonly showForm = signal(false);
  readonly newName = signal('');
  readonly newDescription = signal('');

  ngOnInit(): void {
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
   * Elimina una especialidad despues de confirmacion.
   *
   * @param specialty Especialidad a eliminar.
   */
  async deleteSpecialty(specialty: SpecialtyWithCount): Promise<void> {
    const confirmado = window.confirm(
      `¿Eliminar la especialidad "${specialty.name}"? Esta accion no se puede deshacer.`,
    );
    if (confirmado) {
      await this.specialtiesService.deleteSpecialty(specialty.id);
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
