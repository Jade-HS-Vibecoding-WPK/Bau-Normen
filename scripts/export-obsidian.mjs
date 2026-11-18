// Exportiert Gesetze und Projektdateien als Obsidian-Vault in den Ordner obsidian/,
// damit man Aufbau und Zusammenhänge in Obsidian (vor allem in der Graph-Ansicht) ansehen kann.
//
//   obsidian/Gesetze/   eine Notiz pro Paragraph/Anlage, pro Gliederungsebene und pro Gesetz
//   obsidian/Projekt/   eine Notiz pro Quelldatei (app, components, lib, scripts, tests) + Architektur
//   obsidian/Start.md   Anleitung, Farblegende und Einstieg
//   obsidian/.obsidian/graph.json  Farbgruppen für die Graph-Ansicht (nur wenn noch nicht vorhanden)
//
// Grundregel: Der Gesetzestext wird NICHT verändert. Zeichen, die in Markdown/Obsidian eine
// Bedeutung haben (* _ # [ ] | > ` $ % = ~ ^ & < \), werden mit "\" maskiert, damit Obsidian
// den Wortlaut exakt so anzeigt, wie er in der Quelle steht. Ein Selbsttest prüft vor dem
// Schreiben jede Vorschrift: Maskierung wieder entfernen, Leerraum vereinheitlichen und mit dem
// Feld "text" aus data/gesetze/*.json vergleichen. Bei einer Abweichung bricht das Skript ab
// und schreibt nichts.
//
// Aufruf:  npm run obsidian
//          (Standard: Brotkrumen verlinken nur die direkte Oberebene -> übersichtlicher Baum im Graph)
//          npm run obsidian -- --voller-pfad      (Brotkrumen verlinken alle Ebenen)
//          npm run obsidian -- --graph-farben     (Farbgruppen in einer vorhandenen graph.json neu setzen)
//
// Das Skript löscht und erzeugt nur obsidian/Gesetze/, obsidian/Projekt/ und obsidian/Start.md.
// Eigene Notizen an anderer Stelle im Vault und der Ordner .obsidian/ bleiben unangetastet.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const VAULT = path.join(ROOT, "obsidian");
const GESETZE_DIR = path.join(ROOT, "data", "gesetze");
const ERL_DIR = path.join(ROOT, "data", "erlaeuterungen");
const PROJEKT_ORDNER = ["app", "components", "lib", "scripts", "tests"];
const QUELL_ENDUNGEN = [".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs", ".css"];
const IGNORIERT = new Set(["node_modules", ".next", ".git"]);

const OPTIONEN = new Set(process.argv.slice(2));
const SCHLANK = !OPTIONEN.has("--voller-pfad");

// Farben der Graph-Ansicht. Reihenfolge = Priorität (die erste passende Gruppe färbt den Knoten).
const FARBE_GLIEDERUNG = "#7d93ad"; // grau-blau
const FARBE_PROJEKT = "#9a9a9a"; // grau
const GESETZ_FARBEN = { baugb: "#4a9a5b" /* grün */, ndschg: "#c8952c" /* ocker */, nbauo: "#2f8a7e" /* petrol */, mbo: "#3f8fb5" /* blau */, voba: "#8e6bb0" /* violett */, vobb: "#c0504d" /* rot */, vobc: "#b5651d" /* braun */ };
const FARB_NAMEN = { baugb: "grün", ndschg: "ocker", nbauo: "petrol", mbo: "blau", voba: "violett", vobb: "rot", vobc: "braun" };
const ERSATZ_FARBEN = ["#8e6bb0", "#c0504d", "#3f8fb5", "#b5651d"];

const toPosix = (p) => p.split(path.sep).join("/");

// ---------------------------------------------------------------------------------------------
// 1. Markdown-Maskierung (Wortlaut-Treue)
// ---------------------------------------------------------------------------------------------

const NBSP = " ";
const EINZUG = NBSP.repeat(4); // Einrückung je Listenebene (geschützte Leerzeichen erzeugen keinen Codeblock)

// Zeichen, die in Obsidian-Markdown etwas auslösen können (Betonung, Links, Tags, Tabellen,
// Zitate, HTML, Code, Mathe, Kommentare %%, Hervorhebung ==, Durchstreichen ~~, Block-IDs ^, Entities &).
// \x60 = Backtick.
const MD_AKTIV = /[\\\x60*_[\]<>#|$~=%^&]/g;

/** Maskiert Text für eine Markdown-Zeile: gerendert erscheint er exakt wie übergeben. */
function mdText(s) {
  return String(s)
    .replace(MD_AKTIV, (c) => "\\" + c)
    .replace(/:(?=:)/g, ":\\"); // "::" wäre ein Dataview-Inline-Feld
}

/** Maskiert, was nur am Zeilenanfang wirkt: "1." / "1)" (nummerierte Liste), "-" / "+" (Aufzählung). */
function mdZeilenanfang(s) {
  return s.replace(/^(\s*)(\d{1,9})([.)])/, "$1$2\\$3").replace(/^(\s*)([-+])/, "$1\\$2");
}

/** Leerraum aus der Quelle (Zeilenumbrüche, Tabs, Mehrfach-Leerzeichen) wie im Browser zu einem Leerzeichen. */
const leer = (s) => String(s).replace(/[ \t\r\n\f\v]+/g, " ");

/** Links-Anzeigetext: nur Zeichen ersetzen, die einen [[Wikilink|Text]] zerbrechen würden. */
const linkAnzeige = (s) => leer(s).replace(/\[/g, "(").replace(/\]/g, ")").replace(/\|/g, "/").trim();

/**
 * Wandelt den Strukturbaum (lib/typen.ts: TextKnoten) in Markdown um.
 * - jeder Absatz der obersten Ebene wird ein eigener Markdown-Absatz
 * - Listenpunkte (dl/dt) stehen auf eigenen Zeilen, je Ebene eingerückt; Zeilen enden mit
 *   einem harten Umbruch ("  "), damit das auch mit "Strikte Zeilenumbrüche" funktioniert
 * - Tabellen werden Markdown-Tabellen mit leerer Kopfzeile
 */
function inhaltAlsMarkdown(inhalt) {
  const bloecke = [];
  let zeilen = [];
  let puffer = "";
  let tiefe = 0;
  const zeileEnde = () => {
    const t = puffer.trim();
    if (t) zeilen.push({ tiefe, text: t });
    puffer = "";
  };
  const blockEnde = () => {
    zeileEnde();
    if (zeilen.length) bloecke.push({ art: "zeilen", zeilen });
    zeilen = [];
  };
  const istBlock = (k) =>
    typeof k !== "string" && (["p", "br", "dl", "table", "pre", "hinweis"].includes(k.t) || (Array.isArray(k.c) && k.c.some(istBlock)));

  const lauf = (nodes, oben) => {
    for (const k of nodes) {
      if (typeof k === "string") {
        puffer += mdText(leer(k));
        continue;
      }
      switch (k.t) {
        case "p":
          if (oben && tiefe === 0) {
            blockEnde();
            lauf(k.c, false);
            blockEnde();
          } else {
            zeileEnde();
            lauf(k.c, false);
            zeileEnde();
          }
          break;
        case "br":
          zeileEnde();
          break;
        case "dl": {
          zeileEnde();
          const vorher = tiefe;
          for (const it of k.items) {
            tiefe = vorher + 1;
            puffer = mdText(leer(it.dt)) + " ";
            lauf(it.c, false);
            zeileEnde();
          }
          tiefe = vorher;
          break;
        }
        case "table":
          blockEnde();
          bloecke.push({ art: "tabelle", zeilen: k.rows });
          break;
        case "pre":
          zeileEnde();
          for (const z of String(k.v).split(/\r?\n/)) {
            puffer = mdText(leer(z));
            zeileEnde();
          }
          break;
        case "hinweis":
          puffer += mdText(leer(k.v));
          zeileEnde();
          break;
        case "b":
        case "i":
        case "sup":
        case "sub":
          if (k.c.some(istBlock)) lauf(k.c, false);
          else {
            puffer += `<${k.t}>`;
            lauf(k.c, false);
            puffer += `</${k.t}>`;
          }
          break;
        default:
          if (Array.isArray(k.c)) lauf(k.c, false);
          else if (typeof k.v === "string") puffer += mdText(leer(k.v));
      }
    }
  };
  lauf(inhalt, true);
  blockEnde();

  return bloecke
    .map((b) =>
      b.art === "tabelle"
        ? tabelleAlsMarkdown(b.zeilen)
        : b.zeilen.map((z) => EINZUG.repeat(z.tiefe) + mdZeilenanfang(z.text)).join("  \n"),
    )
    .join("\n\n");
}

function tabelleAlsMarkdown(rows) {
  const spalten = Math.max(1, ...rows.map((r) => r.length));
  const zelle = (s) => mdText(leer(s)).trim();
  return [
    "|" + " |".repeat(spalten), // leere Kopfzeile: die Quelle hat keine
    "|" + "---|".repeat(spalten),
    ...rows.map((r) => "| " + r.map(zelle).join(" | ") + " |"),
  ].join("\n");
}

// ---------------------------------------------------------------------------------------------
// 2. Selbsttest: Markdown -> sichtbarer Text (unabhängig von der Maskierung geschrieben)
// ---------------------------------------------------------------------------------------------

