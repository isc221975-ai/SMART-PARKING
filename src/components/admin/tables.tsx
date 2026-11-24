"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Camera, Car, SignIn, SignOut, Trash, WarningCircle } from "@phosphor-icons/react";
import type { AccesoDetalle, Bitacora, Rol, VehiculoDetalle } from "@/lib/data/types";
import type { EstadoFoto } from "@/lib/supabase/types";
import { fmtFechaHora } from "@/lib/format";
import { ROL_LABEL } from "@/lib/identity";
import { Badge, Plate } from "@/components/ui/misc";
import { FormAlert } from "@/components/ui/field";
import { ButtonLink } from "@/components/ui/button";
import { useConfirm } from "@/components/app/confirm";
import { Avatar } from "@/components/app/avatar";
import { DataTable, type Column } from "./data-table";

function useDelete() {
  const router = useRouter();
  const confirm = useConfirm();
  const [error, setError] = useState<string | null>(null);
  async function run(url: string, title: string, text: string, label: string) {
    if (!(await confirm({ title, text, confirmLabel: label }))) return;
    setError(null);
    const res = await fetch(url, { method: "DELETE" });
    if (!res.ok) setError((await res.json().catch(() => ({}))).error ?? "No se pudo borrar.");
    router.refresh();
  }
  return { run, error };
}

function DeleteBtn({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} aria-label={label} className="grid size-9 place-items-center rounded-lg text-ink2 transition-colors duration-300 ease-weighted hover:bg-muted hover:text-danger">
      <Trash size={18} aria-hidden />
    </button>
  );
}

function TipoBadge({ tipo }: { tipo: string }) {
  return tipo === "entrada" ? (
    <Badge tone="accent">
      <SignIn size={12} weight="bold" aria-hidden /> Entrada
    </Badge>
  ) : (
    <Badge>
      <SignOut size={12} weight="bold" aria-hidden /> Salida
    </Badge>
  );
}

const selectCls = "min-h-10 rounded-lg border border-border bg-surface px-3 py-2 body-6 text-ink";

/* ───── Accesos ───── */
export function AccesosTable({ rows, initialQuery }: { rows: AccesoDetalle[]; initialQuery?: string }) {
  const del = useDelete();
  const [tipo, setTipo] = useState<"" | "entrada" | "salida">("");
  const data = tipo ? rows.filter((r) => r.tipo === tipo) : rows;
  const remove = (r: AccesoDetalle) =>
    del.run(`/api/admin/accesos/${r.id}`, "¿Borrar este acceso?", `Se borrará la ${r.tipo} de ${r.vehiculo_placa} del ${fmtFechaHora(r.fecha)}. No se puede deshacer.`, "Borrar acceso");
  const etiqueta = (r: AccesoDetalle) => `Borrar el acceso de ${r.vehiculo_placa} del ${fmtFechaHora(r.fecha)}`;
  const columns: Column<AccesoDetalle>[] = [
    {
      key: "fecha",
      header: "Hora",
      cell: (r) => (
        <time dateTime={r.fecha} className="font-mono">
          {fmtFechaHora(r.fecha)}
        </time>
      ),
      csv: (r) => r.fecha,
    },
    { key: "placa", header: "Placa", cell: (r) => <Plate placa={r.vehiculo_placa} size="sm" />, csv: (r) => r.vehiculo_placa },
    { key: "nombre", header: "Persona", cell: (r) => r.nombre, csv: (r) => r.nombre },
    { key: "tipo", header: "Tipo", cell: (r) => <TipoBadge tipo={r.tipo} />, csv: (r) => r.tipo },
    { key: "acc", header: "", className: "w-12 text-right", cell: (r) => <DeleteBtn label={etiqueta(r)} onClick={() => remove(r)} /> },
  ];
  return (
    <div className="flex flex-col gap-4">
      {del.error && <FormAlert>{del.error}</FormAlert>}
      <DataTable
        rows={data}
        columns={columns}
        rowKey={(r) => r.id}
        searchText={(r) => `${r.nombre} ${r.vehiculo_placa}`}
        searchPlaceholder="Buscar por placa o persona"
        initialQuery={initialQuery}
        filename="accesos"
        emptyText="No hay accesos en este periodo."
        toolbar={
          <select value={tipo} onChange={(e) => setTipo(e.target.value as typeof tipo)} aria-label="Filtrar por tipo" className={selectCls}>
            <option value="">Entradas y salidas</option>
            <option value="entrada">Solo entradas</option>
            <option value="salida">Solo salidas</option>
          </select>
        }
        mobileCard={(r) => (
          <div className="flex items-center gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <TipoBadge tipo={r.tipo} />
                <Plate placa={r.vehiculo_placa} size="sm" />
              </div>
              <p className="truncate title-4 pt-2 text-ink">{r.nombre}</p>
              <time dateTime={r.fecha} className="font-mono caption-5 text-ink2">
                {fmtFechaHora(r.fecha)}
              </time>
            </div>
            <DeleteBtn label={etiqueta(r)} onClick={() => remove(r)} />
          </div>
        )}
      />
    </div>
  );
}

