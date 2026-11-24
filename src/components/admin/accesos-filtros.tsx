"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { SegmentedLinks } from "./segmented-links";

const RANGOS = [
  { key: "hoy", label: "Hoy" },
  { key: "7", label: "7 días" },
  { key: "30", label: "30 días" },
  { key: "90", label: "90 días" },
];

/** Rango de fechas de Accesos: rápido (enlaces) o personalizado (Desde/Hasta). Vive en la URL. */
export function AccesosFiltros({ rango, desde, hasta, hoy }: { rango: string; desde: string; hasta: string; hoy: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [d, setD] = useState(desde);
  const [h, setH] = useState(hasta);
  const personalizado = rango === "personalizado";
  const cls =
    "min-h-10 w-full rounded-lg border border-border bg-surface px-3 py-2 body-6 text-ink focus:border-primary focus:outline-none focus:ring-4 focus:ring-[color-mix(in_srgb,var(--color-primary)_18%,transparent)]";

  function aplicar(e: React.FormEvent) {
    e.preventDefault();
    if (!d && !h) return;
    const p = new URLSearchParams();
    if (d) p.set("desde", d);
    if (h) p.set("hasta", h);
    start(() => router.push(`/admin/accesos?${p}`, { scroll: false }));
  }

  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-border bg-surface p-4 lg:flex-row lg:items-end lg:justify-between">
      <div className="flex flex-col gap-2">
        <p className="caption-4 text-ink2">Periodo</p>
        <SegmentedLinks label="Periodo rápido" current={personalizado ? "" : rango} items={RANGOS.map((r) => ({ ...r, href: r.key === "7" ? "/admin/accesos" : `/admin/accesos?rango=${r.key}` }))} />
      </div>
      <form onSubmit={aplicar} className="grid grid-cols-2 gap-2 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
        <label className="flex flex-col gap-2 caption-4 text-ink2">
          Desde
          <input type="date" value={d} max={h || hoy} onChange={(e) => setD(e.target.value)} className={cls} />
        </label>
        <label className="flex flex-col gap-2 caption-4 text-ink2">
          Hasta
          <input type="date" value={h} min={d || undefined} max={hoy} onChange={(e) => setH(e.target.value)} className={cls} />
        </label>
        <div className="col-span-2 flex gap-2 sm:col-span-1">
          <Button type="submit" variant="secondary" loading={pending} disabled={!d && !h} className="flex-1">
            Aplicar
          </Button>
          {personalizado && (
            <Button type="button" variant="ghost" onClick={() => start(() => router.push("/admin/accesos", { scroll: false }))}>
              Limpiar
            </Button>
          )}
        </div>
      </form>
    </div>
  );
}