const ASCII_SATZZEICHEN = /[!-/:-@[-\x60{-~]/;
const EIGENE_TAGS = /^<\/?(b|i|sup|sub)>/;
const MD_GEFAEHRLICH = new Set(["\\", "\x60", "*", "_", "[", "]", "<", ">", "#", "|", "$", "~", "=", "%", "^", "&"]);

/**
 * Liest eine Markdown-Zeile so, wie Obsidian sie anzeigen würde: "\x" -> "x", eigene HTML-Tags
 * entfernen. Bricht ab, wenn ein unmaskiertes Zeichen Markdown auslösen könnte – dann wäre
 * der gerenderte Text nicht mehr der Wortlaut.
 */
function zeileZuText(z) {
  let out = "";
  for (let i = 0; i < z.length; i++) {
    const c = z[i];
    if (c === "\\") {
      const d = z[i + 1];
      if (d !== undefined && ASCII_SATZZEICHEN.test(d)) {
        out += d;
        i++;
        continue;
      }
      throw new Error(`einzelner Backslash an Stelle ${i}`);
    }
    if (c === "<") {
      const m = z.slice(i).match(EIGENE_TAGS);
      if (m) {
        i += m[0].length - 1;
        continue;
      }
    }
    if (MD_GEFAEHRLICH.has(c)) throw new Error(`unmaskiertes Markdown-Zeichen "${c}" in: ${z.slice(Math.max(0, i - 30), i + 30)}`);
    if (c === ":" && z[i + 1] === ":") throw new Error(`unmaskiertes "::" in: ${z.slice(Math.max(0, i - 30), i + 30)}`);
    out += c;
  }
  return out;
}

function zellenTeilen(zeile) {
  const zellen = [];
  let akt = "";
  for (let i = 0; i < zeile.length; i++) {
    if (zeile[i] === "\\" && i + 1 < zeile.length) {
      akt += zeile[i] + zeile[i + 1];
      i++;
    } else if (zeile[i] === "|") {
      zellen.push(akt);
      akt = "";
    } else akt += zeile[i];
  }
  zellen.push(akt);
  return zellen.slice(1, -1).map((s) => s.trim()); // führendes und abschließendes "|"
}

/** Macht aus dem Markdown des Abschnitts "Originaltext" wieder reinen Text. */
function markdownZuKlartext(md) {
  const teile = [];
  for (const roh of md.split("\n")) {
    if (!roh.trim()) {
      teile.push("");
      continue;
    }
    if (roh.startsWith("|")) {
      const zellen = zellenTeilen(roh);
      if (zellen.every((s) => /^:?-+:?$/.test(s))) continue; // Trennzeile
      if (zellen.every((s) => s === "")) continue; // leere Kopfzeile
      teile.push(zellen.map(zeileZuText).join(" | "));
      continue;
    }
    if (/^( {4}|\t)/.test(roh)) throw new Error(`Zeile würde als Codeblock gelesen: ${roh.slice(0, 60)}`);
    const inhalt = roh.replace(/ {2}$/, "").replace(/^\s+/, "");
    if (/^\d{1,9}[.)]/.test(inhalt)) throw new Error(`Zeile würde als nummerierte Liste gelesen: ${inhalt.slice(0, 60)}`);
    if (/^[-+]/.test(inhalt)) throw new Error(`Zeile würde als Aufzählung/Trennlinie gelesen: ${inhalt.slice(0, 60)}`);
    teile.push(zeileZuText(inhalt));
  }
  return teile.join("\n");
}

const normWs = (s) => String(s).replace(/\s+/g, " ").trim();

function abweichung(ist, soll) {
  let i = 0;
  while (i < ist.length && i < soll.length && ist[i] === soll[i]) i++;
  return `ab Zeichen ${i}: Notiz „…${ist.slice(Math.max(0, i - 40), i + 40)}…“ – Quelle „…${soll.slice(Math.max(0, i - 40), i + 40)}…“`;
}

/** Prüft, ob der Selbsttest Fehler überhaupt erkennen würde (sonst wäre er wertlos). */
function gegenprobe() {
  const fehler = [];
  const mussScheitern = (md, was) => {
    try {
      markdownZuKlartext(md);
      fehler.push(`Gegenprobe: ${was} wurde nicht erkannt`);
    } catch {
      /* erwartet */
    }
  };
  mussScheitern("1. Erstens", "nummerierte Liste");
  mussScheitern("- Punkt", "Aufzählung");
  mussScheitern("Text mit *Betonung*", "Kursivschrift");
  mussScheitern("Siehe [[§ 1 BauGB]]", "Wikilink");
  mussScheitern("# Überschrift", "Überschrift");
  mussScheitern("> Zitat", "Zitat");
  mussScheitern("    eingerückt", "Codeblock");
  mussScheitern("a == b ==", "Hervorhebung");

  const sonder = "1. !\"#$%&'()*+,-./:;<=>?@[\\]^_\x60{|}~ a::b 2) - + > #tag ==m== %%k%% $x$ ~~s~~ ^id <b>x</b> &amp;";
  const probe = [
    { t: "p", c: [sonder] },
    { t: "dl", items: [{ dt: "1.", c: ["- a ", { t: "dl", items: [{ dt: "a)", c: ["+ b"] }] }, "c"] }] },
    { t: "table", rows: [["1.", "a|b"], ["2.", "*c*"]] },
    { t: "p", c: [{ t: "b", c: ["fett"] }, "normal", { t: "sup", c: ["1"] }] },
  ];
  const erwartet = sonder + " 1. - a a) + b c 1. | a|b 2. | *c* fettnormal1";
  try {
    const zurueck = markdownZuKlartext(inhaltAlsMarkdown(probe));
    if (normWs(zurueck) !== normWs(erwartet)) fehler.push("Gegenprobe: Rundreise mit Sonderzeichen " + abweichung(normWs(zurueck), normWs(erwartet)));
  } catch (e) {
    fehler.push("Gegenprobe: Rundreise mit Sonderzeichen – " + e.message);
  }
  return fehler;
}

// ---------------------------------------------------------------------------------------------
// 3. Hilfen für Notizen
// ---------------------------------------------------------------------------------------------

/** Dateiname ohne Zeichen, die Windows verbietet (: * ? " < > | / \) oder die Obsidian-Links stören (# ^ [ ]). */
function dateiname(s) {
  let t = String(s)
    .replace(/ /g, " ")
    .replace(/[\u0000-\u001f]/g, "")
    .replace(/[\\/]/g, "-")
    .replace(/:/g, " -")
    .replace(/[*?"<>|#^]/g, "")
    .replace(/\[/g, "(")
    .replace(/\]/g, ")")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/[. ]+$/, "");
  if (t.length > 120) t = t.slice(0, 119).trim() + "…";
  return t || "unbenannt";
}

const yamlWert = (v) => (typeof v === "boolean" || typeof v === "number" ? String(v) : JSON.stringify(String(v)));

function frontmatter(obj) {
  const z = ["---"];
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined || v === null || v === "") continue;
    if (Array.isArray(v)) {
      if (!v.length) continue;
      z.push(`${k}:`);
      for (const x of v) z.push(`  - ${yamlWert(x)}`);
    } else z.push(`${k}: ${yamlWert(v)}`);
  }
  z.push("---");
  return z.join("\n");
}

/** Wikilink. Namen mit Punkt (z. B. "lib › text.ts") verlinken mit vollem Pfad, sonst hielte Obsidian ".ts" für eine Dateiendung. */
function wikilink(notiz, anzeige) {
  if (!notiz.name.includes(".")) return anzeige ? `[[${notiz.name}|${linkAnzeige(anzeige)}]]` : `[[${notiz.name}]]`;
  return `[[${notiz.relPfad}.md|${linkAnzeige(anzeige ?? notiz.name)}]]`;
}

const urlSicher = (u) => String(u).replace(/ /g, "%20").replace(/\(/g, "%28").replace(/\)/g, "%29");
const mdLink = (text, url) => `[${mdText(text)}](${urlSicher(url)})`;
const hostname = (u) => {
  try {
    return new URL(u).hostname;
  } catch {
    return u;
  }
};
const tagSlug = (s) => String(s).toLowerCase().replace(/[^a-z0-9_-]+/g, "-");

// ---------------------------------------------------------------------------------------------
// 4. Gesetze
// ---------------------------------------------------------------------------------------------

function ladeGesetze() {
  const gesetze = [];
  for (const datei of fs.existsSync(GESETZE_DIR) ? fs.readdirSync(GESETZE_DIR).sort() : []) {
    if (!datei.endsWith(".json")) continue;
    const g = JSON.parse(fs.readFileSync(path.join(GESETZE_DIR, datei), "utf8"));
    const erlDatei = path.join(ERL_DIR, `${g.id}.json`);
    g._datei = `data/gesetze/${datei}`;
    g._erl = fs.existsSync(erlDatei) ? JSON.parse(fs.readFileSync(erlDatei, "utf8")) : {};
    g._erlDatei = fs.existsSync(erlDatei) ? toPosix(path.relative(ROOT, erlDatei)) : null;
    gesetze.push(g);
  }
  // wie in der App: Bundesrecht zuerst
  gesetze.sort((a, b) => Number(b.ebene === "Bund") - Number(a.ebene === "Bund") || a.kurz.localeCompare(b.kurz));
  gesetze.forEach((g, i) => (g._farbe = GESETZ_FARBEN[g.id] ?? ERSATZ_FARBEN[i % ERSATZ_FARBEN.length]));
  return gesetze;
}

const ORDINALE = {
  erst: 1, zweit: 2, dritt: 3, viert: 4, "fünft": 5, sechst: 6, siebent: 7, siebt: 7, acht: 8, neunt: 9, zehnt: 10,
  elft: 11, "zwölft": 12, dreizehnt: 13, vierzehnt: 14, "fünfzehnt": 15, sechzehnt: 16, siebzehnt: 17, achtzehnt: 18,
  neunzehnt: 19, zwanzigst: 20,
};
const EBENEN_ABK = { Buch: "Buch", Kapitel: "Kap.", Teil: "Teil", Abschnitt: "Abschn.", Unterabschnitt: "Unterabschn.", Titel: "Titel", Untertitel: "Untertitel" };
const EBENEN = Object.keys(EBENEN_ABK).join("|");

function ordinal(wort) {
  const w = wort.toLowerCase();
  for (const [stamm, zahl] of Object.entries(ORDINALE))
    if (w.startsWith(stamm) && ["", "e", "er", "es", "en", "em"].includes(w.slice(stamm.length))) return zahl;
  return null;
}

/** "Erstes Kapitel – Allgemeines Städtebaurecht" -> { ebene: "Kapitel", nr: 1, titel: "Allgemeines Städtebaurecht" } */
function parseEbene(label) {
  const l = leer(label).replace(/ /g, " ").trim();
  const rest = "(?:\\s*[–—-]\\s*(.*))?$";
  let m = l.match(new RegExp(`^(\\S+)\\s+(${EBENEN})\\b${rest}`, "u"));
  if (m && ordinal(m[1])) return { ebene: m[2], nr: String(ordinal(m[1])), titel: (m[3] ?? "").trim() };
  m = l.match(new RegExp(`^(\\d+[a-z]?)\\.\\s+(${EBENEN})\\b${rest}`, "u"));
  if (m) return { ebene: m[2], nr: m[1], titel: (m[3] ?? "").trim() };
  m = l.match(new RegExp(`^(${EBENEN})\\s+(\\d+[a-z]?)\\b${rest}`, "u"));
  if (m) return { ebene: m[1], nr: m[2], titel: (m[3] ?? "").trim() };
  return null;
}

