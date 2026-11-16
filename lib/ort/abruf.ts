// Gemeinsamer, vorsichtiger Abruf externer Dienste: Zeitlimit, Zwischenspeicher, klare Fehler.

const ZWISCHENSPEICHER = new Map<string, { bis: number; wert: unknown }>();
const GUELTIG_MS = 10 * 60 * 1000;
// Generische Kennung – keine personenbezogenen Daten an externe Dienste.
const KENNUNG = "Ortsauskunft-Prototyp/0.1";

export class DienstFehler extends Error {}

export async function holeJson<T>(url: string, zeitlimitMs = 9000): Promise<T> {
  const treffer = ZWISCHENSPEICHER.get(url);
  if (treffer && treffer.bis > Date.now()) return treffer.wert as T;
  let res: Response;
  try {
    res = await fetch(url, { headers: { "User-Agent": KENNUNG, Accept: "application/json" }, signal: AbortSignal.timeout(zeitlimitMs) });
  } catch (e) {
    throw new DienstFehler(`Dienst nicht erreichbar (${(e as Error).name === "TimeoutError" ? "Zeitüberschreitung" : "Netzwerkfehler"})`);
  }
  if (!res.ok) throw new DienstFehler(`Dienst antwortet mit HTTP ${res.status}`);
  const wert = (await res.json()) as T;
  ZWISCHENSPEICHER.set(url, { bis: Date.now() + GUELTIG_MS, wert });
  return wert;
}
