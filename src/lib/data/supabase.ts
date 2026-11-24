/**
 * Repositorio real sobre Supabase (Postgres + Auth).
 * Usa la clave de servicio SOLO en el servidor. La autorización (qué usuario ve qué)
 * se aplica aquí filtrando por el id de la sesión firmada.
 */
import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { env } from "@/lib/env";
import type {
  AccesoDetalle,
  Bitacora,
  NuevaBitacora,
  NuevoUsuario,
  PreLectura,
  Rango,
  ResultadoLectura,
  Repository,
  ResultadoBusqueda,
  Result,
  Usuario,
  Vehiculo,
  VehiculoDetalle,
} from "./types";
import { calcularResumen, newQrToken, nombreCompleto } from "./shared";

let admin: SupabaseClient | null = null;
function db(): SupabaseClient {
  if (!admin) {
    admin = createClient(env.supabaseUrl, env.supabaseServiceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return admin;
}

/** Cliente público, solo para verificar contraseña con Supabase Auth. */
function authClient(): SupabaseClient {
  return createClient(env.supabaseUrl, env.supabaseAnonKey, { auth: { persistSession: false, autoRefreshToken: false } });
}

const FOTOS_BUCKET = "fotos-perfil";
const URL_FIRMADA_SEG = 5 * 60;

const ok = <T,>(data: T): Result<T> => ({ ok: true, data });
const fail = (error: string): { ok: false; error: string } => ({ ok: false, error });

type AccesoRow = Omit<AccesoDetalle, "nombre"> & {
  usuarios: { nombre: string | null; apellido_paterno: string | null; apellido_materno: string | null } | null;
};

function mapAcceso(r: AccesoRow): AccesoDetalle {
  const { usuarios, ...rest } = r;
  return { ...rest, nombre: usuarios ? nombreCompleto(usuarios) : "Usuario eliminado" };
}

export const supabaseRepository: Repository = {
  async autenticar(correo, password) {
    const { data, error } = await authClient().auth.signInWithPassword({ email: correo.trim().toLowerCase(), password });
    if (error || !data.user) return null;
    const { data: u } = await db().from("usuarios").select("*").eq("auth_id", data.user.id).maybeSingle<Usuario>();
    return u ?? null;
  },

  async registrarUsuario(d: NuevoUsuario) {
    const { data: created, error } = await db().auth.admin.createUser({
      email: d.correo,
      password: d.password,
      email_confirm: true,
    });
    if (error || !created.user) {
      return fail(error?.message.includes("already") ? "Ya existe una cuenta con ese correo." : "No se pudo crear la cuenta.");
    }
    const { data: u, error: insErr } = await db()
      .from("usuarios")
      .insert({
        auth_id: created.user.id,
        correo: d.correo,
        rol: d.rol,
        nombre: d.nombre,
        apellido_paterno: d.apellido_paterno,
        apellido_materno: d.apellido_materno,
        matricula: d.matricula,
        carrera: d.carrera,
        semestre: d.semestre,
      })
      .select("*")
      .single<Usuario>();
    if (insErr || !u) {
      await db().auth.admin.deleteUser(created.user.id);
      return fail("No se pudo guardar el perfil. Intenta de nuevo.");
    }
    return ok(u);
  },

  async getUsuario(id) {
    const { data } = await db().from("usuarios").select("*").eq("id", id).maybeSingle<Usuario>();
    return data ?? null;
  },

  async actualizarPerfil(id, data) {
    const { error } = await db().from("usuarios").update(data).eq("id", id);
    return error ? fail("No se pudieron guardar los cambios.") : ok(undefined);
  },

  async cambiarPassword(id, password) {
    const u = await this.getUsuario(id);
    if (!u?.auth_id) return fail("Cuenta no encontrada.");
    const { error } = await db().auth.admin.updateUserById(u.auth_id, { password });
    return error ? fail("No se pudo cambiar la contraseña. Intenta de nuevo.") : ok(undefined);
  },

  async fotoUrl(path) {
    const { data } = await db().storage.from(FOTOS_BUCKET).createSignedUrl(path, URL_FIRMADA_SEG);
    return data?.signedUrl ?? null;
  },

  async fotoUrls(paths) {
    if (!paths.length) return {};
    const { data } = await db().storage.from(FOTOS_BUCKET).createSignedUrls(paths, URL_FIRMADA_SEG);
    return Object.fromEntries((data ?? []).filter((d) => d.path && d.signedUrl).map((d) => [d.path!, d.signedUrl!] as const));
  },

  async borrarFoto(id) {
    const u = await this.getUsuario(id);
    if (!u) return fail("Cuenta no encontrada.");
    const paths = [u.foto_path, u.foto_path_anterior].filter((p): p is string => Boolean(p));
    if (paths.length) {
      const { error } = await db().storage.from(FOTOS_BUCKET).remove(paths);
      if (error) return fail("No se pudo borrar la foto. Intenta de nuevo.");
    }
    const { error } = await db()
      .from("usuarios")
      .update({
        foto_path: null,
        foto_path_anterior: null,
        foto_estado: "sin_foto",
        foto_motivo_rechazo: null,
        foto_checks: null,
        foto_excepcion: null,
        foto_subida_at: null,
        foto_revisada_at: null,
        foto_revisada_por: null,
      })
      .eq("id", id);
    return error ? fail("No se pudo actualizar tu perfil.") : ok(undefined);
  },

  async subidasUltimaHora(id) {
    const u = await this.getUsuario(id);
    if (!u?.auth_id) return 0;
    const desde = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { count } = await db().from("foto_perfil_subidas").select("id", { count: "exact", head: true }).eq("auth_id", u.auth_id).gte("created_at", desde);
    return count ?? 0;
  },

  async subirFoto(id, foto) {
    const u = await this.getUsuario(id);
    if (!u?.auth_id) return fail("Cuenta no encontrada.");
    // Mismo formato que el bucket ya usa: {auth_id}/{timestamp}.jpg
    const path = `${u.auth_id}/${Date.now()}.jpg`;
    const { error: logErr } = await db().from("foto_perfil_subidas").insert({ auth_id: u.auth_id });
    if (logErr) return fail("No se pudo registrar la subida. Intenta de nuevo.");
    const { error: upErr } = await db().storage.from(FOTOS_BUCKET).upload(path, foto.jpeg, { contentType: "image/jpeg", upsert: false });
    if (upErr) return fail("No se pudo guardar la foto. Intenta de nuevo.");

    // La aprobada vigente se conserva como «anterior» hasta que se apruebe la nueva.
    // Una pendiente o rechazada simplemente se reemplaza.
    const aprobada = u.foto_estado === "aprobada" ? u.foto_path : null;
    const anterior = aprobada ?? u.foto_path_anterior;
    const sobran = [aprobada ? u.foto_path_anterior : u.foto_path].filter((p): p is string => Boolean(p) && p !== anterior);
    const now = new Date().toISOString();
    const { error } = await db()
      .from("usuarios")
      .update({
        foto_path: path,
        foto_path_anterior: anterior,
        foto_estado: "pendiente",
        foto_checks: foto.checks,
        foto_excepcion: foto.excepcion,
        foto_motivo_rechazo: null,
        foto_subida_at: now,
        foto_revisada_at: null,
        foto_revisada_por: null,
        consentimiento_foto_at: now,
      })
      .eq("id", id);
    if (error) {
      await db().storage.from(FOTOS_BUCKET).remove([path]);
      return fail("No se pudo actualizar tu perfil. Intenta de nuevo.");
    }
    if (sobran.length) await db().storage.from(FOTOS_BUCKET).remove(sobran);
    return ok(undefined);
  },

  async siguienteFotoPendiente() {
    const [{ count }, { data }] = await Promise.all([
      db().from("usuarios").select("id", { count: "exact", head: true }).eq("foto_estado", "pendiente"),
      db()
        .from("usuarios")
        .select("*")
        .eq("foto_estado", "pendiente")
        .order("foto_subida_at", { ascending: true, nullsFirst: false })
        .limit(1)
        .maybeSingle<Usuario>(),
    ]);
    if (!data) return { pendientes: count ?? 0, foto: null };
    const urls = await this.fotoUrls([data.foto_path, data.foto_path_anterior].filter((p): p is string => Boolean(p)));
    return {
      pendientes: count ?? 1,
      foto: {
        usuarioId: data.id,
        nombre: nombreCompleto(data),
        correo: data.correo,
        rol: data.rol,
        matricula: data.matricula,
        carrera: data.carrera,
        subidaAt: data.foto_subida_at ?? "",
        url: data.foto_path ? (urls[data.foto_path] ?? null) : null,
        anteriorUrl: data.foto_path_anterior ? (urls[data.foto_path_anterior] ?? null) : null,
        checks: data.foto_checks,
        excepcion: data.foto_excepcion,
      },
    };
  },

  async revisarFoto(id, subidaAt, decision, revisor) {
    const u = await this.getUsuario(id);
    if (!u) return fail("Usuario no encontrado.");
    if (u.foto_estado !== "pendiente") return fail("Esta foto ya fue revisada.");
    if (!u.foto_subida_at || new Date(u.foto_subida_at).getTime() !== new Date(subidaAt).getTime()) {
      return fail("La persona envió otra foto mientras revisabas. Carga la cola de nuevo.");
    }
    const now = new Date().toISOString();
    const cambios =
      decision.accion === "aprobar"
        ? { foto_estado: "aprobada", foto_path_anterior: null, foto_motivo_rechazo: null }
        : { foto_estado: "rechazada", foto_motivo_rechazo: decision.motivo };
    const { error, count } = await db()
      .from("usuarios")
      .update({ ...cambios, foto_revisada_at: now, foto_revisada_por: revisor }, { count: "exact" })
      .eq("id", id)
      .eq("foto_estado", "pendiente")
      .eq("foto_subida_at", u.foto_subida_at);
    if (error) return fail("No se pudo guardar la decisión.");
    if (!count) return fail("Esta foto ya fue revisada.");
    // Al aprobar, la foto aprobada anterior ya no sirve: se borra del bucket.
    if (decision.accion === "aprobar" && u.foto_path_anterior) await db().storage.from(FOTOS_BUCKET).remove([u.foto_path_anterior]);
    return ok(undefined);
  },

  async listUsuarios() {
    const { data } = await db().from("usuarios").select("*").order("id", { ascending: false }).limit(1000);
    return (data as Usuario[]) ?? [];
  },

  async eliminarUsuario(id) {
    const u = await this.getUsuario(id);
    if (!u) return fail("Usuario no encontrado.");
    await db().from("accesos").delete().eq("usuario_id", id);
    await db().from("vehiculos").delete().eq("usuario_id", id);
    const { error } = await db().from("usuarios").delete().eq("id", id);
    if (error) return fail("No se pudo eliminar el usuario.");
    if (u.auth_id) await db().auth.admin.deleteUser(u.auth_id);
    return ok(undefined);
  },

  async listVehiculos(usuarioId) {
    let q = db().from("vehiculos").select("placa, usuario_id, qr_token, usuarios(nombre, apellido_paterno, apellido_materno, correo)");
    if (usuarioId !== undefined) q = q.eq("usuario_id", usuarioId);
    const { data } = await q.limit(2000);
    type Row = Vehiculo & { usuarios: { nombre: string | null; apellido_paterno: string | null; apellido_materno: string | null; correo: string } | null };
    return ((data as unknown as Row[]) ?? []).map<VehiculoDetalle>(({ usuarios, ...v }) => ({
      ...v,
      propietario: usuarios ? nombreCompleto(usuarios) : "Sin dueño registrado",
      correo: usuarios?.correo ?? "",
      sinDueno: !usuarios,
    }));
  },

  async agregarVehiculo(usuarioId, placa) {
    const v: Vehiculo = { placa, usuario_id: usuarioId, qr_token: newQrToken() };
    const { error } = await db().from("vehiculos").insert(v);
    if (error) return fail(error.code === "23505" ? "Esa placa ya está registrada por otra persona." : "No se pudo registrar el vehículo.");
    return ok(v);
  },

  async eliminarVehiculo(placa, usuarioId) {
    let q = db().from("vehiculos").delete({ count: "exact" }).eq("placa", placa);
    if (usuarioId !== undefined) q = q.eq("usuario_id", usuarioId);
    const { error, count } = await q;
    if (error) return fail("No se pudo eliminar el vehículo.");
    return count ? ok(undefined) : fail("Vehículo no encontrado.");
  },

  async listAccesos(opts = {}) {
    let q = db()
      .from("accesos")
      .select("id, vehiculo_placa, usuario_id, tipo, fecha, usuarios(nombre, apellido_paterno, apellido_materno)")
      .order("fecha", { ascending: false })
      .limit(opts.limit ?? 500);
    if (opts.usuarioId !== undefined) q = q.eq("usuario_id", opts.usuarioId);
    if (opts.desde) q = q.gte("fecha", opts.desde);
    if (opts.hasta) q = q.lt("fecha", opts.hasta);
    const { data } = await q;
    return ((data as unknown as AccesoRow[]) ?? []).map(mapAcceso);
  },

  async contarAccesos(usuarioId) {
    const { count } = await db().from("accesos").select("id", { count: "exact", head: true }).eq("usuario_id", usuarioId);
    return count ?? 0;
  },

  async eliminarAcceso(id) {
    const { error } = await db().from("accesos").delete().eq("id", id);
    return error ? fail("No se pudo eliminar el acceso.") : ok(undefined);
  },

  async registrarLectura<R>(qrToken: string, antes?: (v: PreLectura) => R | null): Promise<ResultadoLectura<R>> {
    const { data: v } = await db()
      .from("vehiculos")
      .select("placa, usuario_id, usuarios(nombre, apellido_paterno, apellido_materno)")
      .eq("qr_token", qrToken)
      .maybeSingle();
    if (!v) return { ok: false, error: "Credencial no reconocida.", code: "NO_REGISTRADO" };
    const veh = v as unknown as { placa: string; usuario_id: number; usuarios: AccesoRow["usuarios"] };
    const { data: ultimo } = await db()
      .from("accesos")
      .select("tipo, fecha")
      .eq("vehiculo_placa", veh.placa)
      .order("fecha", { ascending: false })
      .limit(1)
      .maybeSingle<{ tipo: string; fecha: string }>();
    const rechazo = antes?.({ placa: veh.placa, ultimaFecha: ultimo?.fecha ?? null }) ?? null;
    if (rechazo !== null) return { ok: false, error: "Lectura rechazada.", code: "RECHAZADA", rechazo };
    const tipo = ultimo?.tipo === "entrada" ? "salida" : "entrada";
    const fecha = new Date().toISOString();
    const { error } = await db().from("accesos").insert({ vehiculo_placa: veh.placa, usuario_id: veh.usuario_id, tipo, fecha });
    if (error) return { ok: false, error: "No se pudo registrar el acceso.", code: "ERROR_BD" };
    return { ok: true, data: { tipo, placa: veh.placa, nombre: veh.usuarios ? nombreCompleto(veh.usuarios) : "", fecha } };
  },

  async listBitacora(limit = 200) {
    const { data } = await db().from("bitacora").select("*").order("hora_entrada", { ascending: false }).limit(limit);
    return (data as Bitacora[]) ?? [];
  },

  async agregarBitacora(d: NuevaBitacora) {
    const { data, error } = await db().from("bitacora").insert(d).select("*").single<Bitacora>();
    return error || !data ? fail("No se pudo guardar el registro.") : ok(data);
  },

  async resumen(rango: Rango) {
    // Las 5000 lecturas más recientes alcanzan para 30 días y para saber qué placas siguen dentro.
    const [{ data: accesos }, { data: usuarios }, { data: vehiculos }] = await Promise.all([
      db().from("accesos").select("vehiculo_placa, tipo, fecha").order("fecha", { ascending: false }).limit(5000),
      db().from("usuarios").select("id, rol, foto_estado").limit(10000),
      db().from("vehiculos").select("usuario_id").limit(10000),
    ]);
    return calcularResumen(rango, accesos ?? [], usuarios ?? [], vehiculos ?? []);
  },

  async buscar(qRaw) {
    const vacio: ResultadoBusqueda = { usuarios: [], vehiculos: [], accesos: [] };
    // Solo letras, números, espacios, @ . - _ : evita romper el filtro de PostgREST.
    const q = qRaw.normalize("NFC").replace(/[^\p{L}\p{N}\s@._-]/gu, "").trim().slice(0, 40);
    if (q.length < 2) return vacio;
    const terms = q.toLowerCase().split(/\s+/);
    const first = terms[0]!;
    const placa = q.toUpperCase().replace(/[\s-]/g, "");
    const like = (t: string) => `"%${t}%"`;

    const { data: us } = await db()
      .from("usuarios")
      .select("id, nombre, apellido_paterno, apellido_materno, correo, matricula, rol")
      .or(["nombre", "apellido_paterno", "apellido_materno", "correo", "matricula"].map((c) => `${c}.ilike.${like(first)}`).join(","))
      .limit(50);
    type U = { id: number; nombre: string | null; apellido_paterno: string | null; apellido_materno: string | null; correo: string; matricula: string | null; rol: string | null };
    const usuarios = ((us as U[]) ?? []).filter((u) => {
      const hay = `${nombreCompleto(u)} ${u.correo} ${u.matricula ?? ""}`.toLowerCase();
      return terms.every((t) => hay.includes(t));
    });
    const ids = usuarios.map((u) => u.id);
    const porIds = ids.length ? `,usuario_id.in.(${ids.join(",")})` : "";

    const [{ data: vs }, { data: as }] = await Promise.all([
      db().from("vehiculos").select("placa, usuarios(nombre, apellido_paterno, apellido_materno)").or(`placa.ilike.${like(placa)}${porIds}`).limit(5),
      db()
        .from("accesos")
        .select("id, vehiculo_placa, tipo, fecha, usuarios(nombre, apellido_paterno, apellido_materno)")
        .or(`vehiculo_placa.ilike.${like(placa)}${porIds}`)
        .order("fecha", { ascending: false })
        .limit(5),
    ]);
    type N = { nombre: string | null; apellido_paterno: string | null; apellido_materno: string | null } | null;
    return {
      usuarios: usuarios.slice(0, 5).map((u) => ({
        id: u.id,
        nombre: nombreCompleto(u),
        correo: u.correo,
        detalle: u.matricula ? u.matricula.toUpperCase() : u.rol ? u.rol.charAt(0).toUpperCase() + u.rol.slice(1) : "",
      })),
      vehiculos: ((vs as unknown as { placa: string; usuarios: N }[]) ?? []).map((v) => ({ placa: v.placa, propietario: v.usuarios ? nombreCompleto(v.usuarios) : "Sin dueño registrado" })),
      accesos: ((as as unknown as { id: number; vehiculo_placa: string; tipo: "entrada" | "salida"; fecha: string; usuarios: N }[]) ?? []).map((a) => ({
        id: a.id,
        placa: a.vehiculo_placa,
        tipo: a.tipo,
        fecha: a.fecha,
        nombre: a.usuarios ? nombreCompleto(a.usuarios) : "Usuario eliminado",
      })),
    };
  },
};
