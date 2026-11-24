import { requireSession } from "@/lib/auth";
import { repo } from "@/lib/data";
import { haceDias } from "@/lib/data/shared";
import { PageHeader } from "@/components/app/app-shell";
import { HistorialView } from "@/components/app/historial-view";

export const metadata = { title: "Historial" };

/** Días de historial que se cargan; los filtros trabajan dentro de este rango. */
const DIAS = 90;

export default async function HistorialPage() {
  const s = await requireSession("cliente");
  const accesos = await repo().listAccesos({ usuarioId: Number(s.sub), desde: haceDias(DIAS), limit: 1000 });
  return (
    <>
      <PageHeader title="Historial" description={`Tus entradas y salidas de los últimos ${DIAS} días, de la más reciente a la más antigua.`} />
      <HistorialView accesos={accesos} dias={DIAS} />
    </>
  );
}
