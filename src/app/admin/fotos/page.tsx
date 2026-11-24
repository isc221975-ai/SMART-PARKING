import { requireSession } from "@/lib/auth";
import { repo } from "@/lib/data";
import { PageHeader } from "@/components/app/app-shell";
import { FotoReview } from "@/components/admin/foto-review";

export const metadata = { title: "Revisión de fotos" };

export default async function Page() {
  await requireSession("admin");
  const cola = await repo().siguienteFotoPendiente();
  return (
    <>
      <PageHeader title="Revisión de fotos" description="Una foto a la vez, la más antigua primero. A aprueba y R rechaza. Los enlaces vencen en 5 minutos." />
      <FotoReview initial={cola} />
    </>
  );
}
