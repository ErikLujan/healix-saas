import { Component, inject, signal, computed, OnInit, OnDestroy } from '@angular/core';
import { Router, RouterOutlet, RouterLink, RouterLinkActive, ActivatedRoute, NavigationEnd } from '@angular/router';
import { TitleCasePipe } from '@angular/common';
import { filter, Subscription } from 'rxjs';
import { LucideDynamicIcon } from '@lucide/angular';
import { fadeIn, slideInLeft, dropdownFade, overlayFade, drawerSlide, routeAnimations } from '@core/animations/route-animations';
import { AuthService } from '@core/services/auth.service';
import { AdminUsersService } from '@features/administration/services/admin-users.service';
import { CaptchaConfigService } from '@shared/services/captcha-config.service';
import { FallbackAvatarDirective } from '@shared/directives/fallback-avatar.directive';
import { toast } from 'ngx-sonner';

export interface NavItem {
  readonly path: string;
  readonly label: string;
  readonly icon: string;
}

export interface NavGroup {
  readonly title: string;
  readonly items: NavItem[];
}

@Component({
  selector: 'app-dashboard-layout',
  standalone: true,
  imports: [
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    TitleCasePipe,
    FallbackAvatarDirective,
    LucideDynamicIcon,
  ],
  templateUrl: './dashboard-layout.component.html',
  styleUrl: './dashboard-layout.component.scss',
  animations: [fadeIn, slideInLeft, dropdownFade, overlayFade, drawerSlide, routeAnimations],
})
export class DashboardLayoutComponent implements OnInit, OnDestroy {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly adminUsersService = inject(AdminUsersService);
  private readonly captchaConfig = inject(CaptchaConfigService);

  private _animationState = signal<string>('dashboard');
  private navSub?: Subscription;

  readonly animationState = this._animationState.asReadonly();
  readonly userProfile = this.authService.userProfile;
  readonly userRole = this.authService.userRole;
  readonly showDropdown = signal(false);
  readonly isMobileMenuOpen = signal(false);
  readonly showNotifications = signal(false);

  readonly isCaptchaEnabled = this.captchaConfig.isCaptchaEnabled;

  readonly isAdmin = computed(() => this.userRole() === 'administrador');
  readonly isSpecialist = computed(() => this.userRole() === 'especialista');
  readonly isPatient = computed(() => this.userRole() === 'paciente');

  readonly pendingCount = computed(() => {
    if (this.userRole() !== 'administrador') return 0;
    return this.adminUsersService.users().filter(
      u => u.role === 'especialista' && u.especialistas && !u.especialistas.is_approved,
    ).length;
  });

  readonly notifications = computed(() => {
    const items: { label: string; path: string; icon: string }[] = [];
    const role = this.userRole();

    if (role === 'administrador') {
      const pending = this.adminUsersService.users().filter(
        u => u.role === 'especialista' && u.especialistas && !u.especialistas.is_approved,
      );
      if (pending.length > 0) {
        items.push({
          label: `${pending.length} especialista(s) pendiente(s) de aprobación`,
          path: '/especialistas',
          icon: 'clock',
        });
      }
    }

    return items;
  });

  readonly currentBreadcrumb = computed(() => {
    const url = this.router.url;
    const segments = url.split('/').filter(Boolean);
    const last = segments[segments.length - 1] ?? 'panel-principal';
    const labelMap: Record<string, string> = {
      'panel-principal': 'Panel Principal',
      'turnos': 'Turnos',
      'solicitar': 'Solicitar Turno',
      'pacientes': 'Pacientes',
      'especialistas': 'Especialistas',
      'disponibilidad': 'Disponibilidad',
      'historial-clinico': 'Historial Clínico',
      'administracion': 'Administración',
      'usuarios': 'Usuarios',
      'especialidades': 'Especialidades',
      'estadisticas': 'Estadísticas',
      'perfil': 'Mi Perfil',
    };
    return labelMap[last] ?? 'Panel Principal';
  });

