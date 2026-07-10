import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TitleCasePipe, NgClass } from '@angular/common';
import { SupabaseService } from '@core/services/supabase.service';
import { AuthService } from '@core/services/auth.service';
import { DisponibilidadService } from '@core/services/disponibilidad.service';
import { MedicalRecordsService } from '@features/medical-history/services/medical-records.service';
import { PdfExportService } from '@features/medical-history/services/pdf-export.service';
import { MedicalHistoryListComponent } from '@features/medical-history/components/medical-history-list/medical-history-list.component';
import { MedicalRecordConRelaciones } from '@features/medical-history/models/medical-record.model';
import { FileUploadComponent } from '@shared/components/file-upload/file-upload.component';
import { AvailabilityFormComponent } from '@features/specialist/availability/components/availability-form/availability-form.component';
import { SlotsPreviewComponent } from '@features/specialist/availability/components/slots-preview/slots-preview.component';
import { toast } from 'ngx-sonner';
import { Database } from '@core/models/database.types';
import {
  ConfiguracionDia,
  DiaSemana,
  DisponibilidadEspecialistaInsert,
  NOMBRES_DIAS,
} from '@core/models/disponibilidad.model';

type TabId = 'informacion' | 'horarios' | 'historial';

/** Datos extendidos cargados desde la tabla hija segun el rol del usuario. */
interface DatosRol {
  readonly dni: string;
  readonly edad: number;
  readonly obra_social?: string;
}

interface EspecialidadPerfil {
  readonly id: string;
  readonly name: string;
}

/** Configuracion extendida que incluye el ID de registro para edicion. */
interface ConfiguracionDiaExtendida extends ConfiguracionDia {
  readonly registrosIds?: readonly string[];
}

@Component({
  selector: 'app-profile-page',
  standalone: true,
  imports: [
    FormsModule,
    TitleCasePipe,
    NgClass,
    FileUploadComponent,
    AvailabilityFormComponent,
    SlotsPreviewComponent,
    MedicalHistoryListComponent,
  ],
  templateUrl: './profile-page.component.html',
})
export class ProfilePageComponent implements OnInit {
  private readonly supabase = inject(SupabaseService);
  private readonly authService = inject(AuthService);
  readonly disponibilidadService = inject(DisponibilidadService);
  private readonly medicalRecordsService = inject(MedicalRecordsService);
  private readonly pdfExportService = inject(PdfExportService);

  /** Tab activa actualmente. */
  readonly tabActiva = signal<TabId>('informacion');

  /** Datos del perfil del usuario. */
  readonly perfil = this.authService.userProfile;

  /** Rol del usuario. */
  readonly rol = this.authService.userRole;

  /** Dias de la semana disponibles para el formulario. */
  readonly diasDisponibles: ReadonlyArray<{ readonly id: DiaSemana; readonly nombre: string }> = [
    { id: 1, nombre: NOMBRES_DIAS[1] },
    { id: 2, nombre: NOMBRES_DIAS[2] },
    { id: 3, nombre: NOMBRES_DIAS[3] },
    { id: 4, nombre: NOMBRES_DIAS[4] },
    { id: 5, nombre: NOMBRES_DIAS[5] },
    { id: 6, nombre: NOMBRES_DIAS[6] },
  ];

  /** Datos extendidos del rol (DNI, edad, obra social). */
  readonly datosRol = signal<DatosRol | null>(null);

  /** Indica si se esta cargando la informacion del perfil. */
  readonly isLoading = signal(true);

  /** Indica si se esta subiendo el avatar. */
  readonly isUploadingAvatar = signal(false);

  /** Preview local de la imagen seleccionada antes de subir. */
  readonly avatarPreview = signal<string | null>(null);

  /** Archivo de avatar pendiente de subir. */
  private archivoAvatar: File | null = null;

  /** Especialidades del especialista (para el formulario de disponibilidad). */
  readonly especialidades = signal<readonly EspecialidadPerfil[]>([]);

  /** Configuración semanal de disponibilidad. */
  readonly configuracion = signal<Record<number, ConfiguracionDiaExtendida>>({});

  /** Indica si la configuración está siendo guardada. */
  readonly isGuardando = signal(false);

  /** Historial clínico del paciente (solo para rol paciente). */
  readonly historialClinico = signal<readonly MedicalRecordConRelaciones[]>([]);

  /** Indica si se está cargando el historial clínico. */
  readonly isLoadingHistorial = signal(false);

  /** Indica si se está exportando el PDF del historial. */
  readonly isExportingPDF = signal(false);

