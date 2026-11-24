import { LegalPage } from "@/components/legal-page";

export const metadata = { title: "Aviso de privacidad", description: "Cómo Smart Parking trata tus datos personales." };

export default function Page() {
  return (
    <LegalPage
      title="Aviso de privacidad"
      updated="23 de noviembre de 2026"
      sections={[
        { h: "Responsable", p: ["Smart Parking es operado dentro del Instituto Tecnológico Superior de Atlixco para el control de acceso vehicular al campus. Para dudas sobre tus datos escribe a {{correo_de_contacto}}."] },
        { h: "Datos que tratamos", p: ["Correo institucional, nombre, apellidos, tipo de usuario, matrícula, carrera y semestre; las placas de tus vehículos; la fecha, hora y tipo de cada acceso; y, si la subes, tu foto de perfil.", "De la foto no guardamos puntos faciales, plantillas ni datos biométricos. Solo registramos si cada regla de calidad se cumplió."] },
        { h: "Para qué los usamos", p: ["Para identificarte como parte de la comunidad, generar tu credencial QR, registrar tus entradas y salidas, y permitir que el personal de caseta confirme tu identidad. No usamos tus datos con fines comerciales ni los compartimos con terceros."] },
        { h: "Cómo los protegemos", p: ["Las fotos se guardan en almacenamiento privado y se muestran con enlaces firmados que vencen a los 5 minutos. Las sesiones están firmadas y se cierran tras 5 minutos sin actividad. El escáner de la caseta se autentica con una clave propia."] },
        { h: "Tus derechos", p: ["Puedes consultar y corregir tus datos desde tu perfil, eliminar tus vehículos en cualquier momento y solicitar la cancelación de tu cuenta a la administración del estacionamiento."] },
      ]}
    />
  );
}
