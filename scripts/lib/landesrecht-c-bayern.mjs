// Adapter für BAYERN.RECHT (www.gesetze-bayern.de), das Rechtsportal der Bayerischen
// Staatskanzlei (technische Umsetzung: Verlag C.H.Beck). robots.txt: „Allow: /“.
//
// Quelle:  „Gesamtansicht“ des Gesetzes (/Content/Document/<dokid>/true) – alle Artikel auf einer
//          Seite. Jeder Artikel steht in <div class="cont"> mit Überschrift (paranr/paratitel),
//          Absätzen (<div class="absatz paratext">) und Listen (<dl><dt>1.</dt><dd>…</dd></dl>).
//          Gliederungsüberschriften: <h2 class="absatz gltitel"> (Teil) und <h3 …> (Abschnitt).
// Bayern zählt in Artikeln: bez "Art. 6", id "6"; Deep Link /Content/Document/<dokid>-6.
//
// Absätze: Das HTML kennt keine Absatz-Container. Ein neuer Absatz beginnt, wo ein paratext-Block
// mit „(1)“, „(2)“ … beginnt; Blöcke ohne Nummer (z. B. ein Satz nach einer Aufzählung) gehören zum
// laufenden Absatz – so steht es auch im XML des Portals (<jurAbsatz>), gegen das wir prüfen.
// Satznummern (<sup class="satznr">) bleiben als {t:"sup"} im Inhalt und fehlen im Feld "text".
// Nicht in den Wortlaut übernommen: Fußnotenzeichen; die Fußnote selbst steht in "fussnoten".
//
// Gegenprüfung: das XML der Vorschrift aus dem ZIP-Download (/Content/Zip/<dokid>, DTD
// „byrecht.normen“) – eine eigene, strukturierte Darstellung. Verglichen werden ALLE Artikel:
// Überschrift, Zahl der Absätze, Wortlaut (alle Zeichen außer Leerraum) und Fußnoten.

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
  alsText,
  alleZeichen,
  ohneLeerraum,
  vergleiche,
  zipEintraege,
  normWs,
} from "./landesrecht-c-gemeinsam.mjs";

const BASIS = "https://www.gesetze-bayern.de";
const NAME = "BAYERN.RECHT – Bayerische Staatskanzlei (www.gesetze-bayern.de)";

export async function laden(def, quellDir) {
  const datei = path.join(quellDir, "gesamt.html");
  const html = await rohdatei(datei, `${BASIS}/Content/Document/${def.dokid}/true`);
  return { html, abgerufen: abrufdatum(datei) };
}

// Fußnotenzeichen: <a class="footnoteanchor"> (leer) und <sup><a class="footnotelink-down">1</a></sup>
const istFussnotenzeichen = (e) =>
  hatKlasse(e, "footnoteanchor") || (e.name === "sup" && !!finde(e, (a) => /^footnotelink/.test(attr(a, "class") ?? "")));
const REGELN = { ignorieren: istFussnotenzeichen, satz: (e) => hatKlasse(e, "satznr") };

// Text eines Elements ohne die weggelassenen Teile (für die Vollständigkeitsprüfung)
const textOhne = (k, weg) => (istText(k) ? k.text : weg(k) ? "" : kinder(k).map((x) => textOhne(x, weg)).join(""));

// Blöcke in einem Listenpunkt (<dd>): paratext-Blöcke (durch Zeilenumbruch getrennt) und Unterlisten
function ddInhalt(dd) {
  const out = [];
  let letzteWarText = false;
  for (const k of kinder(dd)) {
    if (istText(k)) {
      if (k.text.trim()) throw new Error(`Loser Text in <dd>: ${k.text.trim().slice(0, 60)}`);
      continue;
    }
    if (hatKlasse(k, "paratext")) {
      if (letzteWarText) out.push({ t: "br" });
      out.push(...inlineKnoten(k, REGELN));
      letzteWarText = true;
    } else if (k.name === "dl") {
      out.push(liste(k));
      letzteWarText = false;
    } else throw new Error(`Unbekanntes Element in <dd>: <${k.name} class="${attr(k, "class")}">`);
  }
  return fertig(out);
}

