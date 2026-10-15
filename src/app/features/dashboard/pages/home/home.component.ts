import { Component, inject } from '@angular/core';
import { AuthService } from '@core/services/auth.service';
import { AdminDashboardComponent } from '../../components/admin-dashboard.component';
import { SpecialistDashboardComponent } from '../../components/specialist-dashboard.component';
import { PatientDashboardComponent } from '../../components/patient-dashboard.component';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [
    AdminDashboardComponent,
    SpecialistDashboardComponent,
    PatientDashboardComponent,
  ],
  template: `
    @if (userRole() === null) {
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 animate-pulse" role="status" aria-label="Cargando panel">
        @for (i of [1,2,3,4]; track i) {
          <div class="bg-surface border border-divider rounded-xl p-5">
            <div class="h-3 w-24 bg-border rounded mb-3"></div>
            <div class="h-8 w-16 bg-border rounded"></div>
          </div>
        }
      </div>
    } @else {
      @switch (userRole()) {
        @case ('administrador') {
          <app-admin-dashboard />
        }
        @case ('especialista') {
          <app-specialist-dashboard />
        }
        @case ('paciente') {
          <app-patient-dashboard />
        }
        @default {
          <div class="bg-surface border border-divider rounded-xl p-6 text-center" role="alert">
            <p class="text-sm font-medium text-text-primary">Rol no disponible.</p>
            <p class="text-xs text-text-secondary mt-1">No pudimos determinar tu rol. Cerrá sesión e ingresá nuevamente.</p>
          </div>
        }
      }
    }
  `,
})
export class HomeComponent {
  readonly userRole = inject(AuthService).userRole;
}
