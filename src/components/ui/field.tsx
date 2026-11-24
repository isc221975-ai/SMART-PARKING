import type { ComponentProps, ReactNode } from "react";

const control =
  "w-full min-h-11 rounded-lg border border-border bg-surface px-3 py-2 body-3 text-ink placeholder:text-ink2/70 " +
  "transition-[border-color,box-shadow] duration-300 ease-weighted " +
  "focus:outline-none focus:border-primary focus:ring-4 focus:ring-[color-mix(in_srgb,var(--color-primary)_18%,transparent)] " +
  "aria-[invalid=true]:border-danger disabled:opacity-60";

export function Field({ label, hint, error, htmlFor, children }: { label: string; hint?: string; error?: string; htmlFor: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={htmlFor} className="title-4 text-ink">
        {label}
      </label>
      {children}
      {error ? (
        <p id={`${htmlFor}-error`} role="alert" className="caption-2 text-danger">
          {error}
        </p>
      ) : hint ? (
        <p id={`${htmlFor}-hint`} className="caption-2 text-ink2">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

export function Input({ className = "", ...rest }: ComponentProps<"input">) {
  return <input className={`${control} ${className}`} {...rest} />;
}

export function Select({ className = "", children, ...rest }: ComponentProps<"select">) {
  return (
    <select className={`${control} appearance-none bg-[length:16px] bg-[right_12px_center] bg-no-repeat pr-10 ${className}`} style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 256 256' fill='%234E5F77'%3E%3Cpath d='M213.66 101.66l-80 80a8 8 0 0 1-11.32 0l-80-80a8 8 0 0 1 11.32-11.32L128 164.69l74.34-74.35a8 8 0 0 1 11.32 11.32Z'/%3E%3C/svg%3E\")" }} {...rest}>
      {children}
    </select>
  );
}

export function FormAlert({ tone = "danger", children }: { tone?: "danger" | "success"; children: ReactNode }) {
  const color = tone === "danger" ? "text-danger" : "text-success";
  return (
    <div role={tone === "danger" ? "alert" : "status"} className={`rounded-lg border border-border bg-muted px-3 py-2 body-6 ${color}`}>
      {children}
    </div>
  );
}
