import { ConfiguracionDia, DiaSemana } from '@core/models/disponibilidad.model';

export type { EspecialidadPerfil, DiaInfo } from '@core/models/disponibilidad.model';

/** Role-specific extended data loaded from the child table. */
export interface DatosRol {
  readonly dni: string;
  readonly edad: number;
  readonly obra_social?: string;
  readonly avatar_url_frontal?: string | null;
  readonly avatar_url_secundario?: string | null;
  readonly is_approved?: boolean;
}

/** Extended day configuration that includes record IDs for editing. */
export interface ConfiguracionDiaExtendida extends ConfiguracionDia {
  readonly registrosIds?: readonly string[];
}

/** Payload for updating the user profile in the profiles table. */
export interface ProfileUpdatePayload {
  readonly full_name: string;
}

/** Tab identifiers for the profile page. */
export type TabId = 'informacion' | 'horarios' | 'historial' | 'seguridad';
