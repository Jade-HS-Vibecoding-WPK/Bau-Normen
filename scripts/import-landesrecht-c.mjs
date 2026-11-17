// Importiert die Landesbauordnungen und Denkmalschutzgesetze von Bayern, Nordrhein-Westfalen,
// Sachsen, Brandenburg und Bremen aus den amtlichen Landesrechtsportalen und speichert sie
// Vorschrift für Vorschrift als JSON – im selben Schema wie nbauo.json und ndschg.json.
//
// Grundregel: Der Gesetzestext wird NICHT verändert. Wir übernehmen den Wortlaut exakt aus dem
// HTML des Portals und speichern nur zusätzlich seine Struktur (Absätze, Nummern, Buchstaben).
// Einzige Bearbeitung: Leerraum aus dem HTML-Quelltext wird – wie im Browser – zu einem
// Leerzeichen zusammengefasst; geschützte Leerzeichen (U+00A0) bleiben erhalten.
// Was nicht zum Normtext gehört (Fußnotenzeichen, Gliederungsüberschriften, die ein Portal in den
// Text der vorigen Vorschrift setzt, redaktionelle Fußnoten), wird nicht in den Wortlaut übernommen
// – siehe die Kommentare im jeweiligen Adapter.
//
// Ein Importer, ein Adapter je Portal (scripts/lib/landesrecht-c-<portal>.mjs):
//   bayern       BAYERN.RECHT (gesetze-bayern.de)        Gesamtansicht (HTML)     Gegenprüfung: XML (ZIP-Download)
//   nrw          RECHT.NRW.DE (recht.nrw.de, LRGV)       Fassungsseite (HTML)     Gegenprüfung: PDF der Fassung
//   sachsen      REVOSax (revosax.sachsen.de)            Vorschrift (HTML)        Gegenprüfung: PDF der Fassung
//   brandenburg  BRAVORS (bravors.brandenburg.de)        Gesetz (HTML)            Gegenprüfung: GVBl. (Ursprungsfassung,
//                                                                                  Änderungsgesetze) + BRAVORS-Versionsseite
//   bremen       Transparenzportal (transparenz.bremen.de) Gesetz (HTML, juris)   Gegenprüfung: Gesetzblatt (PDF)
// Ergebnis: data/gesetze/<id>.json; Gegenstücke (Themenzuordnung) von Hand geprüft in data/gegenstuecke/<id>.json.
//
// Jeder Adapter liefert: laden(def, quellDir) -> Rohdaten; parsen(def, roh) -> Kopf + Normen
// (jede Norm mit "quelltext" = Text ihres HTML ohne bewusst weggelassene Teile, für die
// Vollständigkeitsprüfung); pruefen(def, gesetz, quellDir) -> Ergebnisse der Gegenprüfung.
//
// Vollständigkeit (immer, ohne Abruf): Jede Vorschrift muss ohne Leerraum Zeichen für Zeichen den
// Text ihres HTML enthalten (prüft die Umwandlung).
// Gegenprüfung (--pruefen): vergleicht den gespeicherten Wortlaut mit einer zweiten, unabhängigen
// Darstellung derselben amtlichen Quelle (alle Zeichen außer Leerraum). Fehlende Prüfdateien werden
// geladen; das Ergebnis steht zusätzlich in data/quellen/landesrecht/<id>/pruefung.txt.
//
// Abrufe: neutraler User-Agent, mindestens 1,2 s Pause je Host, bei BRAVORS 20 s (robots.txt
// „Crawl-delay: 20“). Rohdaten nur lokal unter data/quellen/landesrecht/<id>/ (nicht versioniert).
//
// Aufruf:  node scripts/import-landesrecht-c.mjs                        (lädt alle 10 Gesetze und importiert)
//          node scripts/import-landesrecht-c.mjs --offline              (nutzt die gespeicherten Rohdaten)
//          node scripts/import-landesrecht-c.mjs --offline --pruefen    (dazu die Gegenprüfung)
//          node scripts/import-landesrecht-c.mjs --nur=baybo,baydschg   (nur einzelne Gesetze)

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  PRUEFEN,
  alsText,
  alleZeichen,
  ohneLeerraum,
  istWeggefallen,
  verweiseErkennen,
  schreibeGesetz,
  abrufZahl,
} from "./lib/landesrecht-c-gemeinsam.mjs";

