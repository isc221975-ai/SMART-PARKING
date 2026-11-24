import Link from "next/link";
import { ArrowLeft } from "@phosphor-icons/react/dist/ssr";
import { requireSession } from "@/lib/auth";
import { PageHeader } from "@/components/app/app-shell";
import { FotoCaptureLoader } from "@/components/app/foto-capture-loader";

export const metadata = { title: "Foto de perfil" };

export default async function Page({ searchParams }: { searchParams: Promise<{ debug?: string }> }) {
  await requireSession("cliente");
  const { debug } = await searchParams;
  return (
    <>
      <Link href="/cliente/perfil" className="inline-flex items-center gap-1 pb-3 caption-1 text-primary underline-offset-4 hover:underline">
        <ArrowLeft size={14} weight="bold" aria-hidden /> Mi perfil
      </Link>
      <PageHeader title="Foto de perfil verificada" description="Tu teléfono revisa la foto en el momento. Después la aprueba administración." />
      <FotoCaptureLoader debug={debug === "1"} />
    </>
  );
}
