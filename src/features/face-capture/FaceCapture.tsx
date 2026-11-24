"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import {
  ArrowClockwise,
  ArrowLeft,
  Camera,
  CheckCircle,
  Clock,
  Eye,
  Info,
  ShieldCheck,
  UploadSimple,
  VideoCameraSlash,
  Warning,
} from "@phosphor-icons/react";
import { Button, ButtonLink } from "@/components/ui/button";
import { Field, FormAlert, Select } from "@/components/ui/field";
import { Badge, Card } from "@/components/ui/misc";
import { ACCEPTED_TYPES, analyzeImage, MAX_UPLOAD_BYTES } from "./analyzeImage";
import { DebugMetrics, OvalGuide, RuleList } from "./parts";
import { allBlockingOk, EXCEPCION_DESACTIVA, primaryInstruction } from "./rules";
import type { Excepcion, FotoChecks, Modo, RuleResult } from "./types";
import { useFaceCapture, type Captura } from "./useFaceCapture";

type Paso = "consentimiento" | "camara" | "archivo" | "vista" | "enviada";

const EXCEPCIONES: { value: Excepcion; label: string; hint: string }[] = [
  { value: "medica", label: "Condición médica", hint: "Por ejemplo, lentes indicados por un médico o parálisis facial. No se revisan ojos, lentes, cubrebocas ni expresión." },
  { value: "religiosa", label: "Motivo religioso", hint: "Puedes cubrirte la cabeza; el rostro debe verse completo." },
  { value: "discapacidad", label: "Discapacidad", hint: "No se pide mirar de frente, abrir los ojos, expresión neutral ni la prueba de vida." },
  { value: "sin_camara", label: "No tengo cámara", hint: "Sube una foto reciente de frente, con buena luz y sin lentes." },
];

interface Lista {
  blob: Blob;
  url: string;
  checks: FotoChecks;
  modo: Modo;
}

