// Gemeinsamer, vorsichtiger Abruf externer Dienste: Zeitlimit, Zwischenspeicher, klare Fehler.
// Die Fehlermeldungen sagen, was vermutlich los ist (Wartung oder Störung beim Anbieter, Überlastung, eigene
// Internetverbindung, ungültiges Zertifikat), damit niemand an der eigenen Eingabe zweifelt.

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

/** Fehler, der meist von selbst wieder verschwindet: mit der Bitte, es später noch einmal zu versuchen */
const voruebergehend = (de: string, en: string) => new DienstFehler(`${de}. Bitte später erneut versuchen`, `${en}. Please try again later`);

/** Manche Anbieter schicken bei Wartung eine Hinweisseite (oft mit HTTP 200) statt der Daten. */
const WARTUNG = /wartung|maintenance|nicht verf(ü|ue)gbar|vor(ü|ue)bergehend|temporarily unavailable|service unavailable/i;
const istWebseite = (text: string, typ: string | null) => {
  const anfang = text.slice(0, 2000);
  return /^\s*﻿?\s*(<!doctype html|<html)/i.test(anfang) || (/text\/html/i.test(typ ?? "") && /<(html|body|frameset)[\s>]/i.test(anfang));
};
function keineDaten(text: string): DienstFehler {
  const titel = /<title>([^<]*)<\/title>/i.exec(text)?.[1] ?? "";
  if (WARTUNG.test(titel) || WARTUNG.test(text.slice(0, 4000)))
    return voruebergehend(
      "Der Anbieter meldet Wartungsarbeiten und liefert solange keine Daten",
      "The provider reports maintenance and returns no data until it is finished",
    );
  return voruebergehend(
    "Der Anbieter liefert gerade keine Daten, sondern eine Webseite (meist Wartung oder Störung beim Anbieter)",
    "The provider currently returns a web page instead of data (usually maintenance or an outage at the provider)",
  );
}

/** Fehlerbericht eines Geodienstes (OGC ExceptionReport) statt Daten, z. B. wenn beim Anbieter die Datenbank nicht bereit ist */
export function meldetFehler(detail: string): DienstFehler {
  const text = detail
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
  const kurz = text.length > 110 ? `${text.slice(0, 110).replace(/\s+\S*$/, "")} …` : text;
  return voruebergehend(
    `Der Dienst meldet einen internen Fehler beim Anbieter${kurz ? ` (Meldung: „${kurz}“)` : ""}`,
    `The service reports an internal error at the provider${kurz ? ` (message: “${kurz}”)` : ""}`,
  );
}
const istFehlerbericht = (text: string) => /<(\w+:)?(ExceptionReport|ServiceExceptionReport)[\s>]/i.test(text.slice(0, 2000));
const fehlerberichtText = (text: string) => /<(?:\w+:)?(?:ExceptionText|ServiceException)(?:\s[^>]*)?>([\s\S]*?)<\//i.exec(text)?.[1] ?? "";

function httpFehler(status: number): DienstFehler {
  if (status === 429) return voruebergehend(`Der Dienst ist gerade überlastet (HTTP ${status})`, `The service is currently overloaded (HTTP ${status})`);
  if (status >= 500)
    return voruebergehend(
      `Der Dienst ist vorübergehend gestört (HTTP ${status}, meist Wartung oder Überlastung beim Anbieter)`,
      `The service is temporarily disrupted (HTTP ${status}, usually maintenance or overload at the provider)`,
    );
  return new DienstFehler(`Der Dienst antwortet mit einem Fehler (HTTP ${status})`, `The service responded with an error (HTTP ${status})`);
}

/**
 * Warum ist die Verbindung gescheitert? Im Browser verrät der Fehler selbst aus Sicherheitsgründen nichts („Failed to fetch“).
 * Deshalb wird nachgesehen: Ist das Gerät online? Antwortet der Server überhaupt? Eine Anfrage ohne Datenfreigabe
 * (mode "no-cors") gelingt auch dann, wenn der Server nur eine Hinweisseite ohne Freigabe für fremde Webseiten schickt,
 * wie es bei Wartungsseiten üblich ist.
 */
