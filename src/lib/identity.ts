/**
 * Identidad institucional: valida el correo y deduce tipo, matrícula y carrera.
 * Reglas del proyecto original (siev-itsa).
 */
import type { Rol } from "@/lib/supabase/types";

export const CARRERAS: Record<string, string> = {
  isc: "Ingeniería en Sistemas Computacionales",
  ib: "Ingeniería Bioquímica",
  im: "Ingeniería Mecatrónica",
  ii: "Ingeniería Industrial",
  ie: "Ingeniería Electromecánica",
  lg: "Licenciatura en Gastronomía",
};

export interface Identidad {
  rol: Rol;
  matricula: string | null;
  carrera: string | null;
}

export function analizarCorreo(correo: string, dominio: string): { ok: true; identidad: Identidad } | { ok: false; error: string } {
  const email = correo.trim().toLowerCase();
  const [local, domain] = email.split("@");
  if (!local || !domain) return { ok: false, error: "Escribe un correo válido." };
  if (domain !== dominio) return { ok: false, error: `Usa tu correo institucional @${dominio}.` };

  const alumno = /^(isc|ib|im|ii|ie|lg)(\d{6})$/.exec(local);
  if (alumno) {
    const prefijo = alumno[1]!;
    return { ok: true, identidad: { rol: "estudiante", matricula: local.toUpperCase(), carrera: CARRERAS[prefijo] ?? null } };
  }
  if (/^[a-z]+\.[a-z]+(\.[a-z]+)?$/.test(local)) {
    return { ok: true, identidad: { rol: "docente", matricula: null, carrera: null } };
  }
  if (/^[a-z]+$/.test(local)) {
    return { ok: true, identidad: { rol: "administrativo", matricula: null, carrera: null } };
  }
  return { ok: false, error: "El formato del correo no corresponde a alumno, docente ni administrativo." };
}

/** Placa normalizada: mayúsculas, sin espacios ni guiones. */
export function normalizarPlaca(placa: string): string {
  return placa.toUpperCase().replace(/[\s-]/g, "");
}

export function placaValida(placa: string): boolean {
  return /^[A-Z0-9]{5,8}$/.test(placa);
}

export const ROL_LABEL: Record<Rol, string> = {
  estudiante: "Alumno",
  docente: "Docente",
  administrativo: "Administrativo",
  administrador: "Administrador",
};

/** Regla de contraseña: 8 a 72 caracteres, con letras y números. Devuelve el error o null. */
export function errorPassword(password: string): string | null {
  if (password.length < 8 || password.length > 72) return "La contraseña debe tener entre 8 y 72 caracteres.";
  if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) return "La contraseña debe combinar letras y números.";
  return null;
}
