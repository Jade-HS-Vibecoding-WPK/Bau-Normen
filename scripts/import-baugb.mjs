// Importiert das Baugesetzbuch aus der amtlichen XML-Fassung von gesetze-im-internet.de
// und speichert es Paragraph für Paragraph als JSON.
//
// Grundregel: Der Gesetzestext wird NICHT verändert. Wir übernehmen den Wortlaut
// exakt aus der XML-Datei und speichern nur zusätzlich seine Struktur
// (Absätze, Nummern, Buchstaben), damit er im Chat sauber dargestellt werden kann.
//
// Aufruf:  npm run import:baugb            (lädt die aktuelle Fassung herunter)
//          npm run import:baugb -- --offline (nutzt die bereits gespeicherte XML-Datei)

import { DOMParser } from "@xmldom/xmldom";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { extrahiereVerweise } from "./lib/verweise.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const QUELL_DIR = path.join(ROOT, "data", "quellen", "baugb");
const ZIEL = path.join(ROOT, "data", "gesetze", "baugb.json");
const BASIS_URL = "https://www.gesetze-im-internet.de/bbaug/";

async function ladeQuelle() {
  fs.mkdirSync(QUELL_DIR, { recursive: true });
  if (!process.argv.includes("--offline")) {
    const res = await fetch(BASIS_URL + "xml.zip");
    if (!res.ok) throw new Error(`Download fehlgeschlagen: HTTP ${res.status}`);
    const zip = path.join(QUELL_DIR, "xml.zip");
    fs.writeFileSync(zip, Buffer.from(await res.arrayBuffer()));
    execFileSync("tar", ["-xf", zip, "-C", QUELL_DIR]);
  }
  const xmlDatei = fs.readdirSync(QUELL_DIR).find((f) => f.endsWith(".xml"));
  if (!xmlDatei) throw new Error("Keine XML-Datei gefunden.");
  return fs.readFileSync(path.join(QUELL_DIR, xmlDatei), "utf8");
}

const kinder = (el) => Array.from(el.childNodes ?? []);
const elemente = (el, name) => kinder(el).filter((k) => k.nodeType === 1 && (!name || k.nodeName === name));
const erstes = (el, name) => elemente(el, name)[0];
const text = (el) => (el ? el.textContent : "");

// Wandelt den XML-Inhalt in eine schlanke Baumstruktur um.
// Textknoten bleiben exakt erhalten (Strings), Elemente werden zu Objekten.
function wandle(node) {
  if (node.nodeType === 3) return node.nodeValue ? [node.nodeValue] : [];
  if (node.nodeType !== 1) return [];
  const name = node.nodeName;
  const inhalt = () => kinder(node).flatMap(wandle);
  switch (name) {
    case "P":
      return [{ t: "p", c: inhalt() }];
    case "BR":
      return [{ t: "br" }];
    case "B":
      return [{ t: "b", c: inhalt() }];
    case "I":
      return [{ t: "i", c: inhalt() }];
    case "SUP":
      return [{ t: "sup", c: inhalt() }];
    case "SUB":
      return [{ t: "sub", c: inhalt() }];
    case "DL": {
      const items = [];
      for (const k of elemente(node)) {
        if (k.nodeName === "DT") items.push({ dt: text(k), c: [] });
        else if (k.nodeName === "DD" && items.length) items[items.length - 1].c.push(...kinder(k).flatMap(wandle));
      }
      return [{ t: "dl", items }];
    }
    case "LA":
    case "noindex":
    case "Content":
      return inhalt();
    case "kommentar":
      return [{ t: "hinweis", v: text(node) }];
    case "pre":
      return [{ t: "pre", v: text(node) }];
    case "table": {
      const rows = [];
      const rowEls = Array.from(node.getElementsByTagName("row"));
      for (const r of rowEls) rows.push(Array.from(r.getElementsByTagName("entry")).map((e) => text(e)));
      return [{ t: "table", rows }];
    }
    case "FnR":
    case "Footnotes":
      return [];
    default:
      return inhalt();
  }
}

