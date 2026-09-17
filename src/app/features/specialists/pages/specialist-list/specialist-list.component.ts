import { Component, computed, inject, OnInit, signal } from '@angular/core';

import { LucideDynamicIcon } from '@lucide/angular';
import { SpecialistsService, SpecialistListItem } from '../../services/specialists.service';
import { EspecialidadIconPipe } from '@shared/pipes/especialidad-icon.pipe';
import { FallbackAvatarDirective } from '@shared/directives/fallback-avatar.directive';
import { fadeSlideRow, statusBadge } from '../../animations/specialists-animations';

type StatusFilter = 'todos' | 'aprobados' | 'pendientes';

@Component({
  selector: 'app-specialist-list',
  standalone: true,
  imports: [
    LucideDynamicIcon,
    EspecialidadIconPipe,
    FallbackAvatarDirective,
  ],
  templateUrl: './specialist-list.component.html',
  styleUrls: ['./specialist-list.component.scss'],
  animations: [fadeSlideRow, statusBadge],
})
export class SpecialistListComponent implements OnInit {
  private readonly specialistsService = inject(SpecialistsService);

  readonly specialists = this.specialistsService.specialists;
  readonly isLoading = this.specialistsService.isLoading;
  readonly searchQuery = signal('');
  readonly statusFilter = signal<StatusFilter>('todos');

  readonly filterOptions: { value: StatusFilter; label: string }[] = [
    { value: 'todos', label: 'Todos' },
    { value: 'aprobados', label: 'Aprobados' },
    { value: 'pendientes', label: 'Pendientes' },
  ];

  readonly filteredSpecialists = computed(() => {
    let result = this.specialists();
    const query = this.searchQuery().trim().toLowerCase();
    const status = this.statusFilter();

    if (query) {
      result = result.filter(
        (s) =>
          s.full_name.toLowerCase().includes(query) ||
          s.email.toLowerCase().includes(query) ||
          s.specialties.some((sp) => sp.name.toLowerCase().includes(query)),
      );
    }

    if (status === 'aprobados') {
      result = result.filter((s) => s.is_approved);
    } else if (status === 'pendientes') {
      result = result.filter((s) => !s.is_approved);
    }

    return result;
  });

  readonly pendingCount = computed(
    () => this.specialists().filter((s) => !s.is_approved).length,
  );

  readonly approvedCount = computed(
    () => this.specialists().filter((s) => s.is_approved).length,
  );

  async ngOnInit(): Promise<void> {
    await this.specialistsService.loadSpecialists();
  }

  onSearchInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.searchQuery.set(input.value);
  }

  clearSearch(): void {
    this.searchQuery.set('');
  }

  setStatusFilter(filter: StatusFilter): void {
    this.statusFilter.set(filter);
  }

  getInitials(name: string): string {
    return name
      .split(' ')
      .map((part) => part.charAt(0))
      .slice(0, 2)
      .join('')
      .toUpperCase();
  }

  formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString('es-AR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  }

  async onToggleApproval(specialist: SpecialistListItem): Promise<void> {
    await this.specialistsService.toggleApproval(
      specialist.id,
      specialist.is_approved,
    );
  }
}
