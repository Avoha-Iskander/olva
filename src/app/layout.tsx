import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import "./globals.css";

import { ServiceWorker } from "@/components/pwa/service-worker";

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
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#141a26" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="fr" className={`${geistSans.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        {children}
        <ServiceWorker />
      </body>
    </html>
  );
}
