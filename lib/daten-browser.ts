// Statische Online-Version (GitHub Pages): Es gibt keinen Server. Die Daten liegen als JSON neben der Seite
// (public/daten, von scripts/pages-bauen.mjs aus data/ erzeugt) und der Lotse läuft direkt im Browser – mit genau
// demselben Code wie auf dem Server.
//
// Damit die Seite auch mit vielen Regelwerken (Bund + 16 Länder) schnell bleibt, wird in Stufen geladen:
//   katalog.json                     sofort: alle Regelwerke mit Nummer und Titel je Vorschrift, Gegenstücke, Stichworte
//   details/<gesetz>.json            erst, wenn eine Vorschrift dieses Gesetzes angezeigt wird (Gliederung, Verweise, Adressen)
//   wortlaut/<gesetz>/<id>.json      erst, wenn die Vorschrift angezeigt wird
//   erlaeuterungen/<gesetz>.json     erst bei der ersten Vorschrift dieses Gesetzes (nur wo es Erläuterungen gibt)
//   suche/<gesetz>.json              erst bei einer Freitextsuche – und nur für die Gesetze im Bereich des gewählten Landes
// Alles Geladene bleibt für die Sitzung im Speicher.
import { bearbeite, type Anfrage } from "./anfrage";
import { setzeDatenquelle, type Gegenstuecke } from "./gesetze";
import type { Antwort, Erlaeuterung, Gesetz, Norm, TextKnoten } from "./typen";

let bereit: Promise<void> | null = null;

async function json<T>(url: string, ersatz?: T): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) {
    if (ersatz !== undefined) return ersatz;
    throw new Error(`${url}: HTTP ${res.status}`);
  }
  return (await res.json()) as T;
}

/** Merkt sich laufende und fertige Abrufe; ein fehlgeschlagener Abruf wird beim nächsten Mal wiederholt. */
function einmal<T>(laden: () => Promise<T>): () => Promise<T> {
  let p: Promise<T> | null = null;
  return () =>
    (p ??= laden().catch((e) => {
      p = null;
      throw e;
    }));
}

interface Katalog {
  gesetze: Gesetz[];
  erlaeuterungen: string[];
  stichworte: Record<string, string[] | string>;
  gegenstuecke: Record<string, Gegenstuecke>;
}

/** Lädt den Katalog einmal (beim ersten Aufruf) und meldet ihn als Datenquelle an. */
export function ladeDaten(): Promise<void> {
  bereit ??= (async () => {
    const basis = `${process.env.NEXT_PUBLIC_BASIS ?? ""}/daten`;
    const katalog = await json<Katalog>(`${basis}/katalog.json`);
    let liste = katalog.gesetze;
    const proGesetz = <T>(url: (id: string) => string, ersatz?: T) => {
      const m = new Map<string, () => Promise<T>>();
      return (id: string) => {
        if (!m.has(id)) m.set(id, einmal(() => json<T>(url(id), ersatz)));
        return m.get(id)!();
      };
    };
    const erlaeuterungen = proGesetz<Record<string, Erlaeuterung>>((id) => `${basis}/erlaeuterungen/${id}.json`, {});
    const details = proGesetz<Record<string, Pick<Norm, "gliederung" | "verweise" | "url">>>((id) => `${basis}/details/${id}.json`);
    const suchtexte = proGesetz<Record<string, string>>((id) => `${basis}/suche/${id}.json`);
    const wortlaute = new Map<string, () => Promise<{ inhalt: TextKnoten[]; fussnoten?: string }>>();
    setzeDatenquelle({
      gesetze: () => liste,
      stichworte: () => katalog.stichworte,
      gegenstuecke: () => katalog.gegenstuecke,
      erlaeuterungen: (id) => (katalog.erlaeuterungen.includes(id) ? erlaeuterungen(id) : {}),
      details: async (id) => {
        const g = liste.find((x) => x.id === id);
        if (!g || g.normen.every((n) => n.gliederung)) return;
        const d = await details(id);
        // neues Gesetz-Objekt und neue Liste: abgeleitete Zwischenspeicher (Verweise, Abschnitte) werden neu berechnet
        const voll = { ...g, normen: g.normen.map((n) => ({ ...n, ...d[n.id] })) };
        liste = liste.map((x) => (x.id === id ? voll : x));
      },
      wortlaut: (gesetzId, normId) => {
        const k = `${gesetzId}/${normId}`;
        if (!wortlaute.has(k)) wortlaute.set(k, einmal(() => json(`${basis}/wortlaut/${gesetzId}/${encodeURIComponent(normId)}.json`)));
        return wortlaute.get(k)!();
      },
      suchtexte,
    });
  })().catch((e) => {
    bereit = null; // beim nächsten Versuch erneut laden
    throw e;
  });
  return bereit;
}

export async function beantworteImBrowser(anfrage: Anfrage): Promise<Antwort[]> {
  await ladeDaten();
  return (await bearbeite(anfrage)).antworten;
}
