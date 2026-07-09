import { Injectable, signal, computed } from '@angular/core';
import { EspecialidadInfo } from '@core/models/turno.model';

/** Informacion basica de un especialista para la seleccion. */
export interface EspecialistaWizard {
  readonly id: string;
  readonly full_name: string;
  readonly avatar_url: string | null;
  readonly especialidades: readonly EspecialidadInfo[];
}

/** Bloque horario disponible para seleccion. */
export interface BloqueDisponible {
  readonly hora: string;
  readonly disponible: boolean;
}

/** Estado completo del asistente de solicitud de turnos. */
export interface EstadoWizard {
  readonly pasoActual: number;
  readonly especialidadSeleccionada: EspecialidadInfo | null;
  readonly especialistaSeleccionado: EspecialistaWizard | null;
  readonly fechaSeleccionada: string | null;
  readonly horaSeleccionada: string | null;
}

const ESTADO_INICIAL: EstadoWizard = {
  pasoActual: 1,
  especialidadSeleccionada: null,
  especialistaSeleccionado: null,
  fechaSeleccionada: null,
  horaSeleccionada: null,
};

/**
 * Servicio de estado reactivo para el asistente de solicitud de turnos.
 *
 * Administra el progreso del wizard mediante Angular Signals.
 * Cada seleccion actualiza automaticamente el estado general del flujo.
 * Los componentes solo renderizan la informacion del paso activo.
 *
 * Expone solo lectura a traves de signals readonly.
 */
@Injectable({
  providedIn: 'root',
})
export class WizardTurnoService {
  private readonly _estado = signal<EstadoWizard>(ESTADO_INICIAL);

  /** Estado actual completo del wizard. */
  readonly estado = this._estado.asReadonly();

  /** Paso actual (1-5). */
  readonly pasoActual = computed(() => this._estado().pasoActual);

  /** Especialidad seleccionada. */
  readonly especialidadSeleccionada = computed(() => this._estado().especialidadSeleccionada);

  /** Especialista seleccionado. */
  readonly especialistaSeleccionado = computed(() => this._estado().especialistaSeleccionado);

  /** Fecha seleccionada. */
  readonly fechaSeleccionada = computed(() => this._estado().fechaSeleccionada);

  /** Hora seleccionada. */
  readonly horaSeleccionada = computed(() => this._estado().horaSeleccionada);

  /** Indica si se puede avanzar al siguiente paso. */
  readonly puedeAvanzar = computed(() => {
    const estado = this._estado();
    switch (estado.pasoActual) {
      case 1: return estado.especialidadSeleccionada !== null;
      case 2: return estado.especialistaSeleccionado !== null;
      case 3: return estado.fechaSeleccionada !== null;
      case 4: return estado.horaSeleccionada !== null;
      case 5: return false;
      default: return false;
    }
  });

  /** Indica si se puede retroceder. */
  readonly puedeRetroceder = computed(() => this._estado().pasoActual > 1);

  /** Titulo del paso actual. */
  readonly tituloPasoActual = computed(() => {
    const titulos: Record<number, string> = {
      1: 'Especialidad',
      2: 'Especialista',
      3: 'Fecha',
      4: 'Horario',
      5: 'Confirmar',
    };
    return titulos[this._estado().pasoActual] ?? '';
  });

  /**
   * Selecciona la especialidad y avanza al paso 2.
   * Reinicia las selecciones posteriores si las hubiera.
   */
  seleccionarEspecialidad(especialidad: EspecialidadInfo): void {
    this._estado.update(prev => ({
      ...prev,
      especialidadSeleccionada: especialidad,
      pasoActual: 2,
      especialistaSeleccionado: null,
      fechaSeleccionada: null,
      horaSeleccionada: null,
    }));
  }

  /**
   * Selecciona el especialista y avanza al paso 3.
   * Reinicia fecha y hora si estuvieran seleccionadas.
   */
  seleccionarEspecialista(especialista: EspecialistaWizard): void {
    this._estado.update(prev => ({
      ...prev,
      especialistaSeleccionado: especialista,
      pasoActual: 3,
      fechaSeleccionada: null,
      horaSeleccionada: null,
    }));
  }

  /**
   * Selecciona la fecha y avanza al paso 4.
   * Reinicia la hora si estuviera seleccionada.
   */
  seleccionarFecha(fecha: string): void {
    this._estado.update(prev => ({
      ...prev,
      fechaSeleccionada: fecha,
      pasoActual: 4,
      horaSeleccionada: null,
    }));
  }

  /**
   * Selecciona la hora y avanza al paso 5 (confirmacion).
   */
  seleccionarHora(hora: string): void {
    this._estado.update(prev => ({
      ...prev,
      horaSeleccionada: hora,
      pasoActual: 5,
    }));
  }

  /** Avanza al siguiente paso si hay seleccion valida. */
  avanzarPaso(): void {
    const estado = this._estado();
    if (estado.pasoActual < 5 && this.puedeAvanzar()) {
      this._estado.update(prev => ({ ...prev, pasoActual: prev.pasoActual + 1 }));
    }
  }

  /** Retrocede al paso anterior. */
  retrocederPaso(): void {
    const estado = this._estado();
    if (estado.pasoActual > 1) {
      this._estado.update(prev => ({ ...prev, pasoActual: prev.pasoActual - 1 }));
    }
  }

  /** Navega directamente a un paso completado o al actual. */
  irAPaso(paso: number): void {
    const estado = this._estado();
    if (paso >= 1 && paso <= estado.pasoActual) {
      this._estado.update(prev => ({ ...prev, pasoActual: paso }));
    }
  }

  /** Reinicia completamente el wizard. */
  reiniciar(): void {
    this._estado.set(ESTADO_INICIAL);
  }
}
