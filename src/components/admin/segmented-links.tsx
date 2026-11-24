import Link from "next/link";

/** Selector de periodo con enlaces (el estado vive en la URL, así se puede compartir y recargar). */
export function SegmentedLinks({ items, current, label }: { items: { href: string; label: string; key: string }[]; current: string; label: string }) {
  return (
    <nav aria-label={label} className="flex gap-1 overflow-x-auto rounded-xl bg-muted p-1">
      {items.map((it) => {
        const active = it.key === current;
        return (
          <Link
            key={it.key}
            href={it.href}
            scroll={false}
            aria-current={active ? "page" : undefined}
            className={`whitespace-nowrap rounded-lg px-3 py-1.5 caption-1 transition-colors duration-300 ease-weighted ${active ? "bg-surface text-ink shadow-sm" : "text-ink2 hover:text-ink"}`}
          >
            {it.label}
          </Link>
        );
      })}
    </nav>
  );
}
