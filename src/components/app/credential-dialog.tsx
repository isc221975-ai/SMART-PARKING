"use client";

import { useId } from "react";
import QRCode from "react-qr-code";
import { X } from "@phosphor-icons/react";
import { Plate } from "@/components/ui/misc";
import { useModal } from "@/components/app/shell/use-modal";

/** Vista ampliada «Tu credencial» para mostrar en la caseta. El QR siempre va sobre blanco. */
export function CredentialDialog({ open, onClose, placa, token, titular }: { open: boolean; onClose: () => void; placa: string; token: string; titular?: string }) {
  const dialog = useModal(open, onClose);
  const id = useId();
  return (
    <dialog {...dialog} aria-labelledby={`${id}-t`} className="sp-dialog m-auto w-[min(92vw,420px)] rounded-3xl border border-border bg-surface p-0 text-ink shadow-2xl backdrop:bg-black/60 backdrop:backdrop-blur-sm">
      <div className="flex flex-col gap-4 p-6">
        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0">
            <h2 id={`${id}-t`} className="heading-6 text-ink">
              Tu credencial
            </h2>
            {titular && <p className="truncate caption-2 text-ink2">{titular}</p>}
          </div>
          <button type="button" autoFocus onClick={() => dialog.ref.current?.close()} aria-label="Cerrar" className="grid size-10 shrink-0 place-items-center rounded-lg text-ink2 transition-colors duration-300 ease-weighted hover:bg-muted hover:text-ink">
            <X size={20} aria-hidden />
          </button>
        </div>
        <div className="rounded-2xl bg-white p-6">
          <QRCode value={token} size={320} style={{ width: "100%", height: "auto" }} fgColor="#000000" bgColor="#FFFFFF" aria-label={`Código QR de la placa ${placa}`} />
        </div>
        <div className="flex items-center justify-between gap-4">
          <Plate placa={placa} />
          <p className="text-right caption-2 text-ink2">Sube el brillo y acerca el código al escáner.</p>
        </div>
      </div>
    </dialog>
  );
}
