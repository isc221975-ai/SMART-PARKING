"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { DownloadSimple, MagnifyingGlass, MoonStars, Plus, Question, SignOut, UserCircle, type Icon } from "@phosphor-icons/react";
import { Logo } from "@/components/brand/logo";
import { toggleTheme } from "@/components/theme-toggle";
import { useConfirm } from "@/components/app/confirm";
import { AccountMenu, type MenuItem } from "@/components/app/shell/account-menu";
import { CommandPalette, type Command } from "@/components/app/shell/command-palette";
import { HelpDialog, type HelpTab } from "@/components/app/shell/help-dialog";
import { GlobalSearch } from "@/components/app/shell/global-search";
import { MOBILE_NAV, NAV, SHORTCUTS, helpFor, type Panel } from "@/components/app/shell/config";
import { SHELL_EVENT, emit, isTyping } from "@/components/app/shell/events";

export function AppShell({
  panel,
  title,
  user,
  subtitle,
  qrDisponible = false,
  children,
}: {
  panel: Panel;
  /** Título del panel según el rol, p. ej. «Panel de alumno». */
  title: string;
  user: string;
  subtitle: string;
  qrDisponible?: boolean;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const confirm = useConfirm();
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const esAdmin = panel === "admin";
  /** En el admin la lupa abre la búsqueda global; en el portal, el buscador de comandos. */
  const openSearch = useCallback(() => (panel === "admin" ? setSearchOpen(true) : setPaletteOpen(true)), [panel]);
  const [help, setHelp] = useState<{ open: boolean; tab: HelpTab }>({ open: false, tab: "ayuda" });
  const nav = NAV[panel];
  const home = nav[0]!.href;
  const isActive = (href: string) => (href === home ? pathname === href : pathname === href || pathname.startsWith(`${href}/`));

  const openHelp = useCallback((tab: HelpTab) => setHelp({ open: true, tab }), []);

  const logout = useCallback(async () => {
    const ok = await confirm({ title: "¿Cerrar sesión?", text: "Tendrás que volver a entrar con tu correo y contraseña.", confirmLabel: "Cerrar sesión" });
    if (!ok) return;
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/login");
    router.refresh();
  }, [confirm, router]);

  /** Muestra la credencial ampliada; si no hay vehículos, lleva a registrar el primero. */
  const showQr = useCallback(() => {
    if (!qrDisponible) return router.push("/cliente/vehiculos?agregar=1");
    if (pathname === "/cliente") emit(SHELL_EVENT.showQr);
    else router.push("/cliente?qr=1");
  }, [qrDisponible, pathname, router]);

  const commands = useMemo<Command[]>(() => {
    const go = nav.map<Command>((n) => ({ id: `go-${n.href}`, label: `Ir a ${n.label}`, group: "Secciones", icon: n.icon, shortcut: n.key, run: () => router.push(n.href) }));
    const acciones: Command[] =
      panel === "cliente"
        ? [
            { id: "qr", label: "Mostrar mi credencial QR", group: "Acciones", icon: MOBILE_NAV.cliente[1]!.icon, keywords: "codigo caseta", shortcut: "Q", run: showQr },
            { id: "add", label: "Agregar vehículo", group: "Acciones", icon: Plus, keywords: "placa auto registrar", run: () => router.push("/cliente/vehiculos?agregar=1") },
          ]
        : [
            { id: "buscar", label: "Buscar placa, persona o matrícula", group: "Acciones", icon: MagnifyingGlass, keywords: "usuario vehiculo acceso", shortcut: "/", run: () => setSearchOpen(true) },
            { id: "csv", label: "Exportar la tabla visible a CSV", group: "Acciones", icon: DownloadSimple, keywords: "descargar excel", shortcut: "E", run: () => emit(SHELL_EVENT.exportCsv) },
          ];
    const cuenta: Command[] = [
      { id: "theme", label: "Cambiar tema claro u oscuro", group: "Cuenta", icon: MoonStars, keywords: "modo noche", run: toggleTheme },
      { id: "help", label: "Ayuda", group: "Cuenta", icon: Question, run: () => openHelp("ayuda") },
      { id: "keys", label: "Ver los atajos de teclado", group: "Cuenta", icon: Question, shortcut: "?", run: () => openHelp("atajos") },
      { id: "logout", label: "Cerrar sesión", group: "Cuenta", icon: SignOut, keywords: "salir", run: logout },
    ];
    return [...acciones, ...go, ...cuenta];
  }, [nav, panel, router, showQr, openHelp, logout]);

  const menu: MenuItem[] = [
    ...(panel === "cliente" ? [{ label: "Mis datos", icon: UserCircle, href: "/cliente/perfil" }] : []),
    { label: "Cambiar tema", icon: MoonStars, onSelect: toggleTheme },
    { label: "Ayuda", icon: Question, onSelect: () => openHelp("ayuda"), hint: "?" },
    { label: "Cerrar sesión", icon: SignOut, onSelect: logout, tone: "danger" },
  ];

  // Atajos de teclado: Ctrl/⌘ + K siempre; los de una tecla, fuera de campos de texto y sin diálogos abiertos.
  useEffect(() => {
    const single: Record<string, () => void> =
      panel === "cliente"
        ? { q: showQr, v: () => router.push("/cliente/vehiculos"), h: () => router.push("/cliente/historial") }
        : { ...Object.fromEntries(nav.map((n) => [n.key!, () => router.push(n.href)])), e: () => emit(SHELL_EVENT.exportCsv), "/": () => setSearchOpen(true) };
    single["?"] = () => openHelp("atajos");

    function onKey(e: KeyboardEvent) {
      if (e.isComposing || e.defaultPrevented) return;
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        if (!document.querySelector("dialog[open]")) setPaletteOpen(true);
        return;
      }
      if (e.ctrlKey || e.metaKey || e.altKey || isTyping(e.target)) return;
      if (document.querySelector("dialog[open], [popover]:popover-open")) return;
      const fn = single[e.key.toLowerCase()];
      if (fn) {
        e.preventDefault();
        fn();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [panel, nav, router, showQr, openHelp]);

  const helpInfo = helpFor(panel, pathname);
  const activeTint = "bg-[color-mix(in_srgb,var(--color-primary)_12%,transparent)] text-primary";

  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[256px_1fr]">
      {/* Barra lateral (escritorio) */}
      <aside className="sticky top-0 hidden h-dvh flex-col border-r border-border bg-surface p-4 lg:flex">
        <div className="flex flex-col gap-1 px-2 pb-6 pt-2">
          <Logo href={home} />
          <p className="caption-4 pt-2 text-ink2">{title}</p>
        </div>
        <button
          type="button"
          onClick={openSearch}
          className="mb-4 flex items-center gap-2 rounded-lg border border-border bg-bg px-3 py-2 text-left caption-2 text-ink2 transition-colors duration-300 ease-weighted hover:border-primary hover:text-ink"
        >
          <MagnifyingGlass size={16} aria-hidden />
          <span className="flex-1 whitespace-nowrap">{esAdmin ? "Buscar placa o persona" : "Buscar"}</span>
          <kbd className="whitespace-nowrap rounded-md border border-border px-1.5 font-mono caption-5">{esAdmin ? "/" : "Ctrl K"}</kbd>
        </button>
        <nav aria-label="Secciones" className="flex flex-col gap-1">
          {nav.map((item) => {
            const I = item.icon;
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`flex items-center gap-3 rounded-lg px-3 py-2 title-4 transition-colors duration-300 ease-weighted ${active ? activeTint : "text-ink2 hover:bg-muted hover:text-ink"}`}
              >
                <I size={20} weight={active ? "fill" : "regular"} aria-hidden />
                <span className="flex-1">{item.label}</span>
                {item.key && <kbd className="font-mono caption-5 text-ink2 opacity-70">{item.key}</kbd>}
              </Link>
            );
          })}
        </nav>
        <div className="mt-auto border-t border-border pt-4">
          <AccountMenu user={user} subtitle={subtitle} items={menu} />
        </div>
      </aside>

      <div className="flex min-w-0 flex-col pb-28 lg:pb-0">
        {/* Encabezado móvil */}
        <header className="sticky top-0 z-30 flex items-center justify-between gap-2 border-b border-border bg-[color-mix(in_srgb,var(--color-surface)_85%,transparent)] px-4 py-2 backdrop-blur-xl lg:hidden">
          <div className="min-w-0">
            <Logo href={home} />
          </div>
          <div className="flex items-center gap-1">
            <button type="button" onClick={openSearch} aria-label={esAdmin ? "Buscar placa, persona o matrícula" : "Buscar comando"} className="grid size-10 place-items-center rounded-lg text-ink2 transition-colors duration-300 ease-weighted hover:bg-muted hover:text-ink">
              <MagnifyingGlass size={20} aria-hidden />
            </button>
            <AccountMenu user={user} subtitle={subtitle} items={menu} compact />
          </div>
        </header>
        <main id="contenido" className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 md:px-8 md:py-10">
          <p className="caption-4 pb-1 text-ink2 lg:hidden">{title}</p>
          {children}
        </main>
      </div>

      {/* Navegación inferior (móvil) */}
      <nav aria-label="Secciones" className="fixed inset-x-3 bottom-3 z-40 rounded-2xl border border-border bg-[color-mix(in_srgb,var(--color-surface)_88%,transparent)] p-1 pb-[max(0.25rem,env(safe-area-inset-bottom))] shadow-lg backdrop-blur-xl lg:hidden">
        <ul className="grid" style={{ gridTemplateColumns: `repeat(${MOBILE_NAV[panel].length}, minmax(0, 1fr))` }}>
          {MOBILE_NAV[panel].map((item) => {
            const I: Icon = item.icon;
            const cls = "flex min-h-14 w-full flex-col items-center justify-center gap-0.5 rounded-xl px-1 py-2 caption-4 transition-colors duration-300 ease-weighted active:scale-[0.97]";
            if (item.action) {
              return (
                <li key="qr">
                  <button type="button" onClick={showQr} className={`${cls} text-ink2 hover:text-ink`}>
                    <span className="grid size-7 place-items-center rounded-lg bg-primary text-on-primary">
                      <I size={18} weight="bold" aria-hidden />
                    </span>
                    <span className="truncate">{item.label}</span>
                  </button>
                </li>
              );
            }
            const active = isActive(item.href);
            return (
              <li key={item.href}>
                <Link href={item.href} aria-current={active ? "page" : undefined} className={`${cls} ${active ? activeTint : "text-ink2 hover:text-ink"}`}>
                  <I size={22} weight={active ? "fill" : "regular"} aria-hidden />
                  <span className="truncate">{item.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {esAdmin && <GlobalSearch open={searchOpen} onClose={() => setSearchOpen(false)} />}
      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} commands={commands} />
      <HelpDialog
        open={help.open}
        tab={help.tab}
        onTab={(tab) => setHelp({ open: true, tab })}
        onClose={() => setHelp((h) => ({ ...h, open: false }))}
        heading={helpInfo.heading}
        topics={helpInfo.topics}
        shortcuts={SHORTCUTS[panel]}
      />
    </div>
  );
}

export function PageHeader({ title, description, action }: { title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col gap-4 pb-8 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="heading-4 text-ink">{title}</h1>
        {description && <p className="body-6 pt-1 text-ink2">{description}</p>}
      </div>
      {action}
    </div>
  );
}
