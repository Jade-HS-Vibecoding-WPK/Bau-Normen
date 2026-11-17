// Importiert die Niedersächsische Bauordnung (NBauO) aus NI-VORIS, dem Niedersächsischen
// Vorschrifteninformationssystem (voris.wolterskluwer-online.de), und speichert sie Paragraph für
// Paragraph als JSON – im selben Schema wie ndschg.json und baugb.json.
//
// Grundregel: Der Gesetzestext wird NICHT verändert. Wir übernehmen den Wortlaut exakt aus dem
// HTML von NI-VORIS und speichern nur zusätzlich seine Struktur (Absätze, Nummern, Buchstaben).
// Einzige Bearbeitung: Leerraum aus dem HTML-Quelltext (Zeilenumbrüche/Einrückungen, doppelte
// Leerzeichen) wird – wie im Browser – zu einem Leerzeichen zusammengefasst. Geschützte
// Leerzeichen (U+00A0) bleiben wie in der Quelle erhalten.
//
// Abruf und HTML-Umwandlung wie beim NDSchG (gemeinsamer Code in scripts/lib/voris.mjs):
//   1. Stammdokument „NBauO,NI - Niedersächsische Bauordnung“ -> Stand, gültige Fassung
//   2. Seite „Gesamte Quelle anzeigen“ + per Drupal-AJAX nachgeladene Teile (je Dokument ein Abruf,
//      gut 100 Abrufe mit je 1,2 s Pause, ~2,5 Minuten)
//
// Besonderheiten der NBauO gegenüber dem NDSchG:
//   - Satznummern: NI-VORIS zeigt die Sätze eines Absatzes hochgestellt nummeriert
//     (<sup class="satz">1</sup>). Sie bleiben im Inhalt als {t:"sup"} erhalten – wie bei der MBO.
//     Im reinen Text (Feld "text") fehlen sie, sonst klebten sie am Wort („1Bauliche“); dort
//     trennt die weggelassene Nummer wie ein Leerzeichen (einmal fehlt in der Quelle das
//     Leerzeichen davor: § 52 Abs. 1 „bereitzuhalten.⁶Die“, einmal steht eins dahinter: § 3a).
//     Die Satznummern jedes Absatzes laufen 1, 2, 3, … (geprüft).
//   - Hochgestellte Exponenten von Maßeinheiten („m<sup>2</sup>“) bleiben im Inhalt {t:"sup"}
//     und erscheinen im Feld "text" als „m²“/„m³“. Andere Hochstellungen gibt es nicht (geprüft).
//   - Der Anhang (Verfahrensfreie Baumaßnahmen, zu § 60 Abs. 1) steht in NI-VORIS nicht in
//     Absatz-Containern, sondern als Folge: „(zu § 60 Abs. 1)“, Übersichtstabelle, dann je Gruppe
//     eine Überschrift „<b>1.</b><br><b>Gebäude</b>“ und die Liste 1.1, 1.2, … (mit a), aa) …).
//     Wir speichern die Gruppen als verschachtelte Liste ({t:"dl"}, Marke „1.“, darin die
//     Gruppenüberschrift fett und die Unterliste) – der Wortlaut bleibt Zeichen für Zeichen gleich.
//   - Nicht in den Normtext übernommen: Fußnotenzeichen, die redaktionelle Anmerkung von NI-VORIS
//     zur Inhaltsübersicht im Stammdokument und die Schlussformel hinter § 88 (separat in
//     "schlussformel"). Lose <p> in einem Paragraphen wären redaktionelle Hinweise ({t:"hinweis"}).
//
// Vollständigkeit (immer, ohne Abruf): Jeder Eintrag muss ohne Leerraum Zeichen für Zeichen den
// Text seines HTML-Dokuments enthalten (prüft die Umwandlung).
//
// Gegenprüfung (--pruefen): vergleicht für eine Stichprobe von Paragraphen und den Anhang den
// gespeicherten Wortlaut mit der Druckansicht des Einzeldokuments in NI-VORIS
// (/browse/document/<id>/print/doc) – unabhängig vom Weg über „Gesamte Quelle“. Verglichen werden
// alle Zeichen außer Leerraum. Die Druckseiten liegen unter data/quellen/nbauo/pruefung/.
//
// NI-VORIS behält sich Text- und Data-Mining vor (§ 44b Abs. 3 UrhG): Rohdaten nur lokal unter
// data/quellen/nbauo/ (nicht versioniert), wenige Abrufe mit Pausen, neutraler User-Agent.
//
// Aufruf:  npm run import:nbauo                         (lädt die aktuelle Fassung herunter und importiert)
//          npm run import:nbauo -- --offline            (nutzt die bereits gespeicherten Rohdaten)
//          npm run import:nbauo -- --offline --pruefen  (importiert und prüft gegen die Druckansichten;
//                                                        fehlende Druckseiten werden geladen)

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { extrahiereVerweise } from "./lib/verweise.mjs";
import {
  BASIS,
  PAUSE_MS,
  pause,
  holeText,
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
  SATZNUMMERN,
  parseFragment,
  finde,
  hatKlasse,
  elemente,
  kinder,
  tag,
  klassen,
  leer,
  inline,
  liste,
  tabelle,
  aufraeumen,
  trimmen,
  text,
} from "./lib/voris.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const QUELL_DIR = path.join(ROOT, "data", "quellen", "nbauo");
const PRUEF_DIR = path.join(QUELL_DIR, "pruefung");
const ZIEL = path.join(ROOT, "data", "gesetze", "nbauo.json");

