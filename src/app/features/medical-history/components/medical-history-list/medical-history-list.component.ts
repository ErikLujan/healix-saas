import { Component, input, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { LucideDynamicIcon } from '@lucide/angular';
import {
  trigger,
  transition,
  style,
  animate,
  state,
  query,
  stagger,
} from '@angular/animations';
import {
  MedicalRecordConRelaciones,
  CLAVES_OBLIGATORIAS,
} from '../../models/medical-record.model';

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

const expandCollapseAnimation = trigger('expandCollapse', [
  state('void', style({ height: '0', opacity: 0, overflow: 'hidden' })),
  state('*', style({ height: '*', opacity: 1, overflow: 'hidden' })),
  transition('void <=> *', [
    animate('300ms cubic-bezier(0.16, 1, 0.3, 1)'),
  ]),
]);

@Component({
  selector: 'app-medical-history-list',
  standalone: true,
  imports: [DatePipe, LucideDynamicIcon],
  animations: [listStaggerAnimation, expandCollapseAnimation],
  template: `
    @if (records().length === 0) {
      <div class="flex flex-col items-center justify-center py-16 px-4">
        <div class="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 mb-4">
          <svg lucideIcon="file-text" class="h-8 w-8 text-slate-400"></svg>
        </div>
        <h3 class="text-lg font-semibold text-text-primary mb-1">Sin registros clínicos</h3>
        <p class="text-sm text-text-secondary text-center max-w-sm">
          No se encontraron historias clínicas para este paciente.
        </p>
      </div>
    } @else {
      <div class="space-y-4" @listStagger>
        @for (record of records(); track record.id; let i = $index) {
          <div class="border border-slate-200/80 rounded-2xl bg-surface shadow-sm overflow-hidden transition-shadow duration-200 hover:shadow-md">
            <button
              type="button"
              (click)="toggleExpansion(i)"
              class="w-full px-5 py-4 flex items-center justify-between text-left bg-gradient-to-r from-brand-50/50 to-transparent hover:from-brand-50 transition-colors cursor-pointer">
              <div class="flex items-center gap-3 min-w-0">
                <div class="flex-shrink-0 w-10 h-10 rounded-xl bg-brand-100 flex items-center justify-center">
                  <span class="text-sm font-bold text-brand-700">{{ i + 1 }}</span>
                </div>
                <div class="min-w-0">
                  <p class="text-sm font-semibold text-text-primary truncate">
                    {{ record.created_at | date:'dd/MM/yyyy' }} —
                    Dr. {{ record.especialista?.full_name ?? 'No especificado' }}
                  </p>
                  <p class="text-xs text-text-subtle truncate mt-0.5">
                    {{ record.especialidad?.name ?? 'Especialidad no indicada' }}
                  </p>
                </div>
              </div>
              <svg lucideIcon="chevron-down"
                class="w-5 h-5 text-text-subtle transition-transform duration-300 ease-out flex-shrink-0 ml-2"
                [class.rotate-180]="expandedItems().has(i)"></svg>
            </button>

            @if (expandedItems().has(i)) {
              <div @expandCollapse class="px-5 pb-5 border-t border-divider">
                <div class="pt-4 space-y-4">
                  @if (record.turno?.resena_diagnostico) {
                    <div>
                      <h4 class="text-xs font-semibold text-text-subtle uppercase tracking-wider mb-1.5">Reseña Clínica</h4>
                      <p class="text-sm text-text-primary leading-relaxed bg-background rounded-xl p-3">
                        {{ record.turno?.resena_diagnostico }}
                      </p>
                    </div>
                  }

                  <div>
                    <h4 class="text-xs font-semibold text-text-subtle uppercase tracking-wider mb-2">Parámetros Fisiológicos</h4>
                    <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div class="bg-brand-50 rounded-xl p-3 text-center">
                        <p class="text-xs text-brand-700 font-medium mb-0.5">Altura</p>
                        <p class="text-lg font-bold text-brand-700">{{ record.altura }}<span class="text-xs font-normal ml-0.5">cm</span></p>
                      </div>
                      <div class="bg-emerald-50 rounded-xl p-3 text-center">
                        <p class="text-xs text-emerald-600 font-medium mb-0.5">Peso</p>
                        <p class="text-lg font-bold text-emerald-700">{{ record.peso }}<span class="text-xs font-normal ml-0.5">kg</span></p>
                      </div>
                      <div class="bg-orange-50 rounded-xl p-3 text-center">
                        <p class="text-xs text-orange-600 font-medium mb-0.5">Temperatura</p>
                        <p class="text-lg font-bold text-orange-700">{{ record.temperatura }}<span class="text-xs font-normal ml-0.5">C</span></p>
                      </div>
                      <div class="bg-purple-50 rounded-xl p-3 text-center">
                        <p class="text-xs text-purple-600 font-medium mb-0.5">Presión</p>
                        <p class="text-lg font-bold text-purple-700">{{ record.presion_arterial }}</p>
                      </div>
                    </div>
                  </div>

                  @if (obtenerCampoObligatorio(record, CLAVES.RANGO_DOLOR)
                    || obtenerCampoObligatorio(record, CLAVES.FRECUENCIA_CARDIACA)
                    || obtenerCampoObligatorio(record, CLAVES.ALERGIAS_REFIRIDAS)) {
                    <div>
                      <h4 class="text-xs font-semibold text-text-subtle uppercase tracking-wider mb-2">Controles Clínicos Obligatorios</h4>
                      <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        @if (obtenerCampoObligatorio(record, CLAVES.RANGO_DOLOR); as valorDolor) {
                          <div class="flex items-center gap-3 bg-background rounded-xl px-4 py-3">
                            <svg lucideIcon="heart" class="h-5 w-5 text-text-subtle flex-shrink-0"></svg>
                            <div class="min-w-0">
                              <p class="text-xs text-text-subtle font-medium">Dolor (EVA)</p>
                              <span class="inline-block text-sm font-bold rounded-xl px-2 py-0.5" [class]="clasesNivelDolor(valorDolor)">
                                {{ formatearNivelDolor(valorDolor) }}
                              </span>
                            </div>
                          </div>
                        }
                        @if (obtenerCampoObligatorio(record, CLAVES.FRECUENCIA_CARDIACA); as valorFC) {
                          <div class="flex items-center gap-3 bg-background rounded-xl px-4 py-3">
                            <svg lucideIcon="activity" class="h-5 w-5 text-text-subtle flex-shrink-0"></svg>
                            <div class="min-w-0">
                              <p class="text-xs text-text-subtle font-medium">Frec. Cardíaca</p>
                              <p class="text-sm font-bold text-text-primary">{{ valorFC }} <span class="text-xs font-normal">lpm</span></p>
                            </div>
                          </div>
                        }
                        @if (obtenerCampoObligatorio(record, CLAVES.ALERGIAS_REFIRIDAS); as valorAlergias) {
                          <div class="flex items-center gap-3 bg-background rounded-xl px-4 py-3">
                            <svg lucideIcon="alert-triangle" class="h-5 w-5 text-text-subtle flex-shrink-0"></svg>
                            <div class="min-w-0">
                              <p class="text-xs text-text-subtle font-medium">Alergias</p>
                              @if (valorAlergias === 'true') {
                                <span class="inline-flex items-center gap-1 text-sm font-bold text-red-700">
                                  <svg lucideIcon="alert-triangle" class="h-4 w-4"></svg>
                                  Sí refiere
                                </span>
                              } @else {
                                <span class="inline-flex items-center gap-1 text-sm font-bold text-emerald-700">
                                  <svg lucideIcon="check-circle" class="h-4 w-4"></svg>
                                  No refiere
                                </span>
                              }
                            </div>
                          </div>
                        }
                      </div>
                    </div>
                  }

                  @if (datosLibres(record).length > 0) {
                    <div>
                      <h4 class="text-xs font-semibold text-text-subtle uppercase tracking-wider mb-2">Datos Adicionales</h4>
                      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                        @for (dato of datosLibres(record); track dato.clave) {
                          <div class="flex items-center justify-between bg-background rounded-xl px-3 py-2">
                            <span class="text-xs text-text-subtle font-medium">{{ formatearClaveDinamica(dato.clave) }}</span>
                            <span class="text-sm text-text-primary font-semibold">{{ dato.valor }}</span>
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
  readonly CLAVES = CLAVES_OBLIGATORIAS;

  readonly records = input.required<readonly MedicalRecordConRelaciones[]>();

  readonly expandedItems = signal<Set<number>>(new Set());

  obtenerCampoObligatorio(record: MedicalRecordConRelaciones, clave: string): string | null {
    const dato = record.datos_dinamicos?.find(d => d.clave === clave);
    return dato?.valor ?? null;
  }

  datosLibres(record: MedicalRecordConRelaciones): readonly { clave: string; valor: string }[] {
    if (!record.datos_dinamicos) return [];
    return record.datos_dinamicos.filter(
      d => !Object.values(CLAVES_OBLIGATORIAS).includes(d.clave as typeof CLAVES_OBLIGATORIAS[keyof typeof CLAVES_OBLIGATORIAS]),
    );
  }

  formatearNivelDolor(valor: string): string {
    const nivel = parseInt(valor, 10);
    if (isNaN(nivel)) return valor;
    if (nivel <= 3) return `${nivel}/10 - Leve`;
    if (nivel <= 6) return `${nivel}/10 - Moderado`;
    return `${nivel}/10 - Intenso`;
  }

  clasesNivelDolor(valor: string): string {
    const nivel = parseInt(valor, 10);
    if (isNaN(nivel)) return 'bg-slate-100 text-slate-700';
    if (nivel <= 3) return 'bg-emerald-100 text-emerald-700';
    if (nivel <= 6) return 'bg-amber-100 text-amber-700';
    return 'bg-red-100 text-red-700';
  }

  formatearClaveDinamica(clave: string): string {
    const formatoClaves: Record<string, string> = {
      colesterol: 'Colesterol',
      glucosa: 'Glucosa',
      'frecuencia cardiaca': 'Frec. Cardíaca',
      'saturacion de oxigeno': 'Saturación O₂',
      imc: 'IMC',
      'grupo sanguineo': 'Grupo Sanguíneo',
      'factor rh': 'Factor Rh',
      observaciones: 'Observaciones',
    };
    if (formatoClaves[clave]) return formatoClaves[clave];
    return clave
      .replace(/_/g, ' ')
      .replace(/\b\w/g, (c) => c.toUpperCase());
  }

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
