// Die "Bibliothek": lädt die importierten Gesetze und beantwortet Abrufe.
// Wichtig: Hier wird kein Text erzeugt – alles stammt 1:1 aus data/gesetze/*.json.
import fs from "node:fs";
import path from "node:path";
import type { Erlaeuterung, Gesetz, GesetzInfo, Norm, NormAnsicht, NormRef } from "./typen";

const DATEN = path.join(process.cwd(), "data");

let cache: Map<string, Gesetz> | null = null;
let cacheSchluessel = "";
const erlCache = new Map<string, { mtime: number; daten: Record<string, Erlaeuterung> }>();

/** Fingerabdruck der Datendateien – ändert sich nach einem neuen Import, dann wird neu geladen. */
function datenSchluessel(dir: string): string {
  if (!fs.existsSync(dir)) return "";
  return fs
    .readdirSync(dir)
    .filter((d) => d.endsWith(".json"))
    .map((d) => `${d}:${fs.statSync(path.join(dir, d)).mtimeMs}`)
    .join("|");
}

export function alleGesetze(): Map<string, Gesetz> {
  const dir = path.join(DATEN, "gesetze");
  const schluessel = datenSchluessel(dir);
  if (cache && schluessel === cacheSchluessel) return cache;
  const geladen: Gesetz[] = [];
  for (const datei of fs.existsSync(dir) ? fs.readdirSync(dir) : []) {
    if (!datei.endsWith(".json")) continue;
    geladen.push(JSON.parse(fs.readFileSync(path.join(dir, datei), "utf8")) as Gesetz);
  }
  // Feste Reihenfolge: Bundesrecht zuerst, dann Landesrecht
  geladen.sort((a, b) => Number(b.ebene === "Bund") - Number(a.ebene === "Bund"));
  cache = new Map(geladen.map((g) => [g.id, g]));
  cacheSchluessel = schluessel;
  return cache;
}

function erlaeuterungen(gesetzId: string): Record<string, Erlaeuterung> {
  const datei = path.join(DATEN, "erlaeuterungen", `${gesetzId}.json`);
  const mtime = fs.existsSync(datei) ? fs.statSync(datei).mtimeMs : 0;
  const c = erlCache.get(gesetzId);
  if (c && c.mtime === mtime) return c.daten;
  const daten = mtime ? JSON.parse(fs.readFileSync(datei, "utf8")) : {};
  erlCache.set(gesetzId, { mtime, daten });
  return daten;
}

export function gesetzInfo(g: Gesetz): GesetzInfo {
  return {
    id: g.id,
    kurz: g.kurz,
    titel: g.titel,
    ebene: g.ebene,
    stand: g.stand,
    quelleName: g.quelle.name,
    quelleUrl: g.quelle.url,
    anzahl: g.normen.filter((n) => !n.weggefallen).length,
  };
}

export function gesetzListe(): GesetzInfo[] {
  return [...alleGesetze().values()].map(gesetzInfo);
}

export function findeNorm(gesetzId: string, normId: string): Norm | undefined {
  return alleGesetze().get(gesetzId)?.normen.find((n) => n.id === normId);
}

const ref = (g: Gesetz, n: Norm): NormRef => ({ gesetz: g.kurz, id: n.id, bez: n.bez, titel: n.titel });

export function normAnsicht(gesetzId: string, normId: string): NormAnsicht | undefined {
  const g = alleGesetze().get(gesetzId);
  const n = g?.normen.find((x) => x.id === normId);
  if (!g || !n) return undefined;
  const byId = new Map(g.normen.map((x) => [x.id, x]));

  const verweistAuf = n.verweise.map((id) => byId.get(id)).filter((x): x is Norm => !!x).map((x) => ref(g, x));
  const erwaehntIn = g.normen.filter((x) => x.id !== n.id && x.verweise.includes(n.id)).map((x) => ref(g, x));
  const abschnitt = n.gliederung.join("|");
  const gleicherAbschnitt = abschnitt
    ? g.normen.filter((x) => x.id !== n.id && !x.weggefallen && x.gliederung.join("|") === abschnitt).map((x) => ref(g, x))
    : [];

  const { text: _t, verweise: _v, ...rest } = n;
  return {
    gesetz: gesetzInfo(g),
    norm: rest,
    erlaeuterung: erlaeuterungen(g.id)[n.id],
    verweistAuf,
    erwaehntIn,
    gleicherAbschnitt,
  };
}