export function FaceCapture({ debug = false }: { debug?: boolean }) {
  const router = useRouter();
  const [paso, setPaso] = useState<Paso>("consentimiento");
  const [acepta, setAcepta] = useState(false);
  const [excepcion, setExcepcion] = useState<Excepcion | null>(null);
  const [foto, setFoto] = useState<Lista | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<{ text: string; login?: boolean } | null>(null);

  // Libera la URL de la vista previa al cambiarla o al salir.
  useEffect(() => () => void (foto && URL.revokeObjectURL(foto.url)), [foto]);

  const usar = useCallback((blob: Blob, checks: FotoChecks, modo: Modo) => {
    setFoto({ blob, checks, modo, url: URL.createObjectURL(blob) });
    setPaso("vista");
  }, []);

  async function enviar() {
    if (!foto) return;
    setEnviando(true);
    setError(null);
    const body = new FormData();
    body.set("foto", foto.blob, "foto.jpg");
    body.set("checks", JSON.stringify(foto.checks));
    body.set("modo", foto.modo);
    body.set("consentimiento", "si");
    if (excepcion) body.set("excepcion", excepcion);
    const res = await fetch("/api/perfil/foto", { method: "POST", body }).catch(() => null);
    setEnviando(false);
    if (!res) return setError({ text: "Sin conexión. Revisa tu internet e intenta de nuevo." });
    if (res.status === 401) return setError({ text: "Tu sesión se cerró por inactividad. Inicia sesión otra vez para enviar tu foto.", login: true });
    if (!res.ok) return setError({ text: (await res.json().catch(() => ({}))).error ?? "No se pudo enviar la foto. Intenta de nuevo." });
    setPaso("enviada");
    router.refresh();
  }

  const otra = () => {
    setFoto(null);
    setError(null);
    setPaso(foto?.modo === "archivo" || excepcion === "sin_camara" ? "archivo" : "camara");
  };

  if (paso === "consentimiento") {
    return <Consentimiento acepta={acepta} setAcepta={setAcepta} excepcion={excepcion} setExcepcion={setExcepcion} onCamara={() => setPaso("camara")} onArchivo={() => setPaso("archivo")} />;
  }

  if (paso === "camara") {
    return <PasoCamara excepcion={excepcion} debug={debug} onCapture={(c) => usar(c.blob, c.checks, "camara")} onArchivo={() => setPaso("archivo")} onCancelar={() => setPaso("consentimiento")} />;
  }

  if (paso === "archivo") {
    return <PasoArchivo excepcion={excepcion} onListo={(blob, checks) => usar(blob, checks, "archivo")} onCamara={excepcion === "sin_camara" ? null : () => setPaso("camara")} onCancelar={() => setPaso("consentimiento")} />;
  }

  if (paso === "vista" && foto) {
    const avisos = (["R5", "R6", "R7"] as const).filter((r) => foto.checks[r] === "advertencia");
    return (
      <Card className="sp-rise mx-auto w-full max-w-md p-6">
        <h2 className="title-2 text-ink">Revisa tu foto</h2>
        <p className="body-6 pb-4 pt-1 text-ink2">Así la verá el guardia al leer tu credencial.</p>
        {/* eslint-disable-next-line @next/next/no-img-element -- blob local de la vista previa */}
        <img src={foto.url} alt="Vista previa de tu foto" className="aspect-[3/4] w-full rounded-xl border border-border bg-muted object-cover" />
        {avisos.length > 0 && (
          <p className="mt-4 flex gap-2 rounded-lg border border-border bg-[color-mix(in_srgb,var(--color-warning)_8%,var(--color-surface))] px-3 py-2 body-6 text-ink">
            <Warning size={18} className="mt-0.5 shrink-0 text-warning" aria-hidden />
            Parece que traes {avisos.map((r) => ({ R5: "lentes", R6: "gorra o algo en la cabeza", R7: "cubrebocas" })[r]).join(", ")}. Puedes enviarla, pero administración podría rechazarla.
          </p>
        )}
        {foto.modo === "archivo" && <p className="caption-2 pt-3 text-ink2">Como la subiste de un archivo, administración la revisará sin prueba de vida.</p>}
        {error && (
          <div className="pt-4">
            <FormAlert>
              {error.text}{" "}
              {error.login && (
                <Link href="/login?next=/cliente/perfil/foto" className="underline underline-offset-4">
                  Iniciar sesión
                </Link>
              )}
            </FormAlert>
          </div>
        )}
        <div className="flex flex-col-reverse gap-2 pt-6 sm:flex-row sm:justify-end">
          <Button variant="secondary" onClick={otra} disabled={enviando}>
            <ArrowClockwise size={18} aria-hidden /> Tomar otra
          </Button>
          <Button onClick={enviar} loading={enviando}>
            {!enviando && <CheckCircle size={18} aria-hidden />} Usar esta foto
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <Card className="sp-rise mx-auto flex w-full max-w-md flex-col items-center gap-3 p-8 text-center">
      <span className="grid size-12 place-items-center rounded-full bg-[color-mix(in_srgb,var(--color-warning)_14%,transparent)] text-warning">
        <Clock size={24} weight="bold" aria-hidden />
      </span>
      <h2 className="title-1 text-ink">Foto enviada</h2>
      <Badge tone="warning">En revisión</Badge>
      <p className="body-6 max-w-sm text-ink2">Administración la revisará pronto. Mientras tanto tu credencial sigue funcionando igual.</p>
      <ButtonLink href="/cliente/perfil" className="mt-2">
        <ArrowLeft size={18} aria-hidden /> Volver a mi perfil
      </ButtonLink>
    </Card>
  );
}

function Consentimiento({
  acepta,
  setAcepta,
  excepcion,
  setExcepcion,
  onCamara,
  onArchivo,
}: {
  acepta: boolean;
  setAcepta: (v: boolean) => void;
  excepcion: Excepcion | null;
  setExcepcion: (v: Excepcion | null) => void;
  onCamara: () => void;
  onArchivo: () => void;
}) {
  const id = useId();
  const hint = EXCEPCIONES.find((e) => e.value === excepcion)?.hint;
  return (
    <Card className="sp-rise mx-auto w-full max-w-xl p-6">
      <div className="flex items-start gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[color-mix(in_srgb,var(--color-primary)_12%,transparent)] text-primary">
          <ShieldCheck size={22} weight="bold" aria-hidden />
        </span>
        <div>
          <h2 className="title-2 text-ink">Antes de tomar tu foto</h2>
          <p className="body-6 pt-1 text-ink2">El guardia la verá al leer tu credencial para confirmar que eres tú.</p>
        </div>
      </div>
      <ul className="mt-5 flex flex-col gap-2 body-6 text-ink">
        <li className="flex gap-2">
          <Eye size={18} className="mt-0.5 shrink-0 text-primary" aria-hidden /> El análisis del rostro ocurre en tu teléfono. Al servidor solo llega la foto y si cumplió cada regla.
        </li>
        <li className="flex gap-2">
          <ShieldCheck size={18} className="mt-0.5 shrink-0 text-primary" aria-hidden /> La foto se guarda en almacenamiento privado y solo la ven administración y la caseta.
        </li>
        <li className="flex gap-2">
          <Info size={18} className="mt-0.5 shrink-0 text-primary" aria-hidden /> Puedes borrarla cuando quieras desde tu perfil.
        </li>
      </ul>

      <div className="mt-6 border-t border-border pt-5">
        <Field label="¿Necesitas una excepción?" htmlFor={`${id}-exc`} hint={hint ?? "Elige una solo si no puedes cumplir alguna indicación. Administración la verá."}>
          <Select id={`${id}-exc`} value={excepcion ?? ""} onChange={(e) => setExcepcion((e.target.value || null) as Excepcion | null)}>
            <option value="">No necesito excepción</option>
            {EXCEPCIONES.map((e) => (
              <option key={e.value} value={e.value}>
                {e.label}
              </option>
            ))}
          </Select>
        </Field>
      </div>

      <label className="mt-6 flex cursor-pointer items-start gap-3 rounded-lg border border-border p-3 body-6 text-ink has-[:checked]:border-primary">
        <input type="checkbox" checked={acepta} onChange={(e) => setAcepta(e.target.checked)} className="mt-0.5 size-5 shrink-0 accent-[var(--color-primary)]" />
        <span>
          Acepto que mi foto se use para identificarme en la caseta, según el{" "}
          <Link href="/privacidad" className="text-primary underline underline-offset-4" target="_blank">
            aviso de privacidad
          </Link>
          .
        </span>
      </label>

      <div className="flex flex-col-reverse gap-2 pt-6 sm:flex-row sm:justify-end">
        <Button variant={excepcion === "sin_camara" ? "primary" : "secondary"} disabled={!acepta} onClick={onArchivo}>
          <UploadSimple size={18} aria-hidden /> Subir archivo
        </Button>
        {excepcion !== "sin_camara" && (
          <Button disabled={!acepta} onClick={onCamara}>
            <Camera size={18} aria-hidden /> Abrir cámara
          </Button>
        )}
      </div>
    </Card>
  );
}

const CAMARA_ERROR: Record<string, { title: string; text: string }> = {
  denied: {
    title: "Sin permiso para usar la cámara",
    text: "Toca el ícono de candado o de cámara junto a la dirección de la página, permite la cámara y vuelve a intentarlo.",
  },
  nocamera: { title: "No encontramos una cámara", text: "Puedes subir una foto desde un archivo." },
  busy: { title: "La cámara está ocupada", text: "Cierra otras apps o pestañas que la estén usando y vuelve a intentarlo." },
  unsupported: {
    title: "Este navegador no permite usar la cámara aquí",
    text: "Abre el portal con una dirección segura (https) en Chrome, Safari o Edge actualizados, o sube una foto desde un archivo.",
  },
  error: { title: "No se pudo cargar el analizador facial", text: "Revisa tu conexión y vuelve a intentarlo, o sube una foto desde un archivo." },
};

const RETO_LABEL = { parpadear: "Parpadea", girar_izquierda: "Gira a tu izquierda", girar_derecha: "Gira a tu derecha" } as const;

function PasoCamara({
  excepcion,
  debug,
  onCapture,
  onArchivo,
  onCancelar,
}: {
  excepcion: Excepcion | null;
  debug: boolean;
  onCapture: (c: Captura) => void;
  onArchivo: () => void;
  onCancelar: () => void;
}) {
  const { videoRef, view, start, stop, captureNow } = useFaceCapture({ excepcion, onCapture });
  const started = useRef(false);
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    void start();
  }, [start]);

  const fallo = CAMARA_ERROR[view.status];
  const encuadreOk = view.results.length > 0 && !primaryInstruction(view.results);
  const sinVida = Boolean(excepcion && EXCEPCION_DESACTIVA[excepcion].includes("R11"));

  if (fallo) {
    return (
      <Card className="sp-rise mx-auto flex w-full max-w-md flex-col items-center gap-3 p-8 text-center">
        <span className="grid size-12 place-items-center rounded-full bg-muted text-ink2">
          <VideoCameraSlash size={24} aria-hidden />
        </span>
        <h2 className="title-2 text-ink">{fallo.title}</h2>
        <p className="body-6 max-w-sm text-ink2">{fallo.text}</p>
        <div className="flex flex-col gap-2 pt-2 sm:flex-row">
          <Button variant="secondary" onClick={onArchivo}>
            <UploadSimple size={18} aria-hidden /> Subir archivo
          </Button>
          {view.status !== "nocamera" && view.status !== "unsupported" && (
            <Button onClick={() => void start()}>
              <ArrowClockwise size={18} aria-hidden /> Intentar de nuevo
            </Button>
          )}
        </div>
      </Card>
    );
  }

  const cargando = view.status === "loading" || view.status === "idle";
  return (
    <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,420px)_1fr]">
      <div className="relative mx-auto aspect-[3/4] w-full max-w-[420px] overflow-hidden rounded-2xl border border-border bg-black">
        <video ref={videoRef} playsInline muted autoPlay className="size-full -scale-x-100 object-cover" aria-label="Vista de tu cámara" />
        {cargando ? (
          <div className="absolute inset-0 grid place-items-center bg-muted">
            <div className="flex flex-col items-center gap-3">
              <div className="skeleton h-40 w-28 rounded-[50%]" />
              <p className="caption-2 text-ink2">Preparando la cámara y el analizador…</p>
            </div>
          </div>
        ) : (
          <>
            <OvalGuide ok={encuadreOk} />
            <p aria-live="polite" className="absolute inset-x-3 bottom-3 rounded-lg bg-black/70 px-3 py-2 text-center body-5 text-white">
              {view.instruccion ?? "Coloca tu rostro dentro del óvalo."}
            </p>
            {view.cuenta !== null && (
              <span key={view.cuenta} className="sp-count absolute inset-0 grid place-items-center heading-1 text-white [text-shadow:0_2px_12px_rgb(0_0_0/0.6)]" aria-hidden>
                {view.cuenta}
              </span>
            )}
            {debug && <DebugMetrics m={view.metrics} />}
          </>
        )}
      </div>

      <Card className="p-6">
        <h2 className="title-3 text-ink">
          {view.fase === "vida" ? "Prueba de vida" : view.fase === "cuenta" ? "Tomando la foto" : view.fase === "listo" ? "Todo listo" : "Acomódate frente a la cámara"}
        </h2>
        <p className="body-6 pb-4 pt-1 text-ink2">
          {view.fase === "vida"
            ? "Sigue las dos indicaciones para confirmar que no es una foto de una foto."
            : view.fase === "encuadre"
              ? "Mira de frente, con la cara descubierta y buena luz. La foto se toma sola cuando todo esté en verde."
              : "Quédate quieto: la foto se toma sola en unos segundos."}
        </p>

        {view.fase === "vida" && view.reto && (
          <div className="mb-4 flex items-center justify-between gap-3 rounded-lg border border-border bg-muted px-3 py-2">
            <span className="body-5 text-ink">{RETO_LABEL[view.reto]}</span>
            <span className="font-mono caption-1 text-ink2">{view.retoRestante} s</span>
          </div>
        )}
        {view.intentos > 0 && view.fase === "vida" && <p className="caption-2 pb-3 text-ink2">Se acabó el tiempo; empezamos otra vez con otro orden.</p>}

        <RuleList results={view.results} hide={sinVida ? ["R11"] : []} />
        <p className="flex items-center gap-1 caption-5 pt-3 text-ink2">
          <Warning size={14} weight="bold" className="text-warning" aria-label="Advertencia" /> = revisa si aplica. Administración decide.
        </p>

        <div className="flex flex-col-reverse gap-2 pt-6 sm:flex-row sm:flex-wrap sm:justify-end">
          <Button
            variant="ghost"
            onClick={() => {
              stop();
              onCancelar();
            }}
          >
            Cancelar
          </Button>
          <Button
            variant="secondary"
            onClick={() => {
              stop();
              onArchivo();
            }}
          >
            <UploadSimple size={18} aria-hidden /> Subir archivo
          </Button>
          <Button onClick={captureNow} disabled={!allBlockingOk(view.results) || view.status !== "running"}>
            <Camera size={18} aria-hidden /> Tomar foto
          </Button>
        </div>
      </Card>
    </div>
  );
}

