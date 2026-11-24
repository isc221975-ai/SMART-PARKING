"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Frase grande que se ilumina palabra por palabra al hacer scroll.
 * Un solo listener de scroll limitado con requestAnimationFrame.
 */
export function TaglineReveal({ lines }: { lines: string[] }) {
  const ref = useRef<HTMLDivElement>(null);
  const words = lines.map((l) => l.split(" "));
  const total = words.reduce((n, w) => n + w.length, 0);
  const [active, setActive] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let frame = 0;
    const update = () => {
      frame = 0;
      if (reduced) return setActive(total);
      const rect = el.getBoundingClientRect();
      const vh = window.innerHeight;
      // Empieza cuando el bloque entra al 85% de la pantalla y termina al 35%.
      const start = vh * 0.85;
      const end = vh * 0.35;
      const progress = Math.min(1, Math.max(0, (start - rect.top) / (start - end + rect.height * 0.6)));
      setActive(Math.round(progress * total));
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    frame = requestAnimationFrame(update);
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [total]);

  let i = 0;
  return (
    <div ref={ref} className="mx-auto max-w-[680px] md:max-w-[880px]">
      <p className="heading-1">
        <span className="sr-only">{lines.join(" ")}</span>
        {words.map((line, li) => (
          <span key={li} className="block" aria-hidden>
            {line.map((w, wi) => {
              const idx = i++;
              return (
                <span
                  key={wi}
                  className="transition-opacity duration-500 ease-weighted"
                  style={{ opacity: idx < active ? 1 : 0.28 }}
                >
                  {w}
                  {wi < line.length - 1 ? " " : ""}
                </span>
              );
            })}
          </span>
        ))}
      </p>
    </div>
  );
}
