import { repo } from "@/lib/data";
import { requireSession } from "@/lib/auth";
import { nombreCompleto } from "@/lib/data/shared";
import { PageHeader } from "@/components/app/app-shell";
import { UsuariosTable, type UsuarioFila } from "@/components/admin/tables";

export const metadata = { title: "Usuarios" };

export default async function Page({ searchParams }: { searchParams: Promise<{ q?: string; foto?: string }> }) {
  await requireSession("admin");
  const sp = await searchParams;
  const [usuarios, vehiculos] = await Promise.all([repo().listUsuarios(), repo().listVehiculos()]);
  const urls = await repo().fotoUrls(usuarios.map((u) => u.foto_path).filter((p): p is string => Boolean(p)));
  const porUsuario = new Map<number, number>();
  for (const v of vehiculos) porUsuario.set(v.usuario_id, (porUsuario.get(v.usuario_id) ?? 0) + 1);

  // Solo lo que muestra la tabla: nunca auth_id, rutas del bucket ni foto_checks.
  const rows: UsuarioFila[] = usuarios.map((u) => ({
    id: u.id,
    nombre: nombreCompleto(u),
    correo: u.correo,
    rol: u.rol,
    matricula: u.matricula,
    carrera: u.carrera,
    semestre: u.semestre,
    vehiculos: porUsuario.get(u.id) ?? 0,
    fotoUrl: u.foto_path ? (urls[u.foto_path] ?? null) : null,
    foto_estado: u.foto_estado,
  }));

  return (
    <>
      <PageHeader title="Usuarios" description="Comunidad registrada con correo institucional. Las fotos se muestran con enlaces que vencen en 5 minutos." />
      <UsuariosTable key={`${sp.q ?? ""}|${sp.foto ?? ""}`} rows={rows} initialQuery={(sp.q ?? "").slice(0, 60)} soloPendientes={sp.foto === "pendiente"} />
    </>
  );
}
