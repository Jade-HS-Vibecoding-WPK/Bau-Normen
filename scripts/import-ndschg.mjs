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
//
// Rohdaten landen unter data/quellen/ndschg/ (dokument.html, quelle.html, nachgeladen.json).
//
// Aufruf:  npm run import:ndschg             (lädt die aktuelle Fassung herunter, ca. 50 Abrufe, ~1 Minute)
//          npm run import:ndschg -- --offline (nutzt die bereits gespeicherten Rohdaten)

import { DOMParser } from "@xmldom/xmldom";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { extrahiereVerweise } from "./lib/verweise.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const QUELL_DIR = path.join(ROOT, "data", "quellen", "ndschg");
const ZIEL = path.join(ROOT, "data", "gesetze", "ndschg.json");

const BASIS = "https://voris.wolterskluwer-online.de";
// Stammdokument „DSchG,NI - Denkmalschutzgesetz“ in NI-VORIS (zeigt immer die aktuelle Fassung)
const DOKUMENT_URL = BASIS + "/browse/document/b053748c-c363-37c6-b26f-3d52606c6272";
const PAUSE_MS = 1200;
const HEADERS = { "User-Agent": "bau-normen-ki/0.1 (Import-Skript, einzelner Abruf eines Gesetzes)" };

const DATEI_DOKUMENT = path.join(QUELL_DIR, "dokument.html");
const DATEI_QUELLE = path.join(QUELL_DIR, "quelle.html");
const DATEI_NACHGELADEN = path.join(QUELL_DIR, "nachgeladen.json");

const pause = (ms) => new Promise((r) => setTimeout(r, ms));

async function holeText(url, optionen = {}) {
  const res = await fetch(url, { ...optionen, headers: { ...HEADERS, ...(optionen.headers ?? {}) } });
  if (!res.ok) throw new Error(`Download fehlgeschlagen (${url}): HTTP ${res.status}`);
  return res.text();
}

// Platzhalter, die NI-VORIS per JavaScript nachlädt
function platzhalter(html) {
  const re = /<div class="js-lazyload-law[^"]*" data-id="([^"]+)" data-uri="([^"]+)"><\/div>/g;
  return [...html.matchAll(re)].map((m) => ({ id: m[1], uri: m[2] }));
}

function drupalSettings(html) {
  const m = html.match(/<script type="application\/json" data-drupal-selector="drupal-settings-json">([^<]*)<\/script>/);
  return m ? JSON.parse(m[1]) : {};
}

async function ladeQuelle() {
  fs.mkdirSync(QUELL_DIR, { recursive: true });
  if (!process.argv.includes("--offline")) {
    // Erst alles laden, dann speichern – so bleiben die Rohdaten bei einem Abbruch konsistent.
    // 1. Stammdokument
    const dokument = await holeText(DOKUMENT_URL);
    const link = dokument.match(/href="(\/browse\/source\/[^"]+)"[^>]*>(?:(?!<\/a>)[\s\S])*Gesamte Quelle anzeigen/);
    if (!link) throw new Error("Link „Gesamte Quelle anzeigen“ nicht gefunden – hat sich die Seite geändert?");

    // 2. Gesamte Quelle
    await pause(PAUSE_MS);
    const quelle = await holeText(BASIS + link[1].replace(/&amp;/g, "&"));

    // 3. Nachgeladene Teile (so wie es drupal ajax im Browser tut)
    const settings = drupalSettings(quelle);
    const teile = platzhalter(quelle);
    const nachgeladen = [];
    for (const [i, t] of teile.entries()) {
      await pause(PAUSE_MS);
      const body = new URLSearchParams({
        _drupal_ajax: "1",
        "ajax_page_state[theme]": settings.ajaxPageState?.theme ?? "voris_nds",
        "ajax_page_state[libraries]": settings.ajaxPageState?.libraries ?? "",
      });
      const antwort = await holeText(BASIS + t.uri + "?_wrapper_format=drupal_ajax", {
        method: "POST",
        body,
        headers: { "X-Requested-With": "XMLHttpRequest", Accept: "application/json, text/javascript, */*; q=0.01" },
      });
      nachgeladen.push({ id: t.id, uri: t.uri, antwort: JSON.parse(antwort) });
      process.stdout.write(`\rNachgeladen: ${i + 1}/${teile.length}`);
    }
    process.stdout.write("\n");
    fs.writeFileSync(DATEI_DOKUMENT, dokument);
    fs.writeFileSync(DATEI_QUELLE, quelle);
    fs.writeFileSync(DATEI_NACHGELADEN, JSON.stringify(nachgeladen, null, 1));
  }
  for (const f of [DATEI_DOKUMENT, DATEI_QUELLE, DATEI_NACHGELADEN])
    if (!fs.existsSync(f)) throw new Error(`Rohdatei fehlt: ${f} (erst ohne --offline ausführen)`);
  return {
    dokument: fs.readFileSync(DATEI_DOKUMENT, "utf8"),
    quelle: fs.readFileSync(DATEI_QUELLE, "utf8"),
    nachgeladen: JSON.parse(fs.readFileSync(DATEI_NACHGELADEN, "utf8")),
  };
}

