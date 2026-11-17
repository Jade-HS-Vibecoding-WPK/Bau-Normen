// Adapter für das Transparenzportal Bremen (www.transparenz.bremen.de), Rubrik „Vorschriften“.
// robots.txt: leer (keine Einschränkung); Nutzungsbedingungen: Daten „für alle Zwecke“ nutzbar,
// Namensnennung „Verantwortliche Stelle“ + „Freie Hansestadt Bremen“.
//
// Quelle:  die Metainformationen-Seite des Gesetzes. Sie enthält die juris-Gesamtausgabe: je
//          Gliederungseinheit und Paragraph ein Block <div class="jgwsAiZDoc" id="jgwsAiZDoc-jlr-…">
//          mit Anker <a name="jlr-…"> (daraus der Deep Link: Seiten-URL + "#jlr-…"). Überschriften:
//          <h3>/<h4>/<h5> „§ 2<br>Begriffe“ bzw. „Teil 1<br>Allgemeine Vorschriften“; Absätze als <p>,
//          Aufzählungen als <dl><dt>1.</dt><dd><p>…</p></dd></dl> (verschachtelt).
//          Nicht übernommen: das nichtamtliche Inhaltsverzeichnis, die Bedienelemente
//          „Einzelansicht“/„Seitenanfang“, die Eingangsformel („Der Senat verkündet …“, kein Normtext;
//          das Schema hat dafür kein Feld) und die Fußnote „*)“ am Gesetzestitel (BremLBO:
//          „Verkündet als Artikel 1 des Gesetzes zur Neufassung … (Brem.GBl. S. 270; ber. S. 381)“ –
//          Fundstelle, kein Normtext; das Schema hat für Titel-Fußnoten kein Feld). Die Schlussformel
//          („Bremen, den …“ / „Der Senat“), die juris an den letzten Paragraphen hängt, steht separat
//          in "schlussformel". Ein leeres <br> nach dem letzten Block einer Vorschrift (Layout) entfällt.
//          Satznummern gibt es in dieser Quelle nicht.
//
// Bekannte Abweichungen des Portals vom Gesetzblatt (werden NICHT korrigiert, die Gegenprüfung
// weist sie aus): BremLBO § 1 Abs. 2 Satz 1 Nr. 8 zeigt schon die Fassung von Artikel 2 des
// Gesetzes vom 29. Mai 2024 (in Kraft erst am 14. Januar 2027), § 63 Abs. 1 beginnt mit der
// falschen Listenmarke „aaa)“ statt „(1)“, dazu Satzzeichenfehler in §§ 65, 70, 71, 76;
// BremDSchG § 22 Abs. 1 Nr. 4 „entgegen 13 Absatz 2“ (ohne „§“), § 24 „-“ statt „—“.
//
// Fassung: Das nichtamtliche Inhaltsverzeichnis der Seite nennt für jede Vorschrift die Gültigkeit
//          der angezeigten Fassung („01.07.2024 bis 31.12.2026“). Der Import bricht ab, wenn eine
//          Vorschrift am Abruftag nicht gilt (z. B. weil die Seite eine künftige Fassung zeigt).
//          "gueltigAb" = spätester Beginn der Gültigkeit unter den angezeigten Vorschriften.
//
// Absätze: Ein neuer Absatz beginnt mit einem <p>, das mit „(1)“, „(2)“ … beginnt; <p> ohne Nummer
// (z. B. Satz nach einer Aufzählung: „Anlagen sind …“, „erfolgt.“) gehören zum laufenden Absatz.
//
// Gegenprüfung: das amtliche Gesetzblatt der Freien Hansestadt Bremen (www.gesetzblatt.bremen.de,
// robots.txt leer). BremLBO: Brem.GBl. 2024 Nr. 60 vom 25. Juni 2024 (Berichtigung von Nr. 57: die
// vollständige berichtigte Fassung des Gesetzes zur Neufassung der BremLBO, S. 381 ff.) – gilt für
// alle Vorschriften, deren angezeigte Fassung seit 01.07.2024 gilt. BremDSchG: Brem.GBl. 2018
// Nr. 101 vom 20. Dezember 2018, S. 631 ff. (seit 21.12.2018 unverändert). Der PDF-Text kommt aus
// pdftotext -layout; Seitenköpfe („Nr. 60 Gesetzblatt der Freien Hansestadt Bremen vom … 386“)
// werden entfernt, Silbentrennung am Zeilenende wird toleriert und gezählt. Verglichen werden alle
// Zeichen außer Leerraum: Überschrift (§ + Titel) und Wortlaut jeder Vorschrift.
// Hinweis: Das Impressum von gesetzblatt.bremen.de untersagt „Vervielfältigung, Veröffentlichung
// oder Speicherung in Datenbanken“ der Online-Inhalte; wir laden die PDF-Ausgabe nur einmal zur
// lokalen Prüfung (nicht versioniert, nicht veröffentlicht) – automatisierter Abruf ist dort nicht
// ausgeschlossen, der Gesetzestext selbst ist gemeinfrei (§ 5 UrhG).

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
  alsText,
  alleZeichen,
  ohneLeerraum,
  pdfText,
  stromAusText,
  vergleicheStrom,
  normWs,
} from "./landesrecht-c-gemeinsam.mjs";

