import { ArrowLeft } from "@phosphor-icons/react/dist/ssr";
import { Logo } from "@/components/brand/logo";
import { ButtonLink } from "@/components/ui/button";

export const metadata = { title: "Página no encontrada" };

export default function NotFound() {
  return (
    <main id="contenido" className="flex min-h-dvh flex-col items-center justify-center gap-6 px-6 text-center">
      <Logo />
      <p className="font-mono heading-2 text-primary">404</p>
      <h1 className="heading-4 max-w-md text-ink">Este lugar del estacionamiento no existe</h1>
      <p className="body-6 max-w-sm text-ink2">La página que buscas se movió o nunca existió. Revisa la dirección o vuelve al inicio.</p>
      <ButtonLink href="/">
        <ArrowLeft size={18} weight="bold" aria-hidden /> Volver al inicio
      </ButtonLink>
    </main>
  );
}
