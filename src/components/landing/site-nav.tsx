"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Logo } from "@/components/brand/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { ButtonLink } from "@/components/ui/button";

const links = [
  { href: "/#como-funciona", label: "Cómo funciona" },
  { href: "/#beneficios", label: "Beneficios" },
  { href: "/#seguridad", label: "Seguridad" },
  { href: "/#preguntas", label: "Preguntas" },
];

export function SiteNav() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <header className="pointer-events-none fixed inset-x-0 top-3 z-50 flex justify-center px-3 md:top-4">
      <nav
        aria-label="Principal"
        className="pointer-events-auto relative z-10 flex w-full max-w-5xl items-center justify-between gap-4 rounded-2xl border border-border bg-[color-mix(in_srgb,var(--color-surface)_78%,transparent)] py-2 pl-3 pr-2 backdrop-blur-xl"
      >
        <Logo />
        <ul className="hidden items-center gap-1 lg:flex">
          {links.map((l) => (
            <li key={l.href}>
              <Link href={l.href} className="rounded-lg px-3 py-2 title-4 text-ink2 transition-colors duration-300 ease-weighted hover:bg-muted hover:text-ink">
                {l.label}
              </Link>
            </li>
          ))}
        </ul>
        <div className="flex items-center gap-1">
          <ThemeToggle />
          <Link href="/login" className="hidden rounded-lg px-3 py-2 button-sm text-ink transition-colors duration-300 ease-weighted hover:bg-muted sm:inline-flex">
            Iniciar sesión
          </Link>
          <ButtonLink href="/register" size="sm" className="hidden sm:inline-flex">
            Crear cuenta
          </ButtonLink>
          <button
            type="button"
            aria-label={open ? "Cerrar menú" : "Abrir menú"}
            aria-expanded={open}
            aria-controls="menu-movil"
            onClick={() => setOpen((v) => !v)}
            className="relative grid size-10 place-items-center rounded-lg text-ink hover:bg-muted lg:hidden"
          >
            <span aria-hidden className={`absolute h-0.5 w-5 rounded-full bg-current transition-transform duration-500 ease-weighted ${open ? "rotate-45" : "-translate-y-[5px]"}`} />
            <span aria-hidden className={`absolute h-0.5 w-5 rounded-full bg-current transition-transform duration-500 ease-weighted ${open ? "-rotate-45" : "translate-y-[5px]"}`} />
          </button>
        </div>
      </nav>

      {/* Menú móvil: panel de altura completa */}
      <div
        id="menu-movil"
        className={`pointer-events-auto fixed inset-0 bg-[color-mix(in_srgb,var(--color-bg)_94%,transparent)] backdrop-blur-2xl transition-opacity duration-500 ease-weighted lg:hidden ${open ? "opacity-100" : "pointer-events-none invisible opacity-0"}`}
      >
        <ul className="flex h-full flex-col gap-2 px-6 pb-12 pt-24">
          {[...links, { href: "/login", label: "Iniciar sesión" }].map((l, i) => (
            <li
              key={l.href}
              className="transition-[opacity,transform] duration-500 ease-weighted"
              style={{ transitionDelay: open ? `${Math.min(i * 60, 400)}ms` : "0ms", opacity: open ? 1 : 0, transform: open ? "none" : "translateY(24px)" }}
            >
              <Link href={l.href} onClick={() => setOpen(false)} className="block rounded-xl px-3 py-3 heading-5 text-ink hover:bg-muted">
                {l.label}
              </Link>
            </li>
          ))}
          <li className="mt-auto transition-opacity duration-500 ease-weighted" style={{ opacity: open ? 1 : 0, transitionDelay: open ? "300ms" : "0ms" }}>
            <ButtonLink href="/register" size="lg" className="w-full" onClick={() => setOpen(false)}>
              Crear cuenta
            </ButtonLink>
          </li>
        </ul>
      </div>
    </header>
  );
}
