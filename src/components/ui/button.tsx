import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

type Variant = "primary" | "accent" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

const base =
  "inline-flex items-center justify-center gap-2 rounded-lg whitespace-nowrap select-none " +
  "transition-[background-color,color,border-color,opacity,transform] duration-300 ease-weighted " +
  "active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50 " +
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary";

const variants: Record<Variant, string> = {
  primary: "bg-primary text-on-primary hover:bg-[color-mix(in_srgb,var(--color-primary)_88%,var(--color-ink))]",
  accent: "bg-accent text-on-accent hover:bg-[color-mix(in_srgb,var(--color-accent)_88%,var(--color-ink))]",
  secondary: "border border-border bg-surface text-ink hover:bg-muted",
  ghost: "text-ink2 hover:bg-muted hover:text-ink",
  danger: "border border-border bg-surface text-danger hover:bg-[color-mix(in_srgb,var(--color-danger)_10%,var(--color-surface))]",
};

const sizes: Record<Size, string> = {
  sm: "button-sm px-3 py-2 min-h-9",
  md: "button-md px-3 py-2 min-h-10",
  lg: "button-md px-6 py-3 min-h-12",
};

export function buttonClass(variant: Variant = "primary", size: Size = "md", extra = "") {
  return `${base} ${variants[variant]} ${sizes[size]} ${extra}`;
}

interface Common {
  variant?: Variant;
  size?: Size;
  children: ReactNode;
}

export function Button({ variant, size, className = "", loading, children, ...rest }: Common & ComponentProps<"button"> & { loading?: boolean }) {
  return (
    <button className={buttonClass(variant, size, className)} aria-busy={loading || undefined} disabled={loading || rest.disabled} {...rest}>
      {loading ? <span className="size-4 rounded-full border-2 border-current border-r-transparent motion-safe:animate-spin" aria-hidden /> : null}
      {children}
    </button>
  );
}

export function ButtonLink({ variant, size, className = "", children, ...rest }: Common & ComponentProps<typeof Link>) {
  return (
    <Link className={buttonClass(variant, size, className)} {...rest}>
      {children}
    </Link>
  );
}
