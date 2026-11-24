"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import QRCode from "react-qr-code";
import { ArrowsOut, Car, CheckCircle, Plus, Trash } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { FormAlert, Input } from "@/components/ui/field";
import { EmptyState, Plate } from "@/components/ui/misc";
import { useConfirm } from "@/components/app/confirm";
import { CredentialDialog } from "@/components/app/credential-dialog";

type Estado = { tipo: "vacio" } | { tipo: "error"; texto: string } | { tipo: "ok" };

/** Misma regla que el servidor (placaValida): 5 a 8 letras o números, sin espacios ni guiones. */
function validar(normal: string): Estado {
  if (!normal) return { tipo: "vacio" };
  if (/[^A-Z0-9]/.test(normal)) return { tipo: "error", texto: "Usa solo letras y números." };
  if (normal.length < 5) return { tipo: "error", texto: `Faltan ${5 - normal.length} caracteres: una placa tiene de 5 a 8.` };
  if (normal.length > 8) return { tipo: "error", texto: "Una placa tiene como máximo 8 caracteres." };
  return { tipo: "ok" };
}

export function VehiculosManager({ vehiculos, titular }: { vehiculos: { placa: string; qr_token: string | null }[]; titular: string }) {
  const router = useRouter();
  const confirm = useConfirm();
  const input = useRef<HTMLInputElement>(null);
  const [placa, setPlaca] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [abierta, setAbierta] = useState<string | null>(null);
  const normal = placa.toUpperCase().replace(/[\s-]/g, "");
  const estado = validar(normal);
  const credencial = vehiculos.find((v) => v.placa === abierta);

  useEffect(() => {
    const url = new URL(window.location.href);
    if (url.searchParams.get("agregar") !== "1") return;
    input.current?.focus();
    const raf = requestAnimationFrame(() => {
      url.searchParams.delete("agregar");
      window.history.replaceState(null, "", url.pathname + url.search);
    });
    return () => cancelAnimationFrame(raf);
  }, []);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (estado.tipo !== "ok") {
      setError(estado.tipo === "error" ? estado.texto : "Escribe la placa de tu vehículo.");
      input.current?.focus();
      return;
    }
    setLoading(true);
    setError(null);
    setNotice(null);
    const res = await fetch("/api/vehiculos", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ placa: normal }) });
    const data = await res.json().catch(() => ({}));
    setLoading(false);
    if (!res.ok) return setError(data.error ?? "No se pudo registrar la placa. Intenta de nuevo.");
    setPlaca("");
    setNotice(`Placa ${normal} registrada. Su credencial QR ya está lista.`);
    router.refresh();
  }

  async function remove(p: string) {
    const ok = await confirm({
      title: `¿Borrar la placa ${p}?`,
      text: "Su credencial QR dejará de funcionar en la caseta y se borrarán los movimientos registrados con ella. No se puede deshacer.",
      confirmLabel: "Borrar placa",
    });
    if (!ok) return;
    setError(null);
    const res = await fetch(`/api/vehiculos/${encodeURIComponent(p)}`, { method: "DELETE" });
    if (!res.ok) return setError((await res.json().catch(() => ({}))).error ?? "No se pudo borrar la placa.");
    setNotice(`Placa ${p} borrada.`);
    router.refresh();
  }

  const msgId = "placa-msg";
  return (
    <div className="grid gap-6 lg:grid-cols-[340px_1fr]">
      <form onSubmit={add} noValidate className="flex h-fit flex-col gap-4 rounded-2xl border border-border bg-surface p-6 lg:sticky lg:top-6">
        <h2 className="title-3 text-ink">Agregar vehículo</h2>
        <div className="flex flex-col gap-2">
          <label htmlFor="placa" className="title-4 text-ink">
            Placa
          </label>
          <div className="relative">
            <Input
              ref={input}
              id="placa"
              value={placa}
              onChange={(e) => {
                setPlaca(e.target.value);
                setError(null);
              }}
              maxLength={12}
              autoCapitalize="characters"
              autoComplete="off"
              spellCheck={false}
              placeholder="ABC1234"
              aria-invalid={estado.tipo === "error"}
              aria-describedby={msgId}
              className="pr-10 font-mono uppercase tracking-wider"
            />
            {estado.tipo === "ok" && <CheckCircle size={20} weight="fill" className="absolute right-3 top-1/2 -translate-y-1/2 text-success" aria-hidden />}
          </div>
          <p id={msgId} aria-live="polite" className={`caption-2 ${estado.tipo === "error" ? "text-danger" : estado.tipo === "ok" ? "text-success" : "text-ink2"}`}>
            {estado.tipo === "error" ? estado.texto : estado.tipo === "ok" ? `Formato correcto: se registrará como ${normal}.` : "De 5 a 8 letras o números, por ejemplo ABC1234. Los espacios y guiones se quitan solos."}
          </p>
        </div>
        {error && <FormAlert>{error}</FormAlert>}
        {notice && <FormAlert tone="success">{notice}</FormAlert>}
        <Button type="submit" loading={loading}>
          <Plus size={18} weight="bold" aria-hidden /> Registrar placa
        </Button>
      </form>

      <section aria-labelledby="credenciales-t" className="flex flex-col gap-4">
        <h2 id="credenciales-t" className="title-3 text-ink">
          Tus credenciales
        </h2>
        {vehiculos.length === 0 ? (
          <EmptyState icon={<Car size={24} aria-hidden />} title="Todavía no tienes placas" text="Registra la placa con el formulario. Su credencial QR aparecerá aquí." />
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2">
            {vehiculos.map((v) => (
              <li key={v.placa} className="sp-rise flex flex-col gap-4 rounded-2xl border border-border bg-surface p-4">
                <div className="flex items-center justify-between gap-2">
                  <Plate placa={v.placa} />
                  <span className="caption-2 text-ink2">Credencial de esta placa</span>
                </div>
                <div className="rounded-xl border border-border bg-white p-4">
                  <QRCode value={v.qr_token ?? ""} size={200} style={{ width: "100%", height: "auto", maxWidth: 180, margin: "0 auto" }} fgColor="#0D1B2E" bgColor="#FFFFFF" aria-label={`Código QR de ${v.placa}`} />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Button type="button" variant="secondary" size="sm" disabled={!v.qr_token} onClick={() => setAbierta(v.placa)}>
                    <ArrowsOut size={16} weight="bold" aria-hidden /> Mostrar QR
                  </Button>
                  <Button type="button" variant="danger" size="sm" onClick={() => remove(v.placa)} aria-label={`Borrar la placa ${v.placa}`}>
                    <Trash size={16} aria-hidden /> Borrar
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {credencial?.qr_token && <CredentialDialog open onClose={() => setAbierta(null)} placa={credencial.placa} token={credencial.qr_token} titular={titular} />}
    </div>
  );
}
