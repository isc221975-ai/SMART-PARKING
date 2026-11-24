/**
 * Métricas de un cuadro a partir de landmarks, blendshapes, matriz de transformación
 * y píxeles del encuadre. Funciones puras: reciben arreglos, no tocan el DOM.
 *
 * Coordenadas: SIEMPRE sin espejo (como las entrega la cámara). El video se ve en espejo
 * solo por CSS; aquí la izquierda de la imagen es la derecha de la persona.
 */
import { FACE_CONFIG, type FaceConfig } from "./config";
import type { Metrics } from "./types";

export interface Point {
  x: number;
  y: number;
}

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Píxeles RGBA (como ImageData) del encuadre reducido a ~320 px. */
export interface Pixels {
  data: Uint8ClampedArray;
  width: number;
  height: number;
}

export interface Blendshape {
  categoryName: string;
  score: number;
}

export interface FrameInput {
  /** Landmarks por rostro, normalizados al cuadro completo (0 a 1). */
  faces: Point[][];
  blendshapes: Blendshape[] | null;
  /** Matriz 4 × 4 del primer rostro, en orden por columnas. */
  matrix: number[] | null;
  /** Tamaño del cuadro completo en píxeles. */
  frame: { w: number; h: number };
  /** Encuadre (lo que se ve y lo que se captura), en píxeles del cuadro. */
  crop: Rect;
  pixels: Pixels;
  /** Landmarks del cuadro anterior (coordenadas del encuadre), para medir movimiento. */
  prev: Point[] | null;
  /** Solo archivos: alto del recorte final en píxeles. */
  cropHeightPx?: number | null;
}

export const EMPTY_METRICS: Metrics = {
  faces: 0,
  yaw: null,
  pitch: null,
  roll: null,
  centerOffset: null,
  faceHeight: null,
  eyeBlinkLeft: null,
  eyeBlinkRight: null,
  smile: null,
  jawOpen: null,
  browInnerUp: null,
  luminance: null,
  luminanceAsymmetry: null,
  sharpness: null,
  motion: null,
  glassesBridgeEdges: null,
  glassesHighlights: null,
  foreheadColorDist: null,
  mouthColorDist: null,
  mouthTexture: null,
  cropHeightPx: null,
};

// Índices de la malla de 478 puntos de MediaPipe.
const LM = {
  noseTip: 1,
  faceEdgeA: 234,
  faceEdgeB: 454,
  forehead: 10,
  foreheadA: 109,
  foreheadB: 338,
  browA: 105,
  browB: 334,
  bridge: 168,
  eyeOuterA: 33,
  eyeOuterB: 263,
  lidUpperA: 159,
  lidUpperB: 386,
  lidLowerA: 145,
  lidLowerB: 374,
  cheekA: 50,
  cheekB: 280,
  mouthA: 61,
  mouthB: 291,
  upperLip: 0,
  chin: 152,
} as const;

/** Puntos estables para medir movimiento entre cuadros. */
const MOTION_POINTS = [1, 10, 33, 61, 152, 234, 263, 291, 454];

const DEG = 180 / Math.PI;
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
/** Lleva un ángulo a [-90, 90] (la matriz puede venir con el eje z invertido). */
const fold = (a: number) => (a > 90 ? a - 180 : a < -90 ? a + 180 : a);

/** Yaw, pitch y roll (grados) de una matriz 4 × 4 en orden por columnas. */
export function eulerFromMatrix(d: number[]): { yaw: number; pitch: number; roll: number } {
  const R = (r: number, c: number) => d[c * 4 + r]!;
  const pitch = Math.atan2(R(2, 1), R(2, 2)) * DEG;
  const yaw = Math.atan2(-R(2, 0), Math.hypot(R(2, 1), R(2, 2))) * DEG;
  const roll = Math.atan2(R(1, 0), R(0, 0)) * DEG;
  return { yaw, pitch: fold(pitch), roll: fold(roll) };
}

/**
 * Sentido del giro por geometría: la nariz se desplaza hacia el lado al que gira la persona.
 * > 0 = gira hacia SU izquierda (en la imagen sin espejo, la nariz va hacia x mayor).
 */