const NAME = "Transparenzportal Bremen – Vorschriften (www.transparenz.bremen.de), Freie Hansestadt Bremen";

// Amtliche Gesetzblatt-Ausgaben für die Gegenprüfung
const GESETZBLATT = {
  bremlbo: {
    url: "https://www.gesetzblatt.bremen.de/fastmedia/218/2024_06_25_GBl_Nr_0060_signed.pdf",
    datei: "2024_06_25_GBl_Nr_0060_signed.pdf",
    kopf: /^[\f \t]*Nr\. 60 Gesetzblatt der Freien Hansestadt Bremen vom 25\. Juni 2024[ \t]+\d+[ \t\r]*$/gm,
    // Ab hier beginnt der Normtext von Artikel 1 (nach dessen Inhaltsverzeichnis)
    beginn: "§87Übergangsvorschriften",
    seitDatum: "2024-07-01",
    beschreibung: "Brem.GBl. 2024 Nr. 60 vom 25. Juni 2024 (berichtigte Fassung des Gesetzes zur Neufassung der BremLBO vom 29. Mai 2024, Artikel 1, S. 381 ff.)",
  },
  bremdschg: {
    url: "https://www.gesetzblatt.bremen.de/fastmedia/218/2018_12_20_GBl_Nr_0101_signed.pdf",
    datei: "2018_12_20_GBl_Nr_0101_signed.pdf",
    kopf: /^[\f \t]*Nr\. 101 Gesetzblatt der Freien Hansestadt Bremen vom 20\. Dezember 2018[ \t]+\d+[ \t\r]*$/gm,
    beginn: "",
    seitDatum: "2018-12-21",
    beschreibung: "Brem.GBl. 2018 Nr. 101 vom 20. Dezember 2018, S. 631 ff.",
  },
};

export async function laden(def, quellDir) {
  const datei = path.join(quellDir, "gesetz.html");
  const html = await rohdatei(datei, def.seite);
  return { html, abgerufen: abrufdatum(datei) };
}

// Bedienelemente der Seite, die keinen Normtext enthalten
const istBedienung = (e) => hatKlasse(e, "jlr-einzelnorm") || hatKlasse(e, "jlr-toTop");
const REGELN = { ignorieren: istBedienung };
const textOhne = (k, weg) => (istText(k) ? k.text : weg(k) ? "" : kinder(k).map((x) => textOhne(x, weg)).join(""));

// Zeilen einer Überschrift, getrennt durch <br>
function zeilenVon(el) {
  const zeilen = [];
  let z = "";
  for (const k of kinder(el)) {
    if (istEl(k) && k.name === "br") (zeilen.push(z), (z = ""));
    else if (istEl(k) && k.name === "a" && hatKlasse(k, "Overl")) continue; // Fußnotenzeichen „*)“
    else z += textVon(k);
  }
  zeilen.push(z);
  return zeilen.map((s) => normWs(s).trim()).filter(Boolean);
}