async function verbindungsFehler(e: unknown, url: string): Promise<DienstFehler> {
  const fehler = e as Error & { cause?: { code?: string } };
  if (fehler.name === "TimeoutError")
    return voruebergehend(
      "Der Dienst hat nicht rechtzeitig geantwortet (meist Überlastung oder Störung beim Anbieter)",
      "The service did not respond in time (usually overload or an outage at the provider)",
    );
  if (typeof window !== "undefined") {
    if (navigator.onLine === false) return new DienstFehler("Keine Internetverbindung. Bitte die Verbindung prüfen", "No internet connection. Please check your connection");
    try {
      await fetch(url, { mode: "no-cors", signal: AbortSignal.timeout(5000) });
      return voruebergehend(
        "Der Server des Anbieters antwortet, gibt aber gerade keine Daten frei (meist Wartung oder Störung beim Anbieter)",
        "The provider's server responds but currently releases no data (usually maintenance or an outage at the provider)",
      );
    } catch {
      return voruebergehend(
        "Der Server des Anbieters ist nicht erreichbar (Störung beim Anbieter oder im Netz)",
        "The provider's server cannot be reached (outage at the provider or in the network)",
      );
    }
  }
  const code = fehler.cause?.code ?? "";
  if (/CERT|SSL|TLS|SELF_SIGNED|UNABLE_TO_(GET|VERIFY)/i.test(code))
    return new DienstFehler(
      "Das Sicherheitszertifikat des Anbieters ist ungültig, deshalb wird keine Verbindung aufgebaut. Das kann nur der Anbieter beheben",
      "The provider's security certificate is invalid, so no connection is made. Only the provider can fix this",
    );
  return voruebergehend(
    "Der Server des Anbieters ist nicht erreichbar (Störung beim Anbieter oder im Netz)",
    "The provider's server cannot be reached (outage at the provider or in the network)",
  );
}

/** Ruft eine Adresse ab und liest die Antwort als Text; Verbindungs-, HTTP- und Wartungsfehler werden zu DienstFehler. */
async function hole(url: string, zeitlimitMs: number, kopf: Record<string, string>): Promise<{ text: string; typ: string | null }> {
  let res: Response;
  try {
    res = await fetch(url, { headers: kopf, signal: AbortSignal.timeout(zeitlimitMs) });
  } catch (e) {
    throw await verbindungsFehler(e, url);
  }
  if (!res.ok) throw httpFehler(res.status);
  let text: string;
  try {
    text = await res.text();
  } catch (e) {
    const zeit = (e as Error).name === "TimeoutError";
    throw voruebergehend(`Die Antwort des Dienstes kam unvollständig an (${zeit ? "Zeitüberschreitung" : "Verbindung abgebrochen"})`, `The service's response arrived incomplete (${zeit ? "timeout" : "connection dropped"})`);
  }
  const typ = res.headers.get("content-type");
  if (istWebseite(text, typ)) throw keineDaten(text);
  return { text, typ };
}

export async function holeJson<T>(url: string, zeitlimitMs = 9000): Promise<T> {
  const treffer = ZWISCHENSPEICHER.get(url);
  if (treffer && treffer.bis > Date.now()) return treffer.wert as T;
  // Im Browser (statische Online-Version) setzt der Browser selbst die Kennung; eine eigene würde dort eine Vorabfrage auslösen.
  const kopf: Record<string, string> = typeof window === "undefined" ? { "User-Agent": KENNUNG, Accept: "application/json" } : { Accept: "application/json" };
  const { text } = await hole(url, zeitlimitMs, kopf);
  let wert: T;
  try {
    wert = JSON.parse(text) as T;
  } catch {
    throw istFehlerbericht(text)
      ? meldetFehler(fehlerberichtText(text))
      : voruebergehend("Die Antwort des Dienstes ist nicht lesbar (keine Daten im erwarteten Format)", "The service's response is not readable (no data in the expected format)");
  }
  ZWISCHENSPEICHER.set(url, { bis: Date.now() + GUELTIG_MS, wert });
  return wert;
}

/** Wie holeJson, aber für Text-Antworten (XML/GML, WMS-GetFeatureInfo) – gleiche Regeln für Zeitlimit, Zwischenspeicher und Kennung. */
export async function holeText(url: string, zeitlimitMs = 9000): Promise<string> {
  const schluessel = `text:${url}`;
  const treffer = ZWISCHENSPEICHER.get(schluessel);
  if (treffer && treffer.bis > Date.now()) return treffer.wert as string;
  const kopf: Record<string, string> = typeof window === "undefined" ? { "User-Agent": KENNUNG } : {};
  const { text } = await hole(url, zeitlimitMs, kopf);
  ZWISCHENSPEICHER.set(schluessel, { bis: Date.now() + GUELTIG_MS, wert: text });
  return text;
}
