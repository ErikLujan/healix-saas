import { Component, input, output, signal } from '@angular/core';
import { NgClass } from '@angular/common';
import { TurnoConRelaciones } from '@core/models/turno.model';
import { UserRole } from '@core/services/auth.service';
import { EstadoTurnoColorPipe } from '@shared/pipes/estado-turno-color.pipe';

/**
 * Componente presentacional que renderiza una tarjeta de turno medico.
 *
 * Adapta la informacion visible y las acciones disponibles segun el rol
 * del usuario autenticado y el estado actual del turno.
 *
 * Expone eventos para que el componente padre gestione las transiciones
 * de estado mediante dialogos modales.
 */
@Component({
  selector: 'app-turno-card',
  standalone: true,
  imports: [NgClass, EstadoTurnoColorPipe],
  templateUrl: './turno-card.component.html',
})
export class TurnoCardComponent {
  /** Turno con informacion de relaciones a renderizar. */
  readonly turno = input.required<TurnoConRelaciones>();

  /** Rol del usuario autenticado. */
  readonly rol = input.required<UserRole>();

  /** Evento emitido cuando se solicita cancelar el turno. */
  readonly onCancelar = output<TurnoConRelaciones>();

  /** Evento emitido cuando se solicita confirmar el turno. */
  readonly onConfirmar = output<TurnoConRelaciones>();

  /** Evento emitido cuando se solicita rechazar el turno. */
  readonly onRechazar = output<TurnoConRelaciones>();

  /** Evento emitido cuando se solicita finalizar el turno. */
  readonly onFinalizar = output<TurnoConRelaciones>();

  /** Evento emitido cuando se solicita ver la resena medica. */
  readonly onVerResena = output<TurnoConRelaciones>();

  /** Evento emitido cuando se solicita calificar la atencion. */
  readonly onCalificar = output<TurnoConRelaciones>();

  /** Evento emitido cuando se solicita completar la encuesta. */
  readonly onEncuesta = output<TurnoConRelaciones>();

  /** Indica si hay una operacion en curso sobre este turno. */
  readonly isProcesando = signal(false);

  /** Indica si el turno permite ser cancelado. */
  puedeCancelar(): boolean {
    return this.turno().estado === 'pendiente' || this.turno().estado === 'confirmado';
  }

  /** Indica si el turno permite ser confirmado (solo especialista). */
  puedeConfirmar(): boolean {
    return this.rol() === 'especialista' && this.turno().estado === 'pendiente';
  }

  /** Indica si el turno permite ser rechazado (solo especialista). */
  puedeRechazar(): boolean {
    return this.rol() === 'especialista' && this.turno().estado === 'pendiente';
  }

  /** Indica si el turno permite ser finalizado (solo especialista). */
  puedeFinalizar(): boolean {
    return this.rol() === 'especialista' && this.turno().estado === 'confirmado';
  }

  /** Indica si se puede ver la resena medica. */
  puedeVerResena(): boolean {
    return this.turno().estado === 'finalizado' && !!this.turno().resena_diagnostico;
  }

  /** Indica si el paciente puede calificar la atencion. */
  puedeCalificar(): boolean {
    return this.rol() === 'paciente'
      && this.turno().estado === 'finalizado'
      && this.turno().calificacion_estrellas === null;
  }

  /** Indica si el paciente puede ver la encuesta (stub futuro). */
  puedeCompletarEncuesta(): boolean {
    return this.rol() === 'paciente' && this.turno().estado === 'finalizado';
  }

  /** Indica si el paciente ya califico (muestra estrellas). */
  yaCalificado(): boolean {
    return this.rol() === 'paciente' && this.turno().calificacion_estrellas !== null;
  }

  /** Indica si el turno esta en estado rechazado. */
  esRechazado(): boolean {
    return this.turno().estado === 'rechazado';
  }

  /** Indica si el turno esta en estado cancelado. */
  esCancelado(): boolean {
    return this.turno().estado === 'cancelado';
  }

  /** Indica si el turno esta en estado pendiente. */
  esPendiente(): boolean {
    return this.turno().estado === 'pendiente';
  }

  /** Indica si el turno esta en estado confirmado. */
  esConfirmado(): boolean {
    return this.turno().estado === 'confirmado';
  }

  /** Indica si el turno esta en estado finalizado. */
  esFinalizado(): boolean {
    return this.turno().estado === 'finalizado';
  }

  /** Clases CSS del contenedor principal de la tarjeta segun el estado. */
  cardClasses(): string {
    const base = 'rounded-xl border bg-surface p-5 transition-all duration-200 hover:shadow-sm';
    switch (this.turno().estado) {
      case 'pendiente':
        return `${base} border-l-4 border-l-amber-500 border-border bg-amber-50/40`;
      case 'confirmado':
        return `${base} border-l-4 border-l-emerald-500 border-border bg-emerald-50/40`;
      case 'finalizado':
        return `${base} border-l-4 border-l-blue-500 border-border bg-blue-50/40`;
      case 'rechazado':
        return `${base} border-l-4 border-l-red-500 border-border bg-red-50/40`;
      case 'cancelado':
        return `${base} border-l-4 border-l-slate-400 border-border bg-slate-50 opacity-85`;
      default:
        return `${base} border-border`;
    }
  }

  /** Extrae la fecha (YYYY-MM-DD) de la marca de tiempo ISO. */
  extraerFecha(fechaHora: string): string {
    return fechaHora.substring(0, 10);
  }

  /** Extrae la hora (HH:mm) de la marca de tiempo ISO. */
  extraerHora(fechaHora: string): string {
    return fechaHora.substring(11, 16);
  }

  /** Formatea la fecha del turno a formato legible en espanol. */
  formatearFecha(fechaHora: string): string {
    const fechaStr = this.extraerFecha(fechaHora);
    const [anio, mes, dia] = fechaStr.split('-').map(Number);
    const fechaObj = new Date(anio, mes - 1, dia);
    return fechaObj.toLocaleDateString('es-AR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  }

  /** Formatea la hora del turno (HH:mm). */
  formatearHora(fechaHora: string): string {
    return this.extraerHora(fechaHora);
  }

  /** Obtiene el nombre del especialista del turno. */
  nombreEspecialista(): string {
    return this.turno().especialista?.full_name ?? 'Sin asignar';
  }

  /** Obtiene el nombre del paciente del turno. */
  nombrePaciente(): string {
    return this.turno().paciente?.full_name ?? 'Sin paciente';
  }

  /** Obtiene el nombre de la especialidad del turno. */
  nombreEspecialidad(): string {
    return this.turno().especialidad?.name ?? 'Sin especialidad';
  }

  /** Capitaliza la primera letra de un string. */
  capitalizar(texto: string): string {
    return texto.charAt(0).toUpperCase() + texto.slice(1);
  }

  /** Marca el turno como procesando. */
  setProcesando(valor: boolean): void {
    this.isProcesando.set(valor);
  }
}
