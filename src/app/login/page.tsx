import type { Metadata } from "next";
import Link from "next/link";
import { AuthShell } from "@/components/auth/auth-shell";
import { LoginForm } from "@/components/auth/login-form";

export const metadata: Metadata = { title: "Iniciar sesión", robots: { index: false } };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  const safeNext = next && /^\/(cliente|admin)(\/[\w/-]*)?$/.test(next) ? next : undefined;
  return (
    <AuthShell title="Inicia sesión" subtitle="Entra con tu correo institucional.">
      <LoginForm next={safeNext} />
      <p className="pt-8 text-center body-6 text-ink2">
        ¿Aún no tienes cuenta?{" "}
        <Link href="/register" className="font-semibold text-primary underline-offset-4 hover:underline">
          Crear cuenta
        </Link>
      </p>
    </AuthShell>
  );
}
