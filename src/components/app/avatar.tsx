/** Foto de perfil o, si no hay, las iniciales del nombre. */
export function Avatar({ src, name, size = 64 }: { src?: string | null; name: string; size?: number }) {
  const initials =
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0]!.toUpperCase())
      .join("") || "?";
  const style = { width: size, height: size };
  if (src) {
    // URL firmada temporal del bucket privado: no pasa por next/image para no cachearla.
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt={`Foto de ${name}`} style={style} className="shrink-0 rounded-full border border-border bg-muted object-cover" />;
  }
  return (
    <span
      style={style}
      className={`grid shrink-0 place-items-center rounded-full bg-[color-mix(in_srgb,var(--color-primary)_14%,transparent)] font-display text-primary-ink ${size >= 56 ? "heading-6" : "button-sm"}`}
      aria-hidden
    >
      {initials}
    </span>
  );
}