// Listenpunkt (<dd>): <p>-Blöcke (durch Zeilenumbruch getrennt) und Unterlisten
function ddInhalt(dd) {
  const out = [];
  let letzteWarText = false;
  for (const k of kinder(dd)) {
    if (istText(k)) {
      if (k.text.trim()) throw new Error(`Loser Text in <dd>: ${k.text.trim().slice(0, 60)}`);
      continue;
    }
    if (k.name === "p") {
      if (!normWs(textVon(k)).trim()) continue;
      if (letzteWarText) out.push({ t: "br" });
      out.push(...inlineKnoten(k, REGELN));
      letzteWarText = true;
    } else if (k.name === "dl") {
      out.push(liste(k));
      letzteWarText = false;
    } else throw new Error(`Unbekanntes Element in <dd>: <${k.name}>`);
  }
  return fertig(out);
}

function liste(dl) {
  const items = [];
  let dt = null;
  for (const k of elemente(dl)) {
    if (k.name === "dt") dt = zeile(k);
    else if (k.name === "dd") {
      if (dt === null) throw new Error("Listenpunkt ohne Marke");
      items.push({ dt, c: ddInhalt(k) });
      dt = null;
    } else throw new Error(`Unbekanntes Element in <dl>: <${k.name}>`);
  }
  if (dt !== null) throw new Error(`Listenmarke ohne Inhalt: ${dt}`);
  return { t: "dl", items };
}

// Inhalt einer Vorschrift aus ihren Blöcken (<p>, <dl>) – Absätze nach „(n)“ gruppiert
function normInhalt(bloecke) {
  const inhalt = [];
  let laufend = null;
  let letzteWarText = false;
  for (const b of bloecke) {
    if (b.name === "p") {
      const k = inlineKnoten(b, REGELN);
      if (!normWs(textVon(b)).trim()) continue;
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
    } else throw new Error(`Unbekannter Block: <${b.name}>`);
  }
  return inhalt.map(absatz);
}

// „dd.mm.yyyy“ -> „yyyy-mm-dd“
const iso = (d) => d.replace(/^(\d\d)\.(\d\d)\.(\d{4})$/, "$3-$2-$1");

