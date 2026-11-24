/**
 * Sesión firmada con HMAC SHA 256 (Web Crypto), válida en el proxy y en rutas de servidor.
 * La cookie es httpOnly, sameSite=strict y secure en producción.
 */

export type Role = "cliente" | "admin";

export interface SessionPayload {
  /** id del usuario en la tabla usuarios, o "admin" (admin de .env.local) */
  sub: string;
  role: Role;
  name: string;
  /** expiración absoluta en segundos (epoch) */
  exp: number;
}

export const SESSION_COOKIE = "sp_session";
/** Cliente: 5 minutos de inactividad (se renueva en cada petición). Admin: 30 minutos. */
export const SESSION_TTL: Record<Role, number> = { cliente: 5 * 60, admin: 30 * 60 };

const encoder = new TextEncoder();

function getSecret(): string {
  const secret = process.env.SESSION_SECRET ?? "";
  if (secret.length >= 32) return secret;
  if (process.env.NODE_ENV !== "production") {
    // Solo en desarrollo: secreto fijo para que funcione sin configurar nada.
    return "dev-only-secret-change-me-dev-only-secret-change-me";
  }
  throw new Error("SESSION_SECRET debe tener al menos 32 caracteres en producción.");
}

function b64url(bytes: Uint8Array): string {
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromB64url(str: string): Uint8Array {
  const pad = str.length % 4 === 0 ? "" : "=".repeat(4 - (str.length % 4));
  const bin = atob(str.replace(/-/g, "+").replace(/_/g, "/") + pad);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

async function hmacKey(): Promise<CryptoKey> {
  return crypto.subtle.importKey("raw", encoder.encode(getSecret()), { name: "HMAC", hash: "SHA-256" }, false, [
    "sign",
    "verify",
  ]);
}

export async function signSession(data: Omit<SessionPayload, "exp">): Promise<string> {
  const payload: SessionPayload = { ...data, exp: Math.floor(Date.now() / 1000) + SESSION_TTL[data.role] };
  const body = b64url(encoder.encode(JSON.stringify(payload)));
  const sig = new Uint8Array(await crypto.subtle.sign("HMAC", await hmacKey(), encoder.encode(body)));
  return `${body}.${b64url(sig)}`;
}

export async function verifySession(token: string | undefined | null): Promise<SessionPayload | null> {
  if (!token) return null;
  const [body, sig] = token.split(".");
  if (!body || !sig) return null;
  try {
    // crypto.subtle.verify compara en tiempo constante.
    const ok = await crypto.subtle.verify("HMAC", await hmacKey(), fromB64url(sig) as BufferSource, encoder.encode(body));
    if (!ok) return null;
    const payload = JSON.parse(new TextDecoder().decode(fromB64url(body))) as SessionPayload;
    if (typeof payload.exp !== "number" || payload.exp < Date.now() / 1000) return null;
    if (payload.role !== "cliente" && payload.role !== "admin") return null;
    return payload;
  } catch {
    return null;
  }
}

export function cookieOptions(role: Role) {
  return {
    httpOnly: true,
    sameSite: "strict" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_TTL[role],
  };
}

/** Comparación de cadenas en tiempo constante (para contraseñas y claves). */
export function safeEqual(a: string, b: string): boolean {
  const ab = encoder.encode(a);
  const bb = encoder.encode(b);
  const len = Math.max(ab.length, bb.length);
  let diff = ab.length ^ bb.length;
  for (let i = 0; i < len; i++) diff |= (ab[i] ?? 0) ^ (bb[i] ?? 0);
  return diff === 0;
}
