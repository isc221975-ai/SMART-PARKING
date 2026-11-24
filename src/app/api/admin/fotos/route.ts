import { repo } from "@/lib/data";
import { error, json } from "@/lib/http";
import { sessionFor } from "@/lib/auth";

/** Cola de revisión: la foto pendiente más antigua (URL firmada de 5 minutos) y el total pendiente. */
export async function GET() {
  if (!(await sessionFor("admin"))) return error("Sesión de administrador requerida.", 401);
  return json(await repo().siguienteFotoPendiente());
}