// Stammdokument „NBauO,NI - Niedersächsische Bauordnung“ in NI-VORIS (zeigt immer die aktuelle Fassung)
const DOKUMENT_URL = BASIS + "/browse/document/919d9cd8-c18b-3a6e-a487-6caca4e62097";
const TITEL = "Niedersächsische Bauordnung";

// Stichprobe für die Gegenprüfung (je ein Abruf der Druckansicht)
const STICHPROBE = ["2", "5", "9", "33", "47", "60", "61", "62", "63", "64", "67", "70", "84", "88", "anhang"];

// ---------- Anhang ----------

// Anhang: Folge aus losen <p>, Übersichtstabelle und Gruppen (Überschrift-<p> + <ol>).
// Gruppenüberschrift: <p><strong>1.</strong><br /><strong>Gebäude</strong></p>
function anhangInhalt(body) {
  const inhalt = [];
  let gruppen = null; // {t:"dl"} mit den Gruppen 1. bis 14.
  const els = elemente(body);
  for (let i = 0; i < els.length; i++) {
    const k = els[i];
    const name = tag(k);
    if (name === "p" && leer(k)) continue;
    if (name === "p" && tag(els[i + 1] ?? {}) === "ol") {
      const kopfzeile = trimmen(aufraeumen(kinder(k).flatMap(inline)));
      const [nummer, umbruch, ...ueberschrift] = kopfzeile;
      const dt = nummer?.t === "b" && nummer.c.length === 1 && typeof nummer.c[0] === "string" ? nummer.c[0].trim() : null;
      if (!dt || !/^\d+\.$/.test(dt) || umbruch?.t !== "br" || !ueberschrift.length)
        throw new Error(`Unbekannte Gruppenüberschrift im Anhang: ${text(k)}`);
      if (!gruppen) inhalt.push({ t: "p", c: [(gruppen = { t: "dl", items: [] })] });
      gruppen.items.push({ dt, c: trimmen(aufraeumen([...ueberschrift, liste(els[++i])])) });
    } else if (gruppen) {
      throw new Error(`Unerwartetes Element nach den Gruppen des Anhangs: <${name}> ${text(k).slice(0, 80)}`);
    } else if (name === "p") {
      inhalt.push({ t: "p", c: trimmen(aufraeumen(kinder(k).flatMap(inline))) });
    } else if (name === "table") {
      inhalt.push({ t: "p", c: [tabelle(k)] });
    } else throw new Error(`Unbekanntes Element im Anhang: <${name} class="${klassen(k).join(" ")}">`);
  }
  return inhalt;
}

// ---------- Prüfungen ----------

