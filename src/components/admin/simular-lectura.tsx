"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { QrCode, SignIn, SignOut } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { FormAlert, Select } from "@/components/ui/field";

/** Simula el escáner de la caseta para probar sin hardware (ENABLE_SCAN_SIMULATOR=true). */
export function SimularLectura({ placas }: { placas: { placa: string; propietario: string }[] }) {
  const router = useRouter();
  const [placa, setPlaca] = useState(placas[0]?.placa ?? "");
  const [loading, setLoading] = useState(false);
  const [res, setRes] = useState<{ tipo: string; placa: string; nombre: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function run() {
    setLoading(true);
    setError(null);
    const r = await fetch("/api/admin/simular", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ placa }) });
    const data = await r.json();
    setLoading(false);
    if (!r.ok) return setError(data.error ?? "No se pudo registrar la lectura.");
    setRes(data);
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <QrCode size={20} className="text-primary" aria-hidden />
        <p className="title-3 text-ink">Simular lectura de QR</p>
      </div>
      <p className="body-6 text-ink2">Registra una entrada o salida como si el escáner de la caseta leyera la credencial.</p>
      <label htmlFor="sim-placa" className="sr-only">Vehículo</label>
      <Select id="sim-placa" value={placa} onChange={(e) => setPlaca(e.target.value)}>
        {placas.map((p) => (
          <option key={p.placa} value={p.placa}>
            {p.placa} · {p.propietario}
          </option>
        ))}
      </Select>
      <Button onClick={run} loading={loading} disabled={!placa}>
        Leer credencial
      </Button>
      {error && <FormAlert>{error}</FormAlert>}
      {res && (
        <div role="status" className="flex items-center gap-3 rounded-xl bg-muted p-3">
          <span className={`grid size-9 place-items-center rounded-lg ${res.tipo === "entrada" ? "bg-[color-mix(in_srgb,var(--color-accent)_16%,transparent)] text-success" : "bg-surface text-ink2"}`}>
            {res.tipo === "entrada" ? <SignIn size={18} weight="bold" aria-hidden /> : <SignOut size={18} weight="bold" aria-hidden />}
          </span>
          <p className="body-6 text-ink">
            {res.tipo === "entrada" ? "Entrada" : "Salida"} registrada para <span className="font-mono">{res.placa}</span> · {res.nombre}
          </p>
        </div>
      )}
    </div>
  );
}
