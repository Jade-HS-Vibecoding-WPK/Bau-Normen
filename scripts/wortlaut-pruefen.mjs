// Prüfprogramm "Wortlaut": vergleicht jeden gespeicherten BauGB-Paragraphen mit der amtlichen
// Einzelseite auf gesetze-im-internet.de (unabhängige Darstellung derselben Quelle).
// Verglichen werden alle Zeichen außer Leerraum – jede abweichende Silbe, Zahl oder jedes Satzzeichen fällt auf.
//
// Aufruf: node scripts/wortlaut-pruefen.mjs            (alle Paragraphen, ca. 2 Minuten)
//         node scripts/wortlaut-pruefen.mjs 34 35 13a  (nur ausgewählte)
//
// Hinweis NDSchG: wurde beim Import gegen NI-VORIS geprüft; der Anbieter behält sich automatisierte
// Abrufe vor (§ 44b UrhG), deshalb hier keine erneute Massenprüfung.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const gesetz = JSON.parse(fs.readFileSync(path.join(ROOT, "data", "gesetze", "baugb.json"), "utf8"));
const auswahl = process.argv.slice(2);
const normen = gesetz.normen.filter((n) => !auswahl.length || auswahl.includes(n.id));

const ENTITAETEN = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ", auml: "ä", ouml: "ö", uuml: "ü", Auml: "Ä", Ouml: "Ö", Uuml: "Ü", szlig: "ß", sect: "§", ndash: "–", mdash: "—", bdquo: "„", ldquo: "“", rdquo: "”", sbquo: "‚", lsquo: "‘", rsquo: "’", hellip: "…", deg: "°", sup2: "²", sup3: "³", times: "×", middot: "·", euro: "€" };
const dekodieren = (s) =>
  s
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&([a-z0-9]+);/gi, (m, n) => ENTITAETEN[n] ?? m);

/** Inhalt des ersten <div class="jnhtml"> (Normtext; Fußnoten stehen in einem weiteren Block). */
function normtextAusHtml(html) {
  const start = html.indexOf('<div class="jnhtml">');
  if (start < 0) return null;
  let tiefe = 0;
  const re = /<\/?div\b[^>]*>/gi;
  re.lastIndex = start;
  let m;
  while ((m = re.exec(html))) {
    tiefe += m[0].startsWith("</") ? -1 : 1;
    if (tiefe === 0) return html.slice(start, m.index);
  }
  return null;
}

// Leerraum und die Tabellen-Trennzeichen " | " unserer Textfassung werden nicht verglichen.
const ohneLeerraum = (s) => s.replace(/[\s |]+/g, "");

let ok = 0;
const abweichungen = [];
for (const n of normen) {
  try {
    const res = await fetch(n.url, { headers: { "User-Agent": "Wortlautpruefung/0.1" }, signal: AbortSignal.timeout(15000) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const html = new TextDecoder("iso-8859-1").decode(await res.arrayBuffer());
    const block = normtextAusHtml(html);
    if (block === null && n.weggefallen && /weggefallen/i.test(html)) {
      ok++;
      continue;
    }
    if (block === null) throw new Error("Normtext auf der Seite nicht gefunden");
    const amtlich = ohneLeerraum(dekodieren(block.replace(/<[^>]+>/g, " ")));
    const gespeichert = ohneLeerraum(n.text);
    if (amtlich === gespeichert || (n.weggefallen && amtlich.includes("weggefallen"))) {
      ok++;
    } else {
      let i = 0;
      while (i < amtlich.length && amtlich[i] === gespeichert[i]) i++;
      abweichungen.push(`${n.bez}: ab Zeichen ${i}\n    amtlich:     …${amtlich.slice(Math.max(0, i - 30), i + 50)}\n    gespeichert: …${gespeichert.slice(Math.max(0, i - 30), i + 50)}`);
    }
  } catch (e) {
    abweichungen.push(`${n.bez}: Prüfung nicht möglich (${e.message})`);
  }
  await new Promise((r) => setTimeout(r, 250));
}

console.log(`BauGB Wortlautprüfung: ${ok}/${normen.length} identisch mit gesetze-im-internet.de`);
for (const a of abweichungen) console.log("  " + a);
process.exit(abweichungen.length ? 1 : 0);
