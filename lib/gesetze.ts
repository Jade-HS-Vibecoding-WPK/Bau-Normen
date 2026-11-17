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
  /** Wortlaut einer Vorschrift nachladen, wenn gesetze() nur die Kurzfassung liefert. */
  wortlaut?(gesetzId: string, normId: string): Promise<{ inhalt: TextKnoten[]; fussnoten?: string }>;
  /** Suchtexte ("gesetz:id" -> Text in Kleinbuchstaben) nachladen, wenn gesetze() keinen "text" liefert. */
  suchtexte?(): Promise<Record<string, string>>;
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
    for (const v of new Set(n.verweise)) if (v !== n.id) (erwaehntIn.get(v) ?? erwaehntIn.set(v, []).get(v)!).push(n);
    const k = n.gliederung.join("|");
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

  const verweistAuf = n.verweise.map((id) => a.nachId.get(id)).filter((x): x is Norm => !!x && x.id !== n.id).map((x) => ref(g, x));
  const erwaehntIn = (a.erwaehntIn.get(n.id) ?? []).map((x) => ref(g, x));
  const abschnitt = n.gliederung.join("|");
  const gleicherAbschnitt = abschnitt ? (a.abschnitte.get(abschnitt) ?? []).filter((x) => x.id !== n.id && !x.weggefallen).map((x) => ref(g, x)) : [];

  const { text: _t, verweise: _v, inhalt: _i, fussnoten: _f, ...rest } = n;
  return {
    gesetz: a.info,
    norm: { ...rest, inhalt: inhalt ?? [], ...(fussnoten ? { fussnoten } : {}) },
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
      const n = g && abgeleitet(g).nachId.get(nid);
      if (!g || !n || gesehen.has(ziel)) continue;
      gesehen.add(ziel);
      refs.push(ref(g, n));
    }
  }
  return { refs, begriffe };
}

// --- Volltextsuche: Titel und Texte einmal je Datenstand in Kleinbuchstaben vorbereiten ---
let suchCache: { von: Gesetz[]; eintraege: { r: NormRef; titel: string; text: string }[] } | null = null;
let suchLaden: Promise<unknown> | null = null;

async function suchEintraege() {
  const liste = daten().gesetze();
  if (suchCache && suchCache.von === liste) return suchCache.eintraege;
  const q = daten();
  // Online-Version: Suchtexte stehen in einer eigenen Datei und werden nur für die Volltextsuche geladen
  const brauchtTexte = liste.some((g) => g.normen.some((n) => n.text === undefined));
  const texte = brauchtTexte && q.suchtexte ? await (suchLaden ??= q.suchtexte()) as Record<string, string> : null;
  const eintraege: { r: NormRef; titel: string; text: string }[] = [];
  for (const g of alleGesetze().values())
    for (const n of g.normen)
      if (!n.weggefallen) eintraege.push({ r: ref(g, n), titel: n.titel.toLowerCase(), text: (n.text ?? texte?.[`${g.id}:${n.id}`] ?? "").toLowerCase() });
  suchCache = { von: liste, eintraege };
  return eintraege;
}

/** Wie oft kommt "teil" in "text" vor (höchstens "max")? – ohne Zwischenlisten */
function vorkommen(text: string, teil: string, max: number): number {
  let n = 0;
  for (let i = text.indexOf(teil); i !== -1 && n < max; i = text.indexOf(teil, i + teil.length)) n++;
  return n;
}

/** Einfache Volltextsuche über Titel und Text (ohne KI). */
export async function suche(anfrage: string, max = 6): Promise<NormRef[]> {
  const woerter = anfrage
    .toLowerCase()
    .split(/[^a-zäöüß0-9-]+/)
    .filter((w) => w.length >= 4 && !STOPP.has(w));
  if (!woerter.length) return [];
  const staemme = woerter.map((w) => (w.length > 6 ? w.slice(0, -2) : w));
  const treffer: { r: NormRef; score: number }[] = [];
  for (const e of await suchEintraege()) {
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