// Hochgestelltes: nur Satznummern (class="satz") und Exponenten „m²“/„m³“ erwartet.
// Satznummern eines Absatzes sollen 1, 2, 3, … lauten (nur Protokoll, kein Abbruch).
function pruefeHochgestelltes(normen) {
  const zahl = { satz: 0, einheit: 0 };
  const satzfolgen = [];
  const ohneLeerzeichen = []; // Satznummer direkt hinter dem Satzende („bereitzuhalten.⁶Die“)
  for (const n of normen) {
    n.inhalt.forEach((absatz, i) => {
      const nummern = [];
      const pruefe = (nodes) => {
        nodes.forEach((k, j) => {
          if (typeof k === "string") return;
          if (k.t === "sup") {
            const wert = k.c.join("");
            if (SATZNUMMERN.has(k)) {
              zahl.satz++;
              const vor = nodes[j - 1];
              if (typeof vor === "string" && !/\s$/.test(vor)) ohneLeerzeichen.push(`${n.bez} „…${vor.slice(-25)}“ + ${wert}`);
              nummern.push(Number(wert));
              if (!/^\d+$/.test(wert)) throw new Error(`${n.bez}: Satznummer „${wert}“`);
            } else if (/^[23]$/.test(wert) && typeof nodes[j - 1] === "string" && /\bm$/.test(nodes[j - 1])) zahl.einheit++;
            else throw new Error(`${n.bez}: unerwartete Hochstellung „${wert}“ nach „${String(nodes[j - 1]).slice(-20)}“`);
          }
          if (k.c) pruefe(k.c);
          if (k.items) for (const it of k.items) pruefe(it.c);
        });
      };
      pruefe([absatz]);
      if (nummern.some((x, j) => x !== j + 1)) satzfolgen.push(`${n.bez}, ${i + 1}. Absatz: Satznummern ${nummern.join(", ")}`);
    });
  }
  return { zahl, satzfolgen, ohneLeerzeichen };
}

// Alle Zeichen des gespeicherten Inhalts in Lesereihenfolge, einschließlich Satznummern,
// Exponenten und Listenmarken (für die Gegenprüfung ohne Leerraum).
function alleZeichen(nodes) {
  let out = "";
  for (const n of nodes) {
    if (typeof n === "string") out += n;
    else if (n.t === "dl") for (const it of n.items) out += it.dt + alleZeichen(it.c);
    else if (n.t === "table") out += n.rows.flat().join("");
    else if (n.t === "pre" || n.t === "hinweis") out += n.v;
    else if (n.c) out += alleZeichen(n.c);
  }
  return out;
}
const ohneLeerraum = (s) => s.replace(/[\s ]+/g, "");

// Druckansicht eines Einzeldokuments. NI-VORIS liefert sie als Drupal-AJAX-Antwort (JSON) mit
// dem Befehl „printInNewTab“; darin steht die vollständige HTML-Druckseite.
// Normtext = Dokumentkörper ohne Fußnotenzeichen und ohne Schlussformel (die vergleichen wir separat).
function druckText(antwort) {
  const html = JSON.parse(antwort).find((c) => c.command === "printInNewTab")?.printData;
  if (!html) throw new Error("Druckansicht: kein „printInNewTab“ in der Antwort.");
  const rechtsstand = html.match(/Rechtsstand:\s*([^<]*)</)?.[1].replace(/\s+/g, " ").trim() ?? "";
  const artikel = html.match(/<article\b[\s\S]*?<\/article>/g);
  if (artikel?.length !== 1) throw new Error(`Druckansicht: ${artikel?.length ?? 0} Dokumente statt 1.`);
  const doc = parseFragment(artikel[0]);
  const body = finde(doc.documentElement, (e) => hatKlasse(e, "wkde-document-body"));
  if (!body) throw new Error("Dokumentkörper in der Druckansicht nicht gefunden.");
  const titel = finde(doc.documentElement, (e) => hatKlasse(e, "wkde-doctitle"));
  return { titel: text(titel).replace(/\s+/g, " ").trim(), rechtsstand, ...koerperText(body) };
}

// Gesamter Text eines Dokumentkörpers, wie er im HTML steht: Normtext (ohne Fußnotenzeichen und
// Fußnoten) und Schlussformel getrennt.
function koerperText(body) {
  let norm = "";
  let fuss = "";
  const sammle = (el, ziel) => {
    for (const k of kinder(el)) {
      if (k.nodeType === 3) ziel === "fuss" ? (fuss += k.nodeValue) : (norm += k.nodeValue);
      else if (k.nodeType !== 1) continue;
      else if (tag(k) === "a" && hatKlasse(k, "footnote-link")) continue;
      else if (hatKlasse(k, "footnote")) continue;
      else if (hatKlasse(k, "tfe-fuss")) sammle(k, "fuss");
      else sammle(k, ziel);
    }
  };
  sammle(body, "norm");
  return { norm, fuss };
}

