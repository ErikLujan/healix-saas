import { Component, OnInit, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Meta, Title } from '@angular/platform-browser';
import { fadeIn } from '@core/animations/route-animations';

@Component({
  selector: 'app-privacy',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './privacy-policy.component.html',
  styleUrl: './privacy-policy.component.scss',
  animations: [fadeIn],
})
export class PrivacyComponent implements OnInit {
  private readonly title = inject(Title);
  private readonly meta = inject(Meta);

  /**
   * Fija el título y la descripción indexable de la página legal.
   */
  ngOnInit(): void {
    this.title.setTitle('Healix | Política de privacidad');
    this.meta.updateTag({ name: 'description', content: 'Política de privacidad de Healix. Tratamiento de datos de cuenta y datos clínicos con Supabase Auth y Row Level Security.' });
    this.meta.updateTag({ name: 'robots', content: 'index, follow' });
  }
}
