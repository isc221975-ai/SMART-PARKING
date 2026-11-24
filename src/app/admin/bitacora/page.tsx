import { repo } from "@/lib/data";
import { requireSession } from "@/lib/auth";
import { PageHeader } from "@/components/app/app-shell";
import { BitacoraForm } from "@/components/admin/bitacora-form";
import { BitacoraTable } from "@/components/admin/tables";
import { Card } from "@/components/ui/misc";

export const metadata = { title: "Bitácora" };

export default async function Page() {
  await requireSession("admin");
  const rows = await repo().listBitacora();
  return (
    <>
      <PageHeader title="Bitácora de visitantes" description="Proveedores y visitantes que entran sin cuenta." />
      <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
        <Card className="h-fit p-6">
          <p className="title-3 pb-6 text-ink">Nueva visita</p>
          <BitacoraForm />
        </Card>
        <div className="min-w-0">
          <BitacoraTable rows={rows} />
        </div>
      </div>
    </>
  );
}
