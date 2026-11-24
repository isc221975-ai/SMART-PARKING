import { LegalPage } from "@/components/legal-page";

export const metadata = { title: "Términos de uso", description: "Condiciones para usar Smart Parking." };

export default function Page() {
  return (
    <LegalPage
      title="Términos de uso"
      updated="23 de noviembre de 2026"
      sections={[
        { h: "Uso de la cuenta", p: ["Tu cuenta es personal e intransferible. Solo puedes registrarte con tu correo institucional y debes mantener tu contraseña en privado."] },
        { h: "Credenciales QR", p: ["Cada credencial pertenece a una placa y a tu cuenta. Los accesos que se registren con ella quedan a tu nombre. No compartas tu código con otras personas."] },
        { h: "Vehículos", p: ["Solo registra placas de vehículos que uses para venir al campus. Una placa no puede estar en dos cuentas; si cambias de vehículo, elimina la placa anterior."] },
        { h: "Foto de perfil", p: ["La foto debe mostrar tu rostro de frente, sin lentes, gorra ni cubrebocas. La administración puede rechazarla si no cumple las reglas, indicando el motivo."] },
        { h: "Uso indebido", p: ["Intentar falsificar credenciales, acceder a cuentas ajenas o alterar el sistema puede causar la suspensión de tu cuenta y las medidas que determine la institución."] },
      ]}
    />
  );
}
