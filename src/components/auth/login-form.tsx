"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Eye, EyeSlash } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Field, FormAlert, Input } from "@/components/ui/field";

export function LoginForm({ next }: { next?: string }) {
  const router = useRouter();
  const [usuario, setUsuario] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [touched, setTouched] = useState(false);

  const userError = touched && !usuario.trim() ? "Escribe tu correo o usuario." : undefined;
  const passError = touched && !password ? "Escribe tu contraseña." : undefined;

  async function submit(u = usuario, p = password) {
    setTouched(true);
    if (!u.trim() || !p) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ usuario: u, password: p }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "No se pudo iniciar sesión.");
      const dest = next && next.startsWith(data.redirect) ? next : data.redirect;
      router.replace(dest);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo iniciar sesión.");
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <form
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
        className="flex flex-col gap-4"
      >
        {error && <FormAlert>{error}</FormAlert>}
        <Field label="Correo institucional o usuario" htmlFor="usuario" error={userError}>
          <Input
            id="usuario"
            name="usuario"
            autoComplete="username"
            inputMode="email"
            autoCapitalize="none"
            spellCheck={false}
            placeholder="isc123456@itsatlixco.edu.mx"
            value={usuario}
            onChange={(e) => setUsuario(e.target.value)}
            aria-invalid={Boolean(userError)}
            aria-describedby={userError ? "usuario-error" : undefined}
          />
        </Field>
        <Field label="Contraseña" htmlFor="password" error={passError}>
          <div className="relative">
            <Input
              id="password"
              name="password"
              type={show ? "text" : "password"}
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              aria-invalid={Boolean(passError)}
              aria-describedby={passError ? "password-error" : undefined}
              className="pr-12"
            />
            <button
              type="button"
              onClick={() => setShow((v) => !v)}
              aria-label={show ? "Ocultar contraseña" : "Mostrar contraseña"}
              className="absolute right-1 top-1/2 grid size-9 -translate-y-1/2 place-items-center rounded-md text-ink2 hover:bg-muted hover:text-ink"
            >
              {show ? <EyeSlash size={18} aria-hidden /> : <Eye size={18} aria-hidden />}
            </button>
          </div>
        </Field>
        <Button type="submit" size="lg" loading={loading} className="mt-2 w-full">
          Iniciar sesión
        </Button>
      </form>
    </div>
  );
}
