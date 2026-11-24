"use client";

/**
 * Cámara, bucle de detección (~15 fps), estabilidad y captura.
 * Fases: encuadre → prueba de vida → listo (600 ms en verde) → cuenta 3-2-1 → captura.
 * Al desmontar detiene la cámara, cancela el bucle y cierra el landmarker.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import type { FaceLandmarker } from "@mediapipe/tasks-vision";
import { FACE_CONFIG as C } from "./config";
import { createLandmarker, readResult } from "./landmarker";
import { createLiveness, instruccionReto, livenessDone, retoActual, stepLiveness, tiempoRestante, type LivenessState, type Reto } from "./liveness";
import { centeredCrop, computeMetrics, EMPTY_METRICS, smoothMetrics, type Point } from "./metrics";
import { allBlockingOk, EXCEPCION_DESACTIVA, evaluateRules, framingOk, primaryInstruction, toFotoChecks } from "./rules";
import type { Excepcion, FotoChecks, Metrics, RuleResult } from "./types";

export type CameraStatus = "idle" | "loading" | "running" | "denied" | "nocamera" | "busy" | "unsupported" | "error";
export type Fase = "encuadre" | "vida" | "listo" | "cuenta";

export interface Captura {
  blob: Blob;
  checks: FotoChecks;
}

export interface FaceCaptureView {
  status: CameraStatus;
  fase: Fase;
  results: RuleResult[];
  instruccion: string | null;
  metrics: Metrics;
  reto: Reto | null;
  retoRestante: number;
  intentos: number;
  /** 3, 2, 1 durante la cuenta regresiva. */
  cuenta: number | null;
  /** Todas las reglas que bloquean en verde: habilita el botón manual. */
  listo: boolean;
}

const INITIAL: FaceCaptureView = {
  status: "idle",
  fase: "encuadre",
  results: [],
  instruccion: null,
  metrics: EMPTY_METRICS,
  reto: null,
  retoRestante: 0,
  intentos: 0,
  cuenta: null,
  listo: false,
};

/** Cuadros seguidos sin un solo rostro antes de reiniciar la prueba de vida (~0.7 s). */
const LOST_FRAMES = 10;

function cameraError(e: unknown): CameraStatus {
  const name = e instanceof DOMException ? e.name : "";
  if (name === "NotAllowedError" || name === "SecurityError") return "denied";
  if (name === "NotFoundError" || name === "OverconstrainedError" || name === "DevicesNotFoundError") return "nocamera";
  if (name === "NotReadableError" || name === "AbortError") return "busy";
  return "error";
}

