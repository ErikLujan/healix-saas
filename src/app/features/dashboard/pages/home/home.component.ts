import { Component } from '@angular/core';
import { fadeIn, slideUp } from '@core/animations/route-animations';

@Component({
  selector: 'app-home',
  standalone: true,
  animations: [fadeIn, slideUp],
  template: `
    <div @fadeIn>
      <div @slideUp>
        <h1 class="text-2xl font-bold text-text-primary">Dashboard</h1>
      </div>
    </div>
  `,
})
export class HomeComponent {}
