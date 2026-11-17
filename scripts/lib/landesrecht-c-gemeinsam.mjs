// Gemeinsame Bausteine für scripts/import-landesrecht-c.mjs (Landesbauordnungen und
// Denkmalschutzgesetze aus Bayern, Nordrhein-Westfalen, Sachsen, Brandenburg und Bremen).
//
// Grundregel wie bei allen Importen: Der Gesetzestext wird NICHT verändert. Wir übernehmen den
// Wortlaut exakt aus dem HTML des amtlichen Landesportals und speichern zusätzlich seine Struktur
// (Absätze, Nummern, Buchstaben). Einzige Bearbeitung: Leerraum aus dem HTML-Quelltext
// (Zeilenumbrüche/Einrückungen, doppelte Leerzeichen) wird – wie im Browser – zu einem
// Leerzeichen zusammengefasst. Geschützte Leerzeichen (U+00A0) bleiben wie in der Quelle.
//
// Inhalt dieser Datei:
//   - ein kleiner, fehlertoleranter HTML-Parser (die Portale liefern HTML, das kein XML ist:
//     offene <li>, <br> ohne Schrägstrich, benannte Entitäten wie &auml;)
//   - Abruf mit Pausen (mindestens 1,2 s je Host, bei BRAVORS 20 s laut robots.txt „Crawl-delay“)
//     und Ablage der Rohdaten unter data/quellen/landesrecht/<id>/ (nicht versioniert)
//   - Umwandlung in den Knotenbaum (TextKnoten) und reinen Text (alsText aus voris.mjs)
//   - Verweis-Erkennung auch für „Art.“ (Bayern zählt in Artikeln)
//   - Werkzeuge für die Gegenprüfung (Zeichenvergleich ohne Leerraum, PDF-Text über pdftotext)

import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { extrahiereVerweise } from "./verweise.mjs";
import { aufraeumen, trimmen, SATZNUMMERN, normWs } from "./voris.mjs";

export { aufraeumen, trimmen, SATZNUMMERN, normWs };

export const OFFLINE = process.argv.includes("--offline");
export const PRUEFEN = process.argv.includes("--pruefen");

// ---------- HTML-Parser ----------
//
// Erzeugt einen einfachen Baum: Element = { name, attrs, kinder, eltern }, Text = { text }.
// Entitäten werden aufgelöst (unbekannte Entitäten -> Fehler, damit nichts still verloren geht).
// Wie im Browser: leere Elemente (br, hr, img …) haben keine Kinder, <li>/<dt>/<dd>/<p>/<tr>/<td>
// schließen gleichartige offene Elemente, ein End-Tag ohne passendes offenes Element wird ignoriert.

