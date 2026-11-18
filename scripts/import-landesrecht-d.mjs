// Importiert Landesbauordnungen aus PDF-Dateien (amtliches Gesetzblatt, nichtamtliche Lesefassung, Synopse) und
// speichert sie Vorschrift für Vorschrift als JSON – im selben Schema wie die übrigen Landesgesetze (data/gesetze/).
//
//   lbo-bw  Landesbauordnung für Baden-Württemberg – Bekanntmachung der Neufassung vom 16. März 2026,
//           Gesetzblatt für Baden-Württemberg 2026 Nr. 44 (amtlich)
//   hbo     Hessische Bauordnung – Lesefassung des Hessischen Wirtschaftsministeriums „HBO 2018 mit Änderung vom
//           Oktober 2025“ (nichtamtlich, Nachdruck nur mit Quellenangabe)
//   hbauo   Hamburgische Bauordnung – Gesamtsynopse der Behörde für Stadtentwicklung und Wohnen, rechte Spalte
//           „HBauO neu (ab 01.01.2026)“ (nichtamtliche Lesefassung)
//
// Grundregel: Der Gesetzestext wird NICHT verändert und nie von einer KI formuliert. Jedes Zeichen stammt aus dem PDF;
// gespeichert wird zusätzlich nur die Struktur (Absätze, Listen, hochgestellte Satznummern). Die wenigen
// dokumentierten Entscheidungen (Z1–Z3 an Zeilenumbrüchen und Satznummern: scripts/lib/landesrecht-d-aufbau.mjs;
// Z4 Durchgestrichenes der Synopse: scripts/lib/landesrecht-d-pdf.mjs) stehen mit jedem einzelnen Fall im Prüfprotokoll.
// Die Angaben je Gesetz (Seiten, Ausschnitt, Überschriften, Anlagen, Stand) stehen in scripts/lib/landesrecht-d-gesetze.mjs.
//
// So kommt der Text zustande (je Gesetz):
//   1. PDF laden (eine Anfrage, User-Agent „Ortsauskunft-Prototyp/0.1“) -> data/quellen/landesrecht/<id>/ (nicht versioniert)
//   2. Auslesung 1 (pypdf): Textstücke mit Position -> Zeilen des Ausschnitts (ohne Kopf-/Fußzeile; bei Synopsen nur
//      die rechte Spalte, Spaltengrenze geprüft) -> <id>.zeilen.txt (Rohtext mit Position, zur Durchsicht)
//   3. Auslesung 2 (pdftotext -raw, gleicher Ausschnitt über -marginl/-marginr/-margint/-marginb) -> <id>.pdftotext.txt
//   4. Gegenprüfung A: Seite für Seite alle Zeichen ohne Leerraum – Auslesung 1 = Auslesung 2.
//   5. Aufbau: Gliederung, Vorschriften, Absätze, Listen, Satznummern, Fußnoten der Vorlage.
//   6. Vollständigkeit: Jede Zeile des Ausschnitts ist genau einmal zugeordnet (Vorspann, Gliederung, Überschrift,
//      Normtext, Fußnote, Anmerkung der Synopse in eckigen Klammern, übersprungene Wiederholung des Tabellenkopfs).
//   7. Gegenprüfung B: Jede Vorschrift (Bezeichnung, Überschrift, Inhalt mit Satznummern und Listenmarken) gegen den
//      Text von pdftotext an denselben Stellen, Zeichen für Zeichen ohne Leerraum. Erlaubt sind nur die gezählten
//      Entscheidungen Z2 (entfallener Trennstrich), Z3 („²“ -> Satznummer 2) und Z4 (durchgestrichene Zeichen).
//   Ergebnis und alle Einzelentscheidungen: data/quellen/landesrecht/<id>/pruefung.txt
//
// Aufruf:  node scripts/import-landesrecht-d.mjs                 (lädt die PDFs und importiert alle)
//          node scripts/import-landesrecht-d.mjs --offline       (nutzt die gespeicherten PDFs)
//          node scripts/import-landesrecht-d.mjs --nur=lbo-bw    (nur einzelne Gesetze)

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { stueckeLesen, zeilenBilden, pdftotextSeiten, ohneLeerraum, differenz, pdfInfo } from "./lib/landesrecht-d-pdf.mjs";
import {
  gliedern,
  baueInhalt,
  hochgestelltEinordnen,
  pruefeSatzfolgen,
  besuche,
  neuesProtokoll,
  trenner,
  wortschatz,
} from "./lib/landesrecht-d-aufbau.mjs";
import { alsText, alleZeichen, istWeggefallen, verweiseErkennen, schreibeGesetz } from "./lib/landesrecht-c-gemeinsam.mjs";
import { GESETZE } from "./lib/landesrecht-d-gesetze.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const QUELLEN = path.join(ROOT, "data", "quellen", "landesrecht");
const ZIEL = path.join(ROOT, "data", "gesetze");
const OFFLINE = process.argv.includes("--offline");
const UA = "Ortsauskunft-Prototyp/0.1";
const heute = () => new Date().toISOString().slice(0, 10);

