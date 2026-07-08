import { Routes } from '@angular/router';

const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/specialist-list/specialist-list.component').then(
        (m) => m.SpecialistListComponent,
      ),
  },
];

export default routes;
