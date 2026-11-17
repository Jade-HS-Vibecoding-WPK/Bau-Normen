// Adapter für RECHT.NRW.DE (recht.nrw.de), das Rechtsportal des Ministeriums des Innern NRW,
// Bereich „LRGV – Landesrecht Gesetze und Verordnungen“. robots.txt sperrt nur Verwaltungs-
// und Suchpfade; Impressum/Nutzungshinweise verbieten den Abruf nicht.
//
// Quelle:  die Fassungsseite /lrgv/gesetz/<TTMMJJJJ>-<name>/ (alle Paragraphen auf einer Seite).
//          Jede Vorschrift steht in <section class="legaldoc-article"> mit Nummer (field_num),
//          Überschrift (field_headline), Text (field_text: eine Folge von <p>) und Fußnoten
//          (Änderungshinweise des Portals: „Absatz 3 geändert durch …“).
//          Die Seite listet alle Fassungen; der Import bricht ab, wenn es eine neuere gibt.
// Deep Link je Paragraph: Fassungsseite + "#<id des Abschnitts>" (z. B. #ss-6-abstandsflachen).
//
// Besonderheiten:
//   - Gliederungsüberschriften („Zweiter Teil“ / „Das Grundstück und seine Bebauung“) stehen im
//     Portal als zentrierte Absätze <p class="text-align-center"><strong>…</strong><br><strong>…</strong></p>
//     am ENDE des Textfelds der vorigen Vorschrift (bzw. in einem Abschnitt ohne Nummer). Sie gehören
//     nicht zum Wortlaut dieser Vorschrift: Wir nehmen sie heraus und setzen sie als "gliederung"
//     der folgenden Vorschriften (im PDF der Fassung stehen sie genau dort – siehe Gegenprüfung).
//     Leere zentrierte Absätze (<p>&nbsp;</p>) sind Abstandhalter und fallen weg.
//   - Aufzählungen liefert das Portal NICHT als Listen, sondern als einzelne Absätze
//     („<p>1. Aufschüttungen …</p>“, „<p>a) freistehende …</p>“). Wir bauen daraus keine Listen
//     (die Zuordnung von Folgezeilen wäre geraten), sondern übernehmen jeden <p> als eigene Zeile
//     ({t:"br"}) – Nummern und Buchstaben bleiben Teil des Wortlauts, wie in der Quelle.
//   - Absätze: Ein neuer Absatz ({t:"p"}) beginnt bei einem <p> mit „(1)“, „(2)“ …
//   - Fußnoten (Änderungshinweise) stehen in "fussnoten" als „<Fundstelle>: <Text>“.
//   - Abschnitte ohne Nummer und ohne Text, die nur eine Fußnote tragen (BauO NRW: „§ 91 aufgehoben
//     durch …“), sind keine Vorschrift und werden nur gemeldet.
//   - Schlussformel (field_conclusions) separat; das Portal nennt dort nur die Ämter, keine Namen.
//
// Gegenprüfung: das PDF der Fassung („Dokument herunterladen“), Text über pdftotext -raw. Seitenfüße
// („Herausgeber: … n / m“) werden entfernt. Verglichen werden alle Paragraphen der Reihe nach:
// Nummer, Überschrift, Fußnoten (im PDF „Fußnoten zu § …“ direkt unter der Überschrift) und Wortlaut,
// dazu dass zwischen zwei Paragraphen nur die Gliederungsüberschriften stehen, die Schlussformel und
// das Vollzitat. Toleranz: Trennstriche am Zeilenende des PDF (gezählt).

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
  hatKlasse,
  attr,
  zeile,
  textVon,
  inlineKnoten,
  absatz,
  beginntMitAbsatz,
  gliederungSetzen,
  alsText,
  fertig,
  ohneLeerraum,
  normWs,
  pdfText,
  stromAusText,
  vergleicheStrom,
  findeImStrom,
} from "./landesrecht-c-gemeinsam.mjs";

const BASIS = "https://recht.nrw.de";
const NAME = "RECHT.NRW.DE – Ministerium des Innern des Landes Nordrhein-Westfalen (recht.nrw.de, LRGV)";
const HEUTE = new Date().toISOString().slice(0, 10);

// Zusatzangaben aus parsen() für pruefen() (Fußnoten getrennt nach Fundstelle/Text, Überschriften)
const DETAILS = new Map();

