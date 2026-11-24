import { repo, type DecisionFoto } from "@/lib/data";
import { error, json, readJson, str } from "@/lib/http";
import { sameOrigin, sessionFor } from "@/lib/auth";
import { MOTIVOS_RECHAZO } from "@/lib/fotos";

/** Aprueba o rechaza la foto pendiente de un usuario. Solo administrador. */
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  if (!sameOrigin(req)) return error("Origen no permitido.", 403);
  const s = await sessionFor("admin");
  if (!s) return error("Sesión de administrador requerida.", 401);
  const id = Number((await ctx.params).id);
  if (!Number.isInteger(id) || id < 1) return error("Id inválido.");

  const body = await readJson<{ accion?: unknown; motivo?: unknown; detalle?: unknown; subidaAt?: unknown }>(req);
  if (!body) return error("Solicitud inválida.");
  const subidaAt = str(body.subidaAt, 40);
  if (!subidaAt || Number.isNaN(Date.parse(subidaAt))) return error("Solicitud inválida.");

  let decision: DecisionFoto;
  if (body.accion === "aprobar") decision = { accion: "aprobar" };
  else if (body.accion === "rechazar") {
    const motivo = MOTIVOS_RECHAZO.find((m) => m.value === body.motivo);
    if (!motivo) return error("Elige un motivo de rechazo.");
    if (motivo.value === "otro") {
      const detalle = str(body.detalle, 200).replace(/[\u0000-\u001f]/g, "");
      if (detalle.length < 5) return error("Describe el motivo en al menos 5 caracteres.");
      decision = { accion: "rechazar", motivo: detalle };
    } else decision = { accion: "rechazar", motivo: motivo.label };
  } else return error("Acción no válida.");

  const res = await repo().revisarFoto(id, subidaAt, decision, s.name || "Administrador");
  return res.ok ? json({ ok: true }) : error(res.error, 409);
}
