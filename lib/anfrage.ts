// Eine Anfrage bearbeiten – gemeinsam für den Server (app/api/frage) und die statische Online-Version.
import { ortsAntwort } from "./ort";
import { alsSprache, type Sprache, zweisprachig } from "./sprache";
import type { Antwort } from "./typen";
import { beantworte } from "./verstehen";
import { landNamens, STANDARD_LAND } from "./laender";

export interface Anfrage {
  text?: string;
  /** Strukturierte Ortsauskunft aus dem Formular (ohne Textverständnis) */
  adresse?: { strasse?: string; hausnummer?: string; plz?: string; ort?: string };
  /** Sprache der Antworttexte (der Gesetzestext bleibt deutsch) */
  sprache?: Sprache;
  /** gewähltes Bundesland: bestimmt, welche Landesgesetze gemeint sind ("Bauordnung", Stichworte, Suche) */
  land?: string;
}

/** Feld aus einer fremden Anfrage als Text (Zahlen erlaubt, alles andere leer) – schützt vor kaputten Eingaben */
const feld = (x: unknown): string => (typeof x === "string" ? x : typeof x === "number" ? String(x) : "");

export async function bearbeite(eingang: Anfrage): Promise<{ antworten: Antwort[]; status: number }> {
  const anfrage: Anfrage = eingang && typeof eingang === "object" && !Array.isArray(eingang) ? eingang : {};
  const sprache = alsSprache(anfrage.sprache);
  const land = landNamens(feld(anfrage.land))?.name ?? STANDARD_LAND;
  const t = zweisprachig(sprache);
  if (anfrage.adresse) {
    const a = typeof anfrage.adresse === "object" ? anfrage.adresse : {};
    const strasse = feld(a.strasse).trim().slice(0, 120);
    const hausnummer = feld(a.hausnummer).trim().slice(0, 12);
    const plz = feld(a.plz).trim();
    const ort = feld(a.ort).trim().slice(0, 80);
    if (!strasse || !hausnummer) return { antworten: [{ art: "fehler", text: t("Bitte Straße und Hausnummer angeben.", "Please enter street and house number.") }], status: 400 };
    if (plz && !/^\d{5}$/.test(plz)) return { antworten: [{ art: "fehler", text: t("Eine Postleitzahl hat fünf Ziffern.", "A German postcode has five digits.") }], status: 400 };
    return { antworten: [await ortsAntwort({ strasse, hausnummer, plz: plz || undefined, ort: ort || undefined }, "", sprache)], status: 200 };
  }
  const text = typeof anfrage.text === "string" ? anfrage.text.trim() : "";
  if (!text || text.length > 2000) {
    return { antworten: [{ art: "fehler", text: t("Bitte eine Frage eingeben (max. 2000 Zeichen).", "Please enter a question (max. 2000 characters).") }], status: 400 };
  }
  const antworten = await beantworte(text, sprache, land);
  // Sicherheitsnetz: nie eine leere Antwort (die Oberfläche zeigte sonst einen leeren Kasten)
  if (!antworten.length) {
    return { antworten: [{ art: "fehler", text: t("Dazu wurde nichts gefunden. Bitte anders formulieren.", "Nothing was found for this. Please rephrase.") }], status: 200 };
  }
  return { antworten, status: 200 };
}
