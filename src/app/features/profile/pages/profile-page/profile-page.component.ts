import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TitleCasePipe, NgClass } from '@angular/common';
import { LucideDynamicIcon } from '@lucide/angular';
import { AuthService } from '@core/services/auth.service';
import { ProfileService } from '../../services/profile.service';
import { DisponibilidadService } from '@core/services/disponibilidad.service';
import { MedicalRecordsService } from '@features/medical-history/services/medical-records.service';
import { PdfExportService } from '@features/medical-history/services/pdf-export.service';
import { MedicalHistoryListComponent } from '@features/medical-history/components/medical-history-list/medical-history-list.component';
import { MedicalRecordConRelaciones } from '@features/medical-history/models/medical-record.model';
import { FileUploadComponent } from '@shared/components/file-upload/file-upload.component';
import { FallbackAvatarDirective } from '@shared/directives/fallback-avatar.directive';
import { FormatDniPipe } from '@shared/pipes/format-dni.pipe';
import { AvailabilityFormComponent } from '@features/specialist/availability/components/availability-form/availability-form.component';
import { SlotsPreviewComponent } from '@features/specialist/availability/components/slots-preview/slots-preview.component';
import { PasswordChangeComponent } from '../../components/password-change/password-change.component';
import { ImageCropperComponent } from '@shared/components/image-cropper/image-cropper.component';
import { toast } from 'ngx-sonner';
import {
  ConfiguracionDia,
  DiaSemana,
  DisponibilidadEspecialistaInsert,
} from '@core/models/disponibilidad.model';
import { diasLaboralesEsAR } from '@shared/utils/date-locale.utils';
import {
  TabId,
  TabPerfil,
  TABS_PERFIL,
  ConfiguracionDiaExtendida,
  DiaInfo,
} from '../../models/profile.model';

