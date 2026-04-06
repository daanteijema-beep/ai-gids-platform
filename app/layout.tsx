import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI Gids voor Ondernemers",
  description:
    "Persoonlijke AI-gidsen voor kleine ondernemers in Nederland. Leer hoe je AI inzet voor meer klanten, meer omzet en minder werk.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="nl" className="h-full antialiased">
      <body className="min-h-full">{children}</body>
    </html>
  );
}
