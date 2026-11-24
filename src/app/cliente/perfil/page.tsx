import { redirect } from "next/navigation";
import { requireSession } from "@/lib/auth";
import { repo } from "@/lib/data";
import { nombreCompleto } from "@/lib/data/shared";
import { ROL_LABEL } from "@/lib/identity";
import { PageHeader } from "@/components/app/app-shell";
import { PerfilForm } from "@/components/app/perfil-form";
import { PasswordForm } from "@/components/app/password-form";
import { FotoPerfilCard } from "@/components/app/foto-perfil-card";
import { Card } from "@/components/ui/misc";

export const metadata = { title: "Mi perfil" };

export default async function PerfilPage() {
  const s = await requireSession("cliente");
  const u = await repo().getUsuario(Number(s.sub));
  if (!u) redirect("/login");
  const esAlumno = u.rol === "estudiante";
  const fotoUrl = u.foto_path ? await repo().fotoUrl(u.foto_path) : null;

  // Matrícula, carrera y semestre solo para alumnos.
  const datos: [string, string][] = [
    ["Correo", u.correo],
    ["Tipo de cuenta", u.rol ? ROL_LABEL[u.rol] : "Sin tipo"],
    ...(esAlumno
      ? ([
          ["Matrícula", u.matricula?.toUpperCase() ?? "—"],
          ["Carrera", u.carrera ?? "—"],
          ["Semestre", u.semestre ? `${u.semestre}.º semestre` : "—"],
        ] as [string, string][])
      : []),
  ];

  return (
    <>
      <PageHeader title="Mi perfil" description="Tus datos, tu foto verificada y tu contraseña." />
      <div className="grid items-start gap-6 lg:grid-cols-[360px_1fr]">
        <Card className="sp-rise p-6 lg:sticky lg:top-6">
          <h2 className="title-3 pb-4 text-ink">Mis datos</h2>
          <FotoPerfilCard nombre={nombreCompleto(u)} url={fotoUrl} estado={u.foto_estado} motivo={u.foto_motivo_rechazo} tieneArchivo={Boolean(u.foto_path)} />
          <dl className="mt-6 flex flex-col gap-3 border-t border-border pt-4">
            {datos.map(([k, v]) => (
              <div key={k} className="flex flex-col gap-0.5">
                <dt className="caption-4 text-ink2">{k}</dt>
                <dd className={`body-5 break-words text-ink ${k === "Matrícula" ? "font-mono" : ""}`}>{v}</dd>
              </div>
            ))}
          </dl>
          <p className="caption-5 pt-4 text-ink2">El correo y el tipo de cuenta no se pueden cambiar.</p>
        </Card>

        <div className="flex flex-col gap-6">
          <Card className="sp-rise p-6">
            <h2 className="title-3 text-ink">Actualizar datos</h2>
            <p className="body-6 pb-6 pt-1 text-ink2">Así aparece tu nombre en tu credencial y en los registros de acceso.</p>
            <PerfilForm esAlumno={esAlumno} inicial={{ nombre: u.nombre ?? "", apellido_paterno: u.apellido_paterno ?? "", apellido_materno: u.apellido_materno ?? "", semestre: u.semestre }} />
          </Card>
          <Card className="sp-rise p-6">
            <h2 className="title-3 text-ink">Cambiar contraseña</h2>
            <p className="body-6 pb-6 pt-1 text-ink2">La usarás la próxima vez que inicies sesión.</p>
            <PasswordForm />
          </Card>
        </div>
      </div>
    </>
  );
}
