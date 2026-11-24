import { describe, expect, it } from "vitest";
import { centeredCrop, eulerFromMatrix, faceCrop, smoothMetrics, yawSignFromLandmarks, EMPTY_METRICS } from "./metrics";
import type { Metrics } from "./types";

/** Matriz de rotación en Y (yaw) en orden por columnas. */
function rotY(deg: number): number[] {
  const a = (deg * Math.PI) / 180;
  const c = Math.cos(a);
  const s = Math.sin(a);
  return [c, 0, -s, 0, 0, 1, 0, 0, s, 0, c, 0, 0, 0, 0, 1];
}

describe("métricas geométricas", () => {
  it("la identidad es de frente", () => {
    const e = eulerFromMatrix([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]);
    expect(Math.abs(e.yaw)).toBeLessThan(1e-9);
    expect(Math.abs(e.pitch)).toBeLessThan(1e-9);
    expect(Math.abs(e.roll)).toBeLessThan(1e-9);
  });

  it("recupera el yaw de una rotación en Y", () => {
    expect(Math.abs(eulerFromMatrix(rotY(20)).yaw)).toBeCloseTo(20, 5);
  });

  it("el sentido del giro sale de la nariz respecto a los bordes del rostro", () => {
    const pts = Array.from({ length: 478 }, () => ({ x: 0.5, y: 0.5 }));
    pts[234] = { x: 0.3, y: 0.5 };
    pts[454] = { x: 0.7, y: 0.5 };
    pts[1] = { x: 0.6, y: 0.5 }; // nariz hacia x mayor = la persona gira a su izquierda
    expect(yawSignFromLandmarks(pts)).toBeGreaterThan(0);
    pts[1] = { x: 0.4, y: 0.5 };
    expect(yawSignFromLandmarks(pts)).toBeLessThan(0);
  });

  it("el encuadre 3:4 centrado cabe en un cuadro horizontal y en uno vertical", () => {
    expect(centeredCrop(1280, 720, 3 / 4)).toEqual({ x: 370, y: 0, w: 540, h: 720 });
    expect(centeredCrop(720, 1280, 3 / 4)).toEqual({ x: 0, y: 160, w: 720, h: 960 });
  });

  it("el recorte de archivos se arma alrededor del rostro y no sale de la imagen", () => {
    const pts = [
      { x: 0.4, y: 0.3 },
      { x: 0.6, y: 0.6 },
    ];
    const r = faceCrop(pts, 1000, 1000);
    expect(r.x).toBeGreaterThanOrEqual(0);
    expect(r.y).toBeGreaterThanOrEqual(0);
    expect(r.x + r.w).toBeLessThanOrEqual(1000);
    expect(r.y + r.h).toBeLessThanOrEqual(1000);
    expect(r.w / r.h).toBeCloseTo(3 / 4, 5);
  });
});

describe("media móvil", () => {
  const m = (lum: number): Metrics => ({ ...EMPTY_METRICS, faces: 1, luminance: lum });
  it("promedia los últimos cuadros con un rostro", () => {
    expect(smoothMetrics([m(100), m(120), m(140)]).luminance).toBe(120);
  });
  it("un cuadro sin rostro no se mezcla con los anteriores", () => {
    const s = smoothMetrics([m(100), m(120), { ...EMPTY_METRICS, faces: 0 }]);
    expect(s.faces).toBe(0);
    expect(s.luminance).toBeNull();
  });
});
