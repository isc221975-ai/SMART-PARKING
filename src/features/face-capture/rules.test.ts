import { describe, expect, it } from "vitest";
import { FACE_CONFIG as C } from "./config";
import { EMPTY_METRICS } from "./metrics";
import { allBlockingOk, evaluateRules, framingOk, primaryInstruction, toFotoChecks, type RuleOptions } from "./rules";
import type { Metrics, RuleId } from "./types";

/** Métricas de una foto que cumple todo. */
const GOOD: Metrics = {
  faces: 1,
  yaw: 2,
  pitch: -3,
  roll: 1,
  centerOffset: 0.03,
  faceHeight: 0.55,
  eyeBlinkLeft: 0.05,
  eyeBlinkRight: 0.06,
  smile: 0.05,
  jawOpen: 0.02,
  browInnerUp: 0.1,
  luminance: 130,
  luminanceAsymmetry: 0.05,
  sharpness: C.sharpnessMin * 3,
  motion: 0.002,
  glassesBridgeEdges: 0.02,
  glassesHighlights: 0.005,
  foreheadColorDist: 12,
  mouthColorDist: 20,
  mouthTexture: 0.08,
  cropHeightPx: null,
};

const cam: RuleOptions = { modo: "camara", excepcion: null, livenessOk: true };
const rule = (m: Metrics, id: RuleId, opts = cam) => evaluateRules(m, opts).find((r) => r.regla === id)!;

describe("reglas con una foto correcta", () => {
  it("todas pasan y no hay instrucción", () => {
    const res = evaluateRules(GOOD, cam);
    expect(res.every((r) => r.estado === "ok")).toBe(true);
    expect(allBlockingOk(res)).toBe(true);
    expect(primaryInstruction(res)).toBeNull();
  });
});

describe("cada regla que bloquea falla con su caso", () => {
  const casos: [RuleId, Partial<Metrics>][] = [
    ["R2", { yaw: C.maxAngleDeg + 1 }],
    ["R2", { pitch: -(C.maxAngleDeg + 1) }],
    ["R2", { roll: C.maxAngleDeg + 5 }],
    ["R3", { faceHeight: C.faceHeightMin - 0.05 }],
    ["R3", { faceHeight: C.faceHeightMax + 0.05 }],
    ["R3", { centerOffset: C.centerTolerance + 0.02 }],
    ["R4", { eyeBlinkLeft: C.eyeBlinkMax + 0.1 }],
    ["R4", { eyeBlinkRight: 0.9 }],
    ["R8", { smile: C.smileMax + 0.1 }],
    ["R8", { jawOpen: C.jawOpenMax + 0.1 }],
    ["R8", { browInnerUp: C.browInnerUpMax + 0.1 }],
    ["R9", { luminance: C.luminanceMin - 10 }],
    ["R9", { luminance: C.luminanceMax + 10 }],
    ["R9", { luminanceAsymmetry: C.luminanceAsymmetryMax + 0.05 }],
    ["R10", { sharpness: C.sharpnessMin - 1 }],
    ["R10", { motion: C.motionMax * 2 }],
  ];
  it.each(casos)("%s falla con %o", (id, patch) => {
    const r = rule({ ...GOOD, ...patch }, id);
    expect(r.ok).toBe(false);
    expect(r.estado).toBe("falla");
    expect(r.mensaje.length).toBeGreaterThan(0);
  });

  it("R1 falla sin rostro y con dos rostros, con mensajes distintos", () => {
    const cero = rule({ ...EMPTY_METRICS, faces: 0 }, "R1");
    const dos = rule({ ...EMPTY_METRICS, faces: 2 }, "R1");
    expect(cero.ok).toBe(false);
    expect(dos.ok).toBe(false);
    expect(cero.mensaje).not.toBe(dos.mensaje);
  });

  it("R11 falla mientras no se complete la prueba de vida", () => {
    const res = evaluateRules(GOOD, { ...cam, livenessOk: false });
    expect(framingOk(res)).toBe(true);
    expect(allBlockingOk(res)).toBe(false);
  });

  it("R10 en archivos falla por poca resolución", () => {
    const r = rule({ ...GOOD, motion: null, cropHeightPx: C.uploadMinCropHeight - 1 }, "R10", { ...cam, modo: "archivo" });
    expect(r.ok).toBe(false);
  });
});

