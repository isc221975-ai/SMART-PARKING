import { env } from "@/lib/env";
import { repo } from "@/lib/data";
import { json, readJson, str } from "@/lib/http";
import { normalizarPlacaLeida, placasCoinciden } from "@/lib/plates";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { safeEqual } from "@/lib/session";

type Rechazo = { status: number; body: Record<string, unknown> };

const deny = (status: number, code: string, error: string, extra: Record<string, unknown> = {}) =>
  json({ ok: false, action: "DENY", code, error, ...extra }, status);

function plateCheck(): "off" | "warn" | "strict" {
  const v = (process.env.PLATE_CHECK ?? "").trim().toLowerCase();
  return v === "warn" || v === "strict" ? v : "off";
}

function minIntervalMs(): number {
  const n = Number(process.env.SCAN_MIN_INTERVAL_SECONDS);
  return (Number.isFinite(n) && n >= 0 ? n : 15) * 1000;
}

/**
 * Lo llama el escáner de la caseta (hardware/scanner).
 * Exige la cabecera x-api-key. Anti duplicado y verificación de placa ocurren antes de insertar:
 * ningún rechazo crea filas en accesos.
 */
export async function POST(req: Request) {
  if (!env.hardwareApiKey) return deny(503, "SIN_CONFIGURAR", "El escáner no está configurado (HARDWARE_API_KEY).");
  const key = req.headers.get("x-api-key") ?? "";
  if (!safeEqual(key, env.hardwareApiKey)) return deny(401, "CLAVE_INVALIDA", "Clave de hardware inválida.");

  const limit = rateLimit(`scan:${clientIp(req)}`, 120, 60_000);
  if (!limit.ok) return deny(429, "DEMASIADAS_LECTURAS", "Demasiadas lecturas.");

  const b = await readJson<{ token?: unknown; qr_token?: unknown; placa_leida?: unknown }>(req);
  const token = str(b?.token ?? b?.qr_token, 64);
  if (!/^[a-f0-9]{32}$/.test(token)) return deny(400, "QR_INVALIDO", "Formato de QR inválido.");

  const raw = b?.placa_leida;
  if (raw !== undefined && raw !== null && (typeof raw !== "string" || raw.length > 12)) {
    return deny(400, "QR_INVALIDO", "placa_leida debe ser texto de máximo 12 caracteres.");
  }
  const placaLeida = typeof raw === "string" ? normalizarPlacaLeida(raw) : "";

  const modo = plateCheck();
  const intervalo = minIntervalMs();
  let coincide: boolean | null = null;

  const res = await repo().registrarLectura<Rechazo>(token, ({ placa, ultimaFecha }) => {
    if (ultimaFecha && Date.now() - new Date(ultimaFecha).getTime() < intervalo) {
      return { status: 409, body: { ok: false, action: "IGNORE", code: "DUPLICADO", error: "Lectura repetida." } };
    }
    if (modo === "off") return null;
    if (!placaLeida) {
      if (modo === "strict") return { status: 403, body: { ok: false, action: "DENY", code: "SIN_PLACA", error: "No se leyó la placa.", placa } };
      return null;
    }
    coincide = placasCoinciden(placa, placaLeida);
    if (coincide) return null;
    if (modo === "strict") {
      return { status: 403, body: { ok: false, action: "DENY", code: "PLACA_NO_COINCIDE", error: "La placa no coincide con el QR.", placa } };
    }
    console.warn(`[scan] Placa no coincide: registrada=${placa} leida=${placaLeida}`);
    return null;
  });

  if (!res.ok) {
    if (res.code === "RECHAZADA") return json(res.rechazo.body, res.rechazo.status);
    if (res.code === "NO_REGISTRADO") return deny(404, "NO_REGISTRADO", res.error);
    return deny(500, "ERROR_BD", res.error);
  }
  // action la usa el escáner para mandar OPEN/DENY a la pluma por puerto serie.
  return json({ ok: true, action: "OPEN", ...res.data, placa_coincide: coincide });
}
