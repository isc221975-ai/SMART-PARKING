"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { Question, Warning } from "@phosphor-icons/react";

interface Options {
  title: string;
  text: string;
  confirmLabel?: string;
  /** "danger" (por defecto) para acciones destructivas; "primary" para confirmar cambios. */
  tone?: "danger" | "primary";
}

function ConfirmDialog({ opts, onDone }: { opts: Options; onDone: (v: boolean) => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  const [closing, setClosing] = useState(false);
  const primary = opts.tone === "primary";
  useEffect(() => {
    ref.current?.showModal();
  }, []);
  const finish = (v: boolean) => {
    setClosing(true);
    ref.current?.close();
    onDone(v);
  };
  return (
    <dialog
      ref={ref}
      onCancel={(e) => {
        e.preventDefault();
        finish(false);
      }}
      className="sp-dialog m-auto w-[min(92vw,420px)] rounded-2xl border border-border bg-surface p-6 text-ink backdrop:bg-black/50 backdrop:backdrop-blur-sm"
      aria-labelledby="confirm-title"
    >
      <div className="flex gap-4">
        {primary ? (
          <span className="grid size-10 shrink-0 place-items-center rounded-full bg-[color-mix(in_srgb,var(--color-primary)_12%,transparent)] text-primary">
            <Question size={20} weight="bold" aria-hidden />
          </span>
        ) : (
          <span className="grid size-10 shrink-0 place-items-center rounded-full bg-[color-mix(in_srgb,var(--color-danger)_12%,transparent)] text-danger">
            <Warning size={20} weight="bold" aria-hidden />
          </span>
        )}
        <div>
          <p id="confirm-title" className="title-2 text-ink">{opts.title}</p>
          <p className="body-6 pt-1 text-ink2">{opts.text}</p>
        </div>
      </div>
      <div className="flex justify-end gap-2 pt-6">
        <button autoFocus disabled={closing} onClick={() => finish(false)} className="rounded-lg border border-border bg-surface px-3 py-2 button-sm text-ink hover:bg-muted">
          Cancelar
        </button>
        <button disabled={closing} onClick={() => finish(true)} className={`rounded-lg px-3 py-2 button-sm hover:opacity-90 active:scale-[0.98] ${primary ? "bg-primary text-on-primary" : "bg-danger text-white"}`}>
          {opts.confirmLabel ?? "Confirmar"}
        </button>
      </div>
    </dialog>
  );
}

/** Confirmación accesible con <dialog> (nunca window.confirm). */
export function useConfirm() {
  return useCallback(
    (opts: Options) =>
      new Promise<boolean>((resolve) => {
        const host = document.createElement("div");
        document.body.appendChild(host);
        const root = createRoot(host);
        root.render(
          <ConfirmDialog
            opts={opts}
            onDone={(v) => {
              resolve(v);
              setTimeout(() => {
                root.unmount();
                host.remove();
              }, 0);
            }}
          />,
        );
      }),
    [],
  );
}