  /** Título de la pestaña actual. */
  readonly tituloTab = computed(() => {
    switch (this.tabActiva()) {
      case 'informacion':
        return 'Información Personal';
      case 'horarios':
        return 'Mis Horarios';
      case 'historial':
        return 'Mi Historial Clínico';
    }
  });

  /** Nombre de la tabla hija según el rol. */
  private get tablaRol(): string {
    const rol = this.rol();
    if (rol === 'paciente') return 'pacientes';
    if (rol === 'especialista') return 'especialistas';
    return 'administradores';
  }

  async ngOnInit(): Promise<void> {
    await this.cargarDatosRol();
    if (this.rol() === 'especialista') {
      await Promise.all([
        this.cargarEspecialidades(),
        this.cargarDisponibilidad(),
      ]);
    }
    if (this.rol() === 'paciente') {
      await this.cargarHistorialClinico();
    }
    this.isLoading.set(false);
  }

  /** Carga los datos extendidos del rol (DNI, edad, etc.) desde la tabla hija. */
  private async cargarDatosRol(): Promise<void> {
    const perfil = this.perfil();
    if (!perfil) return;

    try {
      const { data, error } = await this.supabase.supabase
        .from(this.tablaRol)
        .select('*')
        .eq('id', perfil.id)
        .single();

      if (error || !data) return;

      const row = data as Record<string, unknown>;
      this.datosRol.set({
        dni: row['dni'] as string,
        edad: row['edad'] as number,
        obra_social: row['obra_social'] as string | undefined,
      });
    } catch {
    }
  }

  /** Carga el historial clínico completo del paciente autenticado. */
  private async cargarHistorialClinico(): Promise<void> {
    const perfil = this.perfil();
    if (!perfil) return;

    this.isLoadingHistorial.set(true);

    this.medicalRecordsService.getHistoryByPatientId(perfil.id).subscribe({
      next: (records) => {
        this.historialClinico.set(records);
        this.isLoadingHistorial.set(false);
      },
      error: () => {
        this.isLoadingHistorial.set(false);
      },
    });
  }

  /** Exporta el historial clínico del paciente a PDF con logo institucional. */
  async exportarHistorialPDF(): Promise<void> {
    const perfil = this.perfil();
    if (!perfil || this.historialClinico().length === 0) return;

    this.isExportingPDF.set(true);

    try {
      await this.pdfExportService.exportarHistorialPaciente(
        this.historialClinico(),
        perfil.full_name,
        this.datosRol()?.dni ?? '',
        perfil.email,
        this.datosRol()?.edad,
      );
    } finally {
      this.isExportingPDF.set(false);
    }
  }

  /** Carga las especialidades asociadas al especialista (dos pasos). */
  private async cargarEspecialidades(): Promise<void> {
    const perfil = this.perfil();
    if (!perfil) return;

    try {
      const { data: joinData } = await this.supabase.supabase
        .from('especialista_especialidad')
        .select('especialidad_id')
        .eq('especialista_id', perfil.id);

      if (!joinData?.length) return;

      const ids = joinData.map((j: Record<string, unknown>) => j['especialidad_id'] as string);

      const { data: especialidadesData } = await this.supabase.supabase
        .from('specialties')
        .select('id, name')
        .in('id', ids)
        .eq('is_active', true);

      if (!especialidadesData) return;

      this.especialidades.set(
        Object.freeze(
          especialidadesData.map((e: Record<string, unknown>) => ({
            id: e['id'] as string,
            name: e['name'] as string,
          }))
        )
      );
    } catch {
    }
  }

  /** Carga la disponibilidad actual y construye la configuración semanal. */
  private async cargarDisponibilidad(): Promise<void> {
    const perfil = this.perfil();
    if (!perfil) return;

    await this.disponibilidadService.cargarDisponibilidadPorEspecialista(perfil.id);

    const registros = this.disponibilidadService.disponibilidades();
    this.construirConfiguracion(registros);
  }

  /**
   * Convierte los registros planos de disponibilidad en un diccionario
   * indexado por dia_semana, compatible con el formulario de disponibilidad.
   */
  private construirConfiguracion(
    registros: readonly { especialidad_id: string; dia_semana: DiaSemana; hora_inicio: string; hora_fin: string }[]
  ): void {
    const config: Record<number, ConfiguracionDiaExtendida> = {};

    for (const diaInfo of this.diasDisponibles) {
      config[diaInfo.id] = { habilitado: false, bloques: [] };
    }

    const agrupados = new Map<number, { especialidad_id: string; hora_inicio: string; hora_fin: string }[]>();

    for (const reg of registros) {
      const dia = reg.dia_semana;
      if (!agrupados.has(dia)) {
        agrupados.set(dia, []);
      }
      agrupados.get(dia)!.push({
        especialidad_id: reg.especialidad_id,
        hora_inicio: reg.hora_inicio,
        hora_fin: reg.hora_fin,
      });
    }

    for (const [dia, bloques] of agrupados) {
      config[dia] = {
        habilitado: true,
        bloques: bloques.map(b => ({
          especialidad_id: b.especialidad_id,
          hora_inicio: b.hora_inicio,
          hora_fin: b.hora_fin,
        })),
      };
    }

    this.configuracion.set(config);
  }

