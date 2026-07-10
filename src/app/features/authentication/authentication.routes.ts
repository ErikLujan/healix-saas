import { Routes } from '@angular/router';

const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/login/login.component').then((m) => m.LoginComponent),
    title: 'Clínica Online | Iniciar sesión',
  },
  {
    path: 'registro',
    loadComponent: () =>
      import('./pages/register/register.component').then(
        (m) => m.RegisterComponent,
      ),
    title: 'Clínica Online | Registrarse',
  },
];

export default routes;
