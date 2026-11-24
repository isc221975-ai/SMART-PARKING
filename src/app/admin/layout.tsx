import type { Metadata } from "next";
import { AppShell } from "@/components/app/app-shell";
import { requireSession } from "@/lib/auth";

export const metadata: Metadata = { title: { default: "Administración", template: "%s · Smart Parking" }, robots: { index: false, follow: false } };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const s = await requireSession("admin");
  return (
    <AppShell panel="admin" title="Panel de administración" user={s.name} subtitle="Sesión de 30 minutos">
      {children}
    </AppShell>
  );
}
