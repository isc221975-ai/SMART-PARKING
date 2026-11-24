import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, Car, ClockCounterClockwise, Plus, SignIn, SignOut } from "@phosphor-icons/react/dist/ssr";
import { requireSession } from "@/lib/auth";
import { repo } from "@/lib/data";
import { nombreCompleto } from "@/lib/data/shared";
import { fmtFechaHora, fmtFechaLarga } from "@/lib/format";
import { ROL_LABEL } from "@/lib/identity";
import { QrCredential } from "@/components/app/qr-credential";
import { HomeShortcuts } from "@/components/app/home-shortcuts";
import { Avatar } from "@/components/app/avatar";
import { ButtonLink } from "@/components/ui/button";
import { Card, EmptyState, Plate } from "@/components/ui/misc";

export const metadata = { title: "Inicio" };

export default async function ClienteHome() {
  const s = await requireSession("cliente");
  const id = Number(s.sub);
  const [u, vehiculos, recientes, movimientos] = await Promise.all([
    repo().getUsuario(id),
    repo().listVehiculos(id),
    repo().listAccesos({ usuarioId: id, limit: 1 }),
    repo().contarAccesos(id),
  ]);
  if (!u) redirect("/login");
  const fotoUrl = u.foto_path ? await repo().fotoUrl(u.foto_path) : null;
  const ultimo = recientes[0];
  const esAlumno = u.rol === "estudiante";
  const titular = nombreCompleto(u);
  const credenciales = vehiculos.filter((v) => v.qr_token).map((v) => ({ placa: v.placa, token: v.qr_token! }));

  return (
    <div className="flex flex-col gap-8">
      <div>
        <p className="caption-1 text-ink2">{fmtFechaLarga()}</p>
        <h1 className="heading-4 pt-1 text-ink">Hola, {u.nombre?.split(" ")[0] ?? s.name}</h1>
      </div>

      <div className="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[minmax(0,360px)_minmax(0,1fr)]">
        {credenciales.length ? (
          <QrCredential vehiculos={credenciales} titular={titular} />
        ) : (
          <EmptyState
            icon={<Car size={24} aria-hidden />}
            title="Registra tu primer vehículo"
            text="Agrega la placa del auto o moto con el que vienes al campus. Tu credencial QR aparece en cuanto la registras."
            action={
              <ButtonLink href="/cliente/vehiculos?agregar=1">
                <Plus size={18} weight="bold" aria-hidden /> Agregar vehículo
              </ButtonLink>
            }
          />
        )}

        <div className="flex flex-col gap-6">
          {/* Titular */}
          <Card className="sp-rise flex items-center gap-4 p-4 sm:p-6">
            <Avatar src={fotoUrl} name={titular} size={64} />
            <div className="min-w-0 flex-1">
              <p className="truncate title-2 text-ink">{titular}</p>
              {esAlumno ? (
                <>
                  <p className="caption-2 text-ink2">
                    <span className="font-mono">{u.matricula?.toUpperCase()}</span>
                    {u.semestre ? ` · ${u.semestre}.º semestre` : ""}
                  </p>
                  {u.carrera && <p className="caption-2 text-ink2">{u.carrera}</p>}
                </>
              ) : (
                <p className="caption-2 text-ink2">{u.rol ? ROL_LABEL[u.rol] : ""}</p>
              )}
            </div>
          </Card>

          {/* Resumen */}
          <div className="grid grid-cols-2 gap-4">
            <Card className="sp-rise p-4 sm:p-6">
              <p className="flex items-center gap-2 caption-1 text-ink2">
                <Car size={16} aria-hidden /> Vehículos
              </p>
              <p className="heading-5 pt-2 text-ink">{vehiculos.length}</p>
            </Card>
            <Card className="sp-rise p-4 sm:p-6">
              <p className="flex items-center gap-2 caption-1 text-ink2">
                <ClockCounterClockwise size={16} aria-hidden /> Movimientos
              </p>
              <p className="heading-5 pt-2 text-ink">{movimientos}</p>
            </Card>
          </div>

          {/* Último movimiento */}
          <Card className="sp-rise p-4 sm:p-6">
            <div className="flex items-center justify-between gap-2">
              <h2 className="title-3 text-ink">Último movimiento</h2>
              <Link href="/cliente/historial" className="inline-flex items-center gap-1 caption-1 text-primary underline-offset-4 hover:underline">
                Ver historial <ArrowRight size={14} weight="bold" aria-hidden />
              </Link>
            </div>
            {ultimo ? (
              <div className="flex items-center gap-3 pt-4">
                <span className={`grid size-10 shrink-0 place-items-center rounded-lg ${ultimo.tipo === "entrada" ? "bg-[color-mix(in_srgb,var(--color-accent)_16%,transparent)] text-success" : "bg-muted text-ink2"}`}>
                  {ultimo.tipo === "entrada" ? <SignIn size={20} weight="bold" aria-hidden /> : <SignOut size={20} weight="bold" aria-hidden />}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="title-4 text-ink">{ultimo.tipo === "entrada" ? "Entrada · dentro del campus" : "Salida · fuera del campus"}</p>
                  <p className="caption-2 text-ink2">
                    <time dateTime={ultimo.fecha}>{fmtFechaHora(ultimo.fecha)}</time>
                  </p>
                </div>
                <Plate placa={ultimo.vehiculo_placa} size="sm" />
              </div>
            ) : (
              <p className="body-6 pt-4 text-ink2">Cuando muestres tu credencial en la caseta, tu entrada aparecerá aquí.</p>
            )}
          </Card>

          {/* Atajos */}
          <section aria-labelledby="atajos-t">
            <h2 id="atajos-t" className="title-3 pb-3 text-ink">
              Atajos
            </h2>
            <HomeShortcuts qrDisponible={credenciales.length > 0} />
          </section>
        </div>
      </div>
    </div>
  );
}
