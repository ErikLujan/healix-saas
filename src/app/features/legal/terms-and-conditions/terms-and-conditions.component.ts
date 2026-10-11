import { Component, OnInit, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Meta, Title } from '@angular/platform-browser';
import { fadeIn } from '@core/animations/route-animations';

@Component({
  selector: 'app-terms',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './terms-and-conditions.component.html',
  styleUrl: './terms-and-conditions.component.scss',
  animations: [fadeIn],
})
export class TermsComponent implements OnInit {
  private readonly title = inject(Title);
  private readonly meta = inject(Meta);

  /**
   * Fija el título y la descripción indexable de la página legal.
   */
  ngOnInit(): void {
    this.title.setTitle('Healix | Términos y condiciones');
    this.meta.updateTag({ name: 'description', content: 'Términos y condiciones de uso de la plataforma clínica Healix. Condiciones del servicio por roles y uso responsable.' });
    this.meta.updateTag({ name: 'robots', content: 'index, follow' });
  }
}
