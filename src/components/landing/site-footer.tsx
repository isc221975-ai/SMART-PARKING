import Link from "next/link";
import { Logo } from "@/components/brand/logo";

export function SiteFooter() {
  return (
    <footer className="border-t border-border bg-surface">
      <div className="mx-auto grid max-w-6xl gap-10 px-6 py-12 md:grid-cols-[1.4fr_1fr_1fr]">
        <div className="flex flex-col gap-4">
          <Logo />
          <p className="body-6 max-w-xs text-ink2">Control de acceso vehicular con credenciales QR para universidades e institutos.</p>
        </div>
        <nav aria-label="Producto" className="flex flex-col gap-3">
          <p className="caption-3 uppercase tracking-[0.12em] text-ink2">Producto</p>
          <Link className="body-6 text-ink hover:text-primary" href="/#como-funciona">Cómo funciona</Link>
          <Link className="body-6 text-ink hover:text-primary" href="/#seguridad">Seguridad y privacidad</Link>
          <Link className="body-6 text-ink hover:text-primary" href="/login">Iniciar sesión</Link>
        </nav>
        <nav aria-label="Legal" className="flex flex-col gap-3">
          <p className="caption-3 uppercase tracking-[0.12em] text-ink2">Legal</p>
          <Link className="body-6 text-ink hover:text-primary" href="/privacidad">Aviso de privacidad</Link>
          <Link className="body-6 text-ink hover:text-primary" href="/terminos">Términos de uso</Link>
        </nav>
      </div>
      <div className="border-t border-border">
        <p className="mx-auto max-w-6xl px-6 py-6 caption-5 text-ink2">© 2026 Smart Parking. Instituto Tecnológico Superior de Atlixco.</p>
      </div>
    </footer>
  );
}