// Bei der Gegenprüfung gefundene Abweichungen des Portaltexts vom Gesetzblatt (Prüfprotokolle in data/quellen/landesrecht/<id>/pruefung.txt).
// Der Wortlaut wird NICHT korrigiert – die Vorschrift bekommt nur diesen Hinweis.
const BREMEN_LBO = "Hinweis der App: Beim Abgleich mit dem Bremischen Gesetzblatt (Brem.GBl. 2024 Nr. 60) weicht der Wortlaut des Transparenzportals Bremen hier ab";
const BREMEN_DSCHG = "Hinweis der App: Beim Abgleich mit dem Bremischen Gesetzblatt (Brem.GBl. 2018 Nr. 101) weicht der Wortlaut des Transparenzportals Bremen hier ab";
const MASSGEBLICH = ". Angezeigt wird unverändert der Portaltext; maßgeblich ist das Gesetzblatt.";
const ABWEICHUNGEN = {
  bremlbo: {
    1: `${BREMEN_LBO}: Absatz 2 Nummer 8 enthält bereits die erst ab 14.01.2027 geltende Fassung (Verordnung (EU) 2023/1230 statt Richtlinie 2006/42/EG)${MASSGEBLICH}`,
    63: `${BREMEN_LBO}: Absatz 1 beginnt im Portal mit „aaa)“ statt „(1)“${MASSGEBLICH}`,
    65: `${BREMEN_LBO} (Anführungszeichen bei „Architekt“)${MASSGEBLICH}`,
    70: `${BREMEN_LBO} (Bindestrich in „benachrichtigten Nachbarinnen“)${MASSGEBLICH}`,
    71: `${BREMEN_LBO} („4 Mai 2016“ ohne Punkt)${MASSGEBLICH}`,
    76: `${BREMEN_LBO} (Bindestrich in „Bauhauptgeschäfte mit“)${MASSGEBLICH}`,
  },
  bremdschg: {
    22: `${BREMEN_DSCHG}: Im Gesetzblatt steht „entgegen § 13 Absatz“, im Portal fehlt das Paragraphenzeichen${MASSGEBLICH}`,
    24: `${BREMEN_DSCHG} (Gedankenstrich in der Fundstelle)${MASSGEBLICH}`,
  },
  bbgbo: {
    38: "Hinweis der App: In Absatz 1 steht im Portal BRAVORS ein Doppelpunkt nach „zu versehen“, den die Ursprungsfassung (GVBl. I/16 Nr. 14) nicht hat; die Neufassung von 2018 lag zum Abgleich nicht vor. Angezeigt wird unverändert der Portaltext.",
  },
};

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const QUELLEN = path.join(ROOT, "data", "quellen", "landesrecht");
const ZIEL = path.join(ROOT, "data", "gesetze");

// Die zehn Gesetze. "artikel": Das Gesetz zählt in Artikeln (Bayern) – bez "Art. 6", id "6".
export const GESETZE = [
  { id: "baybo", kurz: "BayBO", land: "Bayern", typ: "bauordnung", portal: "bayern", dokid: "BayBO", artikel: true },
  { id: "baydschg", kurz: "BayDSchG", land: "Bayern", typ: "denkmalschutz", portal: "bayern", dokid: "BayDSchG", artikel: true },
  { id: "bauo-nrw", kurz: "BauO NRW", land: "Nordrhein-Westfalen", typ: "bauordnung", portal: "nrw", aktuell: "https://recht.nrw.de/lrgv/gesetz/01092026-landesbauordnung-2018-bauo-nrw-2018/" },
  { id: "dschg-nrw", kurz: "DSchG NRW", land: "Nordrhein-Westfalen", typ: "denkmalschutz", portal: "nrw", aktuell: "https://recht.nrw.de/lrgv/gesetz/01092026-denkmalschutzgesetz-dschg-nrw/" },
  { id: "saechsbo", kurz: "SächsBO", land: "Sachsen", typ: "bauordnung", portal: "sachsen", vorschrift: "1779" },
  { id: "saechsdschg", kurz: "SächsDSchG", land: "Sachsen", typ: "denkmalschutz", portal: "sachsen", vorschrift: "5198" },
  { id: "bbgbo", kurz: "BbgBO", land: "Brandenburg", typ: "bauordnung", portal: "brandenburg", pfad: "/gesetze/bbgbo_2016" },
  { id: "bbgdschg", kurz: "BbgDSchG", land: "Brandenburg", typ: "denkmalschutz", portal: "brandenburg", pfad: "/gesetze/bbgdschg" },
  { id: "bremlbo", kurz: "BremLBO", land: "Bremen", typ: "bauordnung", portal: "bremen", seite: "https://www.transparenz.bremen.de/metainformationen/bremische-landesbauordnung-vom-29-mai-2024-232736?asl=bremen203_tpgesetz.c.55340.de&template=20_gp_ifg_meta_detail_d" },
  { id: "bremdschg", kurz: "BremDSchG", land: "Bremen", typ: "denkmalschutz", portal: "bremen", seite: "https://www.transparenz.bremen.de/metainformationen/bremisches-gesetz-zur-pflege-und-zum-schutz-der-kulturdenkmaeler-bremisches-denkmalschutzgesetz-bremdschg-vom-18-dezember-2018-124518?asl=bremen203_tpgesetz.c.55340.de&template=20_gp_ifg_meta_detail_d" },
];

