import type { Acceso, PuntoSerie, Rango, ResumenPeriodo, Rol } from "./types";

export function newQrToken(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

export function nombreCompleto(u: { nombre: string | null; apellido_paterno: string | null; apellido_materno?: string | null }): string {
  return [u.nombre, u.apellido_paterno, u.apellido_materno].filter(Boolean).join(" ") || "Sin nombre";
}

/** Zona horaria del campus para "hoy" y la gráfica por hora. */
const TZ = "America/Mexico_City";
const dayFmt = new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" });
const hourFmt = new Intl.DateTimeFormat("en-US", { timeZone: TZ, hour: "numeric", hourCycle: "h23" });

export const dayKey = (iso: string | Date) => dayFmt.format(new Date(iso));
export const hourOf = (iso: string) => Number(hourFmt.format(new Date(iso))) % 24;

const diaCorto = new Intl.DateTimeFormat("es-MX", { timeZone: TZ, weekday: "short", day: "numeric" });
const diaLargo = new Intl.DateTimeFormat("es-MX", { timeZone: TZ, weekday: "long", day: "numeric", month: "long" });
/** Mediodía de un día "YYYY-MM-DD" del campus (México no tiene horario de verano desde 2022). */
const mediodia = (key: string) => new Date(`${key}T12:00:00-06:00`);

/**
 * Indicadores del periodo. `accesos` son los más recientes (orden indistinto);
 * «dentro ahora» usa la última lectura de cada placa entre ellos.
 */
export function calcularResumen(
  rango: Rango,
  accesos: Pick<Acceso, "vehiculo_placa" | "tipo" | "fecha">[],
  usuarios: { id: number; rol: Rol | null; foto_estado: string }[],
  vehiculos: { usuario_id: number }[],
  ahora = new Date(),
): ResumenPeriodo {
  const hoy = dayKey(ahora);
  const dias = rango === "hoy" ? 1 : Number(rango);
  const claves = Array.from({ length: dias }, (_, i) => dayKey(new Date(mediodia(hoy).getTime() - (dias - 1 - i) * 86_400_000)));
  const desde = claves[0]!;
  const delPeriodo = accesos.filter((a) => dayKey(a.fecha) >= desde);
  const entradas = delPeriodo.filter((a) => a.tipo === "entrada");

  let serie: PuntoSerie[];
  if (rango === "hoy") {
    const porHora = Array.from({ length: 24 }, () => 0);
    for (const a of entradas) porHora[hourOf(a.fecha)]!++;
    serie = porHora.slice(6, 22).map((n, i) => {
      const h = String(i + 6).padStart(2, "0");
      return { etiqueta: h, detalle: `${h}:00 a ${h}:59`, entradas: n };
    });
  } else {
    const porDia = new Map(claves.map((k) => [k, 0]));
    for (const a of entradas) {
      const k = dayKey(a.fecha);
      if (porDia.has(k)) porDia.set(k, porDia.get(k)! + 1);
    }
    serie = claves.map((k) => {
      const largo = diaLargo.format(mediodia(k));
      return {
        etiqueta: rango === "7" ? diaCorto.format(mediodia(k)) : String(Number(k.slice(8))),
        detalle: largo.charAt(0).toUpperCase() + largo.slice(1),
        entradas: porDia.get(k)!,
      };
    });
  }

  const ultimo = new Map<string, { tipo: string; fecha: string }>();
  for (const a of accesos) {
    const prev = ultimo.get(a.vehiculo_placa);
    if (!prev || a.fecha > prev.fecha) ultimo.set(a.vehiculo_placa, a);
  }
  const conVehiculo = new Set(vehiculos.map((v) => v.usuario_id));

  return {
    rango,
    accesos: delPeriodo.length,
    entradas: entradas.length,
    salidas: delPeriodo.length - entradas.length,
    vehiculos: vehiculos.length,
    usuarios: usuarios.length,
    dentroAhora: [...ultimo.values()].filter((u) => u.tipo === "entrada").length,
    serie,
    comunidad: {
      alumnos: usuarios.filter((u) => u.rol === "estudiante").length,
      docentes: usuarios.filter((u) => u.rol === "docente").length,
      administrativos: usuarios.filter((u) => u.rol === "administrativo" || u.rol === "administrador").length,
      sinVehiculo: usuarios.filter((u) => !conVehiculo.has(u.id)).length,
    },
    fotosPendientes: usuarios.filter((u) => u.foto_estado === "pendiente").length,
  };
}

/** Fecha ISO de hace `n` días (para filtrar consultas por rango). */
export const haceDias = (n: number) => new Date(Date.now() - n * 86_400_000).toISOString();
