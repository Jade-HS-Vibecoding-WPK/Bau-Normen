// Hilfsfunktionen für Text (auch im Browser nutzbar).
import type { TextKnoten } from "./typen";

/** Wandelt den Strukturbaum zurück in reinen Text, z. B. zum Kopieren. */
export function alsText(nodes: TextKnoten[]): string {
  let out = "";
  for (const n of nodes) {
    if (typeof n === "string") out += n;
    else if (n.t === "p") out += (out && !out.endsWith("\n") ? "\n" : "") + alsText(n.c) + "\n";
    else if (n.t === "br") out += "\n";
    else if (n.t === "dl") {
      for (const it of n.items) out += "\n" + it.dt + " " + alsText(it.c);
      out += "\n";
    } else if (n.t === "table") out += n.rows.map((r) => r.join(" | ")).join("\n") + "\n";
    else if (n.t === "pre" || n.t === "hinweis") out += n.v + "\n";
    // Hochgestellte Ziffern (Satznummern der MBO, m², Fußnotenzeichen) als hochgestellte Zeichen: "¹Bauliche Anlagen", "m²"
    else if (n.t === "sup") out += hochgestellt(alsText(n.c));
    else if ("c" in n) out += alsText(n.c);
  }
  return out.replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
}

const HOCH: Record<string, string> = { "0": "⁰", "1": "¹", "2": "²", "3": "³", "4": "⁴", "5": "⁵", "6": "⁶", "7": "⁷", "8": "⁸", "9": "⁹", "*": "*", ")": "⁾", "(": "⁽" };
const hochgestellt = (s: string) => (/^[0-9*()]+$/.test(s) ? [...s].map((z) => HOCH[z]).join("") : s);

const MONATE = ["januar", "februar", "märz", "april", "mai", "juni", "juli", "august", "september", "oktober", "november", "dezember"];

/**
 * Datum der letzten Änderung aus der Standangabe:
 *  "zuletzt geändert durch Art. 8 Abs. 2 G v. 23.7.2026 I Nr. 226"           -> "23.07.2026"
 *  "Zuletzt geändert durch Artikel 3 des Gesetzes vom 12. Dezember 2023 (…)" -> "12.12.2023"
 */
export function standDatum(stand: string): string | null {
  const m = stand.match(/v\.\s*(\d{1,2})\.(\d{1,2})\.(\d{4})/);
  if (m) return `${m[1].padStart(2, "0")}.${m[2].padStart(2, "0")}.${m[3]}`;
  const w = stand.match(/vom\s+(\d{1,2})\.\s*([A-Za-zäÄ]+)\s+(\d{4})/);
  const monat = w ? MONATE.indexOf(w[2].toLowerCase()) + 1 : 0;
  if (w && monat) return `${w[1].padStart(2, "0")}.${String(monat).padStart(2, "0")}.${w[3]}`;
  // sonst das späteste Datum im Text ("26./27.9.2024", "BAnz AT 24.08.2026 B6")
  const daten = [...stand.matchAll(/(\d{1,2})\.(\d{1,2})\.(\d{4})/g)].map((d) => ({ d, wert: Number(d[3]) * 10000 + Number(d[2]) * 100 + Number(d[1]) }));
  if (daten.length) {
    const { d } = daten.sort((a, b) => b.wert - a.wert)[0];
    return `${d[1].padStart(2, "0")}.${d[2].padStart(2, "0")}.${d[3]}`;
  }
  return null;
}
