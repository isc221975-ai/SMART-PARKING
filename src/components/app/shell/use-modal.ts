"use client";

import { useEffect, useRef } from "react";

/**
 * Abre y cierra un <dialog> modal según `open`, con cierre al tocar fuera.
 * `closedby="any"` lo hace nativo; en navegadores sin soporte se revisa la posición del puntero.
 */
export function useModal(open: boolean, onClose: () => void) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  useEffect(() => {
    const d = ref.current;
    if (!d || "closedBy" in HTMLDialogElement.prototype) return;
    const outside = (e: PointerEvent) => {
      const r = d.getBoundingClientRect();
      return e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom;
    };
    let pressedOutside = false;
    const down = (e: PointerEvent) => (pressedOutside = outside(e));
    const up = (e: PointerEvent) => {
      if (pressedOutside && outside(e)) d.close();
    };
    d.addEventListener("pointerdown", down);
    d.addEventListener("pointerup", up);
    return () => {
      d.removeEventListener("pointerdown", down);
      d.removeEventListener("pointerup", up);
    };
  }, []);

  const props = {
    ref,
    onClose,
    ...({ closedby: "any" } as object),
  };
  return props;
}
