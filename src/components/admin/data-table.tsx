"use client";

import { useEffect, useEffectEvent, useMemo, useState, type ReactNode } from "react";
import { SHELL_EVENT } from "@/components/app/shell/events";
import { DownloadSimple, MagnifyingGlass, Tray } from "@phosphor-icons/react";
import { dayKey } from "@/lib/data/shared";

export interface Column<T> {
  key: string;
  header: string;
  cell: (row: T) => ReactNode;
  csv?: (row: T) => string | number | null;
  className?: string;
}

function toCsv<T>(rows: T[], cols: Column<T>[]): string {
  const esc = (v: unknown) => {
    const s = v === null || v === undefined ? "" : String(v);
    // Evita inyección de fórmulas en Excel
    const safe = /^[=+\-@]/.test(s) ? `'${s}` : s;
    return /[",\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
  };
  const withCsv = cols.filter((c) => c.csv);
  return [withCsv.map((c) => esc(c.header)).join(","), ...rows.map((r) => withCsv.map((c) => esc(c.csv!(r))).join(","))].join("\n");
}

/** Tabla con búsqueda global, filtro de fechas, exportación CSV y vista de tarjetas en móvil. */
export function DataTable<T>({
  rows,
  columns,
  rowKey,
  searchText,
  dateOf,
  filename,
  emptyText,
  mobileCard,
  toolbar,
  initialQuery = "",
  searchPlaceholder = "Buscar por nombre, placa o correo",
}: {
  rows: T[];
  columns: Column<T>[];
  rowKey: (r: T) => string | number;
  searchText: (r: T) => string;
  dateOf?: (r: T) => string;
  filename: string;
  emptyText: string;
  mobileCard: (r: T) => ReactNode;
  toolbar?: ReactNode;
  initialQuery?: string;
  searchPlaceholder?: string;
}) {
  const [q, setQ] = useState(initialQuery);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [limit, setLimit] = useState(50);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return rows.filter((r) => {
      if (term && !searchText(r).toLowerCase().includes(term)) return false;
      if (dateOf) {
        const d = dayKey(dateOf(r));
        if (from && d < from) return false;
        if (to && d > to) return false;
      }
      return true;
    });
  }, [rows, q, from, to, searchText, dateOf]);

  function exportCsv() {
    const blob = new Blob(["﻿" + toCsv(filtered, columns)], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${filename}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // Atajo E / comando «Exportar»: exporta lo filtrado de la tabla visible.
  const onExport = useEffectEvent(() => exportCsv());
  useEffect(() => {
    const handler = () => onExport();
    window.addEventListener(SHELL_EVENT.exportCsv, handler);
    return () => window.removeEventListener(SHELL_EVENT.exportCsv, handler);
  }, []);

  const visible = filtered.slice(0, limit);
  const plural = (n: number) => `${n} ${n === 1 ? "registro" : "registros"}`;
  const inputCls = "min-h-10 rounded-lg border border-border bg-surface px-3 py-2 body-6 text-ink focus:border-primary focus:outline-none focus:ring-4 focus:ring-[color-mix(in_srgb,var(--color-primary)_18%,transparent)]";

  return (
    <div className="@container flex flex-col gap-4">
      <div className="flex flex-col gap-2 @4xl:flex-row @4xl:items-center">
        <label className="relative flex-1">
          <span className="sr-only">Buscar</span>
          <MagnifyingGlass size={18} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink2" aria-hidden />
          <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={searchPlaceholder} className={`${inputCls} w-full pl-10`} />
        </label>
        {/* Móvil: rejilla de 2 columnas; el último control ocupa la fila completa si queda solo. */}
        <div className="grid grid-cols-2 gap-2 [&>:last-child:nth-child(odd)]:col-span-2 @4xl:flex @4xl:items-center">
          {dateOf && (
            <>
              <label className="flex min-w-0 flex-col gap-1 caption-1 text-ink2 @4xl:flex-row @4xl:items-center @4xl:gap-2">
                Desde
                <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className={`${inputCls} w-full min-w-0`} />
              </label>
              <label className="flex min-w-0 flex-col gap-1 caption-1 text-ink2 @4xl:flex-row @4xl:items-center @4xl:gap-2">
                Hasta
                <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className={`${inputCls} w-full min-w-0`} />
              </label>
            </>
          )}
          {toolbar}
          <button onClick={exportCsv} disabled={!filtered.length} className="inline-flex min-h-10 items-center justify-center gap-2 whitespace-nowrap rounded-lg border border-border bg-surface px-3 py-2 button-sm text-ink transition-colors duration-300 ease-weighted hover:bg-muted active:scale-[0.98] disabled:opacity-50">
            <DownloadSimple size={18} aria-hidden /> Exportar CSV
          </button>
        </div>
      </div>

      <p className="caption-2 text-ink2" aria-live="polite">
        {filtered.length === rows.length ? plural(rows.length) : `${filtered.length} de ${plural(rows.length)}`}
      </p>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-border bg-surface px-6 py-12 text-center">
          <Tray size={28} className="text-ink2" aria-hidden />
          <p className="body-5 text-ink">{rows.length ? "Ningún registro coincide con los filtros" : emptyText}</p>
          {rows.length > 0 && (
            <button onClick={() => { setQ(""); setFrom(""); setTo(""); }} className="caption-1 text-primary underline-offset-4 hover:underline">
              Limpiar filtros
            </button>
          )}
        </div>
      ) : (
        <>
          {/* Escritorio */}
          <div className="hidden overflow-x-auto rounded-2xl border border-border bg-surface md:block">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-border bg-muted">
                  {columns.map((c) => (
                    <th key={c.key} scope="col" className={`px-4 py-3 caption-3 uppercase tracking-wider text-ink2 ${c.className ?? ""}`}>
                      {c.header || <span className="sr-only">Acciones</span>}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {visible.map((r) => (
                  <tr key={rowKey(r)} className="transition-colors duration-300 ease-weighted hover:bg-[color-mix(in_srgb,var(--color-muted)_50%,transparent)]">
                    {columns.map((c) => (
                      <td key={c.key} className={`px-4 py-3 body-6 text-ink ${c.className ?? ""}`}>
                        {c.cell(r)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {/* Móvil */}
          <ul className="flex flex-col gap-3 md:hidden">
            {visible.map((r) => (
              <li key={rowKey(r)} className="rounded-2xl border border-border bg-surface p-4">
                {mobileCard(r)}
              </li>
            ))}
          </ul>
          {filtered.length > limit && (
            <button onClick={() => setLimit((l) => l + 50)} className="self-center rounded-lg border border-border bg-surface px-3 py-2 button-sm text-ink hover:bg-muted">
              Mostrar 50 más
            </button>
          )}
        </>
      )}
    </div>
  );
}
