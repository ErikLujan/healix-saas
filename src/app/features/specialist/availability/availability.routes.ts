import { Routes } from '@angular/router';

const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/availability-page/availability-page.component').then(
        (m) => m.AvailabilityPageComponent,
      ),
    title: 'Clínica Online | Disponibilidad',
    data: { animation: 'dashboard' },
  },
];

export default routes;