  /** Cambia la pestaña activa. */
  seleccionarTab(tab: TabId): void {
    this.tabActiva.set(tab);
  }

  /** Maneja la seleccion de un archivo de avatar. */
  onAvatarSeleccionado(file: File): void {
    this.archivoAvatar = file;

    const reader = new FileReader();
    reader.onload = () => {
      this.avatarPreview.set(reader.result as string);
    };
    reader.readAsDataURL(file);
  }

  /** Sube el avatar a Supabase Storage y actualiza el perfil. */
  async subirAvatar(): Promise<void> {
    const perfil = this.perfil();
    const archivo = this.archivoAvatar;
    if (!perfil || !archivo) return;

    this.isUploadingAvatar.set(true);

    try {
      const ext = archivo.name.split('.').pop() ?? 'jpg';
      const ruta = `avatars/${perfil.id}/avatar.${ext}`;

      const { error: uploadError } = await this.supabase.supabase.storage
        .from('avatars')
        .upload(ruta, archivo, { upsert: true });

      if (uploadError) {
        toast.error('No se pudo subir la imagen. Intenta nuevamente.');
        return;
      }

      const { data: urlData } = this.supabase.supabase.storage
        .from('avatars')
        .getPublicUrl(ruta);

      const publicUrl = urlData.publicUrl;

      const { error: updateError } = await this.supabase.supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', perfil.id);

      if (updateError) {
        toast.error('No se pudo actualizar la foto de perfil.');
        return;
      }

      this.authService['userProfileSignal'].set({
        ...perfil,
        avatar_url: publicUrl,
      });

      this.avatarPreview.set(null);
      this.archivoAvatar = null;
      toast.success('Foto de perfil actualizada correctamente.');
    } catch {
      toast.error('Error inesperado al subir la imagen.');
    } finally {
      this.isUploadingAvatar.set(false);
    }
  }

  /** Cancela la seleccion de avatar pendiente. */
  cancelarAvatar(): void {
    this.avatarPreview.set(null);
    this.archivoAvatar = null;
  }

  /** Maneja cambios en la configuracion de disponibilidad desde el formulario. */
  onConfiguracionCambiada(evento: { readonly dia: DiaSemana; readonly config: ConfiguracionDia }): void {
    this.configuracion.update(actual => ({
      ...actual,
      [evento.dia]: evento.config,
    }));
  }

  /** Persiste la configuracion de disponibilidad en Supabase. */
  async guardarDisponibilidad(): Promise<void> {
    const perfil = this.perfil();
    if (!perfil) return;

    this.isGuardando.set(true);

    try {
      const registros: DisponibilidadEspecialistaInsert[] = [];

      for (const [diaStr, config] of Object.entries(this.configuracion())) {
        const dia = Number(diaStr) as DiaSemana;
        if (!config.habilitado || config.bloques.length === 0) continue;

        for (const bloque of config.bloques) {
          registros.push({
            especialista_id: perfil.id,
            especialidad_id: bloque.especialidad_id,
            dia_semana: dia,
            hora_inicio: bloque.hora_inicio,
            hora_fin: bloque.hora_fin,
          });
        }
      }

      await this.disponibilidadService.guardarDisponibilidadSemanal(perfil.id, registros);
    } catch {
    } finally {
      this.isGuardando.set(false);
    }
  }

  /** Obtiene las iniciales del usuario para fallback del avatar. */
  getInitials(name: string): string {
    return name
      .split(' ')
      .map(part => part.charAt(0))
      .slice(0, 2)
      .join('')
      .toUpperCase();
  }

  /** Obtiene la URL del avatar actual (incluyendo preview local). */
  getAvatarUrl(): string | null {
    return this.avatarPreview() ?? this.perfil()?.avatar_url ?? null;
  }

  /** Indica si hay cambios pendientes de guardar en el avatar. */
  readonly tieneAvatarPendiente = computed(() => this.avatarPreview() !== null);
}
