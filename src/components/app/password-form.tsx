"use client";

import { useState } from "react";
import { Eye, EyeSlash } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Field, FormAlert, Input } from "@/components/ui/field";
import { useConfirm } from "@/components/app/confirm";

/** Misma regla que el servidor (errorPassword). */
function errorPassword(pw: string): string | undefined {
  if (pw.length < 8) return "Usa al menos 8 caracteres.";
  if (pw.length > 72) return "Usa como máximo 72 caracteres.";
  if (!/[A-Za-z]/.test(pw) || !/\d/.test(pw)) return "Combina letras y números.";
  return undefined;
}

export function PasswordForm() {
  const confirm = useConfirm();
  const [pw, setPw] = useState("");
  const [rep, setRep] = useState("");
  const [show, setShow] = useState(false);
  const [touched, setTouched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<{ tone: "success" | "danger"; text: string } | null>(null);
  const errPw = touched || pw ? errorPassword(pw) : undefined;
  const errRep = (touched || rep) && rep !== pw ? "Las contraseñas no coinciden." : undefined;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setTouched(true);
    if (errorPassword(pw) || rep !== pw) return;
    const ok = await confirm({ title: "¿Cambiar tu contraseña?", text: "La próxima vez que inicies sesión tendrás que usar la nueva.", confirmLabel: "Cambiar contraseña", tone: "primary" });
    if (!ok) return;
    setLoading(true);
    setMsg(null);
    const res = await fetch("/api/usuarios/me/password", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password: pw, confirm: rep }) });
    const data = await res.json().catch(() => ({}));
    setLoading(false);
    if (!res.ok) return setMsg({ tone: "danger", text: data.error ?? "No se pudo cambiar la contraseña." });
    setPw("");
    setRep("");
    setTouched(false);
    setMsg({ tone: "success", text: "Contraseña actualizada." });
  }

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-4">
      <Field label="Nueva contraseña" htmlFor="new-pw" hint="Mínimo 8 caracteres, con letras y números." error={errPw}>
        <div className="relative">
          <Input id="new-pw" type={show ? "text" : "password"} autoComplete="new-password" value={pw} onChange={(e) => setPw(e.target.value)} aria-invalid={Boolean(errPw)} aria-describedby={errPw ? "new-pw-error" : "new-pw-hint"} className="pr-12" />
          <button type="button" onClick={() => setShow((s) => !s)} aria-label={show ? "Ocultar contraseña" : "Mostrar contraseña"} aria-pressed={show} className="absolute right-1 top-1/2 grid size-9 -translate-y-1/2 place-items-center rounded-md text-ink2 hover:text-ink">
            {show ? <EyeSlash size={18} aria-hidden /> : <Eye size={18} aria-hidden />}
          </button>
        </div>
      </Field>
      <Field label="Confirma la contraseña" htmlFor="rep-pw" error={errRep}>
        <Input id="rep-pw" type={show ? "text" : "password"} autoComplete="new-password" value={rep} onChange={(e) => setRep(e.target.value)} aria-invalid={Boolean(errRep)} aria-describedby={errRep ? "rep-pw-error" : undefined} />
      </Field>
      {msg && <FormAlert tone={msg.tone}>{msg.text}</FormAlert>}
      <div>
        <Button type="submit" variant="secondary" loading={loading}>
          Cambiar contraseña
        </Button>
      </div>
    </form>
  );
}
