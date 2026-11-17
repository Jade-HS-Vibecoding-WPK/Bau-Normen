// Zwei Betriebsarten:
//  - normal (npm run dev / build / start): Next.js-Server mit API-Route /api/frage
//  - statisch (npm run build:pages): reine HTML/JS-Dateien für GitHub Pages in out/ – der Lotse läuft dann im Browser
const statisch = process.env.NEXT_PUBLIC_STATISCH === "1";

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Das runde "N" unten links ist ein Entwicklerwerkzeug von Next.js – für die App nicht nötig.
  devIndicators: false,
  ...(statisch
    ? {
        output: "export",
        // GitHub Pages liefert das Projekt unter /<Repo-Name>/ aus
        basePath: process.env.NEXT_PUBLIC_BASIS ?? "",
        trailingSlash: true,
        images: { unoptimized: true },
        // Nur .tsx-Dateien sind Seiten – die API-Route (route.ts) gehört nicht in die statische Fassung.
        pageExtensions: ["tsx"],
      }
    : {
        // Die Gesetzesdaten liegen als JSON unter data/ und werden serverseitig gelesen.
        outputFileTracingIncludes: {
          "/api/**": ["./data/gesetze/**", "./data/erlaeuterungen/**", "./data/stichworte.json"],
        },
      }),
};

export default nextConfig;