@Component({
  selector: 'app-profile-page',
  standalone: true,
  imports: [
    FormsModule,
    TitleCasePipe,
    NgClass,
    LucideDynamicIcon,
    FileUploadComponent,
    AvailabilityFormComponent,
    SlotsPreviewComponent,
    MedicalHistoryListComponent,
    FallbackAvatarDirective,
    FormatDniPipe,
    PasswordChangeComponent,
    ImageCropperComponent,
  ],
  templateUrl: './profile-page.component.html',
  styleUrl: './profile-page.component.scss',
})
export class ProfilePageComponent implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly profileService = inject(ProfileService);
  readonly disponibilidadService = inject(DisponibilidadService);
  private readonly medicalRecordsService = inject(MedicalRecordsService);
  private readonly pdfExportService = inject(PdfExportService);

  /** Active tab identifier. */
  readonly tabActiva = signal<TabId>('informacion');

  /** User profile from AuthService. */
  readonly perfil = this.authService.userProfile;

  /** User role. */
  readonly rol = this.authService.userRole;

  /** Days of the week for the availability form. */
  readonly diasDisponibles: ReadonlyArray<DiaInfo> = diasLaboralesEsAR().map(dia => ({
    id: dia.id as DiaSemana,
    nombre: dia.nombre,
  }));

  /** Role-specific extended data (delegated to ProfileService). */
  readonly datosRol = this.profileService.datosRol;

  /** Loading state for the initial profile fetch. */
  readonly isLoading = signal(true);

  /** Load error with retry when the initial fetch fails. */
  readonly errorCarga = signal<string | null>(null);

  /** Loading state for the avatar upload. */
  readonly isUploadingAvatar = signal(false);

  /** Local preview of the selected avatar before upload. */
  readonly avatarPreview = signal<string | null>(null);

  /** Pending avatar file. */
  private archivoAvatar: File | null = null;

  /** File waiting to be cropped before upload. */
  readonly cropperFile = signal<File | null>(null);

  /** Whether the image cropper modal is visible. */
  readonly mostrarCropper = signal(false);

  /** Which patient avatar is currently active as primary — detected from actual URLs. */
  readonly avatarActivo = computed(() => {
    const perfil = this.perfil();
    const datos = this.datosRol();
    if (!perfil || !datos) return 'frontal';

    const currentUrl = this.stripCacheBust(perfil.avatar_url ?? '');
    const secundarioUrl = this.stripCacheBust(datos.avatar_url_secundario ?? '');

    if (currentUrl && secundarioUrl && currentUrl === secundarioUrl) {
      return 'secundario' as const;
    }
    return 'frontal' as const;
  });

  /** Specialist's linked specialties (delegated to ProfileService). */
  readonly especialidades = this.profileService.especialidades;

  /** Weekly availability configuration. */
  readonly configuracion = signal<Record<number, ConfiguracionDiaExtendida>>({});

  /** Saving state for availability. */
  readonly isGuardando = signal(false);

  /** Patient's medical history. */
  readonly historialClinico = signal<readonly MedicalRecordConRelaciones[]>([]);

  /** Loading state for medical history. */
  readonly isLoadingHistorial = signal(false);

  /** Medical history load error with retry. */
  readonly errorHistorial = signal<string | null>(null);

  /** Exporting state for PDF. */
  readonly isExportingPDF = signal(false);

  /** Edit mode toggle. */
  readonly isEditing = signal(false);

  /** Saving state for profile edits. */
  readonly isSavingProfile = signal(false);

  /** Editable full name. */
  nombreEdit = '';

  /** Tabs visible for the current role, in canonical order. */
  readonly tabsVisibles = computed((): readonly TabPerfil[] => {
    const rol = this.rol();
    return TABS_PERFIL.filter(tab =>
      tab.id === 'informacion' ||
      tab.id === 'seguridad' ||
      (tab.id === 'horarios' && rol === 'especialista') ||
      (tab.id === 'historial' && rol === 'paciente'),
    );
  });

  /** Role pill classes mirroring the sidebar badge mapping. */
  readonly claseRol = computed(() => {
    const rol = this.perfil()?.role;
    if (rol === 'administrador') return 'bg-purple-100 text-purple-700';
    if (rol === 'especialista') return 'bg-teal-100 text-teal-700';
    return 'bg-emerald-100 text-emerald-700';
  });

  /** Whether the specialist has at least one enabled availability block. */
  readonly tieneBloques = computed(() =>
    Object.values(this.configuracion()).some(
      dia => dia.habilitado && dia.bloques.length > 0,
    ),
  );

  async ngOnInit(): Promise<void> {
    await this.cargarPerfil();
  }

  /** Reloads the profile after a load error. */
  async recargar(): Promise<void> {
    await this.cargarPerfil();
  }

  private async cargarPerfil(): Promise<void> {
    const perfil = this.perfil();
    if (!perfil) {
      this.errorCarga.set('No se encontró tu sesión. Cerrá sesión e ingresá nuevamente.');
      this.isLoading.set(false);
      return;
    }

    this.isLoading.set(true);
    this.errorCarga.set(null);

    try {
      await this.profileService.cargarDatosRol();

      if (this.rol() === 'especialista') {
        await Promise.all([
          this.profileService.cargarEspecialidades(),
          this.cargarDisponibilidad(),
        ]);
      }

      if (this.rol() === 'paciente') {
        await this.cargarHistorialClinico();
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error al cargar el perfil.';
      toast.error(message);
      this.errorCarga.set('No se pudo cargar el perfil. Revisá tu conexión.');
    } finally {
      this.isLoading.set(false);
    }
  }

  /** Loads the specialist's availability from Supabase. */
  private async cargarDisponibilidad(): Promise<void> {
    const perfil = this.perfil();
    if (!perfil) return;

    await this.disponibilidadService.cargarDisponibilidadPorEspecialista(perfil.id);
    const registros = this.disponibilidadService.disponibilidades();
    this.construirConfiguracion(registros);
  }

  /** Converts flat availability records into the weekly config dictionary. */
  private construirConfiguracion(
    registros: readonly { especialidad_id: string; dia_semana: DiaSemana; hora_inicio: string; hora_fin: string }[],
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

  /** Loads the patient's medical history. */
  private async cargarHistorialClinico(): Promise<void> {
    const perfil = this.perfil();
    if (!perfil) return;

    this.isLoadingHistorial.set(true);
    this.errorHistorial.set(null);

    this.medicalRecordsService.getHistoryByPatientId(perfil.id).subscribe({
      next: (records) => {
        this.historialClinico.set(records);
        this.isLoadingHistorial.set(false);
      },
      error: () => {
        this.isLoadingHistorial.set(false);
        this.errorHistorial.set('No se pudo cargar el historial clínico.');
        toast.error('No se pudo cargar el historial clínico.');
      },
    });
  }

  /** Reloads the medical history after a load error. */
  reintentarHistorial(): void {
    this.cargarHistorialClinico();
  }

  /** Exports the patient's medical history to PDF. */
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

  /** Switches the active tab. */
  seleccionarTab(tab: TabId): void {
    this.tabActiva.set(tab);
  }

  /**
   * Moves focus between tabs with arrow, Home and End keys.
   *
   * @param event Keyboard event from the tablist.
   */
  onTabKeydown(event: KeyboardEvent): void {
    const validas = ['ArrowLeft', 'ArrowRight', 'Home', 'End'];
    if (!validas.includes(event.key)) return;

    const tabs = this.tabsVisibles();
    const actual = tabs.findIndex(tab => tab.id === this.tabActiva());
    let siguiente = actual;

    if (event.key === 'ArrowRight') siguiente = (actual + 1) % tabs.length;
    if (event.key === 'ArrowLeft') siguiente = (actual - 1 + tabs.length) % tabs.length;
    if (event.key === 'Home') siguiente = 0;
    if (event.key === 'End') siguiente = tabs.length - 1;

    if (siguiente !== actual && tabs[siguiente]) {
      event.preventDefault();
      this.seleccionarTab(tabs[siguiente].id);
      const contenedor = (event.target as HTMLElement).closest('[role="tablist"]');
      contenedor?.querySelector<HTMLElement>(`#tab-${tabs[siguiente].id}`)?.focus();
    }
  }

  /** Handles avatar file selection — opens the cropper modal. */
  onAvatarSeleccionado(file: File): void {
    this.cropperFile.set(file);
    this.mostrarCropper.set(true);
  }

  /** Receives the cropped image data URL from the cropper and prepares it for upload. */
  onCropperCropped(dataUrl: string): void {
    this.avatarPreview.set(dataUrl);
    this.mostrarCropper.set(false);

    const file = this.cropperFile();
    if (file) {
      const ext = file.name.split('.').pop() ?? 'png';
      const blob = this.dataUrlToBlob(dataUrl, ext);
      this.archivoAvatar = new File([blob], `avatar_cropped.${ext}`, { type: blob.type });
    }
    this.cropperFile.set(null);
  }

  /** Closes the cropper modal without applying the crop. */
  onCropperCancelled(): void {
    this.mostrarCropper.set(false);
    this.cropperFile.set(null);
  }

  /** Converts a data URL string into a Blob object. */
  private dataUrlToBlob(dataUrl: string, ext: string): Blob {
    const parts = dataUrl.split(',');
    const mime = parts[0].match(/:(.*?);/)?.[1] ?? `image/${ext}`;
    const byteString = atob(parts[1]);
    const ab = new ArrayBuffer(byteString.length);
    const ia = new Uint8Array(ab);
    for (let i = 0; i < byteString.length; i++) {
      ia[i] = byteString.charCodeAt(i);
    }
    return new Blob([ab], { type: mime });
  }

  /** Uploads the avatar via ProfileService. */
  async subirAvatar(): Promise<void> {
    const archivo = this.archivoAvatar;
    if (!archivo) return;

    this.isUploadingAvatar.set(true);

    try {
      await this.profileService.subirAvatar(archivo);

      if (this.rol() === 'paciente') {
        await this.profileService.cargarDatosRol();
      }

      this.avatarPreview.set(null);
      this.archivoAvatar = null;
      toast.success('Foto de perfil actualizada correctamente.');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error inesperado al subir la imagen.';
      toast.error(message);
    } finally {
      this.isUploadingAvatar.set(false);
    }
  }

  /** Cancels the pending avatar selection. */
  cancelarAvatar(): void {
    this.avatarPreview.set(null);
    this.archivoAvatar = null;
  }

  /** Handles availability config changes from the form. */
  onConfiguracionCambiada(evento: { readonly dia: DiaSemana; readonly config: ConfiguracionDia }): void {
    this.configuracion.update(actual => ({
      ...actual,
      [evento.dia]: evento.config,
    }));
  }

  /** Persists the availability configuration. */
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
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error al guardar la disponibilidad.';
      toast.error(message);
    } finally {
      this.isGuardando.set(false);
    }
  }

  /** Returns initials for the avatar fallback, empty when the name is blank. */
  getInitials(name: string): string {
    if (!name || !name.trim()) return '';
    return name
      .trim()
      .split(/\s+/)
      .map(part => part.charAt(0))
      .slice(0, 2)
      .join('')
      .toUpperCase();
  }

  /** Formats an age value with its unit. */
  edadTexto(edad: number): string {
    return `${edad} años`;
  }

  /** Strips query string parameters from a URL for cache-busting comparison. */
  private stripCacheBust(url: string): string {
    try {
      const parsed = new URL(url);
      parsed.search = '';
      return parsed.toString();
    } catch {
      const idx = url.indexOf('?');
      return idx >= 0 ? url.substring(0, idx) : url;
    }
  }

  /** Returns the avatar URL, considering local preview and patient-specific URLs. */
  getAvatarUrl(): string | null {
    return this.avatarPreview() ?? this.perfil()?.avatar_url ?? null;
  }

  /** Initials for the avatar fallback, empty when the name is blank. */
  readonly inicialesAvatar = computed(() => this.getInitials(this.perfil()?.full_name ?? ''));

  /** Whether there is a pending avatar to upload. */
  readonly tieneAvatarPendiente = computed(() => this.avatarPreview() !== null);

  /** Sets a patient document photo as the active primary avatar. */
  async establecerAvatarPrincipal(tipo: 'frontal' | 'secundario'): Promise<void> {
    const datos = this.datosRol();
    if (!datos) return;

    const url = tipo === 'frontal' ? datos.avatar_url_frontal : datos.avatar_url_secundario;
    if (!url) return;

    try {
      await this.profileService.actualizarAvatarPrincipal(url, tipo);
      toast.success('Avatar principal actualizado.');
    } catch {
      toast.error('No se pudo actualizar el avatar principal.');
    }
  }

  /** Activates profile edit mode. */
  editarPerfil(): void {
    const p = this.perfil();
    if (p) {
      this.nombreEdit = p.full_name;
    }
    this.isEditing.set(true);
  }

  /** Cancels profile edit mode. */
  cancelarEdicion(): void {
    this.isEditing.set(false);
  }

  /** Saves profile changes via ProfileService. */
  async guardarPerfil(): Promise<void> {
    const perfil = this.perfil();
    if (!perfil) return;

    const trimmedName = this.nombreEdit.trim();
    if (!trimmedName) {
      toast.error('El nombre no puede estar vacío.');
      return;
    }

    this.isSavingProfile.set(true);

    try {
      await this.profileService.actualizarPerfil({
        full_name: trimmedName,
      });

      this.isEditing.set(false);
      toast.success('Perfil actualizado correctamente.');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error inesperado al guardar el perfil.';
      toast.error(message);
    } finally {
      this.isSavingProfile.set(false);
    }
  }
}
