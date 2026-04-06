import type { Metadata } from "next"
import { Outfit } from "next/font/google"
import "./globals.css"

const outfit = Outfit({
  subsets: ['latin'],
  variable: '--font-outfit',
  weight: ['300', '400', '500', '600', '700', '800'],
  display: 'swap',
})

export const metadata: Metadata = {
  title: "VakwebTwente — AI Automatisering voor het MKB",
  description: "AI-gestuurde salesautomatisering voor het Nederlandse MKB. Van marktonderzoek naar gepersonaliseerde outreach, volledig automatisch.",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="nl" className={`${outfit.variable} h-full antialiased`}>
      <body className="font-[family-name:var(--font-outfit)] min-h-full">{children}</body>
    </html>
  )
}
