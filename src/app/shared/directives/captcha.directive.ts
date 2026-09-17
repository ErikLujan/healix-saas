import {
  Directive,
  inject,
  output,
  effect,
  OnInit,
  OnDestroy,
  ViewContainerRef,
  ComponentRef,
} from '@angular/core';
import { CaptchaComponent } from '@shared/components/captcha/captcha.component';
import { CaptchaConfigService } from '@shared/services/captcha-config.service';

/**
 * Directiva reutilizable de validación anti-bot (captcha).
 *
 * Encapsula la creación dinámica, el ciclo de vida y la validación
 * del desafío captcha. Cualquier formulario de la plataforma puede
 * incorporarla declarando el atributo `appCaptcha` en un contenedor,
 * sin conocer cómo se genera ni se renderiza el desafío.
 *
 * @example
 * <div appCaptcha (captchaResolved)="onCaptchaResolved($event)"></div>
 *
 * Reacciona reactivamente a los cambios del CaptchaConfigService:
 * - Si el captcha se deshabilita estando activo, destruye la UI y emite `true`.
 * - Si el captcha se habilita estando inactivo, instancia el desafío.
 *
 * @selector [appCaptcha]
 */
@Directive({
  selector: '[appCaptcha]',
  standalone: true,
})
export class CaptchaDirective implements OnInit, OnDestroy {
  private readonly viewContainerRef = inject(ViewContainerRef);
  private readonly configService = inject(CaptchaConfigService);

  /** Evento emitido con el estado de validación del captcha. */
  readonly captchaResolved = output<boolean>();

  /** Referencia al componente hijo dinámico instanciado. */
  private captchaRef: ComponentRef<CaptchaComponent> | null = null;

  /** Efecto reactivo que sincroniza el estado del captcha con la configuración global. */
  private readonly syncEffect = effect(() => {
    const enabled = this.configService.isCaptchaEnabled();

    if (!enabled && this.captchaRef) {
      this.destruirCaptcha();
      this.captchaResolved.emit(true);
    } else if (enabled && !this.captchaRef) {
      this.instanciarCaptcha();
    }
  });

  ngOnInit(): void {
    if (!this.configService.isCaptchaEnabled()) {
      this.captchaResolved.emit(true);
      return;
    }

    this.instanciarCaptcha();
  }

  ngOnDestroy(): void {
    this.syncEffect.destroy();
    this.destruirCaptcha();
  }

  /** Crea dinámicamente el componente CaptchaComponent dentro del contenedor. */
  private instanciarCaptcha(): void {
    this.viewContainerRef.clear();
    this.captchaRef = this.viewContainerRef.createComponent(CaptchaComponent);

    this.captchaRef.instance.resolved.subscribe((resuelto: boolean) => {
      this.captchaResolved.emit(resuelto);
    });
  }

  /** Destruye explícitamente el componente generado para evitar fugas de memoria. */
  private destruirCaptcha(): void {
    if (this.captchaRef) {
      this.captchaRef.destroy();
      this.captchaRef = null;
    }
  }
}