async function ladePdf(def, quellDir) {
  const datei = path.join(quellDir, def.datei);
  const abrufDatei = path.join(quellDir, "abruf.json");
  if (!OFFLINE || !fs.existsSync(datei)) {
    if (OFFLINE) throw new Error(`PDF fehlt: ${datei} (erst ohne --offline ausführen)`);
    const res = await fetch(def.pdfUrl, { headers: { "User-Agent": UA } });
    if (!res.ok) throw new Error(`Download fehlgeschlagen (${def.pdfUrl}): HTTP ${res.status}`);
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.subarray(0, 5).toString("latin1") !== "%PDF-") throw new Error("Download ist kein PDF.");
    fs.writeFileSync(datei, buf);
    fs.writeFileSync(abrufDatei, JSON.stringify({ url: def.pdfUrl, abgerufen: heute() }, null, 1));
  }
  const abgerufen = fs.existsSync(abrufDatei) ? JSON.parse(fs.readFileSync(abrufDatei, "utf8")).abgerufen : new Date(fs.statSync(datei).mtime).toISOString().slice(0, 10);
  return { datei, abgerufen };
}

// Entfernt interne Hilfsfelder (Einordnung des Hochgestellten, Seite, Originalzeichen) vor dem Speichern
const ohneIntern = (k, v) => (k === "art" || k === "seite" || k === "zeichen" ? undefined : v);