// Setzt die Seite so zusammen, wie der Browser sie nach dem Nachladen zeigt.
function zusammensetzen(quelle, nachgeladen) {
  const start = quelle.indexOf('<div id="block-voris-nds-content"');
  let html = quelle.slice(start >= 0 ? start : 0);
  for (const t of nachgeladen) {
    const insert = t.antwort.find((c) => c.command === "insert" && c.selector === `[data-id="${t.id}"]`);
    if (!insert) throw new Error(`Keine Inhalte für nachgeladenen Teil ${t.id}`);
    const re = new RegExp(`<div class="js-lazyload-law[^"]*" data-id="${t.id}" data-uri="[^"]+"></div>`);
    if (!re.test(html)) throw new Error(`Platzhalter ${t.id} nicht gefunden`);
    html = html.replace(re, () => insert.data);
  }
  if (platzhalter(html).length) throw new Error("Es sind noch nicht geladene Teile übrig.");
  return html;
}

// ---------- HTML -> Knotenbaum ----------

const parser = new DOMParser({ onError: () => {} });
const parseFragment = (html) => parser.parseFromString(`<div>${html}</div>`, "text/html");

const kinder = (el) => Array.from(el.childNodes ?? []);
const tag = (el) => (el.nodeType === 1 ? (el.localName || el.nodeName).toLowerCase() : "");
const klassen = (el) => (el.getAttribute?.("class") ?? "").split(/\s+/);
const hatKlasse = (el, k) => el.nodeType === 1 && klassen(el).includes(k);
const elemente = (el) => kinder(el).filter((k) => k.nodeType === 1);
function finde(el, pred) {
  for (const k of elemente(el)) {
    if (pred(k)) return k;
    const t = finde(k, pred);
    if (t) return t;
  }
  return null;
}
const text = (el) => (el ? el.textContent : "");

// Inline-Inhalt (Text, Verweis-Links, Hervorhebungen)
function inline(node) {
  if (node.nodeType === 3) return node.nodeValue ? [node.nodeValue] : [];
  if (node.nodeType !== 1) return [];
  const name = tag(node);
  const inhalt = () => kinder(node).flatMap(inline);
  if (name === "a" && hatKlasse(node, "footnote-link")) return []; // Fußnotenzeichen „(1)“
  switch (name) {
    case "br":
      return [{ t: "br" }];
    case "strong":
    case "b":
      return [{ t: "b", c: inhalt() }];
    case "em":
    case "i":
      return [{ t: "i", c: inhalt() }];
    case "sup":
      return [{ t: "sup", c: inhalt() }];
    case "sub":
      return [{ t: "sub", c: inhalt() }];
    case "ol":
    case "ul":
      return [liste(node)];
    case "table":
      return [tabelle(node)];
    case "p":
    case "div":
      return bloecke(node);
    default:
      return inhalt(); // a (Verweis), span, …
  }
}