// Vollständigkeit (alle Dokumente, ohne Abruf): Jedes Zeichen außer Leerraum aus dem HTML der
// „Gesamten Quelle“ muss im gespeicherten Inhalt stehen – und umgekehrt. Prüft die Umwandlung,
// nicht die Quelle (dafür ist die Gegenprüfung mit der Druckansicht da).
function pruefeVollstaendigkeit(normen, koerper) {
  for (const n of normen) {
    const soll = ohneLeerraum(koerperText(koerper.get(n.id)).norm);
    const ist = ohneLeerraum(alleZeichen(n.inhalt));
    if (soll !== ist) {
      let ab = 0;
      while (soll[ab] === ist[ab]) ab++;
      throw new Error(`${n.bez}: Inhalt weicht vom HTML ab ab Zeichen ${ab}: HTML „${soll.slice(ab, ab + 40)}“ / Inhalt „${ist.slice(ab, ab + 40)}“`);
    }
  }
}

async function gegenpruefung(gesetz) {
  fs.mkdirSync(PRUEF_DIR, { recursive: true });
  const ergebnisse = [];
  let abrufe = 0;
  for (const id of STICHPROBE) {
    const n = gesetz.normen.find((x) => x.id === id);
    if (!n) throw new Error(`Stichprobe: ${id} nicht im Import`);
    const dokId = n.url.split("/").pop();
    const datei = path.join(PRUEF_DIR, `${id}.json`);
    if (!fs.existsSync(datei)) {
      if (abrufe++) await pause(2 * PAUSE_MS);
      const url = `${BASIS}/browse/document/${dokId}/print/doc`;
      // Bei „503 Service Unavailable“ einmal nach einer längeren Pause erneut versuchen
      const antwort = await holeText(url).catch(async (e) => {
        if (!/HTTP 503/.test(e.message)) throw e;
        console.log(`${n.bez}: Server ausgelastet (503) – neuer Versuch in 30 s`);
        await pause(30000);
        return holeText(url);
      });
      fs.writeFileSync(datei, antwort);
    }
    const druck = druckText(fs.readFileSync(datei, "utf8"));
    const soll = ohneLeerraum(druck.norm);
    const ist = ohneLeerraum(alleZeichen(n.inhalt));
    let ab = 0;
    while (ab < soll.length && soll[ab] === ist[ab]) ab++;
    const titelGleich = ohneLeerraum(druck.titel) === ohneLeerraum(`${n.bez} NBauO - ${n.titel}`);
    const aktuell = /\(aktuelle Fassung\)$/.test(druck.rechtsstand);
    const gleich = soll === ist && titelGleich && aktuell;
    const befund = [
      soll === ist ? "Wortlaut gleich" : `ABWEICHUNG ab Zeichen ${ab}: Druck „${soll.slice(ab, ab + 40)}“ / Import „${ist.slice(ab, ab + 40)}“`,
      titelGleich ? "Überschrift gleich" : `ÜBERSCHRIFT „${druck.titel}“`,
      `Rechtsstand ${druck.rechtsstand}${aktuell ? "" : " – NICHT AKTUELL"}`,
    ].join(", ");
    const zeile = `${n.bez.padEnd(8)} ${String(ist.length).padStart(6)} Zeichen  ${befund}`;
    ergebnisse.push({ id, gleich, zeile, druck });
  }
  // Schlussformel (hinter § 88) ebenfalls vergleichen
  const p88 = ergebnisse.find((e) => e.id === "88");
  const schlussGleich = p88 && ohneLeerraum(p88.druck.fuss) === ohneLeerraum(gesetz.schlussformel ?? "");
  console.log(`\nGegenprüfung mit der Druckansicht der Einzeldokumente (${abrufe} neue Abrufe):`);
  for (const e of ergebnisse) console.log("  " + e.zeile);
  console.log(`  Schlussformel ${schlussGleich ? "gleich" : "ABWEICHUNG"}`);
  const fehler = ergebnisse.filter((e) => !e.gleich).length + (schlussGleich ? 0 : 1);
  const zeichen = ergebnisse.reduce((s, e) => s + ohneLeerraum(alleZeichen(gesetz.normen.find((x) => x.id === e.id).inhalt)).length, 0);
  console.log(`  ${ergebnisse.length - ergebnisse.filter((e) => !e.gleich).length}/${ergebnisse.length} Dokumente Zeichen für Zeichen gleich (${zeichen} Zeichen ohne Leerraum)`);
  if (fehler) process.exitCode = 1;
}

// ---------- Hauptprogramm ----------

