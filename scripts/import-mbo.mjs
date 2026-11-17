// Importiert die Musterbauordnung (MBO) aus dem amtlichen PDF des Deutschen Instituts für
// Bautechnik (DIBt) und speichert sie Paragraph für Paragraph als JSON – im selben Schema wie
// baugb.json und ndschg.json.
//
// Grundregel: Der Gesetzestext wird NICHT verändert. Wir übernehmen jedes Zeichen so, wie es im
// PDF steht, und speichern nur zusätzlich seine Struktur (Absätze, Nummern, Buchstaben,
// hochgestellte Satznummern). Erlaubt sind allein dokumentierte Reparaturen von Artefakten der
// PDF-Darstellung; jede ist unten beschrieben, wird gezählt und im Prüfprotokoll mit Seite gelistet.
//
// So kommt der Text zustande:
//   1. PDF laden (www.dibt.de)                       -> data/quellen/mbo/mbo.pdf   (nicht versioniert)
//   2. Textoperatoren des PDF-Inhaltsstroms mit pypdf auslesen (Position, Schriftgröße, fett,
//      Text je Operator) und daraus Zeilen bilden    -> data/quellen/mbo/mbo.txt   (Rohtext, versioniert)
//      Hochgestelltes erkennen wir an der Geometrie: kleinere Schrift (8 statt 12 pt) UND
//      angehobene Grundlinie (+3,2 pt). Es wird im Rohtext als {^…} markiert.
//   3. Zwei unabhängige Vergleichsextraktionen speichern:
//        pdftotext -layout (xpdf/poppler)            -> data/quellen/mbo/mbo-pdftotext.txt
//        pypdf extract_text()                         -> data/quellen/mbo/mbo-pypdf.txt
//   4. Aus mbo.txt Gliederung, Paragraphen, Absätze und Listen aufbauen.
//   5. Gegenprüfung ohne Leerraum: Jede Seite und jeder Paragraph muss Zeichen für Zeichen mit
//      pdftotext übereinstimmen (Seiten zusätzlich mit pypdf extract_text). Ergebnis und alle
//      Einzelentscheidungen stehen in data/quellen/mbo/mbo-pruefung.txt.
//
// Leerzeichen – die eine Regel: Ein Leerzeichen steht genau dort, wo das PDF ein Leerzeichen-
// Zeichen enthält. Positionslücken ohne Leerzeichen-Zeichen sind KEINE Wortgrenzen. Genau daran
// scheitern die gängigen Extraktoren: pdftotext trennt nach unterschnittenem „W“ („W ände“) und in
// gesperrten Blocksatzzeilen („Nutzungseinhei ten“), pypdf setzt an Grenzen zwischen Textblöcken
// Leerzeichen („si nd“, „Nut zung“). Wo die Vergleichsextraktoren voneinander oder von unserer Regel
// abweichen, wird das im Prüfprotokoll mit Seite und Kategorie aufgelistet (informativ).
// Mehrere Leerzeichen hintereinander werden – wie im Browser – zu einem zusammengefasst.
//
// Zeilenumbrüche fallen weg: Jede PDF-Zeile, die mit einem Wort endet, trägt im PDF selbst ein
// Leerzeichen-Zeichen am Ende; Zeilen, die mit einem Bindestrich im Wort enden („CE-⏎Zeichen“,
// „öffentlich-⏎rechtlich“), tragen keins; Ergänzungsstriche („Gewerbe- ⏎und“) tragen eins. Damit
// ergibt sich der Text ohne jede Ergänzung – alle Zeilenend-Bindestriche stehen im Prüfprotokoll.
//
// Reparaturen (jede einzeln gezählt; weicht die Anzahl ab, bricht der Import ab):
//   R1 Silbentrennung am Zeilenende (nur die Fälle in SILBENTRENNUNG): „Brandschutznach- ⏎weisen“
//      (S. 59, „Standsicherheits- oder Brandschutznach- weisen“) -> „Brandschutznachweisen“.
//      Im PDF steht dort Bindestrich + Leerzeichen; gedruckt ist es eine gewöhnliche Worttrennung.
//   R2 Satznummer als Zeichen „²“ statt als hochgestellte Ziffer (§ 16a, § 87 Abs. 4 und 6): wie die
//      übrigen Satznummern als {t:"sup", c:["2"]} gespeichert.
//
// Hochgestelltes ({t:"sup"}) bleibt im Inhalt erhalten. Im reinen Text (Feld "text") fehlen
// Satznummern und Fußnotenzeichen (sonst klebten sie an den Wörtern: „1Bauliche“); hochgestellte
// Einheiten-Exponenten („m{^3}“) erscheinen dort als „m³“ – wie die übrigen Flächen-/Raumangaben,
// die das PDF ohnehin mit den Zeichen „²“/„³“ schreibt. Fußnotentexte („1 nach Landesrecht“)
// landen im Feld "fussnoten" des Paragraphen, in dem das Fußnotenzeichen steht.
//
// Nicht übernommen: Titelseite, Inhaltsverzeichnis, Seitenzahlen, Fußnotenbereiche (als Text).
//
// Voraussetzungen für den Abruf: Python 3 mit pypdf (entwickelt mit pypdf 6.16.2; genutzt werden
// interne Hilfsfunktionen des Layout-Modus) und pdftotext (xpdf oder poppler) im PATH –
// anpassbar über die Umgebungsvariablen PYTHON und PDFTOTEXT.
//
// Aufruf:  node scripts/import-mbo.mjs                          (lädt das PDF, extrahiert, importiert)
//          node scripts/import-mbo.mjs --offline                (nutzt nur die gespeicherten Textdateien)
//          node scripts/import-mbo.mjs --offline --extrahieren  (extrahiert neu aus gespeichertem mbo.pdf)

import { execFileSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { extrahiereVerweise } from "./lib/verweise.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const QUELL_DIR = path.join(ROOT, "data", "quellen", "mbo");
const ZIEL = path.join(ROOT, "data", "gesetze", "mbo.json");

const PDF_URL = "https://www.dibt.de/fileadmin/dibt-website/Dokumente/Rechtsgrundlagen/MBO.pdf";
const HEADERS = { "User-Agent": "bau-normen-ki/0.1 (Import-Skript, einzelner Abruf eines Gesetzes)" };

const DATEI_PDF = path.join(QUELL_DIR, "mbo.pdf");
const DATEI_TEXT = path.join(QUELL_DIR, "mbo.txt");
const DATEI_PDFTOTEXT = path.join(QUELL_DIR, "mbo-pdftotext.txt");
const DATEI_PYPDF = path.join(QUELL_DIR, "mbo-pypdf.txt");
const DATEI_PRUEFUNG = path.join(QUELL_DIR, "mbo-pruefung.txt");

const OFFLINE = process.argv.includes("--offline");
const EXTRAHIEREN = !OFFLINE || process.argv.includes("--extrahieren");
const PYTHON = process.env.PYTHON || "python";
const PDFTOTEXT = process.env.PDFTOTEXT || "pdftotext";

// Titelseite: „FASSUNG NOVEMBER 2002 ZULETZT GEÄNDERT DURCH … VOM 26./27.9.2024*“ steht dort in
// Großbuchstaben. Wir speichern denselben Wortlaut in normaler Schreibung; geprüft wird, dass
// STAND.toUpperCase() exakt der Zeile im PDF entspricht (ohne das Fußnotensternchen).
const STAND = "Fassung November 2002 zuletzt geändert durch Beschluss der Bauministerkonferenz vom 26./27.9.2024";
const TITEL = "Musterbauordnung";

// R1: Echte Silbentrennungen am Zeilenende (Wort vor + nach dem Umbruch, mit Bindestrich).
// Alle übrigen Zeilenend-Bindestriche bleiben stehen; die Liste aller Fälle steht im Prüfprotokoll.
const SILBENTRENNUNG = new Set(["Brandschutznach-weisen"]);
// Erwartete Anzahlen – ändert sich das PDF, muss jemand die neuen Fälle ansehen.
const ERWARTET = { silbentrennung: 1, satznummerZeichen: 3 };

const EINRUECKUNG = 10; // pt: ab so viel Einzug gilt eine Zeile als Fortsetzung eines Listenpunkts
const ZEILEN_BAND = 6.5; // pt: Hochgestelltes liegt bis ~5,6 pt über der Grundlinie, Zeilen ≥ 10 pt auseinander

// ---------- Extraktion (nur mit PDF) ----------

// Liest je Seite alle Textoperatoren (Tj/TJ-Teilstücke) mit Position, Schriftgröße und Schrift.
// Dafür nutzen wir die Hilfsfunktionen des pypdf-Layout-Modus, die den Text-Zustand (Matrizen,
// Schrift, Größe) korrekt mitführen, aber – anders als extract_text() – selbst keine Leerzeichen
// erfinden. Zusätzlich liefert das Programm extract_text() je Seite als Vergleichstext.
const PYTHON_EXTRAKTION = String.raw`
import sys, json
import pypdf
from pypdf.generic import ContentStream
from pypdf._text_extraction._layout_mode import _fixed_width_page as fw
from pypdf._text_extraction._layout_mode._text_state_manager import TextStateManager

leser = pypdf.PdfReader(sys.argv[1])
seiten = []
for seite in leser.pages:
    schriften = seite._layout_mode_fonts()
    ops = iter(ContentStream(seite["/Contents"].get_object(), leser, "bytes").operations)
    zustand = TextStateManager()
    stuecke = []
    for operanden, op in ops:
        if op in (b"BT", b"q"):
            _, tjs = fw.recurse_to_target_op(ops, zustand, b"ET" if op == b"BT" else b"Q", schriften, True)
            stuecke.extend(tjs)
        elif op == b"Tf":
            zustand.set_font(fw.resolve_font(schriften, operanden[0]), operanden[1])
        else:
            zustand.set_state_param(op, operanden)
    seiten.append({
        "stuecke": [[round(t.tx, 2), round(t.ty, 2), round(t.font_height, 2), 1 if "Bold" in t.font.name else 0, t.text]
                    for t in stuecke if t.text],
        "text": seite.extract_text(),
    })
meta = leser.metadata or {}
json.dump({"pypdf": pypdf.__version__, "erstellt": str(meta.get("/CreationDate", "")),
           "erzeuger": str(meta.get("/Producer", "")), "seiten": seiten}, sys.stdout, ensure_ascii=True)
`;

function extrahiere(abgerufen) {
  const pdf = fs.readFileSync(DATEI_PDF);
  const sha256 = crypto.createHash("sha256").update(pdf).digest("hex");

  let roh;
  try {
    roh = execFileSync(PYTHON, ["-I", "-", DATEI_PDF], {
      input: PYTHON_EXTRAKTION,
      maxBuffer: 512 * 1024 * 1024,
      env: { ...process.env, PYTHONIOENCODING: "utf-8" },
    });
  } catch (e) {
    throw new Error(`pypdf-Extraktion fehlgeschlagen (Python mit pypdf nötig, siehe Kopf des Skripts): ${e.message}`);
  }
  const daten = JSON.parse(roh.toString("utf8"));
  if (daten.pypdf !== "6.16.2") console.warn(`Hinweis: entwickelt mit pypdf 6.16.2, gefunden ${daten.pypdf} – Ergebnis bitte prüfen.`);

  try {
    execFileSync(PDFTOTEXT, ["-layout", "-enc", "UTF-8", "-eol", "unix", DATEI_PDF, DATEI_PDFTOTEXT], { stdio: "ignore" });
  } catch (e) {
    throw new Error(`pdftotext fehlgeschlagen (xpdf/poppler nötig): ${e.message}`);
  }
  fs.writeFileSync(DATEI_PYPDF, daten.seiten.map((s) => s.text).join("\f"));

  const erstellt = (daten.erstellt.match(/^D:(\d{4})(\d\d)(\d\d)(\d\d)(\d\d)(\d\d)/) ?? []).slice(1);
  const kopf = [
    "# Musterbauordnung (MBO) – Rohtext aus dem amtlichen PDF des DIBt, erzeugt von scripts/import-mbo.mjs",
    `# Quelle: ${PDF_URL}`,
    `# Abgerufen: ${abgerufen}`,
    `# PDF: ${daten.seiten.length} Seiten, SHA-256 ${sha256}, erstellt ${erstellt.length ? `${erstellt[0]}-${erstellt[1]}-${erstellt[2]} ${erstellt[3]}:${erstellt[4]}:${erstellt[5]}` : "?"} (${daten.erzeuger})`,
    `# Extraktion: pypdf ${daten.pypdf}, Textoperatoren des Inhaltsstroms in Stromreihenfolge, zu Zeilen gruppiert`,
    "# Zeilenformat: <y> <x> <Schriftgröße> <F = ganze Zeile fett | -> |<Text>|",
    "#   y, x = Grundlinie und Beginn der Zeile in pt (Ursprung unten links); {^…} = hochgestellt",
    "#   (kleinere Schrift und angehobene Grundlinie). Text sonst Zeichen für Zeichen wie im PDF,",
    "#   einschließlich aller Leerzeichen-Zeichen. Leerzeilen (nur Leerzeichen) sind weggelassen.",
  ];
  const zeilen = [...kopf];
  daten.seiten.forEach((s, i) => {
    zeilen.push(`@@ Seite ${i + 1}`);
    const stuecke = s.stuecke.map(([x, y, g, f, t]) => ({ x, y, g, f: f === 1, t }));
    for (const z of zeilenAusStuecken(stuecke)) {
      const text = z.teile.map((t) => (t.hoch ? `{^${t.t}}` : t.t)).join("");
      if (/[{}|]/.test(z.teile.map((t) => t.t).join(""))) throw new Error(`Zeichen { } | im PDF-Text – Rohtextformat nicht eindeutig (Seite ${i + 1})`);
      zeilen.push(`${z.y.toFixed(2).padStart(7)} ${z.x.toFixed(2).padStart(7)} ${z.groesse.toFixed(1).padStart(4)} ${z.fett ? "F" : "-"} |${text}|`);
    }
  });
  fs.writeFileSync(DATEI_TEXT, zeilen.join("\n") + "\n");
}

// Gruppiert die Textstücke einer Seite zu Zeilen. Alles, was bis ZEILEN_BAND über der tiefsten
// Grundlinie liegt, gehört zur selben Zeile (so landen hochgestellte Satznummern und auch die
// mit ihnen angehobenen Leerzeichen in ihrer Zeile). Innerhalb der Zeile bleibt die Reihenfolge
// des PDF-Inhaltsstroms erhalten – nach x zu sortieren wäre falsch, weil pypdf die Zeichenbreiten
// mancher Schriften leicht unterschätzt und sich Stücke dann scheinbar überlappen.
function zeilenAusStuecken(stuecke) {
  const ys = [...new Set(stuecke.map((s) => s.y))].sort((a, b) => a - b);
  const basis = new Map();
  let aktuell = null;
  for (const y of ys) {
    if (aktuell === null || y > aktuell + ZEILEN_BAND) aktuell = y;
    basis.set(y, aktuell);
  }
  const gruppen = new Map();
  for (const s of stuecke) {
    const b = basis.get(s.y);
    if (!gruppen.has(b)) gruppen.set(b, []);
    gruppen.get(b).push(s);
  }
  const zeilen = [];
  for (const [y, ss] of [...gruppen.entries()].sort((a, b) => b[0] - a[0])) {
    const zeichenJeGroesse = new Map();
    for (const s of ss) if (s.t.trim()) zeichenJeGroesse.set(s.g, (zeichenJeGroesse.get(s.g) ?? 0) + s.t.trim().length);
    if (!zeichenJeGroesse.size) continue; // Leerzeile
    const groesse = [...zeichenJeGroesse.entries()].sort((a, b) => b[1] - a[1])[0][0];
    const teile = [];
    for (const s of ss) {
      const hoch = s.t.trim() !== "" && s.g < groesse * 0.8 && s.y > y + 1;
      if (!hoch) {
        anfuegen(teile, s.t, false);
        continue;
      }
      const [, vorn, kern, hinten] = s.t.match(/^(\s*)([\s\S]*?)(\s*)$/);
      if (vorn) anfuegen(teile, vorn, false);
      anfuegen(teile, kern, true);
      if (hinten) anfuegen(teile, hinten, false);
    }
    const sichtbar = ss.filter((s) => s.t.trim());
    zeilen.push({ y, x: sichtbar[0].x, groesse, fett: sichtbar.every((s) => s.f), teile });
  }
  return zeilen;
}

function anfuegen(teile, t, hoch) {
  const letztes = teile[teile.length - 1];
  if (letztes && letztes.hoch === hoch) letztes.t += t;
  else teile.push({ t, hoch });
}

// ---------- Rohdaten laden ----------

async function ladeQuelle() {
  fs.mkdirSync(QUELL_DIR, { recursive: true });
  if (!OFFLINE) {
    const res = await fetch(PDF_URL, { headers: HEADERS });
    if (!res.ok) throw new Error(`Download fehlgeschlagen (${PDF_URL}): HTTP ${res.status}`);
    const pdf = Buffer.from(await res.arrayBuffer());
    if (pdf.subarray(0, 5).toString("latin1") !== "%PDF-") throw new Error("Download ist kein PDF.");
    fs.writeFileSync(DATEI_PDF, pdf);
  }
  if (EXTRAHIEREN) {
    if (!fs.existsSync(DATEI_PDF)) throw new Error(`PDF fehlt: ${DATEI_PDF} (erst ohne --offline ausführen)`);
    const abgerufen = OFFLINE && fs.existsSync(DATEI_TEXT) ? kopfwert(fs.readFileSync(DATEI_TEXT, "utf8"), "Abgerufen") : heute();
    extrahiere(abgerufen);
  }
  for (const f of [DATEI_TEXT, DATEI_PDFTOTEXT, DATEI_PYPDF])
    if (!fs.existsSync(f)) throw new Error(`Rohdatei fehlt: ${f} (erst ohne --offline ausführen)`);
  return {
    roh: fs.readFileSync(DATEI_TEXT, "utf8"),
    pdftotext: fs.readFileSync(DATEI_PDFTOTEXT, "utf8"),
    pypdf: fs.readFileSync(DATEI_PYPDF, "utf8"),
  };
}

const heute = () => new Date().toISOString().slice(0, 10);
function kopfwert(roh, name) {
  const m = roh.match(new RegExp(`^# ${name}: (.*)$`, "m"));
  if (!m) throw new Error(`Kopfzeile „${name}“ fehlt in mbo.txt`);
  return m[1].trim();
}

// Liest mbo.txt in Seiten und Zeilen zurück.
function leseRohtext(roh) {
  const seiten = [];
  for (const zeile of roh.split(/\r?\n/)) {
    if (!zeile || zeile.startsWith("#")) continue;
    const s = zeile.match(/^@@ Seite (\d+)$/);
    if (s) {
      seiten.push({ nr: Number(s[1]), zeilen: [] });
      continue;
    }
    const m = zeile.match(/^\s*([\d.]+)\s+([\d.]+)\s+([\d.]+)\s+([F-]) \|(.*)\|$/);
    if (!m || !seiten.length) throw new Error(`Unlesbare Zeile in mbo.txt: ${zeile}`);
    const teile = [];
    m[5].split(/\{\^([^}]*)\}/).forEach((t, i) => {
      if (t !== "" || i % 2 === 1) teile.push({ t, hoch: i % 2 === 1 });
    });
    const seite = seiten[seiten.length - 1];
    seite.zeilen.push({
      seite: seite.nr,
      y: Number(m[1]),
      x: Number(m[2]),
      groesse: Number(m[3]),
      fett: m[4] === "F",
      teile,
      text: teile.map((t) => t.t).join(""), // alle Zeichen, Hochgestelltes eingeschlossen
    });
  }
  seiten.forEach((s, i) => {
    if (s.nr !== i + 1) throw new Error("Seitenfolge in mbo.txt gestört.");
  });
  return seiten;
}

