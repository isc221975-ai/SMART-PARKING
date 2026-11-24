"use client";

import { Moon, Sun } from "@phosphor-icons/react";

/** Alterna el tema claro/oscuro y lo recuerda en este navegador. */
export function toggleTheme() {
  const root = document.documentElement;
  const next = root.dataset.theme === "dark" ? "light" : "dark";
  root.dataset.theme = next;
  try {
    localStorage.setItem("sp-theme", next);
  } catch {
    /* almacenamiento no disponible */
  }
}

export function ThemeToggle({ className = "" }: { className?: string }) {
  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label="Cambiar entre tema claro y oscuro"
      className={`grid size-10 place-items-center rounded-lg text-ink2 transition-colors duration-300 ease-weighted hover:bg-muted hover:text-ink active:scale-[0.98] ${className}`}
    >
      <Sun size={20} weight="bold" className="hidden dark:block" aria-hidden />
      <Moon size={20} weight="bold" className="dark:hidden" aria-hidden />
    </button>
  );
}
