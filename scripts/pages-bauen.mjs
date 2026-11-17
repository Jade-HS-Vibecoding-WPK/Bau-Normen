// Baut die statische Online-Version für GitHub Pages nach out/.
// Aufruf: npm run build:pages   (optional: NEXT_PUBLIC_BASIS=/Repo-Name, Standard /Bau-Normen-KI)
//
// 1. Kopiert die Gesetzesdaten (data/gesetze, data/erlaeuterungen, data/stichworte.json) nach public/daten/,
//    damit der Browser sie laden kann.
// 2. Baut Next.js im Modus "export" (siehe next.config.mjs) – ohne Server, ohne API-Route.
import { spawnSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, rmSync, statSync, writeFileSync } from "node:fs";

const nurJson = (quelle) => statSync(quelle).isDirectory() || quelle.endsWith(".json");

rmSync("public/daten", { recursive: true, force: true });
mkdirSync("public/daten", { recursive: true });
cpSync("data/gesetze", "public/daten/gesetze", { recursive: true, filter: nurJson });
cpSync("data/erlaeuterungen", "public/daten/erlaeuterungen", { recursive: true, filter: nurJson });
cpSync("data/stichworte.json", "public/daten/stichworte.json");
console.log("Daten nach public/daten/ kopiert.");

const env = { ...process.env, NEXT_PUBLIC_STATISCH: "1", NEXT_PUBLIC_BASIS: process.env.NEXT_PUBLIC_BASIS ?? "/Bau-Normen-KI" };
console.log(`Baue statische Fassung für ${env.NEXT_PUBLIC_BASIS || "/"} …`);
const r = spawnSync(process.execPath, ["node_modules/next/dist/bin/next", "build"], { stdio: "inherit", env });
if (r.status !== 0) process.exit(r.status ?? 1);

// GitHub Pages soll Ordner mit Unterstrich (_next) unverändert ausliefern.
if (existsSync("out")) writeFileSync("out/.nojekyll", "");
console.log("Fertig: out/ enthält die Online-Version.");
