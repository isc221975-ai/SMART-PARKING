import { repo } from "@/lib/data";
import { error, json, readJson, str } from "@/lib/http";
import { normalizarPlaca, placaValida } from "@/lib/identity";
import { sameOrigin, sessionFor } from "@/lib/auth";

export async function GET() {
  const s = await sessionFor("cliente");
  if (!s) return error("Inicia sesión.", 401);
  return json(await repo().listVehiculos(Number(s.sub)));
}

export async function POST(req: Request) {
  if (!sameOrigin(req)) return error("Origen no permitido.", 403);
  const s = await sessionFor("cliente");
  if (!s) return error("Inicia sesión.", 401);
  const b = await readJson<{ placa?: unknown }>(req);
  const placa = normalizarPlaca(str(b?.placa, 20));
  if (!placaValida(placa)) return error("La placa debe tener de 5 a 8 letras o números.");
  const res = await repo().agregarVehiculo(Number(s.sub), placa);
  return res.ok ? json(res.data, 201) : error(res.error, 409);
}
