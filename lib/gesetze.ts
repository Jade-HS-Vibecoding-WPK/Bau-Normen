// Die "Bibliothek": lädt die importierten Gesetze und beantwortet Abrufe.
// Wichtig: Hier wird kein Text erzeugt – alles stammt 1:1 aus data/gesetze/*.json.
// Woher die Dateien kommen, regelt die Datenquelle: auf dem Server das Dateisystem (lib/daten-server.ts),
// in der statischen Online-Version (GitHub Pages) der Browser (lib/daten-browser.ts).
//
// Damit die App auch mit vielen Regelwerken schnell bleibt:
// - Was sich aus den Daten ableiten lässt (Norm nach ID, „wird erwähnt in“, gleicher Abschnitt, Suchtexte),
//   wird einmal je Datenstand berechnet und nicht bei jeder Anfrage.
// - Die Online-Version lädt anfangs nur eine Kurzfassung (Titel, Gliederung, Verweise). Den Wortlaut einer
//   Vorschrift, die Erläuterungen eines Gesetzes und die Suchtexte holt sie erst, wenn sie gebraucht werden.
import { LAENDER, landNamens, STANDARD_LAND } from "./laender";
import { regelwerk } from "./regelwerke";
import type { Erlaeuterung, Gesetz, GesetzInfo, Norm, NormAnsicht, NormRef, TextKnoten } from "./typen";

export interface Datenquelle {
  /** Alle Gesetze. Dieselbe Liste (gleiche Referenz), solange sich nichts geändert hat.
   *  In der Online-Version fehlen "inhalt", "text" und "fussnoten" (Kurzfassung) – siehe wortlaut() und suchtexte(). */
  gesetze(): Gesetz[];
  /** Fest gespeicherte Erläuterungen eines Gesetzes, nach Norm-ID. */
  erlaeuterungen(gesetzId: string): Record<string, Erlaeuterung> | Promise<Record<string, Erlaeuterung>>;
  /** Kuratiertes Stichwortverzeichnis (data/stichworte.json). */
  stichworte(): Record<string, string[] | string>;
  /** Gegenstücke je Landesgesetz (data/gegenstuecke/*.json): Thema -> Vorschriften */
  gegenstuecke(): Record<string, Gegenstuecke>;
  /** Online-Version: Gliederung, Verweise und Adressen der Vorschriften eines Gesetzes nachladen
   *  (danach liefert gesetze() eine neue Liste mit dem vollständigen Gesetz). */
  details?(gesetzId: string): Promise<void>;
  /** Wortlaut einer Vorschrift nachladen, wenn gesetze() nur die Kurzfassung liefert. */
  wortlaut?(gesetzId: string, normId: string): Promise<{ inhalt: TextKnoten[]; fussnoten?: string }>;
  /** Suchtexte eines Gesetzes (Norm-ID -> Text in Kleinbuchstaben) nachladen, wenn gesetze() keinen "text" liefert. */
  suchtexte?(gesetzId: string): Promise<Record<string, string>>;
}

export interface Gegenstuecke {
  gesetz: string;
  themen: Record<string, string[]>;
  schutzOhneEintragung?: boolean | null;
  belege?: Record<string, { norm: string; satz: string }>;
  hinweise?: string[];
}

export const gegenstuecke = (gesetzId: string): Gegenstuecke | undefined => daten().gegenstuecke()[gesetzId];

/**
 * Bereich einer Anfrage: Bundesrecht, Musterbauordnung und VOB gelten überall; von den Landesgesetzen nur die
 * des gewählten Landes. So bleiben Rückfragen, Stichwort- und Volltexttreffer übersichtlich, auch mit 16 Ländern.
 */
export function imBereich(gesetzId: string, land: string = STANDARD_LAND): boolean {
  const l = LAENDER.find((x) => x.bauordnung === gesetzId || x.denkmalschutz === gesetzId);
  return !l || l.name === land;
}