function gliederungsBaum(g) {
  const wurzel = { label: null, kinder: [], kinderMap: new Map(), normen: [], eltern: null, tiefe: 0 };
  const knotenVon = new Map();
  for (const n of g.normen) {
    let k = wurzel;
    for (const label of n.gliederung ?? []) {
      let kind = k.kinderMap.get(label);
      if (!kind) {
        kind = { label, kinder: [], kinderMap: new Map(), normen: [], eltern: k, tiefe: k.tiefe + 1, info: parseEbene(label) };
        k.kinderMap.set(label, kind);
        k.kinder.push(kind);
      }
      k = kind;
    }
    k.normen.push(n);
    knotenVon.set(n, k);
  }
  return { wurzel, knotenVon };
}

const vorfahren = (k) => {
  const liste = [];
  for (let x = k; x && x.label !== null; x = x.eltern) liste.unshift(x);
  return liste;
};

function alleNormenUnter(k) {
  return [...k.normen, ...k.kinder.flatMap(alleNormenUnter)];
}

function umfang(g, k) {
  const normen = alleNormenUnter(k).sort((a, b) => g.normen.indexOf(a) - g.normen.indexOf(b));
  if (!normen.length) return { text: "", anzahl: 0 };
  const erste = normen[0].bez, letzte = normen[normen.length - 1].bez;
  return { text: erste === letzte ? erste : `${erste} bis ${letzte}`, anzahl: normen.length };
}

function erzeugeGesetzesNotizen(gesetze, namen) {
  const notizen = [];
  const paragraphNotizen = [];
  const vergib = (name) => {
    let n = name, i = 2;
    while (namen.has(n.toLowerCase())) n = `${name} (${i++})`;
    namen.add(n.toLowerCase());
    return n;
  };

  for (const g of gesetze) {
    const kurzDir = dateiname(g.kurz);
    const tagGesetz = `gesetz/${tagSlug(g.kurz)}`;
    const uebersicht = { name: vergib(dateiname(g.kurz)), relPfad: null };
    uebersicht.relPfad = `Gesetze/${uebersicht.name}`;
    g._uebersicht = uebersicht;
    const { wurzel, knotenVon } = gliederungsBaum(g);

    // Namen für Gliederungsnotizen: "BauGB Kap. 1 Teil 3 Abschn. 1 – Zulässigkeit von Vorhaben"
    const alleKnoten = [];
    const sammle = (k) => k.kinder.forEach((c) => (alleKnoten.push(c), sammle(c)));
    sammle(wurzel);
    for (const k of alleKnoten) {
      const kette = vorfahren(k).map((x) => (x.info ? `${EBENEN_ABK[x.info.ebene]} ${x.info.nr}` : x.label));
      const titel = k.info ? k.info.titel : "";
      k.name = vergib(dateiname(`${g.kurz} ${kette.join(" ")}${titel ? " – " + titel : ""}`));
      k.relPfad = `Gesetze/${kurzDir}/Gliederung/${k.name}`;
    }
    for (const n of g.normen) {
      n._name = vergib(dateiname(`${n.bez} ${g.kurz}`));
      n._relPfad = `Gesetze/${kurzDir}/${n._name}`;
    }
    const normNotiz = (n) => ({ name: n._name, relPfad: n._relPfad });
    const normNachId = new Map(g.normen.map((n) => [n.id, n]));

    const brotkrumen = (kette, selbst) => {
      const teile = [SCHLANK && kette.length ? mdText(g.kurz) : wikilink(uebersicht)];
      kette.forEach((k, i) => {
        const direkt = i === kette.length - 1 && !selbst;
        teile.push(!SCHLANK || direkt ? wikilink(k, k.label) : mdText(leer(k.label)));
      });
      if (selbst) teile.push(`**${mdText(leer(selbst))}**`);
      return teile.join(" › ");
    };

    // --- Paragraphen und Anlagen ---
    for (const n of g.normen) {
      const k = knotenVon.get(n);
      const kette = vorfahren(k);
      const erl = g._erl[n.id];
      const istAnlage = /^Anlage\b/.test(n.bez);
      const ueberschrift = n.titel ? `${n._name} – ${leer(n.titel).trim()}` : n._name;
      const teile = [
        frontmatter({
          gesetz: g.kurz,
          paragraph: n.bez,
          titel: n.titel,
          stand: g.stand,
          quelle: n.url,
          weggefallen: Boolean(n.weggefallen),
          gliederung: n.gliederung,
          erlaeuterung: erl ? erl.status : undefined,
          tags: [tagGesetz, istAnlage ? "anlage" : "paragraph", ...(n.weggefallen ? ["weggefallen"] : [])],
        }),
        `# ${mdText(ueberschrift)}`,
        brotkrumen(kette),
      ];
      if (n.weggefallen) teile.push("> [!info] Diese Vorschrift ist weggefallen.");
      // VOB/C: nur Verzeichnis (DIN-Normen) – kein Wortlaut, daher eigene Überschrift und kein Wortlaut-Selbsttest
      teile.push(g.nurVerzeichnis ? "## Verzeichniseintrag" : "## Originaltext");
      const originaltext = inhaltAlsMarkdown(n.inhalt);
      if (originaltext) teile.push(originaltext);

      const ziele = (n.verweise ?? []).filter((id) => id !== n.id);
      teile.push(
        "## Verweist auf",
        ziele.length
          ? ziele
              .map((id) => {
                const z = normNachId.get(id);
                return z ? `- ${wikilink(normNotiz(z))}${z.titel ? " – " + mdText(leer(z.titel).trim()) : ""}` : `- ${mdText(id)} (nicht gefunden)`;
              })
              .join("\n")
          : "*Keine Verweise auf andere Vorschriften dieses Gesetzes erkannt.*",
      );

      if (erl) {
        const geprueft = erl.status === "geprueft";
        const z = [
          `> [!${geprueft ? "note" : "warning"}] Erläuterung (${geprueft ? "geprüft" : "Entwurf"}), keine Rechtsberatung`,
          `> *${geprueft ? "Geprüfte" : "Ungeprüfter Entwurf einer"} Erläuterung in einfacher Sprache. Sie ist nicht Teil des Gesetzes und keine Rechtsberatung. Verbindlich ist allein der Originaltext bzw. die amtliche Quelle.*`,
        ];
        if (erl.kurz) z.push(">", `> **Kurz:** ${mdText(leer(erl.kurz))}`);
        // Titel enthalten selbst einen Doppelpunkt ("Abs. 1: Stichwort"): Titel fett in eine eigene Zeile, Text darunter
        for (const p of erl.punkte ?? []) z.push(">", `> **${mdText(leer(p.titel))}**<br>${mdText(leer(p.text))}`);
        if (erl.praxis) z.push(">", `> **Praxis:** ${mdText(leer(erl.praxis))}`);
        teile.push("## Erläuterung", z.join("\n"));
      }

      if (n.fussnoten) {
        teile.push(
          "## Fußnoten der amtlichen Fassung",
          String(n.fussnoten)
            .split(/\r?\n/)
            .map((s) => mdZeilenanfang(mdText(leer(s)).trim()))
            .filter(Boolean)
            .join("  \n"),
        );
      }

      teile.push(
        "## Quelle",
        [
          `- ${g.nurVerzeichnis ? "Bezugsquelle" : g.id === "baugb" || g.id === "ndschg" ? "Amtliche Fassung" : "Quelle"}: ${mdLink(`${n.bez} ${g.kurz} auf ${hostname(n.url)}`, n.url)}`,
          `- Stand: ${mdText(leer(g.stand))}`,
          g.quelle?.abgerufen ? `- Abgerufen: ${mdText(g.quelle.abgerufen)}` : null,
          `- Daten: \x60${g._datei}\x60`,
        ]
          .filter(Boolean)
          .join("\n"),
      );

      const notiz = { name: n._name, relPfad: n._relPfad, inhalt: teile.join("\n\n") + "\n", bereich: "gesetz", gesetz: g, norm: n, ueberschrift };
      notizen.push(notiz);
      paragraphNotizen.push(notiz);
    }

    // --- Gliederungsnotizen ---
    for (const k of alleKnoten) {
      const kette = vorfahren(k).slice(0, -1);
      const eltern = kette.length ? kette[kette.length - 1] : null;
      const u = umfang(g, k);
      const teile = [
        frontmatter({
          gesetz: g.kurz,
          ebene: k.info?.ebene ?? "Gliederung",
          bezeichnung: k.label,
          umfang: u.text,
          vorschriften: u.anzahl,
          tags: ["gliederung", tagGesetz],
        }),
        `# ${mdText(leer(k.label).trim())}`,
        brotkrumen(kette, k.label),
        [
          `**Übergeordnet:** ${eltern ? wikilink(eltern, eltern.label) : wikilink(uebersicht)}`,
          u.anzahl ? `**Umfang:** ${mdText(u.text)} (${u.anzahl} ${u.anzahl === 1 ? "Vorschrift" : "Vorschriften"})` : null,
        ]
          .filter(Boolean)
          .join("  \n"),
      ];
      if (k.kinder.length) {
        teile.push(
          "## Unterebenen",
          k.kinder.map((c) => `- ${wikilink(c, c.label)} · ${mdText(umfang(g, c).text)}`).join("\n"),
        );
      }
      if (k.normen.length) {
        teile.push(
          "## Paragraphen",
          k.normen.map((n) => `- ${wikilink(normNotiz(n))}${n.titel ? " – " + mdText(leer(n.titel).trim()) : ""}`).join("\n"),
        );
      }
      notizen.push({ name: k.name, relPfad: k.relPfad, inhalt: teile.join("\n\n") + "\n", bereich: "gliederung", gesetz: g });
    }

    // --- Übersichtsnotiz ---
    const anzahlWeg = g.normen.filter((n) => n.weggefallen).length;
    const anzahlErl = g.normen.filter((n) => g._erl[n.id]).length;
    const baum = [];
    const zeichne = (k) => {
      for (const c of k.kinder) {
        baum.push(`${"\t".repeat(c.tiefe - 1)}- ${wikilink(c, c.label)} · ${mdText(umfang(g, c).text)}`);
        zeichne(c);
      }
    };
    zeichne(wurzel);
    const teile = [
      frontmatter({
        gesetz: g.kurz,
        titel: g.titel,
        ebene: g.ebene,
        stand: g.stand,
        neufassung: g.neufassung,
        quelle: g.quelle?.url,
        abgerufen: g.quelle?.abgerufen,
        vorschriften: g.normen.length,
        tags: [tagGesetz, "uebersicht"],
      }),
      `# ${mdText(g.kurz)} – ${mdText(leer(g.titel))}`,
      [
        `- **Ebene:** ${mdText(g.ebene ?? "")}`,
        `- **Stand:** ${mdText(leer(g.stand ?? ""))}`,
        g.neufassung ? `- **Neufassung:** ${mdText(leer(g.neufassung))}` : null,
        g.ausfertigung ? `- **Ausfertigung:** ${mdText(leer(g.ausfertigung))}` : null,
        g.gueltigAb ? `- **Gültig ab:** ${mdText(g.gueltigAb)}` : null,
        g.quelle?.fassung ? `- **Fassung:** ${mdText(leer(g.quelle.fassung))}` : null,
        g.quelle ? `- **Quelle:** ${mdLink(g.quelle.name ?? hostname(g.quelle.url), g.quelle.url)}` : null,
        g.quelle?.abgerufen ? `- **Abgerufen:** ${mdText(g.quelle.abgerufen)}` : null,
        `- **Daten:** \x60${g._datei}\x60${g._erlDatei ? `, Erläuterungen: \x60${g._erlDatei}\x60` : ""}`,
        `- **Umfang:** ${g.normen.length} Vorschriften${anzahlWeg ? `, davon ${anzahlWeg} weggefallen` : ""}${anzahlErl ? `; ${anzahlErl} mit Erläuterung (Entwurf, keine Rechtsberatung)` : ""}`,
      ]
        .filter(Boolean)
        .join("\n"),
      "## Inhalt",
      baum.length ? baum.join("\n") : "*Keine Gliederung in den Daten.*",
    ];
    if (wurzel.normen.length) {
      teile.push(
        "## Vorschriften ohne Gliederung",
        wurzel.normen.map((n) => `- ${wikilink(normNotiz(n))}${n.titel ? " – " + mdText(leer(n.titel).trim()) : ""}`).join("\n"),
      );
    }
    if (g.schlussformel) {
      teile.push(
        "## Schlussformel",
        String(g.schlussformel)
          .split(/\r?\n/)
          .map((s) => mdZeilenanfang(mdText(leer(s)).trim()))
          .filter(Boolean)
          .join("  \n"),
      );
    }
    notizen.push({ name: uebersicht.name, relPfad: uebersicht.relPfad, inhalt: teile.join("\n\n") + "\n", bereich: "uebersicht", gesetz: g });
  }
  return { notizen, paragraphNotizen };
}