export function useFaceCapture({ excepcion, onCapture }: { excepcion: Excepcion | null; onCapture: (c: Captura) => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [view, setView] = useState<FaceCaptureView>(INITIAL);

  const mounted = useRef(false);
  const stream = useRef<MediaStream | null>(null);
  const landmarker = useRef<FaceLandmarker | null>(null);
  const loop = useRef<{ vfc?: number; raf?: number }>({});
  const running = useRef(false);
  const canvas = useRef<HTMLCanvasElement | null>(null);

  // Estado del bucle (no provoca renders).
  const lastTs = useRef(0);
  const lastDetect = useRef(0);
  const history = useRef<Metrics[]>([]);
  const prevPts = useRef<Point[] | null>(null);
  const liveness = useRef<LivenessState | null>(null);
  const fase = useRef<Fase>("encuadre");
  const holdStart = useRef<number | null>(null);
  const countStart = useRef<number | null>(null);
  const lost = useRef(0);
  const lastResults = useRef<RuleResult[]>([]);

  const excepcionRef = useRef(excepcion);
  const onCaptureRef = useRef(onCapture);
  useEffect(() => {
    excepcionRef.current = excepcion;
    onCaptureRef.current = onCapture;
  });

  const cancelLoop = useCallback(() => {
    running.current = false;
    const v = videoRef.current;
    if (loop.current.vfc !== undefined && v && "cancelVideoFrameCallback" in v) v.cancelVideoFrameCallback(loop.current.vfc);
    if (loop.current.raf !== undefined) cancelAnimationFrame(loop.current.raf);
    loop.current = {};
  }, []);

  const stopCamera = useCallback(() => {
    cancelLoop();
    stream.current?.getTracks().forEach((t) => t.stop());
    stream.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
  }, [cancelLoop]);

  const resetLoopState = () => {
    lastDetect.current = 0;
    history.current = [];
    prevPts.current = null;
    liveness.current = null;
    fase.current = "encuadre";
    holdStart.current = null;
    countStart.current = null;
    lost.current = 0;
  };

  /** Toma la foto del encuadre a resolución completa (sin espejo). */
  const grab = useCallback(async (): Promise<Blob | null> => {
    const v = videoRef.current;
    if (!v || !v.videoWidth) return null;
    const crop = centeredCrop(v.videoWidth, v.videoHeight, C.aspect);
    const out = document.createElement("canvas");
    out.width = Math.round(crop.w);
    out.height = Math.round(crop.h);
    out.getContext("2d")!.drawImage(v, crop.x, crop.y, crop.w, crop.h, 0, 0, out.width, out.height);
    return new Promise((resolve) => out.toBlob(resolve, "image/jpeg", C.clientJpegQuality));
  }, []);

  const finishCapture = useCallback(async () => {
    const results = lastResults.current;
    cancelLoop();
    const blob = await grab();
    stopCamera();
    if (!mounted.current) return;
    setView((s) => ({ ...s, status: "idle", cuenta: null }));
    if (blob) onCaptureRef.current({ blob, checks: toFotoChecks(results) });
  }, [cancelLoop, grab, stopCamera]);

  const processFrame = useCallback(
    (now: number) => {
      const v = videoRef.current;
      const lm = landmarker.current;
      if (!v || !lm || v.readyState < 2 || !v.videoWidth) return;
      const W = v.videoWidth;
      const H = v.videoHeight;
      const crop = centeredCrop(W, H, C.aspect);

      if (!canvas.current) canvas.current = document.createElement("canvas");
      const cv = canvas.current;
      cv.width = C.analysisWidth;
      cv.height = Math.round(C.analysisWidth / C.aspect);
      const ctx = cv.getContext("2d", { willReadFrequently: true })!;
      ctx.drawImage(v, crop.x, crop.y, crop.w, crop.h, 0, 0, cv.width, cv.height);
      const pixels = ctx.getImageData(0, 0, cv.width, cv.height);

      // detectForVideo exige timestamps estrictamente crecientes.
      let ts = performance.now();
      if (ts <= lastTs.current) ts = lastTs.current + 1;
      lastTs.current = ts;
      const detected = readResult(lm.detectForVideo(v, ts));

      const { metrics: raw, points } = computeMetrics({ ...detected, frame: { w: W, h: H }, crop, pixels, prev: prevPts.current });
      prevPts.current = points;
      history.current.push(raw);
      if (history.current.length > C.smoothingFrames) history.current.shift();
      const sm = smoothMetrics(history.current);

      const exc = excepcionRef.current;
      const sinVida = Boolean(exc && EXCEPCION_DESACTIVA[exc].includes("R11"));
      lost.current = raw.faces === 1 ? 0 : lost.current + 1;
      // Si el rostro sale del cuadro, la prueba de vida se repite: evita cambiarlo por una foto.
      if (lost.current > LOST_FRAMES && fase.current !== "encuadre") {
        fase.current = "encuadre";
        liveness.current = null;
        holdStart.current = null;
        countStart.current = null;
      }

      const vidaOk = () => sinVida || (liveness.current !== null && livenessDone(liveness.current));
      let results = evaluateRules(sm, { modo: "camara", excepcion: exc, livenessOk: vidaOk() });

      if (fase.current === "encuadre" && framingOk(results)) {
        if (vidaOk()) fase.current = "listo";
        else {
          liveness.current = createLiveness(now);
          fase.current = "vida";
        }
      }

      if (fase.current === "vida" && liveness.current) {
        // La prueba de vida usa el cuadro crudo: un parpadeo dura menos que la media móvil.
        const rawRes = evaluateRules(raw, { modo: "camara", excepcion: exc, livenessOk: false });
        const encuadreOk = rawRes[0]!.ok && rawRes[2]!.ok; // R1 y R3
        const blink = raw.eyeBlinkLeft !== null && raw.eyeBlinkRight !== null ? (raw.eyeBlinkLeft + raw.eyeBlinkRight) / 2 : null;
        liveness.current = stepLiveness(liveness.current, { blink, yaw: raw.yaw, encuadreOk }, now);
        if (livenessDone(liveness.current)) {
          fase.current = "listo";
          results = evaluateRules(sm, { modo: "camara", excepcion: exc, livenessOk: true });
        }
      }

      const ready = allBlockingOk(results);
      if (fase.current === "listo") {
        if (!ready) holdStart.current = null;
        else {
          holdStart.current ??= now;
          if (now - holdStart.current >= C.holdMs) {
            fase.current = "cuenta";
            countStart.current = now;
          }
        }
      } else if (fase.current === "cuenta") {
        if (!ready) {
          fase.current = "listo";
          holdStart.current = null;
          countStart.current = null;
        } else if (now - countStart.current! >= C.countdownSec * 1000) {
          lastResults.current = results;
          void finishCapture();
          return;
        }
      }
      lastResults.current = results;

      const lv = liveness.current;
      const reto = fase.current === "vida" && lv ? retoActual(lv) : null;
      const encuadre = primaryInstruction(results);
      let instruccion: string | null;
      if (fase.current === "vida" && reto && lv) {
        const r1r3 = results[0]!.ok && results[2]!.ok;
        instruccion = r1r3 ? instruccionReto(reto, lv.mitad) : (results[0]!.ok ? results[2]! : results[0]!).mensaje;
      } else if (fase.current === "cuenta") instruccion = "No te muevas.";
      else instruccion = encuadre?.mensaje ?? (ready ? "Quédate así." : null);

      setView({
        status: "running",
        fase: fase.current,
        results,
        instruccion,
        metrics: sm,
        reto,
        retoRestante: lv && reto ? tiempoRestante(lv, now) : 0,
        intentos: lv?.intentos ?? 0,
        cuenta: fase.current === "cuenta" && countStart.current !== null ? Math.max(1, C.countdownSec - Math.floor((now - countStart.current) / 1000)) : null,
        listo: ready,
      });
    },
    [finishCapture],
  );

  /** Bucle: requestVideoFrameCallback (o rAF) limitado a ~15 detecciones por segundo. */
  const schedule = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    function next() {
      if (!running.current || !v) return;
      if ("requestVideoFrameCallback" in v) loop.current.vfc = v.requestVideoFrameCallback((now) => tick(now));
      else loop.current.raf = requestAnimationFrame(tick);
    }
    function tick(now: number) {
      if (!running.current) return;
      if (now - lastDetect.current >= 1000 / C.detectFps) {
        lastDetect.current = now;
        try {
          processFrame(now);
        } catch {
          // Un cuadro fallido (por ejemplo, mientras cambia la resolución) no detiene el bucle.
        }
      }
      next();
    }
    next();
  }, [processFrame]);

  const start = useCallback(async () => {
    if (typeof window === "undefined" || !navigator.mediaDevices?.getUserMedia || typeof WebAssembly === "undefined") {
      setView({ ...INITIAL, status: "unsupported" });
      return;
    }
    setView({ ...INITIAL, status: "loading" });
    resetLoopState();

    let media: MediaStream;
    try {
      media = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
    } catch (e) {
      if (mounted.current) setView({ ...INITIAL, status: cameraError(e) });
      return;
    }
    if (!mounted.current) {
      media.getTracks().forEach((t) => t.stop());
      return;
    }
    stream.current = media;

    try {
      landmarker.current ??= await createLandmarker("VIDEO");
    } catch {
      stopCamera();
      if (mounted.current) setView({ ...INITIAL, status: "error" });
      return;
    }
    const v = videoRef.current;
    if (!mounted.current || !v || stream.current !== media) return;
    v.srcObject = media;
    try {
      await v.play();
    } catch {
      // autoPlay + muted + playsInline: si play() falla, el video arranca solo al cargar.
    }
    running.current = true;
    setView((s) => ({ ...s, status: "running" }));
    schedule();
  }, [schedule, stopCamera]);

  /** Botón manual: solo funciona si todas las reglas que bloquean están en verde. */
  const captureNow = useCallback(() => {
    if (!allBlockingOk(lastResults.current)) return;
    void finishCapture();
  }, [finishCapture]);

  const stop = useCallback(() => {
    stopCamera();
    setView(INITIAL);
  }, [stopCamera]);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      stopCamera();
      landmarker.current?.close();
      landmarker.current = null;
    };
  }, [stopCamera]);

  // Si la pestaña se oculta, se apaga la cámara (privacidad y batería).
  useEffect(() => {
    const onHide = () => {
      if (document.hidden && stream.current) {
        stopCamera();
        setView(INITIAL);
      }
    };
    document.addEventListener("visibilitychange", onHide);
    return () => document.removeEventListener("visibilitychange", onHide);
  }, [stopCamera]);

  return { videoRef, view, start, stop, captureNow };
}
