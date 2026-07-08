import { Routes } from '@angular/router';

const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/appointment-list/appointment-list.component').then(
        (m) => m.AppointmentListComponent,
      ),
  },
];

export default routes;
