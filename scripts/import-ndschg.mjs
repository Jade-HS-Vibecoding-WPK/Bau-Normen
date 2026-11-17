// Importiert das Niedersächsische Denkmalschutzgesetz (NDSchG) aus NI-VORIS,
// dem Niedersächsischen Vorschrifteninformationssystem (voris.wolterskluwer-online.de),
// und speichert es Paragraph für Paragraph als JSON – im selben Schema wie baugb.json.
//
// Grundregel: Der Gesetzestext wird NICHT verändert. Wir übernehmen den Wortlaut
// exakt aus dem HTML von NI-VORIS und speichern nur zusätzlich seine Struktur
// (Absätze, Nummern, Buchstaben). Einzige Bearbeitung: Leerraum aus dem HTML-Quelltext
// (Zeilenumbrüche/Einrückungen, doppelte Leerzeichen) wird – wie im Browser – zu einem
// Leerzeichen zusammengefasst. Geschützte Leerzeichen (U+00A0) bleiben wie in der Quelle
// erhalten (wie beim BauGB). Nicht in den Normtext übernommen werden: Fußnotenzeichen,
// die Schlussformel hinter § 41 (separat in "schlussformel") und redaktionelle Hinweise
// von NI-VORIS (als {t:"hinweis"} markiert, z. B. § 38).
//
// So kommt der Text zustande (wie im Browser bei „Gesamte Quelle anzeigen“):
//   1. Stammdokument des Gesetzes laden  -> Stand, gültige Fassung, Link „Gesamte Quelle anzeigen“
//   2. Seite „Gesamte Quelle anzeigen“   -> enthält die ersten Paragraphen direkt …
//   3. … die übrigen lädt die Seite per Drupal-AJAX nach (POST /browse/source/ajax/<id>).
//      Diese Endpunkte rufen wir nacheinander mit kleinen Pausen ab.
// Abruf und HTML-Umwandlung stehen in scripts/lib/voris.mjs (gemeinsam mit import-nbauo.mjs).
//
// Rohdaten landen unter data/quellen/ndschg/ (dokument.html, quelle.html, nachgeladen.json).
//
// Aufruf:  npm run import:ndschg             (lädt die aktuelle Fassung herunter, ca. 50 Abrufe, ~1 Minute)
//          npm run import:ndschg -- --offline (nutzt die bereits gespeicherten Rohdaten)

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { extrahiereVerweise } from "./lib/verweise.mjs";
import {
  BASIS,
  ladeQuelle,
  zusammensetzen,
  aktuelleFassung,
  stuecke,
  gliederungAusUeberschrift,
  normInhalt,
  alsText,
  fussnotenText,
  schlussformel,
  kopfDaten,
  fuerVerweise,
} from "./lib/voris.mjs";

export { alsText };

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const QUELL_DIR = path.join(ROOT, "data", "quellen", "ndschg");
const ZIEL = path.join(ROOT, "data", "gesetze", "ndschg.json");

// Stammdokument „DSchG,NI - Denkmalschutzgesetz“ in NI-VORIS (zeigt immer die aktuelle Fassung)
const DOKUMENT_URL = BASIS + "/browse/document/b053748c-c363-37c6-b26f-3d52606c6272";

// ---------- Hauptprogramm ----------

async function main() {
  const { dokument, quelle, nachgeladen, abgerufen } = await ladeQuelle(QUELL_DIR, DOKUMENT_URL);
  const html = zusammensetzen(quelle, nachgeladen);

  // Gültige Fassung laut Versionsverlauf, z. B. „ab 20.12.2023 (aktuelle Fassung)“
  const { fassung, gueltigAb } = aktuelleFassung(dokument);

  let gliederung = [];
  let kopf = null;
  let schluss = "";
  const normen = [];
  for (const s of stuecke(html)) {
    if (s.ueberschrift !== undefined) {
      // z. B. „§§ 1 - 5, Erster Teil - Allgemeine Vorschriften“
      gliederung = [gliederungAusUeberschrift(s.ueberschrift)];
      continue;
    }
    const { id, titelZeile, body } = s;
    const m = titelZeile.match(/^§\s*(\d+[a-z]?)\s+DSchG(?:\s+-\s+(.*))?$/);
    if (!m) {
      if (kopf) throw new Error(`Unerwartetes Dokument: ${titelZeile}`);
      kopf = { titel: titelZeile, body };
      continue;
    }
    const inhalt = normInhalt(body);
    const klartext = alsText(inhalt);
    const titel = (m[2] ?? "").trim();
    const fussnoten = fussnotenText(body);
    schluss = schlussformel(body) || schluss;
    normen.push({
      id: m[1],
      bez: `§ ${m[1]}`,
      titel,
      gliederung: [...gliederung],
      weggefallen: /^\(?(weggefallen|aufgehoben)\)?$/i.test(titel) || /^[-–]*\s*\(?(weggefallen|aufgehoben)\)?\s*[-–]*$/i.test(klartext),
      inhalt,
      text: klartext,
      fussnoten: fussnoten || undefined,
      url: `${BASIS}/browse/document/${id}`,
    });
  }
  if (!kopf) throw new Error("Stammdokument (Kopf des Gesetzes) nicht gefunden.");

  // Kopfdaten aus dem Stammdokument: Ausfertigung, letzte Änderung (Red. Anmerkung bleibt draußen)
  const { ausfertigung, stand } = kopfDaten(kopf.body);

  // Verweise innerhalb des Gesetzes erkennen (nur auf existierende Paragraphen)
  const vorhanden = new Set(normen.map((n) => n.id));
  const reihenfolge = normen.map((n) => n.id);
  for (const n of normen) {
    n.verweise = extrahiereVerweise(fuerVerweise(n.text), vorhanden, reihenfolge, "NDSchG").filter((v) => v !== n.id);
  }

  const gesetz = {
    id: "ndschg",
    kurz: "NDSchG",
    titel: kopf.titel,
    ebene: "Niedersachsen",
    stand,
    gueltigAb,
    ausfertigung,
    schlussformel: schluss || undefined,
    quelle: {
      name: "Niedersächsisches Vorschrifteninformationssystem (NI-VORIS) – voris.wolterskluwer-online.de",
      url: DOKUMENT_URL,
      fassung,
      abgerufen,
    },
    normen,
  };

  fs.mkdirSync(path.dirname(ZIEL), { recursive: true });
  fs.writeFileSync(ZIEL, JSON.stringify(gesetz, null, 1));
  const aktiv = normen.filter((n) => !n.weggefallen).length;
  console.log(`NDSchG importiert: ${normen.length} Einträge (${aktiv} in Kraft), ${gesetz.stand}, Fassung ${fassung}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
