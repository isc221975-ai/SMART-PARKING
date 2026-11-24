"use client";

import Link from "next/link";
import { ClockCounterClockwise, Plus, QrCode, UserCircle, type Icon } from "@phosphor-icons/react";
import { SHELL_EVENT, emit } from "@/components/app/shell/events";

const cls =
  "flex min-h-20 flex-col items-start justify-between gap-3 rounded-xl border border-border bg-bg p-3 text-left transition-[border-color,transform] duration-300 ease-weighted hover:border-primary active:scale-[0.98]";

function Inner({ icon: I, label, hint }: { icon: Icon; label: string; hint?: string }) {
  return (
    <>
      <span className="flex w-full items-center justify-between">
        <I size={20} className="text-primary" aria-hidden />
        {hint && <kbd className="hidden rounded-md border border-border px-1.5 font-mono caption-5 text-ink2 lg:inline">{hint}</kbd>}
      </span>
      <span className="title-4 text-ink">{label}</span>
    </>
  );
}

/** Atajos del inicio. «Mostrar QR» abre la credencial ampliada sin salir de la página. */
export function HomeShortcuts({ qrDisponible }: { qrDisponible: boolean }) {
  return (
    <ul className="grid grid-cols-2 gap-2">
      <li>
        {qrDisponible ? (
          <button type="button" onClick={() => emit(SHELL_EVENT.showQr)} className={`${cls} w-full`}>
            <Inner icon={QrCode} label="Mostrar QR" hint="Q" />
          </button>
        ) : (
          <Link href="/cliente/vehiculos?agregar=1" className={cls}>
            <Inner icon={QrCode} label="Obtener mi QR" />
          </Link>
        )}
      </li>
      <li>
        <Link href="/cliente/vehiculos?agregar=1" className={cls}>
          <Inner icon={Plus} label="Agregar vehículo" />
        </Link>
      </li>
      <li>
        <Link href="/cliente/historial" className={cls}>
          <Inner icon={ClockCounterClockwise} label="Ver historial" hint="H" />
        </Link>
      </li>
      <li>
        <Link href="/cliente/perfil" className={cls}>
          <Inner icon={UserCircle} label="Mis datos" />
        </Link>
      </li>
    </ul>
  );
}
