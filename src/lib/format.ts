const TZ = "America/Mexico_City";

export const fmtFechaHora = (iso: string) =>
  new Intl.DateTimeFormat("es-MX", { timeZone: TZ, day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date(iso));

export const fmtHora = (iso: string) =>
  new Intl.DateTimeFormat("es-MX", { timeZone: TZ, hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date(iso));

export const fmtFecha = (iso: string) =>
  new Intl.DateTimeFormat("es-MX", { timeZone: TZ, weekday: "short", day: "2-digit", month: "short" }).format(new Date(iso));

export const fmtFechaLarga = (d = new Date()) => {
  const s = new Intl.DateTimeFormat("es-MX", { timeZone: TZ, weekday: "long", day: "numeric", month: "long" }).format(d);
  return s.charAt(0).toUpperCase() + s.slice(1);
};

export function saludo(d = new Date()): string {
  const h = Number(new Intl.DateTimeFormat("en-US", { timeZone: TZ, hour: "numeric", hourCycle: "h23" }).format(d));
  return h < 12 ? "Buenos días" : h < 19 ? "Buenas tardes" : "Buenas noches";
}