// --- Stichwortverzeichnis (kuratiert, data/stichworte.json) ---
let stichwortCache: { begriff: string; re: RegExp; ziele: string[] }[] | null = null;

function stichwortListe() {
  if (stichwortCache) return stichwortCache;
  const roh = JSON.parse(fs.readFileSync(path.join(DATEN, "stichworte.json"), "utf8")) as Record<string, string[] | string>;
  const liste: { begriff: string; re: RegExp; ziele: string[] }[] = [];
  for (const [schluessel, ziele] of Object.entries(roh)) {
    if (schluessel.startsWith("_") || !Array.isArray(ziele)) continue;
    for (const begriff of schluessel.split("|")) {
      const esc = begriff.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      liste.push({ begriff, re: new RegExp(`(^|[^a-zäöüß0-9])${esc}([^a-zäöüß0-9]|$)`, "i"), ziele });
    }
  }
  // Längere (spezifischere) Begriffe zuerst
  stichwortCache = liste.sort((a, b) => b.begriff.length - a.begriff.length);
  return stichwortCache;
}

/** Treffer aus dem Stichwortverzeichnis – zuverlässig, weil von Hand zugeordnet. */
export function stichwortSuche(anfrage: string): { refs: NormRef[]; begriffe: string[] } {
  const refs: NormRef[] = [];
  const begriffe: string[] = [];
  const gesehen = new Set<string>();
  for (const s of stichwortListe()) {
    if (!s.re.test(anfrage)) continue;
    // Ein kürzerer Begriff, der im längeren steckt ("denkmal" in "umgebung eines denkmals"), zählt nicht extra.
    if (begriffe.some((b) => b.includes(s.begriff))) continue;
    begriffe.push(s.begriff);
    for (const ziel of s.ziele) {
      const [gid, nid] = ziel.split(":");
      const g = alleGesetze().get(gid);
      const n = g?.normen.find((x) => x.id === nid);
      if (!g || !n || gesehen.has(ziel)) continue;
      gesehen.add(ziel);
      refs.push(ref(g, n));
    }
  }
  return { refs, begriffe };
}

/** Einfache Volltextsuche über Titel und Text (ohne KI). */
export function suche(anfrage: string, max = 6): NormRef[] {
  const woerter = anfrage
    .toLowerCase()
    .split(/[^a-zäöüß0-9-]+/)
    .filter((w) => w.length >= 4 && !STOPP.has(w));
  if (!woerter.length) return [];
  const treffer: { r: NormRef; score: number }[] = [];
  for (const g of alleGesetze().values()) {
    for (const n of g.normen) {
      if (n.weggefallen) continue;
      const titel = n.titel.toLowerCase();
      const text = n.text.toLowerCase();
      let score = 0;
      for (const w of woerter) {
        const stamm = w.length > 6 ? w.slice(0, -2) : w;
        if (titel.includes(stamm)) score += 6;
        const vorkommen = text.split(stamm).length - 1;
        score += Math.min(vorkommen, 5);
      }
      if (score > 0) treffer.push({ r: ref(g, n), score });
    }
  }
  return treffer.sort((a, b) => b.score - a.score).slice(0, max).map((t) => t.r);
}

const STOPP = new Set([
  "brauche", "bitte", "habe", "haben", "einen", "einer", "eines", "dort", "steht", "muss", "soll", "kann",
  "wird", "werden", "nach", "über", "unter", "welche", "welcher", "welches", "paragraph", "paragraf", "gesetz",
  "zeig", "zeige", "mir", "auch", "oder", "und", "dass", "wenn", "darf", "dürfen", "eine", "der", "die", "das",
  "wie", "was", "wer", "gibt", "geben", "sich", "mein", "meine", "meinem", "meinen", "ich", "wir", "ihr",
]);
