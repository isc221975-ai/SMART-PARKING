import { env } from "@/lib/env";
import { repo } from "@/lib/data";
import { error, json, readJson, str } from "@/lib/http";
import { analizarCorreo, errorPassword } from "@/lib/identity";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { sameOrigin } from "@/lib/auth";

export async function POST(req: Request) {
  if (!sameOrigin(req)) return error("Origen no permitido.", 403);
  const limit = rateLimit(`register:${clientIp(req)}`, 5, 60 * 60_000);
  if (!limit.ok) return error("Demasiados registros desde esta red. Intenta más tarde.", 429);

  const b = await readJson<Record<string, unknown>>(req);
  if (!b) return error("Solicitud inválida.");

  const correo = str(b.correo, 120).toLowerCase();
  const password = typeof b.password === "string" ? b.password : "";
  const nombre = str(b.nombre, 60);
  const apellido_paterno = str(b.apellido_paterno, 60);
  const apellido_materno = str(b.apellido_materno, 60);
  const semestreRaw = Number(b.semestre);

  const id = analizarCorreo(correo, env.institutionDomain);
  if (!id.ok) return error(id.error);
  if (!nombre || !apellido_paterno) return error("Escribe tu nombre y apellido paterno.");
  const errPw = errorPassword(password);
  if (errPw) return error(errPw);

  let semestre: number | null = null;
  if (id.identidad.rol === "estudiante") {
    if (!Number.isInteger(semestreRaw) || semestreRaw < 1 || semestreRaw > 12) return error("Elige tu semestre.");
    semestre = semestreRaw;
  }

  const res = await repo().registrarUsuario({
    correo,
    password,
    nombre,
    apellido_paterno,
    apellido_materno,
    semestre,
    ...id.identidad,
  });
  if (!res.ok) return error(res.error, 409);
  return json({ ok: true }, 201);
}
