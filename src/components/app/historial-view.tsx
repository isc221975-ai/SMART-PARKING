"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { ArrowClockwise, ClockCounterClockwise, FunnelSimple, SignIn, SignOut } from "@phosphor-icons/react";
import type { AccesoDetalle } from "@/lib/data/types";
import { dayKey } from "@/lib/data/shared";
import { fmtHora } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { EmptyState, Plate } from "@/components/ui/misc";

type Periodo = "hoy" | "7" | "30" | "todo";
type Tipo = "todos" | "entrada" | "salida";

const TZ = "America/Mexico_City";
const diaLargo = new Intl.DateTimeFormat("es-MX", { timeZone: TZ, weekday: "long", day: "numeric", month: "long" });

/** «Hoy», «Ayer» o la fecha larga, en la zona horaria del campus. */
function etiquetaDia(key: string, hoy: string, ayer: string): string {
  if (key === hoy) return "Hoy";
  if (key === ayer) return "Ayer";
  const s = diaLargo.format(new Date(`${key}T12:00:00-06:00`));
  return s.charAt(0).toUpperCase() + s.slice(1);
}

const PERIODOS: { key: Periodo; label: string }[] = [
  { key: "hoy", label: "Hoy" },
  { key: "7", label: "7 días" },
  { key: "30", label: "30 días" },
  { key: "todo", label: "Todo" },
];
const TIPOS: { key: Tipo; label: string }[] = [
  { key: "todos", label: "Todos" },
  { key: "entrada", label: "Entradas" },
  { key: "salida", label: "Salidas" },
];

