import { Routes } from '@angular/router';

const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/profile-page/profile-page.component').then(
        (m) => m.ProfilePageComponent,
      ),
    title: 'Clínica Online | Mi Perfil',
    data: { animation: 'dashboard' },
  },
];

export default routes;
