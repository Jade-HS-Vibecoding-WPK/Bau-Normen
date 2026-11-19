// Schreibt public/lizenzen-dritter.txt: Lizenztexte der Programmbibliotheken und Schriften, die ParaGecko enthält.
// Die Datei wird mit der Online-Version ausgeliefert (…/ParaGecko/lizenzen-dritter.txt) und ist in der App verlinkt.
// MIT, Apache 2.0 und die SIL Open Font License verlangen, dass Lizenz und Copyright-Vermerk mitgegeben werden.
// Aufruf: node scripts/lizenzen-dritter.mjs   (läuft auch automatisch in npm run build:pages)
import { execSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const ZIEL = "public/lizenzen-dritter.txt";
const SCHRIFTEN = [
  { name: "Fraunces", datei: "fraunces.txt", quelle: "https://fonts.google.com/specimen/Fraunces" },
  { name: "Figtree", datei: "figtree.txt", quelle: "https://fonts.google.com/specimen/Figtree" },
  { name: "DM Mono", datei: "dmmono.txt", quelle: "https://fonts.google.com/specimen/DM+Mono" },
  { name: "Source Serif 4", datei: "sourceserif4.txt", quelle: "https://fonts.google.com/specimen/Source+Serif+4" },
];

// Alle installierten Produktionsabhängigkeiten (ohne Entwicklungswerkzeuge). Plattformpakete mit "os"/"cpu"
// (vorkompilierte Programme für Windows, Linux usw.) werden nicht ausgeliefert und bleiben weg, damit die Datei
// auf jedem Rechner gleich aussieht.
// npm ls endet mit Fehlercode, wenn es etwas zu bemängeln hat (z. B. fehlende optionale Pakete); die Liste steht trotzdem in der Ausgabe.
let ausgabe;
try {
  ausgabe = execSync("npm ls --omit=dev --all --json", { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] });
} catch (e) {
  ausgabe = e.stdout;
}
const baum = JSON.parse(ausgabe);
const pakete = new Map();
(function gehe(knoten) {
  for (const [name, info] of Object.entries(knoten.dependencies ?? {})) {
    // npm ls führt ein Paket oft mehrfach auf, nur ein Eintrag enthält die Unterabhängigkeiten: immer weitergehen
    gehe(info);
    const ordner = path.join("node_modules", name);
    if (!info.version || pakete.has(name) || !existsSync(path.join(ordner, "package.json"))) continue;
    const pj = JSON.parse(readFileSync(path.join(ordner, "package.json"), "utf8"));
    if (pj.os || pj.cpu) continue;
    const lizenzDatei = readdirSync(ordner).find((d) => /^(licen[cs]e|copying)(\.(md|txt))?$/i.test(d));
    pakete.set(name, {
      version: pj.version,
      lizenz: pj.license ?? (pj.licenses ?? []).map((l) => l.type).join(", ") ?? "?",
      quelle: (typeof pj.repository === "string" ? pj.repository : pj.repository?.url)?.replace(/^git\+/, "").replace(/\.git$/, "") ?? pj.homepage ?? "",
      text: lizenzDatei ? readFileSync(path.join(ordner, lizenzDatei), "utf8").trim() : null,
    });
  }
})(baum);

const linie = "=".repeat(78);
const teile = [
  "ParaGecko: Lizenzen Dritter",
  "",
  "ParaGecko selbst ist nicht Open Source (siehe LICENSE im Repository). Die Anwendung enthält aber",
  "Programmbibliotheken und Schriften anderer Urheber. Sie stehen unter ihren eigenen Lizenzen, deren",
  "Texte unten vollständig wiedergegeben sind.",
  "",
  "Daten, die die App anzeigt, sind nicht Teil dieser Datei: Gesetzestexte sind amtliche Werke (§ 5 UrhG),",
  "Adresssuche und Hintergrundkarte stammen von OpenStreetMap (© OpenStreetMap-Mitwirkende, ODbL,",
  "https://www.openstreetmap.org/copyright), und jede Ortsauskunft nennt die Geodienste mit ihrer Lizenz.",
  "Übersicht im README, Abschnitt „Datenquellen und Rechtliches“.",
  "",
  "Übersicht",
  "",
  ...[...pakete].sort(([a], [b]) => a.localeCompare(b)).map(([n, p]) => `  ${n} ${p.version} (${p.lizenz})`),
  ...SCHRIFTEN.map((s) => `  Schrift ${s.name} (SIL Open Font License 1.1)`),
];
for (const [name, p] of [...pakete].sort(([a], [b]) => a.localeCompare(b))) {
  teile.push("", linie, `${name} ${p.version}`, `Lizenz: ${p.lizenz}`, ...(p.quelle ? [`Quelle: ${p.quelle}`] : []), linie, "", p.text ?? `(Das Paket enthält keine Lizenzdatei; Lizenz laut package.json: ${p.lizenz}.)`);
}
for (const s of SCHRIFTEN) {
  const text = readFileSync(path.join("data/lizenzen/schriften", s.datei), "utf8").trim();
  teile.push("", linie, `Schrift: ${s.name}`, "Lizenz: SIL Open Font License 1.1", `Quelle: ${s.quelle}`, "Beim Bauen über next/font eingebunden und mit der Seite ausgeliefert.", linie, "", text);
}
writeFileSync(ZIEL, teile.join("\n") + "\n");
console.log(`${ZIEL}: ${pakete.size} Bibliotheken, ${SCHRIFTEN.length} Schriften`);
