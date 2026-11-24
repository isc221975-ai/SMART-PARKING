"use client";

import { useCallback, useEffect, useId, useState } from "react";
import { ArrowClockwise, Check, CheckCircle, Minus, Warning, X } from "@phosphor-icons/react";
import type { FotoRevision } from "@/lib/data/types";
import { EXCEPCION_LABEL, MOTIVOS_RECHAZO, REGLA_LABEL, type MotivoRechazo } from "@/lib/fotos";
import { fmtFechaHora } from "@/lib/format";
import { ROL_LABEL } from "@/lib/identity";
import { Button, ButtonLink } from "@/components/ui/button";
import { FormAlert } from "@/components/ui/field";
import { Badge, Card, EmptyState } from "@/components/ui/misc";
import { isTyping } from "@/components/app/shell/events";
import { useModal } from "@/components/app/shell/use-modal";

interface Cola {
  pendientes: number;
  foto: FotoRevision | null;
}

const REGLAS = ["R1", "R2", "R3", "R4", "R5", "R6", "R7", "R8", "R9", "R10", "R11"];

function CheckItem({ regla, valor }: { regla: string; valor: unknown }) {
  const v = valor === undefined ? "sin_dato" : valor;
  const alerta = v === "advertencia" || (regla === "R11" && v === "no_aplica");
  const { Icon, cls, texto } =
    v === true
      ? { Icon: Check, cls: "text-success", texto: "Cumple" }
      : v === "advertencia"
        ? { Icon: Warning, cls: "text-warning", texto: "Revisar" }
        : v === "no_aplica"
          ? { Icon: Minus, cls: regla === "R11" ? "text-warning" : "text-ink2", texto: regla === "R11" ? "Sin prueba (archivo)" : "No aplica" }
          : v === false
            ? { Icon: X, cls: "text-danger", texto: "No cumple" }
            : { Icon: Minus, cls: "text-ink2", texto: "Sin dato" };
  return (
    <li className={`flex items-center justify-between gap-2 rounded-lg px-3 py-2 ${alerta ? "bg-[color-mix(in_srgb,var(--color-warning)_12%,var(--color-surface))]" : "bg-muted"}`}>
      <span className="caption-2 text-ink">
        <span className="font-mono text-ink2">{regla}</span> {REGLA_LABEL[regla]}
      </span>
      <span className={`flex items-center gap-1 caption-3 ${cls}`}>
        <Icon size={14} weight="bold" aria-hidden /> {texto}
      </span>
    </li>
  );
}

