"use client";

import { useRouter } from "next/navigation";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { Car, ListChecks, MagnifyingGlass, User, type Icon } from "@phosphor-icons/react";
import type { ResultadoBusqueda } from "@/lib/data/types";
import { fmtFechaHora } from "@/lib/format";
import { useModal } from "./use-modal";

interface Item {
  id: string;
  grupo: string;
  icon: Icon;
  titulo: string;
  detalle: string;
  href: string;
}

type Estado = { tipo: "inicio" } | { tipo: "cargando" } | { tipo: "error" } | { tipo: "listo"; data: ResultadoBusqueda };

/** Búsqueda global del panel (tecla /): usuarios, vehículos y accesos por placa, nombre o matrícula. */
export function GlobalSearch({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [estado, setEstado] = useState<Estado>({ tipo: "inicio" });
  const [active, setActive] = useState(0);
  const listId = useId();
  const seq = useRef(0);
  const dialog = useModal(open, () => {
    setQ("");
    setEstado({ tipo: "inicio" });
    setActive(0);
    onClose();
  });

  // Búsqueda con espera de 200 ms; descarta respuestas de consultas anteriores.
  useEffect(() => {
    const term = q.trim();
    if (term.length < 2) return;
    const id = ++seq.current;
    const t = setTimeout(async () => {
      setEstado({ tipo: "cargando" });
      try {
        const res = await fetch(`/api/admin/buscar?q=${encodeURIComponent(term)}`);
        if (!res.ok) throw new Error();
        const data = (await res.json()) as ResultadoBusqueda;
        if (id === seq.current) {
          setEstado({ tipo: "listo", data });
          setActive(0);
        }
      } catch {
        if (id === seq.current) setEstado({ tipo: "error" });
      }
    }, 200);
    return () => clearTimeout(t);
  }, [q]);

  const items = useMemo<Item[]>(() => {
    if (estado.tipo !== "listo" || q.trim().length < 2) return [];
    const { usuarios, vehiculos, accesos } = estado.data;
    return [
      ...usuarios.map((u) => ({ id: `u${u.id}`, grupo: "Usuarios", icon: User, titulo: u.nombre, detalle: [u.detalle, u.correo].filter(Boolean).join(" · "), href: `/admin/usuarios?q=${encodeURIComponent(u.correo)}` })),
      ...vehiculos.map((v) => ({ id: `v${v.placa}`, grupo: "Vehículos", icon: Car, titulo: v.placa, detalle: v.propietario, href: `/admin/vehiculos?q=${encodeURIComponent(v.placa)}` })),
      ...accesos.map((a) => ({
        id: `a${a.id}`,
        grupo: "Accesos recientes",
        icon: ListChecks,
        titulo: `${a.tipo === "entrada" ? "Entrada" : "Salida"} · ${a.placa}`,
        detalle: `${a.nombre} · ${fmtFechaHora(a.fecha)}`,
        href: `/admin/accesos?rango=90&q=${encodeURIComponent(a.placa)}`,
      })),
    ];
  }, [estado, q]);

  function go(it: Item) {
    dialog.ref.current?.close();
    router.push(it.href);
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.nativeEvent.isComposing) return;
    if ((e.key === "ArrowDown" || e.key === "ArrowUp") && items.length) {
      e.preventDefault();
      setActive((i) => (i + (e.key === "ArrowDown" ? 1 : -1) + items.length) % items.length);
    } else if (e.key === "Enter" && items[active]) {
      e.preventDefault();
      go(items[active]);
    }
  }

  const corto = q.trim().length < 2;
  const vacio = estado.tipo === "listo" && !corto && items.length === 0;
  return (
    <dialog {...dialog} aria-label="Buscar en el panel" className="sp-dialog mx-auto mt-[12vh] mb-auto w-[min(92vw,600px)] rounded-2xl border border-border bg-surface p-0 text-ink shadow-2xl backdrop:bg-black/50 backdrop:backdrop-blur-sm">
      <div className="flex items-center gap-3 border-b border-border px-4">
        <MagnifyingGlass size={20} className="shrink-0 text-ink2" aria-hidden />
        <input
          autoFocus
          type="search"
          role="combobox"
          aria-expanded={items.length > 0}
          aria-controls={listId}
          aria-activedescendant={items[active] ? `${listId}-${items[active].id}` : undefined}
          aria-label="Buscar por placa, nombre, matrícula o correo"
          placeholder="Placa, nombre, matrícula o correo"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={onKeyDown}
          autoComplete="off"
          spellCheck={false}
          className="min-h-14 flex-1 bg-transparent body-3 text-ink placeholder:text-ink2 focus:outline-none [&::-webkit-search-cancel-button]:hidden"
        />
        <kbd className="hidden rounded-md border border-border px-2 py-0.5 font-mono caption-5 text-ink2 sm:inline">Esc</kbd>
      </div>
      <div className="max-h-[min(60vh,440px)] overflow-y-auto p-2" aria-live="polite">
        {corto && <p className="px-3 py-8 text-center body-6 text-ink2">Escribe al menos 2 caracteres. Busca en usuarios, vehículos y accesos.</p>}
        {!corto && estado.tipo === "cargando" && (
          <div className="flex flex-col gap-2 p-2" aria-label="Buscando">
            {[0, 1, 2].map((i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="skeleton size-8 rounded-lg" />
                <div className="flex flex-1 flex-col gap-1">
                  <div className="skeleton h-4 w-1/2" />
                  <div className="skeleton h-3 w-1/3" />
                </div>
              </div>
            ))}
          </div>
        )}
        {!corto && estado.tipo === "error" && <p className="px-3 py-8 text-center body-6 text-danger">No se pudo buscar. Revisa tu conexión e intenta de nuevo.</p>}
        {vacio && <p className="px-3 py-8 text-center body-6 text-ink2">Sin resultados para «{q.trim()}».</p>}
        {items.length > 0 && (
          <ul id={listId} role="listbox" aria-label="Resultados">
            {items.map((it, i) => {
              const header = it.grupo !== items[i - 1]?.grupo ? it.grupo : null;
              const I = it.icon;
              return (
                <li key={it.id} role="presentation">
                  {header && <p className="px-3 pb-1 pt-3 caption-3 uppercase tracking-wider text-ink2 first:pt-1">{header}</p>}
                  <div
                    id={`${listId}-${it.id}`}
                    role="option"
                    aria-selected={i === active}
                    onPointerMove={() => setActive(i)}
                    onClick={() => go(it)}
                    className={`flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2 transition-colors duration-300 ease-weighted ${i === active ? "bg-muted" : ""}`}
                  >
                    <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-bg text-primary">
                      <I size={16} aria-hidden />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className={`block truncate body-5 text-ink ${it.grupo === "Vehículos" ? "font-mono" : ""}`}>{it.titulo}</span>
                      <span className="block truncate caption-5 text-ink2">{it.detalle}</span>
                    </span>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </dialog>
  );
}
