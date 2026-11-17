// Zweisprachigkeit (Deutsch/Englisch) ohne Übersetzungsdienst und ohne KI:
// Jeder Text steht im Code direkt zweisprachig – t("Bebauungsplan", "Development plan").
// Der Gesetzestext und die Erläuterungen bleiben immer im deutschen Original (amtlicher Wortlaut).
export type Sprache = "de" | "en";

export const zweisprachig =
  (sprache: Sprache) =>
  (de: string, en: string): string =>
    sprache === "en" ? en : de;

export const alsSprache = (wert: unknown): Sprache => (wert === "en" ? "en" : "de");

/** Gebietsschema für Datum und Zahlen */
export const gebiet = (sprache: Sprache) => (sprache === "en" ? "en-GB" : "de-DE");
