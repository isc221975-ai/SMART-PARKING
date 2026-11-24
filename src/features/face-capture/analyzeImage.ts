"use client";

/**
 * Alternativa «Subir archivo»: corre R1 a R10 sobre la imagen fija.
 * R11 queda como "no_aplica" y el administrador lo ve marcado.
 */
import type { FaceLandmarker } from "@mediapipe/tasks-vision";
import { FACE_CONFIG as C } from "./config";
import { createLandmarker, readResult } from "./landmarker";
import { computeMetrics, EMPTY_METRICS, faceCrop } from "./metrics";
import { evaluateRules, toFotoChecks } from "./rules";
import type { Excepcion, FotoChecks, RuleResult } from "./types";

let imageLandmarker: Promise<FaceLandmarker> | null = null;

export interface ImageAnalysis {
  results: RuleResult[];
  checks: FotoChecks;
  /** Recorte 3:4 alrededor del rostro, listo para enviar (null si no hay un solo rostro). */
  blob: Blob | null;
}

export const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"];
export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024; // el navegador recorta y comprime antes de enviar (3 MB)

export async function analyzeImage(file: File, excepcion: Excepcion | null): Promise<ImageAnalysis> {
  imageLandmarker ??= createLandmarker("IMAGE").catch((e) => {
    imageLandmarker = null;
    throw e;
  });
  const lm = await imageLandmarker;
  // imageOrientation aplica la rotación EXIF de fotos tomadas con el celular.
  const bmp = await createImageBitmap(file, { imageOrientation: "from-image" });
  try {
    const detected = readResult(lm.detect(bmp));
    const opts = { modo: "archivo" as const, excepcion, livenessOk: false };
    if (detected.faces.length !== 1) {
      const results = evaluateRules({ ...EMPTY_METRICS, faces: detected.faces.length }, opts);
      return { results, checks: toFotoChecks(results), blob: null };
    }

    const W = bmp.width;
    const H = bmp.height;
    const crop = faceCrop(detected.faces[0]!, W, H);
    const cv = document.createElement("canvas");
    cv.width = C.analysisWidth;
    cv.height = Math.round(C.analysisWidth / C.aspect);
    const ctx = cv.getContext("2d", { willReadFrequently: true })!;
    ctx.drawImage(bmp, crop.x, crop.y, crop.w, crop.h, 0, 0, cv.width, cv.height);
    const { metrics } = computeMetrics({
      ...detected,
      frame: { w: W, h: H },
      crop,
      pixels: ctx.getImageData(0, 0, cv.width, cv.height),
      prev: null,
      cropHeightPx: Math.round(crop.h),
    });
    const results = evaluateRules(metrics, opts);

    const outH = Math.min(Math.round(crop.h), C.clientMaxHeight);
    const out = document.createElement("canvas");
    out.height = outH;
    out.width = Math.round(outH * C.aspect);
    out.getContext("2d")!.drawImage(bmp, crop.x, crop.y, crop.w, crop.h, 0, 0, out.width, out.height);
    const blob = await new Promise<Blob | null>((resolve) => out.toBlob(resolve, "image/jpeg", C.clientJpegQuality));
    return { results, checks: toFotoChecks(results), blob };
  } finally {
    bmp.close();
  }
}