/* ───── Vehículos ───── */
function Propietario({ r }: { r: VehiculoDetalle }) {
  return r.sinDueno ? (
    <Badge tone="warning">
      <WarningCircle size={12} weight="bold" aria-hidden /> Sin dueño registrado
    </Badge>
  ) : (
    <span>{r.propietario}</span>
  );
}

export function VehiculosTable({ rows, initialQuery }: { rows: VehiculoDetalle[]; initialQuery?: string }) {
  const del = useDelete();
  const remove = (r: VehiculoDetalle) =>
    del.run(
      `/api/vehiculos/${encodeURIComponent(r.placa)}`,
      `¿Borrar el vehículo ${r.placa}?`,
      `${r.sinDueno ? "No tiene dueño registrado." : `Pertenece a ${r.propietario}.`} Su credencial QR dejará de funcionar y se borrarán los accesos registrados con esa placa. No se puede deshacer.`,
      "Borrar vehículo",
    );
  const columns: Column<VehiculoDetalle>[] = [
    { key: "placa", header: "Placa", cell: (r) => <Plate placa={r.placa} size="sm" />, csv: (r) => r.placa },
    { key: "prop", header: "Propietario", cell: (r) => <Propietario r={r} />, csv: (r) => (r.sinDueno ? "Sin dueño registrado" : r.propietario) },
    { key: "correo", header: "Correo", cell: (r) => <span className="text-ink2">{r.correo || "—"}</span>, csv: (r) => r.correo },
    { key: "acc", header: "", className: "w-12 text-right", cell: (r) => <DeleteBtn label={`Borrar ${r.placa}`} onClick={() => remove(r)} /> },
  ];
  return (
    <div className="flex flex-col gap-4">
      {del.error && <FormAlert>{del.error}</FormAlert>}
      <DataTable
        rows={rows}
        columns={columns}
        rowKey={(r) => r.placa}
        searchText={(r) => `${r.placa} ${r.propietario} ${r.correo}`}
        searchPlaceholder="Buscar por placa, propietario o correo"
        initialQuery={initialQuery}
        filename="vehiculos"
        emptyText="Aún no hay vehículos registrados."
        mobileCard={(r) => (
          <div className="flex items-center gap-3">
            <div className="min-w-0 flex-1">
              <Plate placa={r.placa} size="sm" />
              <div className="truncate title-4 pt-2 text-ink">
                <Propietario r={r} />
              </div>
              {r.correo && <p className="truncate caption-5 text-ink2">{r.correo}</p>}
            </div>
            <DeleteBtn label={`Borrar ${r.placa}`} onClick={() => remove(r)} />
          </div>
        )}
      />
    </div>
  );
}

/* ───── Usuarios ───── */
export interface UsuarioFila {
  id: number;
  nombre: string;
  correo: string;
  rol: Rol | null;
  matricula: string | null;
  carrera: string | null;
  semestre: number | null;
  vehiculos: number;
  fotoUrl: string | null;
  foto_estado: EstadoFoto;
}

