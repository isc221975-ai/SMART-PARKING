import { repo } from "@/lib/data";
import { error, json, readJson, str } from "@/lib/http";
import { normalizarPlaca } from "@/lib/identity";
import { getSession, sameOrigin } from "@/lib/auth";

function isoOrNull(v: unknown): string | null {
  if (typeof v !== "string" || !v) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

export async function POST(req: Request) {
  if (!sameOrigin(req)) return error("Origen no permitido.", 403);
  // La bitácora la captura el personal de caseta desde el panel de administración.
  const s = await getSession();
  if (!s || s.role !== "admin") return error("Solo el personal autorizado puede registrar visitas.", 401);

  const b = await readJson<Record<string, unknown>>(req);
  const nombre_conductor = str(b?.nombre_conductor, 80);
  const empresa = str(b?.empresa, 80);
  const asunto = str(b?.asunto, 160);
  const placaRaw = normalizarPlaca(str(b?.placa, 12));
  const hora_entrada = isoOrNull(b?.hora_entrada);
  const hora_salida = isoOrNull(b?.hora_salida);

  if (!nombre_conductor || !empresa || !asunto) return error("Nombre, empresa y asunto son obligatorios.");
  if (!hora_entrada) return error("Indica la hora de entrada.");
  if (hora_salida && hora_salida < hora_entrada) return error("La hora de salida no puede ser antes de la entrada.");

  const res = await repo().agregarBitacora({ nombre_conductor, empresa, asunto, placa: placaRaw || null, hora_entrada, hora_salida });
  return res.ok ? json(res.data, 201) : error(res.error, 500);
}