export function parsen(def, { html, abgerufen, still = false }) {
  const doc = parseHtml(html);
  const artikel = finde(doc, (e) => hatKlasse(e, "main_article") && hatKlasse(e, "gesetz"));
  if (!artikel) throw new Error("Gesetzesbereich (main_article gesetz) nicht gefunden");

  // Metadaten der Seite: <span><strong>Etikett</strong>Wert</span>
  const meta = {};
  for (const s of findeAlle(finde(artikel, (e) => hatKlasse(e, "metadaten")), (e) => e.name === "span")) {
    const strong = elemente(s).find((e) => e.name === "strong");
    if (!strong) continue;
    meta[zeile(strong).replace(/:$/, "")] = normWs(kinder(s).filter((k) => k !== strong).map(textVon).join("")).trim();
  }

  // Titel aus dem juris-Titelblock: „Bremische Landesbauordnung<br>vom 29. Mai 2024*)“
  const titelZeilen = zeilenVon(finde(artikel, (e) => hatKlasse(e, "doc") && hatKlasse(e.eltern, "docLayoutTitel")));
  const abk = titelZeilen.findIndex((s) => /^\(.*\)$/.test(s) && s.includes(def.kurz));
  const datumZeile = titelZeilen.findIndex((s) => /^[Vv]om \d/.test(s));
  if (datumZeile < 1) throw new Error(`Titelblock ohne Datum: ${titelZeilen.join(" | ")}`);
  const titel = titelZeilen.slice(0, abk > 0 ? abk : datumZeile).join(" ").replace(/,$/, "");
  const ausfertigung = `${titelZeilen[datumZeile]}${meta.Fundstelle ? ` (${meta.Fundstelle})` : ""}`;

  // Fassung der Gesamtausgabe, z. B. „Gesamtausgabe in der Gültigkeit vom 01.07.2024 bis 31.12.2026“
  const fassung = zeile(finde(artikel, (e) => e.name === "em" && hatKlasse(e.eltern, "docLayoutMarginTopMore")));
  // Stand: „Zuletzt geändert durch: …“ – fehlt bei nie geänderten Gesetzen, dann der Zitiervorschlag
  const stand = meta["Zuletzt geändert durch"]
    ? `Zuletzt geändert durch: ${meta["Zuletzt geändert durch"]}`
    : meta.Zitiervorschlag?.replace(/^"|"$/g, "");
  if (!stand) throw new Error("Weder „Zuletzt geändert durch“ noch Zitiervorschlag gefunden");

  // Gültigkeit je Vorschrift aus dem nichtamtlichen Inhaltsverzeichnis
  const gueltig = new Map();
  const ivz = finde(doc, (e) => hatKlasse(e, "jwsinhaltsverzeichnis") && !!finde(e, (t) => t.name === "table"));
  for (const tr of findeAlle(ivz, (e) => e.name === "tr")) {
    const zellen = elemente(tr).filter((e) => e.name === "td");
    const a = zellen[0] && finde(zellen[0], (e) => e.name === "a");
    if (!a || zellen.length < 2) continue;
    const m = zeile(zellen[1]).match(/^(\d\d\.\d\d\.\d{4})(?: bis (\d\d\.\d\d\.\d{4}))?$/);
    if (!m) throw new Error(`Unbekannte Gültigkeitsangabe: ${zeile(zellen[1])}`);
    gueltig.set(attr(a, "href").slice(1), { von: iso(m[1]), bis: m[2] ? iso(m[2]) : null, label: zeile(zellen[0]) });
  }

  // Blöcke der Gesamtausgabe
  const text = finde(artikel, (e) => hatKlasse(e, "docLayoutText") && !!finde(e, (x) => hatKlasse(x, "jgwsAiZDoc")));
  const bloecke = findeAlle(text, (e) => hatKlasse(e, "jgwsAiZDoc"));
  let gliederung = [];
  let schlussformel = "";
  const normen = [];
  const uebersprungen = [];
  for (const b of bloecke) {
    const anker = attr(finde(b, (e) => e.name === "a" && /^jlr-/.test(attr(e, "name") ?? "")), "name");
    const inner = elemente(b).find((e) => hatKlasse(e, "docLayoutMarginTop"));
    const koerper = inner && elemente(inner).find((e) => hatKlasse(e, "docLayoutMarginTop"));
    const rest = elemente(b).filter((e) => e !== inner && !istBedienung(e));
    if (rest.length) throw new Error(`${anker}: unbekannte Elemente neben dem Dokument: ${rest.map((e) => e.name).join(",")}`);
    if (!koerper) {
      if (zeile(inner)) throw new Error(`${anker}: Text ohne Dokumentkörper`);
      continue;
    }
    const kopfEl = elemente(koerper).find((e) => /^h[1-6]$/.test(e.name));
    if (!kopfEl) {
      // Rahmen (Stand, Fußnoten), Inhaltsverzeichnis oder Eingangsformel – kein Normtext
      const art = finde(koerper, (e) => e.name === "table" && hatKlasse(e, "CONTENTS"))
        ? "Inhaltsverzeichnis"
        : finde(koerper, (e) => hatKlasse(e, "standangaben"))
          ? "Standangabe"
          : zeile(koerper)
            ? `„${zeile(koerper).slice(0, 60)}“`
            : "leer";
      uebersprungen.push(art);
      continue;
    }
    const kz = zeilenVon(kopfEl);
    const g = gueltig.get(anker);
    if (!g) throw new Error(`${anker} (${kz.join(" ")}): keine Gültigkeitsangabe im Inhaltsverzeichnis`);
    if (g.von > abgerufen || (g.bis && g.bis < abgerufen))
      throw new Error(`${kz.join(" ")}: angezeigte Fassung gilt ${g.von} bis ${g.bis ?? "offen"}, nicht am ${abgerufen}`);
    const p = kz[0].match(/^§\s*(\d+[a-z]?)$/);
    const anl = kz[0].match(/^(Anlage|Anhang)(?:\s+(\d+))?$/);
    if (/^(?:[A-ZÄÖÜ][a-zäöü]+\s+)?(Teil|Abschnitt|Unterabschnitt|Kapitel)\b/.test(kz[0])) {
      if (kz.length > 2) throw new Error(`Gliederungsüberschrift mit mehr als zwei Zeilen: ${kz.join(" | ")}`);
      if (elemente(koerper).some((e) => e !== kopfEl)) throw new Error(`Gliederungsblock mit Text: ${kz.join(" ")}`);
      gliederung = gliederungSetzen(gliederung, kz[1] ? `${kz[0]} – ${kz[1]}` : kz[0]);
      continue;
    }
    if (!p && !anl) throw new Error(`Unbekannte Überschrift: ${kz.join(" | ")}`);
    const inhaltEls = [];
    const fussEls = [];
    for (const e of elemente(koerper)) {
      if (e === kopfEl) continue;
      if (e.name === "p" || e.name === "dl") inhaltEls.push(e);
      else if (e.name === "br" && !e.kinder.length) continue; // <br> nach dem letzten Block (Layout, kein Text)
      else throw new Error(`${kz[0]}: unbekanntes Element <${e.name} class="${attr(e, "class")}">`);
    }
    // Fußnoten zu einer Vorschrift (jgwsAiZDocFootnote) – kommen bisher nicht vor
    for (const f of findeAlle(b, (e) => hatKlasse(e, "jgwsAiZDocFootnote"))) fussEls.push(f);
    // Schlussformel am Ende der letzten Vorschrift: „Bremen, den …“ und alles danach
    const sf = inhaltEls.findIndex((e) => e.name === "p" && /^Bremen, den \d/.test(zeile(e)));
    if (sf >= 0) {
      schlussformel = inhaltEls.slice(sf).map(zeile).filter(Boolean).join("\n");
      inhaltEls.splice(sf);
    }
    const fussnoten = fussEls
      .flatMap((f) => findeAlle(f, (e) => e.name === "dl"))
      .map((dl) => `${zeile(finde(dl, (e) => e.name === "dt"))} ${alsText(fertig(inlineKnoten(finde(dl, (e) => e.name === "dd"), REGELN)))}`)
      .join("\n");
    const titelN = kz.slice(1).join(" ");
    if (p) {
      normen.push({
        id: p[1],
        bez: `§ ${p[1]}`,
        titel: titelN,
        gliederung: [...gliederung],
        inhalt: normInhalt(inhaltEls),
        fussnoten,
        url: `${def.seite}#${anker}`,
        quelltext: inhaltEls.map((e) => textOhne(e, istBedienung)).join(""),
        gueltig: g,
      });
    } else {
      normen.push({
        id: anl[2] ? `${anl[1].toLowerCase()}-${anl[2]}` : anl[1].toLowerCase(),
        bez: anl[2] ? `${anl[1]} ${anl[2]}` : anl[1],
        titel: titelN,
        gliederung: [],
        inhalt: normInhalt(inhaltEls),
        fussnoten,
        url: `${def.seite}#${anker}`,
        quelltext: inhaltEls.map((e) => textOhne(e, istBedienung)).join(""),
        gueltig: g,
      });
    }
  }
  if (!normen.length) throw new Error("Keine Vorschriften gefunden");
  const gueltigAb = normen.map((n) => n.gueltig.von).sort().at(-1);
  const bisFrueh = normen.map((n) => n.gueltig.bis).filter(Boolean).sort()[0];
  if (!still) console.log(
    `  ${def.kurz}: ${fassung}; angezeigte Fassungen gelten am ${abgerufen} (spätester Beginn ${gueltigAb}` +
      (bisFrueh ? `, früheste Änderung ab ${bisFrueh.replace(/^(\d{4})-(\d\d)-(\d\d)$/, "$3.$2.$1")} + 1 Tag (zukünftige Fassung nicht übernommen)` : "") +
      `); nicht übernommen: ${uebersprungen.join(", ")}`,
  );
  return {
    kopf: {
      titel,
      stand,
      gueltigAb,
      ausfertigung,
      schlussformel,
      quelle: { name: NAME, url: def.seite, fassung },
    },
    normen,
  };
}

