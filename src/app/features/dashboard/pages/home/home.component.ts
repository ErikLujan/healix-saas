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
    }
  `,
})
export class HomeComponent {
  readonly userRole = inject(AuthService).userRole;
}
