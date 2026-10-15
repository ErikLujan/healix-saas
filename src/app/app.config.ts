import { ApplicationConfig, APP_INITIALIZER, isDevMode, provideZoneChangeDetection } from '@angular/core';
import { provideRouter, withComponentInputBinding, withInMemoryScrolling } from '@angular/router';
import { provideAnimations, provideNoopAnimations } from '@angular/platform-browser/animations';
import { provideHttpClient } from '@angular/common/http';
import { provideCharts, withDefaultRegisterables } from 'ng2-charts';
import { tokensGraficosFaltantes } from '@shared/utils/chart.tokens';
import {
  provideLucideIcons,
  LucideUsers,
  LucideStethoscope,
  LucideCalendar,
  LucideCalendarPlus,
  LucideStar,
  LucideHeart,
  LucideBell,
  LucideCheck,
  LucideCheckCircle,
  LucideAlertCircle,
  LucideAlertTriangle,
  LucideXCircle,
  LucideClock,
  LucideArrowRight,
  LucideSparkles,
  LucideShield,
  LucideLock,
  LucideMail,
  LucideFileText,
  LucideActivity,
  LucideBarChart3,
  LucideLayoutDashboard,
  LucideSettings,
  LucideUser,
  LucideLogOut,
  LucideX,
  LucideMenu,
  LucideChevronRight,
  LucideBarChart2,
  LucideShieldCheck,
  LucideFileSpreadsheet,
  LucideImage,
  LucideDownload,
  LucideCheckCheck,
  LucideSearch,
  LucidePlus,
  LucideFolderOpen,
  LucideChevronDown,
  LucideCalendarDays,
  LucideBone,
  LucideBaby,
  LucideSmile,
  LucideScanFace,
  LucideHeartPulse,
  LucideBan,
  LucideEye,
  LucideClipboardCheck,
  LucideClipboardList,
} from '@lucide/angular';

import { routes } from './app.routes';

/**
 * Movimiento reducido: cuando el sistema operativo lo solicita, se
 * provee el motor de animaciones inerte en lugar del real, de modo
 * que `fadeIn`, `slideUp`, `routeAnimations` y los stagger nunca se
 * reproducen. La consulta se resuelve una única vez durante el
 * bootstrap; los cambios de preferencia a mitad de sesión aplican
 * tras la próxima recarga.
 */
const PREFIERE_MOVIMIENTO_REDUCIDO =
  typeof matchMedia !== 'undefined' &&
  matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * Aserción de tokens de gráficos: en desarrollo, falla el arranque si
 * algún token de `@theme` no se resolvió, evitando depender en
 * silencio de los respaldos documentados. En producción no opera.
 */
function verificarTokensGraficos(): () => void {
  return () => {
    if (!isDevMode()) return;
    const faltantes = tokensGraficosFaltantes();
    if (faltantes.length > 0) {
      throw new Error(`Tokens de gráficos sin resolver: ${faltantes.join(', ')}`);
    }
  };
}

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes, withComponentInputBinding(), withInMemoryScrolling({ scrollPositionRestoration: 'top' })),
    provideHttpClient(),
    ...(PREFIERE_MOVIMIENTO_REDUCIDO ? [provideNoopAnimations()] : [provideAnimations()]),
    { provide: APP_INITIALIZER, useFactory: verificarTokensGraficos, multi: true },
    provideCharts(withDefaultRegisterables()),
    provideLucideIcons(
      LucideUsers,
      LucideStethoscope,
      LucideCalendar,
      LucideCalendarPlus,
      LucideStar,
      LucideHeart,
      LucideBell,
      LucideCheck,
      LucideCheckCircle,
      LucideAlertCircle,
      LucideAlertTriangle,
      LucideXCircle,
      LucideClock,
      LucideArrowRight,
      LucideSparkles,
      LucideShield,
      LucideLock,
      LucideMail,
      LucideFileText,
      LucideActivity,
      LucideBarChart2,
      LucideBarChart3,
      LucideLayoutDashboard,
      LucideSettings,
      LucideUser,
      LucideLogOut,
      LucideX,
      LucideMenu,
      LucideChevronRight,
      LucideShieldCheck,
      LucideFileSpreadsheet,
      LucideImage,
      LucideDownload,
      LucideCheckCheck,
      LucideSearch,
      LucidePlus,
      LucideFolderOpen,
      LucideChevronDown,
      LucideCalendarDays,
      LucideBone,
      LucideBaby,
      LucideSmile,
      LucideScanFace,
      LucideHeartPulse,
      LucideBan,
      LucideEye,
      LucideClipboardCheck,
      LucideClipboardList,
    ),
  ],
};