export async function laden(def, quellDir) {
  const datei = path.join(quellDir, "fassung.html");
  const html = await rohdatei(datei, def.aktuell);
  return { html, abgerufen: abrufdatum(datei) };
}

const datum = (s) => {
  const m = s.match(/(\d\d)\.(\d\d)\.(\d{4})/);
  return m ? `${m[3]}-${m[2]}-${m[1]}` : null;
};

// Fußnoten eines Abschnitts: [{ref: "GV. NRW. 2026 S. 537", text: "Absatz 3 geändert …"}]
function fussnotenListe(el) {
  return findeAlle(el, (e) => hatKlasse(e, "footnote-item")).map((f) => {
    const ref = finde(f, (e) => hatKlasse(e, "field--field_reference"));
    const label = ref ? zeile(finde(ref, (e) => hatKlasse(e, "footnote-label"))) : "";
    if (ref && label !== "Veröffentlichung") throw new Error(`Unbekanntes Fußnotenetikett: ${label}`);
    const beschr = finde(f, (e) => hatKlasse(e, "field--field_footnote_description"));
    const p = beschr ? elemente(finde(beschr, (e) => hatKlasse(e, "tex2jax_process"))) : [];
    return { ref: ref ? zeile(ref).replace(/^Veröffentlichung\s*/, "") : "", text: p.map((x) => alsText(fertig(inlineKnoten(x)))).join("\n") };
  });
}
const fussnotenText = (liste) => liste.map((f) => (f.ref ? `${f.ref}: ${f.text}` : f.text)).join("\n");

// Zentrierter Absatz mit Gliederungsüberschrift, fett und durch <br> in zwei Zeilen geteilt:
// <strong>Zweiter Teil</strong><br><strong>Das …</strong> oder <strong>Vierter Teil<br>Die …</strong>
function ueberschrift(p) {
  const teile = [""];
  const lauf = (k, fett) => {
    if (istText(k)) {
      if (k.text.trim() && !fett) throw new Error(`Nicht fetter Text in zentrierter Zeile: ${zeile(p)}`);
      teile[teile.length - 1] += k.text;
    } else if (k.name === "br") teile.push("");
    else if (k.name === "strong" || k.name === "span") kinder(k).forEach((x) => lauf(x, fett || k.name === "strong"));
    else throw new Error(`Unbekanntes Element in zentrierter Zeile: <${k.name}>`);
  };
  kinder(p).forEach((k) => lauf(k, false));
  const z = teile.map((t) => normWs(t).trim()).filter(Boolean);
  if (z.length !== 2) throw new Error(`Unbekannte zentrierte Zeile: ${zeile(p)}`);
  return { bez: z[0], titel: z[1] };
}
const istLeer = (p) => !textVon(p).replace(/[\s\u00a0]+/g, "");