// ---------- Vergleich ohne Leerraum ----------

// Zeichenfolge ohne Leerraum + für jedes Zeichen, ob davor Leerraum stand.
function ohneLeerraum(s) {
  const zeichen = [];
  const leerDavor = [];
  let leer = false;
  for (const c of s) {
    if (/\s/.test(c)) {
      leer = true;
      continue;
    }
    zeichen.push(c);
    leerDavor.push(leer);
    leer = false;
  }
  return { zeichen, leerDavor };
}

// Myers-Differenz zweier Zeichenfolgen: Liste von ["=", i, j] | ["-", i] | ["+", j].
function differenz(a, b) {
  const n = a.length, m = b.length, max = n + m, off = max + 1;
  const v = new Int32Array(2 * max + 3);
  const spur = [];
  for (let d = 0; d <= max; d++) {
    spur.push(v.slice());
    for (let k = -d; k <= d; k += 2) {
      let x = k === -d || (k !== d && v[off + k - 1] < v[off + k + 1]) ? v[off + k + 1] : v[off + k - 1] + 1;
      let y = x - k;
      while (x < n && y < m && a[x] === b[y]) {
        x++;
        y++;
      }
      v[off + k] = x;
      if (x >= n && y >= m) return zurueck(spur, n, m, d, off);
    }
  }
  return [];
}
function zurueck(spur, n, m, dMax, off) {
  let x = n, y = m;
  const ops = [];
  for (let d = dMax; d > 0; d--) {
    const v = spur[d];
    const k = x - y;
    const vk = k === -d || (k !== d && v[off + k - 1] < v[off + k + 1]) ? k + 1 : k - 1;
    const vx = v[off + vk], vy = vx - vk;
    while (x > vx && y > vy) ops.push(["=", --x, --y]);
    if (x === vx) ops.push(["+", --y]);
    else ops.push(["-", --x]);
  }
  while (x > 0 && y > 0) ops.push(["=", --x, --y]);
  return ops.reverse();
}

// Abbildung Zeichenindex a -> Zeichenindex b (-1 = keine Entsprechung) + Liste der Abweichungen.
function abbildung(a, b) {
  const ops = differenz(a, b);
  const map = new Int32Array(a.length).fill(-1);
  const abweichungen = [];
  let gruppe = null;
  for (const op of ops) {
    if (op[0] === "=") {
      map[op[1]] = op[2];
      gruppe = null;
      continue;
    }
    if (!gruppe) abweichungen.push((gruppe = { weg: "", neu: "", bei: op[0] === "-" ? op[1] : -1 }));
    if (op[0] === "-") {
      gruppe.weg += a[op[1]];
      if (gruppe.bei < 0) gruppe.bei = op[1];
    } else gruppe.neu += b[op[1]];
  }
  return { map, abweichungen };
}

// ---------- Aufbau der Paragraphen ----------

const ORDNUNG = "Erster|Zweiter|Dritter|Vierter|Fünfter|Sechster|Siebenter|Achter|Neunter|Zehnter";
const RE_GLIEDERUNG = new RegExp(`^(?:${ORDNUNG}) (?:Teil|Abschnitt)$`);
const RE_PARAGRAPH = /^(§\s*)?(\d+[a-z]?)(\s+MBO)?$/;
const RE_ANLAGE = /^Anlage (\d+)\s*(.*)$/;
const RE_ABSATZ = /^\((\d+)([a-z]?)\)(?=\s|$)/;
const RE_ZAHL = /^(\[?)(\d+)([a-z]?)\.(?=\s)/;
const RE_DOPPEL = /^([a-z])\1\)(?=\s)/;
const RE_BUCHST = /^([a-z])\)(?=\s)/;

const istSeitenzahl = (z) => z.y < 45 && /^\s*\d+\s*$/.test(z.text);
const istFussnotenbereich = (z) => z.groesse < 11 && z.y < 120;

const protokoll = {
  trennstriche: [],
  satznummerZeichen: [],
  hochgestellt: { satz: 0, fussnote: 0, einheit: 0 },
  fussnotenOhneText: [],
  fussnotenOhneZeichen: [],
  satzfolgen: [],
  absatzfolgen: [],
  listen: [],
  ueberschriften: [],
};