const FOTO_TONE = { sin_foto: "neutral", pendiente: "warning", aprobada: "success", rechazada: "danger" } as const;
const FOTO_LABEL = { sin_foto: "Sin foto", pendiente: "Por revisar", aprobada: "Aprobada", rechazada: "Rechazada" } as const;

export function UsuariosTable({ rows, initialQuery, soloPendientes = false }: { rows: UsuarioFila[]; initialQuery?: string; soloPendientes?: boolean }) {
  const del = useDelete();
  const [pendientes, setPendientes] = useState(soloPendientes);
  const nPendientes = rows.filter((u) => u.foto_estado === "pendiente").length;
  const data = pendientes ? rows.filter((u) => u.foto_estado === "pendiente") : rows;
  const esAlumno = (u: UsuarioFila) => u.rol === "estudiante";
  const remove = (u: UsuarioFila) =>
    del.run(`/api/admin/usuarios/${u.id}`, `¿Borrar a ${u.nombre}?`, "También se borrarán sus vehículos, sus accesos y su cuenta de acceso. No se puede deshacer.", "Borrar usuario");
  const columns: Column<UsuarioFila>[] = [
    { key: "foto", header: "Foto", className: "w-14", cell: (u) => <Avatar src={u.fotoUrl} name={u.nombre} size={36} /> },
    {
      key: "nombre",
      header: "Nombre",
      cell: (u) => (
        <span className="flex flex-col items-start gap-1">
          <span className="font-medium">{u.nombre}</span>
          {u.foto_estado !== "aprobada" && <Badge tone={FOTO_TONE[u.foto_estado]}>{FOTO_LABEL[u.foto_estado]}</Badge>}
        </span>
      ),
      csv: (u) => u.nombre,
    },
    { key: "mat", header: "Matrícula", cell: (u) => <span className="font-mono">{esAlumno(u) ? (u.matricula?.toUpperCase() ?? "—") : "—"}</span>, csv: (u) => (esAlumno(u) ? (u.matricula?.toUpperCase() ?? "") : "") },
    { key: "correo", header: "Correo", cell: (u) => <span className="text-ink2">{u.correo}</span>, csv: (u) => u.correo },
    { key: "carrera", header: "Carrera", cell: (u) => <span className="text-ink2">{esAlumno(u) ? (u.carrera ?? "—") : "—"}</span>, csv: (u) => (esAlumno(u) ? (u.carrera ?? "") : "") },
    { key: "sem", header: "Semestre", className: "text-center", cell: (u) => (esAlumno(u) && u.semestre ? `${u.semestre}.º` : "—"), csv: (u) => (esAlumno(u) ? u.semestre : null) },
    { key: "rol", header: "Tipo", cell: (u) => (u.rol ? ROL_LABEL[u.rol] : "Sin tipo"), csv: (u) => (u.rol ? ROL_LABEL[u.rol] : "") },
    { key: "veh", header: "Vehículos", className: "text-center", cell: (u) => <span className="font-mono">{u.vehiculos}</span>, csv: (u) => u.vehiculos },
    { key: "acc", header: "", className: "w-12 text-right", cell: (u) => <DeleteBtn label={`Borrar a ${u.nombre}`} onClick={() => remove(u)} /> },
  ];
  return (
    <div className="flex flex-col gap-4">
      {nPendientes > 0 && (
        <div className="flex flex-col gap-3 rounded-2xl border border-border bg-[color-mix(in_srgb,var(--color-warning)_8%,var(--color-surface))] p-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="flex items-center gap-2 body-5 text-ink">
            <Camera size={18} className="text-warning" aria-hidden /> Fotos por revisar ({nPendientes})
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              aria-pressed={pendientes}
              onClick={() => setPendientes((p) => !p)}
              className="rounded-lg border border-border bg-surface px-3 py-2 button-sm text-ink transition-colors duration-300 ease-weighted hover:bg-muted"
            >
              {pendientes ? "Ver todos los usuarios" : "Ver solo pendientes"}
            </button>
            <ButtonLink href="/admin/fotos" size="sm">
              Revisar fotos
            </ButtonLink>
          </div>
        </div>
      )}
      {del.error && <FormAlert>{del.error}</FormAlert>}
      <DataTable
        rows={data}
        columns={columns}
        rowKey={(u) => u.id}
        searchText={(u) => `${u.nombre} ${u.correo} ${u.matricula ?? ""} ${u.carrera ?? ""}`}
        searchPlaceholder="Buscar por nombre, matrícula o correo"
        initialQuery={initialQuery}
        filename="usuarios"
        emptyText="Aún no hay usuarios registrados."
        mobileCard={(u) => (
          <div className="flex items-start gap-3">
            <Avatar src={u.fotoUrl} name={u.nombre} size={44} />
            <div className="min-w-0 flex-1">
              <p className="truncate title-4 text-ink">{u.nombre}</p>
              <p className="truncate caption-5 text-ink2">{u.correo}</p>
              {esAlumno(u) && (
                <p className="caption-5 pt-1 text-ink2">
                  <span className="font-mono">{u.matricula?.toUpperCase()}</span>
                  {u.semestre ? ` · ${u.semestre}.º semestre` : ""}
                  {u.carrera ? ` · ${u.carrera}` : ""}
                </p>
              )}
              <div className="flex flex-wrap gap-2 pt-2">
                <Badge>{u.rol ? ROL_LABEL[u.rol] : "Sin tipo"}</Badge>
                <Badge>
                  <Car size={12} weight="bold" aria-hidden /> {u.vehiculos} {u.vehiculos === 1 ? "vehículo" : "vehículos"}
                </Badge>
                {u.foto_estado !== "aprobada" && <Badge tone={FOTO_TONE[u.foto_estado]}>{FOTO_LABEL[u.foto_estado]}</Badge>}
              </div>
            </div>
            <DeleteBtn label={`Borrar a ${u.nombre}`} onClick={() => remove(u)} />
          </div>
        )}
      />
    </div>
  );
}

