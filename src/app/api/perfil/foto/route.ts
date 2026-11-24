import sharp from "sharp";
import { repo, type ExcepcionFoto, type FotoChecks } from "@/lib/data";
import { error, json } from "@/lib/http";
import { sameOrigin, sessionFor } from "@/lib/auth";

const MAX_BYTES = 3 * 1024 * 1024;
const SUBIDAS_POR_HORA = 5;
const REGLAS = ["R1", "R2", "R3", "R4", "R5", "R6", "R7", "R8", "R9", "R10", "R11"] as const;
const HEURISTICAS = new Set(["R5", "R6", "R7"]);
const EXCEPCIONES: ExcepcionFoto[] = ["medica", "religiosa", "discapacidad", "sin_camara"];

/** Tipo real por los primeros bytes, no por la extensión ni por el Content-Type. */
function tipoReal(b: Uint8Array): "jpeg" | "png" | "webp" | null {
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "jpeg";
  if ([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a].every((v, i) => b[i] === v)) return "png";
  const ascii = (from: number, to: number) => String.fromCharCode(...b.slice(from, to));
  if (ascii(0, 4) === "RIFF" && ascii(8, 12) === "WEBP") return "webp";
  return null;
}

/** foto_checks: exactamente R1 a R11 y solo valores permitidos. Ninguna regla que bloquea puede venir en false. */
function parseChecks(raw: unknown, modo: string): FotoChecks | null {
  let obj: unknown;
  try {
    obj = typeof raw === "string" && raw.length < 1000 ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
  if (!obj || typeof obj !== "object" || Array.isArray(obj)) return null;
  const rec = obj as Record<string, unknown>;
  if (Object.keys(rec).length !== REGLAS.length) return null;
  const out: FotoChecks = {};
  for (const r of REGLAS) {
    const v = rec[r];
    if (v !== true && v !== false && v !== "advertencia" && v !== "no_aplica") return null;
    if (v === false) return null; // el navegador no permite enviar con una regla en rojo
    if (v === "advertencia" && !HEURISTICAS.has(r)) return null;
    out[r] = v;
  }
  // Un archivo subido nunca pasa la prueba de vida: queda marcado para el administrador.
  if (modo === "archivo") out.R11 = "no_aplica";
  return out;
}

/** Sube la foto de perfil del usuario en sesión. Queda «pendiente» hasta que la revise el administrador. */
export async function POST(req: Request) {
  if (!sameOrigin(req)) return error("Origen no permitido.", 403);
  const s = await sessionFor("cliente");
  if (!s) return error("Inicia sesión.", 401);
  const id = Number(s.sub);

  const len = Number(req.headers.get("content-length") ?? 0);
  if (len > MAX_BYTES + 64 * 1024) return error("La foto pesa más de 3 MB.", 413);

  if ((await repo().subidasUltimaHora(id)) >= SUBIDAS_POR_HORA) {
    return error("Llegaste al límite de 5 fotos por hora. Intenta más tarde.", 429);
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return error("Solicitud inválida.");
  }
  if (form.get("consentimiento") !== "si") return error("Acepta el uso de tu foto para continuar.");
  const modo = form.get("modo");
  if (modo !== "camara" && modo !== "archivo") return error("Solicitud inválida.");
  const excRaw = form.get("excepcion");
  const excepcion = excRaw === null || excRaw === "" ? null : EXCEPCIONES.find((e) => e === excRaw);
  if (excepcion === undefined) return error("Excepción no válida.");
  const checks = parseChecks(form.get("checks"), modo);
  if (!checks) return error("La revisión de la foto no es válida. Tómala de nuevo.");

  const file = form.get("foto");
  if (!(file instanceof File) || file.size === 0) return error("Falta la foto.");
  if (file.size > MAX_BYTES) return error("La foto pesa más de 3 MB.", 413);
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (!tipoReal(bytes)) return error("El archivo no es una imagen JPG, PNG o WebP.", 415);

  // Recorte a 600 × 800, JPEG calidad 85. sharp no copia EXIF ni GPS salvo que se pida.
  let jpeg: Buffer;
  try {
    jpeg = await sharp(bytes, { limitInputPixels: 40_000_000, failOn: "error" })
      .rotate()
      .resize(600, 800, { fit: "cover", position: "centre" })
      .jpeg({ quality: 85, mozjpeg: true })
      .toBuffer();
  } catch {
    return error("No se pudo leer la imagen. Prueba con otra.", 415);
  }

  const res = await repo().subirFoto(id, { jpeg, checks, excepcion });
  return res.ok ? json({ ok: true, estado: "pendiente" }) : error(res.error, 500);
}

/** Borra la foto de perfil del usuario en sesión (archivo y estado). */
export async function DELETE(req: Request) {
  if (!sameOrigin(req)) return error("Origen no permitido.", 403);
  const s = await sessionFor("cliente");
  if (!s) return error("Inicia sesión.", 401);
  const res = await repo().borrarFoto(Number(s.sub));
  return res.ok ? json({ ok: true }) : error(res.error, 500);
}
