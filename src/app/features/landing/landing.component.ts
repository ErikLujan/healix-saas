import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { NgClass } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AuthService } from '@core/services/auth.service';
import { LandingService } from './landing.service';
import {
  LucideMenu,
  LucideX,
  LucideArrowRight,
  LucideCalendar,
  LucideFileText,
  LucideUsers,
  LucideBarChart3,
  LucideShield,
  LucideClock,
  LucideStethoscope,
  LucideZap,
  LucideShieldCheck,
  LucideActivity,
  LucideAward,
  LucideHeartPulse,
  LucideTrendingUp,
  LucideLogOut,
  LucideChevronRight,
  LucideCheckCircle2,
} from '@lucide/angular';

@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [
    NgClass,
    RouterLink,
    LucideMenu,
    LucideX,
    LucideArrowRight,
    LucideCalendar,
    LucideFileText,
    LucideUsers,
    LucideBarChart3,
    LucideShield,
    LucideClock,
    LucideStethoscope,
    LucideZap,
    LucideShieldCheck,
    LucideActivity,
    LucideAward,
    LucideHeartPulse,
    LucideTrendingUp,
    LucideLogOut,
    LucideChevronRight,
    LucideCheckCircle2,
  ],
  templateUrl: './landing.component.html',
  styleUrl: './landing.component.scss',
})
export class LandingComponent implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly landingService = inject(LandingService);

  readonly isMobileMenuOpen = signal(false);
  readonly isScrolled = signal(false);

  readonly specialties = this.landingService.specialties;
  readonly specialists = this.landingService.specialists;
  readonly specialistCounts = this.landingService.specialistCounts;
  readonly isLoadingSpecialties = this.landingService.isLoadingSpecialties;
  readonly isLoadingSpecialists = this.landingService.isLoadingSpecialists;

  readonly isAuthenticated = this.authService.isAuthenticated;
  readonly userProfile = this.authService.userProfile;

  readonly headerClass = computed(() => {
    return this.isScrolled()
      ? 'bg-white/85 backdrop-blur-md border-b border-slate-200/60 shadow-sm py-3'
      : 'bg-transparent border-transparent py-4';
  });

  readonly brandTextClass = computed(() => {
    return this.isScrolled() ? 'text-slate-900' : 'text-slate-900';
  });

  readonly navLinkClass = computed(() => {
    return 'text-slate-700 hover:text-teal-600 font-medium text-sm transition-colors';
  });

  readonly mobileToggleClass = computed(() => {
    return this.isScrolled()
      ? 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
      : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50 shadow-sm';
  });

  constructor() {
    this.checkScrollPosition();

    if (typeof window !== 'undefined') {
      window.addEventListener('scroll', () => {
        this.isScrolled.set(window.scrollY > 40);
      }, { passive: true });
    }
  }

  toggleMobileMenu(): void {
    this.isMobileMenuOpen.update(v => !v);
  }

  closeMobileMenu(): void {
    this.isMobileMenuOpen.set(false);
  }

  scrollToSection(event: Event, sectionId: string): void {
    event.preventDefault();
    const element = document.getElementById(sectionId);
    if (element) {
      const headerOffset = 80;
      const elementPosition = element.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset - headerOffset;

      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth',
      });
    }
    this.closeMobileMenu();
  }

  async signOut(): Promise<void> {
    await this.authService.signOut();
  }

  private checkScrollPosition(): void {
    if (typeof window !== 'undefined') {
      this.isScrolled.set(window.scrollY > 40);
    }
  }

  getInitials(name: string): string {
    return name
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map(part => part[0])
      .join('')
      .toUpperCase();
  }

  async ngOnInit(): Promise<void> {
    await Promise.all([
      this.landingService.loadSpecialties(),
      this.landingService.loadSpecialists(),
    ]);
  }
}
