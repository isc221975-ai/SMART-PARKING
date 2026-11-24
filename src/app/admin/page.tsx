import Link from "next/link";
import { ArrowRight, Briefcase, Camera, Car, ChalkboardTeacher, ListChecks, SignIn, SignOut, Student, UserList, UserMinus, UsersThree } from "@phosphor-icons/react/dist/ssr";
import { repo, type Rango } from "@/lib/data";
import { requireSession } from "@/lib/auth";
import { fmtFechaLarga } from "@/lib/format";
import { env } from "@/lib/env";
import { PageHeader } from "@/components/app/app-shell";
import { AccesoList } from "@/components/app/acceso-list";
import { SimularLectura } from "@/components/admin/simular-lectura";
import { EntradasChart } from "@/components/admin/entradas-chart";
import { CamaraCaseta } from "@/components/admin/camara-caseta";
import { SegmentedLinks } from "@/components/admin/segmented-links";
import { Badge, Card } from "@/components/ui/misc";

export const metadata = { title: "Resumen" };

const RANGOS: { key: Rango; label: string; titulo: string }[] = [
  { key: "hoy", label: "Hoy", titulo: "Hoy" },
  { key: "7", label: "7 días", titulo: "Los últimos 7 días" },
  { key: "30", label: "30 días", titulo: "Los últimos 30 días" },
];

