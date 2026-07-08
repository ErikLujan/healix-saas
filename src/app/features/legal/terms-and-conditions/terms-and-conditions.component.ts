import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { fadeIn } from '@core/animations/route-animations';

@Component({
  selector: 'app-terms',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './terms-and-conditions.component.html',
  styleUrl: './terms-and-conditions.component.scss',
  animations: [fadeIn],
})
export class TermsComponent {}
