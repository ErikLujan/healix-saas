import { Component, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { fadeIn, slideUp, overlayFade, drawerSlide } from '@core/animations/route-animations';
import { SupabaseService } from '@core/services/supabase.service';
import { EspecialidadIconPipe } from '@shared/pipes/especialidad-icon.pipe';
import { FallbackAvatarDirective } from '@shared/directives/fallback-avatar.directive';
import { ResaltarCardDirective } from '@shared/directives/resaltar-card.directive';

interface LandingSpecialty {
  readonly id: string;
  readonly name: string;
  readonly description: string | null;
}

interface LandingSpecialist {
  readonly id: string;
  readonly full_name: string;
  readonly avatar_url: string | null;
  readonly specialty: string;
}

@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [RouterLink, EspecialidadIconPipe, FallbackAvatarDirective, ResaltarCardDirective],
  templateUrl: './landing.component.html',
  styleUrl: './landing.component.scss',
  animations: [fadeIn, slideUp, overlayFade, drawerSlide],
})
export class LandingComponent implements OnInit {
  private readonly supabase = inject(SupabaseService);

  readonly isMobileMenuOpen = signal(false);
  readonly isLoadingSpecialties = signal(true);
  readonly isLoadingSpecialists = signal(true);
  readonly specialties = signal<readonly LandingSpecialty[]>([]);
  readonly specialists = signal<readonly LandingSpecialist[]>([]);

  async ngOnInit(): Promise<void> {
    await Promise.all([this.loadSpecialties(), this.loadSpecialists()]);
  }

  toggleMobileMenu(): void {
    this.isMobileMenuOpen.update(v => !v);
  }

  closeMobileMenu(): void {
    this.isMobileMenuOpen.set(false);
  }

  private async loadSpecialties(): Promise<void> {
    this.isLoadingSpecialties.set(true);

    const { data, error } = await this.supabase.supabase
      .from('specialties')
      .select('id, name, description')
      .eq('is_active', true)
      .order('name', { ascending: true });

    if (error) {
      console.error('[LandingComponent] loadSpecialties error:', error.message);
      this.isLoadingSpecialties.set(false);
      return;
    }

    this.specialties.set((data ?? []) as LandingSpecialty[]);
    this.isLoadingSpecialties.set(false);
  }

  private async loadSpecialists(): Promise<void> {
    this.isLoadingSpecialists.set(true);

    const { data, error } = await this.supabase.supabase
      .from('profiles')
      .select(`
        id,
        full_name,
        avatar_url,
        especialistas!inner(
          is_approved,
          especialista_especialidad(
            specialties!especialidad_id(name)
          )
        )
      `)
      .eq('role', 'especialista')
      .eq('especialistas.is_approved', true)
      .order('full_name', { ascending: true });

    if (error) {
      console.error('[LandingComponent] loadSpecialists error:', error.message);
      this.isLoadingSpecialists.set(false);
      return;
    }

    const specialists: LandingSpecialist[] = (data ?? []).map((row: Record<string, unknown>) => {
      const esp = row['especialistas'] as Record<string, unknown>;
      const rels = (esp?.['especialista_especialidad'] ?? []) as Record<string, unknown>[];
      const firstRel = rels[0] as Record<string, unknown> | undefined;
      const spec = firstRel?.['specialties'] as Record<string, unknown> | undefined;

      return {
        id: row['id'] as string,
        full_name: row['full_name'] as string,
        avatar_url: row['avatar_url'] as string | null,
        specialty: (spec?.['name'] as string) ?? 'Especialista',
      };
    });

    this.specialists.set(specialists);
    this.isLoadingSpecialists.set(false);
  }
}
