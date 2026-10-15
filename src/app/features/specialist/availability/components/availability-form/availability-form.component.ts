import { Component, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  ConfiguracionDia,
  DiaSemana,
  BloqueHorario,
  EspecialidadPerfil,
  DiaInfo,
  RESTRICCIONES_HORARIAS,
  HORA_INICIO_DEFAULT,
  HORA_FIN_DEFAULT,
  EXTENSION_BLOQUE_DEFAULT_HORAS,
} from '@core/models/disponibilidad.model';

@Component({
  selector: 'app-availability-form',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './availability-form.component.html',
})
export class AvailabilityFormComponent {
  readonly configuracion = input.required<Record<number, ConfiguracionDia>>();
  readonly especialidades = input.required<readonly EspecialidadPerfil[]>();
  readonly diasDisponibles = input.required<readonly DiaInfo[]>();

  readonly configuracionChange = output<{ readonly dia: DiaSemana; readonly config: ConfiguracionDia }>();

  readonly expandedDay = signal<DiaSemana | null>(null);

  getRestriccion(dia: DiaSemana): { readonly inicio: string; readonly fin: string } | undefined {
    return RESTRICCIONES_HORARIAS[dia];
  }

  toggleDia(dia: DiaSemana): void {
    const actual = this.configuracion()[dia];
    const nuevoHabilitado = !actual.habilitado;

    this.configuracionChange.emit({
      dia,
      config: {
        habilitado: nuevoHabilitado,
        bloques: nuevoHabilitado
          ? [{ especialidad_id: this.especialidades()[0]?.id ?? '', hora_inicio: HORA_INICIO_DEFAULT, hora_fin: HORA_FIN_DEFAULT }]
          : [],
      },
    });
  }

  toggleExpand(dia: DiaSemana): void {
    this.expandedDay.update(current => current === dia ? null : dia);
  }

  onBloqueChange(dia: DiaSemana, index: number, campo: keyof BloqueHorario, valor: string): void {
    const actual = this.configuracion()[dia];
    const nuevosBloques = actual.bloques.map((b, i) => {
      if (i !== index) return b;
      return { ...b, [campo]: valor } as BloqueHorario;
    });

    this.configuracionChange.emit({
      dia,
      config: { ...actual, bloques: nuevosBloques },
    });
  }

  agregarBloque(dia: DiaSemana): void {
    const actual = this.configuracion()[dia];
    const ultimoBloque = actual.bloques[actual.bloques.length - 1];
    const horaInicioNueva = ultimoBloque ? ultimoBloque.hora_fin : HORA_INICIO_DEFAULT;

    this.configuracionChange.emit({
      dia,
      config: {
        ...actual,
        bloques: [
          ...actual.bloques,
          {
            especialidad_id: this.especialidades()[0]?.id ?? '',
            hora_inicio: horaInicioNueva,
            hora_fin: this.calcularFinDefault(horaInicioNueva, dia),
          },
        ],
      },
    });
  }

  eliminarBloque(dia: DiaSemana, index: number): void {
    const actual = this.configuracion()[dia];
    this.configuracionChange.emit({
      dia,
      config: {
        ...actual,
        bloques: actual.bloques.filter((_, i) => i !== index),
      },
    });
  }

  validarBloque(bloque: BloqueHorario, dia: DiaSemana): string | null {
    const restriccion = RESTRICCIONES_HORARIAS[dia];
    if (!restriccion) return null;

    if (!bloque.especialidad_id) {
      return 'Seleccioná una especialidad';
    }

    if (bloque.hora_inicio < restriccion.inicio || bloque.hora_inicio >= restriccion.fin) {
      return `Hora fuera del rango (${restriccion.inicio} - ${restriccion.fin})`;
    }

    if (bloque.hora_fin > restriccion.fin || bloque.hora_fin <= restriccion.inicio) {
      return `Hora fuera del rango (${restriccion.inicio} - ${restriccion.fin})`;
    }

    if (bloque.hora_fin <= bloque.hora_inicio) {
      return 'La hora de fin debe ser posterior a la de inicio';
    }

    return null;
  }

  private calcularFinDefault(horaInicio: string, dia: DiaSemana): string {
    const limite = RESTRICCIONES_HORARIAS[dia]?.fin ?? HORA_FIN_DEFAULT;
    const limiteHoras = parseInt(limite.split(':')[0], 10);
    const partes = horaInicio.split(':');
    const horas = parseInt(partes[0], 10);
    const fin = Math.min(horas + EXTENSION_BLOQUE_DEFAULT_HORAS, limiteHoras);
    return `${String(fin).padStart(2, '0')}:00`;
  }
}
