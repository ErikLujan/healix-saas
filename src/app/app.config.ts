import { ApplicationConfig, provideZoneChangeDetection } from '@angular/core';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { provideAnimations } from '@angular/platform-browser/animations';
import { provideHttpClient } from '@angular/common/http';
import { provideCharts, withDefaultRegisterables } from 'ng2-charts';
import {
  provideLucideIcons,
  LucideUsers,
  LucideStethoscope,
  LucideCalendar,
  LucideStar,
  LucideHeart,
  LucideBell,
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
} from '@lucide/angular';

import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes, withComponentInputBinding()),
    provideHttpClient(),
    provideAnimations(),
    provideCharts(withDefaultRegisterables()),
    provideLucideIcons(
      LucideUsers,
      LucideStethoscope,
      LucideCalendar,
      LucideStar,
      LucideHeart,
      LucideBell,
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
    ),
  ],
};