const leer = (el) => !normWs(text(el)).trim() && !finde(el, (e) => ["br", "img", "table"].includes(tag(e)));

// Folge von Blöcken (<p>, <ol>, …) innerhalb eines Absatzes oder Listenpunkts.
// Aufeinanderfolgende <p> werden durch einen Zeilenumbruch getrennt;
// Text nach einer Liste folgt direkt (wie beim BauGB). Leere <p></p> (kommen in
// NI-VORIS nach jeder Liste vor) werden übersprungen.
function bloecke(container) {
  const out = [];
  let letzteWarText = false;
  for (const k of kinder(container)) {
    const name = tag(k);
    if (name === "p") {
      if (leer(k)) continue;
      if (letzteWarText) out.push({ t: "br" });
      out.push(...kinder(k).flatMap(inline));
      letzteWarText = true;
    } else if (name === "ol" || name === "ul") {
      out.push(liste(k));
      letzteWarText = false;
    } else if (name === "table") {
      out.push(tabelle(k));
      letzteWarText = false;
    } else {
      const c = inline(k);
      out.push(...c);
      if (c.length && !(k.nodeType === 3 && !k.nodeValue.trim())) letzteWarText = true;
    }
  }
  return out;
}

// Nummern-/Buchstabenlisten. NI-VORIS nutzt zwei Varianten:
//   <ol class="num_liste">        <li><div class="listnum">1.</div><div class="listenpunkt"><p>…</p></div></li>
//   <ol class="eingeb_num_liste"> <li><div class="eingeb_listnum">1.</div><div class="eingeb_listenpunkt">…</div></li>
const endetAuf = (el, k) => el.nodeType === 1 && klassen(el).some((c) => c === k || c.endsWith("_" + k));
function liste(ol) {
  const items = [];
  for (const li of elemente(ol).filter((e) => tag(e) === "li")) {
    const num = elemente(li).find((e) => endetAuf(e, "listnum"));
    const punkt = elemente(li).find((e) => endetAuf(e, "listenpunkt"));
    if (!num || !punkt) throw new Error(`Unbekannter Listenaufbau: ${li.toString().slice(0, 200)}`);
    items.push({ dt: normWs(text(num)).trim(), c: bloecke(punkt) });
  }
  return { t: "dl", items };
}

function tabelle(table) {
  const rows = [];
  const sammle = (el) => {
    for (const k of elemente(el)) {
      if (tag(k) === "tr") rows.push(elemente(k).filter((z) => ["td", "th"].includes(tag(z))).map((z) => normWs(text(z)).trim()));
      else sammle(k);
    }
  };
  sammle(table);
  return { t: "table", rows };
}

// Leerraum aus dem HTML-Quelltext wie im Browser zusammenfassen
// (geschützte Leerzeichen U+00A0 bleiben unangetastet).
const normWs = (s) => s.replace(/[ \t\r\n]+/g, " ");

function aufraeumen(nodes) {
  const out = [];
  for (const n of nodes) {
    if (typeof n === "string") {
      const s = normWs(n);
      if (typeof out[out.length - 1] === "string") out[out.length - 1] += s;
      else if (s) out.push(s);
    } else {
      if (n.c) n.c = aufraeumen(n.c);
      if (n.items) for (const it of n.items) it.c = trimmen(aufraeumen(it.c));
      out.push(n);
    }
  }
  // Leerzeichen an Blockgrenzen (vor/nach Listen und Umbrüchen) entfernen
  for (let i = 0; i < out.length; i++) {
    if (typeof out[i] !== "string") continue;
    const vor = out[i - 1], nach = out[i + 1];
    if (vor && typeof vor !== "string" && (vor.t === "dl" || vor.t === "br" || vor.t === "table")) out[i] = out[i].trimStart();
    if (nach && typeof nach !== "string" && (nach.t === "dl" || nach.t === "br" || nach.t === "table")) out[i] = out[i].trimEnd();
  }
  return out.filter((n) => n !== "");
}

function trimmen(nodes) {
  if (typeof nodes[0] === "string") nodes[0] = nodes[0].trimStart();
  const l = nodes.length - 1;
  if (typeof nodes[l] === "string") nodes[l] = nodes[l].trimEnd();
  return nodes.filter((n) => n !== "");
}

