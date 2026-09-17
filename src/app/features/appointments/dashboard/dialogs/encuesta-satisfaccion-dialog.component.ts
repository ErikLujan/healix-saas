import { Component, output, signal, computed, HostListener } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgClass } from '@angular/common';
import { LucideDynamicIcon } from '@lucide/angular';
import { EncuestaSatisfaccion } from '@core/models/turno.model';

@Component({
  selector: 'app-encuesta-satisfaccion-dialog',
  standalone: true,
  imports: [FormsModule, NgClass, LucideDynamicIcon],
  templateUrl: './encuesta-satisfaccion-dialog.component.html',
})
export class EncuestaSatisfaccionDialogComponent {
  readonly esLectura = signal(false);

  readonly nivelSatisfaccion = signal(50);
  readonly puntuacionPlataforma = signal(0);
  readonly recomendaria = signal<'si' | 'no' | 'tal_vez' | null>(null);
  readonly aspectosSeleccionados = signal<readonly string[]>([]);
  readonly comentarios = signal('');
  readonly isVisible = signal(false);
  readonly isEnviando = signal(false);
  readonly puntuacionHover = signal(0);

  readonly onConfirmar = output<EncuestaSatisfaccion>();
  readonly onCerrar = output<void>();

  readonly aspectosDisponibles = [
    { id: 'profesionalismo', label: 'Profesionalismo del especialista' },
    { id: 'puntualidad', label: 'Puntualidad' },
    { id: 'instalaciones', label: 'Instalaciones' },
    { id: 'atencion', label: 'Calidad de atención' },
  ];

  readonly puntuacionArray = [1, 2, 3, 4, 5];

  readonly botonDeshabilitado = computed(() =>
    this.isEnviando()
    || this.puntuacionPlataforma() === 0
    || this.recomendaria() === null,
  );

  @HostListener('window:keydown.escape')
  onEscapeKey(): void {
    if (this.isVisible() && !this.isEnviando()) this.cerrar();
  }

  abrir(encuesta?: EncuestaSatisfaccion): void {
    this.esLectura.set(false);
    if (encuesta) {
      this.nivelSatisfaccion.set(encuesta.nivel_satisfaccion);
      this.puntuacionPlataforma.set(encuesta.puntuacion_plataforma);
      this.recomendaria.set(encuesta.recomendaria);
      this.aspectosSeleccionados.set([...encuesta.aspectos_destacados]);
      this.comentarios.set(encuesta.comentarios);
    } else {
      this.nivelSatisfaccion.set(50);
      this.puntuacionPlataforma.set(0);
      this.recomendaria.set(null);
      this.aspectosSeleccionados.set([]);
      this.comentarios.set('');
    }
    this.puntuacionHover.set(0);
    this.isEnviando.set(false);
    this.isVisible.set(true);
  }

  abrirLectura(encuesta: EncuestaSatisfaccion): void {
    this.esLectura.set(true);
    this.nivelSatisfaccion.set(encuesta.nivel_satisfaccion);
    this.puntuacionPlataforma.set(encuesta.puntuacion_plataforma);
    this.recomendaria.set(encuesta.recomendaria);
    this.aspectosSeleccionados.set([...encuesta.aspectos_destacados]);
    this.comentarios.set(encuesta.comentarios);
    this.puntuacionHover.set(0);
    this.isEnviando.set(false);
    this.isVisible.set(true);
  }

  cerrar(): void {
    if (this.isEnviando()) return;
    this.isVisible.set(false);
    this.onCerrar.emit();
  }

  onBackdropClick(event: MouseEvent): void {
    if (event.target === event.currentTarget) {
      this.cerrar();
    }
  }

  seleccionarPuntuacion(valor: number): void {
    if (this.esLectura()) return;
    this.puntuacionPlataforma.set(valor);
  }

  seleccionarRecomendaria(valor: 'si' | 'no' | 'tal_vez'): void {
    if (this.esLectura()) return;
    this.recomendaria.set(valor);
  }

  toggleAspecto(aspectoId: string): void {
    if (this.esLectura()) return;
    this.aspectosSeleccionados.update(actuales => {
      if (actuales.includes(aspectoId)) {
        return actuales.filter(a => a !== aspectoId);
      }
      return [...actuales, aspectoId];
    });
  }

  actualizarComentarios(valor: string): void {
    if (this.esLectura()) return;
    this.comentarios.set(valor);
  }

  confirmar(): void {
    if (this.botonDeshabilitado()) return;
    this.isVisible.set(false);
    this.onConfirmar.emit({
      nivel_satisfaccion: this.nivelSatisfaccion(),
      puntuacion_plataforma: this.puntuacionPlataforma(),
      recomendaria: this.recomendaria()!,
      aspectos_destacados: this.aspectosSeleccionados(),
      comentarios: this.comentarios().trim(),
    });
  }
}
