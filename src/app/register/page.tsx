import type { Metadata } from "next";
import Link from "next/link";
import { AuthShell } from "@/components/auth/auth-shell";
import { RegisterForm } from "@/components/auth/register-form";
import { env } from "@/lib/env";

export const metadata: Metadata = { title: "Crear cuenta", description: "Crea tu cuenta de Smart Parking con tu correo institucional." };

export default function RegisterPage() {
  return (
    <AuthShell title="Crea tu cuenta" subtitle="Usa tu correo institucional. Después podrás registrar tus vehículos y obtener tu credencial QR.">
      <RegisterForm dominio={env.institutionDomain} />
      <p className="pt-8 text-center body-6 text-ink2">
        ¿Ya tienes cuenta?{" "}
        <Link href="/login" className="font-semibold text-primary underline-offset-4 hover:underline">
          Inicia sesión
        </Link>
      </p>
    </AuthShell>
  );
}
