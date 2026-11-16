// Prüft die fest gespeicherten Erläuterungen und führt neue Teil-Dateien zusammen.
//
//   node scripts/erlaeuterungen-pruefen.mjs              -> nur prüfen
//   node scripts/erlaeuterungen-pruefen.mjs --uebernehmen -> data/erlaeuterungen/_teile/*.json übernehmen
//                                                             (bestehende Einträge bleiben, außer --ueberschreiben)
//
// Geprüft wird je Erläuterung:
//  - Paragraph existiert im Gesetz und ist nicht weggefallen
//  - Pflichtfelder vorhanden (kurz, punkte[titel,text], status)
//  - Alle in der Erläuterung genannten Paragraphen ("§ 31", "§§ 14 und 15") kommen auch im Originaltext vor
//    oder sind der Paragraph selbst  -> sonst Warnung (mögliche Erfindung)
//  - Erwähnte Absätze ("Abs. 4") gibt es im Originaltext
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DIR = path.join(ROOT, "data", "erlaeuterungen");
const TEILE = path.join(DIR, "_teile");
const UEBERNEHMEN = process.argv.includes("--uebernehmen");
const UEBERSCHREIBEN = process.argv.includes("--ueberschreiben");

const gesetze = Object.fromEntries(
  fs
    .readdirSync(path.join(ROOT, "data", "gesetze"))
    .filter((f) => f.endsWith(".json"))
    .map((f) => {
      const g = JSON.parse(fs.readFileSync(path.join(ROOT, "data", "gesetze", f), "utf8"));
      return [g.id, g];
    }),
);

const lesen = (datei) => (fs.existsSync(datei) ? JSON.parse(fs.readFileSync(datei, "utf8")) : {});

// 1) Teil-Dateien übernehmen
if (UEBERNEHMEN && fs.existsSync(TEILE)) {
  for (const datei of fs.readdirSync(TEILE).filter((f) => f.endsWith(".json")).sort()) {
    const gesetzId = datei.split("-")[0];
    const ziel = path.join(DIR, `${gesetzId}.json`);
    const bestand = lesen(ziel);
    const neu = JSON.parse(fs.readFileSync(path.join(TEILE, datei), "utf8"));
    let n = 0;
    for (const [id, e] of Object.entries(neu)) {
      if (bestand[id] && !UEBERSCHREIBEN) continue;
      bestand[id] = e;
      n++;
    }
    const reihenfolge = gesetze[gesetzId].normen.map((x) => x.id);
    const sortiert = Object.fromEntries(Object.entries(bestand).sort(([a], [b]) => reihenfolge.indexOf(a) - reihenfolge.indexOf(b)));
    fs.writeFileSync(ziel, JSON.stringify(sortiert, null, 2) + "\n");
    console.log(`übernommen: ${datei} -> ${gesetzId}.json (${n} neu)`);
  }
}

// 2) Prüfen
const paragraphenIn = (t) => {
  const ids = new Set();
  for (const m of t.matchAll(/§§?\s*((?:\d+[a-z]?(?:\s*(?:,|und|bis|oder|sowie)\s*)?)+)/g)) {
    for (const nr of m[1].matchAll(/\d+[a-z]?/g)) ids.add(nr[0]);
  }
  return ids;
};

let fehler = 0;
let warnungen = 0;
let gesamt = 0;
for (const datei of fs.readdirSync(DIR).filter((f) => f.endsWith(".json"))) {
  const gesetzId = datei.replace(".json", "");
  const g = gesetze[gesetzId];
  if (!g) continue;
  const erl = lesen(path.join(DIR, datei));
  const aktiv = g.normen.filter((n) => !n.weggefallen);
  const abgedeckt = aktiv.filter((n) => erl[n.id]).length;
  console.log(`\n${g.kurz}: ${Object.keys(erl).length} Erläuterungen, ${abgedeckt}/${aktiv.length} Vorschriften abgedeckt`);
  for (const [id, e] of Object.entries(erl)) {
    gesamt++;
    const norm = g.normen.find((n) => n.id === id);
    const ort = `${g.kurz} § ${id}`;
    if (!norm) { console.log(`  FEHLER ${ort}: Paragraph existiert nicht`); fehler++; continue; }
    if (norm.weggefallen) { console.log(`  FEHLER ${ort}: Paragraph ist weggefallen`); fehler++; }
    if (!e.kurz || !Array.isArray(e.punkte) || !e.punkte.length || e.punkte.some((p) => !p.titel || !p.text) || !["entwurf", "geprueft"].includes(e.status)) {
      console.log(`  FEHLER ${ort}: Pflichtfelder fehlen oder sind leer`);
      fehler++;
      continue;
    }
    const erlText = [e.kurz, ...e.punkte.flatMap((p) => [p.titel, p.text]), e.praxis ?? ""].join(" ").replace(/ /g, " ");
    const original = norm.text.replace(/ /g, " ");
    // Paragraphen, die in der Erläuterung vorkommen, aber nicht im Originaltext
    const fremd = [...paragraphenIn(erlText)].filter((nr) => nr !== id && !paragraphenIn(original).has(nr));
    // Nur Verweise auf DASSELBE Gesetz prüfen: "§ 1 NBauO" o. ä. ignorieren
    const fremdEigen = fremd.filter((nr) => !new RegExp(`§§?[^.;]*\\b${nr}\\b\\s*(NBauO|BauNVO|BGB|VwVfG|UVPG|ROG|BNatSchG|BImSchG|GG)`).test(erlText));
    if (fremdEigen.length) { console.log(`  WARNUNG ${ort}: nennt §§ ${fremdEigen.join(", ")}, die im Originaltext nicht vorkommen`); warnungen++; }
    // Absätze, die es nicht gibt
    const absaetze = new Set([...original.matchAll(/^\((\d+[a-z]?)\)/gm)].map((m) => m[1]));
    if (absaetze.size) {
      // Absätze anderer Paragraphen ("§ 8 Abs. 2 Satz 2, Abs. 3 … und Abs. 4") zählen nicht:
      // steht kurz davor (ohne Satzende) ein "§ <Nummer>", gehört die Angabe zu diesem Paragraphen.
      const genannt = [...erlText.matchAll(/Abs\.\s*(\d+[a-z]?)(?:\s*(?:bis|und|–|-)\s*(\d+[a-z]?))?/g)]
        .filter((m) => !/§\s*\d+[a-z]?[^.:;–]{0,60}$/.test(erlText.slice(Math.max(0, m.index - 70), m.index).replace(/(Abs|Nr|Buchst)\./g, "$1")))
        .flatMap((m) => [m[1], m[2]])
        .filter(Boolean);
      const unbekannt = [...new Set(genannt)].filter((a) => !absaetze.has(a));
      if (unbekannt.length) {
        console.log(`  WARNUNG ${ort}: nennt Abs. ${unbekannt.join(", ")}, den es im Paragraphen nicht gibt`);
        warnungen++;
      }
    }
  }
}
console.log(`\n${gesamt} Erläuterungen geprüft: ${fehler} Fehler, ${warnungen} Warnungen`);
process.exit(fehler ? 1 : 0);