/* ───── Bitácora ───── */
export function BitacoraTable({ rows }: { rows: Bitacora[] }) {
  const columns: Column<Bitacora>[] = [
    { key: "ent", header: "Entrada", cell: (r) => <span className="font-mono">{fmtFechaHora(r.hora_entrada)}</span>, csv: (r) => r.hora_entrada },
    { key: "sal", header: "Salida", cell: (r) => (r.hora_salida ? <span className="font-mono">{fmtFechaHora(r.hora_salida)}</span> : <Badge tone="warning">Dentro</Badge>), csv: (r) => r.hora_salida },
    { key: "nom", header: "Conductor", cell: (r) => r.nombre_conductor, csv: (r) => r.nombre_conductor },
    { key: "emp", header: "Empresa", cell: (r) => r.empresa, csv: (r) => r.empresa },
    { key: "asu", header: "Asunto", cell: (r) => <span className="text-ink2">{r.asunto}</span>, csv: (r) => r.asunto },
    { key: "pla", header: "Placa", cell: (r) => (r.placa ? <Plate placa={r.placa} size="sm" /> : "Sin placa"), csv: (r) => r.placa },
  ];
  return (
    <DataTable
      rows={rows}
      columns={columns}
      rowKey={(r) => r.id}
      searchText={(r) => `${r.nombre_conductor} ${r.empresa} ${r.asunto} ${r.placa ?? ""}`}
      dateOf={(r) => r.hora_entrada}
      filename="bitacora"
      emptyText="Aún no hay visitantes registrados."
      mobileCard={(r) => (
        <div>
          <div className="flex items-center justify-between gap-2">
            <p className="truncate title-4 text-ink">{r.nombre_conductor}</p>
            {r.placa && <Plate placa={r.placa} size="sm" />}
          </div>
          <p className="caption-5 text-ink2">{r.empresa}</p>
          <p className="body-6 pt-2 text-ink2">{r.asunto}</p>
          <p className="font-mono caption-5 pt-2 text-ink2">
            {fmtFechaHora(r.hora_entrada)} → {r.hora_salida ? fmtFechaHora(r.hora_salida) : "dentro"}
          </p>
        </div>
      )}
    />
  );
}