// ---------- Gegenprüfung mit dem Gesetzblatt ----------

// Inhalt als Folge von Stücken in Lesereihenfolge (wie alleZeichen), Listenmarken gekennzeichnet
function stuecke(nodes, out = []) {
  for (const n of nodes) {
    if (typeof n === "string") out.push({ s: n });
    else if (n.t === "dl") for (const it of n.items) (out.push({ s: it.dt, marke: true }), stuecke(it.c, out));
    else if (n.t === "table") out.push({ s: n.rows.flat().join("") });
    else if (n.t === "pre" || n.t === "hinweis") out.push({ s: n.v });
    else if (n.c) stuecke(n.c, out);
  }
  return out;
}

// Vergleich Zeichen für Zeichen (ohne Leerraum) mit dem PDF-Strom. Toleranzen (gezählt):
//   - Silbentrennung am Zeilenende (Trennstrich-Marke „\u00ad“ im Strom, siehe stromAusText)
//   - Listenmarken („1.“, „a)“), die im PDF-Text fehlen: Das Gesetzblatt setzt die Nummern
//     mancher Aufzählungen als automatische Listennummern, die pdftotext (und pypdf) nicht als
//     Text liefern. Eine Marke darf nur fehlen, nicht abweichen – eine andere Marke im PDF
//     bleibt im Strom stehen und führt zu einer Abweichung.
// Jede andere Abweichung wird festgehalten; danach wird neu ausgerichtet (kleinster Sprung, nach
// dem 15 Zeichen übereinstimmen), damit alle Abweichungen einer Vorschrift sichtbar werden.
const ohneTrenn = (strom, i, n) => {
  let out = "";
  while (out.length < n && i < strom.length) (strom[i] !== "\u00ad" && (out += strom[i]), i++);
  return out;
};
function ausrichten(strom, i, z, j) {
  const L = 15;
  for (let d = 1; d <= 60; d++)
    for (let a = 0; a <= d; a++) {
      let ii = i, k = 0;
      while (k < a && ii < strom.length) (strom[ii] !== "\u00ad" && k++, ii++);
      const jj = j + (d - a);
      if (jj > z.length) continue;
      const unser = z.slice(jj, jj + L).map((x) => x.c).join("");
      if (unser.length && ohneTrenn(strom, ii, unser.length) === unser) return { i: ii, j: jj };
    }
  return null;
}
function vergleicheStuecke(strom, start, liste) {
  const z = [];
  liste.forEach((st, si) => {
    for (const c of ohneLeerraum(st.s)) z.push({ c, marke: st.marke ? si : -1 });
  });
  let i = start, j = 0, getrennt = 0, marken = 0;
  const abw = [];
  while (j < z.length) {
    if (z[j].marke >= 0 && (j === 0 || z[j - 1].marke !== z[j].marke)) {
      let k = j;
      while (k < z.length && z[k].marke === z[j].marke) k++;
      const v = vergleicheStrom(strom, i, z.slice(j, k).map((x) => x.c).join(""));
      if (v.gleich) ((i = v.ende), (getrennt += v.getrennt));
      else marken++;
      j = k;
      continue;
    }
    if (i < strom.length && strom[i] === z[j].c) (i++, j++);
    else if (i < strom.length && strom[i] === "\u00ad") z[j].c === "-" ? (i++, j++) : (i++, getrennt++);
    else {
      const sync = ausrichten(strom, i, z, j);
      const ende = sync ?? { i: Math.min(strom.length, i + 40), j: Math.min(z.length, j + 40) };
      abw.push({
        ab: j,
        soll: ohneTrenn(strom, Math.max(start, i - 12), 12 + Math.max(0, ohneTrenn(strom, i, 1e9).length - ohneTrenn(strom, ende.i, 1e9).length) + 8),
        ist: z.slice(Math.max(0, j - 12), ende.j + 8).map((x) => x.c).join(""),
      });
      if (!sync) break;
      ((i = sync.i), (j = sync.j));
    }
  }
  return { gleich: abw.length === 0, ende: i, getrennt, marken, abw };
}

