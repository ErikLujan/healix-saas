import { Directive, ElementRef, inject, input, OnDestroy, OnInit, Renderer2 } from '@angular/core';

/**
 * Directiva de atributo que garantiza la correcta visualizacion de imagenes
 * de perfil reemplazando automaticamente recursos defectuosos por una imagen
 * de respaldo predeterminada.
 *
 * Supervisa el evento de error del elemento `<img>` huésped. Si el navegador
 * detecta un error durante la carga del recurso (URL invalida, recurso
 * inexistente en Supabase Storage, timeout de red, etc.), la directiva
 * sustituye el atributo `src` de la imagen por una representacion SVG
 * predeterminada de un usuario generico, evitando que el usuario observe
 * imagenes rotas o elementos vacios en la interfaz.
 *
 * Cuando la imagen se carga correctamente, no realiza ninguna modificacion.
 *
 * @example
 * En una plantilla Angular:
 * <img [src]="usuario.avatar_url" [alt]="usuario.nombre" fallbackAvatar />
 *
 * @example
 * Con una imagen de respaldo personalizada:
 * <img [src]="avatarUrl" fallbackAvatar="/assets/images/custom-default.png" />
 *
 * @selector [fallbackAvatar]
 */
@Directive({
  selector: 'img[fallbackAvatar]',
  standalone: true,
})
export class FallbackAvatarDirective implements OnInit, OnDestroy {
  /**
   * URL de la imagen de respaldo a utilizar cuando la carga falla.
   * Si no se proporciona, se usa un SVG inline de un avatar generico.
   */
  readonly fallbackAvatar = input<string>('');

  private readonly el = inject(ElementRef<HTMLImageElement>);
  private readonly renderer = inject(Renderer2);

  private static readonly SVG_POR_DEFECTO = 'data:image/svg+xml,' + encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128">
      <rect width="128" height="128" fill="#e2e8f0"/>
      <circle cx="64" cy="48" r="20" fill="#94a3b8"/>
      <ellipse cx="64" cy="100" rx="30" ry="22" fill="#94a3b8"/>
    </svg>
  `);

  private onErrorFn: (() => void) | null = null;

  ngOnInit(): void {
    const img = this.el.nativeElement;
    this.renderer.setAttribute(img, 'data-fallback-applied', 'false');

    this.onErrorFn = () => {
      const yaAplicado = img.getAttribute('data-fallback-applied') === 'true';
      if (yaAplicado) return;

      const fallback = this.fallbackAvatar() || FallbackAvatarDirective.SVG_POR_DEFECTO;
      this.renderer.setAttribute(img, 'src', fallback);
      this.renderer.setAttribute(img, 'data-fallback-applied', 'true');
    };

    img.addEventListener('error', this.onErrorFn);
  }

  ngOnDestroy(): void {
    if (this.onErrorFn) {
      this.el.nativeElement.removeEventListener('error', this.onErrorFn);
    }
  }
}
