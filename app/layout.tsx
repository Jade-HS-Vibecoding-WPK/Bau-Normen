import type { Metadata } from "next";
import { IBM_Plex_Mono, IBM_Plex_Sans, IBM_Plex_Sans_Condensed, Source_Serif_4 } from "next/font/google";
import "./globals.css";

// Schriften: Plex Sans für die Oberfläche, Plex Sans Condensed für Überschriften (Bauschild-Charakter),
// Plex Mono für Nummern und Metadaten (wie Planbeschriftung), Source Serif für den Gesetzestext (Gesetzblatt).
const sans = IBM_Plex_Sans({ subsets: ["latin"], weight: ["400", "500", "600"], variable: "--font-sans" });
const cond = IBM_Plex_Sans_Condensed({ subsets: ["latin"], weight: ["500", "600", "700"], variable: "--font-cond" });
const mono = IBM_Plex_Mono({ subsets: ["latin"], weight: ["400", "500"], variable: "--font-mono" });
const serif = Source_Serif_4({ subsets: ["latin"], weight: ["400", "600"], variable: "--font-serif" });

export const metadata: Metadata = {
  title: "Bau-Normen-KI – Baurecht im Wortlaut",
  description: "BauGB und Niedersächsisches Denkmalschutzgesetz im amtlichen Wortlaut, mit Ortsauskunft zu Bebauungsplan und Denkmalschutz in Oldenburg.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de" className={`${sans.variable} ${cond.variable} ${mono.variable} ${serif.variable}`}>
      <body>{children}</body>
    </html>
  );
}
