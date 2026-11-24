/** Eventos del shell que escuchan otros componentes (credencial QR, tablas). */
export const SHELL_EVENT = {
  showQr: "sp:show-qr",
  exportCsv: "sp:export-csv",
} as const;

export function emit(name: (typeof SHELL_EVENT)[keyof typeof SHELL_EVENT]) {
  window.dispatchEvent(new CustomEvent(name));
}

/** true si el foco está en un campo de texto: ahí no se activan los atajos de una tecla. */
export function isTyping(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;
  const tag = target.tagName;
  if (tag === "TEXTAREA" || tag === "SELECT") return true;
  if (tag === "INPUT") {
    const type = (target as HTMLInputElement).type;
    return !["checkbox", "radio", "button", "submit", "reset", "range", "color", "file"].includes(type);
  }
  return false;
}
