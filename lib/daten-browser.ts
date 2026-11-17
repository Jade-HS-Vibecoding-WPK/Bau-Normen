// Statische Online-Version (GitHub Pages): Es gibt keinen Server. Die Gesetzesdaten liegen als JSON neben der Seite
// (public/daten, beim Bauen aus data/ kopiert) und der Lotse läuft direkt im Browser – mit genau demselben Code.
import { bearbeite, type Anfrage } from "./anfrage";
import { setzeDatenquelle } from "./gesetze";
import type { Antwort, Erlaeuterung, Gesetz } from "./typen";

let bereit: Promise<void> | null = null;

async function json<T>(url: string, ersatz?: T): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) {
    if (ersatz !== undefined) return ersatz;
    throw new Error(`${url}: HTTP ${res.status}`);
  }
  return (await res.json()) as T;
}

/** Lädt die Daten einmal (beim ersten Aufruf) und meldet sie als Datenquelle an. */
export function ladeDaten(gesetzIds: string[]): Promise<void> {
  bereit ??= (async () => {
    const basis = `${process.env.NEXT_PUBLIC_BASIS ?? ""}/daten`;
    const [gesetze, erl, stichworte] = await Promise.all([
      Promise.all(gesetzIds.map((id) => json<Gesetz>(`${basis}/gesetze/${id}.json`))),
      Promise.all(gesetzIds.map((id) => json<Record<string, Erlaeuterung>>(`${basis}/erlaeuterungen/${id}.json`, {}))),
      json<Record<string, string[] | string>>(`${basis}/stichworte.json`, {}),
    ]);
    const erlNachId = new Map(gesetzIds.map((id, i) => [id, erl[i]]));
    setzeDatenquelle({ gesetze: () => gesetze, erlaeuterungen: (id) => erlNachId.get(id) ?? {}, stichworte: () => stichworte });
  })().catch((e) => {
    bereit = null; // beim nächsten Versuch erneut laden
    throw e;
  });
  return bereit;
}

export async function beantworteImBrowser(anfrage: Anfrage, gesetzIds: string[]): Promise<Antwort[]> {
  await ladeDaten(gesetzIds);
  return (await bearbeite(anfrage)).antworten;
}
