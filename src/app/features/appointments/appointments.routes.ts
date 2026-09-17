import { Routes } from '@angular/router';
import { roleGuard } from '@core/guards/role.guard';

const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./dashboard/pages/dashboard-page/dashboard-page.component').then(
        (m) => m.DashboardPageComponent,
      ),
    title: 'Healix | Mis turnos',
    data: { animation: 'turnos' },
  },
  {
    path: 'solicitar',
    loadComponent: () =>
      import('./request/pages/request-page/request-page.component').then(
        (m) => m.RequestPageComponent,
      ),
    canActivate: [roleGuard],
    title: 'Healix | Solicitar turno',
    data: { roles: ['paciente', 'administrador'], animation: 'solicitar-turno' },
  },
];

export default routes;
