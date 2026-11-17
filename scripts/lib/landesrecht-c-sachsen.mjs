// Adapter für REVOSax – Landesrecht Sachsen (www.revosax.sachsen.de), das Vorschriften-
// informationssystem der Sächsischen Staatskanzlei. robots.txt sperrt nur einen eigenen Bot
// („FSSachsenBot“), für alle anderen gibt es keine Einschränkung.
//
// Quelle:  Seite der Vorschrift (/vorschrift/<nr>, zeigt immer die aktuelle Fassung). Der
//          Gesetzestext steht in <article id="lesetext">: je Paragraph und je Gliederungsebene ein
//          <section> (id "p6" = § 6, "t3abs1" = Teil 3 Abschnitt 1 …) mit Überschrift <h4>
//          („§ 6<br>Abstandsflächen, Abstände“), Absätzen <p> und Aufzählungen <dl class="cf">.
//          Deep Link je Paragraph: /vorschrift/<nr>#p6.
// Nicht übernommen: Bekanntmachungs- bzw. Eingangsformel (<header>), Inhaltsübersicht (<nav>),
// die Titelzeile des Gesetzes und die Fußnotenzeichen (<a class="fussnote_link">). Die Fußnoten
// selbst (am Seitenende, „§ 6 geändert durch …“) stehen in "fussnoten" der Vorschrift, in der ihr
// Zeichen steht. Ort, Datum und Unterschriften hinter dem letzten Paragraphen (SächsDSchG § 40:
// „Dresden, den 3. März 1993“ …) sind die Schlussformel und stehen in "schlussformel".
//
// Absätze: Jeder <p> mit „(1)“, „(2)“ … beginnt einen Absatz; <p> ohne Nummer (Satz nach einer
// Aufzählung) gehören zum laufenden Absatz. Satzzahlen (<sup class="satzzahl">) bleiben als
// {t:"sup"} im Inhalt und fehlen im Feld "text".
// Aufzählungen: REVOSax schreibt auch Unterpunkte flach in EINE Liste:
//   <dt class="td_1">1.</dt><dd class="last">Text</dd>              Punkt 1
//   <dt class="td_1"></dt><dd class="td_2">a)</dd><dd class="last">  Unterpunkt a) von Punkt 1
//   <dt class="td_1"></dt><dd class="last">…</dd>                    Fortsetzung von Punkt 1 nach a), b)
// Wir bauen daraus wieder verschachtelte Listen ({t:"dl"} im Punkt) – der Wortlaut bleibt gleich.
//
// Gegenprüfung: das PDF derselben Fassung („Vorschrift als PDF“, /vorschrift_gesamt/<nr>/<fassung>.pdf),
// Text über pdftotext. Verglichen werden ALLE Paragraphen: Überschrift und Wortlaut (alle Zeichen
// außer Leerraum, einschließlich Satzzahlen und Listenmarken) müssen im PDF lückenlos aufeinander
// folgen. Toleriert und gezählt werden nur Fußnotenzeichen im PDF-Text und Bindestriche am
// Zeilenende, die pdftotext beim Zusammenfügen der Zeilen weglässt (Einzelheiten bei pruefen).

import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
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
  inlineKnoten,
  absatz,
  beginntMitAbsatz,
  gliederungSetzen,
  gliederungText,
  alsText,
  alleZeichen,
  ohneLeerraum,
  stromAusText,
  normWs,
} from "./landesrecht-c-gemeinsam.mjs";

const BASIS = "https://www.revosax.sachsen.de";
const NAME = "REVOSax – Landesrecht Sachsen, Sächsische Staatskanzlei (www.revosax.sachsen.de)";

export async function laden(def, quellDir) {
  const datei = path.join(quellDir, "vorschrift.html");
  const html = await rohdatei(datei, `${BASIS}/vorschrift/${def.vorschrift}`);
  return { html, abgerufen: abrufdatum(datei) };
}