  readonly navGroups = computed((): NavGroup[] => {
    const role = this.userRole();

    if (role === 'administrador') {
      return [
        {
          title: 'General',
          items: [
            { path: '/panel-principal', label: 'Panel Principal', icon: 'layout-dashboard' },
            { path: '/estadisticas', label: 'Estadísticas', icon: 'bar-chart-2' },
          ],
        },
        {
          title: 'Gestión Clínica',
          items: [
            { path: '/turnos', label: 'Turnos', icon: 'calendar' },
            { path: '/turnos/solicitar', label: 'Solicitar Turno', icon: 'calendar-plus' },
            { path: '/pacientes', label: 'Pacientes', icon: 'users' },
            { path: '/especialistas', label: 'Especialistas', icon: 'stethoscope' },
          ],
        },
        {
          title: 'Sistema',
          items: [
            { path: '/administracion', label: 'Administración', icon: 'settings' },
            { path: '/perfil', label: 'Mi Perfil', icon: 'user' },
          ],
        },
      ];
    }

    if (role === 'especialista') {
      return [
        {
          title: 'General',
          items: [
            { path: '/panel-principal', label: 'Panel Principal', icon: 'layout-dashboard' },
          ],
        },
        {
          title: 'Mi Agenda',
          items: [
            { path: '/turnos', label: 'Turnos', icon: 'calendar' },
            { path: '/disponibilidad', label: 'Disponibilidad', icon: 'clock' },
          ],
        },
        {
          title: 'Pacientes & Clínica',
          items: [
            { path: '/pacientes', label: 'Pacientes', icon: 'users' },
            { path: '/historial-clinico', label: 'Historial Clínico', icon: 'file-text' },
          ],
        },
        {
          title: 'Cuenta',
          items: [
            { path: '/perfil', label: 'Mi Perfil', icon: 'user' },
          ],
        },
      ];
    }

    return [
      {
        title: 'General',
        items: [
          { path: '/panel-principal', label: 'Panel Principal', icon: 'layout-dashboard' },
        ],
      },
      {
        title: 'Mis Servicios',
        items: [
          { path: '/turnos', label: 'Turnos', icon: 'calendar' },
          { path: '/turnos/solicitar', label: 'Solicitar Turno', icon: 'calendar-plus' },
          { path: '/historial-clinico', label: 'Historial Clínico', icon: 'file-text' },
        ],
      },
      {
        title: 'Cuenta',
        items: [
          { path: '/perfil', label: 'Mi Perfil', icon: 'user' },
        ],
      },
    ];
  });

  readonly flatNavLinks = computed(() => {
    return this.navGroups().flatMap(g => g.items);
  });

  readonly roleLabel = computed(() => {
    const role = this.userRole();
    if (role === 'administrador') return 'Administrador';
    if (role === 'especialista') return 'Especialista';
    return 'Paciente';
  });

  readonly roleBadgeClass = computed(() => {
    const role = this.userRole();
    if (role === 'administrador') return 'bg-purple-100 text-purple-700';
    if (role === 'especialista') return 'bg-teal-100 text-teal-700';
    return 'bg-emerald-100 text-emerald-700';
  });

  readonly roleIcon = computed(() => {
    const role = this.userRole();
    if (role === 'administrador') return 'shield';
    if (role === 'especialista') return 'stethoscope';
    return 'heart';
  });

  ngOnInit(): void {
    this.navSub = this.router.events
      .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
      .subscribe(() => this.resolveAnimationState());

    if (this.userRole() === 'administrador') {
      this.adminUsersService.loadUsers();
    }
  }

  ngOnDestroy(): void {
    this.navSub?.unsubscribe();
  }

  getInitials(name: string): string {
    return name
      .split(' ')
      .map(part => part.charAt(0))
      .slice(0, 2)
      .join('')
      .toUpperCase();
  }

  getAvatarUrl(): string | null {
    const profile = this.userProfile();
    if (!profile) return null;

    if (profile.role === 'paciente') {
      const extended = profile as unknown as Record<string, unknown>;
      const frontalUrl = extended['avatar_url_frontal'] as string | null | undefined;
      if (frontalUrl) return frontalUrl;
    }

    return profile.avatar_url;
  }

  toggleDropdown(): void {
    this.showDropdown.update(v => !v);
    this.showNotifications.set(false);
  }

  closeDropdown(): void {
    this.showDropdown.set(false);
  }

  toggleNotifications(): void {
    this.showNotifications.update(v => !v);
    this.showDropdown.set(false);
  }

  closeNotifications(): void {
    this.showNotifications.set(false);
  }

  toggleMobileMenu(): void {
    this.isMobileMenuOpen.update(v => !v);
  }

  closeMobileMenu(): void {
    this.isMobileMenuOpen.set(false);
  }

  onDropdownBackdrop(event: MouseEvent): void {
    if (event.target === event.currentTarget) {
      this.closeDropdown();
      this.closeNotifications();
    }
  }

  onCaptchaWidgetClick(): void {
    const enabled = this.isCaptchaEnabled();
    toast.info(
      enabled
        ? 'Seguridad Anti-Bot: Verificación dinámica mediante directiva Captcha activa.'
        : 'Anti-Bot en modo bypass. La verificación está deshabilitada.',
    );
  }

  async signOut(): Promise<void> {
    this.closeDropdown();
    await this.authService.signOut();
  }

  /**
   * Resuelve la clave de animación desde la ruta hija más profunda.
   * Solo afecta a la transición del outlet interno; no dispara
   * ningún loader porque `LoadingService` ignora `NavigationEnd`.
   */
  private resolveAnimationState(): void {
    let current = this.route;
    while (current.firstChild) {
      current = current.firstChild;
    }
    this._animationState.set(current.snapshot.data['animation'] ?? 'dashboard');
  }
}
