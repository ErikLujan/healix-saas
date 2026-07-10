import { Routes } from '@angular/router';
import { authGuard } from '@core/guards/auth.guard';
import { roleGuard, specialistApprovalGuard } from '@core/guards/role.guard';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('@features/landing/landing.component').then(
        (m) => m.LandingComponent,
      ),
    title: 'Clínica Online | Inicio',
    data: { animation: 'landing' },
  },
  {
    path: 'autenticacion',
    loadComponent: () =>
      import('@layouts/auth-layout/auth-layout.component').then(
        (m) => m.AuthLayoutComponent,
      ),
    title: 'Clínica Online | Iniciar sesión',
    data: { animation: 'auth' },
    children: [
      {
        path: '',
        loadChildren: () => import('@features/authentication/authentication.routes'),
      },
    ],
  },
  {
    path: 'aprobacion-pendiente',
    loadComponent: () =>
      import('@features/approval-pending/approval-pending.component').then(
        (m) => m.ApprovalPendingComponent,
      ),
    title: 'Clínica Online | Pendiente de aprobación',
    data: { animation: 'approval' },
  },
  {
    path: 'terminos',
    loadComponent: () =>
      import('@features/legal/terms-and-conditions/terms-and-conditions.component').then(
        (m) => m.TermsComponent,
      ),
    title: 'Clínica Online | Términos y condiciones',
    data: { animation: 'legal' },
  },
  {
    path: 'privacidad',
    loadComponent: () =>
      import('@features/legal/privacy-policy/privacy-policy.component').then(
        (m) => m.PrivacyComponent,
      ),
    title: 'Clínica Online | Política de privacidad',
    data: { animation: 'legal' },
  },
  {
    path: '',
    loadComponent: () =>
      import('@layouts/dashboard-layout/dashboard-layout.component').then(
        (m) => m.DashboardLayoutComponent,
      ),
    canActivate: [authGuard, specialistApprovalGuard],
    data: { animation: 'dashboard' },
    children: [
      {
        path: 'panel-principal',
        loadChildren: () => import('@features/dashboard/dashboard.routes'),
        title: 'Clínica Online | Panel principal',
      },
      {
        path: 'pacientes',
        loadChildren: () => import('@features/patients/patients.routes'),
        canActivate: [roleGuard],
        data: { roles: ['administrador', 'especialista'], animation: 'dashboard' },
        title: 'Clínica Online | Pacientes',
      },
      {
        path: 'especialistas',
        loadChildren: () => import('@features/specialists/specialists.routes'),
        canActivate: [roleGuard],
        data: { roles: ['administrador'], animation: 'dashboard' },
        title: 'Clínica Online | Especialistas',
      },
      {
        path: 'disponibilidad',
        loadChildren: () =>
          import('@features/specialist/availability/availability.routes'),
        canActivate: [roleGuard],
        data: { roles: ['especialista'] },
      },
      {
        path: 'turnos',
        loadChildren: () =>
          import('@features/appointments/appointments.routes'),
        title: 'Clínica Online | Turnos',
      },
      {
        path: 'historial-clinico',
        loadChildren: () =>
          import('@features/medical-history/medical-history.routes'),
        title: 'Clínica Online | Historial clínico',
      },
      {
        path: 'administracion',
        loadChildren: () =>
          import('@features/administration/administration.routes'),
        canActivate: [roleGuard],
        data: { roles: ['administrador'], animation: 'dashboard' },
        title: 'Clínica Online | Administración',
      },
      {
        path: 'estadisticas',
        loadChildren: () =>
          import('@features/statistics/statistics.routes'),
        canActivate: [roleGuard],
        data: { roles: ['administrador'], animation: 'dashboard' },
        title: 'Clínica Online | Estadísticas',
      },
      {
        path: 'perfil',
        loadChildren: () =>
          import('@features/profile/profile.routes'),
      },
    ],
  },
  {
    path: '**',
    redirectTo: '',
  },
];
