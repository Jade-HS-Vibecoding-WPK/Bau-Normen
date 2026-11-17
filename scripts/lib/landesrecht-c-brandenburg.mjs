// Adapter für BRAVORS, das Brandenburgische Vorschriftensystem (bravors.brandenburg.de) der
// Landesregierung. robots.txt verlangt „Crawl-delay: 20“ – abrufen() wartet deshalb 20 s je Abruf.
// Die Nutzungshinweise verbieten den Abruf nicht.
//
// Quelle:  Reiter „Aktuelle Fassung“ (/gesetze/<name>): das ganze Gesetz auf einer Seite.
//          Aufbau: Inhaltsübersicht, dann je Vorschrift <h4> („§ 6<br>Abstandsflächen“) mit Anker
//          <a name="…">, Absätze als <p>, Aufzählungen als <ol>/<li>, Gliederung als <h2> (Teil) und
//          <h3> (Abschnitt). Deep Link: Seite + "#<Anker>" (die Anker sind laufende Nummern).
//
// Besonderheiten:
//   - Aufzählungen: Das HTML enthält keine Nummern – <ol> zählt der Browser (1., 2., …), Unterlisten
//     haben style="list-style-type: lower-alpha" (a, b, …). Wir setzen als Marke „1.“, „2.“ … bzw.
//     „a)“, „b)“ …, wie sie im Gesetz- und Verordnungsblatt stehen (Gegenprüfung mit dem GVBl).
//     <ol> ohne start-Attribut beginnen immer bei 1 bzw. a (geprüft: kein start-Attribut vorhanden).
//   - Redaktionelle Hinweise des Portals über der Inhaltsübersicht (z. B. „Weitere Änderungen …
//     treten am 1. Januar 2027 in Kraft“) sind kein Normtext; sie stehen in quelle.fassung.
//   - Versteckte Links „Einzelnorm“ (<p class="einzelnorm">) gehören nicht zum Text.
//   - Fußnote zum Gesetzestitel („1) Die Verpflichtungen aus der Richtlinie …“, am Seitenende) gehört
//     zu keiner Vorschrift; sie wird nicht übernommen und nur gemeldet.
//   - Anlage: nach dem letzten Paragraphen („Anlage (zu § 65 …)“, Überschrift <h3>, Zwischen-
//     überschriften <h4>) – eigener Eintrag "anlage"; Zwischenüberschriften fett ({t:"b"}).
//   - Absätze ({t:"p"}) beginnen bei „(1)“, „(2)“ …; weitere <p> sind neue Zeilen.
//
// Gegenprüfung: amtliches Gesetz- und Verordnungsblatt (PDF, auf BRAVORS verlinkt, Text über
// pdftotext -raw) – siehe pruefen().

import fs from "node:fs";
import path from "node:path";
import {
  rohdatei,
  abrufdatum,
  parseHtml,
  finde,
  findeAlle,
  elemente,
  kinder,
  istText,
  istEl,
  hatKlasse,
  attr,
  zeile,
  textVon,
  inlineKnoten,
  absatz,
  fertig,
  beginntMitAbsatz,
  gliederungSetzen,
  normWs,
  ohneLeerraum,
  pdfText,
  stromAusText,
  vergleicheStrom,
  findeImStrom,
} from "./landesrecht-c-gemeinsam.mjs";

const BASIS = "https://bravors.brandenburg.de";
const NAME = "BRAVORS – Brandenburgisches Vorschriftensystem der Landesregierung Brandenburg (bravors.brandenburg.de)";

export async function laden(def, quellDir) {
  const datei = path.join(quellDir, "gesetz.html");
  const html = await rohdatei(datei, BASIS + def.pfad);
  return { html, abgerufen: abrufdatum(datei) };
}

