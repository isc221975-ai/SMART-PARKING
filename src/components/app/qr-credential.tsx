"use client";

import { useEffect, useState } from "react";
import QRCode from "react-qr-code";
import { ArrowsOut } from "@phosphor-icons/react";
import { Plate } from "@/components/ui/misc";
import { SHELL_EVENT } from "@/components/app/shell/events";
import { CredentialDialog } from "@/components/app/credential-dialog";

export interface CredencialData {
  placa: string;
  token: string;
}

/** Credencial QR del vehículo activo, con selector si hay varias placas y vista ampliada para la caseta. */
export function QrCredential({ vehiculos, titular }: { vehiculos: CredencialData[]; titular: string }) {
  const [idx, setIdx] = useState(0);
  const [open, setOpen] = useState(false);
  const v = vehiculos[idx] ?? vehiculos[0];

  useEffect(() => {
    const show = () => setOpen(true);
    window.addEventListener(SHELL_EVENT.showQr, show);
    const url = new URL(window.location.href);
    let raf = 0;
    if (url.searchParams.get("qr") === "1") {
      raf = requestAnimationFrame(() => {
        url.searchParams.delete("qr");
        window.history.replaceState(null, "", url.pathname + url.search);
        show();
      });
    }
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener(SHELL_EVENT.showQr, show);
    };
  }, []);

  if (!v) return null;

  return (
    <section aria-labelledby="credencial-t" className="sp-rise rounded-2xl border border-border bg-surface p-4 sm:p-6">
      <div className="flex items-center justify-between gap-2">
        <h2 id="credencial-t" className="title-3 text-ink">
          Credencial vehicular
        </h2>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-[color-mix(in_srgb,var(--color-accent)_16%,transparent)] px-2 py-0.5 caption-3 text-success-ink">
          <span className="relative size-1.5 rounded-full bg-current live-dot" /> Vigente
        </span>
      </div>

      {vehiculos.length > 1 && (
        <div role="radiogroup" aria-label="Vehículo activo" className="mt-4 flex gap-1 overflow-x-auto rounded-xl bg-muted p-1">
          {vehiculos.map((x, i) => (
            <button
              key={x.placa}
              type="button"
              role="radio"
              aria-checked={i === idx}
              onClick={() => setIdx(i)}
              className={`min-w-20 flex-1 rounded-lg px-3 py-1.5 font-mono caption-1 transition-colors duration-300 ease-weighted ${i === idx ? "bg-surface text-ink shadow-sm" : "text-ink2 hover:text-ink"}`}
            >
              {x.placa}
            </button>
          ))}
        </div>
      )}

      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mt-4 block w-full rounded-xl border border-border bg-white p-4 transition-transform duration-500 ease-weighted hover:scale-[1.01] active:scale-[0.99]"
        aria-label={`Ampliar el código QR de ${v.placa}`}
      >
        <QRCode value={v.token} size={256} style={{ width: "100%", height: "auto", maxWidth: 240, margin: "0 auto" }} fgColor="#0D1B2E" bgColor="#FFFFFF" />
      </button>

      <div className="flex items-center justify-between gap-2 pt-4">
        <p className="caption-2 text-ink2">Placa activa</p>
        <Plate placa={v.placa} />
      </div>

      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mt-4 flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-primary px-3 py-2 button-md text-on-primary transition-[background-color,transform] duration-300 ease-weighted hover:bg-[color-mix(in_srgb,var(--color-primary)_88%,var(--color-ink))] active:scale-[0.98]"
      >
        <ArrowsOut size={18} weight="bold" aria-hidden /> Mostrar QR
      </button>

      <CredentialDialog open={open} onClose={() => setOpen(false)} placa={v.placa} token={v.token} titular={titular} />
    </section>
  );
}