export function parsen(def, { html }) {
  const doc = parseHtml(html);
  const titelEl = finde(doc, (e) => attr(e, "id") === "block-rnrw-page-title");
  const h1 = finde(titelEl, (e) => e.name === "h1");
  const titel = normWs(kinder(h1).filter((k) => !hatKlasse(k, "title-additions")).map(textVon).join("")).trim();
  const info = zeile(finde(doc, (e) => attr(e, "id") === "block-rnrw-legal-document-info-box"));
  const gueltigAb = datum(info.match(/Gültig ab\s*(\d\d\.\d\d\.\d{4})/)?.[1] ?? "");
  if (!gueltigAb) throw new Error(`„Gültig ab“ nicht gefunden: ${info}`);
  if (gueltigAb > HEUTE) throw new Error(`Die Fassung gilt erst ab ${gueltigAb}`);
  const gueltigBis = info.match(/Gültig bis\s*(\d\d\.\d\d\.\d{4})/)?.[1];
  if (gueltigBis && datum(gueltigBis) < HEUTE) throw new Error(`Die Fassung galt nur bis ${gueltigBis}`);

  // Fassungen: die eigene Seite ist „(aktuelle Seite)“; eine spätere Fassung darf es nicht geben
  const fassungen = findeAlle(doc, (e) => e.name === "li" && hatKlasse(e, "version-item")).map((li) => ({ datum: datum(zeile(li)), eigene: !finde(li, (e) => e.name === "a"), href: attr(finde(li, (e) => e.name === "a"), "href") }));
  const eigene = fassungen.find((f) => f.eigene);
  if (!eigene || eigene.datum !== gueltigAb) throw new Error("Eigene Fassung in der Fassungsliste nicht gefunden");
  const neuer = fassungen.filter((f) => !f.eigene && f.datum > eigene.datum && f.datum <= HEUTE);
  if (neuer.length) throw new Error(`Es gibt eine neuere Fassung: ${BASIS}${neuer[0].href} – URL in GESETZE anpassen`);

  const vollzitat = zeile(finde(finde(doc, (e) => attr(e, "id") === "fullQuote") ?? doc, (e) => hatKlasse(e, "full-quote-content")));
  const stand = vollzitat.match(/((?:die|das|der) (?:zuletzt )?durch .+ geändert worden ist)$/)?.[1];
  if (!stand) throw new Error(`Vollzitat ohne „… durch … geändert worden ist“: ${vollzitat}`);

  const artikel = finde(doc, (e) => attr(e, "id") === "block-rnrw-content");
  // Vorspann: Formel („Vom 21. Juli 2018“) und Inhaltsübersicht (kein Normtext)
  let ausfertigung = "";
  const vorspann = finde(artikel, (e) => hatKlasse(e, "field--field_preamble"));
  for (const item of elemente(vorspann)) {
    const typ = elemente(item)[0];
    if (hatKlasse(typ, "paragraph--type--toc")) continue;
    if (!hatKlasse(typ, "paragraph--type--formel")) throw new Error(`Unbekannter Vorspann: ${attr(typ, "class")}`);
    const zeilen = findeAlle(typ, (e) => e.name === "p").map(zeile).filter(Boolean);
    if (zeilen.length !== 1 || !/^Vom \d/.test(zeilen[0])) throw new Error(`Unbekannte Eingangsformel: ${zeilen.join(" | ")}`);
    ausfertigung = zeilen[0];
  }
  const schlussEl = finde(artikel, (e) => hatKlasse(e, "field--field_conclusions"));
  // Zeilen der Schlussformel; ein <br> innerhalb eines Absatzes ist ebenfalls ein Zeilenwechsel
  const schlussformel = schlussEl
    ? findeAlle(schlussEl, (e) => e.name === "p").map((p) => alsText(fertig(inlineKnoten(p)))).filter(Boolean).join("\n")
    : "";

  const seite = def.aktuell.replace(/\/$/, "");
  let gliederung = [];
  let ausstehend = []; // Überschriften für die folgenden Vorschriften
  const normen = [];
  const details = { fussnoten: new Map(), ueberschriften: new Map(), nachNorm: new Map(), schlussformel, vollzitat, hinweise: [] };
  const sektionen = findeAlle(finde(artikel, (e) => hatKlasse(e, "field--field_body")), (e) => e.name === "section" && hatKlasse(e, "legaldoc-article"));
  for (const s of sektionen) {
    const div = elemente(s)[0];
    const num = finde(s, (e) => hatKlasse(e, "field--field_num"));
    const hl = finde(s, (e) => hatKlasse(e, "field--field_headline"));
    const feld = finde(s, (e) => hatKlasse(e, "field--field_text"));
    const absaetze = feld ? elemente(finde(feld, (e) => hatKlasse(e, "tex2jax_process"))) : [];
    const fn = fussnotenListe(s);

    // Gliederungsüberschriften zuerst übernehmen, die vor dieser Vorschrift stehen
    for (const u of ausstehend) gliederung = gliederungSetzen(gliederung, `${u.bez} – ${u.titel}`);
    const davor = ausstehend;
    ausstehend = [];

    const text = [];
    let nachUeberschrift = false;
    for (const p of absaetze) {
      if (p.name !== "p") throw new Error(`Unbekanntes Element im Text: <${p.name}>`);
      if (istLeer(p)) continue;
      if (hatKlasse(p, "text-align-center")) {
        ausstehend.push(ueberschrift(p));
        nachUeberschrift = true;
      } else {
        if (nachUeberschrift) throw new Error(`Text nach einer Gliederungsüberschrift in ${num ? zeile(num) : "Abschnitt ohne Nummer"}`);
        text.push(p);
      }
    }
    if (!num) {
      if (text.length) throw new Error(`Abschnitt ohne Nummer mit Text: ${zeile(text[0]).slice(0, 80)}`);
      if (fn.length) {
        details.hinweise.push(`Abschnitt ohne Nummer, nur Fußnote: „${fussnotenText(fn)}“ (nicht übernommen)`);
        details.nachNorm.set(normen.at(-1)?.id ?? "", fn);
      }
      continue;
    }
    const m = zeile(num).match(/^§\s*(\d+[a-z]?)$/);
    if (!m) throw new Error(`Unbekannte Nummer: ${zeile(num)}`);

    // Absätze nach „(n)“ gruppieren; jeder weitere <p> ist eine neue Zeile
    const inhalt = [];
    let laufend = null;
    for (const p of text) {
      const k = inlineKnoten(p);
      if (!laufend || beginntMitAbsatz(k)) inhalt.push((laufend = []));
      else laufend.push({ t: "br" });
      laufend.push(...k);
    }
    const id = m[1];
    details.fussnoten.set(id, fn);
    details.ueberschriften.set(id, davor);
    normen.push({
      id,
      bez: `§ ${id}`,
      titel: hl ? zeile(hl) : "",
      gliederung: [...gliederung],
      inhalt: inhalt.map(absatz),
      fussnoten: fussnotenText(fn),
      url: `${seite}#${attr(div, "id")}`,
      quelltext: text.map(textVon).join(""),
    });
  }
  if (ausstehend.length) throw new Error("Gliederungsüberschrift nach der letzten Vorschrift");
  DETAILS.set(def.id, details);
  for (const h of details.hinweise) console.log(`  Hinweis ${def.kurz}: ${h}`);

  const pdf = attr(finde(doc, (e) => e.name === "a" && hatKlasse(e.eltern, "download-icon")), "href");
  details.pdf = pdf ? new URL(pdf, BASIS).href : null;
  return {
    kopf: {
      titel,
      stand,
      gueltigAb,
      ausfertigung,
      schlussformel,
      quelle: { name: NAME, url: seite, fassung: `Fassung gültig ab ${gueltigAb.split("-").reverse().join(".")}` },
    },
    normen,
  };
}