const istFussnotenzeichen = (e) => e.name === "a" && hatKlasse(e, "fussnote_link");
const REGELN = { ignorieren: istFussnotenzeichen, satz: (e) => hatKlasse(e, "satzzahl") };

// Text eines Elements ohne die weggelassenen Teile (für die Vollständigkeitsprüfung)
const textOhne = (k, weg) => (istText(k) ? k.text : weg(k) ? "" : kinder(k).map((x) => textOhne(x, weg)).join(""));

// Zeilen einer Überschrift (durch <br> getrennt), ohne Fußnotenzeichen
function zeilenVon(el) {
  const zeilen = [""];
  const lauf = (k) => {
    if (istText(k)) zeilen[zeilen.length - 1] += k.text;
    else if (istFussnotenzeichen(k)) return;
    else if (k.name === "br") zeilen.push("");
    else kinder(k).forEach(lauf);
  };
  kinder(el).forEach(lauf);
  return zeilen.map((z) => normWs(z).trim()).filter(Boolean);
}

// Flache REVOSax-Aufzählung -> verschachtelte Liste
function liste(dl) {
  const items = [];
  let punkt = null; // laufender Punkt der ersten Ebene
  let unter = null; // Unterpunkt, dessen Text (<dd class="last">) noch aussteht
  let dtLeer = false;
  for (const k of elemente(dl)) {
    if (k.name === "dt") {
      if (!hatKlasse(k, "td_1")) throw new Error(`Unbekannte Listenmarke <dt class="${attr(k, "class")}">`);
      const marke = zeile(k);
      if (marke) {
        punkt = { dt: marke, c: [] };
        items.push(punkt);
        dtLeer = false;
      } else {
        if (!punkt) throw new Error("Liste beginnt mit leerer Marke");
        dtLeer = true;
      }
      unter = null;
    } else if (k.name === "dd" && hatKlasse(k, "td_2")) {
      if (!punkt || unter) throw new Error(`Unterpunkt ohne Punkt: ${zeile(k)}`);
      let sub = punkt.c.at(-1);
      if (!sub || typeof sub === "string" || sub.t !== "dl") punkt.c.push((sub = { t: "dl", items: [] }));
      unter = { dt: zeile(k), c: [] };
      sub.items.push(unter);
    } else if (k.name === "dd" && hatKlasse(k, "last")) {
      const knoten = kinder(k).flatMap((x) => inlineKnoten(x, REGELN));
      if (unter) {
        unter.c.push(...knoten);
        unter = null;
      } else if (punkt && (dtLeer || punkt.c.length === 0)) {
        punkt.c.push(...knoten); // Text des Punkts bzw. Fortsetzung nach seinen Unterpunkten
      } else throw new Error(`Listentext ohne Marke: ${zeile(k).slice(0, 60)}`);
    } else throw new Error(`Unbekanntes Element in <dl>: <${k.name} class="${attr(k, "class")}">`);
  }
  if (unter) throw new Error(`Unterpunkt ${unter.dt} ohne Text`);
  return { t: "dl", items };
}

// Inhalt eines Paragraphen aus seinen Blöcken (<p>, <dl>) – Absätze nach „(n)“ gruppiert
function paragraphInhalt(bloecke) {
  const inhalt = [];
  let laufend = null;
  let letzteWarText = false;
  for (const b of bloecke) {
    if (b.name === "p") {
      const k = kinder(b).flatMap((x) => inlineKnoten(x, REGELN));
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
    } else throw new Error(`Unbekannter Block <${b.name}>`);
  }
  return inhalt.map(absatz);
}

// Schlussformel: ab „<Ort>, den <Datum>“ im letzten Paragraphen (Ort, Datum, Unterschriften)
const ORT_DATUM = /^[A-ZÄÖÜ][\wäöüß.-]*(?: [A-ZÄÖÜ][\wäöüß.-]*)*, den \d{1,2}\.[ \u00a0][A-Za-zä]+[ \u00a0]\d{4}$/;

