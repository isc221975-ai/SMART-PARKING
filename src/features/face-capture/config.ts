/**
 * Umbrales de la captura facial, todos en un solo lugar.
 * Para calibrar con personas reales abre /cliente/perfil/foto?debug=1: muestra cada métrica en vivo.
 */
export const FACE_CONFIG = {
  /** Archivos servidos desde /public (scripts/fetch-mediapipe.mjs). Nada viene de un CDN. */
  wasmPath: "/mediapipe/wasm",
  modelPath: "/mediapipe/face_landmarker.task",

  /** Detección: ~15 cuadros por segundo y análisis de píxeles en un lienzo de 320 px de ancho. */
  detectFps: 15,
  analysisWidth: 320,
  /** Media móvil de métricas para que los mensajes no parpadeen. */
  smoothingFrames: 5,

  /** Encuadre de la foto final: vertical 3:4 (el servidor la deja en 600 × 800). */
  aspect: 3 / 4,
  /** Centro del óvalo guía, en fracción del encuadre visible. */
  ovalCenter: { x: 0.5, y: 0.5 },

  // R2 De frente: yaw, pitch y roll (grados) de la matriz de transformación.
  maxAngleDeg: 12,

  // R3 Centrado y tamaño.
  /** Distancia máxima del centro del rostro al centro del óvalo, en fracción del encuadre. */
  centerTolerance: 0.12,
  faceHeightMin: 0.4,
  faceHeightMax: 0.7,

  // R4 Ojos abiertos (blendshapes eyeBlinkLeft / eyeBlinkRight).
  eyeBlinkMax: 0.35,

  // R5 Lentes (heurística, solo advierte).
  /** Fracción de píxeles con borde fuerte en el puente nasal; la piel lisa casi no tiene. */
  glassesBridgeEdgeMax: 0.12,
  /** Fracción de píxeles casi blancos (reflejos) en la región de los ojos. */
  glassesHighlightMax: 0.035,
  /** Gradiente (0 a 255) a partir del cual un píxel cuenta como borde. */
  edgeThreshold: 40,

  // R6 Gorra o prenda (heurística, solo advierte).
  /** Diferencia de color (distancia RGB) entre la frente y las mejillas. */
  headwearColorDistMax: 45,

  // R7 Cubrebocas (heurística, solo advierte).
  /**
   * Diferencia de color entre boca/mentón y mejillas. Calibración: una sonrisa con dientes ya da ~61,
   * y un cubrebocas azul, blanco o negro queda muy por encima de 75.
   */
  maskColorDistMax: 75,
  /** Textura (fracción de bordes) mínima en boca/mentón: un cubrebocas es liso. */
  maskTextureMin: 0.02,

  // R8 Expresión neutral (blendshapes).
  smileMax: 0.35,
  jawOpenMax: 0.25,
  browInnerUpMax: 0.4,

  // R9 Buena luz: luminancia media del rostro (0 a 255) y diferencia entre mitades.
  luminanceMin: 70,
  luminanceMax: 200,
  luminanceAsymmetryMax: 0.25,

  // R10 Nítida y quieta.
  /**
   * Varianza del Laplaciano del rostro en el lienzo de análisis. Calibración con la foto de prueba
   * de MediaPipe (rostro de ~235 px): nítida 1831, desenfoque σ 1.2 → 44, σ 1.6 → 29, σ 2 → 14.
   * 35 rechaza a partir de σ ≈ 1.4 (borrosa a simple vista).
   */
  sharpnessMin: 35,
  /** Desplazamiento medio de landmarks entre cuadros, en fracción del alto del rostro. */
  motionMax: 0.02,
  /**
   * Solo archivos: alto mínimo, en píxeles, del recorte 3:4 (rostro ≈ 55 % de ese alto).
   * 400 deja pasar una foto normal de 820 × 1024 y rechaza capturas diminutas.
   */
  uploadMinCropHeight: 400,

  // R11 Prueba de vida.
  liveness: {
    blinkClosed: 0.5,
    blinkOpen: 0.2,
    turnYawDeg: 15,
    returnYawDeg: 8,
    challengeMs: 8000,
  },

  /** Tiempo en verde antes de la cuenta regresiva, y duración de la cuenta (3-2-1). */
  holdMs: 600,
  countdownSec: 3,

  /** Recorte de archivos subidos: el rostro ocupa esta fracción del alto. */
  uploadFaceFill: 0.55,
  /** Calidad del JPEG que sale del navegador (el servidor lo vuelve a codificar). */
  clientJpegQuality: 0.92,
  clientMaxHeight: 1600,
} as const;

export type FaceConfig = typeof FACE_CONFIG;
