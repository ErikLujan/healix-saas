import { Routes } from '@angular/router';

const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/profile-page/profile-page.component').then(
        (m) => m.ProfilePageComponent,
      ),
    title: 'Healix | Mi Perfil',
    data: { animation: 'perfil' },
  },
];

export default routes;
