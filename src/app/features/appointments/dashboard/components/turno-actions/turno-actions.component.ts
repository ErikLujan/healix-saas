import { Component, input, output } from '@angular/core';
import { LucideDynamicIcon } from '@lucide/angular';
import { TurnoConRelaciones } from '@core/models/turno.model';
import { UserRole } from '@core/services/auth.service';

/**
 * Acción ejecutable sobre un turno, emitida al contenedor.
 */
export type AccionTurno =
  | 'aceptar'
  | 'rechazar'
  | 'finalizar'
  | 'cancelar'
  | 'ver-resena'
  | 'calificar'
  | 'ver-calificacion'
  | 'completar-encuesta'
  | 'ver-encuesta';

/**
 * Botones de acción de un turno, compartidos por la tabla de
 * escritorio y las tarjetas móviles del listado de turnos.
 *
 * Componente presentacional: recibe el turno y el rol, decide qué
 * acciones están habilitadas y emite la acción elegida. El foco
 * visible está integrado en la clase base del botón y los tooltips
 * se revelan tanto al pasar el puntero como al enfocar con teclado.
 */
@Component({
  selector: 'app-turno-actions',
  standalone: true,
  imports: [LucideDynamicIcon],
  templateUrl: './turno-actions.component.html',
  styleUrl: './turno-actions.component.scss',
})
export class TurnoActionsComponent {
  /** Turno sobre el que se ofrecen las acciones. */
  readonly turno = input.required<TurnoConRelaciones>();

  /** Rol del usuario autenticado, condiciona las acciones visibles. */
  readonly rol = input.required<UserRole>();

  /** Acción elegida por el usuario sobre el turno. */
  readonly accionEjecutada = output<AccionTurno>();

  ejecutar(accion: AccionTurno): void {
    this.accionEjecutada.emit(accion);
  }
}
