import type { Acceso, Bitacora, ExcepcionFoto, Rol, TipoAcceso, Usuario, Vehiculo } from "@/lib/supabase/types";

export type { Acceso, Bitacora, ExcepcionFoto, Rol, TipoAcceso, Usuario, Vehiculo };

export type FotoChecks = NonNullable<Usuario["foto_checks"]>;

export interface NuevaFoto {
  /** JPEG ya procesado (600 × 800, sin EXIF). */
  jpeg: Buffer;
  checks: FotoChecks;
  excepcion: ExcepcionFoto | null;
}

/** Una foto en la cola de revisión del administrador. */
export interface FotoRevision {
  usuarioId: number;
  nombre: string;
  correo: string;
  rol: Rol | null;
  matricula: string | null;
  carrera: string | null;
  subidaAt: string;
  url: string | null;
  /** Foto aprobada vigente (si la hay), para comparar. */
  anteriorUrl: string | null;
  checks: FotoChecks | null;
  excepcion: ExcepcionFoto | null;
}

export type DecisionFoto = { accion: "aprobar" } | { accion: "rechazar"; motivo: string };

export interface AccesoDetalle extends Acceso {
  nombre: string;
}

export interface VehiculoDetalle extends Vehiculo {
  propietario: string;
  correo: string;
  /** true si la placa no tiene una cuenta registrada asociada. */
  sinDueno: boolean;
}

export interface NuevoUsuario {
  correo: string;
  password: string;
  nombre: string;
  apellido_paterno: string;
  apellido_materno: string;
  rol: Rol;
  matricula: string | null;
  carrera: string | null;
  semestre: number | null;
}

export interface PerfilEditable {
  nombre: string;
  apellido_paterno: string;
  apellido_materno: string;
  semestre: number | null;
}

export interface NuevaBitacora {
  nombre_conductor: string;
  empresa: string;
  asunto: string;
  placa: string | null;
  hora_entrada: string;
  hora_salida: string | null;
}

export type Result<T = undefined> = { ok: true; data: T } | { ok: false; error: string };

export interface Lectura {
  tipo: TipoAcceso;
  placa: string;
  nombre: string;
  fecha: string;
}

/** Datos disponibles antes de insertar el acceso (para anti duplicado y verificación de placa). */
export interface PreLectura {
  placa: string;
  /** Fecha ISO del último acceso de esa placa, o null si nunca ha entrado. */
  ultimaFecha: string | null;
}

export type ResultadoLectura<R> =
  | { ok: true; data: Lectura }
  | { ok: false; error: string; code: "NO_REGISTRADO" | "ERROR_BD" }
  | { ok: false; error: string; code: "RECHAZADA"; rechazo: R };

export type Rango = "hoy" | "7" | "30";

export interface PuntoSerie {
  /** Etiqueta corta del eje (hora o día). */
  etiqueta: string;
  /** Texto completo para el tooltip y la tabla. */
  detalle: string;
  entradas: number;
}

export interface ResumenPeriodo {
  rango: Rango;
  accesos: number;
  entradas: number;
  salidas: number;
  vehiculos: number;
  usuarios: number;
  dentroAhora: number;
  /** Entradas por hora (hoy, 06 a 21 h) o por día (7 y 30 días). */
  serie: PuntoSerie[];
  comunidad: { alumnos: number; docentes: number; administrativos: number; sinVehiculo: number };
  fotosPendientes: number;
}

export interface ResultadoBusqueda {
  usuarios: { id: number; nombre: string; correo: string; detalle: string }[];
  vehiculos: { placa: string; propietario: string }[];
  accesos: { id: number; placa: string; nombre: string; tipo: TipoAcceso; fecha: string }[];
}

export interface Repository {
  autenticar(correo: string, password: string): Promise<Usuario | null>;
  registrarUsuario(data: NuevoUsuario): Promise<Result<Usuario>>;
  getUsuario(id: number): Promise<Usuario | null>;
  actualizarPerfil(id: number, data: PerfilEditable): Promise<Result>;
  listUsuarios(): Promise<Usuario[]>;
  eliminarUsuario(id: number): Promise<Result>;
  cambiarPassword(id: number, password: string): Promise<Result>;

  /** URL firmada (5 minutos) de un archivo del bucket privado fotos-perfil. */
  fotoUrl(path: string): Promise<string | null>;
  /** URLs firmadas (5 minutos) para varios archivos, indexadas por ruta. */
  fotoUrls(paths: string[]): Promise<Record<string, string>>;
  /** Borra la foto actual y la anterior del bucket y deja la cuenta «sin foto». */
  borrarFoto(id: number): Promise<Result>;
  /** Subidas de foto de esta cuenta en la última hora (tabla foto_perfil_subidas). */
  subidasUltimaHora(id: number): Promise<number>;
  /** Guarda la foto como «pendiente». Si la vigente no estaba aprobada, la reemplaza en el bucket. */
  subirFoto(id: number, foto: NuevaFoto): Promise<Result>;
  /** Cola de revisión: la foto pendiente más antigua y cuántas hay. */
  siguienteFotoPendiente(): Promise<{ pendientes: number; foto: FotoRevision | null }>;
  /** `subidaAt` debe coincidir con la foto que vio el administrador (evita aprobar otra). */
  revisarFoto(id: number, subidaAt: string, decision: DecisionFoto, revisor: string): Promise<Result>;

  listVehiculos(usuarioId?: number): Promise<VehiculoDetalle[]>;
  agregarVehiculo(usuarioId: number, placa: string): Promise<Result<Vehiculo>>;
  eliminarVehiculo(placa: string, usuarioId?: number): Promise<Result>;

  /** `desde` / `hasta`: ISO; accesos con desde <= fecha < hasta. */
  listAccesos(opts?: { usuarioId?: number; limit?: number; desde?: string; hasta?: string }): Promise<AccesoDetalle[]>;
  contarAccesos(usuarioId: number): Promise<number>;
  eliminarAcceso(id: number): Promise<Result>;
  /**
   * Busca el vehículo del QR y registra entrada/salida. Si `antes` devuelve un rechazo,
   * no inserta nada y lo regresa con code "RECHAZADA".
   */
  registrarLectura<R>(qrToken: string, antes?: (v: PreLectura) => R | null): Promise<ResultadoLectura<R>>;

  listBitacora(limit?: number): Promise<Bitacora[]>;
  agregarBitacora(data: NuevaBitacora): Promise<Result<Bitacora>>;

  resumen(rango: Rango): Promise<ResumenPeriodo>;
  /** Búsqueda global del panel: placa, nombre, matrícula o correo. */
  buscar(q: string): Promise<ResultadoBusqueda>;
}
