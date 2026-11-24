"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Camera, CheckCircle, Clock, Trash, WarningCircle } from "@phosphor-icons/react";
import type { EstadoFoto } from "@/lib/supabase/types";
import { Avatar } from "@/components/app/avatar";
import { Button, ButtonLink } from "@/components/ui/button";
import { Badge } from "@/components/ui/misc";
import { FormAlert } from "@/components/ui/field";
import { useConfirm } from "@/components/app/confirm";

const ESTADO = {
  sin_foto: { tone: "neutral", label: "Sin foto", icon: Camera, text: "Aún no tienes foto verificada. El guardia la usa para confirmar que eres tú al leer tu credencial." },
  pendiente: { tone: "warning", label: "En revisión", icon: Clock, text: "Administración revisará tu foto. Mientras tanto tu credencial sigue funcionando." },
  aprobada: { tone: "success", label: "Aprobada", icon: CheckCircle, text: "Tu foto está vigente; el guardia la ve al leer tu credencial." },
  rechazada: { tone: "danger", label: "Rechazada", icon: WarningCircle, text: "Toma una foto nueva siguiendo las indicaciones." },
} as const;

/** Foto de perfil con su estado, el acceso a la captura y la opción de borrarla. */
export function FotoPerfilCard({ nombre, url, estado, motivo, tieneArchivo }: { nombre: string; url: string | null; estado: EstadoFoto; motivo: string | null; tieneArchivo: boolean }) {
  const router = useRouter();
  const confirm = useConfirm();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const e = ESTADO[estado] ?? ESTADO.sin_foto;

  async function borrar() {
    const ok = await confirm({
      title: "¿Borrar tu foto?",
      text: "Se elimina el archivo y tu cuenta queda sin foto verificada. Tendrás que tomar otra para que el guardia pueda identificarte.",
      confirmLabel: "Borrar foto",
    });
    if (!ok) return;
    setLoading(true);
    setError(null);
    const res = await fetch("/api/perfil/foto", { method: "DELETE" });
    setLoading(false);
    if (!res.ok) return setError((await res.json().catch(() => ({}))).error ?? "No se pudo borrar la foto.");
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-4">
        <Avatar src={url} name={nombre} size={80} />
        <div className="flex min-w-0 flex-col items-start gap-2">
          <Badge tone={e.tone}>
            <e.icon size={14} weight="bold" aria-hidden /> {e.label}
          </Badge>
          <p className="body-6 text-ink2">{e.text}</p>
        </div>
      </div>
      {estado === "rechazada" && motivo && (
        <p className="rounded-lg border border-border bg-muted px-3 py-2 body-6 text-ink">
          <span className="body-4">Motivo: </span>
          {motivo}
        </p>
      )}
      {error && <FormAlert>{error}</FormAlert>}
      <div className="flex flex-wrap gap-2">
        <ButtonLink href="/cliente/perfil/foto" size="sm" variant={estado === "aprobada" || estado === "pendiente" ? "secondary" : "primary"}>
          <Camera size={16} aria-hidden /> {estado === "sin_foto" ? "Tomar mi foto" : estado === "pendiente" ? "Reemplazar foto" : "Tomar otra foto"}
        </ButtonLink>
        {tieneArchivo && (
          <Button variant="danger" size="sm" onClick={borrar} loading={loading}>
            {!loading && <Trash size={16} aria-hidden />} Borrar mi foto
          </Button>
        )}
      </div>
      <p className="caption-5 text-ink2">No guardamos datos biométricos: solo la foto y si cumplió cada regla.</p>
    </div>
  );
}
