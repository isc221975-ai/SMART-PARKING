"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Plus } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Field, FormAlert, Input } from "@/components/ui/field";

function nowLocal() {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
}

const empty = () => ({ nombre_conductor: "", empresa: "", asunto: "", placa: "", hora_entrada: nowLocal(), hora_salida: "" });

export function BitacoraForm() {
  const router = useRouter();
  const [f, setF] = useState(empty);
  const [touched, setTouched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<{ tone: "success" | "danger"; text: string } | null>(null);
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => setF((p) => ({ ...p, [k]: e.target.value }));

  const errors = {
    nombre_conductor: !f.nombre_conductor.trim() ? "Escribe el nombre del conductor." : undefined,
    empresa: !f.empresa.trim() ? "Escribe la empresa." : undefined,
    asunto: !f.asunto.trim() ? "Escribe el asunto de la visita." : undefined,
    hora_entrada: !f.hora_entrada ? "Indica la hora de entrada." : undefined,
    hora_salida: f.hora_salida && f.hora_salida < f.hora_entrada ? "La salida no puede ser antes de la entrada." : undefined,
  };
  const e = (k: keyof typeof errors) => (touched ? errors[k] : undefined);

  async function submit(ev: React.FormEvent) {
    ev.preventDefault();
    setTouched(true);
    if (Object.values(errors).some(Boolean)) return;
    setLoading(true);
    setMsg(null);
    const res = await fetch("/api/bitacora", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...f,
        hora_entrada: new Date(f.hora_entrada).toISOString(),
        hora_salida: f.hora_salida ? new Date(f.hora_salida).toISOString() : null,
      }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) return setMsg({ tone: "danger", text: data.error ?? "No se pudo guardar." });
    setMsg({ tone: "success", text: `Visita de ${f.nombre_conductor} registrada.` });
    setF(empty());
    setTouched(false);
    router.refresh();
  }

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-4">
      <Field label="Nombre del conductor" htmlFor="nombre_conductor" error={e("nombre_conductor")}>
        <Input id="nombre_conductor" value={f.nombre_conductor} onChange={set("nombre_conductor")} aria-invalid={Boolean(e("nombre_conductor"))} />
      </Field>
      <Field label="Empresa" htmlFor="empresa" error={e("empresa")}>
        <Input id="empresa" value={f.empresa} onChange={set("empresa")} aria-invalid={Boolean(e("empresa"))} />
      </Field>
      <Field label="Asunto" htmlFor="asunto" error={e("asunto")}>
        <Input id="asunto" value={f.asunto} onChange={set("asunto")} placeholder="Entrega de material en almacén" aria-invalid={Boolean(e("asunto"))} />
      </Field>
      <Field label="Placa" htmlFor="placa" hint="Opcional si llega a pie">
        <Input id="placa" value={f.placa} onChange={set("placa")} maxLength={10} className="font-mono uppercase" />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
        <Field label="Hora de entrada" htmlFor="hora_entrada" error={e("hora_entrada")}>
          <Input id="hora_entrada" type="datetime-local" value={f.hora_entrada} onChange={set("hora_entrada")} />
        </Field>
        <Field label="Hora de salida" htmlFor="hora_salida" error={e("hora_salida")} hint="Déjala vacía si sigue dentro">
          <Input id="hora_salida" type="datetime-local" value={f.hora_salida} onChange={set("hora_salida")} />
        </Field>
      </div>
      {msg && <FormAlert tone={msg.tone}>{msg.text}</FormAlert>}
      <Button type="submit" loading={loading}>
        <Plus size={18} weight="bold" aria-hidden /> Registrar visita
      </Button>
    </form>
  );
}
