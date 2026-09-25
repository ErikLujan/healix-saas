import { AfterViewInit, Component, computed, ElementRef, HostListener, inject, OnDestroy, OnInit, signal } from '@angular/core';
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
  LucideShieldCheck,
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
    LucideShieldCheck,
    LucideLogOut,
    LucideChevronRight,
    LucideCheckCircle2,
  ],
  templateUrl: './landing.component.html',
  styleUrl: './landing.component.scss',
})
export class LandingComponent implements OnInit, AfterViewInit, OnDestroy {
  private readonly authService = inject(AuthService);
  private readonly landingService = inject(LandingService);
  private readonly host = inject(ElementRef);
  private revealObserver: IntersectionObserver | null = null;

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
      ? 'bg-white/90 backdrop-blur-md border-b border-slate-200/70 shadow-sm'
      : 'bg-transparent border-b border-transparent';
  });

  readonly brandTextClass = computed(() => {
    return this.isScrolled() ? 'text-slate-900' : 'text-white';
  });

  readonly navLinkClass = computed(() => {
    return this.isScrolled()
      ? 'text-slate-700 hover:text-teal-700 font-medium text-sm transition-colors duration-300'
      : 'text-slate-200 hover:text-white font-medium text-sm transition-colors duration-300';
  });

  readonly userNameClass = computed(() => {
    return this.isScrolled() ? 'text-slate-700' : 'text-slate-100';
  });

  readonly iconButtonClass = computed(() => {
    return this.isScrolled()
      ? 'text-slate-500 hover:bg-slate-100 hover:text-slate-700'
      : 'text-slate-200 hover:bg-white/10 hover:text-white';
  });

  readonly mobileToggleClass = computed(() => {
    return this.isScrolled()
      ? 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
      : 'border-white/20 bg-white/10 text-white backdrop-blur-sm hover:bg-white/20';
  });

  /**
   * Actualiza el estado de desplazamiento al mover la ventana.
   *
   * El encabezado parte transparente sobre el Hero oscuro y adopta
   * superficie clara con desenfoque al entrar en las secciones claras.
   */
  @HostListener('window:scroll')
  onWindowScroll(): void {
    if (typeof window !== 'undefined') {
      this.isScrolled.set(window.scrollY > 40);
    }
  }

  constructor() {
    this.checkScrollPosition();
  }

  /**
   * Alterna la visibilidad del menú móvil de navegación.
   */
  toggleMobileMenu(): void {
    this.isMobileMenuOpen.update(v => !v);
  }

  /**
   * Cierra el menú móvil de navegación.
   */
  closeMobileMenu(): void {
    this.isMobileMenuOpen.set(false);
  }

  /**
   * Desplaza la vista hacia una sección compensando la altura del encabezado fijo.
   *
   * Complementa el `scroll-mt-24` declarativo de cada sección con un
   * desplazamiento suave calculado en tiempo de ejecución.
   *
   * @param event Evento original del enlace para evitar la navegación nativa.
   * @param sectionId Identificador de la sección destino.
   */
  scrollToSection(event: Event, sectionId: string): void {
    event.preventDefault();
    const element = document.getElementById(sectionId);
    if (element) {
      const headerOffset = 80;
      const elementPosition = element.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset - headerOffset;
      const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

      window.scrollTo({
        top: offsetPosition,
        behavior: reduceMotion ? 'auto' : 'smooth',
      });
    }
    this.closeMobileMenu();
  }

  /**
   * Cierra la sesión del usuario autenticado.
   */
  async signOut(): Promise<void> {
    await this.authService.signOut();
  }

  private checkScrollPosition(): void {
    if (typeof window !== 'undefined') {
      this.isScrolled.set(window.scrollY > 40);
    }
  }

  /**
   * Obtiene las iniciales de un nombre completo para avatares.
   *
   * @param name Nombre completo del perfil.
   * @returns Iniciales en mayúsculas con un máximo de dos letras.
   */
  getInitials(name: string): string {
    return name
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map(part => part[0])
      .join('')
      .toUpperCase();
  }

  /**
   * Oculta la imagen del Hero si el recurso aún no existe.
   *
   * Mantiene el degradado clínico de respaldo para no romper el contraste.
   *
   * @param event Evento de error de la imagen.
   */
  onHeroImageError(event: Event): void {
    const target = event.target as HTMLImageElement | null;
    target?.classList.add('hidden');
  }

  async ngOnInit(): Promise<void> {
    await Promise.all([
      this.landingService.loadSpecialties(),
      this.landingService.loadSpecialists(),
    ]);
    this.observeReveals();
  }

  /**
   * Observa las tarjetas con clase `reveal` y las muestra una sola vez.
   *
   * Solo transforma `opacity` y `translate` durante 400 ms con curva
   * de salida enfática, sin escalados ni retardos en cascada. Se puede
   * invocar de nuevo tras la carga asíncrona para alcanzar las tarjetas
   * renderizadas después del primer pintado.
   */
  ngAfterViewInit(): void {
    this.observeReveals();
  }

  /**
   * Registra en el observador las tarjetas aún no visibles.
   */
  private observeReveals(): void {
    if (typeof window === 'undefined') return;
    const root: HTMLElement = this.host.nativeElement;
    const targets = root.querySelectorAll<HTMLElement>('.reveal:not(.is-visible)');
    if (targets.length === 0) return;
    if (typeof IntersectionObserver === 'undefined') {
      targets.forEach(target => target.classList.add('is-visible'));
      return;
    }
    if (!this.revealObserver) {
      this.revealObserver = new IntersectionObserver(
        entries => {
          for (const entry of entries) {
            if (entry.isIntersecting) {
              entry.target.classList.add('is-visible');
              this.revealObserver?.unobserve(entry.target);
            }
          }
        },
        { threshold: 0.15, rootMargin: '0px 0px -8% 0px' },
      );
    }
    targets.forEach(target => this.revealObserver?.observe(target));
  }

  /**
   * Libera el observador de revelado al destruir la página.
   */
  ngOnDestroy(): void {
    this.revealObserver?.disconnect();
    this.revealObserver = null;
  }
}
