// Statische Online-Version (GitHub Pages): Es gibt keinen Server. Die Daten liegen als JSON neben der Seite
// (public/daten, von scripts/pages-bauen.mjs aus data/ erzeugt) und der Lotse läuft direkt im Browser – mit genau
// demselben Code wie auf dem Server.
//
// Damit die Seite schnell bleibt, auch wenn weitere Regelwerke dazukommen, wird in Stufen geladen:
//   index.json                       sofort: alle Regelwerke mit Titel, Gliederung und Verweisen je Vorschrift (klein)
//   wortlaut/<gesetz>/<id>.json      erst, wenn eine Vorschrift angezeigt wird
//   erlaeuterungen/<gesetz>.json     erst, wenn die erste Vorschrift dieses Gesetzes angezeigt wird
//   suche.json                       erst bei einer Freitextsuche
// Alles Geladene bleibt für die Sitzung im Speicher.
import { bearbeite, type Anfrage } from "./anfrage";
import { setzeDatenquelle } from "./gesetze";
import type { Antwort, Erlaeuterung, Gesetz, TextKnoten } from "./typen";

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

/** Lädt die Kurzfassung einmal (beim ersten Aufruf) und meldet sie als Datenquelle an. */
export function ladeDaten(): Promise<void> {
  bereit ??= (async () => {
    const basis = `${process.env.NEXT_PUBLIC_BASIS ?? ""}/daten`;
    const [index, stichworte] = await Promise.all([
      json<{ gesetze: Gesetz[]; erlaeuterungen?: string[] }>(`${basis}/index.json`),
      json<Record<string, string[] | string>>(`${basis}/stichworte.json`, {}),
    ]);
    const erlaeuterungen = new Map<string, () => Promise<Record<string, Erlaeuterung>>>();
    const wortlaute = new Map<string, () => Promise<{ inhalt: TextKnoten[]; fussnoten?: string }>>();
    const suchtexte = einmal(() => json<Record<string, string>>(`${basis}/suche.json`));
    setzeDatenquelle({
      gesetze: () => index.gesetze,
      stichworte: () => stichworte,
      erlaeuterungen: (id) => {
        if (index.erlaeuterungen && !index.erlaeuterungen.includes(id)) return {};
        if (!erlaeuterungen.has(id)) erlaeuterungen.set(id, einmal(() => json<Record<string, Erlaeuterung>>(`${basis}/erlaeuterungen/${id}.json`, {})));
        return erlaeuterungen.get(id)!();
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
