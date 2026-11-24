/**
 * Reglas R1 a R11 como funciones puras: reciben métricas y devuelven { regla, ok, mensaje }.
 * Sin DOM, para poder probarlas con métricas simuladas.
 */
import { FACE_CONFIG, type FaceConfig } from "./config";
import type { CheckValue, Excepcion, FotoChecks, Metrics, Modo, RuleId, RuleResult } from "./types";

export const RULE_LABEL: Record<RuleId, string> = {
  R1: "Un solo rostro",
  R2: "De frente",
  R3: "Centrado",
  R4: "Ojos abiertos",
  R5: "Sin lentes",
  R6: "Sin gorra",
  R7: "Sin cubrebocas",
  R8: "Expresión neutral",
  R9: "Buena luz",
  R10: "Nítida y quieta",
  R11: "Prueba de vida",
};

export const RULE_ORDER: RuleId[] = ["R1", "R2", "R3", "R4", "R5", "R6", "R7", "R8", "R9", "R10", "R11"];

/** Orden en que se muestra la instrucción: solo una a la vez, la de mayor prioridad que falle. */
export const PRIORITY: RuleId[] = ["R1", "R3", "R2", "R9", "R4", "R8", "R10"];

export const HEURISTICAS: RuleId[] = ["R5", "R6", "R7"];

/** Reglas que cada excepción desactiva (quedan como "no_aplica"). */
export const EXCEPCION_DESACTIVA: Record<Excepcion, RuleId[]> = {
  medica: ["R4", "R5", "R7", "R8"],
  religiosa: ["R6"],
  discapacidad: ["R2", "R4", "R8", "R11"],
  sin_camara: [],
};

export interface RuleOptions {
  modo: Modo;
  excepcion: Excepcion | null;
  /** Resultado de la prueba de vida (solo cámara). */
  livenessOk: boolean;
  cfg?: FaceConfig;
}

type Check = { ok: boolean; mensaje: string };
const pass: Check = { ok: true, mensaje: "" };
const failWith = (mensaje: string): Check => ({ ok: false, mensaje });

function r1(m: Metrics, modo: Modo): Check {
  if (m.faces === 1) return pass;
  if (m.faces > 1) return failWith("Debe aparecer solo una persona.");
  return failWith(modo === "archivo" ? "No encontramos un rostro en la foto." : "Coloca tu rostro dentro del óvalo.");
}

function r2(m: Metrics, c: FaceConfig): Check {
  if (m.yaw === null || m.pitch === null || m.roll === null) return failWith("Mira de frente a la cámara.");
  if (Math.abs(m.yaw) > c.maxAngleDeg) return failWith("Gira la cabeza hacia el frente.");
  if (Math.abs(m.pitch) > c.maxAngleDeg) return failWith("Endereza la cabeza: ni hacia arriba ni hacia abajo.");
  if (Math.abs(m.roll) > c.maxAngleDeg) return failWith("No inclines la cabeza hacia un lado.");
  return pass;
}

function r3(m: Metrics, c: FaceConfig, modo: Modo): Check {
  if (m.faceHeight === null || m.centerOffset === null) return failWith("Coloca tu rostro dentro del óvalo.");
  if (modo === "archivo") {
    // En archivos el recorte se arma alrededor del rostro: falla si no cabe completo.
    if (m.faceHeight < c.faceHeightMin || m.faceHeight > c.faceHeightMax || m.centerOffset > c.centerTolerance) {
      return failWith("Usa una foto donde tu rostro y tus hombros se vean completos.");
    }
    return pass;
  }
  if (m.faceHeight < c.faceHeightMin) return failWith("Acércate un poco a la cámara.");
  if (m.faceHeight > c.faceHeightMax) return failWith("Aléjate un poco de la cámara.");
  if (m.centerOffset > c.centerTolerance) return failWith("Centra tu rostro en el óvalo.");
  return pass;
}

function r4(m: Metrics, c: FaceConfig): Check {
  if (m.eyeBlinkLeft === null || m.eyeBlinkRight === null) return failWith("Abre bien los ojos.");
  return m.eyeBlinkLeft < c.eyeBlinkMax && m.eyeBlinkRight < c.eyeBlinkMax ? pass : failWith("Abre bien los ojos.");
}

function r5(m: Metrics, c: FaceConfig): Check {
  if (m.glassesBridgeEdges === null || m.glassesHighlights === null) return failWith("Quítate los lentes si los usas.");
  return m.glassesBridgeEdges <= c.glassesBridgeEdgeMax && m.glassesHighlights <= c.glassesHighlightMax ? pass : failWith("Quítate los lentes si los usas.");
}

function r6(m: Metrics, c: FaceConfig): Check {
  if (m.foreheadColorDist === null) return failWith("Si traes gorra o algo en la cabeza, quítatelo.");
  return m.foreheadColorDist <= c.headwearColorDistMax ? pass : failWith("Si traes gorra o algo en la cabeza, quítatelo.");
}

