/** Tipos de las tablas de Supabase (esquema public), según el diagrama de Smart Parking. */
export type Rol = "estudiante" | "docente" | "administrativo" | "administrador";
export type TipoAcceso = "entrada" | "salida";
export type EstadoFoto = "sin_foto" | "pendiente" | "aprobada" | "rechazada";
export type ExcepcionFoto = "medica" | "religiosa" | "discapacidad" | "sin_camara";

export interface Usuario {
  id: number;
  auth_id: string;
  correo: string;
  rol: Rol | null;
  nombre: string | null;
  apellido_paterno: string | null;
  apellido_materno: string | null;
  matricula: string | null;
  carrera: string | null;
  semestre: number | null;
  foto_path: string | null;
  foto_estado: EstadoFoto;
  foto_motivo_rechazo: string | null;
  foto_excepcion: ExcepcionFoto | null;
  /** R1 a R11: true, false, "advertencia" (heurísticas) o "no_aplica". */
  foto_checks: Record<string, boolean | "advertencia" | "no_aplica"> | null;
  foto_path_anterior: string | null;
  foto_subida_at: string | null;
  foto_revisada_at: string | null;
  foto_revisada_por: string | null;
  consentimiento_foto_at: string | null;
}

export interface Vehiculo {
  placa: string;
  usuario_id: number;
  qr_token: string | null;
}

export interface Acceso {
  id: number;
  vehiculo_placa: string;
  usuario_id: number;
  tipo: TipoAcceso;
  fecha: string;
}

export interface Bitacora {
  id: number;
  nombre_conductor: string;
  empresa: string;
  asunto: string;
  placa: string | null;
  hora_entrada: string;
  hora_salida: string | null;
  created_at: string;
}
