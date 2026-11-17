// Gemeinsamer, vorsichtiger Abruf externer Dienste: Zeitlimit, Zwischenspeicher, klare Fehler.

const ZWISCHENSPEICHER = new Map<string, { bis: number; wert: unknown }>();
const GUELTIG_MS = 10 * 60 * 1000;
// Generische Kennung – keine personenbezogenen Daten an externe Dienste.
const KENNUNG = "Ortsauskunft-Prototyp/0.1";

export class DienstFehler extends Error {
  /** dieselbe Meldung auf Englisch */
  constructor(
    de: string,
    readonly en: string,
  ) {
    super(de);
  }
}
/** Fehlermeldung eines Dienstes in der gewünschten Sprache */
export const fehlerText = (e: unknown, sprache: "de" | "en") =>
  e instanceof DienstFehler ? (sprache === "en" ? e.en : e.message) : sprache === "en" ? "unknown error" : "unbekannter Fehler";

export async function holeJson<T>(url: string, zeitlimitMs = 9000): Promise<T> {
  const treffer = ZWISCHENSPEICHER.get(url);
  if (treffer && treffer.bis > Date.now()) return treffer.wert as T;
  let res: Response;
  try {
    // Im Browser (statische Online-Version) setzt der Browser selbst die Kennung; eine eigene würde dort eine Vorabfrage auslösen.
    const kopf: Record<string, string> = typeof window === "undefined" ? { "User-Agent": KENNUNG, Accept: "application/json" } : { Accept: "application/json" };
    res = await fetch(url, { headers: kopf, signal: AbortSignal.timeout(zeitlimitMs) });
  } catch (e) {
    const zeit = (e as Error).name === "TimeoutError";
    throw new DienstFehler(`Dienst nicht erreichbar (${zeit ? "Zeitüberschreitung" : "Netzwerkfehler"})`, `service unreachable (${zeit ? "timeout" : "network error"})`);
  }
  if (!res.ok) throw new DienstFehler(`Dienst antwortet mit HTTP ${res.status}`, `service responded with HTTP ${res.status}`);
  const wert = (await res.json()) as T;
  ZWISCHENSPEICHER.set(url, { bis: Date.now() + GUELTIG_MS, wert });
  return wert;
}

/** Wie holeJson, aber für Text-Antworten (XML/GML, WMS-GetFeatureInfo) – gleiche Regeln für Zeitlimit, Zwischenspeicher und Kennung. */
export async function holeText(url: string, zeitlimitMs = 9000): Promise<string> {
  const schluessel = `text:${url}`;
  const treffer = ZWISCHENSPEICHER.get(schluessel);
  if (treffer && treffer.bis > Date.now()) return treffer.wert as string;
  let res: Response;
  try {
    const kopf: Record<string, string> = typeof window === "undefined" ? { "User-Agent": KENNUNG } : {};
    res = await fetch(url, { headers: kopf, signal: AbortSignal.timeout(zeitlimitMs) });
  } catch (e) {
    const zeit = (e as Error).name === "TimeoutError";
    throw new DienstFehler(`Dienst nicht erreichbar (${zeit ? "Zeitüberschreitung" : "Netzwerkfehler"})`, `service unreachable (${zeit ? "timeout" : "network error"})`);
  }
  if (!res.ok) throw new DienstFehler(`Dienst antwortet mit HTTP ${res.status}`, `service responded with HTTP ${res.status}`);
  let wert: string;
  try {
    wert = await res.text();
  } catch (e) {
    const zeit = (e as Error).name === "TimeoutError";
    throw new DienstFehler(`Antwort unvollständig (${zeit ? "Zeitüberschreitung" : "Netzwerkfehler"})`, `incomplete response (${zeit ? "timeout" : "network error"})`);
  }
  ZWISCHENSPEICHER.set(schluessel, { bis: Date.now() + GUELTIG_MS, wert });
  return wert;
}
