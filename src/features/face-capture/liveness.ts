/**
 * Prueba de vida (R11) como máquina de estados pura.
 * Dos retos en orden aleatorio: parpadear y girar la cabeza hacia un lado indicado al azar.
 * Cada reto tiene un tiempo límite; si se acaba, se reinicia con otro orden.
 * Un cuadro solo cuenta si hay un solo rostro centrado (R1 y R3).
 */
import { FACE_CONFIG, type FaceConfig } from "./config";

export type Reto = "parpadear" | "girar_izquierda" | "girar_derecha";

export interface LivenessState {
  retos: [Reto, Reto];
  /** Reto en curso (0 o 1); 2 = terminado. */
  indice: 0 | 1 | 2;
  /** Primera mitad del reto cumplida: ojos cerrados o cabeza girada. */
  mitad: boolean;
  inicioReto: number;
  intentos: number;
}

export interface LivenessInput {
  /** Promedio de eyeBlinkLeft y eyeBlinkRight. */
  blink: number | null;
  /** Grados; > 0 = la persona gira hacia SU izquierda. */
  yaw: number | null;
  /** R1 y R3 cumplidas en este cuadro. */
  encuadreOk: boolean;
}

export type Rand = () => number;

function nuevosRetos(rand: Rand): [Reto, Reto] {
  const giro: Reto = rand() < 0.5 ? "girar_izquierda" : "girar_derecha";
  return rand() < 0.5 ? ["parpadear", giro] : [giro, "parpadear"];
}

export function createLiveness(now: number, rand: Rand = Math.random, intentos = 0): LivenessState {
  return { retos: nuevosRetos(rand), indice: 0, mitad: false, inicioReto: now, intentos };
}

export const livenessDone = (s: LivenessState) => s.indice === 2;

export function retoActual(s: LivenessState): Reto | null {
  return s.indice === 2 ? null : s.retos[s.indice];
}

/** Segundos que quedan del reto en curso. */
export function tiempoRestante(s: LivenessState, now: number, cfg: FaceConfig = FACE_CONFIG): number {
  return Math.max(0, Math.ceil((cfg.liveness.challengeMs - (now - s.inicioReto)) / 1000));
}

export function instruccionReto(reto: Reto, mitad: boolean): string {
  switch (reto) {
    case "parpadear":
      return mitad ? "Abre los ojos." : "Parpadea una vez.";
    case "girar_izquierda":
      return mitad ? "Regresa al frente." : "Gira la cabeza despacio hacia tu izquierda.";
    case "girar_derecha":
      return mitad ? "Regresa al frente." : "Gira la cabeza despacio hacia tu derecha.";
  }
}

/** Avanza un cuadro. Devuelve un estado nuevo (no muta el anterior). */
export function stepLiveness(s: LivenessState, input: LivenessInput, now: number, rand: Rand = Math.random, cfg: FaceConfig = FACE_CONFIG): LivenessState {
  if (s.indice === 2) return s;
  if (now - s.inicioReto > cfg.liveness.challengeMs) return createLiveness(now, rand, s.intentos + 1);
  if (!input.encuadreOk) return s;

  const reto = s.retos[s.indice];
  const L = cfg.liveness;
  let cumplioMitad = false;
  let termino = false;

  if (reto === "parpadear") {
    if (input.blink === null) return s;
    if (!s.mitad) cumplioMitad = input.blink > L.blinkClosed;
    else termino = input.blink < L.blinkOpen;
  } else {
    if (input.yaw === null) return s;
    const sentido = reto === "girar_izquierda" ? 1 : -1;
    if (!s.mitad) cumplioMitad = input.yaw * sentido > L.turnYawDeg;
    else termino = Math.abs(input.yaw) < L.returnYawDeg;
  }

  if (cumplioMitad) return { ...s, mitad: true };
  if (termino) return { ...s, indice: (s.indice + 1) as 1 | 2, mitad: false, inicioReto: now };
  return s;
}
