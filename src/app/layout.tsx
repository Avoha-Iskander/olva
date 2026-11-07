import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import "./globals.css";

import { ServiceWorker } from "@/components/pwa/service-worker";
import { THEME_BOOT_SCRIPT, THEME_COLORS } from "@/lib/theme";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Olva",
  description: "Toutes vos recettes à un endroit, vos listes de courses en 2 minutes.",
  // iPhone : app installée en plein écran, avec son nom et son icône
  appleWebApp: { capable: true, title: "Olva", statusBarStyle: "default" },
  icons: { apple: "/icons/apple-touch-icon.png" },
};

// Couleur de la barre d'état du téléphone, selon le thème clair ou sombre
export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: THEME_COLORS.light },
    { media: "(prefers-color-scheme: dark)", color: THEME_COLORS.dark },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    // suppressHydrationWarning : le script ci-dessous peut poser data-theme sur <html>
    // avant React ; c'est voulu, React n'a pas à s'en étonner
    <html lang="fr" className={`${geistSans.variable} h-full antialiased`} suppressHydrationWarning>
      <head>
        {/* Thème gardé sur l'appareil, posé avant l'affichage : pas de flash (US-CPT-05) */}
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOT_SCRIPT }} />
      </head>
      <body className="flex min-h-full flex-col">
        {children}
        <ServiceWorker />
      </body>
    </html>
  );
}
