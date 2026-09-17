import { Component, input, output, computed, HostListener } from '@angular/core';
import { UpperCasePipe } from '@angular/common';
import { LucideDynamicIcon } from '@lucide/angular';
import { FormatDniPipe } from '@shared/pipes/format-dni.pipe';
import { MedicalHistoryListComponent } from '@features/medical-history/components/medical-history-list/medical-history-list.component';
import { MedicalRecordConRelaciones } from '@features/medical-history/models/medical-record.model';
import { PacienteAtendido } from '../../models/patient-portfolio.model';

@Component({
  selector: 'app-patient-drawer',
  standalone: true,
  imports: [UpperCasePipe, LucideDynamicIcon, FormatDniPipe, MedicalHistoryListComponent],
  templateUrl: './patient-drawer.component.html',
})
export class PatientDrawerComponent {
  readonly paciente = input<PacienteAtendido | null>(null);
  readonly records = input<readonly MedicalRecordConRelaciones[]>([]);
  readonly isLoading = input(false);
  readonly isOpen = input(false);
  readonly onClose = output<void>();

  readonly ultimaAtencion = computed(() => {
    const recs = this.records();
    if (recs.length === 0) return '—';
    const d = new Date(recs[0].created_at);
    return d.toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' });
  });

  @HostListener('window:keydown.escape')
  onEscapeKey(): void {
    if (this.isOpen()) this.onClose.emit();
  }
}
