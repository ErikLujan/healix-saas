import { Pipe, PipeTransform } from '@angular/core';

type TurnoEstado = 'pendiente' | 'confirmado' | 'rechazado' | 'cancelado' | 'finalizado';

export interface EstadoTurnoVisual {
  readonly badge: string;
  readonly dot: string;
  readonly label: string;
  readonly icon: string;
}

@Pipe({
  name: 'estadoTurnoColor',
  standalone: true,
  pure: true,
})
export class EstadoTurnoColorPipe implements PipeTransform {
  private static readonly MAPA_VISUAL: Record<TurnoEstado, EstadoTurnoVisual> = {
    pendiente: {
      badge: 'bg-amber-50 text-amber-700 border-l-4 border-l-amber-500',
      dot: 'bg-amber-500 animate-pulse-dot',
      label: 'Pendiente',
      icon: 'clock',
    },
    confirmado: {
      badge: 'bg-teal-50 text-teal-700 border-l-4 border-l-teal-500',
      dot: 'bg-teal-500',
      label: 'Confirmado',
      icon: 'check-circle',
    },
    finalizado: {
      badge: 'bg-emerald-50 text-emerald-700 border-l-4 border-l-emerald-500',
      dot: 'bg-emerald-500',
      label: 'Finalizado',
      icon: 'check-check',
    },
    rechazado: {
      badge: 'bg-rose-50 text-rose-700 border-l-4 border-l-rose-500',
      dot: 'bg-rose-500',
      label: 'Rechazado',
      icon: 'alert-triangle',
    },
    cancelado: {
      badge: 'bg-slate-100 text-slate-600 border-l-4 border-l-slate-400',
      dot: 'bg-slate-400',
      label: 'Cancelado',
      icon: 'x-circle',
    },
  };

  private static readonly FALLBACK_VISUAL: EstadoTurnoVisual = {
    badge: 'bg-gray-100 text-gray-700 border-l-4 border-l-gray-400',
    dot: 'bg-gray-500',
    label: 'Desconocido',
    icon: 'alert-circle',
  };

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
