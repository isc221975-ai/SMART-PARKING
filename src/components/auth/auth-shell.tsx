import Link from "next/link";
import { ArrowLeft, CheckCircle } from "@phosphor-icons/react/dist/ssr";
import { Logo } from "@/components/brand/logo";
import { ThemeToggle } from "@/components/theme-toggle";

export function AuthShell({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-[1fr_1.1fr]">
      <aside className="relative hidden flex-col justify-between overflow-hidden bg-primary p-12 text-on-primary lg:flex">
        <Link href="/" className="inline-flex items-center gap-2 button-sm opacity-90 hover:opacity-100">
          <ArrowLeft size={16} weight="bold" aria-hidden /> Volver al inicio
        </Link>
        <div className="flex max-w-md flex-col gap-6">
          <p className="heading-4">Tu credencial vehicular del campus, siempre en tu celular.</p>
          <ul className="flex flex-col gap-3">
            {["Entrada y salida registradas al momento", "Una credencial QR por cada placa", "Historial de tus accesos en tu portal"].map((t) => (
              <li key={t} className="flex items-center gap-3 body-5 opacity-95">
                <CheckCircle size={20} weight="fill" className="text-accent" aria-hidden /> {t}
              </li>
            ))}
          </ul>
        </div>
        <p className="caption-5 opacity-90">Instituto Tecnológico Superior de Atlixco</p>
        <div aria-hidden className="pointer-events-none absolute -bottom-24 -right-24 size-96 rounded-full border-[48px] border-white/5" />
        <div aria-hidden className="pointer-events-none absolute -bottom-6 -right-6 size-48 rounded-full border-[24px] border-white/5" />
      </aside>
      <main id="contenido" className="flex flex-col px-6 py-6">
        <div className="flex items-center justify-between">
          <Logo />
          <ThemeToggle />
        </div>
        <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center py-12">
          <h1 className="heading-4 text-ink">{title}</h1>
          <p className="body-6 pt-2 text-ink2">{subtitle}</p>
          <div className="pt-8">{children}</div>
        </div>
      </main>
    </div>
  );
}
