import { Component, inject, signal, OnInit, OnDestroy } from '@angular/core';
import { Router, RouterOutlet, ActivatedRoute, NavigationEnd } from '@angular/router';
import { filter, Subscription } from 'rxjs';
import { routeAnimations } from '@core/animations/route-animations';

@Component({
  selector: 'app-auth-layout',
  standalone: true,
  imports: [RouterOutlet],
  templateUrl: './auth-layout.component.html',
  styleUrl: './auth-layout.component.scss',
  animations: [routeAnimations],
})
export class AuthLayoutComponent implements OnInit, OnDestroy {
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  private _animationState = signal<string>('login');
  private navSub?: Subscription;

  readonly animationState = this._animationState.asReadonly();

  ngOnInit(): void {
    this.navSub = this.router.events
      .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
      .subscribe(() => this.resolveAnimationState());
  }

  ngOnDestroy(): void {
    this.navSub?.unsubscribe();
  }

  private resolveAnimationState(): void {
    let current = this.route;
    while (current.firstChild) {
      current = current.firstChild;
    }
    this._animationState.set(current.snapshot.data['animation'] ?? 'login');
  }
}