export function yawSignFromLandmarks(pts: Point[]): number {
  const a = pts[LM.faceEdgeA]!;
  const b = pts[LM.faceEdgeB]!;
  const half = Math.abs(b.x - a.x) / 2 || 1e-6;
  return (pts[LM.noseTip]!.x - (a.x + b.x) / 2) / half;
}

function bbox(pts: Point[]): Rect {
  let x0 = Infinity,
    y0 = Infinity,
    x1 = -Infinity,
    y1 = -Infinity;
  for (const p of pts) {
    if (p.x < x0) x0 = p.x;
    if (p.y < y0) y0 = p.y;
    if (p.x > x1) x1 = p.x;
    if (p.y > y1) y1 = p.y;
  }
  return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
}

const around = (p: Point, hw: number, hh: number): Rect => ({ x: p.x - hw, y: p.y - hh, w: hw * 2, h: hh * 2 });

interface RegionStats {
  r: number;
  g: number;
  b: number;
  lum: number;
  edges: number;
  highlights: number;
  n: number;
}

const lumAt = (d: Uint8ClampedArray, i: number) => 0.299 * d[i]! + 0.587 * d[i + 1]! + 0.114 * d[i + 2]!;

/** Recorre un rectángulo (coordenadas del encuadre, 0 a 1) del lienzo de análisis. */
function toPx(px: Pixels, r: Rect) {
  const x0 = clamp(Math.floor(r.x * px.width), 1, px.width - 2);
  const y0 = clamp(Math.floor(r.y * px.height), 1, px.height - 2);
  const x1 = clamp(Math.ceil((r.x + r.w) * px.width), 1, px.width - 2);
  const y1 = clamp(Math.ceil((r.y + r.h) * px.height), 1, px.height - 2);
  return { x0, y0, x1, y1 };
}

export function regionStats(px: Pixels, rect: Rect, edgeThreshold: number): RegionStats | null {
  const { x0, y0, x1, y1 } = toPx(px, rect);
  if (x1 <= x0 || y1 <= y0) return null;
  const d = px.data;
  const W = px.width;
  let r = 0,
    g = 0,
    b = 0,
    lum = 0,
    edges = 0,
    highlights = 0,
    n = 0;
  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < x1; x++) {
      const i = (y * W + x) * 4;
      const l = lumAt(d, i);
      r += d[i]!;
      g += d[i + 1]!;
      b += d[i + 2]!;
      lum += l;
      const gx = lumAt(d, i + 4) - lumAt(d, i - 4);
      const gy = lumAt(d, i + W * 4) - lumAt(d, i - W * 4);
      if (Math.abs(gx) + Math.abs(gy) > edgeThreshold) edges++;
      if (l > 240) highlights++;
      n++;
    }
  }
  return { r: r / n, g: g / n, b: b / n, lum: lum / n, edges: edges / n, highlights: highlights / n, n };
}

/** Varianza del Laplaciano (nitidez) en un rectángulo. */
export function laplacianVariance(px: Pixels, rect: Rect): number | null {
  const { x0, y0, x1, y1 } = toPx(px, rect);
  if (x1 <= x0 || y1 <= y0) return null;
  const d = px.data;
  const W = px.width;
  let sum = 0,
    sum2 = 0,
    n = 0;
  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < x1; x++) {
      const i = (y * W + x) * 4;
      const v = 4 * lumAt(d, i) - lumAt(d, i - 4) - lumAt(d, i + 4) - lumAt(d, i - W * 4) - lumAt(d, i + W * 4);
      sum += v;
      sum2 += v * v;
      n++;
    }
  }
  const mean = sum / n;
  return sum2 / n - mean * mean;
}

const colorDist = (a: RegionStats, b: RegionStats) => Math.hypot(a.r - b.r, a.g - b.g, a.b - b.b);

function mergeStats(a: RegionStats | null, b: RegionStats | null): RegionStats | null {
  if (!a || !b) return a ?? b;
  const n = a.n + b.n;
  const w = (k: keyof RegionStats) => (a[k] * a.n + b[k] * b.n) / n;
  return { r: w("r"), g: w("g"), b: w("b"), lum: w("lum"), edges: w("edges"), highlights: w("highlights"), n };
}

