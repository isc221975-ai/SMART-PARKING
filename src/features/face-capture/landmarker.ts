/**
 * Carga de FaceLandmarker con import() dinámico: MediaPipe solo se descarga en la pantalla
 * de la foto. Modelo y WASM salen de /public/mediapipe (nunca de un CDN).
 */
import type { FaceLandmarker, FaceLandmarkerResult } from "@mediapipe/tasks-vision";
import { FACE_CONFIG } from "./config";
import type { Blendshape, Point } from "./metrics";

export type RunningMode = "VIDEO" | "IMAGE";

export async function createLandmarker(runningMode: RunningMode): Promise<FaceLandmarker> {
  const { FaceLandmarker, FilesetResolver } = await import("@mediapipe/tasks-vision");
  const fileset = await FilesetResolver.forVisionTasks(FACE_CONFIG.wasmPath);
  const options = (delegate: "GPU" | "CPU") => ({
    baseOptions: { modelAssetPath: FACE_CONFIG.modelPath, delegate },
    runningMode,
    numFaces: 2, // para saber si hay más de una persona
    outputFaceBlendshapes: true,
    outputFacialTransformationMatrixes: true,
  });
  try {
    return await FaceLandmarker.createFromOptions(fileset, options("GPU"));
  } catch {
    // Sin WebGL2 o con GPU bloqueada: el CPU es más lento pero funciona igual.
    return FaceLandmarker.createFromOptions(fileset, options("CPU"));
  }
}

/** Lo que las métricas necesitan del resultado de MediaPipe. */
export function readResult(r: FaceLandmarkerResult): { faces: Point[][]; blendshapes: Blendshape[] | null; matrix: number[] | null } {
  return {
    faces: r.faceLandmarks.map((f) => f.map(({ x, y }) => ({ x, y }))),
    blendshapes: r.faceBlendshapes[0]?.categories.map(({ categoryName, score }) => ({ categoryName, score })) ?? null,
    matrix: r.facialTransformationMatrixes[0]?.data ? Array.from(r.facialTransformationMatrixes[0].data) : null,
  };
}
