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
    title: 'Healix | Administración de Usuarios',
  },
  {
    path: 'especialidades',
    loadComponent: () =>
      import('./pages/admin-specialties/admin-specialties.component').then(
        (m) => m.AdminSpecialtiesComponent,
      ),
    title: 'Healix | Especialidades',
  },
];

export default routes;
