import Image from "next/image";
import Link from "next/link";

/** Logo principal (P con auto y señal) + nombre en texto, adaptado al tema. */
export function Logo({ href = "/", compact = false }: { href?: string; compact?: boolean }) {
  return (
    <Link href={href} className="group inline-flex items-center gap-2 rounded-lg" aria-label="Smart Parking, ir al inicio">
      <span className="relative block size-9 shrink-0">
        <Image src="/brand/mark-light.png" alt="" fill sizes="36px" className="object-contain dark:hidden" priority />
        <Image src="/brand/mark-dark.png" alt="" fill sizes="36px" className="hidden object-contain dark:block" priority />
      </span>
      {!compact && (
        <span className="flex flex-col leading-none">
          <span className="font-display text-sm font-semibold tracking-[0.14em] text-primary">SMART</span>
          <span className="font-display text-base font-semibold tracking-[0.08em] text-ink">PARKING</span>
        </span>
      )}
    </Link>
  );
}
