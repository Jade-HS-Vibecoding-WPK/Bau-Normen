// Eine Anfrage bearbeiten – gemeinsam für den Server (app/api/frage) und die statische Online-Version.
import { ortsauskunft } from "./ort";
import { alsSprache, type Sprache, zweisprachig } from "./sprache";
import type { Antwort } from "./typen";
import { beantworte } from "./verstehen";

export interface Anfrage {
  text?: string;
  /** Strukturierte Ortsauskunft aus dem Formular (ohne Textverständnis) */
  adresse?: { strasse?: string; hausnummer?: string };
  /** Sprache der Antworttexte (der Gesetzestext bleibt deutsch) */
  sprache?: Sprache;
}

export async function bearbeite(anfrage: Anfrage): Promise<{ antworten: Antwort[]; status: number }> {
  const sprache = alsSprache(anfrage.sprache);
  const t = zweisprachig(sprache);
  if (anfrage.adresse) {
    const strasse = (anfrage.adresse.strasse ?? "").trim().slice(0, 120);
    const hausnummer = (anfrage.adresse.hausnummer ?? "").trim().slice(0, 12);
    if (!strasse || !hausnummer) return { antworten: [{ art: "fehler", text: t("Bitte Straße und Hausnummer angeben.", "Please enter street and house number.") }], status: 400 };
    return { antworten: [{ art: "ort", ort: await ortsauskunft(strasse, hausnummer, "", sprache) }], status: 200 };
  }
  const text = anfrage.text;
  if (!text || typeof text !== "string" || text.length > 2000) {
    return { antworten: [{ art: "fehler", text: t("Bitte eine Frage eingeben (max. 2000 Zeichen).", "Please enter a question (max. 2000 characters).") }], status: 400 };
  }
  return { antworten: await beantworte(text, sprache), status: 200 };
}
