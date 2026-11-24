import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/app/app-shell";
import { requireSession } from "@/lib/auth";
import { repo } from "@/lib/data";
import { ROL_LABEL } from "@/lib/identity";
import type { Rol } from "@/lib/data";

export const metadata: Metadata = { title: { default: "Mi portal", template: "%s · Smart Parking" }, robots: { index: false, follow: false } };

const PANEL_TITLE: Record<Rol, string> = {
  estudiante: "Panel de alumno",
  docente: "Panel de docente",
  administrativo: "Panel administrativo",
  administrador: "Panel administrativo",
};

export default async function ClienteLayout({ children }: { children: React.ReactNode }) {
  const s = await requireSession("cliente");
  const id = Number(s.sub);
  const [u, vehiculos] = await Promise.all([repo().getUsuario(id), repo().listVehiculos(id)]);
  if (!u) redirect("/login");
  const rol: Rol = u.rol ?? "estudiante";
  const nombre = [u.nombre, u.apellido_paterno].filter(Boolean).join(" ") || s.name;
  // Matrícula solo para alumnos.
  const sub = `${ROL_LABEL[rol]}${rol === "estudiante" && u.matricula ? ` · ${u.matricula.toUpperCase()}` : ""}`;
  return (
    <AppShell panel="cliente" title={PANEL_TITLE[rol]} user={nombre} subtitle={sub} qrDisponible={vehiculos.some((v) => v.qr_token)}>
      {children}
    </AppShell>
  );
}