/** Revisión de fotos: una a la vez, la más antigua primero. A aprueba, R rechaza. */
export function FotoReview({ initial }: { initial: Cola }) {
  const [cola, setCola] = useState<Cola>(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rechazando, setRechazando] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);
  const f = cola.foto;

  const cargar = useCallback(async () => {
    const res = await fetch("/api/admin/fotos", { cache: "no-store" }).catch(() => null);
    if (!res?.ok) {
      setError(res?.status === 401 ? "Tu sesión de administrador se cerró. Vuelve a iniciar sesión." : "No se pudo cargar la siguiente foto.");
      return;
    }
    setCola(await res.json());
  }, []);

  const decidir = useCallback(
    async (body: { accion: "aprobar" } | { accion: "rechazar"; motivo: MotivoRechazo; detalle?: string }): Promise<{ ok: boolean; status?: number; error?: string }> => {
      if (!f) return { ok: false };
      setBusy(true);
      setError(null);
      const res = await fetch(`/api/admin/fotos/${f.usuarioId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...body, subidaAt: f.subidaAt }),
      }).catch(() => null);
      if (!res?.ok) {
        setBusy(false);
        const msg = res ? ((await res.json().catch(() => ({}))).error ?? "No se pudo guardar la decisión.") : "Sin conexión.";
        setError(msg);
        // Si otra persona ya la revisó o el alumno envió otra, se recarga la cola.
        if (res?.status === 409) void cargar();
        return { ok: false, status: res?.status, error: msg };
      }
      setAviso(body.accion === "aprobar" ? `Foto de ${f.nombre} aprobada.` : `Foto de ${f.nombre} rechazada.`);
      await cargar();
      setBusy(false);
      return { ok: true };
    },
    [f, cargar],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!f || busy || rechazando || e.ctrlKey || e.metaKey || e.altKey || isTyping(e.target) || document.querySelector("dialog[open]")) return;
      const k = e.key.toLowerCase();
      if (k === "a") {
        e.preventDefault();
        void decidir({ accion: "aprobar" });
      } else if (k === "r") {
        e.preventDefault();
        setRechazando(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [f, busy, rechazando, decidir]);

  if (!f) {
    return (
      <div className="flex flex-col gap-4">
        {aviso && <FormAlert tone="success">{aviso}</FormAlert>}
        {error && <FormAlert>{error}</FormAlert>}
        <EmptyState
          icon={<CheckCircle size={24} weight="bold" aria-hidden />}
          title="No hay fotos por revisar"
          text="Cuando alguien envíe su foto de perfil aparecerá aquí, empezando por la más antigua."
          action={
            <Button variant="secondary" onClick={() => void cargar()}>
              <ArrowClockwise size={18} aria-hidden /> Buscar de nuevo
            </Button>
          }
        />
      </div>
    );
  }

  const esAlumno = f.rol === "estudiante";
  const avisos = (["R5", "R6", "R7"] as const).filter((r) => f.checks?.[r] === "advertencia");
  return (
    <div className="flex flex-col gap-4">
      <div aria-live="polite">{aviso && <FormAlert tone="success">{aviso}</FormAlert>}</div>
      {error && <FormAlert>{error}</FormAlert>}

      <div key={`${f.usuarioId}-${f.subidaAt}`} className="grid items-start gap-6 lg:grid-cols-[minmax(0,360px)_1fr]">
        <div className="sp-rise flex flex-col gap-3">
          {f.url ? (
            // eslint-disable-next-line @next/next/no-img-element -- URL firmada de 5 minutos, no se cachea
            <img src={f.url} alt={`Foto enviada por ${f.nombre}`} className="aspect-[3/4] w-full rounded-2xl border border-border bg-muted object-cover" />
          ) : (
            <div className="grid aspect-[3/4] w-full place-items-center rounded-2xl border border-dashed border-border bg-muted body-6 text-ink2">No se encontró el archivo</div>
          )}
          {f.anteriorUrl && (
            <div className="flex items-center gap-3 rounded-xl border border-border bg-surface p-3">
              {/* eslint-disable-next-line @next/next/no-img-element -- URL firmada de 5 minutos */}
              <img src={f.anteriorUrl} alt={`Foto aprobada actual de ${f.nombre}`} className="h-16 w-12 rounded-md object-cover" />
              <p className="caption-2 text-ink2">Foto aprobada actual. Si apruebas la nueva, esta se borra.</p>
            </div>
          )}
        </div>

        <Card className="sp-rise p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <h2 className="title-1 break-words text-ink">{f.nombre}</h2>
              <p className="body-6 break-words text-ink2">{f.correo}</p>
            </div>
            <Badge tone="warning">
              {cola.pendientes} pendiente{cola.pendientes === 1 ? "" : "s"}
            </Badge>
          </div>

          <dl className="mt-5 grid grid-cols-2 gap-4 border-t border-border pt-4">
            {(esAlumno
              ? [
                  ["Matrícula", f.matricula?.toUpperCase() ?? "—"],
                  ["Carrera", f.carrera ?? "—"],
                ]
              : [["Tipo de cuenta", f.rol ? ROL_LABEL[f.rol] : "Sin tipo"]]
            ).map(([k, v]) => (
              <div key={k} className="flex flex-col gap-0.5">
                <dt className="caption-4 text-ink2">{k}</dt>
                <dd className={`body-5 break-words text-ink ${k === "Matrícula" ? "font-mono" : ""}`}>{v}</dd>
              </div>
            ))}
            <div className="flex flex-col gap-0.5">
              <dt className="caption-4 text-ink2">Enviada</dt>
              <dd className="body-5 text-ink">{f.subidaAt ? fmtFechaHora(f.subidaAt) : "—"}</dd>
            </div>
            <div className="flex flex-col gap-0.5">
              <dt className="caption-4 text-ink2">Excepción</dt>
              <dd className="body-5 text-ink">{f.excepcion ? <Badge tone="primary">{EXCEPCION_LABEL[f.excepcion]}</Badge> : "Ninguna"}</dd>
            </div>
          </dl>

          <h3 className="title-4 pt-6 text-ink">Prevalidación del teléfono</h3>
          <p className="caption-2 pb-3 text-ink2">
            {avisos.length
              ? "Las heurísticas marcadas pueden ser falsas alarmas: confírmalo viendo la foto."
              : "Referencia: el teléfono revisó cada regla antes de enviar. La decisión es tuya."}
          </p>
          {f.checks ? (
            <ul className="grid gap-2 sm:grid-cols-2">
              {REGLAS.map((r) => (
                <CheckItem key={r} regla={r} valor={f.checks?.[r]} />
              ))}
            </ul>
          ) : (
            <p className="body-6 text-ink2">Esta foto no trae prevalidación.</p>
          )}

          <div className="flex flex-col-reverse gap-2 border-t border-border pt-5 mt-6 sm:flex-row sm:justify-end">
            <Button variant="danger" onClick={() => setRechazando(true)} disabled={busy}>
              <X size={18} aria-hidden /> Rechazar <kbd className="hidden rounded border border-border px-1.5 font-mono caption-5 sm:inline">R</kbd>
            </Button>
            <Button onClick={() => void decidir({ accion: "aprobar" })} loading={busy}>
              {!busy && <Check size={18} aria-hidden />} Aprobar <kbd className="hidden rounded border border-[color-mix(in_srgb,var(--color-on-primary)_40%,transparent)] px-1.5 font-mono caption-5 sm:inline">A</kbd>
            </Button>
          </div>
        </Card>
      </div>

      <RechazoDialog
        open={rechazando}
        nombre={f.nombre}
        busy={busy}
        onClose={() => setRechazando(false)}
        onSubmit={async (motivo, detalle) => {
          const r = await decidir({ accion: "rechazar", motivo, detalle });
          // 409: la cola ya se recargó con otra foto; el aviso queda en la página.
          if (r.ok || r.status === 409) {
            setRechazando(false);
            return null;
          }
          return r.error ?? "No se pudo guardar la decisión.";
        }}
      />
      <ButtonLink href="/admin/usuarios" variant="ghost" size="sm" className="self-start">
        Ver todos los usuarios
      </ButtonLink>
    </div>
  );
}

function RechazoDialog({
  open,
  nombre,
  busy,
  onClose,
  onSubmit,
}: {
  open: boolean;
  nombre: string;
  busy: boolean;
  onClose: () => void;
  /** Devuelve el error que se muestra dentro del diálogo, o null si salió bien. */
  onSubmit: (motivo: MotivoRechazo, detalle?: string) => Promise<string | null>;
}) {
  const id = useId();
  const [motivo, setMotivo] = useState<MotivoRechazo | null>(null);
  const [detalle, setDetalle] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const dialog = useModal(open, () => {
    setMotivo(null);
    setDetalle("");
    setErr(null);
    onClose();
  });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!motivo) return setErr("Elige un motivo.");
    if (motivo === "otro" && detalle.trim().length < 5) return setErr("Describe el motivo en al menos 5 caracteres.");
    setErr(null);
    setErr(await onSubmit(motivo, motivo === "otro" ? detalle.trim() : undefined));
  }

  return (
    <dialog {...dialog} aria-labelledby={`${id}-t`} className="sp-dialog m-auto w-[min(92vw,460px)] rounded-2xl border border-border bg-surface p-6 text-ink backdrop:bg-black/50 backdrop:backdrop-blur-sm">
      <form onSubmit={submit} className="flex flex-col gap-4">
        <div>
          <p id={`${id}-t`} className="title-2 text-ink">
            Rechazar la foto
          </p>
          <p className="body-6 pt-1 text-ink2">{nombre} verá el motivo en su perfil y podrá tomar otra.</p>
        </div>
        <fieldset className="flex flex-col gap-1">
          <legend className="sr-only">Motivo</legend>
          {MOTIVOS_RECHAZO.map((m) => (
            <label key={m.value} className="flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2 body-5 text-ink hover:bg-muted has-[:checked]:bg-muted">
              <input type="radio" name={`${id}-motivo`} value={m.value} checked={motivo === m.value} onChange={() => setMotivo(m.value)} className="size-4 accent-[var(--color-primary)]" />
              {m.label}
            </label>
          ))}
        </fieldset>
        {motivo === "otro" && (
          <textarea
            autoFocus
            aria-label="Describe el motivo"
            placeholder="Describe el motivo"
            maxLength={200}
            rows={3}
            value={detalle}
            onChange={(e) => setDetalle(e.target.value)}
            className="w-full rounded-lg border border-border bg-surface px-3 py-2 body-3 text-ink placeholder:text-ink2/70 focus:border-primary focus:outline-none focus:ring-4 focus:ring-[color-mix(in_srgb,var(--color-primary)_18%,transparent)]"
          />
        )}
        {err && <p role="alert" className="caption-2 text-danger">{err}</p>}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" size="sm" onClick={() => dialog.ref.current?.close()}>
            Cancelar
          </Button>
          <Button type="submit" variant="danger" size="sm" loading={busy}>
            Rechazar foto
          </Button>
        </div>
      </form>
    </dialog>
  );
}
