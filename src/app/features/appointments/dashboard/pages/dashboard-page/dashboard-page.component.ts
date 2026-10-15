import { Component, inject, OnInit, signal, computed, ViewChild } from '@angular/core';
import { NgClass } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Observable } from 'rxjs';
import { LucideDynamicIcon } from '@lucide/angular';
import { AuthService, UserRole } from '@core/services/auth.service';
import { TurnosService } from '@core/services/turnos.service';
import { TurnoConRelaciones, EncuestaSatisfaccion, ORDEN_ESTADOS_TURNO } from '@core/models/turno.model';
import { TurnoEstado } from '@core/models/database.types';
import { ComentarioDialogComponent } from '../../dialogs/comentario-dialog.component';
import { ResenaModalComponent } from '../../dialogs/resena-modal.component';
import { CalificarAtencionDialogComponent } from '../../dialogs/calificar-atencion-dialog.component';
import { EncuestaSatisfaccionDialogComponent } from '../../dialogs/encuesta-satisfaccion-dialog.component';
import { FinishAppointmentDialogComponent } from '../../../finish/dialogs/finish-appointment.dialog';
import { TurnoActionsComponent, AccionTurno } from '../../components/turno-actions/turno-actions.component';
import { PaginationComponent } from '@shared/components/pagination/pagination.component';
import { DEFAULT_PAGE_SIZE } from '@shared/components/pagination/pagination.config';
import { EstadoTurnoColorPipe } from '@shared/pipes/estado-turno-color.pipe';
import { FechaFormatPipe } from '@shared/pipes/fecha-format.pipe';
import { EmptyValuePipe } from '@shared/pipes/empty-value.pipe';
import { extraerFechaCorta, extraerHora, formatearFechaCortaLegibleEsAR, formatearFechaLegibleEsAR, nombreMesEsAR } from '@shared/utils/date-locale.utils';
import { MedicalRecordsService } from '@core/services/medical-records.service';
import { MedicalRecordConRelaciones } from '@core/models/medical-record.model';
import { RegistrationService, Specialty } from '@core/services/registration.service';

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
    LucideDynamicIcon,
    ComentarioDialogComponent,
    ResenaModalComponent,
    CalificarAtencionDialogComponent,
    EncuestaSatisfaccionDialogComponent,
    FinishAppointmentDialogComponent,
    TurnoActionsComponent,
    PaginationComponent,
    EstadoTurnoColorPipe,
    FechaFormatPipe,
    EmptyValuePipe,
  ],
  templateUrl: './dashboard-page.component.html',
})
export class DashboardPageComponent implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly turnosService = inject(TurnosService);
  private readonly medicalRecordsService = inject(MedicalRecordsService);
  private readonly registrationService = inject(RegistrationService);

  readonly dialogComentario = signal<ComentarioDialogComponent | null>(null);
  readonly modalResena = signal<ResenaModalComponent | null>(null);
  readonly dialogCalificar = signal<CalificarAtencionDialogComponent | null>(null);
  readonly dialogEncuesta = signal<EncuestaSatisfaccionDialogComponent | null>(null);
  readonly dialogFinalizar = signal<FinishAppointmentDialogComponent | null>(null);

  @ViewChild('dialogComentario') set setDialogComentario(ref: ComentarioDialogComponent | undefined) {
    if (ref) this.dialogComentario.set(ref);
  }

  @ViewChild('modalResena') set setModalResena(ref: ResenaModalComponent | undefined) {
    if (ref) this.modalResena.set(ref);
  }

  @ViewChild('dialogCalificar') set setDialogCalificar(ref: CalificarAtencionDialogComponent | undefined) {
    if (ref) this.dialogCalificar.set(ref);
  }

  @ViewChild('dialogEncuesta') set setDialogEncuesta(ref: EncuestaSatisfaccionDialogComponent | undefined) {
    if (ref) this.dialogEncuesta.set(ref);
  }

  @ViewChild('dialogFinalizar') set setDialogFinalizar(ref: FinishAppointmentDialogComponent | undefined) {
    if (ref) this.dialogFinalizar.set(ref);
  }

  /** Turnos crudos cargados desde Supabase. */
  private readonly _turnos = signal<TurnoConRelaciones[]>([]);

  /** Historias clínicas asociadas a los turnos (para búsqueda en datos clínicos). */
  private readonly _historiasClinicas = signal<Map<string, MedicalRecordConRelaciones>>(new Map());

  /** Término de búsqueda global del usuario. */
  readonly searchQuery = signal('');

  /** Filtro activo por estado (null = todos). */
  readonly filtroEstado = signal<TurnoEstado | null>(null);

  /** Especialidades disponibles para el filtro dropdown. */
  readonly especialidades = signal<readonly Specialty[]>([]);

  /** Filtro activo por especialidad (null = todas). */
  readonly filtroEspecialidad = signal<string | null>(null);

  /** Rol del usuario autenticado. */
  readonly rol = this.authService.userRole;

  /** Perfil del usuario autenticado. */
  readonly perfil = this.authService.userProfile;

  /** Indica si está cargando los turnos iniciales. */
  readonly isLoading = signal(true);

  /** Error de carga con reintento cuando falla la lectura inicial. */
  readonly errorCarga = signal<string | null>(null);

  /** Turno seleccionado para alguna operacion. */
  readonly turnoSeleccionado = signal<TurnoConRelaciones | null>(null);

  /** Tipo de accion pendiente en el dialogo de comentario ('cancelar' | 'rechazar' | 'confirmar'). */
  private accionPendiente = signal<'cancelar' | 'rechazar' | 'confirmar'>('cancelar');

  /** Orden canónico de estados para las pestañas de filtro. */
  readonly ordenEstados = ORDEN_ESTADOS_TURNO;

  /** Tamaño de segmento compartido con el paginador. */
  readonly pageSize = DEFAULT_PAGE_SIZE;

  /** Contadores por estado para los tabs. */
  readonly contadores = computed(() => {
    const turnos = this._turnos();
    const contadores: Record<TurnoEstado, number> = {
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

  /** Turnos filtrados por busqueda global, estado y especialidad. */
  readonly turnosFiltrados = computed(() => {
    let turnos = this._turnos();
    const query = this.searchQuery().toLowerCase().trim();
    const estado = this.filtroEstado();
    const especialidadId = this.filtroEspecialidad();
    const historiasMap = this._historiasClinicas();

    if (estado) {
      turnos = turnos.filter(t => t.estado === estado);
    }

    if (especialidadId) {
      turnos = turnos.filter(t => t.especialidad_id === especialidadId);
    }

    if (!query) return turnos;

    return turnos.filter(t => {
      const especialidad = t.especialidad?.name?.toLowerCase() ?? '';
      const especialista = t.especialista?.full_name?.toLowerCase() ?? '';
      const paciente = t.paciente?.full_name?.toLowerCase() ?? '';
      const estadoTurno = t.estado.toLowerCase();
      const resena = t.resena_diagnostico?.toLowerCase() ?? '';
      const comentarioCancelacion = t.comentario_cancelacion_rechazo?.toLowerCase() ?? '';

      const fechaRaw = extraerFechaCorta(t.fecha_hora);
      const [anio, mes, dia] = fechaRaw.split('-');
      const fechaISO = `${anio}-${mes}-${dia}`;
      const fechaBarra = `${dia}/${mes}/${anio}`;
      const fechaLegible = `${dia} de ${nombreMesEsAR(mes)} de ${anio}`;
      const fechaCortaLegible = formatearFechaCortaLegibleEsAR(t.fecha_hora).toLowerCase();
      const hora = extraerHora(t.fecha_hora);

      const coincideBasico = especialidad.includes(query)
        || especialista.includes(query)
        || paciente.includes(query)
        || estadoTurno.includes(query)
        || resena.includes(query)
        || comentarioCancelacion.includes(query)
        || fechaISO.includes(query)
        || fechaBarra.includes(query)
        || fechaLegible.toLowerCase().includes(query)
        || fechaCortaLegible.includes(query)
        || hora.includes(query);

      if (coincideBasico) return true;

      const historia = historiasMap.get(t.id);
      if (!historia) return false;

      const altura = String(historia.altura);
      const peso = String(historia.peso);
      const temperatura = String(historia.temperatura);
      const presion = historia.presion_arterial.toLowerCase();
      const resenaHistoria = historia.turno?.resena_diagnostico?.toLowerCase() ?? '';

      const coincideFijo = altura.includes(query)
        || peso.includes(query)
        || temperatura.includes(query)
        || presion.includes(query)
        || resenaHistoria.includes(query);

      if (coincideFijo) return true;

      if (historia.datos_dinamicos && historia.datos_dinamicos.length > 0) {
        const coincideDinamico = historia.datos_dinamicos.some(
          d => d.clave.toLowerCase().includes(query) || d.valor.toLowerCase().includes(query),
        );
        if (coincideDinamico) return true;
      }

      return false;
    });
  });

  /** Pagina actual del paginador. */
  readonly currentPage = signal(1);

  /** Porcion paginada del array filtrado para la pagina actual. */
  readonly turnosPaginados = computed(() => {
    const inicio = (this.currentPage() - 1) * this.pageSize;
    const fin = inicio + this.pageSize;
    return this.turnosFiltrados().slice(inicio, fin);
  });

  /** Total de turnos sin filtrar. */
  readonly totalTurnos = computed(() => this._turnos().length);

  /** Titulo adaptado segun el rol. */
  readonly titulo = computed(() => {
    const r = this.rol();
    if (r === 'paciente') return 'Mis Turnos';
    if (r === 'especialista') return 'Mi Agenda de Turnos';
    return 'Gestión Global de Turnos';
  });

  /** Subtitulo adaptado segun el rol. */
  readonly subtitulo = computed(() => {
    const r = this.rol();
    if (r === 'paciente') return 'Consulta y gestiona tus citas médicas programadas';
    if (r === 'especialista') return 'Gestiona la atención y consultas de tus pacientes';
    return 'Supervisión y control administrativo central';
  });

  async ngOnInit(): Promise<void> {
    await this.recargar();
  }

  /** Recarga turnos y especialidades tras un error o por reintento explícito. */
  async recargar(): Promise<void> {
    this.errorCarga.set(null);
    this.currentPage.set(1);
    await Promise.all([
      this.fetchTurnosByRole(true),
      this.cargarEspecialidades(),
    ]);
  }

  /**
   * Obtiene los turnos del usuario autenticado segun su rol.
   *
   * Metodo unificado que reemplaza la logica duplicada de
   * cargarTurnos() y recargarTurnos(). Consulta Supabase,
   * actualiza el signal interno y carga las historias clinicas
   * asociadas para habilitar la busqueda en datos clinicos.
   *
   * @param mostrarLoading Si es true, activa el indicador de carga.
   */
  private async fetchTurnosByRole(mostrarLoading = false): Promise<void> {
    if (mostrarLoading) this.isLoading.set(true);

    const perfil = this.perfil();
    const rol = this.rol();

    if (!perfil || !rol) {
      if (mostrarLoading) this.isLoading.set(false);
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
    const historialOk = await this.cargarHistoriasClinicas(turnos as TurnoConRelaciones[], rol, perfil.id);
    const turnosError = this.turnosService.lastError();
    if (turnosError) {
      this.errorCarga.set(turnosError);
    } else if (!historialOk) {
      this.errorCarga.set('No se pudo cargar el historial clínico para la búsqueda.');
    }
    if (mostrarLoading) this.isLoading.set(false);
  }

  /**
   * Carga las historias clínicas asociadas a los turnos para habilitar
   * la búsqueda en datos clínicos fijos y dinámicos.
   *
   * @param turnos Lista de turnos cargados.
   * @param rol Rol del usuario autenticado.
   * @param perfilId ID del perfil del usuario.
   */
  private async cargarHistoriasClinicas(
    turnos: readonly TurnoConRelaciones[],
    rol: UserRole,
    perfilId: string,
  ): Promise<boolean> {
    const historiasMap = new Map<string, MedicalRecordConRelaciones>();
    let sinErrores = true;

    const loadHistory = (observable$: Observable<readonly MedicalRecordConRelaciones[]>) =>
      new Promise<void>((resolve) => {
        observable$.subscribe({
          next: (records) => {
            for (const record of records) {
              historiasMap.set(record.turno_id, record);
            }
            resolve();
          },
          error: () => {
            sinErrores = false;
            resolve();
          },
        });
      });

    switch (rol) {
      case 'paciente':
        await loadHistory(this.medicalRecordsService.getHistoryByPatientId(perfilId));
        break;
      case 'especialista':
        await loadHistory(this.medicalRecordsService.getHistoryBySpecialistId(perfilId));
        break;
      case 'administrador':
        await loadHistory(this.medicalRecordsService.getAllRecords());
        break;
    }

    this._historiasClinicas.set(historiasMap);
    return sinErrores;
  }

  /** Actualiza el termino de busqueda y resetea la paginacion. */
  actualizarBusqueda(valor: string): void {
    this.searchQuery.set(valor);
    this.currentPage.set(1);
  }

  /** Selecciona un filtro de estado o lo deselecciona, reseteando la paginacion. */
  seleccionarFiltro(estado: TurnoEstado | null): void {
    this.filtroEstado.update(actual => actual === estado ? null : estado);
    this.currentPage.set(1);
  }

  /** Selecciona un filtro de especialidad o lo deselecciona, reseteando la paginacion. */
  seleccionarFiltroEspecialidad(especialidadId: string | null): void {
    this.filtroEspecialidad.update(actual => actual === especialidadId ? null : especialidadId);
    this.currentPage.set(1);
  }

  /** Carga las especialidades activas para el filtro dropdown. */
  private async cargarEspecialidades(): Promise<void> {
    try {
      const data = await this.registrationService.getActiveSpecialties();
      this.especialidades.set(data);
    } catch {
      this.errorCarga.set('No se pudieron cargar las especialidades del filtro.');
    }
  }

  /** Maneja el cambio de pagina desde el componente de paginacion. */
  onPageChange(page: number): void {
    this.currentPage.set(page);
  }

  /**
   * Despacha la accion elegida desde los botones de turno hacia el
   * método de dialogo correspondiente.
   *
   * @param accion Accion emitida por el componente de acciones.
   * @param turno Turno sobre el que se ejecuta la accion.
   */
  ejecutarAccion(accion: AccionTurno, turno: TurnoConRelaciones): void {
    switch (accion) {
      case 'aceptar':
        this.abrirDialogoConfirmarAceptar(turno);
        break;
      case 'rechazar':
        this.abrirDialogoRechazar(turno);
        break;
      case 'finalizar':
        this.abrirDialogoFinalizar(turno);
        break;
      case 'cancelar':
        this.abrirDialogoCancelar(turno);
        break;
      case 'ver-resena':
        this.abrirModalResena(turno);
        break;
      case 'calificar':
        this.abrirDialogoCalificar(turno);
        break;
      case 'ver-calificacion':
        this.verCalificacion(turno);
        break;
      case 'completar-encuesta':
        this.abrirEncuesta(turno);
        break;
      case 'ver-encuesta':
        this.verEncuesta(turno);
        break;
    }
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

  /** Abre el dialogo de alta medica para finalizar un turno. */
  abrirDialogoFinalizar(turno: TurnoConRelaciones): void {
    this.turnoSeleccionado.set(turno);
    this.dialogFinalizar()?.abrir();
  }

  /** Callback tras finalizacion exitosa desde el dialogo de alta medica. */
  async onFinalizacionCompleta(): Promise<void> {
    await this.fetchTurnosByRole();
    this.turnoSeleccionado.set(null);
  }

  /** Confirma la aceptacion de un turno tras dialogo de confirmacion. */
  abrirDialogoConfirmarAceptar(turno: TurnoConRelaciones): void {
    this.turnoSeleccionado.set(turno);
    this.accionPendiente.set('confirmar');
    this.dialogComentario()?.abrirConfirmacion({
      titulo: 'Confirmar turno',
      descripcion: `¿Deseas aceptar el turno del paciente ${turno.paciente?.full_name ?? '—'} para ${turno.especialidad?.name ?? '—'} el ${this.formatearFechaLegible(turno.fecha_hora)} a las ${this.formatearHora(turno.fecha_hora)} hs?`,
      textoConfirmar: 'Confirmar aceptación',
    });
  }

  /** Ejecuta la accion pendiente sobre un turno desde el dialogo de comentario. */
  async confirmarAccionDesdeDialogo(comentario: string): Promise<void> {
    const turno = this.turnoSeleccionado();
    if (!turno) return;

    const accion = this.accionPendiente();

    try {
      switch (accion) {
        case 'rechazar':
          await this.turnosService.rechazarTurno(turno.id, comentario);
          break;
        case 'confirmar':
          await this.turnosService.confirmarTurno(turno.id);
          break;
        case 'cancelar':
        default:
          await this.turnosService.cancelarTurno(turno.id, comentario);
          break;
      }

      await this.fetchTurnosByRole();
    } finally {
      this.turnoSeleccionado.set(null);
    }
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

  /** Abre el dialogo de calificacion en modo lectura. */
  verCalificacion(turno: TurnoConRelaciones): void {
    this.turnoSeleccionado.set(turno);
    this.dialogCalificar()?.abrirLectura(turno.calificacion_estrellas ?? 0, turno.calificacion_comentario ?? '');
  }

  /** Confirma la calificacion de un turno. */
  async confirmarCalificar(datos: { comentario: string; estrellas: number }): Promise<void> {
    const turno = this.turnoSeleccionado();
    if (!turno) {
      this.dialogCalificar()?.finalizarEnvio();
      return;
    }

    try {
      await this.turnosService.calificarTurno(turno.id, datos.comentario, datos.estrellas);
      await this.fetchTurnosByRole();
    } finally {
      this.dialogCalificar()?.finalizarEnvio();
      this.turnoSeleccionado.set(null);
    }
  }

  /** Abre el dialogo de encuesta de satisfaccion para un turno. */
  abrirEncuesta(turno: TurnoConRelaciones): void {
    this.turnoSeleccionado.set(turno);
    this.dialogEncuesta()?.abrir();
  }

  /** Abre el dialogo de encuesta en modo lectura. */
  verEncuesta(turno: TurnoConRelaciones): void {
    this.turnoSeleccionado.set(turno);
    if (turno.encuesta_satisfaccion) {
      this.dialogEncuesta()?.abrirLectura(turno.encuesta_satisfaccion);
    }
  }

  /** Confirma el envio de la encuesta de satisfaccion. */
  async confirmarEncuesta(encuesta: EncuestaSatisfaccion): Promise<void> {
    const turno = this.turnoSeleccionado();
    if (!turno) {
      this.dialogEncuesta()?.finalizarEnvio();
      return;
    }

    try {
      await this.turnosService.guardarEncuesta(turno.id, encuesta);
      await this.fetchTurnosByRole();
    } finally {
      this.dialogEncuesta()?.finalizarEnvio();
      this.turnoSeleccionado.set(null);
    }
  }

  formatearHora(fechaHora: string): string {
    return extraerHora(fechaHora);
  }

  formatearFechaLegible(fechaHora: string): string {
    return formatearFechaLegibleEsAR(fechaHora);
  }
}
