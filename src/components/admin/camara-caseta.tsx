"use client";

import { useEffect, useRef, useState } from "react";
import { VideoCamera, VideoCameraSlash, Warning } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";

type Estado = "apagada" | "encendiendo" | "en_vivo" | "denegada" | "sin_camara" | "no_compatible" | "error";

const MENSAJE: Partial<Record<Estado, { titulo: string; texto: string }>> = {
  apagada: { titulo: "Cámara apagada", texto: "Enciéndela para ver la caseta en vivo. La imagen no se graba ni se envía al servidor." },
  denegada: {
    titulo: "Permiso denegado",
    texto: "El navegador bloqueó la cámara. Toca el ícono de la cámara o del candado junto a la dirección, permite el acceso y vuelve a intentarlo.",
  },
  sin_camara: { titulo: "No se encontró una cámara", texto: "Conecta una cámara a este equipo y vuelve a intentarlo." },
  no_compatible: { titulo: "Navegador no compatible", texto: "Este navegador no permite usar la cámara. Abre el panel en Chrome, Edge, Firefox o Safari actualizados." },
  error: { titulo: "No se pudo encender", texto: "Otra aplicación puede estar usando la cámara. Ciérrala y vuelve a intentarlo." },
};

/** Vista en vivo de la cámara de la caseta. Nunca se enciende sola y se apaga al salir de la página. */
export function CamaraCaseta() {
  const video = useRef<HTMLVideoElement>(null);
  const stream = useRef<MediaStream | null>(null);
  const [estado, setEstado] = useState<Estado>("apagada");

  function apagar() {
    stream.current?.getTracks().forEach((t) => t.stop());
    stream.current = null;
    if (video.current) video.current.srcObject = null;
    setEstado("apagada");
  }

  async function encender() {
    if (!navigator.mediaDevices?.getUserMedia) return setEstado("no_compatible");
    setEstado("encendiendo");
    try {
      const s = await navigator.mediaDevices.getUserMedia({ video: { width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false });
      stream.current = s;
      if (video.current) {
        video.current.srcObject = s;
        await video.current.play().catch(() => undefined);
      }
      // Si la cámara se desconecta, vuelve al estado apagado.
      s.getVideoTracks()[0]?.addEventListener("ended", apagar);
      setEstado("en_vivo");
    } catch (e) {
      const name = e instanceof DOMException ? e.name : "";
      setEstado(name === "NotAllowedError" || name === "SecurityError" ? "denegada" : name === "NotFoundError" || name === "OverconstrainedError" ? "sin_camara" : "error");
    }
  }

  useEffect(() => () => stream.current?.getTracks().forEach((t) => t.stop()), []);

  const msg = MENSAJE[estado];
  const enVivo = estado === "en_vivo";
  return (
    <div className="flex h-full flex-col gap-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="title-3 text-ink">Cámara de la caseta</h2>
        {enVivo && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[color-mix(in_srgb,var(--color-danger)_12%,transparent)] px-2 py-0.5 caption-3 text-danger-ink">
            <span className="relative size-1.5 rounded-full bg-current live-dot" /> En vivo
          </span>
        )}
      </div>
      <div className="relative aspect-video overflow-hidden rounded-xl border border-border bg-muted">
        <video ref={video} playsInline muted autoPlay aria-label="Vista en vivo de la caseta" className={`size-full object-cover ${enVivo ? "" : "invisible"}`} />
        {!enVivo && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 p-4 text-center">
            {estado === "encendiendo" ? (
              <div className="skeleton absolute inset-0 rounded-none" aria-label="Encendiendo la cámara" />
            ) : (
              <>
                {estado === "apagada" ? <VideoCameraSlash size={28} className="text-ink2" aria-hidden /> : <Warning size={28} className="text-warning" aria-hidden />}
                <p className="title-4 text-ink">{msg?.titulo}</p>
                <p className="max-w-xs caption-2 text-ink2" role={estado === "apagada" ? undefined : "alert"}>
                  {msg?.texto}
                </p>
              </>
            )}
          </div>
        )}
      </div>
      {enVivo ? (
        <Button variant="secondary" onClick={apagar}>
          <VideoCameraSlash size={18} aria-hidden /> Apagar cámara
        </Button>
      ) : (
        <Button variant="secondary" onClick={encender} loading={estado === "encendiendo"} disabled={estado === "no_compatible"}>
          {estado !== "encendiendo" && <VideoCamera size={18} aria-hidden />} {estado === "apagada" || estado === "encendiendo" ? "Encender cámara" : "Intentar de nuevo"}
        </Button>
      )}
    </div>
  );
}
