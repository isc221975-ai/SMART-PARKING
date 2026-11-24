"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Field, FormAlert, Input, Select } from "@/components/ui/field";
import { useConfirm } from "@/components/app/confirm";

interface Props {
  inicial: { nombre: string; apellido_paterno: string; apellido_materno: string; semestre: number | null };
  esAlumno: boolean;
}

export function PerfilForm({ inicial, esAlumno }: Props) {
  const router = useRouter();
  const confirm = useConfirm();
  const [f, setF] = useState({ ...inicial, semestre: inicial.semestre ? String(inicial.semestre) : "" });
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<{ tone: "success" | "danger"; text: string } | null>(null);
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setF((p) => ({ ...p, [k]: e.target.value }));
  const errNombre = !f.nombre.trim() ? "Escribe tu nombre." : undefined;
  const errAp = !f.apellido_paterno.trim() ? "Escribe tu apellido paterno." : undefined;
  const base = { ...inicial, semestre: inicial.semestre ? String(inicial.semestre) : "" };
  const cambios = (Object.keys(f) as (keyof typeof f)[]).some((k) => String(f[k]).trim() !== String(base[k]).trim());

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (errNombre || errAp || !cambios) return;
    const ok = await confirm({ title: "¿Guardar tus datos?", text: "Tu nombre se actualizará en tu credencial y en los registros de acceso.", confirmLabel: "Guardar datos", tone: "primary" });
    if (!ok) return;
    setLoading(true);
    setMsg(null);
    const res = await fetch("/api/usuarios/me", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...f, semestre: f.semestre ? Number(f.semestre) : null }),
    });
    const data = await res.json().catch(() => ({}));
    setLoading(false);
    if (!res.ok) return setMsg({ tone: "danger", text: data.error ?? "No se pudieron guardar los cambios." });
    setMsg({ tone: "success", text: "Datos guardados." });
    router.refresh();
  }

  return (
    <form onSubmit={save} noValidate className="flex flex-col gap-4">
      <Field label="Nombre(s)" htmlFor="nombre" error={errNombre}>
        <Input id="nombre" value={f.nombre} onChange={set("nombre")} autoComplete="given-name" aria-invalid={Boolean(errNombre)} />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Apellido paterno" htmlFor="apellido_paterno" error={errAp}>
          <Input id="apellido_paterno" value={f.apellido_paterno} onChange={set("apellido_paterno")} autoComplete="family-name" aria-invalid={Boolean(errAp)} />
        </Field>
        <Field label="Apellido materno" htmlFor="apellido_materno">
          <Input id="apellido_materno" value={f.apellido_materno} onChange={set("apellido_materno")} />
        </Field>
      </div>
      {esAlumno && (
        <Field label="Semestre" htmlFor="semestre">
          <Select id="semestre" value={f.semestre} onChange={set("semestre")}>
            {Array.from({ length: 12 }, (_, i) => (
              <option key={i + 1} value={i + 1}>
                {i + 1}.º semestre
              </option>
            ))}
          </Select>
        </Field>
      )}
      {msg && <FormAlert tone={msg.tone}>{msg.text}</FormAlert>}
      <div>
        <Button type="submit" loading={loading} disabled={!cambios}>
          Guardar datos
        </Button>
      </div>
    </form>
  );
}