export function HistorialView({ accesos, dias }: { accesos: AccesoDetalle[]; dias: number }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [periodo, setPeriodo] = useState<Periodo>("todo");
  const [tipo, setTipo] = useState<Tipo>("todos");
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");
  // La fecha de «hoy» se fija al montar para que el filtro no cambie a medianoche a media sesión.
  const [ref] = useState(() => {
    const now = Date.now();
    return { hoy: dayKey(new Date(now)), ayer: dayKey(new Date(now - 86_400_000)), d7: dayKey(new Date(now - 6 * 86_400_000)), d30: dayKey(new Date(now - 29 * 86_400_000)) };
  });
  const filtrosActivos = periodo !== "todo" || tipo !== "todos" || desde !== "" || hasta !== "";

  const grupos = useMemo(() => {
    const min = desde || (periodo === "hoy" ? ref.hoy : periodo === "7" ? ref.d7 : periodo === "30" ? ref.d30 : "");
    const max = hasta || "";
    const map = new Map<string, AccesoDetalle[]>();
    for (const a of accesos) {
      if (tipo !== "todos" && a.tipo !== tipo) continue;
      const k = dayKey(a.fecha);
      if (min && k < min) continue;
      if (max && k > max) continue;
      if (!map.has(k)) map.set(k, []);
      map.get(k)!.push(a);
    }
    return [...map.entries()].sort((a, b) => b[0].localeCompare(a[0]));
  }, [accesos, periodo, tipo, desde, hasta, ref]);

  const total = grupos.reduce((n, [, l]) => n + l.length, 0);

  function limpiar() {
    setPeriodo("todo");
    setTipo("todos");
    setDesde("");
    setHasta("");
  }

  const seg = (active: boolean) =>
    `rounded-lg px-3 py-1.5 caption-1 whitespace-nowrap transition-colors duration-300 ease-weighted ${active ? "bg-surface text-ink shadow-sm" : "text-ink2 hover:text-ink"}`;
  const dateCls =
    "min-h-10 w-full rounded-lg border border-border bg-surface px-3 py-2 body-6 text-ink focus:border-primary focus:outline-none focus:ring-4 focus:ring-[color-mix(in_srgb,var(--color-primary)_18%,transparent)]";

  if (accesos.length === 0) {
    return (
      <EmptyState
        icon={<ClockCounterClockwise size={24} aria-hidden />}
        title="Sin movimientos todavía"
        text={`Cuando muestres tu credencial QR en la caseta, cada entrada y salida de los últimos ${dias} días aparecerá aquí.`}
        action={
          <Button variant="secondary" onClick={() => startTransition(() => router.refresh())} loading={pending}>
            <ArrowClockwise size={18} aria-hidden /> Actualizar
          </Button>
        }
      />
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-4 rounded-2xl border border-border bg-surface p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="flex items-center gap-2 title-4 text-ink">
            <FunnelSimple size={18} aria-hidden /> Filtros
          </p>
          <div className="flex items-center gap-2">
            {filtrosActivos && (
              <Button variant="ghost" size="sm" onClick={limpiar}>
                Limpiar filtros
              </Button>
            )}
            <Button variant="secondary" size="sm" onClick={() => startTransition(() => router.refresh())} loading={pending}>
              {!pending && <ArrowClockwise size={16} aria-hidden />} Actualizar
            </Button>
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="flex flex-col gap-2">
            <p id="periodo-l" className="caption-4 text-ink2">
              Periodo
            </p>
            <div role="radiogroup" aria-labelledby="periodo-l" className="flex gap-1 overflow-x-auto rounded-xl bg-muted p-1">
              {PERIODOS.map((p) => (
                <button
                  key={p.key}
                  type="button"
                  role="radio"
                  aria-checked={periodo === p.key && !desde && !hasta}
                  onClick={() => {
                    setPeriodo(p.key);
                    setDesde("");
                    setHasta("");
                  }}
                  className={`flex-1 ${seg(periodo === p.key && !desde && !hasta)}`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <p id="tipo-l" className="caption-4 text-ink2">
              Tipo
            </p>
            <div role="radiogroup" aria-labelledby="tipo-l" className="flex gap-1 rounded-xl bg-muted p-1">
              {TIPOS.map((t) => (
                <button key={t.key} type="button" role="radio" aria-checked={tipo === t.key} onClick={() => setTipo(t.key)} className={`flex-1 ${seg(tipo === t.key)}`}>
                  {t.label}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <label className="flex flex-col gap-2 caption-4 text-ink2">
            Desde
            <input type="date" value={desde} max={hasta || ref.hoy} onChange={(e) => setDesde(e.target.value)} className={dateCls} />
          </label>
          <label className="flex flex-col gap-2 caption-4 text-ink2">
            Hasta
            <input type="date" value={hasta} min={desde || undefined} max={ref.hoy} onChange={(e) => setHasta(e.target.value)} className={dateCls} />
          </label>
        </div>
      </div>

      <p className="caption-2 text-ink2" aria-live="polite">
        {total === 1 ? "1 movimiento" : `${total} movimientos`}
      </p>

      {pending ? (
        <HistorialSkeleton />
      ) : total === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-border bg-surface px-6 py-12 text-center">
          <p className="body-5 text-ink">Ningún movimiento coincide con los filtros</p>
          <Button variant="ghost" size="sm" onClick={limpiar}>
            Limpiar filtros
          </Button>
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {grupos.map(([k, lista]) => (
            <section key={k} aria-labelledby={`dia-${k}`} className="sp-rise">
              <h2 id={`dia-${k}`} className="flex items-baseline justify-between pb-2 title-4 text-ink">
                {etiquetaDia(k, ref.hoy, ref.ayer)}
                <span className="caption-5 text-ink2">{lista.length === 1 ? "1 movimiento" : `${lista.length} movimientos`}</span>
              </h2>
              <ul className="divide-y divide-border rounded-2xl border border-border bg-surface px-4">
                {lista.map((a) => {
                  const entrada = a.tipo === "entrada";
                  return (
                    <li key={a.id} className="flex items-center gap-3 py-3">
                      <span className={`grid size-9 shrink-0 place-items-center rounded-lg ${entrada ? "bg-[color-mix(in_srgb,var(--color-accent)_16%,transparent)] text-success" : "bg-muted text-ink2"}`}>
                        {entrada ? <SignIn size={18} weight="bold" aria-hidden /> : <SignOut size={18} weight="bold" aria-hidden />}
                      </span>
                      <p className="min-w-0 flex-1 title-4 text-ink">{entrada ? "Entrada" : "Salida"}</p>
                      <Plate placa={a.vehiculo_placa} size="sm" />
                      <time dateTime={a.fecha} className="w-12 text-right font-mono caption-1 text-ink">
                        {fmtHora(a.fecha)}
                      </time>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}

export function HistorialSkeleton() {
  return (
    <div className="flex flex-col gap-6" aria-busy="true" aria-label="Cargando movimientos">
      {[3, 2].map((n, g) => (
        <div key={g}>
          <div className="skeleton mb-2 h-5 w-24" />
          <div className="divide-y divide-border rounded-2xl border border-border bg-surface px-4">
            {Array.from({ length: n }, (_, i) => (
              <div key={i} className="flex items-center gap-3 py-3">
                <div className="skeleton size-9 rounded-lg" />
                <div className="skeleton h-4 flex-1" />
                <div className="skeleton h-6 w-20" />
                <div className="skeleton h-4 w-12" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