async function importiere(def) {
  const quellDir = path.join(QUELLEN, def.id);
  fs.mkdirSync(quellDir, { recursive: true });
  const { datei, abgerufen } = await ladePdf(def, quellDir);
  const info = pdfInfo(datei);
  const daten = stueckeLesen(datei);
  const [von, bis] = def.seiten;
  const zone = def.zone;
  const S = daten.seiten[von - 1];

  // --- Spaltengrenze (Synopse): Die Grenze muss in der Lücke zwischen den Spalten liegen. Beide Auslesungen schneiden
  // an derselben Stelle – ein Schnitt mitten durch Text fiele im Seitenvergleich nicht auf, deshalb diese eigene Prüfung.
  let spaltenText = "";
  if (Number.isFinite(zone.links)) {
    let linksMax = -Infinity, rechtsMin = Infinity;
    for (let s = von; s <= bis; s++)
      for (const p of daten.seiten[s - 1].stuecke) {
        if (!p.t.trim() || p.y > zone.oben || p.y < zone.unten) continue;
        if (p.x < zone.links) linksMax = Math.max(linksMax, p.x);
        else rechtsMin = Math.min(rechtsMin, p.x);
      }
    if (!(linksMax < zone.links - 2 && rechtsMin > zone.links + 2))
      throw new Error(`${def.kurz}: Spaltengrenze x = ${zone.links} liegt nicht in der Lücke (linke Spalte bis ${linksMax}, rechte ab ${rechtsMin}) – von Hand prüfen.`);
    spaltenText = `Spaltengrenze x = ${zone.links} pt: sichtbare Textstücke der linken Spalte beginnen höchstens bei x = ${linksMax.toFixed(1)}, die der rechten frühestens bei x = ${rechtsMin.toFixed(1)} – die Grenze liegt in der Lücke.`;
  }

  // --- Auslesung 1: Zeilen je Seite (mit Abstand vom linken Rand der Seite bzw. Spalte)
  const zeilen = [];
  const jeSeite = new Map();
  for (let s = von; s <= bis; s++) {
    const zs = zeilenBilden(daten.seiten[s - 1], zone);
    const links = def.rand ?? linkerRand(zs, def.textGroesse);
    for (const z of zs) z.rel = z.x - links;
    jeSeite.set(s, zs);
    zeilen.push(...zs);
  }
  const roh = [
    `# ${def.kurz} – Zeilen aus dem PDF (pypdf ${daten.pypdf}), erzeugt von scripts/import-landesrecht-d.mjs`,
    `# Quelle: ${def.pdfUrl} (abgerufen ${abgerufen}, SHA-256 ${info.sha256})`,
    `# Ausschnitt: ${JSON.stringify(zone)} pt; Format: <y> <Abstand vom linken Rand> <Schriftgröße> <F = fett> |Text|, {^…} = hochgestellt`,
  ];
  for (const [s, zs] of jeSeite) {
    roh.push(`@@ Seite ${s}`);
    for (const z of zs) roh.push(`${z.y.toFixed(1).padStart(6)} ${z.rel.toFixed(1).padStart(6)} ${String(z.groesse).padStart(5)} ${z.fett ? "F" : "-"} |${z.teile.map((t) => (t.hoch ? `{^${t.t}}` : t.t)).join("")}|`);
  }
  fs.writeFileSync(path.join(quellDir, `${def.id}.zeilen.txt`), roh.join("\n") + "\n");

  // --- Auslesung 2 und Gegenprüfung A (Seiten)
  const pt = pdftotextSeiten(datei, path.join(quellDir, `${def.id}.pdftotext.txt`), {
    von,
    bis,
    links: Number.isFinite(zone.links) ? zone.links : 0,
    rechts: Number.isFinite(zone.rechts) ? S.breite - zone.rechts : 0,
    oben: S.hoehe - zone.oben,
    unten: zone.unten,
  });
  const seitenPruefung = [];
  const seitenText = new Map(); // seite -> Text ohne Leerraum (pdftotext), nur wenn identisch
  for (const [s, zs] of jeSeite) {
    let pos = 0;
    for (const z of zs) {
      const n = ohneLeerraum(z.text).length;
      z.bereich = [pos, pos + n];
      pos += n;
    }
    const eigen = ohneLeerraum(zs.map((z) => z.text).join(""));
    const zweit = ohneLeerraum(pt[s - 1]);
    const abw = eigen === zweit ? [] : differenz(eigen, zweit);
    seitenPruefung.push({ seite: s, abw, zeichen: eigen.length });
    if (!abw.length) seitenText.set(s, zweit);
  }

  // --- Aufbau
  const prot = neuesProtokoll();
  def.trenner = trenner({
    modus: def.trennung,
    wortschatz: def.trennung === "woerterbuch" ? wortschatz(ZIEL, zeilen, def.wortschatzAus) : undefined,
    behalten: def.bindestrichBehalten,
    trennen: def.bindestrichTrennen,
  });
  const { normen: rohNormen, zuordnung, fussnoten, anmerkungen } = gliedern(zeilen, def, prot);
  for (const n of rohNormen) {
    n.inhalt = baueInhalt(n, def, prot);
    for (const p of n.inhalt) p.c = hochgestelltEinordnen(p.c, prot);
    pruefeSatzfolgen(n, prot);
    // Fußnoten der Vorlage: Text zur Fußnote auf derselben Seite wie das Zeichen
    const texte = [];
    besuche(n.inhalt, (k) => {
      if (k.t !== "sup" || k.art !== "fussnote") return;
      const text = fussnoten.get(k.seite)?.get(k.c[0]);
      if (text === undefined) return prot.fussnoten.push(`${n.bez} (S. ${k.seite}): Zeichen „${k.c[0]}“ ohne Fußnotentext auf derselben Seite`);
      if (!texte.includes(text)) texte.push(text);
      prot.fussnoten.push(`${n.bez} (S. ${k.seite}): Fußnote „${text}“`);
    });
    n.fussnoten = texte.join("\n");
  }
  if (prot.satznummerZeichen.length !== (def.satznummerZeichen ?? 0))
    throw new Error(`${def.kurz}: ${prot.satznummerZeichen.length} statt ${def.satznummerZeichen ?? 0} Satznummern als Zeichen „¹/²/³“ – bitte prüfen:\n${prot.satznummerZeichen.join("\n")}`);
  const ungenutzt = [...def.trenner.benutzt].length - (def.bindestrichBehalten?.length ?? 0) - (def.bindestrichTrennen?.length ?? 0);
  if (ungenutzt) throw new Error(`${def.kurz}: Nicht alle Einträge der Bindestrich-Listen wurden gebraucht – Listen prüfen.`);

  // --- Vollständigkeit: jede Zeile genau einmal zugeordnet
  const zaehler = {};
  for (const z of zeilen) {
    const art = zuordnung.get(z);
    if (!art) throw new Error(`${def.kurz}: Zeile nicht zugeordnet (S. ${z.seite}): ${z.text}`);
    zaehler[art] = (zaehler[art] ?? 0) + ohneLeerraum(z.text).length;
  }

  // --- Gegenprüfung B: jede Vorschrift gegen pdftotext an denselben Stellen
  const ausPdftotext = (zs) => {
    let out = "";
    for (const z of zs) {
      const t = seitenText.get(z.seite);
      if (t === undefined) return null; // Seite nicht identisch -> nicht prüfbar
      out += t.slice(z.bereich[0], z.bereich[1]);
    }
    return out;
  };
  // Vergleich gespeichert/pdftotext (ohne Leerraum); erklärt sind nur entfallene Trennstriche (Z2), „¹/²/³“ als
  // Satznummer (Z3) und durchgestrichene Zeichen der Vorlage (Z4, nur die für diese Zeilen erkannten)
  const vergleichen = (gespeichert, vergleich, zs = []) => {
    if (vergleich === null) return { ok: false, trenn: 0, z3: 0, z4: 0, befund: "Seite nicht identisch – nicht prüfbar" };
    const striche = zs.flatMap((z) => z.gestrichen ?? []).map((g) => ohneLeerraum(g.zeichen)).filter(Boolean);
    const abw = differenz(gespeichert, vergleich);
    const istZ4 = (d) => {
      const i = d.weg === "" ? striche.indexOf(d.neu) : -1;
      if (i < 0) return false;
      striche.splice(i, 1);
      return true;
    };
    const art = (d) => (d.weg === "" && /^-+$/.test(d.neu) ? "z2" : ({ 1: "¹", 2: "²", 3: "³" })[d.weg] === d.neu ? "z3" : istZ4(d) ? "z4" : null);
    const arten = abw.map(art);
    const unerklaert = abw.filter((_, i) => !arten[i]);
    const trenn = abw.filter((_, i) => arten[i] === "z2").reduce((a, d) => a + d.neu.length, 0);
    const z3 = arten.filter((a) => a === "z3").length;
    const z4 = arten.filter((a) => a === "z4").length;
    return {
      ok: !unerklaert.length && !striche.length,
      trenn,
      z3,
      z4,
      befund: [
        unerklaert.length ? `ABWEICHUNG: ${unerklaert.map((d) => `„${d.weg}“ statt „${d.neu}“ bei „${gespeichert.slice(Math.max(0, d.bei - 15), d.bei + 15)}“`).join("; ")}` : "gleich",
        striche.length ? `ABWEICHUNG: durchgestrichen erkannt, aber nicht entfallen: ${striche.join(", ")}` : "",
        trenn || z3 || z4 ? `erklärt: ${trenn}× Trennstrich entfallen (Z2), ${z3}× „¹/²/³“ als Satznummer (Z3), ${z4}× Durchgestrichenes entfallen (Z4)` : "",
      ].filter(Boolean).join(", "),
    };
  };
  const normPruefung = [];
  for (const n of rohNormen) {
    const gliederungsZeilen = n.kopf.filter((z) => zuordnung.get(z) === "gliederung");
    const kopfZeilen = n.kopf.filter((z) => zuordnung.get(z) === "ueberschrift");
    const gespeichert = ohneLeerraum(n.bez + n.titel + alleZeichen(n.inhalt));
    const v = vergleichen(gespeichert, ausPdftotext([...kopfZeilen, ...n.zeilen]), [...kopfZeilen, ...n.zeilen]);
    // Gliederung: gespeichert „ERSTER TEIL – Allgemeine Vorschriften“ (Gedankenstrich von uns) gegen ihre Zeilen
    let g = null;
    if (gliederungsZeilen.length) {
      const neu = n.gliederung.slice(-countNeu(gliederungsZeilen));
      g = vergleichen(ohneLeerraum(neu.map((x) => x.replace(" – ", "")).join("")), ausPdftotext(gliederungsZeilen), gliederungsZeilen);
    }
    normPruefung.push({
      bez: n.bez,
      ok: v.ok && (!g || g.ok),
      zeichen: gespeichert.length,
      trenn: v.trenn + (g?.trenn ?? 0),
      z3: v.z3,
      z4: v.z4 + (g?.z4 ?? 0),
      befund: `Wortlaut ${v.befund}` + (g ? `; Gliederungsüberschrift davor ${g.befund}` : ""),
    });
  }
  // Fußnoten der Vorlage (Text samt Zeichen) gegen pdftotext
  for (const [seite, m] of fussnoten) {
    const zs = zeilen.filter((z) => z.seite === seite && zuordnung.get(z) === "fussnote");
    const v = vergleichen(ohneLeerraum([...m.values()].join("")), ausPdftotext(zs), zs);
    normPruefung.push({ bez: `Fußnote S. ${seite}`, ok: v.ok, zeichen: ohneLeerraum([...m.values()].join("")).length, trenn: v.trenn, z3: 0, befund: `Fußnotentext ${v.befund}` });
  }
  const trennSumme = normPruefung.reduce((a, p) => a + (p.trenn ?? 0), 0);
  const z3Summe = normPruefung.reduce((a, p) => a + (p.z3 ?? 0), 0);
  const z4Summe = normPruefung.reduce((a, p) => a + (p.z4 ?? 0), 0);
  // Durchgestrichenes (Z4) – je Fall mit Wort; durchgestrichene Leerzeichen bleiben (sonst klebten Wörter zusammen)
  const gestrichen = zeilen.flatMap((z) => (z.gestrichen ?? []).map((g) => ({ ...g, z, norm: rohNormen.find((n) => n.zeilen.includes(z) || n.kopf.includes(z)) })));
  const z4Erkannt = gestrichen.filter((g) => g.zeichen.trim()).length;

  // --- Listenpunkte, die ohne Satzzeichen enden und deren Folgepunkt klein beginnt (Hinweis auf eine Listennummer an
  // falscher Stelle, z. B. nach einem Seitenwechsel) – nur Protokoll, von Hand zu prüfen
  const listenAuffaellig = [];
  const listenPruefen = (nodes, bez) => {
    for (const n of nodes) {
      if (typeof n === "string") continue;
      if (n.t === "dl") {
        n.items.forEach((it, k) => {
          listenPruefen(it.c, bez);
          const naechster = n.items[k + 1];
          const ende = it.c[it.c.length - 1];
          if (!naechster || typeof ende !== "string") return;
          const anfang = typeof naechster.c[0] === "string" ? naechster.c[0] : "";
          if (!/([,;.:;]|\b(und|oder|sowie|bzw\.))$/.test(ende.trimEnd()) && /^\p{Ll}/u.test(anfang))
            listenAuffaellig.push(`${bez}: Punkt „${it.dt}“ endet „…${ende.slice(-30)}“, Punkt „${naechster.dt}“ beginnt „${anfang.slice(0, 30)}…“`);
        });
      } else if (n.c) listenPruefen(n.c, bez);
    }
  };
  for (const n of rohNormen) listenPruefen(n.inhalt, n.bez);

  // --- Inhaltsverzeichnis der Vorlage gegen die Überschriften (nur Information)
  const ivAbweichungen = [];
  const vorspann = zeilen.filter((z) => zuordnung.get(z) === "vorspann").map((z) => z.text.trim());
  const verzeichnis = new Map();
  for (const t of vorspann) {
    const m = t.match(/^§\s*(\d+[a-z]?)(?:\s+(.*))?$/);
    if (m) verzeichnis.set(m[1], m[2] ?? null);
  }
  for (const n of def.inhaltsverzeichnis === false ? [] : rohNormen.filter((x) => !x.anlage)) {
    const e = verzeichnis.get(n.id);
    if (e === undefined) ivAbweichungen.push(`${n.bez}: nicht im Inhaltsverzeichnis`);
    else if (e !== null && !n.titel.startsWith(e.replace(/\s+/g, " ").trim()) && ohneLeerraum(e) !== ohneLeerraum(n.titel)) ivAbweichungen.push(`${n.bez}: Überschrift „${n.titel}“ – Inhaltsverzeichnis „${e}“`);
  }
  if (def.inhaltsverzeichnis === false) ivAbweichungen.push("(nicht geprüft: Das Inhaltsverzeichnis der Vorlage ist zweispaltig und liegt nicht im Ausschnitt.)");
  else for (const id of verzeichnis.keys()) if (!rohNormen.some((n) => n.id === id)) ivAbweichungen.push(`§ ${id}: im Inhaltsverzeichnis, aber nicht im Text`);

  // --- Kopfangaben (aus dem Vorspann, geprüft) und Ergebnis
  // Kopfangaben: Vorspann im Ausschnitt, bei Synopsen zusätzlich die ganzen ersten Seiten (Titel über beide Spalten)
  const kopfSeitenText = [];
  for (let s = def.kopfSeiten?.[0] ?? 1; s <= (def.kopfSeiten?.[1] ?? 0); s++) kopfSeitenText.push(...zeilenBilden(daten.seiten[s - 1], {}).map((z) => z.text.trim()));
  const kopf = def.kopf([...kopfSeitenText, ...vorspann].join("\n"));
  // Anlagen am Ende (in einer Synopse kann die Anlage direkt nach ihrer Vorschrift stehen)
  const reihenfolge = [...rohNormen.filter((n) => !n.anlage), ...rohNormen.filter((n) => n.anlage)];
  const normen = reihenfolge.map((n) => {
    // Feld "text" (Suche, Verweise): ohne Satznummern und ohne Fußnotenzeichen (wie mbo.json), m²/m³ als Zeichen
    const text = alsText(ohneFussnotenzeichen(n.inhalt));
    const striche = gestrichen.filter((g) => g.norm === n && g.zeichen.trim());
    const hinweis = [
      def.hinweise?.[n.id],
      striche.length
        ? `Hinweis der App: In der Vorlage ${striche.length > 1 ? "sind" : "ist"} ${striche.map((g) => `in „${g.wort.replace(/[⟦⟧]/g, "")}“ „${g.zeichen}“`).join(", ")} durchgestrichen (Streichung); übernommen ist der Text ohne die durchgestrichenen Zeichen (${striche.map((g) => `„${g.wort.replace(/⟦[^⟧]*⟧/g, "")}“`).join(", ")}).`
        : "",
    ].filter(Boolean).join("\n");
    return {
      id: n.id,
      bez: n.bez,
      titel: n.titel,
      gliederung: n.gliederung,
      weggefallen: istWeggefallen(n.titel, text) || !text,
      inhalt: n.inhalt,
      text,
      fussnoten: [n.fussnoten, hinweis].filter(Boolean).join("\n") || undefined,
      url: `${def.pdfUrl}#page=${n.seite}`,
    };
  });
  // Verweis-Erkennung: scripts/lib/verweise.mjs liest „des Baugesetzbuchs“ als „dieses Gesetz“ (geschrieben für das
  // BauGB) – nur für die Erkennung wird es zu „des BauGB“ (wie in import-mbo.mjs); der gespeicherte Text bleibt unverändert.
  const texte = normen.map((n) => n.text);
  normen.forEach((n) => (n.text = n.text.replace(/des Baugesetzbuch(e?s)\b/g, "des BauGB")));
  verweiseErkennen(normen, { kuerzel: def.kurz });
  normen.forEach((n, i) => (n.text = texte[i]));
  const gesetz = {
    id: def.id,
    kurz: def.kurz,
    titel: kopf.titel,
    ebene: def.land,
    land: def.land,
    typ: def.typ,
    stand: kopf.stand,
    gueltigAb: kopf.gueltigAb,
    ausfertigung: kopf.ausfertigung,
    quelle: { name: def.quelleName, url: def.pdfUrl, fassung: kopf.fassung, amtlich: def.amtlich, hinweis: def.quelleHinweis, sha256: info.sha256, abgerufen },
    normen,
  };
  schreibeGesetz(path.join(ZIEL, `${def.id}.json`), JSON.parse(JSON.stringify(gesetz, ohneIntern)));

  // --- Prüfprotokoll
  const seitenFehler = seitenPruefung.filter((p) => p.abw.length);
  const normFehler = normPruefung.filter((p) => !p.ok);
  const pruefen = prot.trennstriche.filter((t) => t.includes("PRÜFEN"));
  const zeilenProt = [
    `Prüfprotokoll ${def.kurz} – erzeugt von scripts/import-landesrecht-d.mjs (nicht von Hand bearbeiten), ${heute()}`,
    `Quelle: ${def.pdfUrl}`,
    `PDF: ${daten.seiten.length} Seiten, ${info.bytes} Bytes, SHA-256 ${info.sha256}, abgerufen ${abgerufen}`,
    `Ausschnitt: Seiten ${von}–${bis}, ${JSON.stringify(zone)} pt (Ursprung unten links)` + (def.spalteText ? ` – ${def.spalteText}` : ""),
    ...(spaltenText ? [spaltenText] : []),
    "",
    "A. Seitenvergleich: Auslesung 1 (pypdf, Zeilen) gegen Auslesung 2 (pdftotext -raw, gleicher Ausschnitt), alle Zeichen ohne Leerraum",
    `   ${seitenPruefung.length - seitenFehler.length}/${seitenPruefung.length} Seiten identisch` + (seitenFehler.length ? ":" : "."),
    ...seitenFehler.map((p) => `   S. ${p.seite}${p.seite < kopfSeite(rohNormen) ? " (Vorspann/Inhaltsverzeichnis)" : ""}: ${p.abw.slice(0, 4).map((d) => `„${d.weg.slice(0, 30)}“ -> „${d.neu.slice(0, 30)}“`).join("; ")}`),
    "",
    "B. Vorschriften: gespeicherter Wortlaut (Bezeichnung, Überschrift, Inhalt mit Satznummern und Listenmarken) gegen pdftotext an denselben Stellen",
    `   ${normPruefung.length - normFehler.length}/${normPruefung.length} Einträge identisch (ohne Leerraum; erlaubt nur Z2/Z3)` + ` – ${trennSumme} Trennstriche entfallen (Protokoll: ${prot.silbentrennungen}), ${z3Summe} Satznummern aus „²/³“ (Protokoll: ${prot.satznummerZeichen.length})`,
    ...normPruefung.map((p) => `   ${p.bez.padEnd(12)} ${String(p.zeichen).padStart(6)} Zeichen  ${p.befund}`),
    "",
    "C. Vollständigkeit: Zeichen ohne Leerraum je Zuordnung der Zeilen",
    `   ${Object.entries(zaehler).map(([k, v]) => `${k} ${v}`).join(", ")}; Summe ${Object.values(zaehler).reduce((a, b) => a + b, 0)} = alle Zeichen des Ausschnitts ${seitenPruefung.reduce((a, p) => a + p.zeichen, 0)}`,
    "",
    `D. Bindestriche am Zeilenende (Z2) – ${prot.trennstriche.length} Fälle, davon ${prot.silbentrennungen} als Worttrennung entfernt` + (pruefen.length ? `, ${pruefen.length} ohne eindeutigen Beleg (PRÜFEN)` : ""),
    ...prot.trennstriche.map((t) => "   " + t),
    "",
    `E. Zeilenende ohne Leerzeichen-Zeichen (Z1) – ${prot.zeilenenden.length} Fälle`,
    ...prot.zeilenenden.map((t) => "   " + t),
    "",
    `F. Satznummer als Zeichen „¹/²/³“ (Z3) – ${prot.satznummerZeichen.length} Fälle`,
    ...prot.satznummerZeichen.map((t) => "   " + t),
    "",
    `G. Hochgestelltes: ${prot.hochgestellt.satz} Satznummern, ${prot.hochgestellt.fussnote} Fußnotenzeichen, ${prot.hochgestellt.einheit} Einheiten (m²/m³)`,
    ...prot.fussnoten.map((t) => "   " + t),
    ...(prot.satzfolgen.length ? ["   Ungewöhnliche Satznummernfolgen:", ...prot.satzfolgen.map((t) => "     " + t)] : []),
    "",
    "H. Absätze und Listen",
    ...(prot.absatzfolgen.length ? prot.absatzfolgen.map((t) => "   " + t) : ["   Absatznummern: in jeder Vorschrift lückenlos (1), (2), …"]),
    ...prot.listen.map((t) => "   " + t),
    `   Listenpunkte ohne Satzzeichen am Ende, Folgepunkt beginnt klein (von Hand prüfen) – ${listenAuffaellig.length}`,
    ...listenAuffaellig.map((t) => "     " + t),
    ...Object.entries(def.hinweise ?? {}).map(([id, t]) => `   Hinweis zu ${rohNormen.find((n) => n.id === id)?.bez ?? id}: ${t}`),
    "",
    `M. Anmerkungen der Vorlage in eckigen Klammern (kein Gesetzestext, nicht übernommen) – ${anmerkungen.length}`,
    ...anmerkungen.map((a) => `   S. ${a.z.seite}, nach ${a.norm?.bez ?? "?"}: ${a.z.text.trim()}`),
    "",
    `L. Durchgestrichenes in der Vorlage (Z4) – ${z4Erkannt} Fälle entfallen` + (gestrichen.length > z4Erkannt ? `, ${gestrichen.length - z4Erkannt} durchgestrichene Leerzeichen bleiben` : ""),
    ...gestrichen.map((g) => `   S. ${g.z.seite}, ${g.norm?.bez ?? "?"}: „${g.wort}“ – ${g.zeichen.trim() ? `„${g.zeichen}“ entfällt` : "durchgestrichenes Leerzeichen bleibt (Wortgrenze)"}`),
    "",
    `I. Inhaltsverzeichnis der Vorlage gegen die Überschriften im Text (maßgeblich ist der Text) – ${ivAbweichungen.length} Abweichungen`,
    ...ivAbweichungen.map((t) => "   " + t),
    "",
    "K. Seltene Zeichen im Wortlaut (unverändert übernommen; z. B. U+037E „;“ = griechisches Fragezeichen, sieht aus wie ein Semikolon)",
    ...seltene(normen),
    ...(def.auffaelligkeiten ?["", "J. Auffälligkeiten der Vorlage (unverändert übernommen)", ...def.auffaelligkeiten(zeilen.filter((z) => zuordnung.get(z) === "normtext")).map((t) => "   " + t)] : []),
  ];
  fs.writeFileSync(path.join(quellDir, "pruefung.txt"), zeilenProt.join("\n") + "\n");

  const weg = normen.filter((n) => n.weggefallen).length;
  console.log(`${def.kurz}: ${normen.length} Einträge (${weg} weggefallen) – ${gesetz.stand}`);
  console.log(`  A Seiten: ${seitenPruefung.length - seitenFehler.length}/${seitenPruefung.length} identisch (pypdf = pdftotext, ohne Leerraum)` + (seitenFehler.length ? ` – abweichend: S. ${seitenFehler.map((p) => p.seite).join(", ")}` : ""));
  console.log(`  B Vorschriften: ${normPruefung.length - normFehler.length}/${normPruefung.length} identisch mit pdftotext (Z2: ${trennSumme}, Z3: ${z3Summe}, Z4: ${z4Summe})`);
  console.log(`  Bindestriche am Zeilenende: ${prot.trennstriche.length}, davon entfernt ${prot.silbentrennungen}, PRÜFEN ${pruefen.length}; Zeilenenden ohne Leerzeichen: ${prot.zeilenenden.length}`);
  console.log(`  Prüfprotokoll: ${path.relative(ROOT, path.join(quellDir, "pruefung.txt"))}`);
  if (normFehler.length || seitenFehler.some((p) => p.seite >= kopfSeite(rohNormen))) process.exitCode = 1;
  if (trennSumme !== prot.silbentrennungen || z3Summe !== prot.satznummerZeichen.length || z4Summe !== z4Erkannt) {
    console.error(`  ACHTUNG: Gegenprüfung passt nicht zu den gezählten Entscheidungen Z2/Z3.`);
    process.exitCode = 1;
  }
}

