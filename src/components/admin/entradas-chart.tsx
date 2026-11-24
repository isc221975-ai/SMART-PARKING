"use client";

import { useState } from "react";
import type { PuntoSerie } from "@/lib/data/types";

/**
 * Barras de una sola serie (entradas). Barras delgadas con extremo redondeado anclado a la base,
 * separación de 2px, rejilla recesiva, tooltip por barra y vista de tabla para lectores de pantalla.
 */
export function EntradasChart({ serie, titulo, vacioTexto }: { serie: PuntoSerie[]; titulo: string; vacioTexto: string }) {
  const [hover, setHover] = useState<number | null>(null);
  const max = Math.max(...serie.map((p) => p.entradas));
  // Escala con tope «redondo» para que las líneas guía tengan números enteros.
  const tope = max <= 4 ? 4 : Math.ceil(max / 4) * 4;
  const guias = [tope, tope / 2, 0];
  const vacio = max === 0;
  const denso = serie.length > 16;
  const activo = hover !== null ? serie[hover] : null;

  return (
    <figure className="flex flex-col gap-4">
      <div className="relative">
        {/* Rejilla y eje Y */}
        <div className="pointer-events-none absolute inset-x-0 top-0 bottom-6 flex flex-col justify-between" aria-hidden>
          {guias.map((g) => (
            <div key={g} className="flex items-center gap-2">
              <span className="w-6 text-right font-mono caption-5 text-ink2">{g}</span>
              <span className={`h-px flex-1 ${g === 0 ? "bg-border" : "bg-[color-mix(in_srgb,var(--color-border)_55%,transparent)]"}`} />
            </div>
          ))}
        </div>

        <div className="relative ml-8 flex h-52 items-end gap-0.5 pb-6" onPointerLeave={() => setHover(null)} aria-hidden>
          {serie.map((p, i) => (
            <div key={i} className="relative flex h-full flex-1 flex-col justify-end" onPointerEnter={() => setHover(i)}>
              <div
                className={`mx-auto w-full max-w-6 rounded-t-[4px] transition-opacity duration-300 ease-weighted ${hover !== null && hover !== i ? "opacity-40" : ""}`}
                style={{ height: p.entradas ? `${(p.entradas / tope) * 100}%` : 0, background: "var(--color-chart)" }}
              />
              <span
                className={`absolute -bottom-6 inset-x-0 text-center font-mono caption-5 text-ink2 ${denso && i % 5 !== 0 && i !== serie.length - 1 ? "invisible" : ""} ${!denso && serie.length > 8 && i % 2 === 1 ? "max-sm:invisible" : ""}`}
              >
                {p.etiqueta}
              </span>
            </div>
          ))}
        </div>

        {vacio && (
          <p className="absolute inset-x-0 top-1/3 ml-8 text-center body-6 text-ink2">{vacioTexto}</p>
        )}

        {activo && !vacio && (
          <div role="status" className="pointer-events-none absolute right-0 top-0 rounded-lg border border-border bg-surface px-3 py-2 shadow-lg">
            <p className="caption-4 text-ink2">{activo.detalle}</p>
            <p className="title-4 text-ink">
              {activo.entradas} {activo.entradas === 1 ? "entrada" : "entradas"}
            </p>
          </div>
        )}
      </div>

      <details className="group">
        <summary className="cursor-pointer caption-1 text-primary underline-offset-4 hover:underline">Ver como tabla</summary>
        <table className="mt-2 w-full text-left">
          <caption className="sr-only">Entradas, {titulo}</caption>
          <thead>
            <tr className="border-b border-border">
              <th scope="col" className="py-2 caption-3 text-ink2">
                Periodo
              </th>
              <th scope="col" className="py-2 text-right caption-3 text-ink2">
                Entradas
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {serie.map((p, i) => (
              <tr key={i}>
                <td className="py-1.5 body-6 text-ink">{p.detalle}</td>
                <td className="py-1.5 text-right font-mono body-6 text-ink">{p.entradas}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </figure>
  );
}
