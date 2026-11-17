// Die "Bibliothek": lädt die importierten Gesetze und beantwortet Abrufe.
// Wichtig: Hier wird kein Text erzeugt – alles stammt 1:1 aus data/gesetze/*.json.
// Woher die Dateien kommen, regelt die Datenquelle: auf dem Server das Dateisystem (lib/daten-server.ts),
// in der statischen Online-Version (GitHub Pages) der Browser (lib/daten-browser.ts).
import { regelwerk } from "./regelwerke";
import type { Erlaeuterung, Gesetz, GesetzInfo, Norm, NormAnsicht, NormRef } from "./typen";

export interface Datenquelle {
  /** Alle Gesetze. Dieselbe Liste (gleiche Referenz), solange sich nichts geändert hat. */
  gesetze(): Gesetz[];
  /** Fest gespeicherte Erläuterungen eines Gesetzes, nach Norm-ID. */
  erlaeuterungen(gesetzId: string): Record<string, Erlaeuterung>;
  /** Kuratiertes Stichwortverzeichnis (data/stichworte.json). */
  stichworte(): Record<string, string[] | string>;
}

let quelle: Datenquelle | null = null;

export function setzeDatenquelle(q: Datenquelle) {
  quelle = q;
}

function daten(): Datenquelle {
  if (!quelle) throw new Error("Keine Datenquelle gesetzt (lib/daten-server.ts oder lib/daten-browser.ts laden).");
  return quelle;
}

let cache: Map<string, Gesetz> | null = null;
let cacheVon: Gesetz[] | null = null;

export function alleGesetze(): Map<string, Gesetz> {
  const liste = daten().gesetze();
  if (cache && liste === cacheVon) return cache;
  // Feste Reihenfolge (lib/regelwerke.ts): Gesetze zuerst, dann Musterbauordnung und VOB
  const geordnet = [...liste].sort((a, b) => regelwerk(a.id).reihenfolge - regelwerk(b.id).reihenfolge);
  cache = new Map(geordnet.map((g) => [g.id, g]));
  cacheVon = liste;
  return cache;
}

function erlaeuterungen(gesetzId: string): Record<string, Erlaeuterung> {
  return daten().erlaeuterungen(gesetzId);
}

export function gesetzInfo(g: Gesetz): GesetzInfo {
  const m = regelwerk(g.id);
  return {
    art: m.art,
    artText: m.artText,
    gruppe: m.gruppe,
    kurztitel: m.kurztitel.de ? m.kurztitel : { de: g.titel, en: g.titel },
    wortlaut: m.wortlaut,
    ...(m.hinweis ? { hinweis: m.hinweis } : {}),
    ...(m.nurVerzeichnis ? { nurVerzeichnis: true } : {}),
    ...(m.imKopf ? { imKopf: true } : {}),
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
let stichwortVon: unknown = null;

function stichwortListe() {
  const roh = daten().stichworte();
  if (stichwortCache && roh === stichwortVon) return stichwortCache;
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
  stichwortVon = roh;
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
