import { Injectable, signal } from '@angular/core';

/**
 * Clave de almacenamiento local para la configuración del captcha.
 */
const STORAGE_KEY = 'clinica_captcha_enabled';

/**
 * Servicio de configuración global del captcha.
 *
 * Controla si el mecanismo anti-bot se encuentra habilitado
 * en toda la aplicación. Utiliza localStorage para persistir
 * el estado entre reinicios de sesión y recargas de página.
 *
 * Expone un signal de solo lectura que toda la aplicación
 * consume reactivamente. Los componentes que utilicen la
 * directiva [appCaptcha] reaccionarán automáticamente
 * a cualquier modificación de este estado.
 */
@Injectable({ providedIn: 'root' })
export class CaptchaConfigService {
  /**
   * Signal privado que representa el estado habilitado/deshabilitado
   * del captcha. Se inicializa desde localStorage manteniendo
   * el valor persistido entre sesiones.
   */
  private readonly _isCaptchaEnabled = signal<boolean>(this.loadFromStorage());

  /**
   * Signal de solo lectura expuesto a toda la aplicación.
   * Los componentes y directivas consumen este valor para
   * determinar si deben renderizar el desafío u omitir la validación.
   */
  readonly isCaptchaEnabled = this._isCaptchaEnabled.asReadonly();

  /**
   * Lee el estado persistido desde localStorage.
   * Si no existe valor previo, retorna true (captcha habilitado por defecto).
   *
   * @returns Booleano con el estado de habilitación del captcha.
   */
  private loadFromStorage(): boolean {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored === null) return true;
      return stored === 'true';
    } catch {
      return true;
    }
  }

  /**
   * Persiste el estado actual del captcha en localStorage.
   *
   * La persistencia es de mejor esfuerzo: si el almacenamiento falla,
   * el estado en memoria se conserva sin interrumpir la sesión.
   *
   * @param enabled Estado de habilitación a persistir.
   */
  private saveToStorage(enabled: boolean): void {
    try {
      localStorage.setItem(STORAGE_KEY, String(enabled));
    } catch {
      return;
    }
  }

  /**
   * Alterna el estado de habilitación del captcha.
   * Actualiza el signal y persiste el nuevo valor automáticamente.
   */
  toggleCaptcha(): void {
    this._isCaptchaEnabled.update(v => {
      const next = !v;
      this.saveToStorage(next);
      return next;
    });
  }

  /**
   * Establece un estado explícito de habilitación.
   * Actualiza el signal y persiste el nuevo valor.
   *
   * @param enabled Estado de habilitación a establecer.
   */
  setCaptchaEnabled(enabled: boolean): void {
    this._isCaptchaEnabled.set(enabled);
    this.saveToStorage(enabled);
  }
}
