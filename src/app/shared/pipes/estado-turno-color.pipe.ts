import { Pipe, PipeTransform } from '@angular/core';

/**
 * Estado posible de un turno en el sistema clinico.
 */
type TurnoEstado = 'pendiente' | 'confirmado' | 'rechazado' | 'cancelado' | 'finalizado';

/**
 * Objeto que contiene las clases de Tailwind para estilizar visualmente
 * un turno segun su estado actual.
 */
export interface EstadoTurnoVisual {
  readonly badge: string;
  readonly dot: string;
  readonly label: string;
}

/**
 * Pipe puro que resuelve la semantica visual de un turno a partir de su estado.
 *
 * Transforma un valor de tipo `TurnoEstado` en un objeto con clases de
 * Tailwind CSS predefinidas que determinan el aspecto visual del componente
 * tarjeta de turno (badge, indicador circular, etiqueta de texto).
 *
 * La logica es puramente declarativa: un mappping estatico que no depende
 * de servicios, estado global ni efectos secundarios.
 *
 * Colores por estado:
 * - **pendiente**: Amber (proceso en espera)
 * - **confirmado**: Emerald (accion confirmada/procesada)
 * - **finalizado**: Blue (proceso completado)
 * - **rechazado**: Red (accion rechazada)
 * - **cancelado**: Slate (accion cancelada)
 *
 * @example
 * // En una plantilla Angular:
 * // <div [class]="(turno.estado | estadoTurnoColor).badge">
 * //   {{ turno.estado }}
 * // </div>
 *
 * @example
 * // const visual = pipe.transform('confirmado');
 * // console.log(visual.badge);  // "bg-emerald-100 text-emerald-700"
 * // console.log(visual.dot);    // "bg-emerald-500"
 * // console.log(visual.label);  // "Confirmado"
 */
@Pipe({
  name: 'estadoTurnoColor',
  standalone: true,
  pure: true,
})
export class EstadoTurnoColorPipe implements PipeTransform {
  private static readonly MAPA_VISUAL: Record<TurnoEstado, EstadoTurnoVisual> = {
    pendiente: {
      badge: 'bg-amber-100 text-amber-700',
      dot: 'bg-amber-500',
      label: 'Pendiente',
    },
    confirmado: {
      badge: 'bg-emerald-100 text-emerald-700',
      dot: 'bg-emerald-500',
      label: 'Confirmado',
    },
    finalizado: {
      badge: 'bg-blue-100 text-blue-700',
      dot: 'bg-blue-500',
      label: 'Finalizado',
    },
    rechazado: {
      badge: 'bg-red-100 text-red-700',
      dot: 'bg-red-500',
      label: 'Rechazado',
    },
    cancelado: {
      badge: 'bg-slate-100 text-slate-700',
      dot: 'bg-slate-500',
      label: 'Cancelado',
    },
  };

  private static readonly FALLBACK_VISUAL: EstadoTurnoVisual = {
    badge: 'bg-gray-100 text-gray-700',
    dot: 'bg-gray-500',
    label: 'Desconocido',
  };

  /**
   * Resuelve el objeto visual para un estado de turno dado.
   *
   * @param value Estado del turno.
   * @returns Objeto con clases de Tailwind y etiqueta legible.
   */
  transform(value: TurnoEstado | string | null | undefined): EstadoTurnoVisual {
    if (!value) {
      return EstadoTurnoColorPipe.FALLBACK_VISUAL;
    }

    return (
      EstadoTurnoColorPipe.MAPA_VISUAL[value as TurnoEstado] ??
      EstadoTurnoColorPipe.FALLBACK_VISUAL
    );
  }
}
