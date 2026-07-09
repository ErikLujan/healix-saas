import { Component, inject, OnInit, signal, computed, ViewChild } from '@angular/core';
import { NgClass } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService, UserRole } from '@core/services/auth.service';
import { TurnosService } from '@core/services/turnos.service';
import { TurnoConRelaciones } from '@core/models/turno.model';
import { TurnoCardComponent } from '../../components/turno-card/turno-card.component';
import { ComentarioDialogComponent } from '../../dialogs/comentario-dialog.component';
import { ResenaMedicaDialogComponent } from '../../dialogs/resena-medica-dialog.component';
import { ResenaModalComponent } from '../../dialogs/resena-modal.component';
import { CalificarAtencionDialogComponent } from '../../dialogs/calificar-atencion-dialog.component';
import { PaginationComponent } from '@shared/components/pagination/pagination.component';

/** Etiquetas legibles para los tabs de filtrado por estado. */
const ETIQUETAS_ESTADO: Record<string, string> = {
  pendiente: 'Pendiente',
  confirmado: 'Aceptado',
  rechazado: 'Rechazado',
  cancelado: 'Cancelado',
  finalizado: 'Finalizado',
};

/** Cantidad maxima de tarjetas visibles por pagina en el dashboard. */
const PAGE_SIZE = 4;

/**
 * Dashboard unificado de gestion de turnos.
 *
 * Componente smart/container que identifica al usuario autenticado,
 * carga sus turnos desde Supabase y gestiona la busqueda reactiva
 * global 100% en memoria mediante Angular Signals.
 *
 * Adapta la interfaz y las acciones disponibles segun el rol
 * del usuario: paciente, especialista o administrador.
 */