/** Bauordnung bzw. Denkmalschutzgesetz eines Landes, sofern importiert */
export function landesgesetz(land: string, art: "bauordnung" | "denkmalschutz"): Gesetz | undefined {
  const l = landNamens(land);
  return l ? alleGesetze().get(l[art]) : undefined;
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

// --- Einmal je Gesetz (und Datenstand) abgeleitete Strukturen ---
interface Abgeleitet {
  info: GesetzInfo;
  nachId: Map<string, Norm>;
  /** Norm-ID -> Vorschriften, die auf sie verweisen (in Gesetzesreihenfolge) */
  erwaehntIn: Map<string, Norm[]>;
  /** Gliederungsschlüssel -> Vorschriften in diesem Abschnitt */
  abschnitte: Map<string, Norm[]>;
}
const abgeleitetCache = new WeakMap<Gesetz, Abgeleitet>();

function abgeleitet(g: Gesetz): Abgeleitet {
  const vorhanden = abgeleitetCache.get(g);
  if (vorhanden) return vorhanden;
  const nachId = new Map(g.normen.map((n) => [n.id, n]));
  const erwaehntIn = new Map<string, Norm[]>();
  const abschnitte = new Map<string, Norm[]>();
  for (const n of g.normen) {
    for (const v of new Set(n.verweise ?? [])) if (v !== n.id) (erwaehntIn.get(v) ?? erwaehntIn.set(v, []).get(v)!).push(n);
    const k = (n.gliederung ?? []).join("|");
    if (k) (abschnitte.get(k) ?? abschnitte.set(k, []).get(k)!).push(n);
  }
  const a = { info: berechneInfo(g), nachId, erwaehntIn, abschnitte };
  abgeleitetCache.set(g, a);
  return a;
}

function berechneInfo(g: Gesetz): GesetzInfo {
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
    ...(m.land ? { land: m.land } : {}),
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

export const gesetzInfo = (g: Gesetz): GesetzInfo => abgeleitet(g).info;

export function gesetzListe(): GesetzInfo[] {
  return [...alleGesetze().values()].map(gesetzInfo);
}

export function findeNorm(gesetzId: string, normId: string): Norm | undefined {
  const g = alleGesetze().get(gesetzId);
  return g ? abgeleitet(g).nachId.get(normId) : undefined;
}

const ref = (g: Gesetz, n: Norm): NormRef => ({ gesetz: g.kurz, id: n.id, bez: n.bez, titel: n.titel });

export async function normAnsicht(gesetzId: string, normId: string): Promise<NormAnsicht | undefined> {
  if (!alleGesetze().has(gesetzId)) return undefined;
  await daten().details?.(gesetzId);
  const g = alleGesetze().get(gesetzId);
  if (!g) return undefined;
  const a = abgeleitet(g);
  const n = a.nachId.get(normId);
  if (!n) return undefined;

  // Wortlaut: auf dem Server schon vorhanden, in der Online-Version bei Bedarf nachladen
  let inhalt = n.inhalt;
  let fussnoten = n.fussnoten;
  const q = daten();
  const [nachgeladen, erl] = await Promise.all([inhalt || !q.wortlaut ? null : q.wortlaut(g.id, n.id), q.erlaeuterungen(g.id)]);
  if (nachgeladen) ({ inhalt, fussnoten } = nachgeladen);

  const verweistAuf = (n.verweise ?? []).map((id) => a.nachId.get(id)).filter((x): x is Norm => !!x && x.id !== n.id).map((x) => ref(g, x));
  const erwaehntIn = (a.erwaehntIn.get(n.id) ?? []).map((x) => ref(g, x));
  const abschnitt = (n.gliederung ?? []).join("|");
  const gleicherAbschnitt = abschnitt ? (a.abschnitte.get(abschnitt) ?? []).filter((x) => x.id !== n.id && !x.weggefallen).map((x) => ref(g, x)) : [];

  const { text: _t, verweise: _v, inhalt: _i, fussnoten: _f, ...rest } = n;
  return {
    gesetz: a.info,
    norm: { ...rest, gliederung: n.gliederung ?? [], url: n.url ?? g.quelle.url, inhalt: inhalt ?? [], ...(fussnoten ? { fussnoten } : {}) },
    erlaeuterung: erl[n.id],
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

/**
 * Ziele eines Stichworts auflösen. "nbauo:5" zeigt direkt auf eine Vorschrift; "@bauordnung:abstandsflaechen" bzw.
 * "@denkmalschutz:umgebungsschutz" auf das Thema in der Bauordnung bzw. dem Denkmalschutzgesetz des gewählten Landes
 * (laut data/gegenstuecke). Vorschriften außerhalb des Bereichs (andere Länder) fallen weg.
 */
function zielAufloesen(ziel: string, land: string, explizit: Set<string>): string[] {
  const platzhalter = ziel.match(/^@(bauordnung|denkmalschutz):(.+)$/);
  if (platzhalter) {
    const g = landesgesetz(land, platzhalter[1] as "bauordnung" | "denkmalschutz");
    // steht das Landesgesetz schon ausdrücklich in der Liste (von Hand zugeordnet), gilt diese Zuordnung
    if (!g || explizit.has(g.id)) return [];
    return (gegenstuecke(g.id)?.themen[platzhalter[2]] ?? []).map((id) => `${g.id}:${id}`);
  }
  return imBereich(ziel.split(":")[0], land) ? [ziel] : [];
}

/** Treffer aus dem Stichwortverzeichnis – zuverlässig, weil von Hand zugeordnet. */
export function stichwortSuche(anfrage: string, land: string = STANDARD_LAND): { refs: NormRef[]; begriffe: string[] } {
  const refs: NormRef[] = [];
  const begriffe: string[] = [];
  const gesehen = new Set<string>();
  for (const s of stichwortListe()) {
    if (!s.re.test(anfrage)) continue;
    // Ein kürzerer Begriff, der im längeren steckt ("denkmal" in "umgebung eines denkmals"), zählt nicht extra.
    if (begriffe.some((b) => b.includes(s.begriff))) continue;
    begriffe.push(s.begriff);
    const explizit = new Set(s.ziele.filter((z) => !z.startsWith("@")).map((z) => z.split(":")[0]));
    // Geltendes Recht vor dem Muster: die Bauordnung des Landes steht vor der Musterbauordnung
    const ziele = s.ziele.flatMap((z) => zielAufloesen(z, land, explizit));
    const sortiert = [...ziele.filter((z) => regelwerk(z.split(":")[0]).art !== "muster"), ...ziele.filter((z) => regelwerk(z.split(":")[0]).art === "muster")];
    for (const ziel of sortiert) {
      const [gid, nid] = ziel.split(":");
      const g = alleGesetze().get(gid);
      const n = g && abgeleitet(g).nachId.get(nid);
      if (!g || !n || gesehen.has(ziel)) continue;
      gesehen.add(ziel);
      refs.push(ref(g, n));
    }
  }
  return { refs, begriffe };
}

// --- Volltextsuche: Titel und Texte je Gesetz einmal in Kleinbuchstaben vorbereiten ---
type SuchEintrag = { r: NormRef; titel: string; text: string };
const suchCache = new WeakMap<Gesetz, SuchEintrag[]>();
const suchLaden = new Map<string, Promise<Record<string, string>>>();

async function suchEintraegeVon(g: Gesetz): Promise<SuchEintrag[]> {
  const vorhanden = suchCache.get(g);
  if (vorhanden) return vorhanden;
  const q = daten();
  // Online-Version: Suchtexte stehen je Gesetz in einer eigenen Datei und werden nur für die Volltextsuche geladen
  let texte: Record<string, string> | null = null;
  if (g.normen.some((n) => n.text === undefined) && q.suchtexte) {
    if (!suchLaden.has(g.id)) suchLaden.set(g.id, q.suchtexte(g.id));
    texte = await suchLaden.get(g.id)!;
  }
  const eintraege = g.normen
    .filter((n) => !n.weggefallen)
    .map((n) => ({ r: ref(g, n), titel: n.titel.toLowerCase(), text: (n.text ?? texte?.[n.id] ?? "").toLowerCase() }));
  suchCache.set(g, eintraege);
  return eintraege;
}

/** Wie oft kommt "teil" in "text" vor (höchstens "max")? – ohne Zwischenlisten */
function vorkommen(text: string, teil: string, max: number): number {
  let n = 0;
  for (let i = text.indexOf(teil); i !== -1 && n < max; i = text.indexOf(teil, i + teil.length)) n++;
  return n;
}

/** Einfache Volltextsuche über Titel und Text (ohne KI) – im Bereich des gewählten Landes. */
export async function suche(anfrage: string, max = 6, land: string = STANDARD_LAND): Promise<NormRef[]> {
  const woerter = anfrage
    .toLowerCase()
    .split(/[^a-zäöüß0-9-]+/)
    .filter((w) => w.length >= 4 && !STOPP.has(w));
  if (!woerter.length) return [];
  const staemme = woerter.map((w) => (w.length > 6 ? w.slice(0, -2) : w));
  const treffer: { r: NormRef; score: number }[] = [];
  const gesetze = [...alleGesetze().values()].filter((g) => imBereich(g.id, land));
  const alle = (await Promise.all(gesetze.map(suchEintraegeVon))).flat();
  for (const e of alle) {
    let score = 0;
    for (const stamm of staemme) {
      if (e.titel.includes(stamm)) score += 6;
      score += vorkommen(e.text, stamm, 5);
    }
    if (score > 0) treffer.push({ r: e.r, score });
  }
  return treffer.sort((a, b) => b.score - a.score).slice(0, max).map((t) => t.r);
}

const STOPP = new Set([
  "brauche", "bitte", "habe", "haben", "einen", "einer", "eines", "dort", "steht", "muss", "soll", "kann",
  "wird", "werden", "nach", "über", "unter", "welche", "welcher", "welches", "paragraph", "paragraf", "gesetz",
  "zeig", "zeige", "mir", "auch", "oder", "und", "dass", "wenn", "darf", "dürfen", "eine", "der", "die", "das",
  "wie", "was", "wer", "gibt", "geben", "sich", "mein", "meine", "meinem", "meinen", "ich", "wir", "ihr",
]);
