import type { ReactNode } from "react";

export function Card({ className = "", children }: { className?: string; children: ReactNode }) {
  return <div className={`rounded-2xl border border-border bg-surface ${className}`}>{children}</div>;
}

type Tone = "neutral" | "primary" | "success" | "warning" | "danger" | "accent";
const tones: Record<Tone, string> = {
  neutral: "bg-muted text-ink2",
  primary: "bg-[color-mix(in_srgb,var(--color-primary)_12%,transparent)] text-primary-ink",
  accent: "bg-[color-mix(in_srgb,var(--color-accent)_14%,transparent)] text-success-ink",
  success: "bg-[color-mix(in_srgb,var(--color-success)_12%,transparent)] text-success-ink",
  warning: "bg-[color-mix(in_srgb,var(--color-warning)_14%,transparent)] text-warning-ink",
  danger: "bg-[color-mix(in_srgb,var(--color-danger)_12%,transparent)] text-danger-ink",
};

export function Badge({ tone = "neutral", children, className = "" }: { tone?: Tone; children: ReactNode; className?: string }) {
  return <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 caption-3 ${tones[tone]} ${className}`}>{children}</span>;
}

export function Eyebrow({ children }: { children: ReactNode }) {
  return <p className="caption-3 uppercase tracking-[0.12em] text-primary">{children}</p>;
}

export function EmptyState({ icon, title, text, action }: { icon: ReactNode; title: string; text: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border bg-surface px-6 py-12 text-center">
      <div className="grid size-12 place-items-center rounded-xl bg-muted text-primary">{icon}</div>
      <p className="title-2 text-ink">{title}</p>
      <p className="body-6 max-w-sm text-ink2">{text}</p>
      {action ? <div className="pt-2">{action}</div> : null}
    </div>
  );
}

export function Plate({ placa, size = "md" }: { placa: string; size?: "sm" | "md" }) {
  const text = placa.length > 3 ? `${placa.slice(0, 3)} ${placa.slice(3)}` : placa;
  return (
    <span className={`inline-flex items-center whitespace-nowrap rounded-md border border-border bg-surface font-mono font-medium tracking-wider text-ink ${size === "sm" ? "px-2 py-0.5 caption-1" : "px-2 py-1 body-5"}`}>
      {text}
    </span>
  );
}
