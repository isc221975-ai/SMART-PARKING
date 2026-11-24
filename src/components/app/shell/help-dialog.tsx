"use client";

import { useId } from "react";
import { X } from "@phosphor-icons/react";
import { useModal } from "./use-modal";

export interface HelpTopic {
  title: string;
  text: string;
}

export interface ShortcutInfo {
  keys: string[];
  label: string;
}

export type HelpTab = "ayuda" | "atajos";

/** Panel de ayuda breve con una pestaña de atajos de teclado. */
export function HelpDialog({
  open,
  tab,
  onTab,
  onClose,
  heading,
  topics,
  shortcuts,
}: {
  open: boolean;
  tab: HelpTab;
  onTab: (t: HelpTab) => void;
  onClose: () => void;
  heading: string;
  topics: HelpTopic[];
  shortcuts: ShortcutInfo[];
}) {
  const dialog = useModal(open, onClose);
  const id = useId();
  const tabs: { key: HelpTab; label: string }[] = [
    { key: "ayuda", label: "Ayuda" },
    { key: "atajos", label: "Atajos de teclado" },
  ];

  return (
    <dialog {...dialog} aria-labelledby={`${id}-t`} className="sp-dialog m-auto w-[min(92vw,520px)] rounded-2xl border border-border bg-surface p-0 text-ink shadow-2xl backdrop:bg-black/50 backdrop:backdrop-blur-sm">
      <div className="flex items-center justify-between gap-4 px-6 pt-6">
        <h2 id={`${id}-t`} className="heading-6 text-ink">
          {heading}
        </h2>
        <button type="button" onClick={() => dialog.ref.current?.close()} aria-label="Cerrar" className="grid size-10 place-items-center rounded-lg text-ink2 transition-colors duration-300 ease-weighted hover:bg-muted hover:text-ink">
          <X size={20} aria-hidden />
        </button>
      </div>
      <div role="tablist" aria-label="Secciones de ayuda" className="mx-6 mt-4 flex gap-1 rounded-xl bg-muted p-1">
        {tabs.map((t) => (
          <button
            key={t.key}
            type="button"
            role="tab"
            id={`${id}-${t.key}`}
            aria-selected={tab === t.key}
            aria-controls={`${id}-panel`}
            onClick={() => onTab(t.key)}
            className={`flex-1 rounded-lg px-3 py-1.5 caption-1 transition-colors duration-300 ease-weighted ${tab === t.key ? "bg-surface text-ink shadow-sm" : "text-ink2 hover:text-ink"}`}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div id={`${id}-panel`} role="tabpanel" aria-labelledby={`${id}-${tab}`} className="max-h-[60vh] overflow-y-auto px-6 pb-6 pt-4">
        {tab === "ayuda" ? (
          <dl className="flex flex-col gap-4">
            {topics.map((t) => (
              <div key={t.title}>
                <dt className="title-3 text-ink">{t.title}</dt>
                <dd className="body-6 pt-1 text-ink2">{t.text}</dd>
              </div>
            ))}
          </dl>
        ) : (
          <>
            <ul className="divide-y divide-border">
              {shortcuts.map((s) => (
                <li key={s.label} className="flex items-center justify-between gap-4 py-2">
                  <span className="body-6 text-ink">{s.label}</span>
                  <span className="flex gap-1">
                    {s.keys.map((k) => (
                      <kbd key={k} className="min-w-7 rounded-md border border-border bg-bg px-2 py-0.5 text-center font-mono caption-4 text-ink">
                        {k}
                      </kbd>
                    ))}
                  </span>
                </li>
              ))}
            </ul>
            <p className="caption-5 pt-4 text-ink2">Los atajos de una tecla no funcionan mientras escribes en un campo.</p>
          </>
        )}
      </div>
    </dialog>
  );
}