// Zeilen eines Elements, getrennt an <br>
function zeilenVon(el) {
  const z = [""];
  const lauf = (k) => {
    if (istText(k)) z[z.length - 1] += k.text;
    else if (k.name === "br") z.push("");
    else if (k.name === "a" && /^#\d+ab$/.test(attr(k, "href") ?? "")) return; // Fußnotenzeichen „1)“ am Titel
    else kinder(k).forEach(lauf);
  };
  kinder(el).forEach(lauf);
  return z.map((s) => normWs(s).trim());
}

const ALPHA = "abcdefghijklmnopqrstuvwxyz";
const marke = (ol, i) => (/lower-alpha/.test(attr(ol, "style") ?? "") ? `${ALPHA[i]})` : `${i + 1}.`);

function liste(ol) {
  if (attr(ol, "start") || attr(ol, "type")) throw new Error(`Liste mit start/type: ${JSON.stringify(ol.attrs)}`);
  const items = elemente(ol).map((li, i) => {
    if (li.name !== "li") throw new Error(`Unbekanntes Element in <ol>: <${li.name}>`);
    return { dt: marke(ol, i), c: fertig(blockKnoten(li)) };
  });
  return { t: "dl", items };
}

// Inhalt eines Containers (li): Text, <p> (durch Zeilenumbruch getrennt), Unterlisten
function blockKnoten(el) {
  const out = [];
  let letzteWarText = false;
  for (const k of kinder(el)) {
    if (istEl(k) && k.name === "ol") {
      out.push(liste(k));
      letzteWarText = false;
    } else if (istEl(k) && k.name === "p") {
      if (!textVon(k).trim()) continue;
      if (letzteWarText) out.push({ t: "br" });
      out.push(...inlineKnoten(k));
      letzteWarText = true;
    } else {
      const c = inlineKnoten(k);
      out.push(...c);
      if (c.length && !(istText(k) && !k.text.trim())) letzteWarText = true;
    }
  }
  return out;
}

// Text eines Elements für die Vollständigkeitsprüfung: wie im HTML, dazu an jedem <li> die Marke,
// die wir setzen („1.“, „a)“) – so prüft der Vergleich, dass nur diese Marken hinzukommen.
function quelltextVon(el) {
  if (istText(el)) return el.text;
  if (el.name === "ol") return elemente(el).map((li, i) => marke(el, i) + quelltextVon(li)).join("");
  return kinder(el).map(quelltextVon).join("");
}

// „Teil 1 <br>Allgemeine Vorschriften“ -> „Teil 1 – Allgemeine Vorschriften“
function gliederungAus(h) {
  const z = zeilenVon(h).filter(Boolean);
  if (z.length !== 2 || !/^(Teil|Abschnitt|Unterabschnitt|Kapitel)\s+\d+[a-z]?$/.test(z[0])) throw new Error(`Unbekannte Gliederungsüberschrift: ${z.join(" | ")}`);
  return `${z[0]} – ${z[1]}`;
}

// Dokumentierte Reparatur technischer Artefakte (einzige Änderung am Quell-HTML):
// Eine Entität mit doppeltem Semikolon mitten im Wort („Denkmalschutzbeh&ouml;;rde“, BbgDSchG § 13
// Abs. 1) ist ein Markup-Fehler – das zweite Semikolon gehört nicht zum Wortlaut (GVBl. I/04 Nr. 9
// S. 215: „Denkmalschutzbehörde“; die Gegenprüfung vergleicht § 13 mit dem GVBl.). Jede Reparatur
// wird beim Import gemeldet.
function reparieren(def, html, still = false) {
  const treffer = [];
  const neu = html.replace(/&([A-Za-z]+);;(?=[a-zäöüß])/g, (m, e, pos) => {
    treffer.push(`„${html.slice(Math.max(0, pos - 25), pos + m.length + 10).replace(/\s+/g, " ")}“`);
    return `&${e};`;
  });
  if (!still) for (const t of treffer) console.log(`  Reparatur ${def.kurz}: doppeltes Semikolon nach Entität entfernt in ${t}`);
  return neu;
}

// still: keine Meldungen (für die Versionsseite in der Gegenprüfung)
export function parsen(def, { html: roh }, { still = false } = {}) {
  const html = reparieren(def, roh, still);
  const doc = parseHtml(html);
  const kopfEl = finde(doc, (e) => hatKlasse(e, "reiterbox_innen_kopf"));
  const kz = zeilenVon(finde(kopfEl, (e) => e.name === "p")).filter(Boolean);
  // kz: ["Brandenburgische Bauordnung (BbgBO) 1)", "In der Fassung …", "(GVBl.I/18, [Nr. 39])", "zuletzt geändert durch …", "(GVBl.I/26, …)"]
  const titelZeile = normWs(textVon(finde(kopfEl, (e) => e.name === "strong"))).trim();
  const abk = titelZeile.match(/^(.*?)\s*\(([^()]*)\)$/);
  if (!abk || !abk[2].includes(def.kurz)) throw new Error(`Titel ohne Abkürzung ${def.kurz}: ${titelZeile}`);
  const iStand = kz.findIndex((z) => /^(zuletzt )?geändert durch/.test(z));
  if (iStand < 0) throw new Error(`„zuletzt geändert durch“ fehlt: ${kz.join(" | ")}`);
  const stand = [kz[iStand], kz[iStand + 1]].filter(Boolean).join(" ");
  const ausfertigung = kz.slice(1, iStand).join(" ");

  const text = finde(doc, (e) => hatKlasse(e, "reiterbox_innen_text"));
  const els = elemente(text);
  // Redaktionelle Hinweise des Portals (grün, fett) vor der Inhaltsübersicht
  const hinweise = [];
  const ersteNorm = els.findIndex((e) => e.name === "h4" && finde(e, (a) => a.name === "a" && attr(a, "name")));
  if (ersteNorm < 0) throw new Error("Keine Vorschrift gefunden");
  let start = ersteNorm;
  while (start > 0 && ["h2", "h3"].includes(els[start - 1].name)) start--;
  // „Hinweise:“ und die folgenden Absätze bis zur Inhaltsübersicht (verschachtelte <p> stehen nach dem
  // Parsen – wie im Browser – nebeneinander)
  let imHinweis = false;
  for (const e of els.slice(0, start)) {
    const t = zeile(e);
    if (e.name === "p" && /^Hinweise:$/.test(t)) imHinweis = true;
    else if (imHinweis && e.name === "p" && t && !/^Inhaltsübersicht/.test(t)) hinweise.push(t);
    else if (t) imHinweis = false;
  }

  const seite = BASIS + def.pfad;
  let gliederung = [];
  const normen = [];
  let aktuell = null; // laufende Vorschrift
  let laufend = null; // laufender Absatz
  const meldungen = [];
  let anlage = null;
  const neueNorm = (n) => {
    normen.push(n);
    aktuell = n;
    laufend = null;
  };
  const anhaengen = (knoten, quelle) => {
    if (!aktuell) throw new Error("Text vor der ersten Vorschrift");
    if (!laufend || beginntMitAbsatz(knoten)) aktuell.roh.push((laufend = []));
    else laufend.push({ t: "br" });
    laufend.push(...knoten);
    aktuell.quelltext += quelltextVon(quelle);
  };
  for (const e of els.slice(start)) {
    const t = zeile(e);
    if (e.name === "h2" || (e.name === "h3" && !anlage)) {
      if (anlage) throw new Error(`Gliederung nach der Anlage: ${t}`);
      gliederung = gliederungSetzen(gliederung, gliederungAus(e));
    } else if (e.name === "h4" && !anlage) {
      const a = finde(e, (x) => x.name === "a" && attr(x, "name"));
      const [bez, ...titelTeile] = zeilenVon(e).filter(Boolean);
      const m = bez.match(/^§\s*(\d+[a-z]?)$/);
      if (!m) throw new Error(`Unbekannte Überschrift: ${zeile(e)}`);
      neueNorm({ id: m[1], bez: `§ ${m[1]}`, titel: titelTeile.join(" "), gliederung: [...gliederung], roh: [], url: `${seite}#${attr(a, "name")}`, quelltext: "" });
    } else if (e.name === "p" && hatKlasse(e, "einzelnorm")) {
      continue;
    } else if (e.name === "p" && /^_{5,}/.test(t)) {
      meldungen.push(`Fußnote zum Gesetzestitel nicht übernommen: „${t.replace(/^_+/, "").slice(0, 90)} …“`);
    } else if (e.name === "p" && /^Anlage\b/.test(t) && aktuell && aktuell.bez !== "Anlage") {
      // „Anlage (zu § 65 Absatz 3 Nummer 3 und § 65a Absatz 1 Nummer 1)“ – Kopf der Anlage
      const [bezA, ...zu] = zeilenVon(e).filter(Boolean);
      const mA = bezA.match(/^(Anlage(?:\s+\d+)?)\s*(.*)$/);
      anlage = { id: mA[1].toLowerCase().replace(/\s+/g, "-"), bez: mA[1], titel: "", gliederung: [], roh: [], url: `${seite}#${attr(finde(e, (x) => x.name === "a" && attr(x, "name")), "name") ?? ""}`.replace(/#$/, ""), quelltext: "" };
      neueNorm(anlage);
      const zusatz = [mA[2], ...zu].filter(Boolean).join(" ");
      if (zusatz) {
        anlage.roh.push([zusatz]);
        anlage.quelltext += zusatz;
      }
    } else if (anlage && e.name === "h3") {
      if (anlage.titel) throw new Error(`Zweite Überschrift in der Anlage: ${t}`);
      anlage.titel = t;
    } else if (anlage && e.name === "h4") {
      anlage.roh.push((laufend = [{ t: "b", c: inlineKnoten(e).flatMap((k) => k) }]));
      laufend = null;
      anlage.quelltext += textVon(e);
    } else if (e.name === "p") {
      if (!t && !finde(e, (x) => x.name === "img")) continue;
      anhaengen(blockKnoten(e), e);
    } else if (e.name === "ol") {
      if (!aktuell) throw new Error("Liste vor der ersten Vorschrift");
      if (!laufend) aktuell.roh.push((laufend = []));
      laufend.push(liste(e));
      aktuell.quelltext += quelltextVon(e);
    } else throw new Error(`Unbekanntes Element: <${e.name} class="${attr(e, "class") ?? ""}"> ${t.slice(0, 60)}`);
  }
  for (const n of normen) {
    n.inhalt = n.roh.map(absatz);
    delete n.roh;
    n.weggefallen = /^\(?(aufgehoben|weggefallen)\)?$/.test(n.titel) && !n.inhalt.length;
  }
  if (!still) {
    for (const m of meldungen) console.log(`  Hinweis ${def.kurz}: ${m}`);
    DETAILS.set(def.id, { hinweise });
  }

  return {
    kopf: {
      titel: abk[1],
      stand,
      ausfertigung,
      quelle: {
        name: NAME,
        url: seite,
        fassung: "Aktuelle Fassung (BRAVORS)" + (hinweise.length ? ` – Hinweis des Portals: ${hinweise.join(" ")}` : ""),
      },
    },
    normen,
  };
}

const DETAILS = new Map();

// ---------- Gegenprüfung mit dem Gesetz- und Verordnungsblatt ----------
//
// BRAVORS bietet weder Druckfassung/PDF noch Einzelnorm-Seiten der konsolidierten Fassung. Unabhängige
// amtliche Darstellung ist das Gesetz- und Verordnungsblatt (GVBl., PDF auf BRAVORS):
//   1. Die Änderungshistorie (/gesetze/<name>/list) nennt die Ursprungsfassung und alle Änderungs-
//      gesetze mit den geänderten Paragraphen.
//   2. Paragraphen, die seit der Ursprungsfassung nie geändert wurden, vergleichen wir Zeichen für
//      Zeichen (ohne Leerraum) mit dem GVBl. der Ursprungsfassung – inklusive Überschrift und der
//      Listenmarken, die BRAVORS nicht im HTML hat („1.“, „a)“).
//   3. Paragraphen, die ein Änderungsgesetz vollständig neu fasst oder einfügt, suchen wir im GVBl.
//      dieses Gesetzes (Überschrift und Wortlaut).
//   4. Übrige geänderte Paragraphen: Wortvergleich mit der Ursprungsfassung; jedes neu hinzugekommene
//      Textstück muss im Text eines Änderungsgesetzes stehen (Plausibilität, keine Vollprüfung –
//      gestrichene Wörter lassen sich so nicht prüfen). Ergebnis „teilgeprüft“, zählt nicht als gleich.
// Seitenköpfe des GVBl. werden entfernt; Trennstriche am Zeilenende (auch U+00AD) toleriert und gezählt.

// Seitenkopf mit Seitenzahl davor („216 Gesetz- und …“ oder Seitenzahl in eigener Zeile) oder danach;
// im GVBl. 2004 ist die Kopfzeile teils abgeschnitten („… Nr. 9 vom 24. Mai“ ohne Jahr)
const kopfzeile = /(?:^[ \t]*\d{1,4}[ \t]*\n)?(?:^[ \t]*\d{1,4}[ \t]+)?Gesetz- und Verordnungsblatt für das Land Brandenburg Teil I\s*[-–\u00ad]\s*Nr\.\s*\d+ vom \d+\.[ \t]*\S+(?:[ \t]+\d{4})?(?:[ \t]+\d{1,4})?(?:[ \t]*\n[ \t]*\d{1,4}[ \t]*$)?/gm;
// Seitenwechsel (Formfeed) steht am Zeilenanfang vor Seitenzahl oder Überschrift -> Zeilenwechsel
const gvblText = (datei) =>
  pdfText(datei, { raw: true })
    .normalize("NFC")
    .replace(/\r\n?/g, "\n") // pdftotext schreibt unter Windows CRLF
    .replace(/\f/g, "\n")
    .replace(kopfzeile, "\n")
    .replace(/Herausgeber(?:in)?: Die Präsident(?:in)? des Landtages Brandenburg[^\n]*/g, "\n")
    .replace(/\u00ad[ \t]*\r?\n/g, "-\n");

// „§§ 1 bis 4, 6, 16c“ -> Liste der IDs (Bereiche nach der Reihenfolge der Vorschriften)
function paragraphenAus(label, reihenfolge) {
  const ids = new Set();
  for (const m of label.matchAll(/§§?\s+(\d+[a-z]?(?:\s*(?:,|und|bis)\s*\d+[a-z]?)*)/g)) {
    const teile = m[1].split(/\s*(?:,|und)\s*/);
    for (const t of teile) {
      const b = t.split(/\s*bis\s*/);
      if (b.length === 2) {
        const [von, bis] = [reihenfolge.indexOf(b[0]), reihenfolge.indexOf(b[1])];
        if (von < 0 || bis < 0) b.forEach((x) => ids.add(x));
        else reihenfolge.slice(von, bis + 1).forEach((x) => ids.add(x));
      } else ids.add(t.trim());
    }
  }
  if (/\bAnlage\b/.test(label)) ids.add("anlage");
  return ids;
}

// Segmente der Paragraphen im GVBl.-Text der Ursprungsfassung. Der Normtext beginnt bei der ersten
// Zeile, die nur „§ 1“ enthält (in der Inhaltsübersicht steht der Titel in derselben Zeile). Danach
// suchen wir die Paragraphen der Reihe nach als Zeilenanfang „§ N“ (allein oder mit Titel dahinter);
// das Segment endet am nächsten gefundenen Paragraphen bzw. an „Artikel N“/„Potsdam, den“.
function segmente(text, titelAnfang, ids) {
  const re = new RegExp(titelAnfang.split(/\s+/).map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("\\s+"));
  const start = text.search(re);
  if (start < 0) throw new Error(`Gesetzestitel im GVBl. nicht gefunden: ${titelAnfang}`);
  const rest = text.slice(start);
  const erste = rest.search(/^§ 1[ \t]*$/m);
  if (erste < 0) throw new Error("Beginn des Normtexts (§ 1) im GVBl. nicht gefunden");
  const koepfe = [];
  let pos = erste;
  for (const id of ids) {
    const m = new RegExp(`^§ ${id}(?![0-9a-z])[ \\t]*`, "m").exec(rest.slice(pos));
    if (!m) continue;
    koepfe.push({ id, index: pos + m.index, laenge: m[0].length });
    pos += m.index + m[0].length;
  }
  const out = new Map();
  koepfe.forEach((k, i) => {
    let ende = i + 1 < koepfe.length ? koepfe[i + 1].index : rest.length;
    if (i + 1 === koepfe.length) {
      const art = rest.slice(k.index).search(/^(Artikel \d+|Potsdam, den)/m);
      if (art > 0) ende = k.index + art;
    }
    out.set(k.id, rest.slice(k.index + k.laenge, ende));
  });
  return out;
}

// Wörter eines GVBl.-Texts: Trennung am Zeilenende auflösen (Kleinbuchstabe danach = Silbentrennung)
const woerterGvbl = (t) => t.replace(/-[ \t]*\n(?=[a-zäöüß])/g, "").split(/\s+/).filter(Boolean);
const woerter = (t) => t.split(/\s+/).filter(Boolean);

// Neu hinzugekommene Wortfolgen (LCS auf Wortebene)
function neueStuecke(alt, neu) {
  const n = alt.length, m = neu.length;
  const L = Array.from({ length: n + 1 }, () => new Uint16Array(m + 1));
  for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--) L[i][j] = alt[i] === neu[j] ? L[i + 1][j + 1] + 1 : Math.max(L[i + 1][j], L[i][j + 1]);
  const stuecke = [];
  let i = 0, j = 0, lauf = [];
  const ende = () => lauf.length && (stuecke.push(lauf.join(" ")), (lauf = []));
  while (i < n || j < m) {
    if (i < n && j < m && alt[i] === neu[j]) (ende(), i++, j++);
    else if (j < m && (i >= n || L[i][j + 1] >= L[i + 1][j])) lauf.push(neu[j++]);
    else (ende(), i++);
  }
  ende();
  return stuecke;
}

function textAlles(nodes) {
  let out = "";
  for (const n of nodes) {
    if (typeof n === "string") out += n;
    else if (n.t === "br") out += " ";
    else if (n.t === "dl") for (const it of n.items) out += ` ${it.dt} ${textAlles(it.c)} `;
    else if (n.t === "p") out += textAlles(n.c) + " ";
    else if (n.c) out += textAlles(n.c);
  }
  return out;
}

export async function pruefen(def, gesetz, quellDir) {
  const dir = path.join(quellDir, "pruefung");
  const listeHtml = await rohdatei(path.join(dir, "liste.html"), `${BASIS}${def.pfad}/list`, { immer: false });
  const doc = parseHtml(listeHtml);
  const zeilen = findeAlle(finde(doc, (e) => hatKlasse(e, "reiterbox_innen_text")), (e) => e.name === "tr")
    .map((tr) => {
      const zellen = elemente(tr).filter((z) => z.name === "td");
      if (zellen.length < 2) return null;
      return {
        label: zeile(zellen[0]),
        version: attr(finde(zellen[0], (a) => a.name === "a"), "href"),
        pdfs: findeAlle(zellen[1], (a) => a.name === "a" && /\.pdf$/i.test(attr(a, "href") ?? "")).map((a) => attr(a, "href")),
      };
    })
    .filter(Boolean);
  const basisZeile = zeilen.find((z) => /^Ursprüngliche Fassung/.test(z.label));
  if (!basisZeile) throw new Error("Ursprüngliche Fassung in der Änderungshistorie nicht gefunden");
  const reihenfolge = gesetz.normen.map((n) => n.id);
  const geaendert = new Set();
  const neuGefasst = new Map(); // id -> PDF-Dateien, in denen die Vorschrift vollständig steht
  const aenderungsPdfs = [];
  for (const z of zeilen.slice(zeilen.indexOf(basisZeile) + 1)) {
    for (const id of paragraphenAus(z.label, reihenfolge)) geaendert.add(id);
    const neu = new Set();
    for (const teil of z.label.split(";")) if (/neu gefasst|eingefügt|angefügt/.test(teil)) for (const id of paragraphenAus(teil, reihenfolge)) neu.add(id);
    for (const href of z.pdfs) {
      const name = path.basename(href);
      if (!aenderungsPdfs.includes(name)) aenderungsPdfs.push(name);
      for (const id of neu) neuGefasst.set(id, [...(neuGefasst.get(id) ?? []), name]);
    }
  }
  const lade = async (href) => {
    const name = path.basename(href);
    const datei = path.join(dir, name);
    await rohdatei(datei, href.startsWith("http") ? href : BASIS + href, { binaer: true, immer: false });
    return datei;
  };
  const basisDatei = await lade(basisZeile.pdfs[0]);
  const aenderungen = [];
  for (const z of zeilen.slice(zeilen.indexOf(basisZeile) + 1)) for (const href of z.pdfs) if (!aenderungen.some((a) => a.name === path.basename(href))) aenderungen.push({ name: path.basename(href), datei: await lade(href) });
  const basisText = gvblText(basisDatei);
  const seg = segmente(basisText, gesetz.titel.split(" ").slice(0, 4).join(" "), reihenfolge.filter((id) => id !== "anlage"));
  const aenderungsStroeme = aenderungen.map((a) => ({ name: a.name, strom: stromAusText(gvblText(a.datei)) }));
  const alleAenderungen = aenderungsStroeme.map((a) => a.strom).join("|");

  // Zusätzliche Zweitdarstellung für geänderte Vorschriften: die BRAVORS-Versionsseite der Fassung VOR
  // der letzten Änderung (eigene Seite der Änderungshistorie). Vorschriften, die die letzte Änderung
  // nicht betrifft, müssen dort gleich lauten.
  const letzte = zeilen.at(-1);
  const vorige = zeilen.at(-2);
  let versionNormen = null;
  let versionName = "";
  if (vorige?.version && vorige !== basisZeile && vorige.version !== def.pfad) {
    versionName = vorige.version;
    const html = await rohdatei(path.join(dir, `version-${path.basename(vorige.version)}.html`), BASIS + vorige.version, { immer: false });
    versionNormen = new Map(parsen(def, { html }, { still: true }).normen.map((n) => [n.id, n]));
  }
  const letzteBetrifft = paragraphenAus(letzte.label, reihenfolge);

  const liste = [];
  let getrennt = 0;
  for (const n of gesetz.normen) {
    const voll = `${n.bez}${n.titel}${textAlles(n.inhalt)}`;
    const zeichen = ohneLeerraum(textAlles(n.inhalt)).length;
    if (n.weggefallen) {
      liste.push({ bez: n.bez, zeichen, gleich: true, befund: `weggefallen („${n.titel}“) – laut Änderungshistorie aufgehoben` });
      continue;
    }
    if (!geaendert.has(n.id)) {
      const s = seg.get(n.id);
      if (!s) {
        liste.push({ bez: n.bez, zeichen, gleich: false, befund: "FEHLT im GVBl. der Ursprungsfassung" });
        continue;
      }
      const v = vergleicheStrom(stromAusText(s), 0, n.titel + textAlles(n.inhalt));
      getrennt += v.getrennt ?? 0;
      const rest = v.gleich ? stromAusText(s).slice(v.ende).replace(/\u00ad/g, "") : "";
      const restOk = !rest || /^(Teil|Abschnitt|Unterabschnitt)\d/.test(rest);
      liste.push({
        bez: n.bez,
        zeichen,
        gleich: v.gleich && restOk,
        befund: v.gleich
          ? `unverändert seit der Ursprungsfassung: gleich ${path.basename(basisDatei)}${v.getrennt ? `, ${v.getrennt} Trennstriche` : ""}${restOk ? "" : `, DANACH im GVBl. noch „${rest.slice(0, 40)}“`}`
          : `ABWEICHUNG zur Ursprungsfassung (${path.basename(basisDatei)}) ab Zeichen ${v.ab}: GVBl. „${v.soll}“ / Import „${v.ist}“`,
      });
      continue;
    }
    // vollständig neu gefasst/eingefügt: im Änderungsgesetz suchen (jüngstes zuerst)
    let treffer = null;
    for (const name of [...(neuGefasst.get(n.id) ?? [])].reverse()) {
      const a = aenderungsStroeme.find((x) => x.name === name);
      const f = a && findeImStrom(a.strom, n.id === "anlage" ? textAlles(n.inhalt) : voll);
      if (f) {
        treffer = { name, f };
        break;
      }
    }
    if (treffer) {
      getrennt += treffer.f.getrennt;
      liste.push({ bez: n.bez, zeichen, gleich: true, befund: `vollständig neu gefasst/eingefügt: gleich dem Text in ${treffer.name}${treffer.f.getrennt ? `, ${treffer.f.getrennt} Trennstriche` : ""}` });
      continue;
    }
    // sonst: Plausibilität über neue Textstücke
    const s = seg.get(n.id);
    const stuecke = neueStuecke(s ? woerterGvbl(s) : [], woerter(`${n.titel} ${textAlles(n.inhalt)}`));
    const belegt = stuecke.filter((st) => findeImStrom(alleAenderungen, st));
    const offen = stuecke.filter((st) => !belegt.includes(st));
    const gvbl = `GVBl.-Plausibilität ${belegt.length}/${stuecke.length} neue Textstücke in den Änderungsgesetzen` + (offen.length ? ` (nicht gefunden: ${offen.slice(0, 3).map((o) => `„${o.slice(0, 40)}“`).join(", ")})` : "");
    // Versionsseite
    const vn = versionNormen?.get(n.id);
    let version = null;
    if (versionNormen) {
      const v = vergleicheStrom(ohneLeerraum(`${vn?.titel ?? ""}${textAlles(vn?.inhalt ?? [])}`), 0, `${n.titel}${textAlles(n.inhalt)}`);
      const gleichLang = vn && ohneLeerraum(`${vn.titel}${textAlles(vn.inhalt)}`).length === ohneLeerraum(`${n.titel}${textAlles(n.inhalt)}`).length;
      version = v.gleich && gleichLang;
    }
    // Betrifft die letzte Änderung diese Vorschrift, darf die Versionsseite abweichen – ist sie gleich,
    // ist die letzte Änderung (noch) nicht eingearbeitet (BbgBO: Art. 2 gilt erst ab 14.01.2027).
    const letzteHier = letzteBetrifft.has(n.id);
    const zaehlt = version === true && !letzteHier;
    liste.push({
      bez: n.bez,
      zeichen,
      gleich: zaehlt,
      teil: !zaehlt,
      version: zaehlt,
      befund:
        (version === true
          ? letzteHier
            ? `gleich der BRAVORS-Versionsseite ${versionName}, d. h. die letzte Änderung („${letzte.label.slice(0, 60)}…“) ist hier nicht eingearbeitet – nur teilgeprüft`
            : `geändert seit der Ursprungsfassung: gleich der BRAVORS-Versionsseite ${versionName}`
          : version === false
            ? letzteHier
              ? `weicht von der BRAVORS-Versionsseite ${versionName} ab (letzte Änderung eingearbeitet) – nur teilgeprüft`
              : `ABWEICHUNG zur BRAVORS-Versionsseite ${versionName}`
            : `nur teilgeprüft`) + `; ${gvbl}`,
    });
  }
  const gvblVoll = liste.filter((e) => e.gleich && !e.version).length;
  const version = liste.filter((e) => e.version).length;
  const teil = liste.filter((e) => e.teil).length;
  return {
    methode:
      `Gesetz- und Verordnungsblatt (PDF über BRAVORS): Ursprungsfassung ${path.basename(basisDatei)} für seither unveränderte Vorschriften, ` +
      `Änderungsgesetze ${aenderungen.map((a) => a.name).join(", ")} für neu gefasste/eingefügte Vorschriften; übrige geänderte Vorschriften gegen die BRAVORS-Versionsseite ${versionName || "(keine)"} und mit GVBl.-Plausibilität`,
    liste,
    hinweis: `${gvblVoll} vollständig gegen das GVBl. geprüft, ${version} nur gegen die BRAVORS-Versionsseite (keine unabhängige konsolidierte Fassung), ${teil} nur teilgeprüft, ${getrennt} Trennstriche am Zeilenende toleriert`,
  };
}