function baueNormen(seiten) {
  // Fußnotentexte je Seite: „{^1} nach Landesrecht“
  const fussnoten = new Map(); // seite -> Map(zeichen -> text)
  const fussnotenGenutzt = new Set();
  for (const s of seiten) {
    if (s.nr === 1) continue; // Titelseite: eigene Fußnote (Notifizierung), siehe unten
    const liste = new Map();
    let letzte = null;
    for (const z of s.zeilen.filter(istFussnotenbereich)) {
      if (z.teile[0]?.hoch) {
        letzte = z.teile[0].t;
        liste.set(letzte, z.teile.slice(1).map((t) => t.t).join("").replace(/\s+/g, " ").trim());
      } else if (letzte) liste.set(letzte, `${liste.get(letzte)} ${z.text.replace(/\s+/g, " ").trim()}`);
      else throw new Error(`Fußnotenzeile ohne Zeichen auf Seite ${s.nr}: ${z.text}`);
    }
    if (liste.size) fussnoten.set(s.nr, liste);
  }

  const alle = seiten.flatMap((s) => s.zeilen).filter((z) => !istSeitenzahl(z) && !istFussnotenbereich(z));

  // Titelseite und Inhaltsverzeichnis überspringen: Der Gesetzestext beginnt bei „Erster Teil“,
  // auf das (nach der Teil-Überschrift) die allein stehende Zeile „§ 1“ folgt.
  const start = alle.findIndex((z, i) => z.text.trim() === "Erster Teil" && alle[i + 2] && alle[i + 2].text.trim() === "§ 1");
  if (start < 0) throw new Error("Beginn des Gesetzestexts („Erster Teil“ … „§ 1“) nicht gefunden.");
  const vorspann = alle.slice(0, start);

  const normen = [];
  let teil = null;
  let abschnitt = null;
  let norm = null;
  const titelZeilen = (i) => {
    const t = [];
    while (alle[i + 1] && alle[i + 1].fett && !istUeberschrift(alle[i + 1])) t.push(alle[++i].text.trim());
    return { titel: t.join(" ").replace(/\s+/g, " "), i };
  };
  const istUeberschrift = (z) => {
    const t = z.text.trim();
    return (RE_GLIEDERUNG.test(t) && z.x > 150) || (RE_PARAGRAPH.test(t) && z.x > 200) || (RE_ANLAGE.test(t) && z.fett);
  };
  const ueberschriftZeilen = [];

  for (let i = start; i < alle.length; i++) {
    const z = alle[i];
    const t = z.text.trim();
    if (RE_GLIEDERUNG.test(t) && z.x > 150) {
      const r = titelZeilen(i);
      ueberschriftZeilen.push(...alle.slice(i, r.i + 1));
      i = r.i;
      if (!r.titel) throw new Error(`Gliederungsüberschrift ohne Titel: ${t} (Seite ${z.seite})`);
      if (t.endsWith("Teil")) {
        teil = `${t} – ${r.titel}`;
        abschnitt = null;
      } else abschnitt = `${t} – ${r.titel}`;
      norm = null;
      continue;
    }
    const mp = t.match(RE_PARAGRAPH);
    if (mp && z.x > 200 && alle[i + 1]?.fett) {
      const r = titelZeilen(i);
      ueberschriftZeilen.push(...alle.slice(i, r.i + 1));
      i = r.i;
      if (!mp[1]) protokoll.ueberschriften.push(`S. ${z.seite}: Überschrift „${t}“ ohne Paragraphenzeichen – als § ${mp[2]} übernommen`);
      if (mp[3]) protokoll.ueberschriften.push(`S. ${z.seite}: Überschrift „${t}“ – Zusatz „MBO“ steht so im PDF, Bezeichnung „§ ${mp[2]}“`);
      if (!z.fett) protokoll.ueberschriften.push(`S. ${z.seite}: „${t}“ – Paragraphenzeichen nicht fett gesetzt (Darstellung, ohne Folgen)`);
      norm = { id: mp[2], bez: `§ ${mp[2]}`, titel: r.titel, gliederung: [teil, abschnitt].filter(Boolean), seite: z.seite, zeilen: [], anlage: false };
      normen.push(norm);
      continue;
    }
    const ma = t.match(RE_ANLAGE);
    if (ma && z.fett) {
      // „Anlage 1 (§ 65 Abs. 3 Nr. 3, zu 65a Abs. 1 Nr. 1)“, darunter allein stehend die Überschrift
      // „Leitlinien zu Ausbildungsinhalten“ – beides zusammen ist der Titel (wie beim BauGB).
      const unter = alle[i + 1];
      ueberschriftZeilen.push(z, unter);
      i++;
      norm = {
        id: `anlage-${ma[1]}`,
        bez: `Anlage ${ma[1]}`,
        titel: `${ma[2].trim()} ${unter.text.trim()}`.replace(/\s+/g, " ").trim(),
        gliederung: [],
        seite: z.seite,
        zeilen: [],
        anlage: true,
      };
      teil = abschnitt = null;
      normen.push(norm);
      continue;
    }
    if (!norm) throw new Error(`Text außerhalb eines Paragraphen (Seite ${z.seite}): ${t}`);
    norm.zeilen.push(z);
  }

  for (const n of normen) {
    n.inhalt = baueInhalt(n);
    for (const p of n.inhalt) klassifiziereHochgestelltes(p.c);
    pruefeSatzfolgen(n);
    // Fußnoten des Paragraphen
    const texte = [];
    besuche(n.inhalt, (k) => {
      if (k.t !== "sup" || k.art !== "fussnote") return;
      const text = fussnoten.get(k.seite)?.get(k.c[0]);
      if (text === undefined) {
        protokoll.fussnotenOhneText.push(`S. ${k.seite}, ${n.bez}: Fußnotenzeichen „${k.c[0]}“ ohne Fußnotentext auf derselben Seite – Zeichen unverändert übernommen`);
        return;
      }
      fussnotenGenutzt.add(`${k.seite}|${k.c[0]}`);
      const eintrag = `${k.c[0]} ${text}`;
      if (!texte.includes(eintrag)) texte.push(eintrag);
    });
    n.fussnoten = texte.join("\n");
  }
  for (const [seite, liste] of fussnoten)
    for (const [zeichen, text] of liste)
      if (!fussnotenGenutzt.has(`${seite}|${zeichen}`)) protokoll.fussnotenOhneZeichen.push(`S. ${seite}: Fußnote „${zeichen} ${text}“ ohne Zeichen im Text`);

  return { normen, vorspann, ueberschriftZeilen };
}

function besuche(nodes, f) {
  for (const n of nodes) {
    if (typeof n === "string") continue;
    f(n);
    if (n.c) besuche(n.c, f);
    if (n.items) for (const it of n.items) besuche(it.c, f);
  }
}