function liste(dl) {
  const items = [];
  let dt = null;
  for (const k of elemente(dl)) {
    if (k.name === "dt") dt = zeile(k);
    else if (k.name === "dd" && hatKlasse(k, "clearer")) continue;
    else if (k.name === "dd") {
      if (dt === null) throw new Error("Listenpunkt ohne Marke");
      items.push({ dt, c: ddInhalt(k) });
      dt = null;
    } else throw new Error(`Unbekanntes Element in <dl>: <${k.name}>`);
  }
  return { t: "dl", items };
}

// Inhalt eines Artikels aus seinen Blöcken (paratext, dl) – Absätze nach „(n)“ gruppiert
function artikelInhalt(bloecke) {
  const inhalt = [];
  let laufend = null;
  let letzteWarText = false;
  for (const b of bloecke) {
    if (hatKlasse(b, "paratext")) {
      const k = inlineKnoten(b, REGELN);
      if (!laufend || beginntMitAbsatz(k)) {
        laufend = [];
        inhalt.push(laufend);
      } else if (letzteWarText) laufend.push({ t: "br" });
      laufend.push(...k);
      letzteWarText = true;
    } else if (b.name === "dl") {
      if (!laufend) inhalt.push((laufend = []));
      laufend.push(liste(b));
      letzteWarText = false;
    }
  }
  return inhalt.map(absatz);
}

function fussnoten(container) {
  if (!container) return "";
  return findeAlle(container, (e) => hatKlasse(e, "fn"))
    .map((fn) => {
      const marke = elemente(fn).find((e) => e.name === "sup");
      const rest = kinder(fn).filter((k) => k !== marke && !(istEl(k) && hatKlasse(k, "footnoteanchor")));
      return `${zeile(marke)} ${alsText(fertig(rest.flatMap((k) => inlineKnoten(k, REGELN))))}`;
    })
    .join("\n");
}

// „ Erster Teil Allgemeine Vorschriften “ -> „Erster Teil – Allgemeine Vorschriften“
function gliederungAus(h) {
  const t = zeile(h);
  const m = t.match(/^((?:[A-ZÄÖÜ][a-zäöüß]+\s+)?(?:Teil|Abschnitt|Unterabschnitt|Kapitel)(?:\s+(?:[IVXLC]+|\d+[a-z]?))?)\s+(.+)$/);
  if (!m) throw new Error(`Unbekannte Gliederungsüberschrift: ${t}`);
  return `${m[1]} – ${m[2]}`;
}

