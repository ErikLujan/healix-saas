import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { RouterLink } from '@angular/router';
import { fadeIn, slideUp } from '@core/animations/route-animations';
import { AuthService } from '@core/services/auth.service';
import { MedicalRecordsService } from '@features/medical-history/services/medical-records.service';
import { TurnosService } from '@core/services/turnos.service';
import { AdminUsersService } from '@features/administration/services/admin-users.service';
import { ResaltarCardDirective } from '@shared/directives/resaltar-card.directive';

/**
 * Interfaz para las tarjetas KPI del panel principal.
 */
interface KpiCard {
  readonly label: string;
  readonly value: string | number;
  readonly icon: string;
  readonly color: string;
  readonly bgColor: string;
  readonly link?: string;
}

/**
 * Pagina principal del dashboard multiperfil.
 *
 * Muestra tarjetas resumen (KPI cards) con datos reales de la plataforma.
 * El contenido varia dinamicamente segun el rol del usuario autenticado:
 * - Paciente: turnos proximos, historial clinico
 * - Especialista: turnos del dia, pendientes
 * - Administrador: metricas globales del sistema
 */
@Component({
  selector: 'app-home',
  standalone: true,
  imports: [RouterLink, ResaltarCardDirective],
  animations: [fadeIn, slideUp],
  template: `
    <div @fadeIn class="min-h-full">
      <div @slideUp class="mb-6">
        <h1 class="text-2xl font-bold text-gray-900">
          {{ tituloDashboard() }}
        </h1>
        <p class="text-sm text-gray-500 mt-1">
          {{ subtituloDashboard() }}
        </p>
      </div>

      @if (isLoading()) {
        <div class="flex justify-center py-16">
          <div class="w-10 h-10 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
        </div>
      } @else {
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          @for (card of kpiCards(); track card.label) {
            <a
              [routerLink]="card.link || null"
              class="bg-white border border-gray-200 rounded-xl p-5 hover:shadow-md transition-all duration-200 group"
              resaltarCard
              [class.cursor-pointer]="card.link"
              [class.cursor-default]="!card.link">
              <div class="flex items-start justify-between">
                <div>
                  <p class="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                    {{ card.label }}
                  </p>
                  <p class="text-3xl font-bold" [class]="card.color">
                    {{ card.value }}
                  </p>
                </div>
                <div [class]="'w-10 h-10 rounded-lg flex items-center justify-center ' + card.bgColor">
                  <span class="text-lg">{{ card.icon }}</span>
                </div>
              </div>
              @if (card.link) {
                <div class="mt-3 pt-3 border-t border-gray-100">
                  <span class="text-xs font-medium text-blue-600 group-hover:text-blue-700 transition-colors">
                    Ver detalles &rarr;
                  </span>
                </div>
              }
            </a>
          }
        </div>

        @if (userRole() === 'administrador') {
          <div class="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div class="bg-white border border-gray-200 rounded-xl p-5">
              <h3 class="text-sm font-semibold text-gray-700 mb-3">Accesos rapidos</h3>
              <div class="space-y-2">
                <a routerLink="/especialistas" class="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors">
                  <span class="text-lg">&#x1F468;&#x200D;&#x2695;&#xFE0F;</span>
                  <div>
                    <p class="text-sm font-medium text-gray-900">Gestionar especialistas</p>
                    <p class="text-xs text-gray-500">Aprobar, rechazar y administrar</p>
                  </div>
                </a>
                <a routerLink="/administracion/usuarios" class="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors">
                  <span class="text-lg">&#x1F465;</span>
                  <div>
                    <p class="text-sm font-medium text-gray-900">Administrar usuarios</p>
                    <p class="text-xs text-gray-500">Crear y gestionar cuentas</p>
                  </div>
                </a>
                <a routerLink="/estadisticas" class="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors">
                  <span class="text-lg">&#x1F4CA;</span>
                  <div>
                    <p class="text-sm font-medium text-gray-900">Ver estadisticas</p>
                    <p class="text-xs text-gray-500">Reportes y graficos del sistema</p>
                  </div>
                </a>
              </div>
            </div>

            <div class="bg-white border border-gray-200 rounded-xl p-5">
              <h3 class="text-sm font-semibold text-gray-700 mb-3">Resumen del sistema</h3>
              <div class="space-y-3">
                <div class="flex items-center justify-between py-2 border-b border-gray-100">
                  <span class="text-sm text-gray-600">Usuarios totales</span>
                  <span class="text-sm font-semibold text-gray-900">{{ totalUsuarios() }}</span>
                </div>
                <div class="flex items-center justify-between py-2 border-b border-gray-100">
                  <span class="text-sm text-gray-600">Especialistas aprobados</span>
                  <span class="text-sm font-semibold text-gray-900">{{ especialistasAprobados() }}</span>
                </div>
                <div class="flex items-center justify-between py-2 border-b border-gray-100">
                  <span class="text-sm text-gray-600">Pendientes de revision</span>
                  <span class="text-sm font-semibold text-amber-600">{{ especialistasPendientes() }}</span>
                </div>
                <div class="flex items-center justify-between py-2">
                  <span class="text-sm text-gray-600">Especialidades activas</span>
                  <span class="text-sm font-semibold text-gray-900">{{ especialidadesActivas() }}</span>
                </div>
              </div>
            </div>
          </div>
        }

        @if (userRole() === 'especialista') {
          <div class="mt-8">
            <div class="bg-white border border-gray-200 rounded-xl p-5">
              <h3 class="text-sm font-semibold text-gray-700 mb-3">Accesos rapidos</h3>
              <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <a routerLink="/turnos" class="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors">
                  <span class="text-lg">&#x1F4C5;</span>
                  <div>
                    <p class="text-sm font-medium text-gray-900">Ver turnos</p>
                    <p class="text-xs text-gray-500">Gestionar agenda</p>
                  </div>
                </a>
                <a routerLink="/disponibilidad" class="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors">
                  <span class="text-lg">&#x23F0;</span>
                  <div>
                    <p class="text-sm font-medium text-gray-900">Mi disponibilidad</p>
                    <p class="text-xs text-gray-500">Configurar horarios</p>
                  </div>
                </a>
                <a routerLink="/pacientes" class="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors">
                  <span class="text-lg">&#x1F4CB;</span>
                  <div>
                    <p class="text-sm font-medium text-gray-900">Mis pacientes</p>
                    <p class="text-xs text-gray-500">Historiales clinicos</p>
                  </div>
                </a>
              </div>
            </div>
          </div>
        }

        @if (userRole() === 'paciente') {
          <div class="mt-8">
            <div class="bg-white border border-gray-200 rounded-xl p-5">
              <h3 class="text-sm font-semibold text-gray-700 mb-3">Accesos rapidos</h3>
              <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <a routerLink="/turnos/solicitar" class="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors">
                  <span class="text-lg">&#x1F4CB;</span>
                  <div>
                    <p class="text-sm font-medium text-gray-900">Solicitar turno</p>
                    <p class="text-xs text-gray-500">Reservar nueva cita</p>
                  </div>
                </a>
                <a routerLink="/turnos" class="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors">
                  <span class="text-lg">&#x1F4C5;</span>
                  <div>
                    <p class="text-sm font-medium text-gray-900">Mis turnos</p>
                    <p class="text-xs text-gray-500">Ver turnos programados</p>
                  </div>
                </a>
                <a routerLink="/historial-clinico" class="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors">
                  <span class="text-lg">&#x1F4DC;</span>
                  <div>
                    <p class="text-sm font-medium text-gray-900">Mi historial clinico</p>
                    <p class="text-xs text-gray-500">Consultas anteriores</p>
                  </div>
                </a>
              </div>
            </div>
          </div>
        }
      }
    </div>
  `,
})
export class HomeComponent implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly medicalRecordsService = inject(MedicalRecordsService);
  private readonly turnosService = inject(TurnosService);
  private readonly adminUsersService = inject(AdminUsersService);

  readonly userRole = this.authService.userRole;
  readonly isLoading = signal(true);

  readonly totalUsuarios = signal(0);
  readonly especialistasPendientes = signal(0);
  readonly especialistasAprobados = signal(0);
  readonly especialidadesActivas = signal(0);
  readonly turnosDelPaciente = signal(0);
  readonly historialPaciente = signal(0);
  readonly turnosDelDia = signal(0);
  readonly turnosPendientes = signal(0);

  readonly tituloDashboard = computed(() => {
    const role = this.userRole();
    switch (role) {
      case 'administrador': return 'Panel de administracion';
      case 'especialista': return 'Mi panel de trabajo';
      case 'paciente': return 'Mi clinica';
      default: return 'Panel principal';
    }
  });

  readonly subtituloDashboard = computed(() => {
    const role = this.userRole();
    switch (role) {
      case 'administrador': return 'Vista general del sistema y metricas globales.';
      case 'especialista': return 'Resumen de tu actividad clinica del dia.';
      case 'paciente': return 'Acceso rapido a tus servicios medicos.';
      default: return 'Bienvenido al sistema.';
    }
  });

  readonly kpiCards = computed((): KpiCard[] => {
    const role = this.userRole();

    if (role === 'administrador') {
      return [
        { label: 'Usuarios totales', value: this.totalUsuarios(), icon: '\uD83D\uDC65', color: 'text-blue-600', bgColor: 'bg-blue-50', link: '/administracion/usuarios' },
        { label: 'Pendientes aprobacion', value: this.especialistasPendientes(), icon: '\u23F3', color: 'text-amber-600', bgColor: 'bg-amber-50', link: '/especialistas' },
        { label: 'Especialidades activas', value: this.especialidadesActivas(), icon: '\uD83E\uDE7A', color: 'text-emerald-600', bgColor: 'bg-emerald-50' },
        { label: 'Historias clinicas', value: this.historialPaciente(), icon: '\uD83D\uDCCB', color: 'text-purple-600', bgColor: 'bg-purple-50' },
      ];
    }

    if (role === 'especialista') {
      return [
        { label: 'Turnos del dia', value: this.turnosDelDia(), icon: '\uD83D\uDCC5', color: 'text-blue-600', bgColor: 'bg-blue-50', link: '/turnos' },
        { label: 'Pendientes', value: this.turnosPendientes(), icon: '\u23F3', color: 'text-amber-600', bgColor: 'bg-amber-50', link: '/turnos' },
        { label: 'Pacientes atendidos', value: this.historialPaciente(), icon: '\uD83D\uDC64', color: 'text-emerald-600', bgColor: 'bg-emerald-50', link: '/pacientes' },
        { label: 'Disponibilidad', value: 'Config', icon: '\u23F0', color: 'text-purple-600', bgColor: 'bg-purple-50', link: '/disponibilidad' },
      ];
    }

    return [
      { label: 'Mis turnos', value: this.turnosDelPaciente(), icon: '\uD83D\uDCC5', color: 'text-blue-600', bgColor: 'bg-blue-50', link: '/turnos' },
      { label: 'Historial clinico', value: this.historialPaciente(), icon: '\uD83D\uDCCB', color: 'text-emerald-600', bgColor: 'bg-emerald-50', link: '/historial-clinico' },
      { label: 'Solicitar turno', value: '+', icon: '\uD83D\uDCCB', color: 'text-purple-600', bgColor: 'bg-purple-50', link: '/turnos/solicitar' },
      { label: 'Mi perfil', value: '\u2192', icon: '\u2699\uFE0F', color: 'text-gray-600', bgColor: 'bg-gray-50', link: '/perfil' },
    ];
  });

  async ngOnInit(): Promise<void> {
    this.isLoading.set(true);
    const perfil = this.authService.userProfile();

    if (!perfil) {
      this.isLoading.set(false);
      return;
    }

    const role = perfil.role;

    if (role === 'administrador') {
      await this.loadAdminStats();
    } else if (role === 'especialista') {
      await this.loadSpecialistStats(perfil.id);
    } else {
      await this.loadPatientStats(perfil.id);
    }

    this.isLoading.set(false);
  }

  private async loadAdminStats(): Promise<void> {
    this.adminUsersService.loadUsers();

    const [turnosResult, historiasResult, espResult] = await Promise.all([
      this.turnosService.obtenerTodosLosTurnosAdmin(),
      this.medicalRecordsService.getAllRecords().toPromise(),
      import('@core/services/supabase.service').then(m => {
        const supabase = new m.SupabaseService();
        return supabase.supabase.from('specialties').select('id', { count: 'exact', head: true }).eq('is_active', true);
      }),
    ]);

    this.totalUsuarios.set(this.adminUsersService.users().length);
    this.especialistasPendientes.set(
      this.adminUsersService.users().filter(u => u.especialistas && !u.especialistas.is_approved).length,
    );
    this.especialistasAprobados.set(
      this.adminUsersService.users().filter(u => u.especialistas && u.especialistas.is_approved).length,
    );
    this.turnosDelPaciente.set(turnosResult?.length ?? 0);
    this.historialPaciente.set(historiasResult?.length ?? 0);
    this.especialidadesActivas.set(espResult.count ?? 0);
  }

  private async loadSpecialistStats(especialistaId: string): Promise<void> {
    const [turnosAll, historial] = await Promise.all([
      this.turnosService.obtenerTurnosPorEspecialista(especialistaId),
      this.medicalRecordsService.getHistoryBySpecialistId(especialistaId).toPromise(),
    ]);

    const hoy = new Date().toISOString().split('T')[0];
    this.turnosDelDia.set(
      turnosAll.filter(t => t.fecha_hora.startsWith(hoy)).length,
    );
    this.turnosPendientes.set(
      turnosAll.filter(t => t.estado === 'pendiente').length,
    );
    this.historialPaciente.set(historial?.length ?? 0);
  }

  private async loadPatientStats(pacienteId: string): Promise<void> {
    const [turnos, historial] = await Promise.all([
      this.turnosService.obtenerTurnosPorPaciente(pacienteId),
      this.medicalRecordsService.getHistoryByPatientId(pacienteId).toPromise(),
    ]);

    this.turnosDelPaciente.set(turnos?.length ?? 0);
    this.historialPaciente.set(historial?.length ?? 0);
  }
}
