"use client";

import { Check, Minus, Warning, X } from "@phosphor-icons/react";
import type { Metrics, RuleResult } from "./types";

/** Lista compacta de reglas: ✓, ✕ o ⚠ (heurísticas). */
export function RuleList({ results, hide = [] }: { results: RuleResult[]; hide?: string[] }) {
  if (!results.length) return null;
  return (
    <ul className="grid grid-cols-2 gap-x-4 gap-y-2" aria-label="Revisión de la foto">
      {results
        .filter((r) => !hide.includes(r.regla))
        .map((r) => {
          const { icon: Icon, cls, sr } =
            r.estado === "ok"
              ? { icon: Check, cls: "text-success", sr: "cumple" }
              : r.estado === "falla"
                ? { icon: X, cls: "text-danger", sr: "no cumple" }
                : r.estado === "advertencia"
                  ? { icon: Warning, cls: "text-warning", sr: "revisar" }
                  : { icon: Minus, cls: "text-ink2", sr: "no aplica" };
          return (
            <li key={r.regla} className="flex items-center gap-2 caption-2 text-ink">
              <Icon size={16} weight="bold" className={`shrink-0 ${cls}`} aria-hidden />
              <span className={r.estado === "no_aplica" ? "text-ink2" : ""}>{r.label}</span>
              <span className="sr-only">: {sr}</span>
            </li>
          );
        })}
    </ul>
  );
}

/** Óvalo guía sobre el video. Verde cuando el encuadre es correcto. */
export function OvalGuide({ ok }: { ok: boolean }) {
  return (
    <svg viewBox="0 0 300 400" preserveAspectRatio="none" className="pointer-events-none absolute inset-0 size-full" aria-hidden>
      <defs>
        <mask id="sp-oval-hole">
          <rect width="300" height="400" fill="white" />
          <ellipse cx="150" cy="200" rx="108" ry="146" fill="black" />
        </mask>
      </defs>
      <rect width="300" height="400" fill="rgb(0 0 0 / 0.45)" mask="url(#sp-oval-hole)" />
      <ellipse
        cx="150"
        cy="200"
        rx="108"
        ry="146"
        fill="none"
        strokeWidth="3"
        strokeDasharray={ok ? undefined : "10 8"}
        className={`transition-[stroke] duration-300 ease-weighted ${ok ? "stroke-accent" : "stroke-white/85"}`}
      />
    </svg>
  );
}

const fmt = (v: number | null, d = 2) => (v === null ? "—" : v.toFixed(d));

/** ?debug=1: métricas en vivo para calibrar config.ts con personas reales. */
export function DebugMetrics({ m }: { m: Metrics }) {
  const rows: [string, string][] = [
    ["rostros", String(m.faces)],
    ["yaw / pitch / roll", `${fmt(m.yaw, 1)} / ${fmt(m.pitch, 1)} / ${fmt(m.roll, 1)}`],
    ["centro · alto", `${fmt(m.centerOffset)} · ${fmt(m.faceHeight)}`],
    ["parpadeo izq / der", `${fmt(m.eyeBlinkLeft)} / ${fmt(m.eyeBlinkRight)}`],
    ["sonrisa · boca · cejas", `${fmt(m.smile)} · ${fmt(m.jawOpen)} · ${fmt(m.browInnerUp)}`],
    ["luz · asimetría", `${fmt(m.luminance, 0)} · ${fmt(m.luminanceAsymmetry)}`],
    ["nitidez · movimiento", `${fmt(m.sharpness, 0)} · ${fmt(m.motion, 4)}`],
    ["lentes bordes · reflejos", `${fmt(m.glassesBridgeEdges, 3)} · ${fmt(m.glassesHighlights, 3)}`],
    ["frente Δcolor", fmt(m.foreheadColorDist, 0)],
    ["boca Δcolor · textura", `${fmt(m.mouthColorDist, 0)} · ${fmt(m.mouthTexture, 3)}`],
  ];
  return (
    <dl className="pointer-events-none absolute left-2 top-2 grid grid-cols-[auto_auto] gap-x-3 rounded-lg bg-black/70 px-3 py-2 font-mono caption-5 text-white">
      {rows.map(([k, v]) => (
        <div key={k} className="contents">
          <dt className="text-white/70">{k}</dt>
          <dd>{v}</dd>
        </div>
      ))}
    </dl>
  );
}