/** Pasa landmarks del cuadro completo a coordenadas del encuadre (0 a 1). */
export function toCropSpace(pts: Point[], frame: { w: number; h: number }, crop: Rect): Point[] {
  return pts.map((p) => ({ x: (p.x * frame.w - crop.x) / crop.w, y: (p.y * frame.h - crop.y) / crop.h }));
}

/** Encuadre vertical centrado (por ejemplo 3:4) dentro de un cuadro de w × h. */
export function centeredCrop(w: number, h: number, aspect: number): Rect {
  if (w / h > aspect) {
    const cw = h * aspect;
    return { x: (w - cw) / 2, y: 0, w: cw, h };
  }
  const ch = w / aspect;
  return { x: 0, y: (h - ch) / 2, w, h: ch };
}

/**
 * Encuadre 3:4 alrededor del rostro para archivos subidos. Si no cabe dentro de la imagen
 * se recorta al borde, y las reglas de R3 lo detectan como rostro descentrado o muy grande.
 */
export function faceCrop(pts: Point[], w: number, h: number, cfg: FaceConfig = FACE_CONFIG): Rect {
  const box = bbox(pts);
  let ch = (box.h * h) / cfg.uploadFaceFill;
  let cw = ch * cfg.aspect;
  if (cw > w) {
    cw = w;
    ch = cw / cfg.aspect;
  }
  if (ch > h) {
    ch = h;
    cw = ch * cfg.aspect;
  }
  const cx = (box.x + box.w / 2) * w;
  const cy = (box.y + box.h / 2) * h;
  return { x: clamp(cx - cw / 2, 0, w - cw), y: clamp(cy - ch / 2, 0, h - ch), w: cw, h: ch };
}

const score = (bs: Blendshape[] | null, name: string) => bs?.find((b) => b.categoryName === name)?.score ?? null;

