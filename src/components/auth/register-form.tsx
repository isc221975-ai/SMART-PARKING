"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { CheckCircle } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Field, FormAlert, Input, Select } from "@/components/ui/field";
import { analizarCorreo, ROL_LABEL } from "@/lib/identity";

export function RegisterForm({ dominio }: { dominio: string }) {
  const router = useRouter();
  const [f, setF] = useState({ correo: "", nombre: "", apellido_paterno: "", apellido_materno: "", semestre: "", password: "", confirm: "" });
  const [touched, setTouched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const id = useMemo(() => (f.correo.includes("@") ? analizarCorreo(f.correo, dominio) : null), [f.correo, dominio]);
  const esAlumno = id?.ok && id.identidad.rol === "estudiante";

  const errors = {
    correo: !f.correo.trim() ? "Escribe tu correo institucional." : !id ? `Debe terminar en @${dominio}.` : id.ok ? undefined : id.error,
    nombre: !f.nombre.trim() ? "Escribe tu nombre." : undefined,
    apellido_paterno: !f.apellido_paterno.trim() ? "Escribe tu apellido paterno." : undefined,
    semestre: esAlumno && !f.semestre ? "Elige tu semestre." : undefined,
    password:
      f.password.length < 8 ? "Usa al menos 8 caracteres." : !/[A-Za-z]/.test(f.password) || !/\d/.test(f.password) ? "Combina letras y números." : undefined,
    confirm: f.confirm !== f.password ? "Las contraseñas no coinciden." : undefined,
  };
  const show = (k: keyof typeof errors) => (touched ? errors[k] : undefined);
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setF((p) => ({ ...p, [k]: e.target.value }));
  const aria = (k: keyof typeof errors) => ({ "aria-invalid": Boolean(show(k)), "aria-describedby": show(k) ? `${k}-error` : undefined });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setTouched(true);
    if (Object.values(errors).some(Boolean)) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...f, semestre: f.semestre ? Number(f.semestre) : null }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "No se pudo crear la cuenta.");
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo crear la cuenta.");
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    return (
      <div className="flex flex-col items-start gap-4 rounded-2xl border border-border bg-surface p-6">
        <CheckCircle size={32} weight="fill" className="text-accent" aria-hidden />
        <p className="title-2 text-ink">Cuenta creada para {f.correo.toLowerCase()}</p>
        <p className="body-6 text-ink2">Inicia sesión para registrar tu primer vehículo y obtener tu credencial QR.</p>
        <Button onClick={() => router.push("/login")}>Ir a iniciar sesión</Button>
      </div>
    );
  }

  return (
    <form noValidate onSubmit={submit} className="flex flex-col gap-4">
      {error && <FormAlert>{error}</FormAlert>}
      <Field label="Correo institucional" htmlFor="correo" error={show("correo")}>
        <Input id="correo" type="email" autoComplete="email" autoCapitalize="none" spellCheck={false} placeholder={`isc123456@${dominio}`} value={f.correo} onChange={set("correo")} {...aria("correo")} />
      </Field>
      {id?.ok && (
        <div className="flex flex-wrap items-center gap-2 rounded-lg bg-muted px-3 py-2 caption-1 text-ink2" role="status">
          <CheckCircle size={16} weight="fill" className="text-accent" aria-hidden />
          {ROL_LABEL[id.identidad.rol]}
          {id.identidad.matricula && <span className="font-mono">· {id.identidad.matricula}</span>}
          {id.identidad.carrera && <span>· {id.identidad.carrera}</span>}
        </div>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <Field label="Nombre(s)" htmlFor="nombre" error={show("nombre")}>
            <Input id="nombre" autoComplete="given-name" value={f.nombre} onChange={set("nombre")} {...aria("nombre")} />
          </Field>
        </div>
        <Field label="Apellido paterno" htmlFor="apellido_paterno" error={show("apellido_paterno")}>
          <Input id="apellido_paterno" autoComplete="family-name" value={f.apellido_paterno} onChange={set("apellido_paterno")} {...aria("apellido_paterno")} />
        </Field>
        <Field label="Apellido materno" htmlFor="apellido_materno" hint="Opcional">
          <Input id="apellido_materno" value={f.apellido_materno} onChange={set("apellido_materno")} />
        </Field>
      </div>
      {esAlumno && (
        <Field label="Semestre" htmlFor="semestre" error={show("semestre")}>
          <Select id="semestre" value={f.semestre} onChange={set("semestre")} {...aria("semestre")}>
            <option value="">Elige tu semestre</option>
            {Array.from({ length: 12 }, (_, i) => (
              <option key={i + 1} value={i + 1}>
                {i + 1}.º semestre
              </option>
            ))}
          </Select>
        </Field>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Contraseña" htmlFor="password" error={show("password")} hint="Mínimo 8, con letras y números">
          <Input id="password" type="password" autoComplete="new-password" value={f.password} onChange={set("password")} {...aria("password")} />
        </Field>
        <Field label="Confirmar contraseña" htmlFor="confirm" error={show("confirm")}>
          <Input id="confirm" type="password" autoComplete="new-password" value={f.confirm} onChange={set("confirm")} {...aria("confirm")} />
        </Field>
      </div>
      <p className="caption-2 text-ink2">
        Al crear tu cuenta aceptas los{" "}
        <a href="/terminos" className="text-primary underline underline-offset-4">términos de uso</a> y el{" "}
        <a href="/privacidad" className="text-primary underline underline-offset-4">aviso de privacidad</a>.
      </p>
      <Button type="submit" size="lg" loading={loading} className="w-full">
        Crear cuenta
      </Button>
    </form>
  );
}
