import { repo } from "@/lib/data";
import { error, json, readJson, str } from "@/lib/http";
import { normalizarPlaca } from "@/lib/identity";
import { sameOrigin, sessionFor } from "@/lib/auth";
import { env } from "@/lib/env";

/**
 * Simula la lectura del QR de un vehículo desde el panel, para probar sin escáner.
 * Solo existe con ENABLE_SCAN_SIMULATOR=true y usa el mismo registrarLectura que /api/hardware/scan.
 */
export async function POST(req: Request) {
  if (!env.enableScanSimulator) return error("No encontrado.", 404);
  if (!sameOrigin(req)) return error("Origen no permitido.", 403);
  if (!(await sessionFor("admin"))) return error("Sesión de administrador requerida.", 401);
  const b = await readJson<{ placa?: unknown }>(req);
  const placa = normalizarPlaca(str(b?.placa, 12));
  const v = (await repo().listVehiculos()).find((x) => x.placa === placa);
  if (!v?.qr_token) return error("Vehículo no encontrado.", 404);
  const res = await repo().registrarLectura(v.qr_token);
  return res.ok ? json(res.data) : error(res.error, 400);
}
