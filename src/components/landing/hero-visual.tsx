import QRCode from "react-qr-code";
import { CheckCircle, SignIn, Car } from "@phosphor-icons/react/dist/ssr";
import { Plate } from "@/components/ui/misc";

/** Vista de ejemplo: credencial en el celular + aviso de la caseta. Datos ficticios. */
export function HeroVisual() {
  return (
    <div className="relative mx-auto w-full max-w-md sm:pb-12" aria-label="Ejemplo de credencial QR en el celular" role="img">
      {/* Teléfono */}
      <div className="relative mx-auto w-[280px] rounded-[40px] border border-border bg-surface p-3 shadow-[0_24px_64px_-24px_rgba(13,27,46,0.35)] sm:w-[300px]">
        <div className="rounded-[28px] bg-bg p-4">
          <div className="flex items-center justify-between pb-4">
            <span className="caption-4 text-ink2">Credencial vehicular</span>
            <span className="inline-flex items-center gap-1 rounded-full bg-[color-mix(in_srgb,var(--color-accent)_16%,transparent)] px-2 py-0.5 caption-3 text-success-ink">
              <span className="relative size-1.5 rounded-full bg-current live-dot" /> Vigente
            </span>
          </div>
          <div className="rounded-2xl border border-border bg-surface p-4">
            <div className="rounded-xl bg-white p-3">
              <QRCode value="3f9c2a71e04b8d56a1c7e9f02b4d6a83" size={256} style={{ width: "100%", height: "auto" }} fgColor="#0D1B2E" bgColor="#FFFFFF" />
            </div>
            <div className="flex items-end justify-between pt-4">
              <div>
                <p className="title-3 text-ink">Daniela Ortega</p>
                <p className="caption-5 text-ink2">ISC230418</p>
              </div>
              <Plate placa="TXA4821" size="sm" />
            </div>
          </div>
          <p className="pt-3 text-center caption-5 text-ink2">Muestra este código en la caseta</p>
        </div>
      </div>

      {/* Aviso de caseta */}
      <div className="absolute -left-2 top-16 w-56 rounded-2xl border border-border bg-surface p-3 shadow-[0_16px_40px_-20px_rgba(13,27,46,0.35)] sm:-left-10">
        <div className="flex items-start gap-3">
          <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-[color-mix(in_srgb,var(--color-accent)_16%,transparent)] text-success">
            <CheckCircle size={20} weight="fill" aria-hidden />
          </span>
          <div>
            <p className="title-4 text-ink">Entrada registrada</p>
            <p className="caption-5 text-ink2">Caseta principal · 07:42</p>
          </div>
        </div>
      </div>

      {/* Movimientos recientes */}
      <div className="absolute -bottom-16 -right-10 hidden w-56 sm:block rounded-2xl border border-border bg-surface p-3 shadow-[0_16px_40px_-20px_rgba(13,27,46,0.35)] sm:-right-10">
        <p className="caption-3 pb-2 text-ink2">Últimos movimientos</p>
        <ul className="flex flex-col gap-2">
          {[
            { p: "TRK5126", t: "07:39", icon: SignIn },
            { p: "PXL2087", t: "07:31", icon: SignIn },
            { p: "TYM3390", t: "07:18", icon: Car },
          ].map((r) => (
            <li key={r.p} className="flex items-center justify-between gap-2">
              <span className="flex items-center gap-2">
                <r.icon size={16} className="text-primary" aria-hidden />
                <span className="font-mono caption-4 text-ink">{r.p}</span>
              </span>
              <span className="caption-5 text-ink2">{r.t}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
