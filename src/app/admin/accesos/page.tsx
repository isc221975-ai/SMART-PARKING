import { repo } from "@/lib/data";
import { requireSession } from "@/lib/auth";
import { dayKey } from "@/lib/data/shared";
import { PageHeader } from "@/components/app/app-shell";
import { AccesosTable } from "@/components/admin/tables";
import { AccesosFiltros } from "@/components/admin/accesos-filtros";

export const metadata = { title: "Accesos" };

const FECHA = /^\d{4}-\d{2}-\d{2}$/;
/** Inicio del día "YYYY-MM-DD" en la zona del campus (UTC-6, sin horario de verano). */
const inicioDia = (k: string) => new Date(`${k}T00:00:00-06:00`);

export default async function Page({ searchParams }: { searchParams: Promise<{ rango?: string; desde?: string; hasta?: string; q?: string }> }) {
  await requireSession("admin");
  const sp = await searchParams;
  const hoy = dayKey(new Date());
  const desdeQ = sp.desde && FECHA.test(sp.desde) ? sp.desde : "";
  const hastaQ = sp.hasta && FECHA.test(sp.hasta) ? sp.hasta : "";
  const personalizado = Boolean(desdeQ || hastaQ);
  const rango = personalizado ? "personalizado" : ["hoy", "30", "90"].includes(sp.rango ?? "") ? sp.rango! : "7";

  let desde: Date;
  let hasta: Date | undefined;
  if (personalizado) {
    desde = desdeQ ? inicioDia(desdeQ) : new Date(0);
    hasta = hastaQ ? new Date(inicioDia(hastaQ).getTime() + 86_400_000) : undefined;
  } else {
    const dias = rango === "hoy" ? 1 : Number(rango);
    desde = new Date(inicioDia(hoy).getTime() - (dias - 1) * 86_400_000);
  }
  const rows = await repo().listAccesos({ desde: desde.toISOString(), hasta: hasta?.toISOString(), limit: 5000 });
  const titulo = personalizado
    ? `Del ${desdeQ || "inicio"} al ${hastaQ || "día de hoy"}`
    : rango === "hoy"
      ? "Hoy"
      : `Últimos ${rango} días`;

  return (
    <>
      <PageHeader title="Accesos" description={`Entradas y salidas registradas por el escáner de la caseta · ${titulo}.`} />
      <div className="flex flex-col gap-4">
        <AccesosFiltros key={`${desdeQ}|${hastaQ}`} rango={rango} desde={desdeQ} hasta={hastaQ} hoy={hoy} />
        <AccesosTable key={sp.q ?? ""} rows={rows} initialQuery={(sp.q ?? "").slice(0, 60)} />
      </div>
    </>
  );
}
