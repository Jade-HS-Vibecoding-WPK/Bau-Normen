import type { Metadata } from "next";
import { DM_Mono, Figtree, Fraunces, Source_Serif_4 } from "next/font/google";
import { VORAB_SKRIPT } from "@/lib/vorab";
import "./globals.css";

// Schriften: Figtree für die Oberfläche (freundlich, gut lesbar), Fraunces für Überschriften (weiche, organische Serifen),
// DM Mono für Nummern und Metadaten, Source Serif für den Gesetzestext (ruhiges Lesen wie im Gesetzblatt).
const sans = Figtree({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--font-sans" });
const display = Fraunces({ subsets: ["latin"], axes: ["SOFT", "opsz"], variable: "--font-display" });
const mono = DM_Mono({ subsets: ["latin"], weight: ["400", "500"], variable: "--font-mono" });
const serif = Source_Serif_4({ subsets: ["latin"], weight: ["400", "600"], variable: "--font-serif" });

export const metadata: Metadata = {
  title: "Bau-Normen-KI – Baurecht im Wortlaut",
  description: "BauGB und Niedersächsisches Denkmalschutzgesetz im amtlichen Wortlaut, mit Ortsauskunft zu Bebauungsplan und Denkmalschutz in Oldenburg.",
  // helles und dunkles Farbschema
  other: { "color-scheme": "light dark" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de" className={`${sans.variable} ${display.variable} ${mono.variable} ${serif.variable}`} suppressHydrationWarning>
      <head>
        {/* Farbschema, Sprache und Animationen vor dem ersten Zeichnen setzen (gespeicherte Einstellungen) */}
        <script dangerouslySetInnerHTML={{ __html: VORAB_SKRIPT }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
