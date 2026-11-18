// Gemeinsame Bausteine für Importe aus NI-VORIS, dem Niedersächsischen
// Vorschrifteninformationssystem (voris.wolterskluwer-online.de).
// Genutzt von scripts/import-ndschg.mjs und scripts/import-nbauo.mjs.
//
// Grundregel: Der Gesetzestext wird NICHT verändert. Wir übernehmen den Wortlaut exakt aus dem
// HTML von NI-VORIS und speichern nur zusätzlich seine Struktur (Absätze, Nummern, Buchstaben).
// Einzige Bearbeitung: Leerraum aus dem HTML-Quelltext (Zeilenumbrüche/Einrückungen, doppelte
// Leerzeichen) wird – wie im Browser – zu einem Leerzeichen zusammengefasst. Geschützte
// Leerzeichen (U+00A0) bleiben wie in der Quelle erhalten.
//
// So kommt der Text zustande (wie im Browser bei „Gesamte Quelle anzeigen“):
//   1. Stammdokument des Gesetzes laden  -> Stand, gültige Fassung, Link „Gesamte Quelle anzeigen“
//   2. Seite „Gesamte Quelle anzeigen“   -> enthält die ersten Paragraphen direkt …
//   3. … die übrigen lädt die Seite per Drupal-AJAX nach (POST /browse/source/ajax/<id>).
//      Diese Endpunkte rufen wir nacheinander mit kleinen Pausen ab.
//
// NI-VORIS behält sich Text- und Data-Mining vor (§ 44b Abs. 3 UrhG): wenige Abrufe, Pausen,
// neutraler User-Agent; Rohdaten nur lokal unter data/quellen/<gesetz>/ (nicht versioniert).

import { DOMParser } from "@xmldom/xmldom";
import fs from "node:fs";
import path from "node:path";

export const BASIS = "https://voris.wolterskluwer-online.de";
export const PAUSE_MS = 1200;
const HEADERS = { "User-Agent": "paragecko/0.1 (Import-Skript, einzelner Abruf eines Gesetzes)" };

export const pause = (ms) => new Promise((r) => setTimeout(r, ms));