// Linker Rand einer Seite bzw. Spalte: kleinste Anfangsposition, an der mindestens zwei Zeilen in Textgröße beginnen
// (eine einzelne, weiter links gesetzte Zeile – etwa Text nach einer Liste – verschiebt den Rand so nicht).
function linkerRand(zs, textGroesse) {
  const text = zs.filter((z) => Math.abs(z.groesse - textGroesse) < 0.35);
  const xs = (text.length ? text : zs).map((z) => z.x).sort((a, b) => a - b);
  for (const x of xs) if (xs.filter((y) => Math.abs(y - x) < 1.5).length >= 2) return x;
  return xs[0] ?? 0;
}

// Kopie des Knotenbaums ohne Fußnotenzeichen (hochgestellt, keine Satznummer/Einheit). Die übrigen Knoten bleiben
// dieselben Objekte – alsText erkennt Satznummern an ihrer Identität (SATZNUMMERN in scripts/lib/voris.mjs).
function ohneFussnotenzeichen(nodes) {
  return nodes
    .filter((k) => !(typeof k !== "string" && k.t === "sup" && k.art === "fussnote"))
    .map((k) => {
      if (typeof k === "string") return k;
      if (k.t === "dl") return { ...k, items: k.items.map((it) => ({ ...it, c: ohneFussnotenzeichen(it.c) })) };
      if (k.t === "sup" || !k.c) return k;
      return { ...k, c: ohneFussnotenzeichen(k.c) };
    });
}

