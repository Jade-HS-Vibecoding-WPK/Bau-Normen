// Baut die statische Online-Version für GitHub Pages nach out/.
// Aufruf: npm run build:pages   (optional: NEXT_PUBLIC_BASIS=/Repo-Name, Standard /Bau-Normen-KI)
//
// 1. Bereitet die Daten für den Browser in kleinen Teilen vor (public/daten/), damit die Seite auch mit vielen
//    Regelwerken schnell bleibt – der Browser lädt nur, was er gerade braucht (siehe lib/daten-browser.ts):
//      index.json                    alle Regelwerke: Kopfdaten + je Vorschrift Bezeichnung, Titel, Gliederung, Verweise
//      wortlaut/<gesetz>/<id>.json   Wortlaut (inhalt, fussnoten) je Vorschrift – unverändert aus data/gesetze
//      suche.json                    Suchtexte in Kleinbuchstaben ("gesetz:id" -> text) für die Volltextsuche
//      erlaeuterungen/, stichworte.json  wie in data/
// 2. Baut Next.js im Modus "export" (siehe next.config.mjs) – ohne Server, ohne API-Route.
import { spawnSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";

const nurJson = (quelle) => statSync(quelle).isDirectory() || quelle.endsWith(".json");
const ZIEL = "public/daten";

rmSync(ZIEL, { recursive: true, force: true });
mkdirSync(ZIEL, { recursive: true });

// erlaeuterungen: welche Gesetze Erläuterungen haben – der Browser fragt nur diese Dateien an
const index = { gesetze: [], erlaeuterungen: readdirSync("data/erlaeuterungen").filter((d) => d.endsWith(".json")).map((d) => d.slice(0, -5)) };
const suche = {};
let dateien = 0;
let groesseWortlaut = 0;
for (const datei of readdirSync("data/gesetze").filter((d) => d.endsWith(".json")).sort()) {
  const g = JSON.parse(readFileSync(path.join("data/gesetze", datei), "utf8"));
  const { normen, ...kopf } = g;
  const ordner = path.join(ZIEL, "wortlaut", g.id);
  mkdirSync(ordner, { recursive: true });
  const kurz = [];
  for (const n of normen) {
    const { inhalt, text, fussnoten, ...meta } = n;
    kurz.push(meta);
    const inhaltJson = JSON.stringify(fussnoten ? { inhalt, fussnoten } : { inhalt });
    writeFileSync(path.join(ordner, `${n.id}.json`), inhaltJson);
    groesseWortlaut += inhaltJson.length;
    dateien++;
    if (!n.weggefallen) suche[`${g.id}:${n.id}`] = (text ?? "").toLowerCase();
  }
  index.gesetze.push({ ...kopf, normen: kurz });
}
const indexJson = JSON.stringify(index);
writeFileSync(path.join(ZIEL, "index.json"), indexJson);
const sucheJson = JSON.stringify(suche);
writeFileSync(path.join(ZIEL, "suche.json"), sucheJson);
cpSync("data/erlaeuterungen", path.join(ZIEL, "erlaeuterungen"), { recursive: true, filter: nurJson });
cpSync("data/stichworte.json", path.join(ZIEL, "stichworte.json"));
const kb = (n) => `${Math.round(n / 1024)} KB`;
console.log(`Daten vorbereitet: index.json ${kb(indexJson.length)} (${index.gesetze.length} Regelwerke), ${dateien} Wortlaut-Dateien (${kb(groesseWortlaut)} zusammen), suche.json ${kb(sucheJson.length)}`);

const env = { ...process.env, NEXT_PUBLIC_STATISCH: "1", NEXT_PUBLIC_BASIS: process.env.NEXT_PUBLIC_BASIS ?? "/Bau-Normen-KI" };
console.log(`Baue statische Fassung für ${env.NEXT_PUBLIC_BASIS || "/"} …`);
const r = spawnSync(process.execPath, ["node_modules/next/dist/bin/next", "build"], { stdio: "inherit", env });
if (r.status !== 0) process.exit(r.status ?? 1);

// GitHub Pages soll Ordner mit Unterstrich (_next) unverändert ausliefern.
if (existsSync("out")) writeFileSync("out/.nojekyll", "");
console.log("Fertig: out/ enthält die Online-Version.");
