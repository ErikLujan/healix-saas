import { Routes } from '@angular/router';
import { specialistApprovalGuard } from '@core/guards/role.guard';

const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/availability-page/availability-page.component').then(
        (m) => m.AvailabilityPageComponent,
      ),
    canActivate: [specialistApprovalGuard],
    title: 'Healix | Disponibilidad',
    data: { animation: 'dashboard' },
  },
];

export default routes;
