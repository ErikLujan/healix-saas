import { Routes } from '@angular/router';

const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/admin-panel/admin-panel.component').then(
        (m) => m.AdminPanelComponent,
      ),
  },
  {
    path: 'usuarios',
    loadComponent: () =>
      import('./pages/admin-users/admin-users.component').then(
        (m) => m.AdminUsersComponent,
      ),
    title: 'Clínica Online | Administración de Usuarios',
  },
];

export default routes;
