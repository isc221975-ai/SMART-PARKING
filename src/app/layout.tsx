import type { Metadata, Viewport } from "next";
import "@fontsource-variable/sora";
import "@fontsource-variable/public-sans";
import "@fontsource/ibm-plex-mono/400.css";
import "@fontsource/ibm-plex-mono/500.css";
import "./globals.css";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Smart Parking · Control de acceso vehicular con credenciales QR",
    template: "%s · Smart Parking",
  },
  description:
    "Smart Parking registra la entrada y salida de vehículos del campus con credenciales QR ligadas al correo institucional. Historial consultable, bitácora de visitantes y panel de administración.",
  applicationName: "Smart Parking",
  keywords: ["control de acceso vehicular", "estacionamiento", "credencial QR", "campus", "universidad", "Smart Campus"],
  icons: {
    icon: [
      { url: "/brand/favicon.ico", sizes: "any" },
      { url: "/brand/icon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/brand/icon-192.png", sizes: "192x192", type: "image/png" },
    ],
    apple: "/brand/apple-icon.png",
  },
  manifest: "/manifest.webmanifest",
  openGraph: {
    type: "website",
    locale: "es_MX",
    siteName: "Smart Parking",
    title: "Smart Parking · Control de acceso vehicular con credenciales QR",
    description: "Tu vehículo entra al campus con un QR, sin filas ni registro en papel.",
    images: [{ url: "/brand/og.png", width: 1200, height: 630, alt: "Smart Parking" }],
  },
  twitter: { card: "summary_large_image" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#F6F8FB" },
    { media: "(prefers-color-scheme: dark)", color: "#0A1424" },
  ],
};

// Aplica el tema antes de pintar para evitar el parpadeo.
const themeScript = `(function(){try{var t=localStorage.getItem('sp-theme');if(!t){t=matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'}document.documentElement.dataset.theme=t}catch(e){}})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es-MX" data-scroll-behavior="smooth" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-dvh">
        <a
          href="#contenido"
          className="fixed left-4 top-4 z-[100] -translate-y-24 rounded-lg bg-primary px-3 py-2 button-sm text-on-primary transition-transform duration-300 ease-weighted focus:translate-y-0"
        >
          Saltar al contenido
        </a>
        {children}
      </body>
    </html>
  );
}
