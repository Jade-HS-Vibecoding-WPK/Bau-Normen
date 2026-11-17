// Prüft die Gegenstücke der Landesgesetze (data/gegenstuecke/*.json) gegen den importierten Wortlaut.
//
//   node scripts/gegenstuecke-pruefen.mjs
//
// Die Ortsauskunft zitiert den Beleg zu "schutzOhneEintragung" wörtlich – deshalb muss der Satz Zeichen für Zeichen
// (nur Leerraum vereinheitlicht) in der genannten Vorschrift stehen. Geprüft wird außerdem:
//  - das Gesetz ist importiert,
//  - jede Vorschrift eines Themas gibt es und sie ist nicht weggefallen,
//  - nur bekannte Themen (siehe data/gegenstuecke/THEMEN.md),
//  - schutzOhneEintragung true/false nur mit Beleg.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DIR = path.join(ROOT, "data", "gegenstuecke");

const THEMEN_BAUORDNUNG = [
  "begriffe", "abstandsflaechen", "nicht-ueberbaute-flaechen", "werbeanlagen", "brandwaende", "rettungswege", "stellplaetze",
  "barrierefrei", "sonderbauten", "bauherr", "entwurfsverfasser", "bauvorlageberechtigung", "genehmigungspflicht", "verfahrensfrei",
  "genehmigungsfreistellung", "vereinfachtes-verfahren", "baugenehmigungsverfahren", "abweichungen", "bauantrag", "baugenehmigung",
  "vorbescheid", "baulasten", "oertliche-bauvorschriften",
];
const THEMEN_DENKMAL = ["begriffe", "eintragung", "erhaltungspflicht", "genehmigungspflicht", "umgebungsschutz", "erdarbeiten", "bodenfunde", "behoerden"];

/** Wortlaut einer Vorschrift als ein Text (alle Zeichenketten der Textknoten) */
function wortlaut(knoten) {
  if (typeof knoten === "string") return knoten;
  if (Array.isArray(knoten)) return knoten.map(wortlaut).join(" ");
  if (knoten && typeof knoten === "object") return Object.entries(knoten).filter(([k]) => k !== "t").map(([, v]) => wortlaut(v)).join(" ");
  return "";
}
const leerraum = (s) => s.replace(/[\s  ]+/g, " ").trim();

let fehler = 0;
let warnungen = 0;
const melde = (art, datei, text) => {
  if (art === "FEHLER") fehler++;
  else warnungen++;
  console.log(`${art.padEnd(7)} ${datei}: ${text}`);
};

const dateien = fs.readdirSync(DIR).filter((f) => f.endsWith(".json"));
for (const datei of dateien) {
  const gs = JSON.parse(fs.readFileSync(path.join(DIR, datei), "utf8"));
  const gesetzDatei = path.join(ROOT, "data", "gesetze", `${gs.gesetz}.json`);
  if (`${gs.gesetz}.json` !== datei) melde("FEHLER", datei, `Dateiname passt nicht zu "gesetz": ${gs.gesetz}`);
  if (!fs.existsSync(gesetzDatei)) {
    melde("FEHLER", datei, `Gesetz ${gs.gesetz} ist nicht importiert`);
    continue;
  }
  const g = JSON.parse(fs.readFileSync(gesetzDatei, "utf8"));
  const normen = new Map(g.normen.map((n) => [n.id, n]));
  const denkmal = "schutzOhneEintragung" in gs;
  const bekannt = denkmal ? THEMEN_DENKMAL : THEMEN_BAUORDNUNG;

  for (const [thema, ids] of Object.entries(gs.themen ?? {})) {
    if (!bekannt.includes(thema)) melde("WARNUNG", datei, `unbekanntes Thema "${thema}"`);
    if (!Array.isArray(ids) || !ids.length) melde("FEHLER", datei, `Thema "${thema}" ohne Vorschriften (fehlende Themen weglassen)`);
    for (const id of ids ?? []) {
      const n = normen.get(id);
      if (!n) melde("FEHLER", datei, `${thema}: Vorschrift "${id}" gibt es in ${g.kurz} nicht`);
      else if (n.weggefallen) melde("FEHLER", datei, `${thema}: ${n.bez} ${g.kurz} ist weggefallen`);
    }
  }

  if (denkmal) {
    const soe = gs.schutzOhneEintragung;
    const beleg = gs.belege?.schutzOhneEintragung;
    if (soe !== null && !beleg) melde("FEHLER", datei, `schutzOhneEintragung = ${soe} ohne Beleg`);
    if (beleg) {
      const n = normen.get(beleg.norm);
      if (!n) melde("FEHLER", datei, `Beleg: Vorschrift "${beleg.norm}" gibt es nicht`);
      else if (!leerraum(wortlaut(n.inhalt ?? [])).includes(leerraum(beleg.satz)))
        melde("FEHLER", datei, `Beleg steht nicht wörtlich in ${n.bez} ${g.kurz}: „${beleg.satz.slice(0, 80)}…“`);
    }
  }
}

console.log(`\n${dateien.length} Gegenstück-Dateien geprüft: ${fehler} Fehler, ${warnungen} Warnungen`);
process.exit(fehler ? 1 : 0);
