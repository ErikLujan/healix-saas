import { Component, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { fadeIn, slideUp, overlayFade, drawerSlide } from '@core/animations/route-animations';

@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './landing.component.html',
  styleUrl: './landing.component.scss',
  animations: [fadeIn, slideUp, overlayFade, drawerSlide],
})
export class LandingComponent {
  readonly isMobileMenuOpen = signal(false);

  toggleMobileMenu(): void {
    this.isMobileMenuOpen.update(v => !v);
  }

  closeMobileMenu(): void {
    this.isMobileMenuOpen.set(false);
  }
}
