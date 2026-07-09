import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { AuthService } from '@core/services/auth.service';
import { SupabaseService } from '@core/services/supabase.service';
import { DisponibilidadService } from '@core/services/disponibilidad.service';
import {
  DisponibilidadEspecialistaInsert,
  ConfiguracionDia,
  BloqueHorario,
  DiaSemana,
  NOMBRES_DIAS,
  RESTRICCIONES_HORARIAS,
} from '@core/models/disponibilidad.model';
import { AvailabilityFormComponent } from '../../components/availability-form/availability-form.component';
import { SlotsPreviewComponent } from '../../components/slots-preview/slots-preview.component';
import { toast } from 'ngx-sonner';

interface EspecialidadPerfil {
  readonly id: string;
  readonly name: string;
}

@Component({
  selector: 'app-availability-page',
  standalone: true,
  imports: [AvailabilityFormComponent, SlotsPreviewComponent],
  templateUrl: './availability-page.component.html',
})
export class AvailabilityPageComponent implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly supabase = inject(SupabaseService);
  private readonly disponibilidadService = inject(DisponibilidadService);

  readonly isLoading = this.disponibilidadService.isLoading;
  readonly especialidades = signal<EspecialidadPerfil[]>([]);
  readonly configuracion = signal<Record<number, ConfiguracionDia>>({
    1: { habilitado: false, bloques: [] },
    2: { habilitado: false, bloques: [] },
    3: { habilitado: false, bloques: [] },
    4: { habilitado: false, bloques: [] },
    5: { habilitado: false, bloques: [] },
    6: { habilitado: false, bloques: [] },
  });

  readonly diasDisponibles: ReadonlyArray<{ readonly id: DiaSemana; readonly nombre: string }> = [
    { id: 1, nombre: NOMBRES_DIAS[1] },
    { id: 2, nombre: NOMBRES_DIAS[2] },
    { id: 3, nombre: NOMBRES_DIAS[3] },
    { id: 4, nombre: NOMBRES_DIAS[4] },
    { id: 5, nombre: NOMBRES_DIAS[5] },
    { id: 6, nombre: NOMBRES_DIAS[6] },
  ];

  readonly perfil = this.authService.userProfile;

  readonly totalDiasHabilitados = computed(() =>
    Object.values(this.configuracion()).filter(d => d.habilitado).length,
  );

  readonly totalBloques = computed(() =>
    Object.values(this.configuracion())
      .filter(d => d.habilitado)
      .reduce((sum, d) => sum + d.bloques.length, 0),
  );

  readonly tieneCambiosPendientes = signal(false);

  async ngOnInit(): Promise<void> {
    await this.cargarEspecialidades();
    await this.cargarDisponibilidadExistente();
  }

  private async cargarEspecialidades(): Promise<void> {
    const userId = this.perfil()?.id;
    if (!userId) return;

    const { data: vinculos, error: vinculosError } = await this.supabase.supabase
      .from('especialista_especialidad')
      .select('especialidad_id')
      .eq('especialista_id', userId);

    if (vinculosError || !vinculos || vinculos.length === 0) {
      toast.error('Error al cargar las especialidades del médico.');
      return;
    }

    const ids = vinculos.map(v => v.especialidad_id);

    const { data: especialidades, error: espError } = await this.supabase.supabase
      .from('specialties')
      .select('id, name')
      .in('id', ids);

    if (espError || !especialidades) {
      toast.error('Error al cargar las especialidades del médico.');
      return;
    }

    this.especialidades.set(especialidades);
  }

  private async cargarDisponibilidadExistente(): Promise<void> {
    const userId = this.perfil()?.id;
    if (!userId) return;

    await this.disponibilidadService.cargarDisponibilidadPorEspecialista(userId);

    const registros = this.disponibilidadService.disponibilidades();
    const nuevaConfig: Record<number, ConfiguracionDia> = {};

    for (let dia = 1; dia <= 6; dia++) {
      const registrosDia = registros.filter(r => r.dia_semana === dia);

      if (registrosDia.length > 0) {
        const bloques: BloqueHorario[] = registrosDia.map(r => ({
          especialidad_id: r.especialidad_id,
          hora_inicio: r.hora_inicio.slice(0, 5),
          hora_fin: r.hora_fin.slice(0, 5),
        }));

        nuevaConfig[dia] = { habilitado: true, bloques };
      } else {
        nuevaConfig[dia] = { habilitado: false, bloques: [] };
      }
    }

    this.configuracion.set(nuevaConfig);
  }

  onConfiguracionChange(dia: DiaSemana, config: ConfiguracionDia): void {
    this.configuracion.update(prev => ({
      ...prev,
      [dia]: config,
    }));
    this.tieneCambiosPendientes.set(true);
  }

  async onGuardar(): Promise<void> {
    const userId = this.perfil()?.id;
    if (!userId) return;

    const registros = this.construirRegistros();

    try {
      await this.disponibilidadService.guardarDisponibilidadSemanal(userId, registros);
      this.tieneCambiosPendientes.set(false);
    } catch {
      // El servicio ya notifica el error via toast
    }
  }

  private construirRegistros(): DisponibilidadEspecialistaInsert[] {
    const config = this.configuracion();
    const registros: DisponibilidadEspecialistaInsert[] = [];

    for (const [diaStr, diaConfig] of Object.entries(config)) {
      const dia = Number(diaStr) as DiaSemana;

      if (!diaConfig.habilitado || diaConfig.bloques.length === 0) continue;

      for (const bloque of diaConfig.bloques) {
        registros.push({
          especialista_id: this.perfil()?.id ?? '',
          especialidad_id: bloque.especialidad_id,
          dia_semana: dia,
          hora_inicio: bloque.hora_inicio,
          hora_fin: bloque.hora_fin,
        });
      }
    }

    return registros;
  }
}