const datumIso = (d) => d.replace(/^(\d\d)\.(\d\d)\.(\d{4})$/, "$3-$2-$1");

export function parsen(def, { html }) {
  const doc = parseHtml(html);
  const seite = `${BASIS}/vorschrift/${def.vorschrift}`;
  const lesetext = finde(doc, (e) => attr(e, "id") === "lesetext");
  if (!lesetext) throw new Error("<article id=\"lesetext\"> nicht gefunden");

  // Fußnoten am Seitenende: <dt>6</dt><dd id="FNID_6">§ 5 aufgehoben durch …</dd>
  const fussnotenText = new Map();
  const fussFooter = finde(doc, (e) => e.name === "footer" && hatKlasse(e, "fussnoten"));
  for (const dd of findeAlle(fussFooter, (e) => e.name === "dd")) {
    const dt = elemente(dd.eltern)[elemente(dd.eltern).indexOf(dd) - 1];
    fussnotenText.set(attr(dd, "id"), `${zeile(dt)} ${zeile(dd)}`);
  }

  // Kopf: Vollzitat („Vollzitat: Sächsische Bauordnung in der Fassung … , die zuletzt durch … geändert worden ist“)
  const vollzitat = zeile(finde(doc, (e) => e.name === "p" && hatKlasse(e, "vollzitat"))).replace(/^Vollzitat:\s*/, "");
  const vz = vollzitat.match(/^(.*?)\s+((?:vom|in der Fassung) .*?), ((?:die|das|der) zuletzt durch .* geändert worden ist)$/);
  if (!vz) throw new Error(`Vollzitat nicht erkannt: ${vollzitat}`);
  const stand = vz[3];
  if ((stand.match(/\bvom\b/g) ?? []).length !== 1) throw new Error(`Stand mit mehr als einem „vom“: ${stand}`);
  // Amtlicher Titel: Überschrift <h3> mit der Abkürzung in Klammern („(SächsBO)“, „(Sächsisches Denkmalschutzgesetz – SächsDSchG)“)
  let titel = null;
  for (const h3 of findeAlle(lesetext, (e) => e.name === "h3")) {
    const z = zeilenVon(h3);
    const abk = z.findIndex((s) => /^\(.*\)$/.test(s) && s.includes(def.kurz));
    if (abk > 0) {
      titel = z.slice(0, abk).join(" ");
      break;
    }
  }
  if (!titel) throw new Error("Titelüberschrift mit Abkürzung nicht gefunden");
  const rechtsbereinigt = zeile(finde(lesetext, (e) => hatKlasse(e, "rechtsbereinigt")));
  // Beginn der aktuellen Fassung: aktiver Eintrag der Fassungsliste („19.03.2024“)
  const aktiv = finde(doc, (e) => e.name === "li" && hatKlasse(e, "active") && attr(e.eltern, "id") === "historic-versions");
  const ab = zeile(aktiv).match(/^(\d\d\.\d\d\.\d{4})/)?.[1];
  if (!ab) throw new Error("Beginn der aktuellen Fassung nicht gefunden");

  const sektionen = findeAlle(finde(lesetext, (e) => hatKlasse(e, "sections")), (e) => e.name === "section");
  let gliederung = [];
  const normen = [];
  let schlussformel = "";
  const ohneFussnoten = [];
  sektionen.forEach((s, i) => {
    const id = attr(s, "id") ?? "";
    const els = elemente(s);
    const h4 = els[0];
    if (els.some((e) => e.name === "h3")) {
      // Titelzeile des Gesetzes („Sächsische Bauordnung (SächsBO)“, „Rechtsbereinigt mit Stand …“)
      if (els.some((e) => e.name !== "h3" && e.name !== "h4")) throw new Error("Titelabschnitt mit Text");
      for (const a of findeAlle(s, istFussnotenzeichen)) ohneFussnoten.push(`${attr(a, "href")} (Titel)`);
      return;
    }
    if (h4?.name !== "h4") throw new Error(`Abschnitt ${id} ohne Überschrift`);
    const z = zeilenVon(h4);
    const m = id.match(/^p(\d+[a-z]?)$/);
    if (!m) {
      // Gliederungsebene, z. B. „Teil 3“ + „Bauliche Anlagen“, „I. Abschnitt“ + „Aufgabe und …“
      if (els.length > 1) throw new Error(`Gliederungsabschnitt ${id} mit Text`);
      for (const a of findeAlle(s, istFussnotenzeichen)) ohneFussnoten.push(`${attr(a, "href")} (${z[0]})`);
      gliederung = gliederungSetzen(gliederung, gliederungText(z[0], z.slice(1).join(" ")));
      return;
    }
    const bez = z[0].replace(/^§\s*/, "§ ");
    if (bez !== `§ ${m[1]}`) throw new Error(`Überschrift „${z[0]}“ passt nicht zu ${id}`);
    let bloecke = els.slice(1);
    if (i === sektionen.length - 1) {
      const k = bloecke.findIndex((b) => b.name === "p" && ORT_DATUM.test(zeile(b)));
      if (k >= 0) {
        schlussformel = bloecke.slice(k).map((b) => alsText(absatz(kinder(b).flatMap((x) => inlineKnoten(x, REGELN))).c)).join("\n");
        bloecke = bloecke.slice(0, k);
      }
    }
    const fussnoten = findeAlle(s, istFussnotenzeichen).map((a) => {
      const t = fussnotenText.get((attr(a, "href") ?? "").replace(/^#/, ""));
      if (!t) throw new Error(`Fußnote ${attr(a, "href")} nicht gefunden`);
      return t;
    });
    normen.push({
      id: m[1],
      bez,
      titel: z.slice(1).join(" "),
      gliederung: [...gliederung],
      inhalt: paragraphInhalt(bloecke),
      fussnoten: fussnoten.join("\n"),
      url: `${seite}#${id}`,
      quelltext: bloecke.map((b) => textOhne(b, istFussnotenzeichen)).join(""),
    });
  });
  if (ohneFussnoten.length) console.log(`  Hinweis: Fußnoten ohne Vorschrift (nicht übernommen): ${ohneFussnoten.join(", ")}`);

  return {
    kopf: {
      titel,
      stand,
      gueltigAb: datumIso(ab),
      ausfertigung: vz[2],
      schlussformel,
      quelle: { name: NAME, url: seite, fassung: `Aktuelle Fassung ab ${ab} (${rechtsbereinigt})` },
    },
    normen,
  };
}

// ---------- Gegenprüfung mit dem PDF ----------
//
// Das PDF enthält dieselbe Fassung als Druckvorlage: Kopfzeile (Kurzname des Gesetzes) und Fußzeilen
// („http://web:3000“, „Fassung vom 19.03.2024“, „Seite 1 von 55“) je Seite, die Fußnotenzeichen als
// Ziffern im Text („berücksichtigen.2“) und die Fußnoten gesammelt am Ende. Vorgehen:
//   1. Text über pdftotext (Lesereihenfolge); Seitenkopf und -fuß als ganze Zeilen entfernen
//      (Zahl muss 4 × Seitenzahl sein).
//   2. Für jede Vorschrift in Reihenfolge: „§ 6“ + Überschrift, dann der gespeicherte Wortlaut (alle
//      Zeichen außer Leerraum, mit Satzzahlen und Listenmarken) müssen lückenlos folgen. Zwischen zwei
//      Vorschriften darf nur die Gliederungsüberschrift stehen.
//   3. Toleriert und einzeln gezählt:
//      - Fußnotenzeichen im PDF-Text – nur die Nummern der Fußnoten, die zu genau dieser Vorschrift
//        (bzw. zu einer Gliederungsüberschrift) gehören;
//      - Bindestriche am Zeilenende: pdftotext fügt getrennte Zeilen zusammen und lässt dabei auch
//        echte Bindestriche weg („CE-⏎Kennzeichnung“ -> „CEKennzeichnung“). Ein Bindestrich des
//        Imports darf im PDF-Text nur fehlen, wenn der Rohtext des PDF (pdftotext -raw, ohne
//        Zusammenfügen) an genau dieser Stelle „…CE-“ am Zeilenende und „Kennzeichnung…“ in der
//        nächsten Zeile zeigt.
//   4. Fußnotentexte, Schlussformel und Fassungsdatum werden ebenfalls mit dem PDF verglichen.

export async function pruefen(def, gesetz, quellDir) {
  const html = fs.readFileSync(path.join(quellDir, "vorschrift.html"), "utf8");
  const pdfPfad = html.match(/href="(\/vorschrift_gesamt\/\d+\/(\d+)\.pdf)"/);
  if (!pdfPfad) throw new Error("Link „Vorschrift als PDF“ nicht gefunden");
  const datei = path.join(quellDir, "pruefung", `${pdfPfad[2]}.pdf`);
  await rohdatei(datei, BASIS + pdfPfad[1], { binaer: true, immer: false });
  const { text: bereinigt, entfernt, seiten, fassung } = seitenraender(pdftotext(datei, false));
  const strom = ohneLeerraum(bereinigt);
  // Rohtext: Bindestrich am Zeilenende als „\u00ad“ markiert (stromAusText)
  const rohStrom = stromAusText(pdftotext(datei, true));
  const zaehler = { marken: 0, bindestriche: 0 };
  const bindestrichOk = (b, j) => rohStrom.includes(b.slice(Math.max(0, j - 10), j) + "\u00ad" + b.slice(j + 1, j + 11));
  const liste = [];

  // Fußnotennummern je Vorschrift; die übrigen Nummern gehören zu Titel und Gliederung
  const nummern = (fn) => (fn ?? "").split("\n").filter(Boolean).map((f) => f.match(/^(\d+) /)[1]);
  const vergeben = new Set(gesetz.normen.flatMap((n) => nummern(n.fussnoten)));
  const hoechste = Math.max(0, ...[...vergeben].map(Number));
  const sonstige = [];
  for (let i = 1; i <= hoechste + 5; i++) if (!vergeben.has(String(i))) sonstige.push(String(i));

  let pos = 0;
  let vorige = [];
  for (const [i, n] of gesetz.normen.entries()) {
    const kopf = ohneLeerraum(`${n.bez}${n.titel}`);
    const marken = nummern(n.fussnoten);
    // erwartete Gliederungsüberschriften seit der vorigen Vorschrift („Teil 3 – Bauliche Anlagen“ -> „Teil 3 Bauliche Anlagen“)
    const neueGl = n.gliederung.filter((g, k) => vorige[k] !== g).map((g) => g.replace(" – ", " "));
    vorige = n.gliederung;
    // Beginn: erste Stelle ab pos, an der Überschrift und Wortlaut passen. Nur vor der ersten
    // Vorschrift (dort steht die Inhaltsübersicht) wird über einen Fehlversuch hinaus weitergesucht.
    let treffer = null;
    let erster = null;
    for (let s = sucheStrom(strom, pos, kopf, marken, bindestrichOk); s >= 0; s = sucheStrom(strom, s + 1, kopf, marken, bindestrichOk)) {
      const k = vergleicheMarken(strom, s, kopf, marken, bindestrichOk);
      const v = vergleicheMarken(strom, k.ende, alleZeichen(n.inhalt), k.rest, bindestrichOk);
      erster ??= { s, k, v };
      if (v.gleich) {
        treffer = { s, k, v };
        break;
      }
      if (i > 0) break;
    }
    const t = treffer ?? erster;
    if (!t) {
      liste.push({ bez: n.bez, gleich: false, befund: `ÜBERSCHRIFT „${n.bez} ${n.titel}“ im PDF nicht gefunden` });
      continue;
    }
    // Lücke zwischen voriger Vorschrift und dieser: nur Gliederungsüberschrift(en) erlaubt
    let lueckeOk = true;
    if (i > 0) {
      const l = vergleicheMarken(strom, pos, neueGl.join(""), sonstige, bindestrichOk);
      const ende = l.gleich ? restMarken(strom, l.ende, l.rest) : l.ende;
      lueckeOk = l.gleich && ende.pos === t.s;
      zaehler.marken += l.marken + (ende.zahl ?? 0);
      zaehler.bindestriche += l.striche;
    }
    const { k, v } = t;
    // übrige eigene Fußnotenzeichen direkt hinter dem Wortlaut („nachgewiesen hat.53“)
    const ende = restMarken(strom, v.ende, v.rest ?? []);
    const marke = k.marken + v.marken + ende.zahl;
    zaehler.marken += marke;
    const striche = k.striche + v.striche;
    zaehler.bindestriche += striche;
    const toleranz = [marke ? `${marke} Fußnotenzeichen` : "", striche ? `${striche} Bindestrich(e) am Zeilenende` : ""].filter(Boolean);
    const befund = [
      v.gleich ? "Wortlaut gleich" : `ABWEICHUNG ab Zeichen ${v.ab}: PDF „${v.soll}“ / Import „${v.ist}“`,
      k.gleich ? "Überschrift gleich" : "ÜBERSCHRIFT weicht ab",
      lueckeOk ? "" : "LÜCKE vor der Vorschrift (unerwarteter Text im PDF)",
      toleranz.length ? `toleriert: ${toleranz.join(" + ")}` : "",
    ].filter(Boolean);
    liste.push({ bez: n.bez, zeichen: ohneLeerraum(alleZeichen(n.inhalt)).length, gleich: v.gleich && k.gleich && lueckeOk, befund: befund.join(", ") });
    pos = ende.pos;
  }
  // Schlussformel direkt hinter dem letzten Paragraphen
  if (gesetz.schlussformel) {
    const s = vergleicheMarken(strom, pos, gesetz.schlussformel, [], bindestrichOk);
    liste.push({ bez: "Schlussformel", zeichen: ohneLeerraum(gesetz.schlussformel).length, gleich: s.gleich, befund: s.gleich ? "gleich" : `ABWEICHUNG: PDF „${s.soll}“ / Import „${s.ist}“` });
    if (s.gleich) pos = s.ende;
  }
  // Fußnoten: stehen gesammelt hinter dem Gesetzestext („2 § 1 geändert durch …“)
  const alleFn = gesetz.normen.flatMap((n) => (n.fussnoten ? n.fussnoten.split("\n") : []));
  const fehlend = alleFn.filter((f) => sucheStrom(strom, pos, ohneLeerraum(f), [], bindestrichOk) < 0);
  liste.push({
    bez: "Fußnoten",
    zeichen: ohneLeerraum(alleFn.join("")).length,
    gleich: !fehlend.length,
    befund: fehlend.length ? `FEHLEN im PDF: ${fehlend.map((f) => f.split(" ")[0]).join(", ")}` : `alle ${alleFn.length} Fußnoten wörtlich im PDF`,
  });
  // Fassung laut PDF-Fußzeile
  liste.push({ bez: "Fassung", gleich: fassung === gesetz.gueltigAb, befund: `PDF „Fassung vom“ ${fassung} / Import gültig ab ${gesetz.gueltigAb}` });
  return {
    methode: `PDF derselben Fassung (${BASIS}${pdfPfad[1]}, ${seiten} Seiten), Text über pdftotext, alle Paragraphen in Reihenfolge`,
    liste,
    hinweis: `Seitenkopf/-fuß entfernt: ${entfernt} Zeilen; toleriert: ${zaehler.marken} Fußnotenzeichen im PDF-Text, ${zaehler.bindestriche} von pdftotext entfernte Bindestriche am Zeilenende (im Rohtext belegt)`,
  };
}

// Zeichenvergleich ohne Leerraum ab `start` im Strom. Toleranzen (siehe oben): erlaubte
// Fußnotennummern im Strom (jede nur einmal) und – mit Beleg im Rohtext – fehlende Bindestriche.
function vergleicheMarken(strom, start, ist, marken, bindestrichOk) {
  const b = ohneLeerraum(ist);
  const rest = [...marken];
  let i = start;
  let j = 0;
  let zahl = 0;
  let striche = 0;
  while (j < b.length) {
    if (i < strom.length && strom[i] === b[j]) {
      i++;
      j++;
      continue;
    }
    if (b[j] === "-" && bindestrichOk && strom[i] === b[j + 1] && bindestrichOk(b, j)) {
      j++;
      striche++;
      continue;
    }
    const m = rest.findIndex((x) => strom.startsWith(x, i));
    if (m >= 0) {
      i += rest[m].length;
      rest.splice(m, 1);
      zahl++;
      continue;
    }
    return { gleich: false, ab: j, ende: i, marken: zahl, striche, rest, ist: b.slice(j, j + 50), soll: strom.slice(i, i + 50) };
  }
  return { gleich: true, ende: i, marken: zahl, striche, rest };
}

// Erlaubte Fußnotenzeichen unmittelbar an `pos` überspringen
function restMarken(strom, pos, rest) {
  let zahl = 0;
  for (let weiter = true; weiter; ) {
    weiter = false;
    const m = rest.findIndex((x) => strom.startsWith(x, pos));
    if (m >= 0) {
      pos += rest[m].length;
      rest.splice(m, 1);
      zahl++;
      weiter = true;
    }
  }
  return { pos, zahl };
}

// Erste Stelle ab `ab`, an der `muster` beginnt (mit denselben Toleranzen)
function sucheStrom(strom, ab, muster, marken, bindestrichOk) {
  for (let i = strom.indexOf(muster[0], ab); i >= 0; i = strom.indexOf(muster[0], i + 1)) {
    if (vergleicheMarken(strom, i, muster, marken, bindestrichOk).gleich) return i;
  }
  return -1;
}

// PDF-Text über pdftotext: Lesereihenfolge (roh=false) bzw. Inhaltsstrom ohne Zusammenfügen (roh=true)
function pdftotext(pdfDatei, roh) {
  const txt = pdfDatei.replace(/\.pdf$/i, roh ? ".raw.txt" : ".txt");
  if (!fs.existsSync(txt) || fs.statSync(txt).mtimeMs < fs.statSync(pdfDatei).mtimeMs) {
    execFileSync("pdftotext", [...(roh ? ["-raw"] : []), "-enc", "UTF-8", pdfDatei, txt]);
  }
  return fs.readFileSync(txt, "utf8");
}

// Seitenkopf (erste Zeile des PDF, z. B. „SächsBO“) und Seitenfuß als ganze Zeilen entfernen
function seitenraender(roh) {
  const zeilen = roh.replace(/\f/g, "\n").split(/\r?\n/);
  const kopf = zeilen.find((z) => z.trim()).trim();
  const seiten = Number(roh.match(/Seite \d+ von (\d+)/)?.[1] ?? 0);
  const fassung = roh.match(/^Fassung vom (\d\d)\.(\d\d)\.(\d{4})\s*$/m);
  let entfernt = 0;
  const rest = zeilen.filter((z) => {
    const t = z.trim();
    if (t === kopf || t === "http://web:3000" || /^Fassung vom \d\d\.\d\d\.\d{4}$/.test(t) || /^Seite \d+ von \d+$/.test(t)) {
      entfernt++;
      return false;
    }
    return true;
  });
  if (entfernt !== 4 * seiten) throw new Error(`PDF: ${entfernt} Kopf-/Fußzeilen entfernt, erwartet ${4 * seiten} (${seiten} Seiten)`);
  return { text: rest.join("\n"), entfernt, seiten, fassung: fassung ? `${fassung[3]}-${fassung[2]}-${fassung[1]}` : "?" };
}