export function parsen(def, { html }) {
  const doc = parseHtml(html);
  const inhaltBereich = finde(doc, (e) => attr(e, "id") === "content");
  const conts = findeAlle(inhaltBereich, (e) => hatKlasse(e, "cont"));

  // Kopf: Titelzeile (mit <br> gegliedert), Vollzitat, „Text gilt ab“
  const h1 = finde(conts[0], (e) => hatKlasse(e, "titelzeile"));
  const zeilen = [];
  let z = "";
  for (const k of kinder(h1)) {
    if (istEl(k) && k.name === "br") (zeilen.push(z), (z = ""));
    else z += textVon(k);
  }
  zeilen.push(z);
  const titelZeilen = zeilen.map((s) => normWs(s).trim()).filter(Boolean);
  const abk = titelZeilen.findIndex((s) => /^\(.*\)$/.test(s) && s.includes(def.kurz));
  if (abk < 1) throw new Error(`Titelzeile ohne Abkürzung (${def.kurz}): ${titelZeilen.join(" | ")}`);
  const titel = titelZeilen.slice(0, abk).join(" ");
  const ausfertigung = titelZeilen.slice(abk + 1).filter((s) => !/^BayRS\b/.test(s)).join(" ");
  const vollzitat = zeile(finde(conts[0], (e) => hatKlasse(e, "standangabe")));
  const stand = vollzitat.match(/(zuletzt durch .+ geändert worden ist)$/)?.[1];
  if (!stand) throw new Error(`Vollzitat ohne „zuletzt … geändert“: ${vollzitat}`);
  const gilt = zeile(finde(doc, (e) => attr(e, "id") === "doc-metadata")).match(/Text gilt ab: (\d\d)\.(\d\d)\.(\d{4})/);
  if (!gilt) throw new Error("„Text gilt ab“ nicht gefunden");

  // Deep Links aus den Inhaltslisten der Gliederungsseiten: „Art. 6 Abstandsflächen“ -> /Content/Document/BayBO-6
  const links = new Map();
  for (const a of findeAlle(inhaltBereich, (e) => e.name === "a" && hatKlasse(e.eltern, "subdoc"))) {
    const m = zeile(a).match(/^Art\.\s*(\d+[a-z]?)\b/);
    if (m) links.set(m[1], BASIS + attr(a, "href"));
  }

  let gliederung = [];
  const normen = [];
  for (const c of conts.slice(1)) {
    const gl = elemente(c).filter((e) => hatKlasse(e, "gltitel"));
    const kopfEl = elemente(c).find((e) => hatKlasse(e, "paraheading"));
    const anlage = elemente(c).find((e) => hatKlasse(e, "annexheading"));
    if (gl.length) {
      for (const h of gl) gliederung = gliederungSetzen(gliederung, gliederungAus(h));
      if (elemente(c).some((e) => !hatKlasse(e, "gltitel") && !hatKlasse(e, "subdoc"))) throw new Error("Gliederungsblock mit Text");
    } else if (kopfEl) {
      const nr = zeile(finde(kopfEl, (e) => hatKlasse(e, "paranr")));
      const m = nr.match(/^Art\.\s*(\d+[a-z]?)$/);
      if (!m) throw new Error(`Unbekannte Artikelnummer: ${nr}`);
      const titelEl = finde(kopfEl, (e) => hatKlasse(e, "paratitel"));
      const bloecke = [];
      let fnContainer = null;
      for (const e of elemente(c)) {
        if (e === kopfEl || (e.name === "hr" && hatKlasse(e, "fn"))) continue;
        if (hatKlasse(e, "fn-container")) fnContainer = e;
        else if (hatKlasse(e, "paratext") || e.name === "dl") bloecke.push(e);
        else throw new Error(`Art. ${m[1]}: unbekanntes Element <${e.name} class="${attr(e, "class")}">`);
      }
      normen.push({
        id: m[1],
        bez: `Art. ${m[1]}`,
        titel: normWs(textOhne(titelEl, istFussnotenzeichen)).trim(),
        gliederung: [...gliederung],
        inhalt: artikelInhalt(bloecke),
        fussnoten: fussnoten(fnContainer),
        url: links.get(m[1]) ?? `${BASIS}/Content/Document/${def.dokid}-${m[1]}`,
        quelltext: bloecke.map((b) => textOhne(b, istFussnotenzeichen)).join(""),
      });
    } else if (anlage) {
      // Anlage: <div class="annextitel"> (bei der BayBO nur „(nicht mehr belegt)“)
      const titelA = zeile(finde(anlage, (e) => hatKlasse(e, "annextitel")));
      const rest = elemente(c).filter((e) => e !== anlage);
      if (rest.length) throw new Error(`Anlage mit Inhalt – Aufbau noch nicht unterstützt: ${titelA}`);
      const nummer = normen.filter((n) => n.bez.startsWith("Anlage")).length + 1;
      normen.push({
        id: nummer === 1 ? "anlage" : `anlage-${nummer}`,
        bez: "Anlage",
        titel: titelA,
        gliederung: [],
        inhalt: [],
        url: `${BASIS}/Content/Document/${def.dokid}-ANL_${nummer}`,
        quelltext: "",
      });
    } else if (elemente(c).length) throw new Error(`Unbekannter Block: ${zeile(c).slice(0, 80)}`);
  }

  return {
    kopf: {
      titel,
      stand,
      gueltigAb: `${gilt[3]}-${gilt[2]}-${gilt[1]}`,
      ausfertigung,
      quelle: { name: NAME, url: `${BASIS}/Content/Document/${def.dokid}`, fassung: `Text gilt ab: ${gilt[1]}.${gilt[2]}.${gilt[3]}` },
    },
    normen,
  };
}

// ---------- Gegenprüfung mit dem XML ----------

const ohneFn = (e) => e.name === "fn.call";

