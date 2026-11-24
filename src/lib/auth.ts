import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SESSION_COOKIE, verifySession, type Role, type SessionPayload } from "@/lib/session";

export async function getSession(): Promise<SessionPayload | null> {
  const store = await cookies();
  return verifySession(store.get(SESSION_COOKIE)?.value);
}

/** Para Server Components: redirige a /login si no hay sesión del rol pedido. */
export async function requireSession(role: Role): Promise<SessionPayload> {
  const s = await getSession();
  if (!s || s.role !== role) redirect(`/login?next=/${role}`);
  return s;
}

/** Para rutas de API: devuelve la sesión o null (la ruta responde 401). */
export async function sessionFor(role: Role): Promise<SessionPayload | null> {
  const s = await getSession();
  return s && s.role === role ? s : null;
}

/** Protección CSRF básica: la petición debe venir del mismo origen. */
export function sameOrigin(req: Request): boolean {
  const origin = req.headers.get("origin");
  if (!origin) return true; // peticiones sin Origin (curl, escáner) se validan por otros medios
  try {
    return new URL(origin).host === req.headers.get("host");
  } catch {
    return false;
  }
}
