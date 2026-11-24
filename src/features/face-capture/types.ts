export type RuleId = "R1" | "R2" | "R3" | "R4" | "R5" | "R6" | "R7" | "R8" | "R9" | "R10" | "R11";

export type Excepcion = "medica" | "religiosa" | "discapacidad" | "sin_camara";

export type Modo = "camara" | "archivo";

/** Valor que viaja al servidor por regla. Nunca métricas crudas. */
export type CheckValue = true | false | "advertencia" | "no_aplica";
export type FotoChecks = Record<RuleId, CheckValue>;

/** Métricas de un cuadro. Si no hay un solo rostro, las del rostro quedan en null. */
export interface Metrics {
  faces: number;
  /** Grados. yaw > 0 = la persona gira hacia SU izquierda (coordenadas sin espejo). */
  yaw: number | null;
  pitch: number | null;
  roll: number | null;
  /** Distancia del centro del rostro al centro del óvalo, en fracción del encuadre. */
  centerOffset: number | null;
  /** Alto del rostro / alto del encuadre. */
  faceHeight: number | null;
  eyeBlinkLeft: number | null;
  eyeBlinkRight: number | null;
  smile: number | null;
  jawOpen: number | null;
  browInnerUp: number | null;
  /** 0 a 255. */
  luminance: number | null;
  /** |izq − der| / max(izq, der). */
  luminanceAsymmetry: number | null;
  sharpness: number | null;
  /** null en el primer cuadro y en imágenes fijas. */
  motion: number | null;
  glassesBridgeEdges: number | null;
  glassesHighlights: number | null;
  foreheadColorDist: number | null;
  mouthColorDist: number | null;
  mouthTexture: number | null;
  /** Solo archivos: alto en píxeles del recorte final. */
  cropHeightPx: number | null;
}

export interface RuleResult {
  regla: RuleId;
  /** true si se cumple (o no aplica). */
  ok: boolean;
  tipo: "bloquea" | "advierte";
  estado: "ok" | "falla" | "advertencia" | "no_aplica";
  /** Nombre corto para la lista. */
  label: string;
  /** Instrucción de corrección en lenguaje simple. */
  mensaje: string;
}
