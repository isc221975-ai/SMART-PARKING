import { cookies } from "next/headers";
import { env } from "@/lib/env";
import { repo } from "@/lib/data";
import { nombreCompleto } from "@/lib/data/shared";
import { error, json, readJson, str } from "@/lib/http";
import { clientIp, rateLimit, sleep } from "@/lib/rate-limit";
import { SESSION_COOKIE, cookieOptions, safeEqual, signSession, type Role } from "@/lib/session";
import { sameOrigin } from "@/lib/auth";

export async function POST(req: Request) {
  if (!sameOrigin(req)) return error("Origen no permitido.", 403);

  const limit = rateLimit(`login:${clientIp(req)}`, 10, 10 * 60_000);
  if (!limit.ok) return error(`Demasiados intentos. Espera ${Math.ceil(limit.retryAfter / 60)} min.`, 429);

  const body = await readJson<{ usuario?: unknown; password?: unknown }>(req);
  const usuario = str(body?.usuario, 120).toLowerCase();
  const password = typeof body?.password === "string" ? body.password.slice(0, 200) : "";
  if (!usuario || !password) return error("Escribe tu usuario y contraseña.");

  let session: { sub: string; role: Role; name: string } | null = null;

  // 1. Administrador de pruebas definido en .env.local (ADMIN_USER / ADMIN_PASSWORD).
  if (env.adminUser && env.adminPassword && safeEqual(usuario, env.adminUser.toLowerCase()) && safeEqual(password, env.adminPassword)) {
    session = { sub: "admin", role: "admin", name: "Administración" };
  }

  // 2. Cuentas en Supabase. El rol "administrador" de la tabla usuarios entra al panel /admin.
  if (!session && usuario.includes("@")) {
    const u = await repo().autenticar(usuario, password);
    if (u) {
      session = { sub: String(u.id), role: u.rol === "administrador" ? "admin" : "cliente", name: u.nombre ?? nombreCompleto(u) };
    }
  }

  if (!session) {
    await sleep(600); // frena ataques de fuerza bruta
    return error("Usuario o contraseña incorrectos.", 401);
  }

  const store = await cookies();
  store.set(SESSION_COOKIE, await signSession(session), cookieOptions(session.role));
  return json({ ok: true, redirect: session.role === "admin" ? "/admin" : "/cliente" });
}