export default async function AdminHome({ searchParams }: { searchParams: Promise<{ rango?: string }> }) {
  await requireSession("admin");
  const { rango: r } = await searchParams;
  const rango: Rango = r === "7" || r === "30" ? r : "hoy";
  const meta = RANGOS.find((x) => x.key === rango)!;
  const [resumen, recientes, vehiculos] = await Promise.all([
    repo().resumen(rango),
    repo().listAccesos({ limit: 8 }),
    env.enableScanSimulator ? repo().listVehiculos() : Promise.resolve([]),
  ]);

  const periodo = [
    { label: "Accesos", value: resumen.accesos, icon: ListChecks },
    { label: "Entradas", value: resumen.entradas, icon: SignIn },
    { label: "Salidas", value: resumen.salidas, icon: SignOut },
  ];
  const totales = [
    { label: "Dentro ahora", value: resumen.dentroAhora, icon: Car, hint: "Última lectura: entrada" },
    { label: "Vehículos registrados", value: resumen.vehiculos, icon: Car, hint: "En total" },
    { label: "Usuarios registrados", value: resumen.usuarios, icon: UsersThree, hint: "En total" },
  ];
  const comunidad = [
    { label: "Alumnos", value: resumen.comunidad.alumnos, icon: Student },
    { label: "Docentes", value: resumen.comunidad.docentes, icon: ChalkboardTeacher },
    { label: "Administrativos", value: resumen.comunidad.administrativos, icon: Briefcase },
    { label: "Sin vehículo", value: resumen.comunidad.sinVehiculo, icon: UserMinus },
  ];
  const stat = (s: { label: string; value: number; icon: typeof Car }, nota: string) => (
    <li key={s.label} className="sp-rise">
      <Card className="flex h-full flex-col p-4">
        <p className="flex items-start gap-2 caption-1 text-ink2">
          <s.icon size={16} className="mt-0.5 shrink-0 text-primary" aria-hidden /> {s.label}
        </p>
        <div className="mt-auto pt-2">
          <p className="heading-5 text-ink">{s.value}</p>
          <p className="caption-5 text-ink2">{nota}</p>
        </div>
      </Card>
    </li>
  );

  return (
    <>
      <PageHeader
        title="Resumen"
        description={`Actividad del estacionamiento · ${fmtFechaLarga().toLowerCase()}`}
        action={<SegmentedLinks label="Periodo" current={rango} items={RANGOS.map((x) => ({ key: x.key, label: x.label, href: x.key === "hoy" ? "/admin" : `/admin?rango=${x.key}` }))} />}
      />
      <div className="flex flex-col gap-6">
        <section aria-labelledby="ind-t">
          <h2 id="ind-t" className="sr-only">
            Indicadores
          </h2>
          <ul className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
            {periodo.map((s) => stat(s, meta.titulo))}
            {totales.map((s) => stat(s, s.hint))}
          </ul>
        </section>

        <div className="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
          <Card className="sp-rise p-6">
            <div className="flex flex-wrap items-baseline justify-between gap-2 pb-4">
              <h2 className="title-3 text-ink">{rango === "hoy" ? "Entradas por hora, hoy" : `Entradas por día, ${meta.titulo.toLowerCase()}`}</h2>
              {rango === "hoy" && <span className="caption-5 text-ink2">06:00 a 21:59</span>}
            </div>
            <EntradasChart serie={resumen.serie} titulo={meta.titulo} vacioTexto={rango === "hoy" ? "Sin entradas hoy." : `Sin entradas en ${meta.titulo.toLowerCase()}.`} />
          </Card>
          <Card className="sp-rise p-6">
            <CamaraCaseta />
          </Card>
        </div>

        <div className="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
          <Card className="sp-rise p-6">
            <div className="flex items-center justify-between gap-2">
              <h2 className="title-3 text-ink">Últimos accesos</h2>
              <Link href="/admin/accesos" className="inline-flex items-center gap-1 caption-1 text-primary underline-offset-4 hover:underline">
                Ver todos <ArrowRight size={14} weight="bold" aria-hidden />
              </Link>
            </div>
            <div className="pt-2">
              {recientes.length ? <AccesoList accesos={recientes} showName /> : <p className="body-6 pt-4 text-ink2">Todavía no hay accesos registrados. Aparecerán aquí en cuanto el escáner lea una credencial.</p>}
            </div>
          </Card>

          <div className="flex flex-col gap-6">
            <Card className="sp-rise p-6">
              <div className="flex items-center justify-between gap-2">
                <h2 className="title-3 text-ink">Comunidad registrada</h2>
                <Link href="/admin/usuarios" className="inline-flex items-center gap-1 caption-1 text-primary underline-offset-4 hover:underline">
                  Usuarios <ArrowRight size={14} weight="bold" aria-hidden />
                </Link>
              </div>
              <ul className="grid grid-cols-2 gap-3 pt-4">
                {comunidad.map((c) => (
                  <li key={c.label} className="rounded-xl border border-border p-3">
                    <p className="flex items-center gap-2 caption-2 text-ink2">
                      <c.icon size={16} aria-hidden /> {c.label}
                    </p>
                    <p className="heading-6 pt-1 text-ink">{c.value}</p>
                  </li>
                ))}
              </ul>
            </Card>

            <Card className="sp-rise p-6">
              <div className="flex items-center justify-between gap-2">
                <h2 className="flex items-center gap-2 title-3 text-ink">
                  <Camera size={18} aria-hidden /> Fotos por revisar
                </h2>
                <Badge tone={resumen.fotosPendientes ? "warning" : "success"}>{resumen.fotosPendientes ? `${resumen.fotosPendientes} pendiente${resumen.fotosPendientes > 1 ? "s" : ""}` : "Al día"}</Badge>
              </div>
              <p className="body-6 pt-2 text-ink2">{resumen.fotosPendientes ? "Hay fotos de perfil esperando tu decisión." : "No hay fotos pendientes de revisión."}</p>
              {resumen.fotosPendientes > 0 && (
                <Link href="/admin/fotos" className="inline-flex items-center gap-1 pt-3 caption-1 text-primary underline-offset-4 hover:underline">
                  <UserList size={14} aria-hidden /> Revisar fotos <ArrowRight size={14} weight="bold" aria-hidden />
                </Link>
              )}
            </Card>

            {env.enableScanSimulator && (
              <Card className="p-6">
                <SimularLectura placas={vehiculos.map((v) => ({ placa: v.placa, propietario: v.propietario }))} />
              </Card>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
