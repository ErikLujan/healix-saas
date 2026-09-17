import { Component, inject, computed, signal } from '@angular/core';
import { AuthService } from '@core/services/auth.service';

@Component({
  selector: 'app-approval-pending',
  standalone: true,
  templateUrl: './approval-pending.component.html',
  styleUrl: './approval-pending.component.scss',
})
export class ApprovalPendingComponent {
  private readonly authService = inject(AuthService);

  readonly userRole = this.authService.userRole;

  readonly isSpecialist = computed(() => this.userRole() === 'especialista');
  readonly isPatient = computed(() => this.userRole() === 'paciente');

  readonly isResending = signal(false);

  async resendEmail(): Promise<void> {
    this.isResending.set(true);
    await this.authService.resendVerificationEmail();
    this.isResending.set(false);
  }

  async signOutAndReturn(): Promise<void> {
    await this.authService.signOut();
  }
}
