import { Routes } from '@angular/router';

const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/medical-record/medical-record.component').then(
        (m) => m.MedicalRecordComponent,
      ),
  },
];

export default routes;
