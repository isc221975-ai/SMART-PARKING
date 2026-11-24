import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, cookieOptions, signSession, verifySession, type Role } from "@/lib/session";

/**
 * Protege /cliente y /admin. Sin sesión válida del rol correcto redirige a /login.
 * Además renueva la sesión del cliente en cada visita (cierre por 5 min de inactividad).
 */
export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const role: Role = pathname.startsWith("/admin") ? "admin" : "cliente";
  const session = await verifySession(req.cookies.get(SESSION_COOKIE)?.value);

  if (!session || session.role !== role) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.search = `?next=${encodeURIComponent(pathname)}`;
    const res = NextResponse.redirect(url);
    if (session && session.role !== role) return res; // otra sesión válida: no la borramos
    res.cookies.delete(SESSION_COOKIE);
    return res;
  }

  const res = NextResponse.next();
  if (role === "cliente") {
    res.cookies.set(SESSION_COOKIE, await signSession({ sub: session.sub, role, name: session.name }), cookieOptions(role));
  }
  res.headers.set("Cache-Control", "private, no-store");
  return res;
}

export const config = {
  matcher: ["/cliente/:path*", "/admin/:path*"],
};
