import { Routes } from '@angular/router';

const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/statistics-dashboard/statistics-dashboard.component').then(
        (m) => m.StatisticsDashboardComponent,
      ),
    data: { animation: 'estadisticas' },
  },
];

export default routes;
