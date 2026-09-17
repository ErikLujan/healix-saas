import { Routes } from '@angular/router';
import { authGuard } from '@core/guards/auth.guard';
import { roleGuard, specialistApprovalGuard, patientVerificationGuard } from '@core/guards/role.guard';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('@features/landing/landing.component').then(
        (m) => m.LandingComponent,
      ),
    title: 'Healix | Inicio',
    data: { animation: 'landing' },
  },
  {
    path: 'autenticacion',
    loadComponent: () =>
      import('@layouts/auth-layout/auth-layout.component').then(
        (m) => m.AuthLayoutComponent,
      ),
    title: 'Healix | Iniciar sesión',
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
    title: 'Healix | Pendiente de aprobación',
    data: { animation: 'approval' },
  },
  {
    path: 'terminos',
    loadComponent: () =>
      import('@features/legal/terms-and-conditions/terms-and-conditions.component').then(
        (m) => m.TermsComponent,
      ),
    title: 'Healix | Términos y condiciones',
    data: { animation: 'legal' },
  },
  {
    path: 'privacidad',
    loadComponent: () =>
      import('@features/legal/privacy-policy/privacy-policy.component').then(
        (m) => m.PrivacyComponent,
      ),
    title: 'Healix | Política de privacidad',
    data: { animation: 'legal' },
  },
  {
    path: '',
    loadComponent: () =>
      import('@layouts/dashboard-layout/dashboard-layout.component').then(
        (m) => m.DashboardLayoutComponent,
      ),
    canActivate: [authGuard, specialistApprovalGuard, patientVerificationGuard],
    data: { animation: 'dashboard' },
    children: [
      {
        path: 'panel-principal',
        loadChildren: () => import('@features/dashboard/dashboard.routes'),
        title: 'Healix | Panel principal',
        data: { animation: 'dashboard' },
      },
      {
        path: 'pacientes',
        loadChildren: () => import('@features/patients/patients.routes'),
        canActivate: [roleGuard],
        data: { roles: ['administrador', 'especialista'], animation: 'dashboard' },
        title: 'Healix | Pacientes',
      },
      {
        path: 'especialistas',
        loadChildren: () => import('@features/specialists/specialists.routes'),
        canActivate: [roleGuard],
        data: { roles: ['administrador'], animation: 'dashboard' },
        title: 'Healix | Especialistas',
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
        title: 'Healix | Turnos',
        data: { animation: 'turnos' },
      },
      {
        path: 'historial-clinico',
        loadChildren: () =>
          import('@features/medical-history/medical-history.routes'),
        canActivate: [roleGuard],
        data: { roles: ['paciente', 'especialista'], animation: 'dashboard' },
        title: 'Healix | Historial clínico',
      },
      {
        path: 'administracion',
        loadChildren: () =>
          import('@features/administration/administration.routes'),
        canActivate: [roleGuard],
        data: { roles: ['administrador'], animation: 'dashboard' },
        title: 'Healix | Administración',
      },
      {
        path: 'estadisticas',
        loadChildren: () =>
          import('@features/statistics/statistics.routes'),
        canActivate: [roleGuard],
        data: { roles: ['administrador'], animation: 'estadisticas' },
        title: 'Healix | Estadísticas',
      },
      {
        path: 'perfil',
        loadChildren: () =>
          import('@features/profile/profile.routes'),
        data: { animation: 'perfil' },
      },
    ],
  },
  {
    path: '**',
    loadComponent: () =>
      import('@features/legal/pages/not-found/not-found.component').then(
        (m) => m.NotFoundComponent,
      ),
    title: 'Healix | Página no encontrada',
  },
];
