/**
 * Comparación de placas tolerante a errores de OCR. Funciones puras (sin dependencias del servidor).
 */

/** Mayúsculas y solo [A-Z0-9]: quita guiones, espacios y símbolos. */
export function normalizarPlacaLeida(placa: string): string {
  return placa.toUpperCase().replace(/[^A-Z0-9]/g, "");
}

// Letras que el OCR confunde con dígitos; se llevan al dígito en ambos lados.
const CONFUSIONES: Record<string, string> = { O: "0", Q: "0", D: "0", I: "1", L: "1", Z: "2", S: "5", B: "8", G: "6" };

function canonica(placa: string): string {
  return normalizarPlacaLeida(placa).replace(/[OQDILZSBG]/g, (c) => CONFUSIONES[c] ?? c);
}

function levenshtein(a: string, b: string): number {
  let prev = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const cur: number[] = [i];
    for (let j = 1; j <= b.length; j++) {
      cur[j] = Math.min(prev[j]! + 1, cur[j - 1]! + 1, prev[j - 1]! + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    prev = cur;
  }
  return prev[b.length]!;
}

/** true si `leida` corresponde a `registrada` con a lo más un carácter de diferencia. Vacías nunca coinciden. */
export function placasCoinciden(registrada: string, leida: string): boolean {
  const a = canonica(registrada);
  const b = canonica(leida);
  if (!a || !b) return false;
  return levenshtein(a, b) <= 1;
}