// Reiner Text (für Suche, Prüfung und Verweis-Erkennung) – wie in import-baugb.mjs,
// aber Text, der nach einer Liste weitergeht („… beseitigen⏎will.“), beginnt in einer
// neuen Zeile statt direkt am letzten Listenpunkt zu kleben.
export function alsText(nodes) {
  let out = "";
  let nachListe = false;
  for (const n of nodes) {
    const warListe = nachListe;
    nachListe = typeof n !== "string" && n.t === "dl";
    if (typeof n === "string") out += (warListe ? "\n" : "") + n;
    else if (n.t === "p") out += (out && !out.endsWith("\n") ? "\n" : "") + alsText(n.c) + "\n";
    else if (n.t === "br") out += "\n";
    else if (n.t === "dl") for (const it of n.items) out += "\n" + it.dt + " " + alsText(it.c);
    else if (n.t === "table") out += n.rows.map((r) => r.join(" | ")).join("\n") + "\n";
    else if (n.t === "pre" || n.t === "hinweis") out += n.v + "\n";
    else if (n.c) out += alsText(n.c);
  }
  return out.replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
}

// Inhalt eines Paragraphen: jeder <div class="jurabsatz…"> ist ein Absatz.
// Der Normtext steht in NI-VORIS immer in solchen Absatz-Containern. Ein loses <p>
// direkt im Dokument ist ein redaktioneller Hinweis von NI-VORIS (beim NDSchG nur
// § 38: „Änderung hier nicht wiedergegeben.“) und wird als {t:"hinweis"} gespeichert.
// <div class="tfe-fuss"> ist die Schlussformel (Ort, Datum, Unterzeichner) hinter § 41;
// sie wird nicht dem Paragraphen zugeschlagen, sondern separat gespeichert.
function normInhalt(body) {
  const inhalt = [];
  for (const k of elemente(body)) {
    if (klassen(k).some((c) => c.startsWith("jurabsatz"))) inhalt.push({ t: "p", c: trimmen(aufraeumen(bloecke(k))) });
    else if (hatKlasse(k, "footnote") || hatKlasse(k, "tfe-fuss")) continue;
    else if (tag(k) === "p") {
      if (!leer(k)) inhalt.push({ t: "hinweis", v: normWs(text(k)).trim() });
    } else throw new Error(`Unbekanntes Element im Normtext: <${tag(k)} class="${klassen(k).join(" ")}">`);
  }
  return inhalt;
}

function schlussformel(body) {
  const fuss = finde(body, (e) => hatKlasse(e, "tfe-fuss"));
  if (!fuss) return "";
  return alsText(trimmen(aufraeumen(bloecke(fuss))));
}

// Nur für die Verweis-Erkennung (der gespeicherte Text bleibt unverändert):
// Das NDSchG kürzt „Abs.“ und „Nr.“ ab und nennt andere Gesetze oft per Abkürzung
// hinter der Paragraphenangabe („§ 36 NEG“). scripts/lib/verweise.mjs wurde für das
// BauGB geschrieben und kennt beides nicht – daher schreiben wir es vorher aus:
//   „§ 2 Abs. 1 der …“ -> „§ 2 Absatz 1 der …“,  „§ 36 NEG“ -> „§ 36 des NEG“ (= anderes Gesetz)
const istAbkuerzung = (w) => /^[A-ZÄÖÜ][A-Za-zÄÖÜäöü]*[A-ZÄÖÜ][A-Za-zÄÖÜäöü]*$/.test(w) && !/^[IVXLC]+$/.test(w);
function fuerVerweise(t) {
  return t
    .replace(/ /g, " ")
    .replace(/\bAbs\.(?= )/g, "Absatz")
    .replace(/\bNr\.(?= )/g, "Nummer")
    .replace(/(\d[a-z]?) ([A-Za-zÄÖÜäöü]+)\b/g, (m, zahl, wort) => (istAbkuerzung(wort) ? `${zahl} des ${wort}` : m));
}

