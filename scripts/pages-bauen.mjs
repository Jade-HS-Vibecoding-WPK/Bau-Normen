// Baut die statische Online-Version für GitHub Pages nach out/.
// Aufruf: npm run build:pages   (optional: NEXT_PUBLIC_BASIS=/Repo-Name, Standard /Bau-Normen-KI)
//
// 1. Bereitet die Daten für den Browser in kleinen Teilen vor (public/daten/), damit die Seite auch mit vielen
//    Regelwerken schnell bleibt – der Browser lädt nur, was er gerade braucht (siehe lib/daten-browser.ts):
//      katalog.json                  alle Regelwerke (Kopfdaten, je Vorschrift Nummer und Titel), Stichworte, Gegenstücke
//      details/<gesetz>.json         je Vorschrift Gliederung, Verweise, Adresse
//      wortlaut/<gesetz>/<id>.json   Wortlaut (inhalt, fussnoten) je Vorschrift – unverändert aus data/gesetze
//      suche/<gesetz>.json           Suchtexte in Kleinbuchstaben (Norm-ID -> text) für die Volltextsuche
//      erlaeuterungen/               wie in data/
// 2. Baut Next.js im Modus "export" (siehe next.config.mjs) – ohne Server, ohne API-Route.
import { spawnSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";

const nurJson = (quelle) => statSync(quelle).isDirectory() || quelle.endsWith(".json");
const ZIEL = "public/daten";

rmSync(ZIEL, { recursive: true, force: true });
mkdirSync(ZIEL, { recursive: true });

// Katalog: alle Regelwerke mit Nummer und Titel je Vorschrift (klein, wird sofort geladen), dazu Stichworte,
// Gegenstücke und welche Gesetze Erläuterungen haben – der Browser fragt nur vorhandene Dateien an.
const katalog = {
  gesetze: [],
  erlaeuterungen: readdirSync("data/erlaeuterungen").filter((d) => d.endsWith(".json")).map((d) => d.slice(0, -5)),
  stichworte: JSON.parse(readFileSync("data/stichworte.json", "utf8")),
  gegenstuecke: {},
};
for (const d of existsSync("data/gegenstuecke") ? readdirSync("data/gegenstuecke").filter((x) => x.endsWith(".json")) : []) {
  const g = JSON.parse(readFileSync(path.join("data/gegenstuecke", d), "utf8"));
  katalog.gegenstuecke[g.gesetz] = g;
}
let dateien = 0;
let groesseWortlaut = 0;
let groesseSuche = 0;
let groesseDetails = 0;
for (const ordner of ["details", "suche"]) mkdirSync(path.join(ZIEL, ordner), { recursive: true });
for (const datei of readdirSync("data/gesetze").filter((d) => d.endsWith(".json")).sort()) {
  const g = JSON.parse(readFileSync(path.join("data/gesetze", datei), "utf8"));
  const { normen, ...kopf } = g;
  const ordner = path.join(ZIEL, "wortlaut", g.id);
  mkdirSync(ordner, { recursive: true });
  const kurz = [];
  const details = {};
  const suche = {};
  for (const n of normen) {
    const { inhalt, text, fussnoten, gliederung, verweise, url, ...meta } = n;
    kurz.push(meta);
    details[n.id] = { gliederung, verweise, url };
    const inhaltJson = JSON.stringify(fussnoten ? { inhalt, fussnoten } : { inhalt });
    writeFileSync(path.join(ordner, `${n.id}.json`), inhaltJson);
    groesseWortlaut += inhaltJson.length;
    dateien++;
    if (!n.weggefallen) suche[n.id] = (text ?? "").toLowerCase();
  }
  const detailsJson = JSON.stringify(details);
  writeFileSync(path.join(ZIEL, "details", `${g.id}.json`), detailsJson);
  groesseDetails += detailsJson.length;
  const sucheJson = JSON.stringify(suche);
  writeFileSync(path.join(ZIEL, "suche", `${g.id}.json`), sucheJson);
  groesseSuche += sucheJson.length;
  katalog.gesetze.push({ ...kopf, normen: kurz });
}
const katalogJson = JSON.stringify(katalog);
writeFileSync(path.join(ZIEL, "katalog.json"), katalogJson);
cpSync("data/erlaeuterungen", path.join(ZIEL, "erlaeuterungen"), { recursive: true, filter: nurJson });
const kb = (n) => `${Math.round(n / 1024)} KB`;
console.log(
  `Daten vorbereitet: katalog.json ${kb(katalogJson.length)} (${katalog.gesetze.length} Regelwerke) · je Gesetz: details ${kb(groesseDetails)}, suche ${kb(groesseSuche)} · ${dateien} Wortlaut-Dateien (${kb(groesseWortlaut)})`,
);

const env = { ...process.env, NEXT_PUBLIC_STATISCH: "1", NEXT_PUBLIC_BASIS: process.env.NEXT_PUBLIC_BASIS ?? "/Bau-Normen-KI" };
console.log(`Baue statische Fassung für ${env.NEXT_PUBLIC_BASIS || "/"} …`);
const r = spawnSync(process.execPath, ["node_modules/next/dist/bin/next", "build"], { stdio: "inherit", env });
if (r.status !== 0) process.exit(r.status ?? 1);

// GitHub Pages soll Ordner mit Unterstrich (_next) unverändert ausliefern.
if (existsSync("out")) writeFileSync("out/.nojekyll", "");
console.log("Fertig: out/ enthält die Online-Version.");