describe("heurísticas R5, R6 y R7 solo advierten", () => {
  const casos: [RuleId, Partial<Metrics>][] = [
    ["R5", { glassesBridgeEdges: C.glassesBridgeEdgeMax + 0.1 }],
    ["R5", { glassesHighlights: C.glassesHighlightMax + 0.05 }],
    ["R6", { foreheadColorDist: C.headwearColorDistMax + 10 }],
    ["R7", { mouthColorDist: C.maskColorDistMax + 10 }],
    ["R7", { mouthTexture: 0 }],
  ];
  it.each(casos)("%s advierte con %o sin bloquear", (id, patch) => {
    const res = evaluateRules({ ...GOOD, ...patch }, cam);
    const r = res.find((x) => x.regla === id)!;
    expect(r.estado).toBe("advertencia");
    expect(r.ok).toBe(true);
    expect(allBlockingOk(res)).toBe(true);
    expect(toFotoChecks(res)[id]).toBe("advertencia");
  });
});

describe("prioridad de la instrucción", () => {
  it("sigue el orden R1 → R3 → R2 → R9 → R4 → R8 → R10", () => {
    const m: Metrics = { ...GOOD, faceHeight: 0.2, yaw: 30, luminance: 20, eyeBlinkLeft: 0.9 };
    expect(primaryInstruction(evaluateRules(m, cam))?.regla).toBe("R3");
    expect(primaryInstruction(evaluateRules({ ...m, faceHeight: 0.55 }, cam))?.regla).toBe("R2");
    expect(primaryInstruction(evaluateRules({ ...m, faceHeight: 0.55, yaw: 0 }, cam))?.regla).toBe("R9");
    expect(primaryInstruction(evaluateRules({ ...m, faceHeight: 0.55, yaw: 0, luminance: 130 }, cam))?.regla).toBe("R4");
  });

  it("sin rostro, la instrucción es la de R1", () => {
    expect(primaryInstruction(evaluateRules({ ...EMPTY_METRICS, faces: 0 }, cam))?.regla).toBe("R1");
  });
});

describe("modo archivo y excepciones", () => {
  it("en archivos R11 queda como no_aplica", () => {
    const checks = toFotoChecks(evaluateRules({ ...GOOD, motion: null, cropHeightPx: 900 }, { modo: "archivo", excepcion: null, livenessOk: false }));
    expect(checks.R11).toBe("no_aplica");
    expect(checks.R1).toBe(true);
  });

  it("excepción médica desactiva ojos, lentes, cubrebocas y expresión", () => {
    const m = { ...GOOD, eyeBlinkLeft: 0.9, smile: 0.9, glassesBridgeEdges: 0.5 };
    const res = evaluateRules(m, { ...cam, excepcion: "medica" });
    const checks = toFotoChecks(res);
    expect(checks.R4).toBe("no_aplica");
    expect(checks.R5).toBe("no_aplica");
    expect(checks.R7).toBe("no_aplica");
    expect(checks.R8).toBe("no_aplica");
    expect(allBlockingOk(res)).toBe(true);
  });

  it("excepción religiosa solo desactiva R6", () => {
    const checks = toFotoChecks(evaluateRules({ ...GOOD, foreheadColorDist: 99 }, { ...cam, excepcion: "religiosa" }));
    expect(checks.R6).toBe("no_aplica");
    expect(checks.R5).toBe(true);
  });

  it("excepción por discapacidad desactiva la prueba de vida", () => {
    const res = evaluateRules({ ...GOOD, yaw: 40 }, { ...cam, excepcion: "discapacidad", livenessOk: false });
    expect(allBlockingOk(res)).toBe(true);
    expect(toFotoChecks(res).R11).toBe("no_aplica");
  });

  it("foto_checks solo lleva R1 a R11 con valores permitidos", () => {
    const checks = toFotoChecks(evaluateRules(GOOD, cam));
    expect(Object.keys(checks)).toEqual(["R1", "R2", "R3", "R4", "R5", "R6", "R7", "R8", "R9", "R10", "R11"]);
    for (const v of Object.values(checks)) expect([true, false, "advertencia", "no_aplica"]).toContain(v);
  });
});

describe("mensajes según el modo", () => {
  it("sin rostro en un archivo no habla del óvalo", () => {
    const r = evaluateRules({ ...EMPTY_METRICS, faces: 0 }, { modo: "archivo", excepcion: null, livenessOk: false })[0]!;
    expect(r.mensaje).toBe("No encontramos un rostro en la foto.");
  });
});
