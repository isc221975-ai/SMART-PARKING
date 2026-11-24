import Link from "next/link";
import {
  ArrowRight,
  Check,
  ClipboardText,
  DeviceMobile,
  Export,
  Fingerprint,
  IdentificationBadge,
  Key,
  LockKey,
  Notebook,
  QrCode,
  ShieldCheck,
  Timer,
  UserCircleCheck,
  UsersThree,
  X,
} from "@phosphor-icons/react/dist/ssr";
import { SiteNav } from "@/components/landing/site-nav";
import { SiteFooter } from "@/components/landing/site-footer";
import { HeroVisual } from "@/components/landing/hero-visual";
import { TaglineReveal } from "@/components/landing/tagline-reveal";
import { Reveal } from "@/components/reveal";
import { ButtonLink } from "@/components/ui/button";
import { Eyebrow } from "@/components/ui/misc";

const beneficios = [
  { icon: QrCode, title: "Entras sin detenerte a anotar", text: "Muestras el QR en tu celular y la lectura registra tu entrada o tu salida automáticamente." },
  { icon: IdentificationBadge, title: "Cada placa tiene un responsable", text: "El registro exige correo institucional y una placa no puede pertenecer a dos cuentas." },
  { icon: Export, title: "Historial que se consulta y se exporta", text: "Administración filtra por fecha, busca por placa o nombre y descarga lo filtrado en CSV." },
  { icon: Notebook, title: "Visitantes también quedan registrados", text: "La bitácora de caseta guarda nombre, empresa, asunto, placa y horario de cada proveedor." },
  { icon: UserCircleCheck, title: "Identidad confirmada con foto", text: "El guardia compara al conductor con una foto de perfil revisada antes por administración." },
];

const pasos = [
  { icon: UsersThree, title: "Crea tu cuenta", text: "Usa tu correo institucional. Si eres alumno, tu matrícula y tu carrera se llenan solas." },
  { icon: QrCode, title: "Registra tu placa", text: "Cada vehículo recibe una credencial QR única que ves en tu portal." },
  { icon: DeviceMobile, title: "Muéstrala en la caseta", text: "El escáner lee el código, registra el acceso y da la orden de abrir la pluma." },
];

const antes = ["Registro manual en libreta", "Verificación solo a simple vista", "Filas en la entrada en horas pico", "Sin historial para consultar"];
const despues = ["Credencial digital ligada a la matrícula", "Lectura automática del QR en la caseta", "Acceso registrado en el momento", "Historial filtrable y exportable"];

const seguridad = [
  { icon: Fingerprint, title: "Sin datos biométricos", text: "De la foto solo se guarda si cada regla se cumplió. Nunca puntos faciales ni plantillas." },
  { icon: LockKey, title: "Fotos en almacenamiento privado", text: "Se muestran con enlaces firmados que vencen a los 5 minutos." },
  { icon: Timer, title: "Sesiones que se cierran solas", text: "Tu portal se cierra tras 5 minutos sin actividad y el panel de administración a los 30." },
  { icon: Key, title: "Escáner autenticado", text: "La caseta envía una clave propia en cada lectura. Sin ella, el acceso no se registra." },
];

const preguntas = [
  { q: "¿Quién puede registrarse?", a: "Alumnos, docentes y personal administrativo con correo institucional @itsatlixco.edu.mx. Los visitantes y proveedores no necesitan cuenta: la caseta los anota en la bitácora." },
  { q: "¿Cuántos vehículos puedo registrar?", a: "Los que uses para venir al campus. Cada placa recibe su propia credencial QR y solo puede estar en una cuenta." },
  { q: "¿Cómo sabe el sistema si entro o salgo?", a: "Revisa tu último movimiento con esa placa. Si fue una entrada, registra salida; en cualquier otro caso registra entrada." },
  { q: "¿Qué hago si cambio de auto?", a: "Entra a Vehículos en tu portal, elimina la placa anterior y registra la nueva. La credencial nueva queda lista al instante." },
  { q: "¿Para qué sirve la foto de perfil?", a: "Para que el guardia confirme que quien conduce es el titular de la credencial. Administración la revisa antes de que quede vigente." },
  { q: "¿Quién puede ver mi historial?", a: "Tú, desde tu portal, y el personal de administración autorizado. Nadie más tiene acceso a tus movimientos." },
  { q: "¿Por qué se cerró mi sesión?", a: "Por seguridad, el portal se cierra después de 5 minutos sin actividad. Vuelve a iniciar sesión y continúa donde estabas." },
  { q: "¿Necesito instalar una aplicación?", a: "No. Smart Parking funciona desde el navegador de tu celular o tu computadora. Abre tu portal antes de llegar a la caseta para tener la credencial lista." },
];

const faqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: preguntas.map((p) => ({ "@type": "Question", name: p.q, acceptedAnswer: { "@type": "Answer", text: p.a } })),
};

export default function Home() {
  return (
    <>
      <SiteNav />
      <main id="contenido">
        {/* ───── Hero ───── */}
        <section className="relative overflow-hidden px-6 pb-16 pt-32 md:pb-24 md:pt-40">
          <div className="mx-auto grid max-w-6xl items-center gap-16 lg:grid-cols-[1.1fr_1fr]">
            <div className="flex flex-col items-start gap-6">
              <span className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1 caption-4 text-ink2">
                <ShieldCheck size={14} weight="fill" className="text-accent" aria-hidden /> Control de acceso vehicular para campus
              </span>
              <h1 className="heading-1 text-hero-gradient max-w-[680px] pb-1">
                Tu vehículo entra al campus <br className="hidden md:block" />
                con un QR, sin filas ni papel
              </h1>
              <p className="body-3 max-w-[680px] text-ink2">
                Smart Parking liga cada placa a tu correo institucional y te da una credencial QR. En la caseta se lee en segundos y tu acceso queda registrado al momento.
              </p>
              <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:items-center">
                <ButtonLink href="/register" size="lg">
                  Registrar mi vehículo <ArrowRight size={18} weight="bold" aria-hidden />
                </ButtonLink>
                <p className="caption-2 text-ink2">
                  ¿Ya tienes cuenta?{" "}
                  <Link href="/login" className="font-semibold text-primary underline-offset-4 hover:underline">
                    Inicia sesión
                  </Link>
                </p>
              </div>
              <ul className="flex flex-wrap gap-x-6 gap-y-2 pt-4">
                {["Correo institucional verificado", "Un QR único por vehículo", "Historial exportable"].map((t) => (
                  <li key={t} className="flex items-center gap-2 caption-1 text-ink2">
                    <Check size={16} weight="bold" className="text-accent" aria-hidden /> {t}
                  </li>
                ))}
              </ul>
            </div>
            <HeroVisual />
          </div>
        </section>

        {/* ───── Problema → solución ───── */}
        <section className="px-6 py-16 md:py-24">
          <Reveal className="mx-auto max-w-6xl">
            <div className="flex max-w-2xl flex-col gap-4">
              <Eyebrow>El problema</Eyebrow>
              <h2 className="heading-3">El control a mano cuesta tiempo y deja huecos de seguridad</h2>
              <p className="body-3 text-ink2">
                Cuando la entrada depende de una libreta y de la vista del guardia, no hay forma de saber en el momento si quien entra es parte de la comunidad, y el registro se pierde.
              </p>
            </div>
            <div className="grid gap-6 pt-12 md:grid-cols-2">
              <div className="rounded-2xl border border-border bg-surface p-6">
                <p className="title-3 pb-4 text-ink2">Hoy</p>
                <ul className="flex flex-col gap-3">
                  {antes.map((t) => (
                    <li key={t} className="flex items-center gap-3 body-6 text-ink2">
                      <span className="grid size-6 place-items-center rounded-full bg-muted text-danger">
                        <X size={12} weight="bold" aria-hidden />
                      </span>
                      {t}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="rounded-2xl border border-primary bg-surface p-6">
                <p className="title-3 pb-4 text-primary">Con Smart Parking</p>
                <ul className="flex flex-col gap-3">
                  {despues.map((t) => (
                    <li key={t} className="flex items-center gap-3 body-5 text-ink">
                      <span className="grid size-6 place-items-center rounded-full bg-[color-mix(in_srgb,var(--color-accent)_16%,transparent)] text-success">
                        <Check size={12} weight="bold" aria-hidden />
                      </span>
                      {t}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </Reveal>
        </section>

        {/* ───── Beneficios ───── */}
        <section id="beneficios" className="scroll-mt-24 border-y border-border bg-surface px-6 py-16 md:py-24">
          <div className="mx-auto max-w-6xl">
            <Reveal className="flex max-w-2xl flex-col gap-4">
              <Eyebrow>Beneficios</Eyebrow>
              <h2 className="heading-3">Menos tiempo en la entrada, más control del estacionamiento</h2>
            </Reveal>
            <ul className="grid gap-4 pt-12 sm:grid-cols-2 lg:grid-cols-3">
              {beneficios.map((b, i) => (
                <Reveal as="li" key={b.title} delay={i * 60} className="rounded-2xl border border-border bg-bg p-6">
                  <span className="grid size-10 place-items-center rounded-lg bg-[color-mix(in_srgb,var(--color-primary)_12%,transparent)] text-primary">
                    <b.icon size={22} aria-hidden />
                  </span>
                  <p className="title-2 pt-4 text-ink">{b.title}</p>
                  <p className="body-6 pt-2 text-ink2">{b.text}</p>
                </Reveal>
              ))}
              <Reveal as="li" delay={300} className="flex flex-col justify-between gap-6 rounded-2xl bg-primary p-6 text-on-primary">
                <p className="title-2">Funciona desde el navegador de tu celular, sin instalar nada.</p>
                <Link href="/register" className="inline-flex items-center gap-2 button-sm underline-offset-4 hover:underline">
                  Crear mi cuenta <ArrowRight size={16} weight="bold" aria-hidden />
                </Link>
              </Reveal>
            </ul>
          </div>
        </section>

        {/* ───── Frase ───── */}
        <section className="px-6 py-24 md:py-32" aria-label="Lo que hace Smart Parking">
          <TaglineReveal lines={["Cada entrada queda registrada.", "Cada placa tiene un responsable.", "Y tú solo muestras tu celular."]} />
        </section>

        {/* ───── Cómo funciona ───── */}
        <section id="como-funciona" className="scroll-mt-24 px-6 pb-16 md:pb-24">
          <div className="mx-auto max-w-6xl">
            <Reveal className="flex max-w-2xl flex-col gap-4">
              <Eyebrow>Cómo funciona</Eyebrow>
              <h2 className="heading-3">Tres pasos y tu credencial queda lista</h2>
            </Reveal>
            <ol className="grid gap-4 pt-12 md:grid-cols-3">
              {pasos.map((p, i) => (
                <Reveal as="li" key={p.title} delay={i * 80} className="relative rounded-2xl border border-border bg-surface p-6">
                  <div className="flex items-center justify-between">
                    <span className="grid size-10 place-items-center rounded-lg bg-muted text-primary">
                      <p.icon size={22} aria-hidden />
                    </span>
                    <span className="font-mono caption-1 text-ink2">0{i + 1}</span>
                  </div>
                  <p className="title-2 pt-6 text-ink">{p.title}</p>
                  <p className="body-6 pt-2 text-ink2">{p.text}</p>
                </Reveal>
              ))}
            </ol>
          </div>
        </section>

        {/* ───── Tres vistas ───── */}
        <section className="px-6 pb-16 md:pb-24">
          <Reveal className="mx-auto grid max-w-6xl gap-4 lg:grid-cols-3">
            {[
              { icon: DeviceMobile, title: "Portal de la comunidad", items: ["Credencial QR por vehículo", "Historial de tus últimos accesos", "Perfil y foto verificada"] },
              { icon: ClipboardText, title: "Panel de administración", items: ["Accesos, vehículos y usuarios", "Búsqueda, filtros y exportación CSV", "Revisión de fotos de perfil"] },
              { icon: Notebook, title: "Caseta", items: ["Escáner QR con cámara USB", "Orden de apertura para la pluma", "Bitácora de visitantes y proveedores"] },
            ].map((v) => (
              <div key={v.title} className="rounded-2xl border border-border bg-surface p-6">
                <div className="flex items-center gap-3">
                  <v.icon size={22} className="text-primary" aria-hidden />
                  <p className="title-2 text-ink">{v.title}</p>
                </div>
                <ul className="flex flex-col gap-2 pt-4">
                  {v.items.map((t) => (
                    <li key={t} className="flex items-center gap-2 body-6 text-ink2">
                      <Check size={14} weight="bold" className="text-accent" aria-hidden /> {t}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </Reveal>
        </section>

        {/* ───── Seguridad ───── */}
        <section id="seguridad" className="scroll-mt-24 border-y border-border bg-surface px-6 py-16 md:py-24">
          <div className="mx-auto grid max-w-6xl gap-12 lg:grid-cols-[1fr_1.4fr]">
            <Reveal className="flex flex-col gap-4">
              <Eyebrow>Seguridad y privacidad</Eyebrow>
              <h2 className="heading-3">Tus datos se usan para abrir la pluma, y para nada más</h2>
              <p className="body-3 text-ink2">Cada decisión del sistema está pensada para registrar accesos sin exponer información personal.</p>
              <Link href="/privacidad" className="inline-flex items-center gap-2 pt-2 button-sm text-primary underline-offset-4 hover:underline">
                Leer el aviso de privacidad <ArrowRight size={16} weight="bold" aria-hidden />
              </Link>
            </Reveal>
            <ul className="grid gap-4 sm:grid-cols-2">
              {seguridad.map((s, i) => (
                <Reveal as="li" key={s.title} delay={i * 60} className="rounded-2xl border border-border bg-bg p-6">
                  <s.icon size={24} className="text-accent" aria-hidden />
                  <p className="title-3 pt-4 text-ink">{s.title}</p>
                  <p className="body-6 pt-2 text-ink2">{s.text}</p>
                </Reveal>
              ))}
            </ul>
          </div>
        </section>

        {/* ───── Preguntas ───── */}
        <section id="preguntas" className="scroll-mt-24 px-6 py-16 md:py-24">
          <div className="mx-auto max-w-3xl">
            <Reveal className="flex flex-col items-center gap-4 text-center">
              <Eyebrow>Preguntas frecuentes</Eyebrow>
              <h2 className="heading-3">Lo que más nos preguntan</h2>
            </Reveal>
            <div className="flex flex-col gap-3 pt-12">
              {preguntas.map((p) => (
                <details key={p.q} className="group rounded-2xl border border-border bg-surface px-6 open:pb-6">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-4 title-3 text-ink [&::-webkit-details-marker]:hidden">
                    {p.q}
                    <span aria-hidden className="relative grid size-6 shrink-0 place-items-center rounded-full bg-muted text-ink2">
                      <span className="absolute h-0.5 w-2.5 rounded-full bg-current" />
                      <span className="absolute h-0.5 w-2.5 rotate-90 rounded-full bg-current transition-transform duration-500 ease-weighted group-open:rotate-0" />
                    </span>
                  </summary>
                  <p className="body-6 text-ink2">{p.a}</p>
                </details>
              ))}
            </div>
          </div>
          <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />
        </section>

        {/* ───── CTA final ───── */}
        <section className="px-6 pb-24">
          <Reveal className="mx-auto flex max-w-6xl flex-col items-center gap-6 rounded-3xl bg-primary px-6 py-16 text-center text-on-primary md:py-20">
            <h2 className="heading-3 max-w-[680px]">Tu credencial vehicular, lista en unos minutos</h2>
            <p className="body-3 max-w-[560px] opacity-90">Crea tu cuenta con tu correo institucional y registra tu placa. Puedes eliminar o cambiar tus vehículos cuando quieras.</p>
            <ButtonLink href="/register" size="lg" variant="accent">
              Registrar mi vehículo <ArrowRight size={18} weight="bold" aria-hidden />
            </ButtonLink>
          </Reveal>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