// Absätze und Listen eines Paragraphen. Absätze beginnen mit „(1)“ am linken Rand; Listenpunkte
// mit „1.“, „a)“ oder „aa)“. Ob eine Folgezeile zu einem Listenpunkt gehört oder der Absatz nach
// der Liste weitergeht, entscheidet der Einzug: Fortsetzungszeilen eines Punkts stehen eingerückt
// (hängender Einzug), Text nach der Liste beginnt wieder links. Listennummern müssen lückenlos
// aufeinander folgen – „14. Juni 2023“ am Zeilenanfang ist so kein neuer Listenpunkt.
function baueInhalt(norm) {
  const inhalt = [];
  let absatz = null;
  let stapel = []; // offene Listenebenen: { art, liste, punkt, nr, x }
  let erwarteterAbsatz = 1;
  let vorige = null;
  let voriges = null; // Container der vorigen Zeile

  const neuerAbsatz = () => {
    absatz = { t: "p", c: [] };
    inhalt.push(absatz);
    stapel = [];
  };

  // Neuer Punkt in der Liste der Ebene e (oder in einer neuen Liste unter „eltern“)
  const punktAnlegen = (marke, x, eltern) => {
    let e;
    if (eltern !== undefined) {
      stapel = eltern ? stapel.slice(0, stapel.indexOf(eltern) + 1) : [];
      const liste = { t: "dl", items: [] };
      (eltern ? eltern.punkt.c : absatz.c).push(liste);
      stapel.push((e = { art: marke.art, liste, punkt: null, nr: null, x }));
    } else e = stapel[stapel.length - 1];
    e.punkt = { dt: marke.dt, c: [] };
    e.liste.items.push(e.punkt);
    e.nr = marke;
    e.x = x;
    return e.punkt.c;
  };

  norm.zeilen.forEach((z, zi) => {
    const erster = z.teile[0];
    let anfang = erster && !erster.hoch ? erster.t.trimStart() : "";
    let ziel = null;
    let teile = z.teile;
    const abschneiden = (marke) => {
      anfang = anfang.slice(marke.length).replace(/^\s+/, "");
      teile = [{ t: anfang, hoch: false }, ...z.teile.slice(1)];
    };

    // Neuer Absatz „(n)“
    const ma = anfang.match(RE_ABSATZ);
    if (ma && z.x < 75) {
      const nr = Number(ma[1]);
      // „(1a)“ folgt auf „(1)“ (eingeschobener Absatz)
      if (ma[2] ? nr !== erwarteterAbsatz - 1 : nr !== erwarteterAbsatz)
        protokoll.absatzfolgen.push(`${norm.bez} (S. ${z.seite}): Absatz „(${ma[1]}${ma[2]})“, erwartet (${erwarteterAbsatz})`);
      else if (ma[2]) protokoll.listen.push(`${norm.bez} (S. ${z.seite}): eingeschobener Absatz „(${ma[1]}${ma[2]})“`);
      erwarteterAbsatz = nr + 1;
      neuerAbsatz();
      ziel = absatz.c;
    }

    // Anlage: Absätze sind dort nicht nummeriert, sondern durch Leerraum getrennt
    if (!ziel && norm.anlage && vorige && vorige.seite === z.seite && vorige.y - z.y > 20 && z.x < 70 && !listenmarke(anfang)) {
      neuerAbsatz();
      ziel = absatz.c;
    }
    if (!absatz) neuerAbsatz();

    // Neuer Listenpunkt? Eine Liste beginnt mit „1.“/„a)“/„aa)“ – oder, wenn die nächste Zeile
    // hängend eingerückt ist, auch mit einer anderen Nummer (§ 65 Abs. 1 zählt im PDF „4.“, „5.“).
    if (!ziel) {
      const marke = listenmarke(anfang);
      if (marke) {
        const ebene = stapel.findIndex((e) => e.art === marke.art);
        const naechste = norm.zeilen[zi + 1];
        const haengend = naechste && naechste.seite === z.seite && naechste.x > z.x + EINRUECKUNG && !listenmarke(naechste.text.trimStart());
        if (ebene >= 0 && folgt(stapel[ebene], marke)) {
          stapel = stapel.slice(0, ebene + 1);
          ziel = punktAnlegen(marke, z.x);
        } else if (ebene < 0 && (marke.erster || haengend)) {
          // Neue Liste: verschachtelt im tiefsten Punkt, wenn eingerückt, sonst im Absatz
          const eltern = [...stapel].reverse().find((e) => e.x + EINRUECKUNG < z.x && rang(e.art) < rang(marke.art)) ?? null;
          if (!marke.erster) protokoll.listen.push(`${norm.bez} (S. ${z.seite}): Liste beginnt mit „${marke.dt}“ (so im PDF)`);
          ziel = punktAnlegen(marke, z.x, eltern);
        } else if (stapel.some((e) => Math.abs(e.x - z.x) < 3))
          protokoll.listen.push(`${norm.bez} (S. ${z.seite}): „${anfang.slice(0, 30)}…“ sieht aus wie ein Listenpunkt, passt aber nicht in die Nummernfolge – als Fortsetzungszeile behandelt`);
        if (ziel) {
          if (marke.dt.startsWith("[")) protokoll.listen.push(`${norm.bez} (S. ${z.seite}): Listenmarke „${marke.dt}“ mit eckiger Klammer der Muster-Alternative (so im PDF)`);
          abschneiden(marke.dt);
          // Unterliste in derselben Zeile: „2. a) einem Angehörigen …“
          const unter = listenmarke(anfang);
          if (unter && unter.erster && rang(unter.art) > rang(marke.art)) {
            protokoll.listen.push(`${norm.bez} (S. ${z.seite}): „${marke.dt} ${unter.dt}“ – Unterliste beginnt in derselben Zeile`);
            ziel = punktAnlegen(unter, z.x, stapel[stapel.length - 1]);
            abschneiden(unter.dt);
          }
        }
      }
    }

    // Fortsetzungszeile: zum tiefsten Listenpunkt, gegenüber dessen Marke die Zeile eingerückt ist
    if (!ziel) {
      const k = stapel.findLastIndex((e) => e.x + EINRUECKUNG < z.x);
      stapel = stapel.slice(0, k + 1);
      ziel = k >= 0 ? stapel[k].punkt.c : absatz.c;
    }

    // R1: Zeilenumbruch. Ob am Zeilenende ein Leerzeichen steht, entscheidet allein das PDF (jede
    // Zeile, die mit einem Wort endet, trägt dort ein Leerzeichen-Zeichen). Zeilenenden mit
    // Bindestrich werden nur protokolliert – außer den Silbentrennungen in SILBENTRENNUNG.
    if (vorige && ziel !== voriges && /-\s*$/.test(vorige.text))
      protokoll.trennstriche.push(`S. ${vorige.seite}, ${norm.bez}: „${vorige.text.trimEnd().match(/(\S*)$/)[1]}“ am Zeilenende vor neuem Absatz/Listenpunkt – unverändert`);
    if (vorige && ziel === voriges) {
      const letzter = ziel[ziel.length - 1];
      if (typeof letzter === "string" && /-\s*$/.test(letzter)) {
        const leerzeichen = /\s$/.test(letzter);
        const wort1 = letzter.trimEnd().match(/(\S*)$/)[1];
        const wort2 = (teile[0] && !teile[0].hoch ? teile[0].t : "").match(/^(\S*)/)[1];
        let entscheidung;
        if (SILBENTRENNUNG.has(wort1 + wort2)) {
          ziel[ziel.length - 1] = letzter.replace(/-\s*$/, "");
          entscheidung = `Silbentrennung: Bindestrich${leerzeichen ? " und Leerzeichen" : ""} entfallen (R1)`;
        } else entscheidung = leerzeichen ? "Bindestrich + Leerzeichen wie im PDF (Ergänzungsstrich)" : "Bindestrich ohne Leerzeichen wie im PDF (Bindestrichwort)";
        protokoll.trennstriche.push(`S. ${vorige.seite}, ${norm.bez}: „${wort1}${leerzeichen ? "␣" : ""}⏎${wort2}“ – ${entscheidung}`);
      }
    }

    for (const t of teile) {
      if (t.hoch) ziel.push({ t: "sup", c: [t.t], seite: z.seite });
      else if (t.t) ziel.push(t.t);
    }
    vorige = z;
    voriges = ziel;
  });
  return inhalt.map((p) => ({ t: "p", c: aufraeumen(satznummerZeichen(p.c, norm)) }));
}

function listenmarke(anfang) {
  let m;
  // „[1.“: eckige Klammer der Muster-Alternative steht im PDF vor der Nummer (§ 82 Abs. 2) – sie
  // bleibt Teil der Marke, so wie sie gedruckt ist.
  if ((m = anfang.match(RE_ZAHL))) return { art: "zahl", dt: m[0], wert: Number(m[2]), zusatz: m[3], erster: m[2] === "1" && !m[3] };
  if ((m = anfang.match(RE_DOPPEL))) return { art: "doppel", dt: m[0], wert: m[1].charCodeAt(0), zusatz: "", erster: m[1] === "a" };
  if ((m = anfang.match(RE_BUCHST))) return { art: "buchst", dt: m[0], wert: m[1].charCodeAt(0), zusatz: "", erster: m[1] === "a" };
  return null;
}
const rang = (art) => ({ zahl: 1, buchst: 2, doppel: 3 })[art];
// Nächster Punkt derselben Liste: 1. -> 2. (oder 1a.), a) -> b)
function folgt(ebene, marke) {
  const vorher = ebene.nr;
  if (marke.zusatz) return marke.wert === vorher.wert && marke.zusatz.charCodeAt(0) === (vorher.zusatz ? vorher.zusatz.charCodeAt(0) + 1 : 97);
  return marke.wert === vorher.wert + 1;
}

// R2: Satznummer als Zeichen „²“ („… zulässig. ²Sind bereits …“) -> hochgestellte „2“
function satznummerZeichen(nodes, norm) {
  const out = [];
  for (const n of nodes) {
    if (typeof n !== "string") {
      if (n.t === "dl") for (const it of n.items) it.c = satznummerZeichen(it.c, norm);
      out.push(n);
      continue;
    }
    const teile = n.split(/(?<=\.\s+)²(?=[A-ZÄÖÜ])/);
    teile.forEach((t, i) => {
      if (i > 0) {
        out.push({ t: "sup", c: ["2"], seite: norm.seite, repariert: true });
        protokoll.satznummerZeichen.push(`${norm.bez}: „…${teile[i - 1].slice(-25)}²${t.slice(0, 15)}…“ – Zeichen „²“ als Satznummer 2 gespeichert (R2)`);
      }
      out.push(t);
    });
  }
  return out;
}

