import { repo } from "@/lib/data";
import { error, json, readJson } from "@/lib/http";
import { errorPassword } from "@/lib/identity";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { sameOrigin, sessionFor } from "@/lib/auth";

/** Cambia la contraseña de la cuenta en sesión (Supabase Auth, desde el servidor). */
export async function POST(req: Request) {
  if (!sameOrigin(req)) return error("Origen no permitido.", 403);
  const s = await sessionFor("cliente");
  if (!s) return error("Inicia sesión.", 401);
  const limit = rateLimit(`password:${s.sub}:${clientIp(req)}`, 5, 60 * 60_000);
  if (!limit.ok) return error("Demasiados intentos. Espera unos minutos.", 429);

  const b = await readJson<{ password?: unknown; confirm?: unknown }>(req);
  const password = typeof b?.password === "string" ? b.password : "";
  const confirm = typeof b?.confirm === "string" ? b.confirm : "";
  const err = errorPassword(password);
  if (err) return error(err);
  if (password !== confirm) return error("Las contraseñas no coinciden.");

  const res = await repo().cambiarPassword(Number(s.sub), password);
  return res.ok ? json({ ok: true }) : error(res.error, 500);
}
