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
    path: 'auth',
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
    path: 'approval-pending',
    loadComponent: () =>
      import('@features/approval-pending/approval-pending.component').then(
        (m) => m.ApprovalPendingComponent,
      ),
    title: 'Clínica Online | Pendiente de aprobación',
    data: { animation: 'approval' },
  },
  {
    path: 'terms',
    loadComponent: () =>
      import('@features/legal/terms-and-conditions/terms-and-conditions.component').then(
        (m) => m.TermsComponent,
      ),
    title: 'Clínica Online | Términos y condiciones',
    data: { animation: 'legal' },
  },
  {
    path: 'privacy',
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
        path: 'dashboard',
        loadChildren: () => import('@features/dashboard/dashboard.routes'),
        title: 'Clínica Online | Panel principal',
      },
      {
        path: 'patients',
        loadChildren: () => import('@features/patients/patients.routes'),
        canActivate: [roleGuard],
        data: { roles: ['administrador', 'especialista'], animation: 'dashboard' },
        title: 'Clínica Online | Pacientes',
      },
      {
        path: 'specialists',
        loadChildren: () => import('@features/specialists/specialists.routes'),
        canActivate: [roleGuard],
        data: { roles: ['administrador'], animation: 'dashboard' },
        title: 'Clínica Online | Especialistas',
      },
      {
        path: 'availability',
        loadComponent: () =>
          import('@features/specialist/availability/pages/availability-page/availability-page.component').then(
            (m) => m.AvailabilityPageComponent,
          ),
        canActivate: [roleGuard],
        data: { roles: ['especialista'], animation: 'dashboard' },
        title: 'Clínica Online | Disponibilidad',
      },
      {
        path: 'appointments',
        loadChildren: () =>
          import('@features/appointments/appointments.routes'),
        title: 'Clínica Online | Turnos',
      },
      {
        path: 'medical-history',
        loadChildren: () =>
          import('@features/medical-history/medical-history.routes'),
        title: 'Clínica Online | Historial clínico',
      },
      {
        path: 'administration',
        loadChildren: () =>
          import('@features/administration/administration.routes'),
        canActivate: [roleGuard],
        data: { roles: ['administrador'], animation: 'dashboard' },
        title: 'Clínica Online | Administración',
      },
      {
        path: 'statistics',
        loadChildren: () =>
          import('@features/statistics/statistics.routes'),
        canActivate: [roleGuard],
        data: { roles: ['administrador'], animation: 'dashboard' },
        title: 'Clínica Online | Estadísticas',
      },
      {
        path: 'profile',
        loadComponent: () =>
          import('@features/profile/pages/profile-page/profile-page.component').then(
            (m) => m.ProfilePageComponent,
          ),
        title: 'Clínica Online | Mi Perfil',
        data: { animation: 'dashboard' },
      },
    ],
  },
  {
    path: '**',
    redirectTo: '',
  },
];
