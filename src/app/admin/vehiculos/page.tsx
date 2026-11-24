import { repo } from "@/lib/data";
import { requireSession } from "@/lib/auth";
import { PageHeader } from "@/components/app/app-shell";
import { VehiculosTable } from "@/components/admin/tables";

export const metadata = { title: "Vehículos" };

export default async function Page({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  await requireSession("admin");
  const { q } = await searchParams;
  // El qr_token no se envía al navegador del panel: solo lo necesita el propietario.
  const rows = (await repo().listVehiculos()).map((v) => ({ ...v, qr_token: null }));
  const sinDueno = rows.filter((r) => r.sinDueno).length;
  return (
    <>
      <PageHeader title="Vehículos" description={`Placas registradas y su propietario${sinDueno ? ` · ${sinDueno} sin dueño registrado` : ""}.`} />
      <VehiculosTable key={q ?? ""} rows={rows} initialQuery={(q ?? "").slice(0, 60)} />
    </>
  );
}