/** Calcula las métricas de un cuadro. Devuelve también los landmarks para el siguiente. */
export function computeMetrics(input: FrameInput, cfg: FaceConfig = FACE_CONFIG): { metrics: Metrics; points: Point[] | null } {
  const faces = input.faces.length;
  if (faces !== 1) return { metrics: { ...EMPTY_METRICS, faces }, points: null };

  const pts = toCropSpace(input.faces[0]!, input.frame, input.crop);
  const p = (i: number) => pts[i]!;
  const box = bbox(pts);
  const center = { x: box.x + box.w / 2, y: box.y + box.h / 2 };

  // Orientación: magnitud de la matriz, sentido del giro por geometría.
  const sign = yawSignFromLandmarks(pts);
  let yaw: number, pitch: number | null, roll: number | null;
  if (input.matrix && input.matrix.length === 16) {
    const e = eulerFromMatrix(input.matrix);
    yaw = Math.abs(e.yaw) * (Math.sign(sign) || Math.sign(e.yaw) || 1);
    pitch = e.pitch;
    roll = e.roll;
  } else {
    yaw = Math.asin(clamp(sign, -1, 1)) * DEG;
    pitch = null;
    roll = null;
  }

  // Píxeles: rostro (80 % interior para no medir el fondo), mitades, regiones.
  const inner: Rect = { x: box.x + box.w * 0.1, y: box.y + box.h * 0.05, w: box.w * 0.8, h: box.h * 0.9 };
  const T = cfg.edgeThreshold;
  const face = regionStats(input.pixels, inner, T);
  const left = regionStats(input.pixels, { ...inner, w: inner.w / 2 }, T);
  const right = regionStats(input.pixels, { ...inner, x: inner.x + inner.w / 2, w: inner.w / 2 }, T);
  const sharpness = laplacianVariance(input.pixels, inner);

  const fw = box.w;
  const fh = box.h;
  const bridge = regionStats(input.pixels, around(p(LM.bridge), fw * 0.06, fh * 0.04), T);
  const eyes = regionStats(
    input.pixels,
    {
      x: Math.min(p(LM.eyeOuterA).x, p(LM.eyeOuterB).x),
      y: Math.min(p(LM.lidUpperA).y, p(LM.lidUpperB).y) - fh * 0.05,
      w: Math.abs(p(LM.eyeOuterB).x - p(LM.eyeOuterA).x),
      h: Math.max(p(LM.lidLowerA).y, p(LM.lidLowerB).y) - Math.min(p(LM.lidUpperA).y, p(LM.lidUpperB).y) + fh * 0.1,
    },
    T,
  );
  const top = p(LM.forehead).y;
  const brow = Math.min(p(LM.browA).y, p(LM.browB).y);
  const forehead = regionStats(
    input.pixels,
    {
      x: Math.min(p(LM.foreheadA).x, p(LM.foreheadB).x),
      y: top + (brow - top) * 0.3,
      w: Math.abs(p(LM.foreheadB).x - p(LM.foreheadA).x),
      h: (brow - top) * 0.5,
    },
    T,
  );
  const cheeks = mergeStats(
    regionStats(input.pixels, around(p(LM.cheekA), fw * 0.06, fw * 0.06), T),
    regionStats(input.pixels, around(p(LM.cheekB), fw * 0.06, fw * 0.06), T),
  );
  const mouth = regionStats(
    input.pixels,
    {
      x: Math.min(p(LM.mouthA).x, p(LM.mouthB).x),
      y: p(LM.upperLip).y,
      w: Math.abs(p(LM.mouthB).x - p(LM.mouthA).x),
      h: p(LM.chin).y - p(LM.upperLip).y,
    },
    T,
  );

  let motion: number | null = null;
  if (input.prev && input.prev.length === pts.length && fh > 0) {
    let sum = 0;
    for (const i of MOTION_POINTS) sum += Math.hypot(pts[i]!.x - input.prev[i]!.x, pts[i]!.y - input.prev[i]!.y);
    motion = sum / MOTION_POINTS.length / fh;
  }

  const bs = input.blendshapes;
  const metrics: Metrics = {
    faces,
    yaw,
    pitch,
    roll,
    centerOffset: Math.hypot(center.x - cfg.ovalCenter.x, center.y - cfg.ovalCenter.y),
    faceHeight: fh,
    eyeBlinkLeft: score(bs, "eyeBlinkLeft"),
    eyeBlinkRight: score(bs, "eyeBlinkRight"),
    smile: (() => {
      const a = score(bs, "mouthSmileLeft");
      const b = score(bs, "mouthSmileRight");
      return a === null || b === null ? null : Math.max(a, b);
    })(),
    jawOpen: score(bs, "jawOpen"),
    browInnerUp: score(bs, "browInnerUp"),
    luminance: face?.lum ?? null,
    luminanceAsymmetry: left && right ? Math.abs(left.lum - right.lum) / Math.max(left.lum, right.lum, 1) : null,
    sharpness,
    motion,
    glassesBridgeEdges: bridge?.edges ?? null,
    glassesHighlights: eyes?.highlights ?? null,
    foreheadColorDist: forehead && cheeks ? colorDist(forehead, cheeks) : null,
    mouthColorDist: mouth && cheeks ? colorDist(mouth, cheeks) : null,
    mouthTexture: mouth?.edges ?? null,
    cropHeightPx: input.cropHeightPx ?? null,
  };
  return { metrics, points: pts };
}

/**
 * Media móvil de los últimos cuadros. Si el cuadro más reciente no tiene un solo rostro,
 * se devuelve tal cual: no se mezclan rostros viejos con un cuadro vacío.
 */
export function smoothMetrics(history: Metrics[]): Metrics {
  const last = history[history.length - 1];
  if (!last) return EMPTY_METRICS;
  if (last.faces !== 1) return last;
  const usable = history.filter((m) => m.faces === 1);
  const out: Metrics = { ...last };
  for (const k of Object.keys(last) as (keyof Metrics)[]) {
    if (k === "faces") continue;
    const vals = usable.map((m) => m[k]).filter((v): v is number => typeof v === "number");
    (out[k] as number | null) = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
  }
  return out;
}
