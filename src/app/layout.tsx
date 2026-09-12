import type { Metadata, Viewport } from "next";
import { Inter, Archivo } from "next/font/google";
import "./globals.css";
import { SITE_NAME, SITE_URL } from "@/lib/constants";
import { organizationJsonLd } from "@/lib/seo";
import { RegisterSW } from "@/components/pwa/register-sw";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/react";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });

/** Display para títulos (h1-h3 vía CSS): grotesca atlética, tracking negativo. */
const archivo = Archivo({ subsets: ["latin"], variable: "--font-archivo", display: "swap" });

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${SITE_NAME} — Entrenamiento con método, registro y progreso real`,
    template: `%s`,
  },
  description:
    "KinetixFitt: entrenamiento online premium con planes personalizados, registro de cada sesión y métricas reales de progreso en Mi Zona.",
  applicationName: SITE_NAME,
  appleWebApp: {
    capable: true,
    title: SITE_NAME,
    statusBarStyle: "black-translucent",
  },
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    images: [{ url: "/brand/og.png", width: 1440, height: 720, alt: SITE_NAME }],
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: "#071012",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const orgJsonLd = JSON.stringify(organizationJsonLd());
  return (
    <html lang="es" className={`${inter.variable} ${archivo.variable}`} suppressHydrationWarning>
      <body className="font-sans antialiased">
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: orgJsonLd }} />
        <RegisterSW />
        {children}
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
