import { Component, inject, signal, computed } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { TitleCasePipe } from '@angular/common';
import { fadeIn, slideInLeft, dropdownFade, overlayFade, drawerSlide } from '@core/animations/route-animations';
import { AuthService } from '@core/services/auth.service';
import { FallbackAvatarDirective } from '@shared/directives/fallback-avatar.directive';

@Component({
  selector: 'app-dashboard-layout',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, TitleCasePipe, FallbackAvatarDirective],
  templateUrl: './dashboard-layout.component.html',
  styleUrl: './dashboard-layout.component.scss',
  animations: [fadeIn, slideInLeft, dropdownFade, overlayFade, drawerSlide],
})
export class DashboardLayoutComponent {
  private readonly authService = inject(AuthService);

  readonly userProfile = this.authService.userProfile;
  readonly userRole = this.authService.userRole;
  readonly showDropdown = signal(false);
  readonly isMobileMenuOpen = signal(false);

  readonly isAdmin = computed(() => this.userRole() === 'administrador');

  readonly navLinks = computed(() => {
    const links: { path: string; label: string; icon: string }[] = [
      { path: '/panel-principal', label: 'Panel principal', icon: 'grid' },
      { path: '/turnos', label: 'Turnos', icon: 'calendar' },
    ];

    const role = this.userRole();

    if (role === 'paciente') {
      links.push({ path: '/turnos/solicitar', label: 'Solicitar turno', icon: 'calendar-plus' });
    }

    if (role === 'administrador' || role === 'especialista') {
      links.push({ path: '/pacientes', label: 'Pacientes', icon: 'users' });
    }

    if (role === 'especialista') {
      links.push({ path: '/disponibilidad', label: 'Disponibilidad', icon: 'clock' });
    }

    if (role === 'administrador') {
      links.push(
        { path: '/administracion/especialidades', label: 'Especialidades', icon: 'heart' },
        { path: '/administracion/usuarios', label: 'Usuarios', icon: 'user-cog' },
        { path: '/estadisticas', label: 'Estadísticas', icon: 'bar-chart' },
      );
    }

    return links;
  });

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
  }

  closeDropdown(): void {
    this.showDropdown.set(false);
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
    }
  }

  async signOut(): Promise<void> {
    this.closeDropdown();
    await this.authService.signOut();
  }
}
