import { redirect } from "next/navigation";
import { requireSession } from "@/lib/auth";
import { repo } from "@/lib/data";
import { nombreCompleto } from "@/lib/data/shared";
import { PageHeader } from "@/components/app/app-shell";
import { VehiculosManager } from "@/components/app/vehiculos-manager";

export const metadata = { title: "Mis vehículos" };

export default async function VehiculosPage() {
  const s = await requireSession("cliente");
  const id = Number(s.sub);
  const [u, vehiculos] = await Promise.all([repo().getUsuario(id), repo().listVehiculos(id)]);
  if (!u) redirect("/login");
  return (
    <>
      <PageHeader title="Mis vehículos" description="Cada placa tiene su propia credencial QR y solo puede pertenecer a una cuenta." />
      <VehiculosManager vehiculos={vehiculos.map((v) => ({ placa: v.placa, qr_token: v.qr_token }))} titular={nombreCompleto(u)} />
    </>
  );
}
