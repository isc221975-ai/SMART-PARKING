"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import { CaretUpDown, type Icon } from "@phosphor-icons/react";

export interface MenuItem {
  label: string;
  icon: Icon;
  href?: string;
  onSelect?: () => void;
  tone?: "danger";
  hint?: string;
}

/**
 * Menú de cuenta: popover nativo abierto con invoker commands, posicionado con CSS anchor
 * positioning (respaldo con coordenadas si el navegador no lo soporta) y navegable con flechas.
 */
export function AccountMenu({ user, subtitle, items, compact = false }: { user: string; subtitle: string; items: MenuItem[]; compact?: boolean }) {
  const id = useId().replace(/:/g, "");
  const menuId = `menu-${id}`;
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const viaKeyboard = useRef(false);
  const [expanded, setExpanded] = useState(false);
  const initial = user.trim().slice(0, 1).toUpperCase() || "?";

  const menuItems = () => Array.from(menuRef.current?.querySelectorAll<HTMLElement>("[role=menuitem]") ?? []);

  useEffect(() => {
    const menu = menuRef.current;
    const trigger = triggerRef.current;
    if (!menu || !trigger) return;
    const onToggle = (e: Event) => {
      const open = (e as ToggleEvent).newState === "open";
      setExpanded(open);
      if (!open) return;
      if (!CSS.supports("position-area", "block-end")) {
        const r = trigger.getBoundingClientRect();
        const m = menu.getBoundingClientRect();
        const below = r.bottom + m.height + 8 < window.innerHeight;
        menu.style.position = "fixed";
        menu.style.top = `${below ? r.bottom + 8 : r.top - m.height - 8}px`;
        menu.style.left = `${Math.max(8, Math.min(r.right - m.width, window.innerWidth - m.width - 8))}px`;
      }
      if (viaKeyboard.current) menuItems()[0]?.focus();
      viaKeyboard.current = false;
    };
    menu.addEventListener("toggle", onToggle);
    return () => menu.removeEventListener("toggle", onToggle);
  }, []);

  function onTriggerKey(e: React.KeyboardEvent) {
    if (e.key === "Enter" || e.key === " ") viaKeyboard.current = true;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      viaKeyboard.current = true;
      if (!expanded) triggerRef.current?.click();
      else menuItems()[0]?.focus();
    }
  }

  function onMenuKey(e: React.KeyboardEvent) {
    const list = menuItems();
    const i = list.indexOf(document.activeElement as HTMLElement);
    const go = (n: number) => {
      e.preventDefault();
      list[(n + list.length) % list.length]?.focus();
    };
    if (e.key === "ArrowDown") go(i + 1);
    else if (e.key === "ArrowUp") go(i - 1);
    else if (e.key === "Home") go(0);
    else if (e.key === "End") go(list.length - 1);
    else if (e.key === "Tab") menuRef.current?.hidePopover();
  }

  const close = () => menuRef.current?.hidePopover();
  const itemCls = (danger?: boolean) =>
    `flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left body-5 outline-none transition-colors duration-300 ease-weighted hover:bg-muted focus-visible:bg-muted ${danger ? "text-danger" : "text-ink"}`;

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={expanded}
        aria-label={compact ? `Cuenta de ${user}` : undefined}
        onKeyDown={onTriggerKey}
        {...({ commandfor: menuId, command: "toggle-popover" } as object)}
        className={
          compact
            ? `grid size-10 place-items-center rounded-full transition-transform duration-300 ease-weighted active:scale-[0.96] ${expanded ? "ring-2 ring-primary ring-offset-2 ring-offset-surface" : ""}`
            : `flex w-full items-center gap-3 rounded-xl p-2 text-left transition-colors duration-300 ease-weighted hover:bg-muted ${expanded ? "bg-muted" : ""}`
        }
      >
        <span className="grid size-9 shrink-0 place-items-center rounded-full bg-primary font-display button-sm text-on-primary" aria-hidden>
          {initial}
        </span>
        {!compact && (
          <>
            <span className="min-w-0 flex-1">
              <span className="block truncate title-4 text-ink">{user}</span>
              <span className="block truncate caption-5 text-ink2">{subtitle}</span>
            </span>
            <CaretUpDown size={16} className="shrink-0 text-ink2" aria-hidden />
          </>
        )}
      </button>
      <div ref={menuRef} id={menuId} popover="auto" className="sp-menu w-64 rounded-xl border border-border bg-surface p-1 text-ink shadow-xl">
        <div role="menu" aria-label="Menú de cuenta" onKeyDown={onMenuKey}>
          <div className="px-3 pb-2 pt-2" role="presentation">
            <p className="truncate title-4 text-ink">{user}</p>
            <p className="truncate caption-5 text-ink2">{subtitle}</p>
          </div>
          <div className="my-1 h-px bg-border" role="separator" />
          {items.map((it) => {
            const I = it.icon;
            const content = (
              <>
                <I size={18} aria-hidden />
                <span className="flex-1">{it.label}</span>
                {it.hint && <kbd className="rounded-md border border-border px-1.5 font-mono caption-5 text-ink2">{it.hint}</kbd>}
              </>
            );
            return it.href ? (
              <Link key={it.label} href={it.href} role="menuitem" tabIndex={-1} onClick={close} className={itemCls(it.tone === "danger")}>
                {content}
              </Link>
            ) : (
              <button
                key={it.label}
                type="button"
                role="menuitem"
                tabIndex={-1}
                onClick={() => {
                  close();
                  it.onSelect?.();
                }}
                className={itemCls(it.tone === "danger")}
              >
                {content}
              </button>
            );
          })}
        </div>
      </div>
    </>
  );
}