export async function pruefen(def, gesetz, quellDir) {
  const zip = await rohdatei(path.join(quellDir, "pruefung", `${def.dokid}.zip`), `${BASIS}/Content/Zip/${def.dokid}`, { binaer: true, immer: false });
  const eintraege = await zipEintraege(zip);
  const xmlName = Object.keys(eintraege).find((n) => n.endsWith(".xml") && !n.startsWith("META-INF"));
  const xml = parseHtml(eintraege[xmlName].toString("utf8").replace(/^\uFEFF/, ""), { xml: true });
  const inkraft = zeile(finde(xml, (e) => e.name === "inkraft"));
  const liste = [];
  const xmlNormen = findeAlle(xml, (e) => e.name === "einzelnorm");
  const gefunden = new Set();
  for (const en of xmlNormen) {
    const nr = zeile(finde(en, (e) => e.name === "para.nr"));
    const id = nr.replace(/^Art\.\s*/, "");
    gefunden.add(id);
    const n = gesetz.normen.find((x) => x.id === id);
    if (!n) {
      liste.push({ bez: nr, gleich: false, befund: "FEHLT im Import" });
      continue;
    }
    const titelEl = finde(en, (e) => e.name === "para.titel");
    const titelXml = titelEl ? normWs(textOhne(titelEl, ohneFn)).trim() : "";
    const absaetze = findeAlle(en, (e) => e.name === "jurabsatz");
    const wortlaut = absaetze.map((a) => textOhne(a, ohneFn)).join("");
    const fnXml = findeAlle(en, (e) => e.name === "fn.def").map((f) => ohneLeerraum(textVon(f))).join("");
    const v = vergleiche(wortlaut, alleZeichen(n.inhalt));
    const titelGleich = ohneLeerraum(titelXml) === ohneLeerraum(n.titel);
    const absatzGleich = absaetze.length === n.inhalt.length;
    // Fußnote: Marke („1“, „1)“) und das Etikett „[Amtl. Anm.:]“ der HTML-Ansicht stehen nicht im XML-Text
    const fnGleich = fnXml === ohneLeerraum((n.fussnoten ?? "").replace(/^\d+\)?\s*/gm, "").replace(/\[Amtl\. Anm\.:\]/g, ""));
    const befund = [
      v.gleich ? "Wortlaut gleich" : `ABWEICHUNG ab Zeichen ${v.ab}: XML „${v.soll}“ / Import „${v.ist}“`,
      titelGleich ? "Überschrift gleich" : `ÜBERSCHRIFT XML „${titelXml}“`,
      absatzGleich ? `${absaetze.length} Absätze` : `ABSÄTZE XML ${absaetze.length} / Import ${n.inhalt.length}`,
      fnGleich ? (fnXml ? "Fußnote gleich" : "") : "FUSSNOTE weicht ab",
    ].filter(Boolean);
    liste.push({ bez: n.bez, zeichen: v.zeichen, gleich: v.gleich && titelGleich && absatzGleich && fnGleich, befund: befund.join(", ") });
  }
  for (const n of gesetz.normen) if (/^Art\./.test(n.bez) && !gefunden.has(n.id)) liste.push({ bez: n.bez, gleich: false, befund: "FEHLT im XML" });
  // Anlagen: Überschrift vergleichen
  for (const an of findeAlle(xml, (e) => e.name === "annex")) {
    const titelXml = zeile(finde(an, (e) => e.name === "annex.titel"));
    const nummer = zeile(finde(an, (e) => e.name === "annex.nummer"));
    const n = gesetz.normen.find((x) => x.bez === nummer && ohneLeerraum(x.titel) === ohneLeerraum(titelXml));
    const inhaltXml = ohneLeerraum(textOhne(an, (e) => e.name === "annex.titel" || e.name === "annex.nummer"));
    const gleich = !!n && inhaltXml === ohneLeerraum(alleZeichen(n.inhalt));
    liste.push({ bez: nummer, zeichen: inhaltXml.length, gleich, befund: gleich ? `Überschrift „${titelXml}“ gleich, Inhalt gleich` : `ABWEICHUNG Anlage „${titelXml}“` });
  }
  const gleichDatum = inkraft === gesetz.gueltigAb;
  if (!gleichDatum) liste.push({ bez: "Fassung", gleich: false, befund: `XML inkraft ${inkraft} / Import gültig ab ${gesetz.gueltigAb}` });
  return {
    methode: `XML aus dem ZIP-Download (${BASIS}/Content/Zip/${def.dokid}), alle Artikel; XML <inkraft> ${inkraft}`,
    liste,
  };
}
