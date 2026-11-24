import { repo } from "@/lib/data";
import { error, json } from "@/lib/http";
import { sameOrigin, sessionFor } from "@/lib/auth";

export async function DELETE(req: Request, ctx: { params: Promise<{ id: string }> }) {
  if (!sameOrigin(req)) return error("Origen no permitido.", 403);
  if (!(await sessionFor("admin"))) return error("Sesión de administrador requerida.", 401);
  const id = Number((await ctx.params).id);
  if (!Number.isInteger(id) || id < 1) return error("Id inválido.");
  const res = await repo().eliminarAcceso(id);
  return res.ok ? json({ ok: true }) : error(res.error, 404);
}
