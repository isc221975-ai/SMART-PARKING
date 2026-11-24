/**
 * Lectura centralizada de variables de entorno.
 * Nada de aquí se envía al navegador salvo las que empiezan con NEXT_PUBLIC_.
 */

export const env = {
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
  supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
  supabaseServiceKey: process.env.SUPABASE_SERVICE_ROLE_KEY ?? "",
  adminUser: process.env.ADMIN_USER ?? "",
  adminPassword: process.env.ADMIN_PASSWORD ?? "",
  /** Muestra «Simular lectura de QR» en /admin. Apagado salvo que valga "true". */
  enableScanSimulator: process.env.ENABLE_SCAN_SIMULATOR === "true",
  sessionSecret: process.env.SESSION_SECRET ?? "",
  hardwareApiKey: process.env.HARDWARE_API_KEY ?? "",
  institutionDomain: process.env.NEXT_PUBLIC_INSTITUTION_DOMAIN ?? "itsatlixco.edu.mx",
  institutionName: process.env.NEXT_PUBLIC_INSTITUTION_NAME ?? "Instituto Tecnológico Superior de Atlixco",
};

export function hasSupabase(): boolean {
  return Boolean(env.supabaseUrl && env.supabaseServiceKey && env.supabaseAnonKey);
}
