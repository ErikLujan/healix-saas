import { Component, input, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import {
  trigger,
  transition,
  style,
  animate,
  state,
  query,
  stagger,
} from '@angular/animations';
import { MedicalRecordConRelaciones } from '../../models/medical-record.model';

/**
 * Animación de entrada escalonada para las tarjetas del historial clínico.
 * Cada tarjeta aparece con un efecto fade-in y slide-up progresivo.
 */
const listStaggerAnimation = trigger('listStagger', [
  transition(':enter', [
    query(':enter', [
      style({ opacity: 0, transform: 'translateY(16px) scale(0.98)' }),
      stagger('60ms', [
        animate('350ms cubic-bezier(0.16, 1, 0.3, 1)', style({ opacity: 1, transform: 'translateY(0) scale(1)' })),
      ]),
    ], { optional: true }),
  ]),
]);

/**
 * Animación de expansión/colapsado del contenido de cada tarjeta.
 * Efecto elástico de deslizamiento vertical con fade.
 */
const expandCollapseAnimation = trigger('expandCollapse', [
  state('void', style({ height: '0', opacity: 0, overflow: 'hidden' })),
  state('*', style({ height: '*', opacity: 1, overflow: 'hidden' })),
  transition('void <=> *', [
    animate('300ms cubic-bezier(0.16, 1, 0.3, 1)'),
  ]),
]);

/**
 * Componente presentacional que renderiza el historial clínico
 * completo de un paciente en formato de tarjetas cronológicas.
 *
 * Es un componente puro de presentación (dumb component) que
 * únicamente recibe datos mediante inputs y emite eventos
 * mediante outputs. No posee lógica de negocio propia.
 *
 * Características:
 * - Orden cronológico descendente (más reciente primero)
 * - Iteración genérica sobre datos dinámicos JSONB
 * - Diseño responsive con Tailwind CSS v4
 * - Empty state cuando no hay registros
 * - Estados de acordeón expandible por consulta
 * - Animación de entrada escalonada para las tarjetas
 * - Animación de expansión/colapsado del contenido
 */
@Component({
  selector: 'app-medical-history-list',
  standalone: true,
  imports: [DatePipe],
  animations: [listStaggerAnimation, expandCollapseAnimation],
  template: `
    @if (records().length === 0) {
      <div class="flex flex-col items-center justify-center py-16 px-4">
        <div class="w-16 h-16 mb-4 rounded-full bg-gray-100 flex items-center justify-center">
          <svg class="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
        <h3 class="text-lg font-semibold text-gray-700 mb-1">Sin registros clínicos</h3>
        <p class="text-sm text-gray-500 text-center max-w-sm">
          No se encontraron historias clínicas para este paciente.
        </p>
      </div>
    } @else {
      <div class="space-y-4" @listStagger>
        @for (record of records(); track record.id; let i = $index) {
          <div class="border border-gray-200 rounded-xl bg-white shadow-sm overflow-hidden transition-shadow duration-200 hover:shadow-md">
            <button
              type="button"
              (click)="toggleExpansion(i)"
              class="w-full px-5 py-4 flex items-center justify-between text-left bg-gradient-to-r from-blue-50/50 to-transparent hover:from-blue-50 transition-colors cursor-pointer">
              <div class="flex items-center gap-3 min-w-0">
                <div class="flex-shrink-0 w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                  <span class="text-sm font-bold text-blue-600">{{ i + 1 }}</span>
                </div>
                <div class="min-w-0">
                  <p class="text-sm font-semibold text-gray-900 truncate">
                    {{ record.created_at | date:'dd/MM/yyyy' }} -
                    Dr. {{ record.especialista?.full_name ?? 'No especificado' }}
                  </p>
                  <p class="text-xs text-gray-500 truncate mt-0.5">
                    {{ record.especialidad?.name ?? 'Especialidad no indicada' }}
                  </p>
                </div>
              </div>
              <svg
                class="w-5 h-5 text-gray-400 transition-transform duration-300 ease-out flex-shrink-0 ml-2"
                [class.rotate-180]="expandedItems().has(i)"
                fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            @if (expandedItems().has(i)) {
              <div @expandCollapse class="px-5 pb-5 border-t border-gray-100">
                <div class="pt-4 space-y-4">
                  @if (record.turno?.resena_diagnostico) {
                    <div>
                      <h4 class="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Reseña Clínica</h4>
                      <p class="text-sm text-gray-700 leading-relaxed bg-gray-50 rounded-lg p-3">
                        {{ record.turno?.resena_diagnostico }}
                      </p>
                    </div>
                  }

                  <div>
                    <h4 class="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Parámetros Fisiológicos</h4>
                    <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div class="bg-blue-50 rounded-lg p-3 text-center">
                        <p class="text-xs text-blue-600 font-medium mb-0.5">Altura</p>
                        <p class="text-lg font-bold text-blue-700">{{ record.altura }}<span class="text-xs font-normal ml-0.5">cm</span></p>
                      </div>
                      <div class="bg-green-50 rounded-lg p-3 text-center">
                        <p class="text-xs text-green-600 font-medium mb-0.5">Peso</p>
                        <p class="text-lg font-bold text-green-700">{{ record.peso }}<span class="text-xs font-normal ml-0.5">kg</span></p>
                      </div>
                      <div class="bg-orange-50 rounded-lg p-3 text-center">
                        <p class="text-xs text-orange-600 font-medium mb-0.5">Temperatura</p>
                        <p class="text-lg font-bold text-orange-700">{{ record.temperatura }}<span class="text-xs font-normal ml-0.5">C</span></p>
                      </div>
                      <div class="bg-purple-50 rounded-lg p-3 text-center">
                        <p class="text-xs text-purple-600 font-medium mb-0.5">Presión</p>
                        <p class="text-lg font-bold text-purple-700">{{ record.presion_arterial }}</p>
                      </div>
                    </div>
                  </div>

                  @if (record.datos_dinamicos && record.datos_dinamicos.length > 0) {
                    <div>
                      <h4 class="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Datos Adicionales</h4>
                      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                        @for (dato of record.datos_dinamicos; track dato.clave) {
                          <div class="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2">
                            <span class="text-xs text-gray-500 font-medium">{{ dato.clave }}</span>
                            <span class="text-sm text-gray-900 font-semibold">{{ dato.valor }}</span>
                          </div>
                        }
                      </div>
                    </div>
                  }
                </div>
              </div>
            }
          </div>
        }
      </div>
    }
  `,
})
export class MedicalHistoryListComponent {
  /** Array de historias clínicas ordenadas cronológicamente. */
  readonly records = input.required<readonly MedicalRecordConRelaciones[]>();

  /** Conjunto de índices de items expandidos. */
  readonly expandedItems = signal<Set<number>>(new Set());

  /**
   * Alterna la expansión de una tarjeta de consulta.
   *
   * @param index Índice de la tarjeta en el array.
   */
  toggleExpansion(index: number): void {
    this.expandedItems.update((current) => {
      const next = new Set(current);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  }
}
