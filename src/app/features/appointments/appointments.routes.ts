import { Routes } from '@angular/router';

const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./dashboard/pages/dashboard-page/dashboard-page.component').then(
        (m) => m.DashboardPageComponent,
      ),
    title: 'Clínica Online | Mis turnos',
  },
  {
    path: 'request',
    loadComponent: () =>
      import('./request/pages/request-page/request-page.component').then(
        (m) => m.RequestPageComponent,
      ),
    title: 'Clínica Online | Solicitar turno',
  },
];

export default routes;
