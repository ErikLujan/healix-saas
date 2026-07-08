import { Routes } from '@angular/router';

const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/patient-list/patient-list.component').then(
        (m) => m.PatientListComponent,
      ),
  },
];

export default routes;
