import type { Metadata, Viewport } from "next";
import { Inter, Archivo } from "next/font/google";
import "./globals.css";
import { SITE_NAME, SITE_URL, organizationJsonLd } from "@/lib/seo";
import { RegisterSW } from "@/components/pwa/register-sw";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });

/** Display para títulos (h1-h3 vía CSS): grotesca atlética, tracking negativo. */
const archivo = Archivo({ subsets: ["latin"], variable: "--font-archivo", display: "swap" });

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${SITE_NAME} — Entrenador personal online`,
    template: `%s`,
  },
  description:
    "Entrenamiento online profesional: planes personalizados, seguimiento real y herramientas gratuitas con fórmulas validadas.",
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
  themeColor: "#0b0b0b",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const orgJsonLd = JSON.stringify(organizationJsonLd());
  return (
    <html lang="es" className={`${inter.variable} ${archivo.variable}`}>
      <body className="font-sans">
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: orgJsonLd }} />
        <RegisterSW />
        {children}
      </body>
    </html>
  );
}