function PasoArchivo({
  excepcion,
  onListo,
  onCamara,
  onCancelar,
}: {
  excepcion: Excepcion | null;
  onListo: (blob: Blob, checks: FotoChecks) => void;
  onCamara: (() => void) | null;
  onCancelar: () => void;
}) {
  const id = useId();
  const [analizando, setAnalizando] = useState(false);
  const [results, setResults] = useState<RuleResult[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function onFile(file: File | undefined) {
    setResults(null);
    setError(null);
    if (!file) return;
    if (!ACCEPTED_TYPES.includes(file.type)) return setError("Usa una foto JPG, PNG o WebP.");
    if (file.size > MAX_UPLOAD_BYTES) return setError("La foto pesa más de 10 MB. Elige una más ligera.");
    setAnalizando(true);
    try {
      const r = await analyzeImage(file, excepcion);
      setResults(r.results);
      if (r.blob && allBlockingOk(r.results)) onListo(r.blob, r.checks);
    } catch {
      setError("No se pudo analizar la foto. Revisa tu conexión o prueba con otra imagen.");
    } finally {
      setAnalizando(false);
    }
  }

  const falla = results ? primaryInstruction(results) : null;
  return (
    <Card className="sp-rise mx-auto w-full max-w-xl p-6">
      <h2 className="title-2 text-ink">Subir una foto</h2>
      <p className="body-6 pb-5 pt-1 text-ink2">
        Una foto reciente, de frente, solo tú, con buena luz y sin lentes ni gorra. La recortamos a tamaño credencial en tu teléfono antes de enviarla.
      </p>
      <label
        htmlFor={`${id}-file`}
        className="flex cursor-pointer flex-col items-center gap-2 rounded-xl border border-dashed border-border bg-muted px-6 py-10 text-center transition-colors duration-300 ease-weighted hover:border-primary has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-primary"
      >
        {analizando ? (
          <>
            <span className="size-6 rounded-full border-2 border-primary border-r-transparent motion-safe:animate-spin" aria-hidden />
            <span className="body-5 text-ink">Revisando la foto…</span>
          </>
        ) : (
          <>
            <UploadSimple size={28} className="text-primary" aria-hidden />
            <span className="body-5 text-ink">Elige una foto</span>
            <span className="caption-2 text-ink2">JPG, PNG o WebP</span>
          </>
        )}
        <input id={`${id}-file`} type="file" accept={ACCEPTED_TYPES.join(",")} className="sr-only" disabled={analizando} onChange={(e) => void onFile(e.target.files?.[0])} />
      </label>

      {error && (
        <div className="pt-4">
          <FormAlert>{error}</FormAlert>
        </div>
      )}
      {results && falla && (
        <div className="flex flex-col gap-4 pt-5">
          <FormAlert>{falla.mensaje} Elige otra foto.</FormAlert>
          <RuleList results={results} hide={["R11"]} />
        </div>
      )}

      <div className="flex flex-col-reverse gap-2 pt-6 sm:flex-row sm:justify-end">
        <Button variant="ghost" onClick={onCancelar}>
          Cancelar
        </Button>
        {onCamara && (
          <Button variant="secondary" onClick={onCamara}>
            <Camera size={18} aria-hidden /> Usar la cámara
          </Button>
        )}
      </div>
    </Card>
  );
}