@Component({
  selector: 'app-dashboard-page',
  standalone: true,
  imports: [
    NgClass,
    FormsModule,
    RouterLink,
    TurnoCardComponent,
    ComentarioDialogComponent,
    ResenaMedicaDialogComponent,
    ResenaModalComponent,
    CalificarAtencionDialogComponent,
    PaginationComponent,
  ],
  templateUrl: './dashboard-page.component.html',
})
export class DashboardPageComponent implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly turnosService = inject(TurnosService);

  readonly dialogComentario = signal<ComentarioDialogComponent | null>(null);
  readonly dialogResena = signal<ResenaMedicaDialogComponent | null>(null);
  readonly modalResena = signal<ResenaModalComponent | null>(null);
  readonly dialogCalificar = signal<CalificarAtencionDialogComponent | null>(null);

  @ViewChild('dialogComentario') set setDialogComentario(ref: ComentarioDialogComponent | undefined) {
    if (ref) this.dialogComentario.set(ref);
  }

  @ViewChild('dialogResena') set setDialogResena(ref: ResenaMedicaDialogComponent | undefined) {
    if (ref) this.dialogResena.set(ref);
  }

  @ViewChild('modalResena') set setModalResena(ref: ResenaModalComponent | undefined) {
    if (ref) this.modalResena.set(ref);
  }

  @ViewChild('dialogCalificar') set setDialogCalificar(ref: CalificarAtencionDialogComponent | undefined) {
    if (ref) this.dialogCalificar.set(ref);
  }

  /** Turnos crudos cargados desde Supabase. */
  private readonly _turnos = signal<TurnoConRelaciones[]>([]);

  /** Termino de busqueda global del usuario. */
  readonly searchQuery = signal('');

  /** Filtro activo por estado (null = todos). */
  readonly filtroEstado = signal<string | null>(null);

  /** Rol del usuario autenticado. */
  readonly rol = this.authService.userRole;

  /** Perfil del usuario autenticado. */
  readonly perfil = this.authService.userProfile;

  /** Indica si esta cargando los turnos iniciales. */
  readonly isLoading = signal(true);

  /** Turno seleccionado para alguna operacion. */
  private turnoSeleccionado = signal<TurnoConRelaciones | null>(null);

  /** Tipo de accion pendiente en el dialogo de comentario ('cancelar' | 'rechazar'). */
  private accionPendiente = signal<'cancelar' | 'rechazar'>('cancelar');

  /** Contadores por estado para los tabs. */
  readonly contadores = computed(() => {
    const turnos = this._turnos();
    const contadores: Record<string, number> = {
      pendiente: 0,
      confirmado: 0,
      rechazado: 0,
      cancelado: 0,
      finalizado: 0,
    };
    for (const t of turnos) {
      contadores[t.estado] = (contadores[t.estado] ?? 0) + 1;
    }
    return contadores;
  });

  /** Turnos filtrados por busqueda global y estado. */
  readonly turnosFiltrados = computed(() => {
    let turnos = this._turnos();
    const query = this.searchQuery().toLowerCase().trim();
    const estado = this.filtroEstado();

    if (estado) {
      turnos = turnos.filter(t => t.estado === estado);
    }

    if (!query) return turnos;

    return turnos.filter(t => {
      const especialidad = t.especialidad?.name?.toLowerCase() ?? '';
      const especialista = t.especialista?.full_name?.toLowerCase() ?? '';
      const paciente = t.paciente?.full_name?.toLowerCase() ?? '';
      const estadoTurno = t.estado.toLowerCase();

      return especialidad.includes(query)
        || especialista.includes(query)
        || paciente.includes(query)
        || estadoTurno.includes(query);
    });
  });

  /** Pagina actual del paginador. */
  readonly currentPage = signal(1);

  /** Porcion paginada del array filtrado para la pagina actual. */
  readonly turnosPaginados = computed(() => {
    const inicio = (this.currentPage() - 1) * PAGE_SIZE;
    const fin = inicio + PAGE_SIZE;
    return this.turnosFiltrados().slice(inicio, fin);
  });

  /** Total de turnos sin filtrar. */
  readonly totalTurnos = computed(() => this._turnos().length);

  /** Titulo adaptado segun el rol. */
  readonly titulo = computed(() => {
    const r = this.rol();
    if (r === 'paciente') return 'Mis turnos';
    if (r === 'especialista') return 'Mis turnos';
    return 'Turnos';
  });

  /** Subtitulo adaptado segun el rol. */
  readonly subtitulo = computed(() => {
    const r = this.rol();
    if (r === 'administrador') return 'Supervisá y auditá todas las consultas del sistema.';
    return 'Filtrá por estado y gestioná tus consultas.';
  });

  async ngOnInit(): Promise<void> {
    await this.cargarTurnos();
  }

  /** Carga los turnos segun el rol del usuario autenticado. */
  private async cargarTurnos(): Promise<void> {
    this.isLoading.set(true);
    const perfil = this.perfil();
    const rol = this.rol();

    if (!perfil || !rol) {
      this.isLoading.set(false);
      return;
    }

    let turnos: readonly TurnoConRelaciones[];

    switch (rol) {
      case 'paciente':
        turnos = await this.turnosService.obtenerTurnosPorPaciente(perfil.id);
        break;
      case 'especialista':
        turnos = await this.turnosService.obtenerTurnosPorEspecialista(perfil.id);
        break;
      case 'administrador':
        turnos = await this.turnosService.obtenerTodosLosTurnosAdmin();
        break;
      default:
        turnos = [];
    }

    this._turnos.set(turnos as TurnoConRelaciones[]);
    this.isLoading.set(false);
  }

  /** Actualiza el termino de busqueda y resetea la paginacion. */
  actualizarBusqueda(valor: string): void {
    this.searchQuery.set(valor);
    this.currentPage.set(1);
  }

  /** Selecciona un filtro de estado o lo deselecciona, reseteando la paginacion. */
  seleccionarFiltro(estado: string | null): void {
    this.filtroEstado.update(actual => actual === estado ? null : estado);
    this.currentPage.set(1);
  }

  /** Maneja el cambio de pagina desde el componente de paginacion. */
  onPageChange(page: number): void {
    this.currentPage.set(page);
  }

  /** Abre el dialogo de cancelacion para un turno. */
  abrirDialogoCancelar(turno: TurnoConRelaciones): void {
    this.turnoSeleccionado.set(turno);
    this.accionPendiente.set('cancelar');
    this.dialogComentario()?.abrir({
      titulo: 'Cancelar turno',
      placeholder: 'Describe el motivo de la cancelación...',
      textoConfirmar: 'Confirmar cancelación',
    });
  }

  /** Abre el dialogo de rechazo para un turno. */
  abrirDialogoRechazar(turno: TurnoConRelaciones): void {
    this.turnoSeleccionado.set(turno);
    this.accionPendiente.set('rechazar');
    this.dialogComentario()?.abrir({
      titulo: 'Rechazar turno',
      placeholder: 'Indicá el motivo del rechazo...',
      textoConfirmar: 'Confirmar rechazo',
    });
  }

  /** Abre el dialogo de resena medica para finalizar un turno. */
  abrirDialogoFinalizar(turno: TurnoConRelaciones): void {
    this.turnoSeleccionado.set(turno);
    this.dialogResena()?.abrir();
  }

  /** Confirma la cancelacion o rechazo de un turno segun la accion pendiente. */
  async confirmarCancelar(comentario: string): Promise<void> {
    const turno = this.turnoSeleccionado();
    if (!turno) return;

    const accion = this.accionPendiente();

    if (accion === 'rechazar') {
      await this.turnosService.rechazarTurno(turno.id, comentario);
    } else {
      await this.turnosService.cancelarTurno(turno.id, comentario);
    }

    await this.recargarTurnos();
    this.turnoSeleccionado.set(null);
  }

  /** Confirma la finalizacion de un turno con resena medica. */
  async confirmarFinalizar(resena: string): Promise<void> {
    const turno = this.turnoSeleccionado();
    if (!turno) return;

    await this.turnosService.finalizarTurno(turno.id, resena);
    await this.recargarTurnos();
    this.turnoSeleccionado.set(null);
  }

  /** Confirma la aceptacion de un turno. */
  async confirmarAceptar(turno: TurnoConRelaciones): Promise<void> {
    await this.turnosService.confirmarTurno(turno.id);
    await this.recargarTurnos();
  }

  /** Abre el modal de resena medica para un turno. */
  abrirModalResena(turno: TurnoConRelaciones): void {
    this.modalResena()?.abrir(turno.resena_diagnostico ?? '');
  }

  /** Abre el dialogo de calificacion para un turno. */
  abrirDialogoCalificar(turno: TurnoConRelaciones): void {
    this.turnoSeleccionado.set(turno);
    this.dialogCalificar()?.abrir();
  }

  /** Confirma la calificacion de un turno. */
  async confirmarCalificar(datos: { comentario: string; estrellas: number }): Promise<void> {
    const turno = this.turnoSeleccionado();
    if (!turno) return;

    await this.turnosService.calificarTurno(turno.id, datos.comentario, datos.estrellas);
    await this.recargarTurnos();
    this.turnoSeleccionado.set(null);
  }

  /** Abre el stub de encuesta (proximamente). */
  abrirEncuesta(turno: TurnoConRelaciones): void {
    this.turnoSeleccionado.set(turno);
    this.dialogComentario()?.abrir({
      titulo: 'Encuesta de Satisfaccion',
      placeholder: 'Encuesta de Satisfaccion de la Clinica - Proximamente disponible',
      textoConfirmar: 'Cerrar',
    });
  }

  /** Recarga los turnos desde Supabase. */
  private async recargarTurnos(): Promise<void> {
    const perfil = this.perfil();
    const rol = this.rol();
    if (!perfil || !rol) return;

    let turnos: readonly TurnoConRelaciones[];

    switch (rol) {
      case 'paciente':
        turnos = await this.turnosService.obtenerTurnosPorPaciente(perfil.id);
        break;
      case 'especialista':
        turnos = await this.turnosService.obtenerTurnosPorEspecialista(perfil.id);
        break;
      case 'administrador':
        turnos = await this.turnosService.obtenerTodosLosTurnosAdmin();
        break;
      default:
        turnos = [];
    }

    this._turnos.set(turnos as TurnoConRelaciones[]);
  }
}
