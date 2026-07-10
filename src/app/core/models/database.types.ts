export type UserRole = 'paciente' | 'especialista' | 'administrador';
export type TurnoEstado = 'pendiente' | 'confirmado' | 'rechazado' | 'cancelado' | 'finalizado';

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string;
          full_name: string;
          avatar_url: string | null;
          role: UserRole;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          full_name: string;
          avatar_url?: string | null;
          role: UserRole;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          full_name?: string;
          avatar_url?: string | null;
          role?: UserRole;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      specialties: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          is_active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          description?: string | null;
          is_active?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          description?: string | null;
          is_active?: boolean;
          created_at?: string;
        };
        Relationships: [];
      };
      pacientes: {
        Row: {
          id: string;
          dni: string;
          edad: number;
          obra_social: string;
          avatar_url_frontal: string | null;
          avatar_url_secundario: string | null;
        };
        Insert: {
          id: string;
          dni: string;
          edad: number;
          obra_social: string;
          avatar_url_frontal?: string | null;
          avatar_url_secundario?: string | null;
        };
        Update: {
          id?: string;
          dni?: string;
          edad?: number;
          obra_social?: string;
          avatar_url_frontal?: string | null;
          avatar_url_secundario?: string | null;
        };
        Relationships: [];
      };
      especialistas: {
        Row: {
          id: string;
          dni: string;
          edad: number;
          is_approved: boolean;
        };
        Insert: {
          id: string;
          dni: string;
          edad: number;
          is_approved?: boolean;
        };
        Update: {
          id?: string;
          dni?: string;
          edad?: number;
          is_approved?: boolean;
        };
        Relationships: [];
      };
      administradores: {
        Row: {
          id: string;
          dni: string;
          edad: number;
        };
        Insert: {
          id: string;
          dni: string;
          edad: number;
        };
        Update: {
          id?: string;
          dni?: string;
          edad?: number;
        };
        Relationships: [];
      };
      especialista_especialidad: {
        Row: {
          especialista_id: string;
          especialidad_id: string;
        };
        Insert: {
          especialista_id: string;
          especialidad_id: string;
        };
        Update: {
          especialista_id?: string;
          especialidad_id?: string;
        };
        Relationships: [];
      };
      disponibilidad_especialista: {
        Row: {
          id: string;
          especialista_id: string;
          especialidad_id: string;
          dia_semana: number;
          hora_inicio: string;
          hora_fin: string;
        };
        Insert: {
          id?: string;
          especialista_id: string;
          especialidad_id: string;
          dia_semana: number;
          hora_inicio: string;
          hora_fin: string;
        };
        Update: {
          id?: string;
          especialista_id?: string;
          especialidad_id?: string;
          dia_semana?: number;
          hora_inicio?: string;
          hora_fin?: string;
        };
        Relationships: [];
      };
      turnos: {
        Row: {
          id: string;
          paciente_id: string;
          especialista_id: string;
          especialidad_id: string;
          fecha_hora: string;
          estado: TurnoEstado;
          comentario_cancelacion_rechazo: string | null;
          resena_diagnostico: string | null;
          calificacion_comentario: string | null;
          calificacion_estrellas: number | null;
          encuesta_satisfaccion: Record<string, unknown> | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          paciente_id: string;
          especialista_id: string;
          especialidad_id: string;
          fecha_hora: string;
          estado?: TurnoEstado;
          comentario_cancelacion_rechazo?: string | null;
          resena_diagnostico?: string | null;
          calificacion_comentario?: string | null;
          calificacion_estrellas?: number | null;
          encuesta_satisfaccion?: Record<string, unknown> | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          paciente_id?: string;
          especialista_id?: string;
          especialidad_id?: string;
          fecha_hora?: string;
          estado?: TurnoEstado;
          comentario_cancelacion_rechazo?: string | null;
          resena_diagnostico?: string | null;
          calificacion_comentario?: string | null;
          calificacion_estrellas?: number | null;
          encuesta_satisfaccion?: Record<string, unknown> | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      historias_clinicas: {
        Row: {
          id: string;
          turno_id: string;
          paciente_id: string;
          especialista_id: string;
          altura: number;
          peso: number;
          temperatura: number;
          presion_arterial: string;
          datos_dinamicos: { clave: string; valor: string }[];
          resena: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          turno_id: string;
          paciente_id: string;
          especialista_id: string;
          altura: number;
          peso: number;
          temperatura: number;
          presion_arterial: string;
          datos_dinamicos: { clave: string; valor: string }[];
          resena?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          turno_id?: string;
          paciente_id?: string;
          especialista_id?: string;
          altura?: number;
          peso?: number;
          temperatura?: number;
          presion_arterial?: string;
          datos_dinamicos?: { clave: string; valor: string }[];
          resena?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      user_role: UserRole;
      turno_estado: TurnoEstado;
    };
  };
}
