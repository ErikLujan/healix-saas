import { Component, inject } from '@angular/core';
import { slideUp, fadeIn } from '@core/animations/route-animations';
import { AuthService } from '@core/services/auth.service';

@Component({
  selector: 'app-approval-pending',
  standalone: true,
  templateUrl: './approval-pending.component.html',
  styleUrl: './approval-pending.component.scss',
  animations: [slideUp, fadeIn],
})
export class ApprovalPendingComponent {
  private readonly authService = inject(AuthService);

  async signOutAndReturn(): Promise<void> {
    await this.authService.signOut();
  }
}