export async function pruefen(def, gesetz, quellDir) {
  const gb = GESETZBLATT[def.id];
  if (!gb) throw new Error(`Kein Gesetzblatt für ${def.id} hinterlegt`);
  const pdf = path.join(quellDir, "pruefung", gb.datei);
  await rohdatei(pdf, gb.url, { binaer: true, immer: false });
  let roh = pdfText(pdf, { layout: true });
  const koepfe = (roh.match(gb.kopf) ?? []).length;
  roh = roh.replace(gb.kopf, "");
  const strom = stromAusText(roh);
  let pos = gb.beginn ? strom.indexOf(gb.beginn) : 0;
  if (pos < 0) throw new Error(`Beginn des Normtexts („${gb.beginn}“) im Gesetzblatt nicht gefunden`);
  pos += gb.beginn.length;

  // Gültigkeit der angezeigten Fassung (für die Auswahl: nur seit der Verkündung unveränderte Vorschriften)
  const parsed = parsen(def, { html: fs.readFileSync(path.join(quellDir, "gesetz.html"), "utf8"), abgerufen: gesetz.quelle.abgerufen, still: true });
  const seit = new Map(parsed.normen.map((n) => [n.id, n.gueltig.von]));

  const liste = [];
  let getrenntSumme = 0;
  let markenSumme = 0;
  for (const n of gesetz.normen) {
    const zeichen = ohneLeerraum(alleZeichen(n.inhalt)).length;
    if (seit.get(n.id) !== gb.seitDatum) {
      liste.push({ bez: n.bez, zeichen, gleich: false, befund: `NICHT GEPRÜFT: angezeigte Fassung gilt seit ${seit.get(n.id)}, Gesetzblatt-Fassung seit ${gb.seitDatum}` });
      continue;
    }
    // Überschrift „§ 2 Begriffe“ im Strom suchen (ab dem Ende der vorigen Vorschrift)
    const kopf = ohneLeerraum(`${n.bez}${n.titel}`);
    const start = strom.indexOf(kopf, pos);
    if (start < 0) {
      liste.push({ bez: n.bez, zeichen, gleich: false, befund: `ÜBERSCHRIFT „${n.bez} ${n.titel}“ NICHT GEFUNDEN im Gesetzblatt` });
      continue;
    }
    const v = vergleicheStuecke(strom, start + kopf.length, stuecke(n.inhalt));
    getrenntSumme += v.getrennt;
    markenSumme += v.marken;
    const befund = [
      "Überschrift gleich",
      v.gleich ? "Wortlaut gleich" : `${v.abw.length} ABWEICHUNG(EN): ${v.abw.map((x) => `Gesetzblatt „${x.soll}“ / Import „${x.ist}“`).join("; ")}`,
      v.getrennt ? `${v.getrennt} Trennstriche` : "",
      v.marken ? `${v.marken} Listenmarken fehlen im PDF-Text` : "",
    ].filter(Boolean);
    liste.push({ bez: n.bez, zeichen, gleich: v.gleich, befund: befund.join(", ") });
    pos = v.gleich ? v.ende : start + kopf.length;
  }
  // Schlussformel
  if (gesetz.schlussformel) {
    const v = vergleicheStrom(strom, strom.indexOf(ohneLeerraum(gesetz.schlussformel).slice(0, 12), pos), gesetz.schlussformel);
    liste.push({ bez: "Schlussformel", zeichen: ohneLeerraum(gesetz.schlussformel).length, gleich: v.gleich, befund: v.gleich ? "gleich" : `ABWEICHUNG: Gesetzblatt „${v.soll}“ / Import „${v.ist}“` });
  }
  return {
    methode: `amtliches Gesetzblatt ${gb.beschreibung}, ${gb.url} – pdftotext -layout, ${koepfe} Seitenköpfe entfernt; alle Vorschriften (Überschrift und Wortlaut)`,
    liste,
    hinweis: `toleriert: ${getrenntSumme} Trennstriche am Zeilenende, ${markenSumme} im PDF-Text fehlende Listenmarken`,
  };
}
