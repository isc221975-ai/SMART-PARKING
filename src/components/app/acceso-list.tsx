import { SignIn, SignOut } from "@phosphor-icons/react/dist/ssr";
import type { AccesoDetalle } from "@/lib/data/types";
import { fmtFecha, fmtHora } from "@/lib/format";
import { Plate } from "@/components/ui/misc";

export function AccesoList({ accesos, showName = false }: { accesos: AccesoDetalle[]; showName?: boolean }) {
  return (
    <ul className="divide-y divide-border">
      {accesos.map((a) => {
        const entrada = a.tipo === "entrada";
        return (
          <li key={a.id} className="flex items-center gap-3 py-3">
            <span className={`grid size-9 shrink-0 place-items-center rounded-lg ${entrada ? "bg-[color-mix(in_srgb,var(--color-accent)_16%,transparent)] text-success" : "bg-muted text-ink2"}`}>
              {entrada ? <SignIn size={18} weight="bold" aria-hidden /> : <SignOut size={18} weight="bold" aria-hidden />}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate title-4 text-ink">{showName ? a.nombre : entrada ? "Entrada" : "Salida"}</p>
              <p className="caption-5 text-ink2">
                {showName ? `${entrada ? "Entrada" : "Salida"} · ` : ""}
                {fmtFecha(a.fecha)}
              </p>
            </div>
            <Plate placa={a.vehiculo_placa} size="sm" />
            <time dateTime={a.fecha} className="w-12 text-right font-mono caption-1 text-ink">
              {fmtHora(a.fecha)}
            </time>
          </li>
        );
      })}
    </ul>
  );
}