function fussnotenText(body) {
  const notes = [];
  const sammle = (el) => {
    for (const k of elemente(el)) {
      if (hatKlasse(k, "footnote")) {
        const label = normWs(text(finde(k, (e) => hatKlasse(e, "footnote-label")))).trim();
        const inhalt = finde(k, (e) => hatKlasse(e, "footnote-content"));
        notes.push((label ? label + " " : "") + alsText(trimmen(aufraeumen(inhalt ? bloecke(inhalt) : []))));
      } else sammle(k);
    }
  };
  sammle(body);
  return notes.join("\n");
}

// ---------- Hauptprogramm ----------

async function main() {
  const { dokument, quelle, nachgeladen } = await ladeQuelle();
  const html = zusammensetzen(quelle, nachgeladen);

  // Gültige Fassung laut Versionsverlauf, z. B. „ab 20.12.2023 (aktuelle Fassung)“
  const fassung = dokument.match(/-versions-block"[\s\S]*?<h2[^>]*>([^<]*)<\/h2>/)?.[1].trim() ?? "";
  const gueltigAb = fassung.match(/ab (\d\d)\.(\d\d)\.(\d{4}) \(aktuelle Fassung\)/);
  if (!gueltigAb) throw new Error(`Aktuelle Fassung nicht erkennbar: „${fassung}“`);

  // Abschnitte der Seite der Reihe nach: Gliederungsüberschriften und Dokumente (<article>)
  const stuecke = [...html.matchAll(/<h4 class="section_header">([\s\S]*?)<\/h4>|<article\b[\s\S]*?<\/article>/g)];

  let gliederung = [];
  let kopf = null;
  let schluss = "";
  const normen = [];
  for (const s of stuecke) {
    if (s[1] !== undefined) {
      // z. B. „§§ 1 - 5, Erster Teil - Allgemeine Vorschriften“
      const h = normWs(text(parseFragment(s[1]).documentElement)).trim();
      const m = h.match(/^§§?\s*[\dA-Za-z]+(?:\s*-\s*[\dA-Za-z]+)?,\s*(.+?)\s+-\s+(.+)$/);
      if (!m) throw new Error(`Unbekannte Gliederungsüberschrift: ${h}`);
      gliederung = [`${m[1]} – ${m[2]}`];
      continue;
    }
    const doc = parseFragment(s[0]);
    const article = finde(doc.documentElement, (e) => tag(e) === "article");
    const id = article.getAttribute("id").replace(/_wkde-document$/, "");
    const titelZeile = normWs(text(finde(article, (e) => hatKlasse(e, "wkde-doctitle")))).replace(/ /g, " ").trim();
    const body = finde(article, (e) => hatKlasse(e, "wkde-document-body"));

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

  // Kopfdaten aus dem Stammdokument: Ausfertigung, letzte Änderung, Red. Anmerkung
  const kopfZeilen = elemente(kopf.body)
    .filter((e) => tag(e) === "p")
    .map((p) => normWs(kinder(p).flatMap(inline).filter((x) => typeof x === "string").join("")).trim());
  const ausfertigung = kopfZeilen.find((z) => /^Vom \d/.test(z)) ?? "";
  const stand = kopfZeilen.find((z) => /^Zuletzt geändert/.test(z)) ?? "";
  if (!stand) throw new Error("Stand („Zuletzt geändert durch …“) nicht gefunden.");
  // Die redaktionelle Anmerkung von VORIS ist kein Gesetzestext -> wird bewusst nicht übernommen.

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
    gueltigAb: `${gueltigAb[3]}-${gueltigAb[2]}-${gueltigAb[1]}`,
    ausfertigung,
    schlussformel: schluss || undefined,
    quelle: {
      name: "Niedersächsisches Vorschrifteninformationssystem (NI-VORIS) – voris.wolterskluwer-online.de",
      url: DOKUMENT_URL,
      fassung,
      abgerufen: new Date(fs.statSync(DATEI_QUELLE).mtime).toISOString().slice(0, 10),
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
