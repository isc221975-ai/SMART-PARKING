import { repo } from "@/lib/data";
import { error, json } from "@/lib/http";
import { sessionFor } from "@/lib/auth";
import { clientIp, rateLimit } from "@/lib/rate-limit";

/** Búsqueda global del panel por placa, nombre, matrícula o correo. Solo administrador. */
export async function GET(req: Request) {
  if (!(await sessionFor("admin"))) return error("Sesión de administrador requerida.", 401);
  const limit = rateLimit(`buscar:${clientIp(req)}`, 120, 60_000);
  if (!limit.ok) return error("Demasiadas búsquedas seguidas. Espera un momento.", 429);
  const q = (new URL(req.url).searchParams.get("q") ?? "").slice(0, 60);
  return json(await repo().buscar(q));
}
