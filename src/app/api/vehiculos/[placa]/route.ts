import { repo } from "@/lib/data";
import { error, json } from "@/lib/http";
import { normalizarPlaca } from "@/lib/identity";
import { getSession, sameOrigin } from "@/lib/auth";

export async function DELETE(req: Request, ctx: { params: Promise<{ placa: string }> }) {
  if (!sameOrigin(req)) return error("Origen no permitido.", 403);
  const s = await getSession();
  if (!s) return error("Inicia sesión.", 401);
  const placa = normalizarPlaca(decodeURIComponent((await ctx.params).placa)).slice(0, 10);
  // El cliente solo puede borrar los suyos; el administrador cualquiera.
  const res = await repo().eliminarVehiculo(placa, s.role === "admin" ? undefined : Number(s.sub));
  return res.ok ? json({ ok: true }) : error(res.error, 404);
}