// Reiner Text (für Suche, Prüfung und Verweis-Erkennung)
export function alsText(nodes) {
  let out = "";
  for (const n of nodes) {
    if (typeof n === "string") out += n;
    else if (n.t === "p") out += (out && !out.endsWith("\n") ? "\n" : "") + alsText(n.c) + "\n";
    else if (n.t === "br") out += "\n";
    else if (n.t === "dl") {
      for (const it of n.items) out += "\n" + it.dt + " " + alsText(it.c);
      out += "\n";
    }
    else if (n.t === "table") out += n.rows.map((r) => r.join(" | ")).join("\n") + "\n";
    else if (n.t === "pre" || n.t === "hinweis") out += n.v + "\n";
    else if (n.c) out += alsText(n.c);
  }
  return out.replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
}

function normId(enbez) {
  const m = enbez.match(/^§\s*(\d+[a-z]?)$/);
  if (m) return m[1];
  const a = enbez.match(/^Anlage\s*(\d+)$/);
  if (a) return "anlage-" + a[1];
  return null;
}

function quellUrl(id) {
  if (id.startsWith("anlage-")) return BASIS_URL + "anlage_" + id.slice(7) + ".html";
  return BASIS_URL + "__" + id + ".html";
}

async function main() {
  const xml = await ladeQuelle();
  const doc = new DOMParser().parseFromString(xml, "text/xml");
  const wurzel = doc.documentElement;
  const normEls = elemente(wurzel, "norm");

  // Kopfdaten des Gesetzes
  const kopf = erstes(normEls[0], "metadaten");
  const standangaben = elemente(kopf, "standangabe").map((s) => ({
    typ: text(erstes(s, "standtyp")),
    text: text(erstes(s, "standkommentar")),
  }));

  const gliederungsStapel = []; // [{kennzahl, bez, titel}]
  const normen = [];

  for (const normEl of normEls) {
    const meta = erstes(normEl, "metadaten");
    const ge = erstes(meta, "gliederungseinheit");
    if (ge) {
      const kennzahl = text(erstes(ge, "gliederungskennzahl"));
      const ebene = kennzahl.length / 3;
      gliederungsStapel.length = ebene - 1;
      gliederungsStapel.push({ bez: text(erstes(ge, "gliederungsbez")), titel: text(erstes(ge, "gliederungstitel")) });
      continue;
    }
    const enbez = text(erstes(meta, "enbez"));
    const id = normId(enbez);
    if (!id) continue; // z. B. Inhaltsübersicht

    const titel = text(erstes(meta, "titel"));
    const textdaten = erstes(normEl, "textdaten");
    const textEl = textdaten && erstes(textdaten, "text");
    const contentEl = textEl && erstes(textEl, "Content");
    const inhalt = contentEl ? kinder(contentEl).flatMap(wandle) : [];
    const fussEl = textdaten && erstes(textdaten, "fussnoten");
    const fussnoten = fussEl ? alsText(kinder(fussEl).flatMap(wandle)) : "";
    const klartext = alsText(inhalt);

    normen.push({
      id,
      bez: enbez,
      titel,
      gliederung: gliederungsStapel.map((g) => `${g.bez} – ${g.titel}`),
      weggefallen: /^\(?weggefallen\)?$/i.test(titel.trim()) || /^\(?weggefallen\)?$/i.test(klartext),
      inhalt,
      text: klartext,
      fussnoten: fussnoten || undefined,
      url: quellUrl(id),
    });
  }

  // Verweise innerhalb des Gesetzes erkennen (nur auf existierende Paragraphen)
  const vorhanden = new Set(normen.map((n) => n.id));
  const reihenfolge = normen.map((n) => n.id);
  for (const n of normen) {
    n.verweise = extrahiereVerweise(n.text, vorhanden, reihenfolge, "BauGB").filter((v) => v !== n.id);
  }

  const gesetz = {
    id: "baugb",
    kurz: "BauGB",
    titel: "Baugesetzbuch",
    ebene: "Bund",
    stand: standangaben.find((s) => s.typ === "Stand")?.text ?? "",
    neufassung: standangaben.find((s) => s.typ === "Neuf")?.text ?? "",
    quelle: {
      name: "Bundesministerium der Justiz / juris – gesetze-im-internet.de",
      url: BASIS_URL,
      xmlStand: wurzel.getAttribute("builddate"),
      abgerufen: new Date().toISOString().slice(0, 10),
    },
    normen,
  };

  fs.mkdirSync(path.dirname(ZIEL), { recursive: true });
  fs.writeFileSync(ZIEL, JSON.stringify(gesetz, null, 1));
  const aktiv = normen.filter((n) => !n.weggefallen).length;
  console.log(`BauGB importiert: ${normen.length} Einträge (${aktiv} in Kraft), Stand: ${gesetz.stand}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