export async function holeText(url, optionen = {}) {
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

// Lädt Stammdokument, „Gesamte Quelle“ und die nachgeladenen Teile (oder liest sie mit --offline
// aus quellDir). Rohdaten: dokument.html, quelle.html, nachgeladen.json.
export async function ladeQuelle(quellDir, dokumentUrl) {
  const DATEI_DOKUMENT = path.join(quellDir, "dokument.html");
  const DATEI_QUELLE = path.join(quellDir, "quelle.html");
  const DATEI_NACHGELADEN = path.join(quellDir, "nachgeladen.json");
  fs.mkdirSync(quellDir, { recursive: true });
  if (!process.argv.includes("--offline")) {
    // Erst alles laden, dann speichern – so bleiben die Rohdaten bei einem Abbruch konsistent.
    // 1. Stammdokument
    const dokument = await holeText(dokumentUrl);
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
    // Abrufdatum = Zeitpunkt, zu dem die Rohdaten gespeichert wurden
    abgerufen: new Date(fs.statSync(DATEI_QUELLE).mtime).toISOString().slice(0, 10),
  };
}

// Setzt die Seite so zusammen, wie der Browser sie nach dem Nachladen zeigt.
export function zusammensetzen(quelle, nachgeladen) {
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

// Gültige Fassung laut Versionsverlauf des Stammdokuments, z. B. „ab 20.12.2023 (aktuelle Fassung)“
export function aktuelleFassung(dokument) {
  const fassung = dokument.match(/-versions-block"[\s\S]*?<h2[^>]*>([^<]*)<\/h2>/)?.[1].trim() ?? "";
  const m = fassung.match(/ab (\d\d)\.(\d\d)\.(\d{4}) \(aktuelle Fassung\)/);
  if (!m) throw new Error(`Aktuelle Fassung nicht erkennbar: „${fassung}“`);
  return { fassung, gueltigAb: `${m[3]}-${m[2]}-${m[1]}` };
}

// ---------- HTML -> Knotenbaum ----------

const parser = new DOMParser({ onError: () => {} });
export const parseFragment = (html) => parser.parseFromString(`<div>${html}</div>`, "text/html");

export const kinder = (el) => Array.from(el.childNodes ?? []);
export const tag = (el) => (el.nodeType === 1 ? (el.localName || el.nodeName).toLowerCase() : "");
export const klassen = (el) => (el.getAttribute?.("class") ?? "").split(/\s+/);
export const hatKlasse = (el, k) => el.nodeType === 1 && klassen(el).includes(k);
export const elemente = (el) => kinder(el).filter((k) => k.nodeType === 1);
export function finde(el, pred) {
  for (const k of elemente(el)) {
    if (pred(k)) return k;
    const t = finde(k, pred);
    if (t) return t;
  }
  return null;
}
export const text = (el) => (el ? el.textContent : "");

// Hochgestellte Satznummern (<sup class="satz">1</sup>, z. B. in der NBauO). Sie bleiben im
// Inhalt als {t:"sup"} erhalten; im reinen Text (Feld "text") fehlen sie (siehe alsText).
// Gemerkt wird das hier, nicht als Eigenschaft am Knoten – so bleibt das JSON-Schema unverändert.
export const SATZNUMMERN = new WeakSet();

// Inline-Inhalt (Text, Verweis-Links, Hervorhebungen)
export function inline(node) {
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
    case "sup": {
      const k = { t: "sup", c: inhalt() };
      if (hatKlasse(node, "satz")) SATZNUMMERN.add(k);
      return [k];
    }
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

export const leer = (el) => !normWs(text(el)).trim() && !finde(el, (e) => ["br", "img", "table"].includes(tag(e)));

// Folge von Blöcken (<p>, <ol>, …) innerhalb eines Absatzes oder Listenpunkts.
// Aufeinanderfolgende <p> werden durch einen Zeilenumbruch getrennt;
// Text nach einer Liste folgt direkt (wie beim BauGB). Leere <p></p> (kommen in
// NI-VORIS nach jeder Liste vor) werden übersprungen.
export function bloecke(container) {
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
export function liste(ol) {
  const items = [];
  for (const li of elemente(ol).filter((e) => tag(e) === "li")) {
    const num = elemente(li).find((e) => endetAuf(e, "listnum"));
    const punkt = elemente(li).find((e) => endetAuf(e, "listenpunkt"));
    if (!num || !punkt) throw new Error(`Unbekannter Listenaufbau: ${li.toString().slice(0, 200)}`);
    items.push({ dt: normWs(text(num)).trim(), c: bloecke(punkt) });
  }
  return { t: "dl", items };
}

export function tabelle(table) {
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
export const normWs = (s) => s.replace(/[ \t\r\n]+/g, " ");

export function aufraeumen(nodes) {
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

export function trimmen(nodes) {
  if (typeof nodes[0] === "string") nodes[0] = nodes[0].trimStart();
  const l = nodes.length - 1;
  if (typeof nodes[l] === "string") nodes[l] = nodes[l].trimEnd();
  return nodes.filter((n) => n !== "");
}

// Reiner Text (für Suche, Prüfung und Verweis-Erkennung) – wie in import-baugb.mjs,
// aber Text, der nach einer Liste weitergeht („… beseitigen⏎will.“), beginnt in einer
// neuen Zeile statt direkt am letzten Listenpunkt zu kleben.
// Hochgestelltes: Satznummern fehlen (sonst klebten sie am Wort: „1Bauliche“), Exponenten
// von Maßeinheiten erscheinen als Zeichen („m<sup>2</sup>“ -> „m²“) – wie in import-mbo.mjs.
// Die weggelassene Satznummer trennt im reinen Text wie ein Leerzeichen: Steht in der Quelle
// hinter ihr noch eines („ist. ²␣Die“), fällt es weg (kein doppeltes Leerzeichen); fehlt das
// Leerzeichen davor („bereitzuhalten.⁶Die“), steht dort eines. Der Inhalt bleibt unverändert.
const HOCH = { 2: "²", 3: "³" };
export function alsText(nodes) {
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
    else if (n.t === "table") out += n.rows.map((r) => r.join(" | ")).join("\n") + "\n";
    else if (n.t === "pre" || n.t === "hinweis") out += n.v + "\n";
    else if (n.t === "sup" && n.c.length === 1 && HOCH[n.c[0]]) out += HOCH[n.c[0]];
    else if (n.c) out += alsText(n.c);
  }
  return out.replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
}

// Inhalt eines Paragraphen: jeder <div class="jurabsatz…"> ist ein Absatz.
// Der Normtext steht in NI-VORIS immer in solchen Absatz-Containern. Ein loses <p>
// direkt im Dokument ist ein redaktioneller Hinweis von NI-VORIS (beim NDSchG nur
// § 38: „Änderung hier nicht wiedergegeben.“) und wird als {t:"hinweis"} gespeichert.
// <div class="tfe-fuss"> ist die Schlussformel (Ort, Datum, Unterzeichner) hinter dem
// letzten Paragraphen; sie wird nicht dem Paragraphen zugeschlagen, sondern separat gespeichert.
export function normInhalt(body) {
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

export function schlussformel(body) {
  const fuss = finde(body, (e) => hatKlasse(e, "tfe-fuss"));
  if (!fuss) return "";
  return alsText(trimmen(aufraeumen(bloecke(fuss))));
}

export function fussnotenText(body) {
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

// Abschnitte der Seite der Reihe nach: Gliederungsüberschriften und Dokumente (<article>).
// Liefert { ueberschrift } (Text der <h4>, z. B. „§§ 1 - 5, Erster Teil - Allgemeine Vorschriften“)
// oder { id, titelZeile, body } je Dokument.
export function stuecke(html) {
  return [...html.matchAll(/<h4 class="section_header">([\s\S]*?)<\/h4>|<article\b[\s\S]*?<\/article>/g)].map((s) => {
    if (s[1] !== undefined) return { ueberschrift: normWs(text(parseFragment(s[1]).documentElement)).trim() };
    const doc = parseFragment(s[0]);
    const article = finde(doc.documentElement, (e) => tag(e) === "article");
    return {
      id: article.getAttribute("id").replace(/_wkde-document$/, ""),
      titelZeile: normWs(text(finde(article, (e) => hatKlasse(e, "wkde-doctitle")))).replace(/ /g, " ").trim(),
      body: finde(article, (e) => hatKlasse(e, "wkde-document-body")),
    };
  });
}

// „§§ 1 - 5, Erster Teil - Allgemeine Vorschriften“ -> „Erster Teil – Allgemeine Vorschriften“
export function gliederungAusUeberschrift(h) {
  const m = h.match(/^§§?\s*[\dA-Za-z]+(?:\s*-\s*[\dA-Za-z]+)?,\s*(.+?)\s+-\s+(.+)$/);
  if (!m) throw new Error(`Unbekannte Gliederungsüberschrift: ${h}`);
  return `${m[1]} – ${m[2]}`;
}

// Kopfdaten aus dem Stammdokument: Ausfertigung („Vom …“) und letzte Änderung („Zuletzt geändert …“).
// Die redaktionelle Anmerkung von VORIS ist kein Gesetzestext -> wird bewusst nicht übernommen.
export function kopfDaten(kopfBody) {
  const kopfZeilen = elemente(kopfBody)
    .filter((e) => tag(e) === "p")
    .map((p) => normWs(kinder(p).flatMap(inline).filter((x) => typeof x === "string").join("")).trim());
  const ausfertigung = kopfZeilen.find((z) => /^Vom \d/.test(z)) ?? "";
  const stand = kopfZeilen.find((z) => /^Zuletzt geändert/.test(z)) ?? "";
  if (!stand) throw new Error("Stand („Zuletzt geändert durch …“) nicht gefunden.");
  return { ausfertigung, stand };
}

// Nur für die Verweis-Erkennung (der gespeicherte Text bleibt unverändert):
// NI-VORIS-Texte kürzen „Abs.“ und „Nr.“ ab und nennen andere Gesetze oft per Abkürzung
// hinter der Paragraphenangabe („§ 36 NEG“). scripts/lib/verweise.mjs wurde für das
// BauGB geschrieben und kennt beides nicht – daher schreiben wir es vorher aus:
//   „§ 2 Abs. 1 der …“ -> „§ 2 Absatz 1 der …“,  „§ 36 NEG“ -> „§ 36 des NEG“ (= anderes Gesetz)
const istAbkuerzung = (w) => /^[A-ZÄÖÜ][A-Za-zÄÖÜäöü]*[A-ZÄÖÜ][A-Za-zÄÖÜäöü]*$/.test(w) && !/^[IVXLC]+$/.test(w);
export function fuerVerweise(t) {
  return t
    .replace(/ /g, " ")
    .replace(/\bAbs\.(?= )/g, "Absatz")
    .replace(/\bNr\.(?= )/g, "Nummer")
    .replace(/(\d[a-z]?) ([A-Za-zÄÖÜäöü]+)\b/g, (m, zahl, wort) => (istAbkuerzung(wort) ? `${zahl} des ${wort}` : m));
}
