"use client";

import { useId, useMemo, useState } from "react";
import { MagnifyingGlass, type Icon } from "@phosphor-icons/react";
import { useModal } from "./use-modal";

export interface Command {
  id: string;
  label: string;
  group: string;
  icon: Icon;
  keywords?: string;
  shortcut?: string;
  run: () => void;
}

const norm = (s: string) => s.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();

/** Buscador de comandos (Ctrl/⌘ + K): combobox con lista filtrable y navegación con flechas. */
export function CommandPalette({ open, onClose, commands }: { open: boolean; onClose: () => void; commands: Command[] }) {
  const [q, setQ] = useState("");
  const [active, setActive] = useState(0);
  const listId = useId();
  const dialog = useModal(open, () => {
    setQ("");
    setActive(0);
    onClose();
  });

  const results = useMemo(() => {
    const t = norm(q.trim());
    return t ? commands.filter((c) => norm(`${c.label} ${c.group} ${c.keywords ?? ""}`).includes(t)) : commands;
  }, [q, commands]);

  function run(c: Command) {
    dialog.ref.current?.close();
    // Deja que el diálogo se cierre (y devuelva el foco) antes de ejecutar la acción.
    requestAnimationFrame(() => c.run());
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.nativeEvent.isComposing) return;
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      if (!results.length) return;
      const step = e.key === "ArrowDown" ? 1 : -1;
      setActive((i) => (i + step + results.length) % results.length);
    } else if (e.key === "Enter") {
      e.preventDefault();
      const c = results[active];
      if (c) run(c);
    }
  }

  return (
    <dialog {...dialog} aria-label="Buscador de comandos" className="sp-dialog mx-auto mt-[12vh] mb-auto w-[min(92vw,560px)] rounded-2xl border border-border bg-surface p-0 text-ink shadow-2xl backdrop:bg-black/50 backdrop:backdrop-blur-sm">
      <div className="flex items-center gap-3 border-b border-border px-4">
        <MagnifyingGlass size={20} className="shrink-0 text-ink2" aria-hidden />
        <input
          autoFocus
          role="combobox"
          aria-expanded="true"
          aria-controls={listId}
          aria-activedescendant={results[active] ? `${listId}-${results[active].id}` : undefined}
          aria-label="Escribe un comando o una sección"
          placeholder="Escribe un comando o una sección"
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setActive(0);
          }}
          onKeyDown={onKeyDown}
          className="min-h-14 flex-1 bg-transparent body-3 text-ink placeholder:text-ink2 focus:outline-none"
        />
        <kbd className="hidden rounded-md border border-border px-2 py-0.5 font-mono caption-5 text-ink2 sm:inline">Esc</kbd>
      </div>
      <ul id={listId} role="listbox" aria-label="Comandos" className="max-h-[min(60vh,420px)] overflow-y-auto p-2">
        {results.length === 0 && <li className="px-3 py-8 text-center body-6 text-ink2">Ningún comando coincide con «{q}».</li>}
        {results.map((c, i) => {
          const header = c.group !== results[i - 1]?.group ? c.group : null;
          const I = c.icon;
          return (
            <li key={c.id} role="presentation">
              {header && <p className="px-3 pb-1 pt-3 caption-3 uppercase tracking-wider text-ink2 first:pt-1">{header}</p>}
              <div
                id={`${listId}-${c.id}`}
                role="option"
                aria-selected={i === active}
                onPointerMove={() => setActive(i)}
                onClick={() => run(c)}
                className={`flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2 body-5 transition-colors duration-300 ease-weighted ${i === active ? "bg-muted text-ink" : "text-ink2"}`}
              >
                <I size={18} aria-hidden className={i === active ? "text-primary" : ""} />
                <span className="flex-1">{c.label}</span>
                {c.shortcut && <kbd className="rounded-md border border-border px-2 py-0.5 font-mono caption-5 text-ink2">{c.shortcut}</kbd>}
              </div>
            </li>
          );
        })}
      </ul>
    </dialog>
  );
}