async function main() {
  const { dokument, quelle, nachgeladen, abgerufen } = await ladeQuelle(QUELL_DIR, DOKUMENT_URL);
  const html = zusammensetzen(quelle, nachgeladen);

  // Gültige Fassung laut Versionsverlauf, z. B. „ab 01.07.2025 (aktuelle Fassung)“
  const { fassung, gueltigAb } = aktuelleFassung(dokument);

  let gliederung = [];
  let kopf = null;
  let schluss = "";
  const normen = [];
  const koerper = new Map(); // id -> Dokumentkörper (für die Vollständigkeitsprüfung)
  for (const s of stuecke(html)) {
    if (s.ueberschrift !== undefined) {
      // z. B. „§§ 1 - 3a, Erster Teil - Allgemeine Vorschriften“
      gliederung = [gliederungAusUeberschrift(s.ueberschrift)];
      continue;
    }
    const { id, titelZeile, body } = s;
    const url = `${BASIS}/browse/document/${id}`;
    const m = titelZeile.match(/^§\s*(\d+[a-z]?)\s+NBauO(?:\s+-\s+(.*))?$/);
    const a = titelZeile.match(/^(Anhang|Anlage(?: \d+)?)\s+NBauO(?:\s+-\s+(.*))?$/);
    if (m) {
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
        url,
      });
    } else if (a) {
      // Anhang/Anlagen gehören zu keinem Teil des Gesetzes
      const inhalt = anhangInhalt(body);
      const fussnoten = fussnotenText(body);
      normen.push({
        id: a[1].toLowerCase().replace(/ /g, "-"),
        bez: a[1],
        titel: (a[2] ?? "").trim(),
        gliederung: [],
        weggefallen: false,
        inhalt,
        text: alsText(inhalt),
        fussnoten: fussnoten || undefined,
        url,
      });
    } else {
      if (kopf) throw new Error(`Unerwartetes Dokument: ${titelZeile}`);
      kopf = { titel: titelZeile, body };
      continue;
    }
    if (koerper.has(normen.at(-1).id)) throw new Error(`Doppelte Bezeichnung: ${normen.at(-1).bez}`);
    koerper.set(normen.at(-1).id, body);
  }
  if (!kopf) throw new Error("Stammdokument (Kopf des Gesetzes) nicht gefunden.");
  pruefeVollstaendigkeit(normen, koerper);
  console.log(`Vollständigkeit: alle ${normen.length} Einträge enthalten Zeichen für Zeichen den Text ihres HTML-Dokuments (ohne Leerraum).`);
  if (kopf.titel !== `${TITEL} (NBauO)`) throw new Error(`Unerwarteter Titel des Stammdokuments: ${kopf.titel}`);

  // Kopfdaten aus dem Stammdokument: Ausfertigung, letzte Änderung (Red. Anmerkung bleibt draußen)
  const { ausfertigung, stand } = kopfDaten(kopf.body);

  const { zahl, satzfolgen, ohneLeerzeichen } = pruefeHochgestelltes(normen);

  // Verweise innerhalb des Gesetzes erkennen (nur auf existierende Paragraphen)
  const vorhanden = new Set(normen.map((n) => n.id));
  const reihenfolge = normen.map((n) => n.id);
  for (const n of normen) {
    n.verweise = extrahiereVerweise(fuerVerweise(n.text), vorhanden, reihenfolge, "NBauO").filter((v) => v !== n.id);
  }

  const gesetz = {
    id: "nbauo",
    kurz: "NBauO",
    titel: TITEL,
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
  const paragraphen = normen.filter((n) => n.bez.startsWith("§"));
  const aktiv = paragraphen.filter((n) => !n.weggefallen).length;
  const anlagen = normen.length - paragraphen.length;
  console.log(`NBauO importiert: ${paragraphen.length} Paragraphen (${aktiv} in Kraft) + ${anlagen} Anhang/Anlagen, ${stand}, Fassung ${fassung}`);
  console.log(`Hochgestelltes: ${zahl.satz} Satznummern, ${zahl.einheit} Exponenten (m²/m³)`);
  if (satzfolgen.length) console.log(`Hinweis – Satznummern nicht fortlaufend:\n  ${satzfolgen.join("\n  ")}`);
  if (ohneLeerzeichen.length)
    console.log(`Satznummer ohne Leerzeichen davor (so in der Quelle; im Feld "text" durch ein Leerzeichen getrennt):\n  ${ohneLeerzeichen.join("\n  ")}`);

  if (process.argv.includes("--pruefen")) await gegenpruefung(gesetz);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
