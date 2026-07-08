import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { fadeIn } from '@core/animations/route-animations';

@Component({
  selector: 'app-privacy',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './privacy-policy.component.html',
  styleUrl: './privacy-policy.component.scss',
  animations: [fadeIn],
})
export class PrivacyComponent {}