const LEER = new Set(["area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "param", "source", "track", "wbr"]);
const ROH = new Set(["script", "style", "textarea", "title"]);
const BLOCK = new Set([
  "address", "article", "aside", "blockquote", "div", "dl", "fieldset", "footer", "form", "h1", "h2", "h3", "h4", "h5", "h6",
  "header", "hr", "main", "nav", "ol", "p", "pre", "section", "table", "ul",
]);

const ENTITAETEN = {
  amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: "\u00a0", shy: "\u00ad",
  auml: "ä", ouml: "ö", uuml: "ü", Auml: "Ä", Ouml: "Ö", Uuml: "Ü", szlig: "ß",
  sect: "§", para: "¶", deg: "°", sup1: "¹", sup2: "²", sup3: "³", frac12: "½", frac14: "¼", frac34: "¾",
  ndash: "–", mdash: "—", bdquo: "„", ldquo: "“", rdquo: "”", sbquo: "‚", lsquo: "‘", rsquo: "’",
  laquo: "«", raquo: "»", hellip: "…", middot: "·", bull: "•", euro: "€", copy: "©", reg: "®", times: "×",
  eacute: "é", egrave: "è", aacute: "á", agrave: "à", oacute: "ó", ccedil: "ç", Eacute: "É", ecirc: "ê",
  ensp: "\u2002", emsp: "\u2003", thinsp: "\u2009", zwnj: "\u200c", zwj: "\u200d", lrm: "\u200e", rlm: "\u200f",
  plusmn: "±", micro: "µ", acute: "´", uml: "¨", cedil: "¸", ordm: "º", ordf: "ª", iexcl: "¡", iquest: "¿",
  le: "≤", ge: "≥", ne: "≠", minus: "−", rarr: "→", larr: "←", harr: "↔", trade: "™", dagger: "†",
};

export function entitaeten(s) {
  return s.replace(/&(#x[0-9a-fA-F]+|#\d+|[A-Za-z][A-Za-z0-9]*);/g, (m, e) => {
    if (e[0] === "#") return String.fromCodePoint(e[1] === "x" || e[1] === "X" ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10));
    if (e in ENTITAETEN) return ENTITAETEN[e];
    throw new Error(`Unbekannte HTML-Entität: ${m}`);
  });
}

function attribute(s) {
  const attrs = {};
  const re = /([^\s=/>]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g;
  let m;
  while ((m = re.exec(s))) attrs[m[1].toLowerCase()] = entitaeten(m[2] ?? m[3] ?? m[4] ?? "");
  return attrs;
}

export function parseHtml(html, { xml = false } = {}) {
  const wurzel = { name: "#wurzel", attrs: {}, kinder: [], eltern: null };
  const stapel = [wurzel];
  const oben = () => stapel[stapel.length - 1];
  const offen = (name) => stapel.findLastIndex((e) => e.name === name);
  const schliesseBis = (i) => stapel.splice(i);
  // schließt gleichartige offene Elemente innerhalb der nächsten Grenze (z. B. <li> bis <ol>/<ul>)
  const schliesseGleiche = (namen, grenzen) => {
    for (let i = stapel.length - 1; i > 0; i--) {
      if (grenzen.includes(stapel[i].name)) return;
      if (namen.includes(stapel[i].name)) return schliesseBis(i);
    }
  };
  const re = /<!--[\s\S]*?-->|<!\[CDATA\[[\s\S]*?\]\]>|<![^>]*>|<\?[\s\S]*?\?>|<\/([A-Za-z][\w:.-]*)\s*>|<([A-Za-z][\w:.-]*)((?:\s+[^\s=/>]+(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+))?)*)\s*(\/?)>/g;
  let pos = 0;
  let m;
  const text = (s) => {
    if (s) oben().kinder.push({ text: entitaeten(s), eltern: oben() });
  };
  while ((m = re.exec(html))) {
    text(html.slice(pos, m.index));
    pos = re.lastIndex;
    if (m[1]) {
      const name = m[1].toLowerCase();
      const i = offen(name);
      if (i > 0) schliesseBis(i);
      continue;
    }
    if (!m[2]) continue; // Kommentar, Doctype, Verarbeitungsanweisung
    const name = m[2].toLowerCase();
    if (xml) {
      const el = { name, attrs: attribute(m[3] ?? ""), kinder: [], eltern: oben() };
      oben().kinder.push(el);
      if (!m[4]) stapel.push(el);
      continue;
    }
    if (name === "li") schliesseGleiche(["li"], ["ol", "ul"]);
    else if (name === "dt" || name === "dd") schliesseGleiche(["dt", "dd"], ["dl"]);
    else if (name === "tr") schliesseGleiche(["tr", "td", "th"], ["table", "tbody", "thead", "tfoot"]);
    else if (name === "td" || name === "th") schliesseGleiche(["td", "th"], ["tr", "table"]);
    else if (name === "option") schliesseGleiche(["option"], ["select"]);
    if (BLOCK.has(name) || name === "li" || name === "dt" || name === "dd") {
      const p = offen("p");
      // <p> wird durch einen Block geschlossen – aber nicht über eine Listen-/Tabellengrenze hinweg
      if (p > 0 && !stapel.slice(p + 1).some((e) => ["li", "dd", "dt", "td", "th", "div"].includes(e.name))) schliesseBis(p);
    }
    const el = { name, attrs: attribute(m[3] ?? ""), kinder: [], eltern: oben() };
    oben().kinder.push(el);
    if (ROH.has(name)) {
      const ende = html.toLowerCase().indexOf(`</${name}`, pos);
      const inhalt = html.slice(pos, ende < 0 ? html.length : ende);
      if (inhalt) el.kinder.push({ text: name === "title" || name === "textarea" ? entitaeten(inhalt) : inhalt, eltern: el });
      pos = ende < 0 ? html.length : html.indexOf(">", ende) + 1;
      re.lastIndex = pos;
      continue;
    }
    if (!LEER.has(name) && !m[4]) stapel.push(el);
  }
  text(html.slice(pos));
  return wurzel;
}

// ---------- DOM-Helfer ----------

export const istText = (k) => k && k.text !== undefined;
export const istEl = (k) => k && k.name !== undefined;
export const tag = (k) => (istEl(k) ? k.name : "");
export const attr = (k, n) => (istEl(k) ? k.attrs[n] ?? null : null);
export const klassen = (k) => (attr(k, "class") ?? "").split(/\s+/).filter(Boolean);
export const hatKlasse = (k, c) => klassen(k).includes(c);
export const kinder = (k) => (istEl(k) ? k.kinder : []);
export const elemente = (k) => kinder(k).filter(istEl);
export function finde(k, pred) {
  for (const e of elemente(k)) {
    if (pred(e)) return e;
    const t = finde(e, pred);
    if (t) return t;
  }
  return null;
}
export function findeAlle(k, pred, out = []) {
  for (const e of elemente(k)) {
    if (pred(e)) out.push(e);
    else findeAlle(e, pred, out);
  }
  return out;
}
export const textVon = (k) => (istText(k) ? k.text : kinder(k).map(textVon).join(""));
export const leerText = (k) => !normWs(textVon(k)).trim() && !finde(k, (e) => ["img", "table"].includes(e.name));
export const zeile = (k) => normWs(textVon(k)).trim();

// ---------- Abruf ----------

export const PAUSE_MS = 1200;
const UA = "bau-normen-ki/0.1 (Import-Skript, einzelner Abruf eines Gesetzes)";
// Wartezeit je Host: mindestens 1,2 s; BRAVORS verlangt in robots.txt „Crawl-delay: 20“
const WARTEN = { "bravors.brandenburg.de": 20000 };
const letzterAbruf = new Map();
export const pause = (ms) => new Promise((r) => setTimeout(r, ms));
export let abrufZahl = 0;

export async function abrufen(url, { binaer = false, methode = "GET", body, headers = {} } = {}) {
  const host = new URL(url).host;
  const warten = Math.max(PAUSE_MS, WARTEN[host] ?? 0);
  const zuletzt = letzterAbruf.get(host);
  if (zuletzt) await pause(Math.max(0, zuletzt + warten - Date.now()));
  for (let versuch = 1; ; versuch++) {
    letzterAbruf.set(host, Date.now());
    abrufZahl++;
    const res = await fetch(url, { method: methode, body, headers: { "User-Agent": UA, ...headers }, redirect: "follow" });
    if (res.ok) {
      const daten = binaer ? Buffer.from(await res.arrayBuffer()) : await res.text();
      return { daten, url: res.url, typ: res.headers.get("content-type") ?? "" };
    }
    if ((res.status === 503 || res.status === 429) && versuch < 3) {
      console.log(`  ${url}: HTTP ${res.status} – neuer Versuch in 30 s`);
      await pause(30000);
      continue;
    }
    throw new Error(`Download fehlgeschlagen (${url}): HTTP ${res.status}`);
  }
}

// Rohdatei laden: mit --offline aus dem Quellordner, sonst frisch abrufen und speichern.
// immer=false: nur abrufen, wenn die Datei fehlt (für Prüfdateien).
export async function rohdatei(datei, url, { binaer = false, immer = true, ...opt } = {}) {
  fs.mkdirSync(path.dirname(datei), { recursive: true });
  const vorhanden = fs.existsSync(datei);
  if ((immer && !OFFLINE) || !vorhanden) {
    if (OFFLINE && immer) throw new Error(`Rohdatei fehlt: ${datei} (erst ohne --offline ausführen)`);
    const { daten } = await abrufen(url, { binaer, ...opt });
    fs.writeFileSync(datei, daten);
  }
  return binaer ? fs.readFileSync(datei) : fs.readFileSync(datei, "utf8");
}

export const abrufdatum = (datei) => new Date(fs.statSync(datei).mtime).toISOString().slice(0, 10);

// ---------- Knotenbaum ----------

// Hochgestellte Satznummer merken (bleibt im Inhalt {t:"sup"}, fehlt im Feld "text")
export function satznummer(c) {
  const k = { t: "sup", c };
  SATZNUMMERN.add(k);
  return k;
}

// Inline-Inhalt eines Elements in Knoten umwandeln. regeln:
//   ignorieren(el)  -> true: Element samt Inhalt weglassen (z. B. Fußnotenzeichen)
//   satz(el)        -> true: <sup> ist eine Satznummer
//   element(el, weiter) -> optional eigene Behandlung (Rückgabe: Knoten-Array oder undefined)
export function inlineKnoten(k, regeln = {}) {
  if (istText(k)) return k.text ? [k.text] : [];
  if (!istEl(k)) return [];
  if (regeln.ignorieren?.(k)) return [];
  const weiter = () => kinder(k).flatMap((x) => inlineKnoten(x, regeln));
  const eigen = regeln.element?.(k, weiter);
  if (eigen !== undefined) return eigen;
  switch (k.name) {
    case "br":
      return [{ t: "br" }];
    case "b":
    case "strong":
      return [{ t: "b", c: weiter() }];
    case "i":
    case "em":
      return [{ t: "i", c: weiter() }];
    case "sup":
      return regeln.satz?.(k) ? [satznummer(weiter())] : [{ t: "sup", c: weiter() }];
    case "sub":
      return [{ t: "sub", c: weiter() }];
    case "table":
      return [tabelle(k)];
    case "img":
      throw new Error(`Bild im Normtext: ${attr(k, "src")}`);
    default:
      return weiter();
  }
}

export function tabelle(table) {
  const rows = [];
  const sammle = (el) => {
    for (const k of elemente(el)) {
      if (k.name === "tr") rows.push(elemente(k).filter((z) => z.name === "td" || z.name === "th").map(zeile));
      else if (k.name !== "table") sammle(k);
    }
  };
  sammle(table);
  return { t: "table", rows };
}

// Reiner Text (für Suche, Prüfung und Verweis-Erkennung) – wie alsText in voris.mjs (Satznummern
// fehlen und trennen wie ein Leerzeichen, „m<sup>2</sup>“ -> „m²“, Text nach einer Liste in neuer
// Zeile), aber ohne Kürzen innerhalb von Hervorhebungen: In voris.mjs wird der Inhalt von <b>/<i>
// einzeln getrimmt („<b>[Amtl. Anm.:] </b>Betrifft“ -> „[Amtl. Anm.:]Betrifft“).
const HOCH = { 2: "²", 3: "³" };
// Weiche Trennzeichen (U+00AD, unsichtbar) bleiben im Inhalt wie in der Quelle, fehlen aber im
// Feld "text", damit die Suche „Erkenntnisse“ auch bei „Er\u00adkenntnisse“ findet.
const WEICHES_TRENNZEICHEN = new RegExp(String.fromCharCode(0xad), "g");
export function alsText(nodes) {
  return textRoh(nodes).replace(WEICHES_TRENNZEICHEN, "").replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
}
function textRoh(nodes) {
  let out = "";
  let nachListe = false;
  let nachSatznummer = false;
  for (let n of nodes) {
    if (typeof n !== "string" && n.t === "sup" && SATZNUMMERN.has(n)) {
      nachSatznummer = true;
      continue;
    }
    if (typeof n === "string" && nachSatznummer) {
      if (nachListe || /(^|[ \n])$/.test(out)) n = n.replace(/^ +/, "");
      else if (!/^[ \n]/.test(n)) n = " " + n;
    }
    nachSatznummer = false;
    const warListe = nachListe;
    nachListe = typeof n !== "string" && n.t === "dl";
    if (typeof n === "string") out += (warListe ? "\n" : "") + n;
    else if (n.t === "p") out += (out && !out.endsWith("\n") ? "\n" : "") + alsText(n.c) + "\n";
    else if (n.t === "br") out += "\n";
    else if (n.t === "dl") for (const it of n.items) out += "\n" + it.dt + " " + alsText(it.c);
    else if (n.t === "table") out += (out && !out.endsWith("\n") ? "\n" : "") + n.rows.map((r) => r.join(" | ")).join("\n") + "\n";
    else if (n.t === "pre" || n.t === "hinweis") out += n.v + "\n";
    else if (n.t === "sup" && n.c.length === 1 && HOCH[n.c[0]]) out += HOCH[n.c[0]];
    else if (n.c) out += textRoh(n.c);
  }
  return out;
}

// Absatz fertigstellen: Leerraum zusammenfassen, Ränder kürzen
export const absatz = (knoten) => ({ t: "p", c: trimmen(aufraeumen(knoten)) });
export const fertig = (knoten) => trimmen(aufraeumen(knoten));

// Text beginnt mit einer Absatznummer „(1)“, „(2a)“?
export const ABSATZNR = /^\s*\(\d+[a-z]?\)/;
export function beginntMitAbsatz(knoten) {
  const erster = knoten.find((k) => typeof k !== "string" || k.trim());
  return typeof erster === "string" && ABSATZNR.test(erster);
}

// Gliederungsüberschrift „Teil 1“ + „Allgemeine Vorschriften“ -> „Teil 1 – Allgemeine Vorschriften“
export const gliederungText = (bez, titel) => (titel ? `${normWs(bez).trim()} – ${normWs(titel).trim()}` : normWs(bez).trim());

// Rang einer Gliederungsebene (kleiner = höher)
export function gliederungsRang(bez) {
  if (/\bBuch\b/.test(bez)) return 0;
  if (/\bKapitel\b/.test(bez)) return 1;
  if (/\bTeil\b/.test(bez)) return 2;
  if (/\bUnterabschnitt\b/.test(bez)) return 4;
  if (/\bAbschnitt\b/.test(bez)) return 3;
  if (/\bTitel\b/.test(bez)) return 5;
  throw new Error(`Unbekannte Gliederungsebene: ${bez}`);
}
// Neue Überschrift in die laufende Gliederung einsetzen (tiefere Ebenen fallen weg)
export function gliederungSetzen(liste, eintrag) {
  const rang = gliederungsRang(eintrag);
  const behalten = liste.filter((e) => gliederungsRang(e) < rang);
  return [...behalten, eintrag];
}

export const istWeggefallen = (titel, klartext) =>
  /^\(?\s*(weggefallen|aufgehoben|nicht mehr belegt)\s*\)?$/i.test(titel.trim()) ||
  /^[-–—]*\s*\(?\s*(weggefallen|aufgehoben|nicht mehr belegt)\s*\)?\s*[-–—]*$/i.test((klartext ?? "").trim());

// ---------- Verweise ----------

// Nur für die Erkennung (der gespeicherte Text bleibt unverändert). scripts/lib/verweise.mjs kennt
// nur „§“; Bayern zählt in Artikeln („Art. 6 Abs. 1“). Bei Gesetzen mit Artikeln wird deshalb „§“
// (das dort nur auf andere Gesetze zeigt, z. B. „§ 34 BauGB“) neutralisiert und „Art.“ zu „§“.
export function verweiseErkennen(normen, { kuerzel, artikel = false }) {
  const vorhanden = new Set(normen.map((n) => n.id));
  const reihenfolge = normen.map((n) => n.id);
  const eigenes = kuerzel.split(" ")[0];
  for (const n of normen) {
    let t = (n.text ?? "").replace(/\u00a0/g, " ");
    if (artikel) t = t.replace(/§/g, "¶").replace(/\bArt\.(?=\s*\d)/g, "§");
    t = t
      .replace(/\bAbs\.(?= )/g, "Absatz")
      .replace(/\bNr\.(?= )/g, "Nummer")
      .replace(/\bBuchst\.(?= )/g, "Buchstabe");
    n.verweise = extrahiereVerweise(t, vorhanden, reihenfolge, eigenes).filter((v) => v !== n.id);
  }
}

// ---------- Gegenprüfung ----------

export const ohneLeerraum = (s) => s.replace(/[\s\u00a0\u2002\u2003\u2009\u200b\u202f\ufeff]+/g, "");

// Alle Zeichen des gespeicherten Inhalts in Lesereihenfolge, einschließlich Satznummern,
// Exponenten und Listenmarken (wie in import-nbauo.mjs)
export function alleZeichen(nodes) {
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

// Zeichenvergleich ohne Leerraum. Liefert { gleich, ab, soll, ist } (ab = erste Abweichung).
export function vergleiche(soll, ist) {
  const a = ohneLeerraum(soll);
  const b = ohneLeerraum(ist);
  let ab = 0;
  while (ab < a.length && a[ab] === b[ab]) ab++;
  return { gleich: a === b, ab, zeichen: b.length, soll: a.slice(ab, ab + 50), ist: b.slice(ab, ab + 50) };
}

// Text einer PDF-Datei über xpdf/poppler „pdftotext“ (UTF-8, Lesereihenfolge)
// layout: Spalten wie auf der Seite; raw: Reihenfolge wie im Inhaltsstrom des PDF
export function pdfText(pdfDatei, { layout = false, raw = false } = {}) {
  const modus = layout ? "layout" : raw ? "raw" : "";
  const txt = pdfDatei.replace(/\.pdf$/i, modus ? `.${modus}.txt` : ".txt");
  if (!fs.existsSync(txt) || fs.statSync(txt).mtimeMs < fs.statSync(pdfDatei).mtimeMs) {
    execFileSync("pdftotext", [...(modus ? [`-${modus}`] : []), "-enc", "UTF-8", pdfDatei, txt]);
  }
  return fs.readFileSync(txt, "utf8");
}

// Vergleich mit einem fortlaufenden Textstrom (z. B. PDF): Ab Position `start` im Strom (ohne
// Leerraum) müssen alle Zeichen von `ist` folgen. Toleriert nur Silbentrennung am Zeilenende im
// PDF: Ein Trennstrich, der im Strom als „\u00ad“ markiert ist (siehe stromAusText), darf fehlen.
// Liefert { gleich, ende (Position im Strom danach), getrennt (Zahl übersprungener Trennstriche) }.
export function vergleicheStrom(strom, start, ist) {
  const b = ohneLeerraum(ist);
  let i = start;
  let j = 0;
  let getrennt = 0;
  let weich = 0;
  while (j < b.length) {
    if (i >= strom.length) return { gleich: false, ab: j, ende: i, getrennt, weich, ist: b.slice(j, j + 50), soll: "(Ende des Vergleichstexts)" };
    if (strom[i] === b[j]) { i++; j++; continue; }
    if (b[j] === "\u00ad") {
      // weiches Trennzeichen (U+00AD) im Quelltext: unsichtbar; im PDF fehlt es oder erscheint als Trennstrich
      if (strom[i] === "-") i++;
      j++; weich++; continue;
    }
    if (strom[i] === "\u00ad") {
      if (b[j] === "-") { i++; j++; continue; } // echter Bindestrich am Zeilenende
      i++; getrennt++; continue; // Silbentrennung des PDF
    }
    return { gleich: false, ab: j, ende: i, getrennt, weich, ist: b.slice(j, j + 50).replace(/\u00ad/g, "(SHY)"), soll: strom.slice(i, i + 50).replace(/\u00ad/g, "-") };
  }
  return { gleich: true, ende: i, getrennt, weich };
}

// Textstrom aus PDF-Text: Trennstrich am Zeilenende -> Marke U+00AD, dann Leerraum entfernen.
export function stromAusText(text) {
  return ohneLeerraum(text.replace(/-[ \t]*\r?\n/g, "\u00ad\n"));
}

// Sucht `ist` im Strom (ab `ab`) unter denselben Toleranzen wie vergleicheStrom
// Kandidaten werden in einer Kopie ohne Trenn-Marken und Bindestriche gesucht (eine Marke kann mitten im
// Suchanfang stehen); gepr\u00fcft wird dann mit vergleicheStrom ab der entsprechenden Stelle im Strom.
const suchKopien = new Map();
function suchKopie(strom) {
  if (!suchKopien.has(strom)) {
    let text = "";
    const pos = [];
    for (let i = 0; i < strom.length; i++) if (strom[i] !== "\u00ad" && strom[i] !== "-") (text += strom[i]), pos.push(i);
    suchKopien.set(strom, { text, pos });
  }
  return suchKopien.get(strom);
}
export function findeImStrom(strom, ist, ab = 0) {
  const kopf = ohneLeerraum(ist).replace(/[\u00ad-]/g, "").slice(0, 12);
  if (!kopf) return null;
  const { text, pos } = suchKopie(strom);
  for (let p = text.indexOf(kopf); p >= 0; p = text.indexOf(kopf, p + 1)) {
    if (pos[p] < ab) continue;
    // Beginnt `ist` mit einem Bindestrich, kann er unmittelbar vor der gefundenen Stelle stehen
    const start = pos[p] - (/^[\u00ad-]/.test(ohneLeerraum(ist)) && /[\u00ad-]/.test(strom[pos[p] - 1] ?? "") ? 1 : 0);
    const v = vergleicheStrom(strom, start, ist);
    if (v.gleich) return { ...v, start };
  }
  return null;
}

// ---------- Ausgabe ----------

export function schreibeGesetz(ziel, gesetz) {
  fs.mkdirSync(path.dirname(ziel), { recursive: true });
  fs.writeFileSync(ziel, JSON.stringify(gesetz, null, 1));
}

// ---------- ZIP (Bayern liefert das XML der Vorschrift als ZIP) ----------

// Liest die Einträge einer ZIP-Datei (zentrales Verzeichnis, „stored“ oder „deflate“).
export async function zipEintraege(buf) {
  const { inflateRawSync } = await import("node:zlib");
  let eocd = buf.length - 22;
  while (eocd >= 0 && buf.readUInt32LE(eocd) !== 0x06054b50) eocd--;
  if (eocd < 0) throw new Error("ZIP: Verzeichnisende nicht gefunden");
  const anzahl = buf.readUInt16LE(eocd + 10);
  let pos = buf.readUInt32LE(eocd + 16);
  const out = {};
  for (let i = 0; i < anzahl; i++) {
    if (buf.readUInt32LE(pos) !== 0x02014b50) throw new Error("ZIP: zentrales Verzeichnis beschädigt");
    const methode = buf.readUInt16LE(pos + 10);
    const komprimiert = buf.readUInt32LE(pos + 20);
    const groesse = buf.readUInt32LE(pos + 24);
    const nlen = buf.readUInt16LE(pos + 28), xlen = buf.readUInt16LE(pos + 30), clen = buf.readUInt16LE(pos + 32);
    const lokal = buf.readUInt32LE(pos + 42);
    const name = buf.toString("utf8", pos + 46, pos + 46 + nlen);
    const start = lokal + 30 + buf.readUInt16LE(lokal + 26) + buf.readUInt16LE(lokal + 28);
    const roh = buf.subarray(start, start + komprimiert);
    out[name] = methode === 0 ? roh : methode === 8 ? inflateRawSync(roh) : null;
    if (out[name] && out[name].length !== groesse) throw new Error(`ZIP: Größe von ${name} stimmt nicht`);
    pos += 46 + nlen + xlen + clen;
  }
  return out;
}