// ---------- Gegenprüfung mit dem PDF der Fassung ----------

export async function pruefen(def, gesetz, quellDir) {
  const details = DETAILS.get(def.id);
  if (!details.pdf) throw new Error("Kein PDF-Link auf der Fassungsseite");
  const datei = path.join(quellDir, "pruefung", "fassung.pdf");
  await rohdatei(datei, details.pdf, { binaer: true, immer: false });
  // Seitenfuß: „Herausgeber: Im Namen der Landesregierung, … Düsseldorf n / m“ (über zwei Zeilen)
  // Das PDF enthält teils zerlegte Umlaute („u“ + U+0308 im Seitenfuß) -> kanonisch zusammensetzen (NFC)
  const roh = pdfText(datei, { raw: true })
    .normalize("NFC")
    .replace(/Herausgeber: Im Namen der Landesregierung,[\s\S]*?Düsseldorf\s+\d+\s*\/\s*\d+/g, "");
  const strom = stromAusText(roh);
  const liste = [];
  let getrennt = 0;
  let weich = 0;
  // Beginn des Normtexts: hinter der Inhaltsübersicht (dort stehen dieselben Überschriften)
  const erste = gesetz.normen[0];
  const kopfErste = ohneLeerraum(`${erste.bez}${erste.titel}`);
  let pos = strom.indexOf(kopfErste, strom.indexOf(kopfErste) + 1);
  if (pos < 0) throw new Error("Erste Vorschrift im PDF nicht gefunden");
  // Gliederung vor der ersten Vorschrift zurückgehen
  for (const u of details.ueberschriften.get(erste.id)) pos -= ohneLeerraum(u.bez + u.titel).length;
  const vollzitatGleich = !!findeImStrom(strom, details.vollzitat);

  for (const n of gesetz.normen) {
    // 1. Gliederungsüberschriften vor der Vorschrift
    const ueb = details.ueberschriften.get(n.id).map((u) => `${u.bez}${u.titel}`).join("");
    let v = vergleicheStrom(strom, pos, ueb);
    const uebGleich = v.gleich;
    pos = v.gleich ? v.ende : pos;
    // 2. Nummer und Überschrift
    v = vergleicheStrom(strom, pos, `${n.bez}${n.titel}`);
    if (!v.gleich) {
      liste.push({ bez: n.bez, gleich: false, befund: `ÜBERSCHRIFT nicht an erwarteter Stelle: PDF „${v.soll}“` });
      const neu = strom.indexOf(ohneLeerraum(`${n.bez}${n.titel}`), pos);
      if (neu < 0) continue;
      pos = neu;
      v = vergleicheStrom(strom, pos, `${n.bez}${n.titel}`);
    }
    pos = v.ende;
    getrennt += v.getrennt;
    // 3. Fußnoten (im PDF direkt unter der Überschrift)
    const fn = details.fussnoten.get(n.id);
    let fnGleich = true;
    if (fn.length) {
      const erwartet = `Fußnoten zu ${n.bez} ${n.titel}` + fn.map((f) => (f.ref ? `Veröffentlichung ${f.ref} ` : "") + f.text).join("");
      v = vergleicheStrom(strom, pos, erwartet);
      fnGleich = v.gleich;
      if (v.gleich) (pos = v.ende), (getrennt += v.getrennt);
    }
    // 4. Wortlaut
    v = vergleicheStrom(strom, pos, textAlles(n.inhalt));
    getrennt += v.getrennt;
    weich += v.weich;
    const befund = [
      v.gleich ? "Wortlaut gleich" : `ABWEICHUNG ab Zeichen ${v.ab}: PDF „${v.soll}“ / Import „${v.ist}“`,
      "Überschrift gleich",
      fn.length ? (fnGleich ? `${fn.length} Fußnote(n) gleich` : "FUSSNOTEN weichen ab") : "",
      uebGleich ? (ueb ? "Gliederung davor gleich" : "") : `GLIEDERUNG davor weicht ab`,
      v.getrennt ? `${v.getrennt} Trennstriche` : "",
      v.weich ? `${v.weich} weiche Trennzeichen (U+00AD) der Quelle` : "",
    ].filter(Boolean);
    liste.push({ bez: n.bez, zeichen: ohneLeerraum(textAlles(n.inhalt)).length, gleich: v.gleich && fnGleich && uebGleich, befund: befund.join(", ") });
    if (v.gleich) pos = v.ende;
    // Fußnote eines Abschnitts ohne Nummer hinter dieser Vorschrift (BauO NRW: „§ 91 aufgehoben …“)
    const danach = details.nachNorm.get(n.id);
    if (danach) {
      const w = vergleicheStrom(strom, pos, "Fußnoten" + danach.map((f) => (f.ref ? `Veröffentlichung ${f.ref} ` : "") + f.text).join(""));
      liste.push({ bez: `(nach ${n.bez})`, gleich: w.gleich, befund: w.gleich ? `Fußnote ohne Vorschrift gleich (nicht übernommen): „${fussnotenText(danach)}“` : `ABWEICHUNG Fußnote ohne Vorschrift: PDF „${w.soll}“` });
      if (w.gleich) pos = w.ende;
    }
  }
  // 5. Schlussformel
  if (details.schlussformel) {
    const v = vergleicheStrom(strom, pos, details.schlussformel);
    liste.push({ bez: "Schlussformel", zeichen: ohneLeerraum(details.schlussformel).length, gleich: v.gleich, befund: v.gleich ? "gleich" : `ABWEICHUNG: PDF „${v.soll}“ / Import „${v.ist}“` });
  }
  liste.push({ bez: "Vollzitat", gleich: vollzitatGleich, befund: vollzitatGleich ? "steht wörtlich im PDF" : "NICHT im PDF gefunden" });
  return {
    methode: `PDF der Fassung (${details.pdf}), Text über pdftotext -raw ohne Seitenfüße, alle Paragraphen der Reihe nach (Gliederung, Überschrift, Fußnoten, Wortlaut)`,
    liste,
    hinweis: `${getrennt} Trennstriche am Zeilenende des PDF toleriert` + (weich ? `, ${weich} weiche Trennzeichen (U+00AD) der Quelle fehlen im PDF oder stehen dort als Trennstrich` : ""),
  };
}

// Wortlaut in Lesereihenfolge (alle Zeichen, wie alleZeichen)
function textAlles(nodes) {
  let out = "";
  for (const n of nodes) {
    if (typeof n === "string") out += n;
    else if (n.t === "dl") for (const it of n.items) out += it.dt + textAlles(it.c);
    else if (n.t === "table") out += n.rows.flat().join("");
    else if (n.c) out += textAlles(n.c);
  }
  return out;
}