// Zeichen außerhalb des üblichen Bestands eines deutschen Gesetzestexts (nur Protokoll)
function seltene(normen) {
  const ueblich = /[\x20-\x7e\n äöüÄÖÜß§²³°„“”–—…€½¼¾µ]/u;
  const zaehler = new Map();
  for (const n of normen)
    for (const c of n.text) if (!ueblich.test(c)) zaehler.set(c, [...(zaehler.get(c) ?? []), n.bez]);
  if (!zaehler.size) return ["   keine"];
  return [...zaehler].map(([c, wo]) => `   „${c}“ U+${c.codePointAt(0).toString(16).toUpperCase().padStart(4, "0")}: ${wo.length}× (${[...new Set(wo)].join(", ")})`);
}

const countNeu = (gliederungsZeilen) => gliederungsZeilen.filter((z) => /^(Erster|Zweiter|Dritter|Vierter|Fünfter|Sechster|Siebenter|Siebter|Achter|Neunter|Zehnter|Elfter|Zwölfter) (Teil|Abschnitt|Unterabschnitt)$/iu.test(z.text.trim())).length;
const kopfSeite = (normen) => normen[0]?.seite ?? 0;

async function main() {
  const nur = process.argv.find((a) => a.startsWith("--nur="))?.slice(6).split(",");
  const auswahl = nur ? GESETZE.filter((g) => nur.includes(g.id)) : GESETZE;
  if (nur && auswahl.length !== nur.length) throw new Error(`Unbekannte Gesetz-ID in --nur: ${nur.join(",")}`);
  for (const def of auswahl) {
    try {
      await importiere(def);
    } catch (e) {
      console.error(`FEHLER bei ${def.kurz}:`, e);
      process.exitCode = 1;
    }
  }
}

main();