// Vollständigkeit: Inhalt (ohne Leerraum) = Text des HTML der Vorschrift (ohne Leerraum)
function pruefeVollstaendigkeit(normen) {
  for (const n of normen) {
    if (n.quelltext === undefined) throw new Error(`${n.bez}: Adapter liefert keinen Quelltext für die Vollständigkeitsprüfung`);
    const soll = ohneLeerraum(n.quelltext);
    const ist = ohneLeerraum(alleZeichen(n.inhalt));
    if (soll !== ist) {
      let ab = 0;
      while (soll[ab] === ist[ab]) ab++;
      throw new Error(`${n.bez}: Inhalt weicht vom HTML ab ab Zeichen ${ab}: HTML „${soll.slice(ab, ab + 40)}“ / Inhalt „${ist.slice(ab, ab + 40)}“`);
    }
  }
}

async function importiere(def) {
  const adapter = await import(`./lib/landesrecht-c-${def.portal}.mjs`);
  const quellDir = path.join(QUELLEN, def.id);
  fs.mkdirSync(quellDir, { recursive: true });
  const roh = await adapter.laden(def, quellDir);
  const { kopf, normen } = adapter.parsen(def, roh);

  const ids = new Set();
  for (const n of normen) {
    if (ids.has(n.id)) throw new Error(`${def.kurz}: doppelte Bezeichnung ${n.bez}`);
    ids.add(n.id);
    n.text = alsText(n.inhalt);
    n.weggefallen = n.weggefallen ?? istWeggefallen(n.titel, n.text);
  }
  pruefeVollstaendigkeit(normen);
  verweiseErkennen(normen, { kuerzel: def.kurz, artikel: !!def.artikel });

  const gesetz = {
    id: def.id,
    kurz: def.kurz,
    titel: kopf.titel,
    ebene: def.land,
    land: def.land,
    typ: def.typ,
    stand: kopf.stand,
    gueltigAb: kopf.gueltigAb || undefined,
    ausfertigung: kopf.ausfertigung || undefined,
    schlussformel: kopf.schlussformel || undefined,
    quelle: { name: kopf.quelle.name, url: kopf.quelle.url, fassung: kopf.quelle.fassung, abgerufen: roh.abgerufen },
    normen: normen.map((n) => ({
      id: n.id,
      bez: n.bez,
      titel: n.titel,
      gliederung: n.gliederung,
      weggefallen: n.weggefallen,
      inhalt: n.inhalt,
      text: n.text,
      // geprüfte Abweichungen zum Gesetzblatt: Portaltext bleibt unverändert, die App sagt es offen dazu
      fussnoten: [n.fussnoten, ABWEICHUNGEN[def.id]?.[n.id]].filter(Boolean).join("\n") || undefined,
      url: n.url,
      verweise: n.verweise,
    })),
  };
  schreibeGesetz(path.join(ZIEL, `${def.id}.json`), gesetz);

  const weg = gesetz.normen.filter((n) => n.weggefallen).length;
  const anlagen = gesetz.normen.filter((n) => !/^(§|Art\.)/.test(n.bez));
  console.log(
    `${def.kurz}: ${gesetz.normen.length - anlagen.length} Vorschriften (${weg} weggefallen) + ${anlagen.length} Anlagen/Anhänge – ${gesetz.stand}` +
      (gesetz.gueltigAb ? `, gültig ab ${gesetz.gueltigAb}` : ""),
  );
  console.log(`  Vollständigkeit: alle Einträge enthalten Zeichen für Zeichen den Text ihres HTML (ohne Leerraum).`);

  if (PRUEFEN) {
    const ergebnisse = await adapter.pruefen(def, gesetz, quellDir);
    const zeilen = [`Gegenprüfung ${def.kurz} (${new Date().toISOString().slice(0, 10)}): ${ergebnisse.methode}`];
    for (const e of ergebnisse.liste) zeilen.push(`  ${e.bez.padEnd(12)} ${String(e.zeichen ?? "").padStart(6)} Zeichen  ${e.befund}`);
    const ok = ergebnisse.liste.filter((e) => e.gleich).length;
    zeilen.push(`  ${ok}/${ergebnisse.liste.length} geprüfte Einträge Zeichen für Zeichen gleich` + (ergebnisse.hinweis ? ` – ${ergebnisse.hinweis}` : ""));
    console.log(zeilen.join("\n"));
    fs.writeFileSync(path.join(quellDir, "pruefung.txt"), zeilen.join("\n") + "\n");
    if (ok !== ergebnisse.liste.length) process.exitCode = 1;
  }
  return gesetz;
}

async function main() {
  const nur = process.argv.find((a) => a.startsWith("--nur="))?.slice(6).split(",");
  const auswahl = nur ? GESETZE.filter((g) => nur.includes(g.id)) : GESETZE;
  if (nur && auswahl.length !== nur.length) throw new Error(`Unbekannte Gesetz-ID in --nur: ${nur.join(",")}`);
  for (const def of auswahl) {
    try {
      await importiere(def);
    } catch (e) {
      console.error(`FEHLER bei ${def.kurz}:`, e);
      process.exitCode = 1;
    }
  }
  console.log(`Abrufe insgesamt: ${abrufZahl}`);
}

main();
