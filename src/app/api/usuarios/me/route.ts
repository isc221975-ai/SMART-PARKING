import { repo } from "@/lib/data";
import { error, json, readJson, str } from "@/lib/http";
import { sameOrigin, sessionFor } from "@/lib/auth";

export async function PATCH(req: Request) {
  if (!sameOrigin(req)) return error("Origen no permitido.", 403);
  const s = await sessionFor("cliente");
  if (!s) return error("Inicia sesión.", 401);
  const b = await readJson<Record<string, unknown>>(req);
  const nombre = str(b?.nombre, 60);
  const apellido_paterno = str(b?.apellido_paterno, 60);
  const apellido_materno = str(b?.apellido_materno, 60);
  if (!nombre || !apellido_paterno) return error("Nombre y apellido paterno son obligatorios.");
  const actual = await repo().getUsuario(Number(s.sub));
  if (!actual) return error("Usuario no encontrado.", 404);
  let semestre = actual.semestre;
  if (actual.rol === "estudiante") {
    const n = Number(b?.semestre);
    if (!Number.isInteger(n) || n < 1 || n > 12) return error("Elige un semestre válido.");
    semestre = n;
  }
  const res = await repo().actualizarPerfil(actual.id, { nombre, apellido_paterno, apellido_materno, semestre });
  return res.ok ? json({ ok: true }) : error(res.error, 500);
}