function r7(m: Metrics, c: FaceConfig): Check {
  if (m.mouthColorDist === null || m.mouthTexture === null) return failWith("Quítate el cubrebocas si lo traes.");
  return m.mouthColorDist <= c.maskColorDistMax && m.mouthTexture >= c.maskTextureMin ? pass : failWith("Quítate el cubrebocas si lo traes.");
}

function r8(m: Metrics, c: FaceConfig): Check {
  if (m.smile === null || m.jawOpen === null || m.browInnerUp === null) return failWith("Mantén una expresión neutral.");
  if (m.smile >= c.smileMax) return failWith("Mantén una expresión neutral, sin sonreír.");
  if (m.jawOpen >= c.jawOpenMax) return failWith("Cierra la boca.");
  if (m.browInnerUp >= c.browInnerUpMax) return failWith("Relaja las cejas.");
  return pass;
}

function r9(m: Metrics, c: FaceConfig): Check {
  if (m.luminance === null || m.luminanceAsymmetry === null) return failWith("Busca más luz frente a ti.");
  if (m.luminance < c.luminanceMin) return failWith("Busca más luz frente a ti.");
  if (m.luminance > c.luminanceMax) return failWith("Hay demasiada luz: aléjate de la ventana o la lámpara.");
  if (m.luminanceAsymmetry >= c.luminanceAsymmetryMax) return failWith("La luz te da de un solo lado: ponte de frente a ella.");
  return pass;
}

function r10(m: Metrics, c: FaceConfig, modo: Modo): Check {
  if (modo === "archivo" && m.cropHeightPx !== null && m.cropHeightPx < c.uploadMinCropHeight) {
    return failWith("La foto tiene poca resolución: usa una más nítida o más cercana.");
  }
  if (m.motion !== null && m.motion > c.motionMax) return failWith("Quédate quieto un momento.");
  if (m.sharpness === null || m.sharpness < c.sharpnessMin) return failWith("La imagen se ve borrosa: limpia la cámara o busca más luz.");
  return pass;
}

/** Evalúa todas las reglas en el orden R1 a R11. */
export function evaluateRules(m: Metrics, opts: RuleOptions): RuleResult[] {
  const c = opts.cfg ?? FACE_CONFIG;
  const desactivadas = new Set<RuleId>(opts.excepcion ? EXCEPCION_DESACTIVA[opts.excepcion] : []);
  const uno = m.faces === 1;

  const raw: Record<RuleId, Check> = {
    R1: r1(m, opts.modo),
    R2: r2(m, c),
    R3: r3(m, c, opts.modo),
    R4: r4(m, c),
    R5: r5(m, c),
    R6: r6(m, c),
    R7: r7(m, c),
    R8: r8(m, c),
    R9: r9(m, c),
    R10: r10(m, c, opts.modo),
    R11: opts.livenessOk ? pass : failWith("Completa la prueba de vida."),
  };

  return RULE_ORDER.map((regla): RuleResult => {
    const tipo = HEURISTICAS.includes(regla) ? "advierte" : "bloquea";
    const base = { regla, tipo, label: RULE_LABEL[regla] } as const;
    if (desactivadas.has(regla) || (regla === "R11" && opts.modo === "archivo")) {
      return { ...base, ok: true, estado: "no_aplica", mensaje: "" };
    }
    const r = raw[regla];
    if (tipo === "advierte") {
      // Sin un solo rostro no hay nada que medir (y nunca se captura en ese estado).
      if (!uno) return { ...base, ok: true, estado: "no_aplica", mensaje: "" };
      return r.ok ? { ...base, ok: true, estado: "ok", mensaje: "" } : { ...base, ok: true, estado: "advertencia", mensaje: r.mensaje };
    }
    return r.ok && (uno || regla === "R11") ? { ...base, ok: true, estado: "ok", mensaje: "" } : { ...base, ok: false, estado: "falla", mensaje: r.mensaje || raw.R1.mensaje };
  });
}

const byId = (results: RuleResult[], id: RuleId) => results.find((r) => r.regla === id);

/** true si R1 a R10 que bloquean están en verde (R11 se evalúa aparte). */
export function framingOk(results: RuleResult[]): boolean {
  return results.every((r) => r.ok || r.tipo === "advierte" || r.regla === "R11");
}

/** true si todas las que bloquean, incluida R11, están en verde. */
export function allBlockingOk(results: RuleResult[]): boolean {
  return results.every((r) => r.ok);
}

/** La instrucción que se muestra: la de mayor prioridad que falle. */
export function primaryInstruction(results: RuleResult[]): RuleResult | null {
  for (const id of PRIORITY) {
    const r = byId(results, id);
    if (r && !r.ok) return r;
  }
  return null;
}

/** Objeto foto_checks que viaja al servidor: solo el resultado de cada regla. */
export function toFotoChecks(results: RuleResult[]): FotoChecks {
  const value = (r: RuleResult): CheckValue => (r.estado === "ok" ? true : r.estado === "falla" ? false : r.estado);
  return Object.fromEntries(RULE_ORDER.map((id) => [id, value(byId(results, id)!)])) as FotoChecks;
}