function selbsttest(paragraphNotizen) {
  const fehler = [];
  for (const notiz of paragraphNotizen) {
    const n = notiz.norm;
    if (notiz.gesetz?.nurVerzeichnis) continue;
    const m = notiz.inhalt.match(/\n## Originaltext\n([\s\S]*?)(?=\n## |$)/);
    if (!m) {
      fehler.push(`${notiz.name}: Abschnitt „Originaltext“ fehlt`);
      continue;
    }
    try {
      // Hochgestelltes (MBO, NBauO: Satznummern, Fußnotenzeichen, m²/m³) steht im "text" der Quelle nicht bzw. als ²/³.
      // Ob davor ein Leerzeichen steht, ist je Quelle verschieden – bei diesen Vorschriften wird deshalb ohne Leerraum
      // verglichen (jedes andere Zeichen weiterhin genau); alle übrigen Vorschriften wie bisher mit normalisiertem Leerraum.
      const ohneHoch = (s) => s.replace(/[²³]/g, "");
      const mitSup = m[1].includes("<sup>");
      const vergleich = (s) => (mitSup ? ohneHoch(s).replace(/\s+/g, "") : normWs(s));
      // Weiche Trennzeichen (U+00AD, z. B. „Er­kenntnisse“ in § 83 BauO NRW) stehen in der Notiz wie in der Quelle,
      // fehlen aber im Feld "text" (siehe alsText in scripts/lib/landesrecht-c-gemeinsam.mjs) – für den Vergleich weg damit.
      const ist = vergleich(markdownZuKlartext(m[1].replace(/<sup>[^<]*<\/sup>/g, "")).replace(/­/g, ""));
      const soll = vergleich(n.text);
      if (ist !== soll) fehler.push(`${notiz.name}: Wortlaut weicht ab ${abweichung(ist, soll)}`);
      const h1 = notiz.inhalt.match(/\n# (.*)\n/);
      if (!h1 || normWs(zeileZuText(h1[1])) !== normWs(notiz.ueberschrift)) fehler.push(`${notiz.name}: Überschrift weicht ab`);
    } catch (e) {
      fehler.push(`${notiz.name}: ${e.message}`);
    }
  }
  return fehler;
}

// ---------------------------------------------------------------------------------------------
// 5. Projektdateien: Importe, Datenzugriffe, HTTP-Aufrufe
// ---------------------------------------------------------------------------------------------

function projektDateien() {
  const erg = [];
  const lauf = (abs) => {
    for (const e of fs.readdirSync(abs, { withFileTypes: true })) {
      if (IGNORIERT.has(e.name)) continue;
      const voll = path.join(abs, e.name);
      const rel = toPosix(path.relative(ROOT, voll));
      if (rel === "data/quellen" || rel.startsWith("data/quellen/")) continue;
      if (e.isDirectory()) lauf(voll);
      else if (QUELL_ENDUNGEN.includes(path.extname(e.name))) erg.push(rel);
    }
  };
  for (const o of PROJEKT_ORDNER) if (fs.existsSync(path.join(ROOT, o))) lauf(path.join(ROOT, o));
  return erg.sort();
}

/** Entfernt Kommentare (ersetzt sie durch Leerraum), lässt Strings und Regex-Literale stehen. */
function ohneKommentare(src) {
  let out = "";
  let letztes = "";
  const n = src.length;
  for (let i = 0; i < n; ) {
    const c = src[i], d = src[i + 1];
    if (c === "/" && d === "/") {
      while (i < n && src[i] !== "\n") i++;
      continue;
    }
    if (c === "/" && d === "*") {
      const e = src.indexOf("*/", i + 2);
      const ende = e < 0 ? n : e + 2;
      out += src.slice(i, ende).replace(/[^\n]/g, " ");
      i = ende;
      continue;
    }
    if (c === '"' || c === "'" || c === "\x60") {
      let j = i + 1;
      while (j < n && src[j] !== c && (c === "\x60" || src[j] !== "\n")) j += src[j] === "\\" ? 2 : 1;
      if (j < n && src[j] === c) {
        out += src.slice(i, j + 1);
        i = j + 1;
        letztes = c;
        continue;
      }
    }
    if (c === "/" && (letztes === "" || /[(,=:[!&|?{};+\-*%<>~^]/.test(letztes) || /\b(return|typeof|case|in|of)\s*$/.test(out))) {
      let j = i + 1, klasse = false;
      while (j < n && src[j] !== "\n") {
        const ch = src[j];
        if (ch === "\\") j += 2;
        else {
          if (ch === "[") klasse = true;
          else if (ch === "]") klasse = false;
          else if (ch === "/" && !klasse) break;
          j++;
        }
      }
      if (j < n && src[j] === "/") {
        out += src.slice(i, j + 1);
        i = j + 1;
        letztes = "/";
        continue;
      }
    }
    out += c;
    if (!/\s/.test(c)) letztes = c;
    i++;
  }
  return out;
}

/** Erster Kommentarblock vor dem eigentlichen Code (Direktiven wie "use client" und Importe werden übersprungen). */
function kopfkommentar(src) {
  const zeilen = src.replace(/^﻿/, "").split(/\r?\n/);
  let imImport = false;
  for (let i = 0; i < zeilen.length; i++) {
    const z = zeilen[i].trim();
    if (imImport) {
      if (/from\s*["'][^"']+["']/.test(z) || /;\s*$/.test(z)) imImport = false;
      continue;
    }
    if (z === "" || z.startsWith("#!") || /^["']use (client|server|strict)["'];?$/.test(z)) continue;
    if (/^import\b/.test(z) || /^export\s+(type\s+)?(\*|\{)/.test(z)) {
      if (!/["'][^"']+["'];?\s*$/.test(z)) imImport = true;
      continue;
    }
    let block = [];
    if (z.startsWith("//")) {
      for (let j = i; j < zeilen.length && zeilen[j].trim().startsWith("//"); j++) block.push(zeilen[j].trim().replace(/^\/\/+ ?/, ""));
    } else if (z.startsWith("/*")) {
      for (let j = i; j < zeilen.length; j++) {
        const roh = zeilen[j];
        const ende = roh.includes("*/") && (j > i || roh.indexOf("*/") > roh.indexOf("/*"));
        block.push(roh.replace(/^\s*\/\*+!?\s?/, "").replace(/\s*\*+\/\s*$/, "").replace(/^\s*\* ?/, ""));
        if (ende) break;
      }
    } else return [];
    // Zierlinien entfernen ("===== Titel =====")
    block = block.map((s) => s.replace(/^[=\-*#~]{3,}\s*/, "").replace(/\s*[=\-*#~]{3,}$/, "").replace(/\s+$/, ""));
    while (block.length && !block[0].trim()) block.shift();
    while (block.length && !block[block.length - 1].trim()) block.pop();
    return block;
  }
  return [];
}

function teileArgumente(s) {
  const teile = [];
  let tiefe = 0, akt = "", q = null;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (q) {
      akt += c;
      if (c === "\\") akt += s[++i] ?? "";
      else if (c === q) q = null;
      continue;
    }
    if (c === '"' || c === "'" || c === "\x60") q = c;
    else if ("([{".includes(c)) tiefe++;
    else if (")]}".includes(c)) tiefe--;
    else if (c === "," && tiefe === 0) {
      teile.push(akt);
      akt = "";
      continue;
    }
    akt += c;
  }
  if (akt.trim()) teile.push(akt);
  return teile;
}

/** Index der schließenden Klammer zur öffnenden an Position `start` (Strings werden übersprungen). */
function klammerEnde(s, start) {
  let tiefe = 0, q = null;
  for (let i = start; i < s.length; i++) {
    const c = s[i];
    if (q) {
      if (c === "\\") i++;
      else if (c === q) q = null;
      continue;
    }
    if (c === '"' || c === "'" || c === "\x60") q = c;
    else if (c === "(") tiefe++;
    else if (c === ")" && --tiefe === 0) return i;
  }
  return -1;
}

/** Ende eines Ausdrucks ab `start` (bis ";" / Zeilenende / "," auf oberster Ebene). */
function ausdruckEnde(s, start) {
  let tiefe = 0, q = null;
  for (let i = start; i < s.length; i++) {
    const c = s[i];
    if (q) {
      if (c === "\\") i++;
      else if (c === q) q = null;
      continue;
    }
    if (c === '"' || c === "'" || c === "\x60") q = c;
    else if ("([{".includes(c)) tiefe++;
    else if (")]}".includes(c)) {
      if (--tiefe < 0) return i;
    } else if (tiefe === 0 && (c === ";" || c === "\n" || c === ",")) return i;
  }
  return s.length;
}

const pfadNorm = (p) => {
  const n = path.posix.normalize(p || ".");
  return n === "." ? "" : n.replace(/\/$/, "");
};

/** Wertet einfache Pfadausdrücke aus: path.join/resolve, process.cwd(), Verzeichnis der Datei, Strings, Konstanten. */
function pfadAuswerten(ausdruck, konst, dateiDir) {
  const a = ausdruck.trim().replace(/\s+as\s+[\w$.<>[\]| ]+$/, "").trim();
  if (/^process\.cwd\(\s*\)$/.test(a)) return "";
  if (
    /^(__dirname|import\.meta\.dirname)$/.test(a) ||
    /^path\.dirname\(\s*(fileURLToPath\(\s*import\.meta\.url\s*\)|new URL\(\s*import\.meta\.url\s*\)\.pathname)\s*\)$/.test(a)
  )
    return dateiDir;
  let m = a.match(/^(?:fileURLToPath\(\s*)?new URL\(\s*["'\x60]([^"'\x60]*)["'\x60]\s*,\s*import\.meta\.url\s*\)\s*\)?$/);
  if (m) return pfadNorm(`${dateiDir}/${m[1]}`);
  m = a.match(/^["']([^"']*)["']$/);
  if (m) return m[1];
  m = a.match(/^\x60([^\x60]*)\x60$/);
  if (m) return m[1].replace(/\$\{[^}]*\}/g, "*");
  m = a.match(/^path(?:\.posix)?\.(join|resolve)\(/);
  if (m && klammerEnde(a, m[0].length - 1) === a.length - 1) {
    // Hintere Argumente sind Datei-/Ordnernamen. Eine gleichnamige Konstante mit vollem Pfad
    // (z. B. "datei" in einer anderen Funktion) ist dort fast sicher eine andere Variable -> "*".
    const werte = teileArgumente(a.slice(m[0].length, -1)).map((x, i) => {
      const w = pfadAuswerten(x, konst, dateiDir);
      return i > 0 && /^[A-Za-z_$][\w$]*$/.test(x.trim()) && w !== null && w.includes("/") ? "*" : w;
    });
    if (werte.some((w) => w === null)) return null;
    return pfadNorm(werte.filter(Boolean).join("/"));
  }
  if (/^[A-Za-z_$][\w$]*$/.test(a)) return konst.has(a) ? konst.get(a) : "*";
  return null;
}

const LESEN = new Set(["readFileSync", "readFile", "readdirSync", "readdir", "existsSync", "statSync", "stat", "lstatSync", "createReadStream", "opendirSync"]);
const SCHREIBEN = new Set(["writeFileSync", "writeFile", "appendFileSync", "appendFile", "mkdirSync", "mkdir", "rmSync", "rm", "unlinkSync", "copyFileSync", "cpSync", "renameSync", "createWriteStream"]);
const opArt = (fn) => (LESEN.has(fn) ? "liest" : SCHREIBEN.has(fn) ? "schreibt" : null);
const aufrufDavor = (code, idx) => code.slice(Math.max(0, idx - 80), idx).match(/(\w+)\(\s*$/)?.[1] ?? null;

/** Findet Zugriffe auf data/… : liefert Map pfad -> Set("liest"|"schreibt"). */
function datenzugriffe(code, rel) {
  const dateiDir = path.posix.dirname(rel);
  const konst = new Map();
  const zugriffe = new Map();
  const merke = (p, op) => {
    if (p === null || p === undefined || !/^data(\/|$)/.test(p)) return;
    if (!zugriffe.has(p)) zugriffe.set(p, new Set());
    if (op) zugriffe.get(p).add(op);
  };

  // 1) Konstanten mit Pfaden: const X = path.join(…)
  const ZUW = /\b(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*(?::\s*[^=;\n]+?)?\s*=\s*/g;
  for (let m; (m = ZUW.exec(code)); ) {
    const start = m.index + m[0].length;
    const wert = pfadAuswerten(code.slice(start, ausdruckEnde(code, start)), konst, dateiDir);
    if (wert !== null && wert !== "*") konst.set(m[1], wert);
  }
  // 2) Verwendung der Konstanten: fs.readFileSync(X …)
  for (const [name, wert] of konst) {
    if (!/^data(\/|$)/.test(wert)) continue;
    merke(wert, null);
    const re = new RegExp(`\\b(\\w+)\\(\\s*${name.replace(/\$/g, "\\$")}\\b(?!\\s*[.(\\[])`, "g");
    for (let m; (m = re.exec(code)); ) merke(wert, opArt(m[1]));
  }
  // 3) Direkte Aufrufe: fs.readFileSync(path.join(…))
  const PJ = /\bpath(?:\.posix)?\.(?:join|resolve)\(/g;
  for (let m; (m = PJ.exec(code)); ) {
    const ende = klammerEnde(code, m.index + m[0].length - 1);
    if (ende < 0) continue;
    const op = opArt(aufrufDavor(code, m.index));
    if (op) merke(pfadAuswerten(code.slice(m.index, ende + 1), konst, dateiDir), op);
  }
  // 4) Pfade als String: "data/gesetze/baugb.json"
  const STR = /(["'\x60])(?:\.\/)?(data\/[^"'\x60\s]*)\1/g;
  for (let m; (m = STR.exec(code)); ) {
    const op = opArt(aufrufDavor(code, m.index)); // nur echte Dateizugriffe, keine Vergleiche wie rel === "data/…"
    if (op) merke(pfadNorm(m[2].replace(/\$\{[^}]*\}/g, "*")), op);
  }

  // Ordner und "Ordner/*" zusammenfassen
  for (const [p, ops] of [...zugriffe]) {
    const stern = zugriffe.get(p + "/*");
    if (stern) {
      ops.forEach((o) => stern.add(o));
      zugriffe.delete(p);
    }
  }
  // Oberordner ohne eigenen Zugriff weglassen (z. B. "data", wenn "data/gesetze" gelesen wird)
  for (const [p, ops] of [...zugriffe]) {
    if (!ops.size && [...zugriffe.keys()].some((q) => q !== p && q.startsWith(p + "/"))) zugriffe.delete(p);
  }
  return zugriffe;
}

const IMPORT_RE = /\bimport\s+(type\s+)?((?:[\w$]+\s*,?\s*)?(?:\{[^}]*\}|\*\s*as\s+[\w$]+)?)\s*from\s*["']([^"']+)["']/g;
const EXPORT_FROM_RE = /\bexport\s+(type\s+)?(\*(?:\s*as\s+[\w$]+)?|\{[^}]*\})\s*from\s*["']([^"']+)["']/g;
const SIDE_RE = /\bimport\s*["']([^"']+)["']/g;
const DYN_RE = /\b(?:import|require)\s*\(\s*["']([^"']+)["']\s*\)/g;
const CSS_IMPORT_RE = /@import\s+(?:url\()?\s*["']([^"']+)["']/g;

function importe(code, istCss) {
  const liste = [];
  if (istCss) {
    for (let m; (m = CSS_IMPORT_RE.exec(code)); ) liste.push({ spez: m[1], nurTypen: false });
    return liste;
  }
  for (let m; (m = IMPORT_RE.exec(code)); ) {
    const namen = m[2] ?? "";
    const nurTypen = Boolean(m[1]) || (/^\{[^}]*\}$/.test(namen.trim()) && namen.slice(1, -1).split(",").filter((s) => s.trim()).every((s) => /^\s*type\s/.test(s)));
    liste.push({ spez: m[3], nurTypen });
  }
  for (let m; (m = EXPORT_FROM_RE.exec(code)); ) liste.push({ spez: m[3], nurTypen: Boolean(m[1]) });
  for (let m; (m = SIDE_RE.exec(code)); ) liste.push({ spez: m[1], nurTypen: false });
  for (let m; (m = DYN_RE.exec(code)); ) liste.push({ spez: m[1], nurTypen: false });
  return liste;
}

const AUFLOESE_ENDUNGEN = [".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs", ".json", ".css"];

function aufloesen(spez, vonRel) {
  let basis;
  if (spez.startsWith("@/")) basis = path.join(ROOT, spez.slice(2)); // tsconfig: "@/*" -> "./*"
  else if (spez.startsWith("./") || spez.startsWith("../")) basis = path.resolve(ROOT, path.dirname(vonRel), spez);
  else return null; // Paket
  const kandidaten = [basis, ...AUFLOESE_ENDUNGEN.map((e) => basis + e), ...AUFLOESE_ENDUNGEN.map((e) => path.join(basis, "index" + e))];
  if (/\.(m?js|cjs|jsx)$/.test(basis)) kandidaten.push(basis.replace(/\.(m?js|cjs|jsx)$/, ".ts"), basis.replace(/\.(m?js|cjs|jsx)$/, ".tsx"));
  for (const k of kandidaten) if (fs.existsSync(k) && fs.statSync(k).isFile()) return { rel: toPosix(path.relative(ROOT, k)), gefunden: true };
  return { rel: toPosix(path.relative(ROOT, basis)), gefunden: false };
}

function apiAufrufe(code) {
  const ziele = new Set();
  for (const m of code.matchAll(/(?<![\w.])\/api\/([A-Za-z0-9_\-/[\]]+)/g)) {
    const route = m[1].replace(/\/+$/, "");
    for (const e of [".ts", ".tsx", ".js", ".jsx"]) {
      const rel = `app/api/${route}/route${e}`;
      if (fs.existsSync(path.join(ROOT, rel))) ziele.add(rel);
    }
  }
  return ziele;
}

function exporte(code) {
  const namen = new Set();
  for (const m of code.matchAll(/\bexport\s+(?:declare\s+)?(?:default\s+)?(?:async\s+)?(?:function\*?|const|let|var|class|interface|type|enum)\s+([A-Za-z_$][\w$]*)/g)) namen.add(m[1]);
  if (/\bexport\s+default\b/.test(code) && !/\bexport\s+default\s+(?:async\s+)?(?:function|class)\s+[A-Za-z_$]/.test(code)) namen.add("default");
  for (const m of code.matchAll(/\bexport\s*\{([^}]*)\}(?!\s*from)/g))
    for (const teil of m[1].split(",")) {
      const n = teil.trim().split(/\s+as\s+/).pop();
      if (n) namen.add(n.replace(/^type\s+/, ""));
    }
  return [...namen];
}

/** Bereich einer Datei. `ordnerBereiche`: Unterordner von lib/ mit eigenem Namen (z. B. lib/ort -> "Ortsauskunft"). */
function bereichVon(rel, beschreibung, ordnerBereiche) {
  if (rel.startsWith("app/api/")) return "Schnittstelle";
  if (rel.startsWith("app/") || rel.startsWith("components/")) return "Oberfläche";
  if (rel.startsWith("lib/")) {
    // Rolle steht im Kopfkommentar, z. B. 'Der "Lotse" – …' oder 'Die "Bibliothek": …'
    const rolle = beschreibung.match(/^(?:Der|Die|Das)\s+["„“]?(Lotse|Bibliothek)\b/);
    if (rolle) return rolle[1];
    const ordner = rel.split("/").slice(0, 2).join("/");
    if (rel.split("/").length > 2 && ordnerBereiche.has(ordner)) return ordnerBereiche.get(ordner).name;
    return "Helfer";
  }
  if (rel.startsWith("scripts/")) return /obsidian|export/i.test(path.posix.basename(rel)) ? "Export (Obsidian)" : "Importskripte";
  if (rel.startsWith("tests/")) return "Tests";
  return "Sonstiges";
}

const BEREICHE = [
  { id: "Importskripte", text: "holen die Gesetze von den amtlichen Seiten (gesetze-im-internet.de, NI-VORIS) und speichern den Wortlaut unverändert als JSON in \x60data/gesetze/\x60. Sie laufen nur bei Bedarf von Hand (\x60npm run import:all\x60)." },
  { id: "Bibliothek", text: "lädt diese JSON-Dateien und liefert Paragraphen, Verweise und Suchtreffer. Sie erzeugt keinen eigenen Gesetzestext – alles kommt 1:1 aus den Daten." },
  { id: "Lotse", text: "versteht die Frage (z. B. „§ 34 BauGB“ oder eine Adresse) und stellt die Antwort aus Bausteinen der Bibliothek zusammen." },
  { id: "Schnittstelle", text: "nimmt die Frage aus dem Browser per HTTP entgegen und reicht sie an den Lotsen weiter." },
  { id: "Oberfläche", text: "zeigt im Browser den Chat und die Paragraphen-Karten. Der Gesetzestext wird dort nur dargestellt, nicht verändert." },
  { id: "Helfer", text: "sind gemeinsame Bausteine im Ordner \x60lib/\x60, z. B. Datentypen und Textfunktionen, die mehrere Teile nutzen." },
  { id: "Tests", text: "schicken typische Fragen an die laufende App und prüfen die Antworten." },
  { id: "Export (Obsidian)", text: "erzeugt diesen Obsidian-Vault aus den Gesetzesdaten und dem Quellcode." },
  { id: "Sonstiges", text: "sonstige Dateien." },
];

const SPRACHE = { ".ts": "TypeScript", ".tsx": "TypeScript (React)", ".js": "JavaScript", ".jsx": "JavaScript (React)", ".mjs": "JavaScript (Node, ESM)", ".cjs": "JavaScript (Node, CommonJS)", ".css": "CSS" };

function datenZiele(datenPfad, gesetze) {
  const nachId = new Map(gesetze.map((g) => [g.id, g]));
  let m = datenPfad.match(/^data\/gesetze(?:\/(.*))?$/);
  if (m) {
    const datei = m[1];
    if (!datei || datei.includes("*")) return gesetze;
    const g = nachId.get(datei.replace(/\.json$/, ""));
    return g ? [g] : [];
  }
  m = datenPfad.match(/^data\/erlaeuterungen(?:\/(.*))?$/);
  if (m) {
    const datei = m[1];
    if (!datei || datei.includes("*")) return gesetze.filter((g) => g._erlDatei);
    const g = nachId.get(datei.replace(/\.json$/, ""));
    return g ? [g] : [];
  }
  m = datenPfad.match(/^data\/quellen\/([^/]+)/);
  if (m && nachId.has(m[1])) return [nachId.get(m[1])];
  return [];
}

/** Unterordner von lib/ als eigener Bereich; Name aus dem Kopfkommentar der index-Datei ("Ortsauskunft: …"). */
function ordnerBereiche(dateien) {
  const erg = new Map();
  for (const rel of dateien) {
    const teile = rel.split("/");
    if (teile[0] !== "lib" || teile.length < 3) continue;
    const ordner = teile.slice(0, 2).join("/");
    if (erg.has(ordner) && !/^index\./.test(teile[teile.length - 1])) continue;
    let name = ordner, text = `Dateien im Ordner \x60${ordner}/\x60.`;
    const index = dateien.find((d) => d.startsWith(ordner + "/index."));
    if (index) {
      const beschr = leer(kopfkommentar(fs.readFileSync(path.join(ROOT, index), "utf8")).join("\n").split(/\n\s*\n/)[0] ?? "").trim();
      const m = beschr.match(/^([A-ZÄÖÜ][\wäöüß-]{2,30}):\s*(.*)$/);
      if (m) {
        name = m[1];
        text = `(Ordner \x60${ordner}/\x60): ${mdText(m[2])}`;
      } else if (beschr) text = `(Ordner \x60${ordner}/\x60): ${mdText(beschr)}`;
    }
    erg.set(ordner, { name, text });
  }
  return erg;
}

function analysiereProjekt(namen) {
  const dateien = projektDateien();
  const ordner = ordnerBereiche(dateien);
  const infos = new Map();
  infos.ordnerBereiche = ordner;
  for (const rel of dateien) {
    const src = fs.readFileSync(path.join(ROOT, rel), "utf8");
    const ext = path.extname(rel);
    const istCss = ext === ".css";
    const code = istCss ? src.replace(/\/\*[\s\S]*?\*\//g, " ") : ohneKommentare(src);
    const kopf = kopfkommentar(src);
    const absaetze = kopf.join("\n").split(/\n\s*\n/).map((a) => leer(a).trim()).filter(Boolean);
    const beschreibung = absaetze[0] ?? "";
    let name = dateiname(rel.split("/").join(" › "));
    let i = 2;
    while (namen.has(name.toLowerCase())) name = `${dateiname(rel.split("/").join(" › "))} (${i++})`;
    namen.add(name.toLowerCase());
    infos.set(rel, {
      rel,
      name,
      relPfad: `Projekt/${name}`,
      ext,
      zeilen: src.split(/\r?\n/).length,
      kopf,
      beschreibung,
      bereich: bereichVon(rel, beschreibung, ordner),
      importe: istCss ? importe(code, true) : importe(code, false),
      daten: istCss ? new Map() : datenzugriffe(code, rel),
      api: istCss ? new Set() : apiAufrufe(code),
      exporte: istCss ? [] : exporte(code),
    });
  }
  // Importe auflösen
  for (const info of infos.values()) {
    info.lokal = [];
    info.extern = new Set();
    const gesehen = new Set();
    for (const imp of info.importe) {
      const z = aufloesen(imp.spez, info.rel);
      if (!z) {
        info.extern.add(imp.spez);
        continue;
      }
      if (gesehen.has(z.rel)) {
        const vorhanden = info.lokal.find((x) => x.rel === z.rel);
        if (vorhanden && !imp.nurTypen) vorhanden.nurTypen = false;
        continue;
      }
      gesehen.add(z.rel);
      if (/^data\//.test(z.rel)) {
        if (!info.daten.has(z.rel)) info.daten.set(z.rel, new Set());
        info.daten.get(z.rel).add("liest");
        continue;
      }
      info.lokal.push({ rel: z.rel, gefunden: z.gefunden, nurTypen: imp.nurTypen, spez: imp.spez });
    }
    info.api.delete(info.rel);
  }
  // Rückwärts: wer verwendet wen
  for (const info of infos.values()) info.verwendetVon = new Set();
  for (const info of infos.values()) {
    for (const l of info.lokal) infos.get(l.rel)?.verwendetVon.add(info.rel);
    for (const a of info.api) infos.get(a)?.verwendetVon.add(info.rel);
  }
  return infos;
}

function datenZeilen(info, gesetze) {
  return [...info.daten]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([p, ops]) => {
      const verb = ops.size ? [...ops].sort().join(" und ") : "verwendet";
      const ziele = datenZiele(p, gesetze);
      const zusatz = p.startsWith("data/erlaeuterungen") ? "Erläuterungen zu " : p.startsWith("data/quellen") ? "Rohquelle für " : "";
      const links = ziele.length ? ` → ${zusatz}${ziele.map((g) => wikilink(g._uebersicht)).join(", ")}` : "";
      return `- **${verb}** \x60${p}${ops.size && !/\.[a-z]+$/i.test(p) && !p.endsWith("*") ? "/" : ""}\x60${links}`;
    });
}

function erzeugeProjektNotizen(infos, gesetze) {
  const notizen = [];
  for (const info of infos.values()) {
    const link = (rel) => (infos.has(rel) ? wikilink(infos.get(rel), rel) : `\x60${rel}\x60`);
    const teile = [
      frontmatter({
        pfad: info.rel,
        bereich: info.bereich,
        sprache: SPRACHE[info.ext] ?? info.ext,
        zeilen: info.zeilen,
        beschreibung: info.beschreibung,
        tags: ["projekt", `projekt/${tagSlug(info.bereich.replace(/\s*\(.*\)$/, "").replace(/ä/g, "ae").replace(/ö/g, "oe").replace(/ü/g, "ue"))}`],
      }),
      `# ${mdText(info.rel)}`,
      `**Pfad:** \x60${info.rel}\x60 · **Bereich:** ${mdText(info.bereich)} · **Sprache:** ${mdText(SPRACHE[info.ext] ?? info.ext)} · **Zeilen:** ${info.zeilen}`,
      "## Kurzbeschreibung",
    ];
    if (info.beschreibung) teile.push(mdText(info.beschreibung));
    if (info.kopf.join("\n").split(/\n\s*\n/).filter((a) => a.trim()).length > 1) {
      const text = info.kopf.join("\n");
      const zaun = "\x60".repeat(Math.max(3, ...[...text.matchAll(/\x60+/g)].map((m) => m[0].length + 1)));
      teile.push(["> [!quote]- Kopfkommentar der Datei (vollständig)", `> ${zaun}text`, ...info.kopf.map((z) => `> ${z}`), `> ${zaun}`].join("\n"));
    }
    teile.push(
      "## Importiert (lokal)",
      info.lokal.length
        ? info.lokal.map((l) => `- ${l.gefunden ? link(l.rel) : `\x60${l.spez}\x60 (nicht gefunden)`}${l.nurTypen ? " – nur Typen" : ""}`).join("\n")
        : "*Keine lokalen Importe.*",
    );
    if (info.api.size) teile.push("## Ruft auf (HTTP)", [...info.api].map((a) => `- ${link(a)}`).join("\n"));
    if (info.daten.size) teile.push("## Daten", datenZeilen(info, gesetze).join("\n"));
    if (info.exporte.length) teile.push("## Stellt bereit", info.exporte.map((e) => `\x60${e}\x60`).join(", "));
    if (info.verwendetVon.size)
      teile.push("## Wird verwendet von", [...info.verwendetVon].sort().map((r) => `\x60${r}\x60`).join(", ") + "  \n*(als Links im Bereich „Rückverweise“ von Obsidian)*");
    if (info.extern.size) teile.push("## Externe Pakete", [...info.extern].sort().map((e) => `\x60${e}\x60`).join(", "));
    notizen.push({ name: info.name, relPfad: info.relPfad, inhalt: teile.join("\n\n") + "\n", bereich: "projekt" });
  }
  return notizen;
}

const mmText = (s) => String(s).replace(/"/g, "#quot;");

function architekturNotiz(infos, gesetze, namen) {
  const name = "Architektur";
  namen.add(name.toLowerCase());
  const nachBereich = new Map();
  for (const info of infos.values()) {
    if (!nachBereich.has(info.bereich)) nachBereich.set(info.bereich, []);
    nachBereich.get(info.bereich).push(info);
  }
  // Feste Bereiche plus Unterordner von lib/ (hinter dem Lotsen eingereiht)
  const zusatz = [...infos.ordnerBereiche.values()].map((o) => ({ id: o.name, text: o.text }));
  const lotse = BEREICHE.findIndex((b) => b.id === "Lotse");
  const bereiche = [...BEREICHE.slice(0, lotse + 1), ...zusatz, ...BEREICHE.slice(lotse + 1)].filter((b) => nachBereich.has(b.id));
  const bid = new Map(bereiche.map((b, i) => [b.id, `B${i}`]));
  const datenKnoten = (p) => p.split("/").slice(0, 2).join("/");
  const did = new Map();
  const dKnoten = (p) => {
    const k = datenKnoten(p);
    if (!did.has(k)) did.set(k, `D${did.size}`);
    return did.get(k);
  };

  // Grobe Übersicht: Kanten zwischen Bereichen (aus den Importen zusammengefasst)
  const kanten = new Map();
  const kante = (von, nach, art) => {
    if (von === nach) return;
    const k = `${von}|${nach}`;
    if (!kanten.has(k)) kanten.set(k, new Set());
    kanten.get(k).add(art);
  };
  for (const info of infos.values()) {
    const von = bid.get(info.bereich);
    for (const l of info.lokal) if (infos.has(l.rel)) kante(von, bid.get(infos.get(l.rel).bereich), "nutzt");
    for (const a of info.api) if (infos.has(a)) kante(von, bid.get(infos.get(a).bereich), "ruft auf (HTTP)");
    for (const [p, ops] of info.daten) for (const op of ops.size ? ops : ["verwendet"]) {
      if (op === "schreibt") kante(von, dKnoten(p), op);
      else kante(dKnoten(p), von, op === "liest" ? "gelesen von" : op);
    }
  }
  const grob = ["\x60\x60\x60mermaid", "flowchart LR"];
  for (const b of bereiche) grob.push(`  ${bid.get(b.id)}["${mmText(b.id)} (${nachBereich.get(b.id).length})"]`);
  for (const [k, id] of did) grob.push(`  ${id}[("${mmText(k)}")]`);
  for (const [k, arten] of kanten) {
    const [von, nach] = k.split("|");
    grob.push(`  ${von} -->|"${mmText([...arten].join(", "))}"| ${nach}`);
  }
  grob.push("\x60\x60\x60");

  // Detail: alle Dateien und ihre Importe
  const fid = new Map([...infos.keys()].map((rel, i) => [rel, `F${i}`]));
  const detail = ["\x60\x60\x60mermaid", "flowchart LR"];
  for (const b of bereiche) {
    detail.push(`  subgraph S${bid.get(b.id)}["${mmText(b.id)}"]`);
    for (const info of nachBereich.get(b.id)) detail.push(`    ${fid.get(info.rel)}["${mmText(info.rel)}"]`);
    detail.push("  end");
  }
  if (did.size) {
    detail.push(`  subgraph SD["Daten"]`);
    for (const [k, id] of did) detail.push(`    ${id}[("${mmText(k)}")]`);
    detail.push("  end");
  }
  for (const info of infos.values()) {
    for (const l of info.lokal) if (fid.has(l.rel)) detail.push(`  ${fid.get(info.rel)} ${l.nurTypen ? "-.->" : "-->"} ${fid.get(l.rel)}`);
    for (const a of info.api) if (fid.has(a)) detail.push(`  ${fid.get(info.rel)} ==>|HTTP| ${fid.get(a)}`);
    const proKnoten = new Map();
    for (const [p, ops] of info.daten) {
      const d = dKnoten(p);
      if (!proKnoten.has(d)) proKnoten.set(d, new Set());
      for (const op of ops.size ? ops : ["verwendet"]) proKnoten.get(d).add(op);
    }
    for (const [d, ops] of proKnoten) detail.push(`  ${fid.get(info.rel)} -.->|${[...ops].sort().join(" und ")}| ${d}`);
  }
  detail.push("\x60\x60\x60");

  const anzahlImporte = [...infos.values()].reduce((s, i) => s + i.lokal.length, 0);
  const anzahlZeilen = [...infos.values()].reduce((s, i) => s + i.zeilen, 0);
  const teile = [
    frontmatter({ dateien: infos.size, zeilen: anzahlZeilen, tags: ["projekt", "uebersicht"] }),
    "# Architektur von ParaGecko",
    "> [!info] Automatisch erzeugt\n> Diagramme und Dateilisten entstehen bei jedem Lauf von \x60npm run obsidian\x60 aus den Importen im Quellcode. Nach Codeänderungen einfach neu ausführen.",
    "## Kurz erklärt",
    "Die App beantwortet Fragen zum Bau- und Denkmalrecht. Den Gesetzestext erfindet sie nie selbst: Er kommt immer wortwörtlich aus den amtlichen Quellen. So greifen die Teile ineinander:",
    bereiche
      .map((b, i) => `${i + 1}. **${mdText(b.id)}** ${b.text}  \n   Dateien: ${nachBereich.get(b.id).map((x) => wikilink(x, x.rel)).join(", ")}`)
      .join("\n"),
    "**Ablauf einer Frage:** Chat in der Oberfläche → Schnittstelle (HTTP) → Lotse erkennt, was gemeint ist → Bibliothek liefert den Wortlaut aus \x60data/gesetze/\x60 → Antwort erscheint als Karte im Chat.",
    `**Gesetze in den Daten:** ${gesetze.map((g) => wikilink(g._uebersicht)).join(", ")}`,
    "## Zusammenspiel der Bereiche",
    "Pfeile zeigen, wer wen nutzt (aus den Importen zusammengefasst) und wer welche Daten liest oder schreibt.",
    grob.join("\n"),
    "## Alle Dateien und ihre Importe",
    "Durchgezogene Pfeile: Import · gestrichelt: nur Typen bzw. Datenzugriff · dick: Aufruf per HTTP.",
    detail.join("\n"),
    "## Zahlen",
    `- ${infos.size} Quelldateien mit zusammen ${anzahlZeilen} Zeilen\n- ${anzahlImporte} lokale Importe\n- Erfasst werden die Ordner ${PROJEKT_ORDNER.map((o) => `\x60${o}/\x60`).join(", ")} (ohne node_modules, .next, data/quellen)`,
  ];
  return { name, relPfad: `Projekt/${name}`, inhalt: teile.join("\n\n") + "\n", bereich: "projekt" };
}

// ---------------------------------------------------------------------------------------------
// 6. Start.md und graph.json
// ---------------------------------------------------------------------------------------------

function farbGruppen(gesetze) {
  return [
    { query: "tag:#gliederung", farbe: FARBE_GLIEDERUNG, text: "Gliederung (Kapitel, Teile, Abschnitte)", farbname: "grau-blau" },
    ...gesetze.map((g) => ({
      query: `tag:#gesetz/${tagSlug(g.kurz)}`,
      farbe: g._farbe,
      text: `${g.kurz} – Paragraphen${g.normen.some((n) => /^Anlage\b/.test(n.bez)) ? ", Anlagen" : ""} und Übersicht`,
      farbname: FARB_NAMEN[g.id] ?? g._farbe,
    })),
    { query: "tag:#projekt", farbe: FARBE_PROJEKT, text: "Projektdateien und Architektur", farbname: "grau" },
  ];
}

const obsidianFarbe = (hex) => ({ a: 1, rgb: parseInt(hex.replace("#", ""), 16) });

function graphJson(gruppen) {
  return {
    "collapse-filter": true,
    search: "",
    showTags: false,
    showAttachments: false,
    hideUnresolved: false,
    showOrphans: true,
    "collapse-color-groups": false,
    colorGroups: gruppen.map((g) => ({ query: g.query, color: obsidianFarbe(g.farbe) })),
    "collapse-display": true,
    showArrow: true,
    textFadeMultiplier: 0,
    nodeSizeMultiplier: 1,
    lineSizeMultiplier: 1,
    "collapse-forces": true,
    centerStrength: 0.518713248970312,
    repelStrength: 10,
    linkStrength: 1,
    linkDistance: 250,
    scale: 1,
    close: false,
  };
}

function startNotiz(gesetze, gruppen, zahlen) {
  const teile = [
    "# ParaGecko in Obsidian",
    "Dieser Ordner ist ein **Obsidian-Vault**. Er zeigt die Gesetze Paragraph für Paragraph mit ihrer Gliederung und ihren Verweisen – und daneben die Dateien der App mit ihren Abhängigkeiten.",
    "## So öffnen Sie den Vault",
    [
      "1. Obsidian starten (kostenlos unter obsidian.md).",
      "2. „Ordner als Vault öffnen“ wählen und den Ordner \x60obsidian\x60 in diesem Projekt auswählen.",
      "3. Die **Graph-Ansicht** öffnen: \x60Strg+G\x60 oder das Graph-Symbol in der linken Leiste.",
      "4. Im Graph oben rechts das Zahnrad öffnen: Unter „Gruppen“ stehen die Farben, unter „Filter“ lassen sich Teile ausblenden.",
      "5. In jeder Notiz zeigt „Lokalen Graph öffnen“ (Menü ⋯) nur die direkten Nachbarn.",
    ].join("\n"),
    "## Farblegende (Graph-Ansicht)",
    gruppen.map((g) => `- <span style="color:${g.farbe}">●</span> **${mdText(g.farbname)}** – ${mdText(g.text)}`).join("\n") +
      "\n- ohne Farbe – diese Startseite",
    "## Einstieg",
    [
      ...gesetze.map((g) => `- ${wikilink(g._uebersicht)} – ${mdText(leer(g.titel))} (Übersicht mit Inhaltsbaum)`),
      `- [[Architektur]] – wie die Teile der App zusammenspielen`,
    ].join("\n"),
    "## Nützliche Filter",
    "In das Suchfeld der Graph-Ansicht eingeben:",
    [
      ...gesetze.map((g) => `- \x60tag:#gesetz/${tagSlug(g.kurz)}\x60 – nur ${mdText(g.kurz)}`),
      "- \x60-tag:#gliederung\x60 – Gliederung ausblenden, dann sieht man nur die Verweise zwischen Paragraphen",
      "- \x60tag:#projekt\x60 – nur die App-Dateien",
    ].join("\n"),
    "## Was steht wo?",
    [
      `- \x60Gesetze/\x60 – ${zahlen.paragraphen} Paragraph- und Anlagen-Notizen, ${zahlen.gliederung} Gliederungsnotizen, ${zahlen.uebersichten} Übersichten`,
      `- \x60Projekt/\x60 – ${zahlen.projekt} Notizen zu Quelldateien und die Notiz [[Architektur]]`,
    ].join("\n"),
    "## Aktualisieren",
    "Im Projektordner \x60npm run obsidian\x60 ausführen. Dabei werden \x60Gesetze/\x60, \x60Projekt/\x60 und diese Datei neu erzeugt – eigene Notizen bitte außerhalb dieser Ordner ablegen. Einstellungen in \x60.obsidian/\x60 bleiben erhalten.",
    "> [!warning] Hinweis\n> Der Gesetzestext ist wortgetreu aus den amtlichen Quellen übernommen; maßgeblich ist trotzdem allein die amtliche Fassung (Link in jeder Notiz). Erläuterungen sind ungeprüfte Entwürfe und keine Rechtsberatung.",
  ];
  return { name: "Start", relPfad: "Start", inhalt: teile.join("\n\n") + "\n", bereich: "start" };
}

// ---------------------------------------------------------------------------------------------
// 7. Ablauf
// ---------------------------------------------------------------------------------------------

function pruefeDateinamen(notizen) {
  const fehler = [];
  const gesehen = new Set();
  for (const n of notizen) {
    for (const teil of n.relPfad.split("/")) {
      if (/[\\:*?"<>|]/.test(teil) || /[. ]$/.test(teil) || !teil) fehler.push(`Ungültiger Dateiname: ${n.relPfad}`);
    }
    const key = n.relPfad.toLowerCase();
    if (gesehen.has(key)) fehler.push(`Doppelter Dateiname: ${n.relPfad}`);
    gesehen.add(key);
  }
  return fehler;
}

function main() {
  const gesetze = ladeGesetze();
  if (!gesetze.length) throw new Error("Keine Gesetze in data/gesetze/ gefunden.");
  const namen = new Set(["start", "architektur"]);

  const { notizen: gesetzNotizen, paragraphNotizen } = erzeugeGesetzesNotizen(gesetze, namen);
  const infos = analysiereProjekt(namen);
  const projektNotizen = [...erzeugeProjektNotizen(infos, gesetze), architekturNotiz(infos, gesetze, namen)];
  const gruppen = farbGruppen(gesetze);
  const zahlen = {
    paragraphen: paragraphNotizen.length,
    gliederung: gesetzNotizen.filter((n) => n.bereich === "gliederung").length,
    uebersichten: gesetzNotizen.filter((n) => n.bereich === "uebersicht").length,
    projekt: projektNotizen.length - 1,
  };
  const alle = [...gesetzNotizen, ...projektNotizen, startNotiz(gesetze, gruppen, zahlen)];

  // Selbsttest VOR dem Schreiben
  const fehler = [...gegenprobe(), ...selbsttest(paragraphNotizen), ...pruefeDateinamen(alle)];
  if (fehler.length) {
    console.error(`\nSelbsttest fehlgeschlagen (${fehler.length} Fehler) – es wurde nichts geschrieben:`);
    for (const f of fehler.slice(0, 20)) console.error("  - " + f);
    if (fehler.length > 20) console.error(`  … und ${fehler.length - 20} weitere`);
    process.exit(1);
  }

  // Nur die eigenen Bereiche neu erzeugen
  fs.mkdirSync(VAULT, { recursive: true });
  for (const eigen of ["Gesetze", "Projekt"]) fs.rmSync(path.join(VAULT, eigen), { recursive: true, force: true });
  fs.rmSync(path.join(VAULT, "Start.md"), { force: true });
  for (const n of alle) {
    const ziel = path.join(VAULT, ...n.relPfad.split("/")) + ".md";
    fs.mkdirSync(path.dirname(ziel), { recursive: true });
    fs.writeFileSync(ziel, n.inhalt, "utf8");
  }

  // Farbgruppen: graph.json nur anlegen, wenn sie fehlt (Obsidian speichert dort auch eigene Einstellungen)
  const graphDatei = path.join(VAULT, ".obsidian", "graph.json");
  let graphStatus;
  if (!fs.existsSync(graphDatei)) {
    fs.mkdirSync(path.dirname(graphDatei), { recursive: true });
    fs.writeFileSync(graphDatei, JSON.stringify(graphJson(gruppen), null, 2) + "\n", "utf8");
    graphStatus = "angelegt";
  } else if (OPTIONEN.has("--graph-farben")) {
    const vorhanden = JSON.parse(fs.readFileSync(graphDatei, "utf8"));
    vorhanden.colorGroups = graphJson(gruppen).colorGroups;
    fs.writeFileSync(graphDatei, JSON.stringify(vorhanden, null, 2) + "\n", "utf8");
    graphStatus = "Farbgruppen neu gesetzt (übrige Einstellungen erhalten)";
  } else graphStatus = "vorhanden, unverändert (Farben neu setzen: npm run obsidian -- --graph-farben)";

  const proGesetz = gesetze
    .map((g) => {
      const p = paragraphNotizen.filter((n) => n.gesetz === g).length;
      const gl = gesetzNotizen.filter((n) => n.gesetz === g && n.bereich === "gliederung").length;
      return `${g.kurz}: ${p} Vorschriften + ${gl} Gliederung + 1 Übersicht`;
    })
    .join(" | ");
  console.log(`Obsidian-Vault geschrieben: ${toPosix(path.relative(ROOT, VAULT))}/`);
  console.log(`  Gesetze/   ${gesetzNotizen.length} Notizen (${proGesetz})`);
  console.log(`  Projekt/   ${projektNotizen.length} Notizen (${infos.size} Quelldateien + Architektur)`);
  console.log(`  Start.md   1 Notiz`);
  console.log(`  Gesamt     ${alle.length} Notizen`);
  const geprueft = paragraphNotizen.filter((x) => !x.gesetz?.nurVerzeichnis).length;
  const nurVerzeichnis = paragraphNotizen.length - geprueft;
  console.log(`  Selbsttest Wortlaut: ${geprueft}/${geprueft} Vorschriften identisch mit "text" (nach Leerraum-Normalisierung; MBO und NBauO wegen der Satznummern ohne Leerraum), Gegenprobe bestanden${nurVerzeichnis ? `; ${nurVerzeichnis} Verzeichniseinträge ohne Wortlaut (VOB/C)` : ""}`);
  console.log(`  graph.json ${graphStatus}`);
  console.log(SCHLANK ? "  Brotkrumen: nur direkte Oberebene verlinkt (Baum)" : "  Brotkrumen: alle Ebenen verlinkt (--voller-pfad)");
}

main();
