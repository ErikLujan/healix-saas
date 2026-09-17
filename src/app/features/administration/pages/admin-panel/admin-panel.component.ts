import { Component, inject, computed } from '@angular/core';
import { AuthService } from '@core/services/auth.service';
import { CaptchaConfigService } from '@shared/services/captcha-config.service';

/**
 * Panel de administración principal.
 *
 * Centraliza la configuración global del sistema, incluyendo
 * el control de habilitación/deshabilitación del captcha.
 * Restringido exclusivamente al rol de administrador.
 */
@Component({
  selector: 'app-admin-panel',
  standalone: true,
  template: `
    <div class="space-y-8">
      <div>
        <h1 class="text-2xl font-bold text-text-primary">Administración</h1>
        <p class="mt-1 text-sm text-text-secondary">Gestioná la configuración general de la plataforma.</p>
      </div>

      @if (esAdmin()) {
        <section class="rounded-2xl border border-border bg-surface p-6">
          <div class="flex items-center gap-3 mb-6">
            <div class="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
              </svg>
            </div>
            <div>
              <h2 class="text-lg font-semibold text-text-primary">Seguridad y Protección Anti-Bot</h2>
              <p class="text-sm text-text-secondary">Controlá la validación captcha en toda la plataforma.</p>
            </div>
          </div>

          <div class="flex items-center justify-between p-4 rounded-xl bg-background border border-border">
            <div class="flex items-center gap-3">
              @if (captchaEnabled()) {
                <span class="flex h-3 w-3 relative">
                  <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span class="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                </span>
              } @else {
                <span class="flex h-3 w-3 relative">
                  <span class="relative inline-flex rounded-full h-3 w-3 bg-gray-400"></span>
                </span>
              }
              <div>
                <p class="text-sm font-medium text-text-primary">
                  {{ captchaEnabled() ? 'Protección de Captcha Activa' : 'Bypass de Seguridad Activado' }}
                </p>
                <p class="text-xs text-text-secondary mt-0.5">
                  @if (captchaEnabled()) {
                    Los formularios de alta requieren verificación anti-bot.
                  } @else {
                    Los formularios de alta omiten la verificación anti-bot.
                  }
                </p>
              </div>
            </div>

            <button
              type="button"
              (click)="toggleCaptcha()"
              [attr.aria-label]="captchaEnabled() ? 'Deshabilitar captcha' : 'Habilitar captcha'"
              class="relative inline-flex h-7 w-12 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
              [class]="captchaEnabled() ? 'bg-primary' : 'bg-gray-200'">
              <span
                class="pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-lg ring-0 transition-transform duration-200 ease-in-out"
                [class.translate-x-5]="captchaEnabled()"
                [class.translate-x-0]="!captchaEnabled()">
              </span>
            </button>
          </div>
        </section>
      }
    </div>
  `,
})
export class AdminPanelComponent {
  private readonly authService = inject(AuthService);
  private readonly captchaConfig = inject(CaptchaConfigService);

  /** Indica si el usuario actual es administrador. */
  readonly esAdmin = computed(() => this.authService.userRole() === 'administrador');

  /** Estado actual del captcha (reactivo). */
  readonly captchaEnabled = this.captchaConfig.isCaptchaEnabled;

  /** Alterna el estado global del captcha. */
  toggleCaptcha(): void {
    this.captchaConfig.toggleCaptcha();
  }
}