// Strings zusammenfassen, Leerraum zu einem Leerzeichen, an Blockgrenzen (Anfang/Ende, vor und
// nach Listen) trimmen – wie im NDSchG-Import.
function aufraeumen(nodes) {
  const out = [];
  for (const n of nodes) {
    if (typeof n === "string") {
      if (typeof out[out.length - 1] === "string") out[out.length - 1] += n;
      else out.push(n);
    } else {
      if (n.t === "dl") for (const it of n.items) it.c = aufraeumen(it.c);
      out.push(n);
    }
  }
  for (let i = 0; i < out.length; i++) {
    if (typeof out[i] !== "string") continue;
    out[i] = out[i].replace(/\s+/g, " ");
    if (i === 0 || out[i - 1].t === "dl") out[i] = out[i].trimStart();
    if (i === out.length - 1 || out[i + 1].t === "dl") out[i] = out[i].trimEnd();
  }
  return out.filter((n) => n !== "");
}

// Hochgestelltes einordnen:
//   einheit  – „2“/„3“ direkt nach „<Zahl> m“ (m², m³)
//   satz     – Ziffern, davor Leerraum/„[“/Blockbeginn, danach direkt Text („werden. ²Bauliche“)
//   fussnote – alles andere („höheren¹ Bauaufsichtsbehörde“, „Land …*)“)
function klassifiziereHochgestelltes(nodes) {
  for (let i = 0; i < nodes.length; i++) {
    const n = nodes[i];
    if (typeof n === "string") continue;
    if (n.t === "dl") {
      for (const it of n.items) klassifiziereHochgestelltes(it.c);
      continue;
    }
    if (n.t !== "sup") continue;
    const vor = nodes[i - 1];
    const nach = typeof nodes[i + 1] === "string" ? nodes[i + 1] : "";
    const wert = n.c[0];
    const vorBeginn = i === 0 || typeof vor !== "string" || /[\s[]$/.test(vor);
    if (/^[23]$/.test(wert) && typeof vor === "string" && /\d m$/.test(vor)) n.art = "einheit";
    else if (/^\d+$/.test(wert) && vorBeginn && /^[^\s,.;:)\]]/.test(nach)) n.art = "satz";
    else n.art = "fussnote";
    protokoll.hochgestellt[n.art]++;
  }
}

// Satznummern eines Absatzes müssen 1, 2, 3, … lauten (oder ganz fehlen).
function pruefeSatzfolgen(norm) {
  norm.inhalt.forEach((p, i) => {
    const nummern = [];
    besuche(p.c, (k) => {
      if (k.t === "sup" && k.art === "satz") nummern.push(Number(k.c[0]));
    });
    if (nummern.some((n, j) => n !== j + 1))
      protokoll.satzfolgen.push(`${norm.bez}, ${i + 1}. Absatz: Satznummern ${nummern.join(", ")}`);
  });
}

// Reiner Text (für Suche und Verweis-Erkennung) – wie lib/text.ts, aber Satznummern und
// Fußnotenzeichen fehlen, Einheiten-Exponenten erscheinen als „²“/„³“.
const HOCH = { 2: "²", 3: "³" };
function alsText(nodes) {
  let out = "";
  for (const n of nodes) {
    if (typeof n === "string") out += n;
    else if (n.t === "p") out += (out && !out.endsWith("\n") ? "\n" : "") + alsText(n.c) + "\n";
    else if (n.t === "dl") {
      for (const it of n.items) out += "\n" + it.dt + " " + alsText(it.c);
      out += "\n";
    } else if (n.t === "sup") out += n.art === "einheit" ? HOCH[n.c[0]] : "";
    else if (n.c) out += alsText(n.c);
  }
  return out.replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").replace(/ {2,}/g, " ").trim();
}

// Nur für die Verweis-Erkennung (der gespeicherte Text bleibt unverändert). scripts/lib/verweise.mjs
// wurde für das BauGB geschrieben; für die MBO gleichen wir an:
//   „Nrn.“ -> „Nummern“, „Abs.2“ -> „Abs. 2“   (sonst: „§§ 35 Abs. 1 Nrn. 1 und 2, 201 BauGB“ = § 35 MBO)
//   „des Baugesetzbuchs“ -> „des BauGB“        (für verweise.mjs heißt „des Baugesetzbuchs“ „dieses Gesetz“)
//   Kettenzitate: „§ 14 Abs. 2 Satz 2, § 22 Abs. 5 Satz 1, § 36 Abs. 1 Sätze 1 und 2 BauGB“ – das Gesetz
//   steht nur hinter dem letzten Glied; wir wiederholen es hinter jedem Glied.
const ZITAT_ZAHL = String.raw`\d+[a-z]?`;
const ZITAT_REIHE = String.raw`${ZITAT_ZAHL}(?:(?:,\s*|\s+(?:und|oder|bis)\s+)${ZITAT_ZAHL})*`;
const ZITAT = String.raw`§§?\s*${ZITAT_REIHE}(?:\s+(?:Abs\.|Absatz|Absätze|Satz|Sätze|Nr\.|Nummer|Nummern|Buchst\.|Buchstabe|Halbsatz)\s+${ZITAT_REIHE})*`;
const ZITAT_TRENNER = String.raw`(?:,\s*|\s+(?:oder|und)\s+(?:der\s+|des\s+)?)`;
const ZITAT_GESETZ = String.raw`(?:des\s+[A-ZÄÖÜ][\wÄÖÜäöüß-]*|[A-ZÄÖÜ][A-Za-zÄÖÜäöü]*[A-Z][A-Za-z]*\b)`;
const RE_KETTE = new RegExp(String.raw`(?:${ZITAT}${ZITAT_TRENNER})+${ZITAT}\s+(${ZITAT_GESETZ})`, "g");
const RE_GLIED = new RegExp(String.raw`(${ZITAT})(?=${ZITAT_TRENNER}§)`, "g");
const fuerVerweise = (t) =>
  t
    .replace(/\bNrn\.(?=\s)/g, "Nummern")
    .replace(/\bAbs\.(?=\d)/g, "Abs. ")
    .replace(/des Baugesetzbuchs/g, "des BauGB")
    .replace(RE_KETTE, (kette, gesetz) => (/^des\s+(dieses|Gesetzes)\b/.test(gesetz) ? kette : kette.replace(RE_GLIED, `$1 ${gesetz}`)));

// Alle Zeichen des Inhalts einschließlich Hochgestelltem und Listenmarken (für die Gegenprüfung).
function alleZeichen(nodes) {
  let out = "";
  for (const n of nodes) {
    if (typeof n === "string") out += n;
    else if (n.t === "dl") for (const it of n.items) out += " " + it.dt + " " + alleZeichen(it.c) + " ";
    else if (n.c) out += " " + alleZeichen(n.c) + " ";
  }
  return out;
}

// ---------- Hauptprogramm ----------

