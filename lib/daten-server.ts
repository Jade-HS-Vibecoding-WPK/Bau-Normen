// Datenquelle auf dem Server: liest data/*.json aus dem Dateisystem.
// Nach einem neuen Import (geänderte Dateien) wird automatisch neu geladen.
import fs from "node:fs";
import path from "node:path";
import { setzeDatenquelle, type Datenquelle } from "./gesetze";
import type { Erlaeuterung, Gesetz } from "./typen";

const DATEN = path.join(process.cwd(), "data");

let gesetze: Gesetz[] = [];
let gesetzeSchluessel = "";
const erlCache = new Map<string, { mtime: number; daten: Record<string, Erlaeuterung> }>();
let stichworte: { mtime: number; daten: Record<string, string[] | string> } | null = null;

const mtime = (datei: string) => (fs.existsSync(datei) ? fs.statSync(datei).mtimeMs : 0);

/** Fingerabdruck der Datendateien – ändert sich nach einem neuen Import, dann wird neu geladen. */
function datenSchluessel(dir: string): string {
  if (!fs.existsSync(dir)) return "";
  return fs
    .readdirSync(dir)
    .filter((d) => d.endsWith(".json"))
    .map((d) => `${d}:${mtime(path.join(dir, d))}`)
    .join("|");
}

export const serverDaten: Datenquelle = {
  gesetze() {
    const dir = path.join(DATEN, "gesetze");
    const schluessel = datenSchluessel(dir);
    if (schluessel === gesetzeSchluessel && gesetze.length) return gesetze;
    gesetze = (fs.existsSync(dir) ? fs.readdirSync(dir) : [])
      .filter((d) => d.endsWith(".json"))
      .map((d) => JSON.parse(fs.readFileSync(path.join(dir, d), "utf8")) as Gesetz);
    gesetzeSchluessel = schluessel;
    return gesetze;
  },
  erlaeuterungen(gesetzId) {
    const datei = path.join(DATEN, "erlaeuterungen", `${gesetzId}.json`);
    const m = mtime(datei);
    const c = erlCache.get(gesetzId);
    if (c && c.mtime === m) return c.daten;
    const daten = m ? JSON.parse(fs.readFileSync(datei, "utf8")) : {};
    erlCache.set(gesetzId, { mtime: m, daten });
    return daten;
  },
  stichworte() {
    const datei = path.join(DATEN, "stichworte.json");
    const m = mtime(datei);
    if (stichworte && stichworte.mtime === m) return stichworte.daten;
    stichworte = { mtime: m, daten: m ? JSON.parse(fs.readFileSync(datei, "utf8")) : {} };
    return stichworte.daten;
  },
};

setzeDatenquelle(serverDaten);
