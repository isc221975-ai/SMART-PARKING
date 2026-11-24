import { describe, expect, it } from "vitest";
import { FACE_CONFIG as C } from "./config";
import { createLiveness, livenessDone, retoActual, stepLiveness, type LivenessInput, type LivenessState } from "./liveness";

const L = C.liveness;
const ok = (patch: Partial<LivenessInput> = {}): LivenessInput => ({ blink: 0.05, yaw: 0, encuadreOk: true, ...patch });
/** rand fijo: 0.1 → giro a la izquierda y parpadeo primero. */
const seq = (...vals: number[]) => {
  let i = 0;
  return () => vals[i++ % vals.length]!;
};

function hacerReto(s: LivenessState, t: number): [LivenessState, number] {
  const reto = retoActual(s)!;
  if (reto === "parpadear") {
    s = stepLiveness(s, ok({ blink: L.blinkClosed + 0.2 }), t++);
    s = stepLiveness(s, ok({ blink: L.blinkOpen - 0.1 }), t++);
  } else {
    const dir = reto === "girar_izquierda" ? 1 : -1;
    s = stepLiveness(s, ok({ yaw: dir * (L.turnYawDeg + 5) }), t++);
    s = stepLiveness(s, ok({ yaw: 0 }), t++);
  }
  return [s, t];
}

describe("prueba de vida", () => {
  it("el orden y el lado son aleatorios", () => {
    expect(createLiveness(0, seq(0.1, 0.1)).retos).toEqual(["parpadear", "girar_izquierda"]);
    expect(createLiveness(0, seq(0.9, 0.9)).retos).toEqual(["girar_derecha", "parpadear"]);
  });

  it("se completa con parpadeo y giro en cualquier orden", () => {
    for (const rand of [seq(0.1, 0.1), seq(0.9, 0.9), seq(0.1, 0.9), seq(0.9, 0.1)]) {
      let s = createLiveness(0, rand);
      let t = 1;
      [s, t] = hacerReto(s, t);
      expect(s.indice).toBe(1);
      [s, t] = hacerReto(s, t);
      expect(livenessDone(s)).toBe(true);
    }
  });

  it("parpadear requiere cerrar (> 0.5) y luego abrir (< 0.2)", () => {
    let s = createLiveness(0, seq(0.1, 0.1));
    s = stepLiveness(s, ok({ blink: 0.4 }), 1);
    expect(s.mitad).toBe(false);
    s = stepLiveness(s, ok({ blink: 0.6 }), 2);
    expect(s.mitad).toBe(true);
    s = stepLiveness(s, ok({ blink: 0.3 }), 3);
    expect(s.indice).toBe(0);
    s = stepLiveness(s, ok({ blink: 0.1 }), 4);
    expect(s.indice).toBe(1);
  });

  it("girar hacia el lado contrario no cuenta", () => {
    let s = createLiveness(0, seq(0.9, 0.9)); // girar a la derecha (yaw < 0) primero
    expect(retoActual(s)).toBe("girar_derecha");
    s = stepLiveness(s, ok({ yaw: 25 }), 1);
    expect(s.mitad).toBe(false);
    s = stepLiveness(s, ok({ yaw: -25 }), 2);
    expect(s.mitad).toBe(true);
    s = stepLiveness(s, ok({ yaw: -10 }), 3);
    expect(s.indice).toBe(0);
    s = stepLiveness(s, ok({ yaw: -4 }), 4);
    expect(s.indice).toBe(1);
  });

  it("los cuadros sin encuadre (R1 o R3) no cuentan", () => {
    let s = createLiveness(0, seq(0.1, 0.1));
    s = stepLiveness(s, ok({ blink: 0.9, encuadreOk: false }), 1);
    expect(s.mitad).toBe(false);
  });

  it("al vencer el tiempo se reinicia con otro orden y cuenta el intento", () => {
    let s = createLiveness(0, seq(0.1, 0.1));
    s = stepLiveness(s, ok({ blink: 0.9 }), 10);
    expect(s.mitad).toBe(true);
    s = stepLiveness(s, ok(), L.challengeMs + 11, seq(0.9, 0.9));
    expect(s.intentos).toBe(1);
    expect(s.indice).toBe(0);
    expect(s.mitad).toBe(false);
    expect(s.retos).toEqual(["girar_derecha", "parpadear"]);
  });

  it("una foto fija (sin parpadeo ni giro) nunca pasa", () => {
    let s = createLiveness(0, seq(0.1, 0.1));
    for (let t = 1; t < L.challengeMs * 3; t += 66) s = stepLiveness(s, ok(), t, seq(0.3, 0.6));
    expect(livenessDone(s)).toBe(false);
    expect(s.intentos).toBeGreaterThan(0);
  });
});