async function main() {
  const quelle = await ladeQuelle();
  const seiten = leseRohtext(quelle.roh);
  const abgerufen = kopfwert(quelle.roh, "Abgerufen");
  const pdfInfo = kopfwert(quelle.roh, "PDF");
  const sha256 = pdfInfo.match(/SHA-256 ([0-9a-f]{64})/)?.[1];
  const erstellt = pdfInfo.match(/erstellt (\d{4})-(\d\d)-(\d\d)/);

  // --- Titelseite: Titel, Fassung, Notifizierungs-Fußnote
  const titelseite = seiten[0].zeilen;
  const tz = titelseite.map((z) => z.text.replace(/\s+/g, " ").trim());
  const iMbo = tz.indexOf("– MBO –");
  const iInhalt = tz.indexOf("Inhaltsverzeichnis");
  if (tz[0] !== TITEL.toUpperCase() || iMbo < 0 || iInhalt < iMbo) throw new Error("Titelseite hat sich verändert.");
  const fassungszeile = tz.slice(iMbo + 1, iInhalt).join(" ");
  if (fassungszeile !== STAND.toUpperCase() + "*") throw new Error(`Fassungszeile hat sich geändert: „${fassungszeile}“`);
  const notifizierung = titelseite.filter(istFussnotenbereich).map((z) => z.text.trim()).join(" ").replace(/\s+/g, " ");
  if (!notifizierung.startsWith("* Notifiziert")) throw new Error("Fußnote der Titelseite nicht gefunden.");

  // --- Gegenprüfung 1: jede Seite, alle Zeichen ohne Leerraum
  const seitenPruefung = [];
  const abbildungen = []; // je Seite: unsere Zeichen -> pdftotext / pypdf
  const ptSeiten = quelle.pdftotext.split("\f");
  const pySeiten = quelle.pypdf.split("\f");
  for (const s of seiten) {
    const eigen = ohneLeerraum(s.zeilen.map((z) => z.text).join("\n"));
    // pypdf extract_text() gibt die Seitenzahl zuerst aus (Reihenfolge im Inhaltsstrom); für den
    // Vergleich stellen wir sie ans Seitenende – dorthin, wo sie in unseren Zeilen steht.
    let py = pySeiten[s.nr - 1] ?? "";
    const sz = py.trimStart().match(/^(\d+)\s/);
    if (sz && sz[1] === String(s.nr)) py = py.trimStart().slice(sz[0].length) + "\n" + sz[1];
    const pt = ohneLeerraum(ptSeiten[s.nr - 1] ?? "");
    const pyz = ohneLeerraum(py);
    const aPt = abbildung(eigen.zeichen, pt.zeichen);
    const aPy = abbildung(eigen.zeichen, pyz.zeichen);
    abbildungen.push({ eigen, pt, py: pyz, mapPt: aPt.map, mapPy: aPy.map });
    seitenPruefung.push({ seite: s.nr, pdftotext: aPt.abweichungen, pypdf: aPy.abweichungen, zeichen: eigen.zeichen });
  }
  const seitenFehler = seitenPruefung.filter((p) => p.pdftotext.length || p.pypdf.length);

  // Zeichenbereiche der Zeilen innerhalb ihrer Seite (für Gegenprüfung 2)
  for (const s of seiten) {
    let pos = 0;
    for (const z of s.zeilen) {
      const n = ohneLeerraum(z.text).zeichen.length;
      z.bereich = [pos, pos + n];
      pos += n;
    }
  }

  // --- Aufbau
  const { normen: roh, vorspann, ueberschriftZeilen } = baueNormen(seiten);
  if (protokoll.trennstriche.filter((t) => t.includes("(R1)")).length !== ERWARTET.silbentrennung)
    throw new Error(`Anzahl der Silbentrennungen weicht ab – SILBENTRENNUNG prüfen. Alle Zeilenend-Bindestriche:\n${protokoll.trennstriche.join("\n")}`);
  if (protokoll.satznummerZeichen.length !== ERWARTET.satznummerZeichen)
    throw new Error(`R2: ${protokoll.satznummerZeichen.length} statt ${ERWARTET.satznummerZeichen} Satznummern als Zeichen „²“ – bitte prüfen:\n${protokoll.satznummerZeichen.join("\n")}`);

  // --- Gegenprüfung 2: jeder Paragraph gegen pdftotext (ohne Leerraum). Erlaubt sind nur die
  // dokumentierten Reparaturen: entfallener Trennstrich (R1) und „²“ -> „2“ (R2).
  const normPruefung = [];
  for (const n of roh) {
    const vergleich = [];
    let luecke = false;
    for (const z of n.zeilen) {
      const a = abbildungen[z.seite - 1];
      for (let k = z.bereich[0]; k < z.bereich[1]; k++) {
        const j = a.mapPt[k];
        if (j < 0) luecke = true;
        else vergleich.push(a.pt.zeichen[j]);
      }
    }
    const json = ohneLeerraum(alleZeichen(n.inhalt)).zeichen;
    const { abweichungen } = abbildung(json, vergleich);
    const unerklaert = abweichungen.filter((d) => !(d.weg === "" && d.neu === "-") && !(d.weg === "2" && d.neu === "²"));
    normPruefung.push({ bez: n.bez, ok: !luecke && !unerklaert.length, abweichungen, unerklaert, zeichen: json.length });
  }
  const normFehler = normPruefung.filter((p) => !p.ok);
  // Die erklärten Abweichungen müssen genau den gezählten Reparaturen entsprechen.
  const erklaert = normPruefung.flatMap((p) => p.abweichungen.filter((d) => !p.unerklaert.includes(d)));
  if (erklaert.filter((d) => d.neu === "-").length !== ERWARTET.silbentrennung || erklaert.filter((d) => d.neu === "²").length !== ERWARTET.satznummerZeichen)
    throw new Error("Gegenprüfung: Abweichungen passen nicht zu den gezählten Reparaturen R1 / R2.");

  // --- Vollständigkeit: jede Zeile ist Titelseite/Inhaltsverzeichnis, Überschrift, Normtext,
  // Seitenzahl oder Fußnote – keine Zeile fehlt, keine ist doppelt.
  const zugeordnet = new Map();
  const zuordnen = (z, was) => {
    if (zugeordnet.has(z)) throw new Error(`Zeile doppelt zugeordnet (S. ${z.seite}): ${z.text}`);
    zugeordnet.set(z, was);
  };
  vorspann.forEach((z) => zuordnen(z, "vorspann"));
  ueberschriftZeilen.forEach((z) => zuordnen(z, "ueberschrift"));
  roh.forEach((n) => n.zeilen.forEach((z) => zuordnen(z, "normtext")));
  const zaehler = { vorspann: 0, ueberschrift: 0, normtext: 0, seitenzahl: 0, fussnote: 0 };
  for (const s of seiten)
    for (const z of s.zeilen) {
      if (istSeitenzahl(z)) zuordnen(z, "seitenzahl");
      else if (istFussnotenbereich(z)) zuordnen(z, "fussnote");
      if (!zugeordnet.has(z)) throw new Error(`Zeile nicht zugeordnet (S. ${z.seite}): ${z.text}`);
      zaehler[zugeordnet.get(z)] += ohneLeerraum(z.text).zeichen.length;
    }

  // --- Inhaltsverzeichnis mit den Überschriften vergleichen (nur zur Information)
  const verzeichnis = [];
  const vz = vorspann.filter((z) => z.seite > 1 || z.y < titelseite[iInhalt].y);
  let vorEintrag = null;
  for (const z of vz) {
    const m = z.text.trim().match(/^§\s*(\d+[a-z]?)\s+(.*)$/);
    if (m) verzeichnis.push({ id: m[1], titel: m[2] });
    // eingerückte Fortsetzungszeile direkt unter einem Eintrag
    else if (vorEintrag && vorEintrag.seite === z.seite && vorEintrag.y - z.y < 16 && z.x > 100 && z.x < 140)
      verzeichnis[verzeichnis.length - 1].titel += " " + z.text.trim();
    vorEintrag = m || (vorEintrag && vorEintrag.y - z.y < 16 && z.x > 100 && z.x < 140) ? z : null;
  }
  const ivAbweichungen = [];
  for (const n of roh.filter((n) => !n.anlage)) {
    const e = verzeichnis.find((v) => v.id === n.id);
    const t = e?.titel.replace(/\s+/g, " ").trim();
    if (t !== n.titel) ivAbweichungen.push(`${n.bez}: Überschrift „${n.titel}“ – Inhaltsverzeichnis ${e ? `„${t}“` : "ohne Eintrag"}`);
  }

  // --- Leerzeichen: Wo weichen die Vergleichsextraktoren von der Regel ab? (informativ)
  const leer = { "nur pdftotext": [], "nur pypdf": [], "pdftotext und pypdf": [], "nur PDF": [], "PDF und pdftotext": [], "PDF und pypdf": [] };
  for (const s of seiten) {
    const a = abbildungen[s.nr - 1];
    for (const z of s.zeilen) {
      if (istSeitenzahl(z) || zugeordnet.get(z) !== "normtext") continue;
      const z0 = z.bereich[0];
      for (let k = z0 + 1; k < z.bereich[1]; k++) {
        const pdf = a.eigen.leerDavor[k];
        const pt = a.mapPt[k] >= 0 && a.mapPt[k - 1] === a.mapPt[k] - 1 ? a.pt.leerDavor[a.mapPt[k]] : pdf;
        const py = a.mapPy[k] >= 0 && a.mapPy[k - 1] === a.mapPy[k] - 1 ? a.py.leerDavor[a.mapPy[k]] : pdf;
        if (pdf === pt && pdf === py) continue;
        const kat = pdf ? (pt ? "PDF und pdftotext" : py ? "PDF und pypdf" : "nur PDF") : pt && py ? "pdftotext und pypdf" : pt ? "nur pdftotext" : "nur pypdf";
        const ctx = a.eigen.zeichen.slice(Math.max(z0, k - 14), k).join("") + (pdf ? "␣" : "|") + a.eigen.zeichen.slice(k, Math.min(z.bereich[1], k + 14)).join("");
        leer[kat].push(`S. ${s.nr}: ${ctx}`);
      }
    }
  }

  // --- Normen fertigstellen
  const vorhanden = new Set(roh.map((n) => n.id));
  const reihenfolge = roh.map((n) => n.id);
  if (vorhanden.size !== roh.length) throw new Error("Doppelte Paragraphennummern.");
  const normen = roh.map((n) => {
    const text = alsText(n.inhalt);
    return {
      id: n.id,
      bez: n.bez,
      titel: n.titel,
      gliederung: n.gliederung,
      weggefallen: /^\(?(weggefallen|aufgehoben)\)?$/i.test(n.titel) || /^\(?(weggefallen|aufgehoben)\)?$/i.test(text) || !text,
      inhalt: n.inhalt,
      text,
      fussnoten: n.fussnoten || undefined,
      url: `${PDF_URL}#page=${n.seite}`,
      verweise: extrahiereVerweise(fuerVerweise(text), vorhanden, reihenfolge, "MBO").filter((v) => v !== n.id),
    };
  });

  const gesetz = {
    id: "mbo",
    kurz: "MBO",
    titel: TITEL,
    ebene: "Muster der Bauministerkonferenz",
    stand: STAND,
    fussnote: notifizierung,
    quelle: {
      name: "Deutsches Institut für Bautechnik (DIBt) – Musterbauordnung",
      url: PDF_URL,
      fassung: erstellt ? `PDF vom ${erstellt[3]}.${erstellt[2]}.${erstellt[1]}` : "",
      sha256,
      abgerufen,
    },
    normen,
  };

  // Interne Hilfsfelder (Einordnung des Hochgestellten, Seite) nicht speichern
  const ohneIntern = (k, v) => (k === "art" || k === "seite" || k === "repariert" ? undefined : v);
  fs.mkdirSync(path.dirname(ZIEL), { recursive: true });
  fs.writeFileSync(ZIEL, JSON.stringify(gesetz, ohneIntern, 1));

  // --- Prüfprotokoll
  const zeilen = [
    "Prüfprotokoll MBO-Import – erzeugt von scripts/import-mbo.mjs (nicht von Hand bearbeiten)",
    `Quelle: ${PDF_URL}`,
    `PDF: ${pdfInfo}`,
    `Abgerufen: ${abgerufen}`,
    "",
    "1. Seitenvergleich (alle Zeichen ohne Leerraum): pypdf-Textoperatoren (mbo.txt) gegen pdftotext -layout und pypdf extract_text()",
    `   ${seiten.length - seitenFehler.length}/${seiten.length} Seiten identisch` + (seitenFehler.length ? ":" : "."),
    ...seitenFehler.flatMap((p) => [...p.pdftotext.map((d) => `   S. ${p.seite} pdftotext: „${d.weg}“ -> „${d.neu}“`), ...p.pypdf.map((d) => `   S. ${p.seite} pypdf: „${d.weg}“ -> „${d.neu}“`)]),
    "",
    "2. Paragraphenvergleich: Inhalt in mbo.json (mit Hochgestelltem und Listenmarken) gegen pdftotext, ohne Leerraum",
    `   ${normPruefung.length - normFehler.length}/${normPruefung.length} Einträge identisch (bis auf die dokumentierten Reparaturen R1 und R2)` + (normFehler.length ? ":" : "."),
    ...normFehler.map((p) => `   ${p.bez}: ${p.unerklaert.map((d) => `„${d.weg}“ -> „${d.neu}“`).join("; ") || "Zeichen ohne Entsprechung"}`),
    ...normPruefung.filter((p) => p.ok && p.abweichungen.length).map((p) => `   ${p.bez}: erklärt durch Reparatur: ${p.abweichungen.map((d) => `„${d.neu}“ -> „${d.weg}“`).join("; ")}`),
    "",
    "3. Vollständigkeit (Zeichen ohne Leerraum je Art der Zeile)",
    `   Titelseite + Inhaltsverzeichnis ${zaehler.vorspann}, Überschriften ${zaehler.ueberschrift}, Normtext ${zaehler.normtext}, Seitenzahlen ${zaehler.seitenzahl}, Fußnotenbereiche ${zaehler.fussnote}`,
    `   Summe ${Object.values(zaehler).reduce((a, b) => a + b, 0)} = alle Zeichen des PDF ${seitenPruefung.reduce((a, p) => a + p.zeichen.length, 0)}`,
    "",
    `4. Zeilenende mit Bindestrich (R1) – ${protokoll.trennstriche.length} Fälle`,
    ...protokoll.trennstriche.map((t) => "   " + t),
    "",
    `5. Satznummer als Zeichen „²“ (R2) – ${protokoll.satznummerZeichen.length} Fälle`,
    ...protokoll.satznummerZeichen.map((t) => "   " + t),
    "",
    `6. Hochgestelltes: ${protokoll.hochgestellt.satz} Satznummern, ${protokoll.hochgestellt.fussnote} Fußnotenzeichen, ${protokoll.hochgestellt.einheit} Einheiten (m²/m³)`,
    ...protokoll.fussnotenOhneText.map((t) => "   " + t),
    ...protokoll.fussnotenOhneZeichen.map((t) => "   " + t),
    ...(protokoll.satzfolgen.length ? ["   Ungewöhnliche Satznummernfolgen:", ...protokoll.satzfolgen.map((t) => "     " + t)] : ["   Satznummern: in jedem Absatz lückenlos 1, 2, 3, …"]),
    "",
    "7. Gliederung, Absätze, Listen",
    ...protokoll.ueberschriften.map((t) => "   " + t),
    ...protokoll.absatzfolgen.map((t) => "   " + t),
    ...protokoll.listen.map((t) => "   " + t),
    ...(protokoll.absatzfolgen.length ? [] : ["   Absatznummern: in jedem Paragraphen lückenlos (1), (2), …"]),
    "",
    `8. Inhaltsverzeichnis des PDF gegen Überschriften im Text (maßgeblich ist die Überschrift) – ${ivAbweichungen.length} Abweichungen`,
    ...ivAbweichungen.map((t) => "   " + t),
    "",
    "9. Leerzeichen: Abweichungen der Vergleichsextraktoren von den Leerzeichen-Zeichen im PDF (informativ;",
    "   übernommen werden immer die Leerzeichen-Zeichen des PDF). ␣ = Leerzeichen im PDF, | = keins.",
    ...Object.entries(leer).flatMap(([kat, liste]) => [`   ${kat}: ${liste.length}`, ...liste.map((t) => "     " + t)]),
  ];
  fs.writeFileSync(DATEI_PRUEFUNG, zeilen.join("\n") + "\n");

  const aktiv = normen.filter((n) => !n.weggefallen).length;
  console.log(`MBO importiert: ${normen.length} Einträge (${aktiv} in Kraft), Stand: ${gesetz.stand}`);
  console.log(`Seitenvergleich: ${seiten.length - seitenFehler.length}/${seiten.length} Seiten identisch mit pdftotext und pypdf (ohne Leerraum)`);
  console.log(`Paragraphenvergleich: ${normPruefung.length - normFehler.length}/${normPruefung.length} identisch mit pdftotext (bis auf dokumentierte Reparaturen)`);
  console.log(`Prüfprotokoll: ${path.relative(ROOT, DATEI_PRUEFUNG)}`);
  if (seitenFehler.length || normFehler.length) {
    console.error("ACHTUNG: Abweichungen gefunden – siehe Prüfprotokoll.");
    process.exitCode = 1;
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
