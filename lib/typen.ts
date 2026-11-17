// Gemeinsame Datentypen für Server und Oberfläche.

/** Ein Stück Gesetzestext. Strings sind wörtlicher Text aus der amtlichen Quelle. */
export type TextKnoten =
  | string
  | { t: "p" | "b" | "i" | "sup" | "sub"; c: TextKnoten[] }
  | { t: "br" }
  | { t: "dl"; items: { dt: string; c: TextKnoten[] }[] }
  | { t: "table"; rows: string[][] }
  | { t: "pre" | "hinweis"; v: string };

export interface Norm {
  id: string;
  bez: string;
  titel: string;
  gliederung: string[];
  weggefallen: boolean;
  inhalt: TextKnoten[];
  text: string;
  fussnoten?: string;
  url: string;
  verweise: string[];
}

export interface Gesetz {
  id: string;
  kurz: string;
  titel: string;
  ebene: string;
  stand: string;
  neufassung?: string;
  quelle: { name: string; url: string; abgerufen: string; xmlStand?: string };
  normen: Norm[];
}

export interface GesetzInfo {
  id: string;
  kurz: string;
  titel: string;
  ebene: string;
  stand: string;
  quelleName: string;
  quelleUrl: string;
  anzahl: number;
  /** Art des Regelwerks (Gesetz, Muster, Vergaberegeln …) – aus lib/regelwerke.ts */
  art: string;
  artText: { de: string; en: string };
  gruppe: { de: string; en: string };
  kurztitel: { de: string; en: string };
  /** Hinweis zur Verbindlichkeit (z. B. „Muster, kein geltendes Recht“) */
  hinweis?: { de: string; en: string };
  /** Herkunft des Wortlauts */
  wortlaut: { de: string; en: string };
  /** Nur Verzeichnis, kein Wortlaut (VOB/C) */
  nurVerzeichnis?: boolean;
  /** Stand im Seitenkopf zeigen */
  imKopf?: boolean;
}

/** Kurzer Verweis auf einen Paragraphen (für Chips/Links). */
export interface NormRef {
  gesetz: string; // z. B. "BauGB"
  id: string;
  bez: string;
  titel: string;
}

export interface Erlaeuterung {
  kurz: string;
  punkte: { titel: string; text: string }[];
  praxis?: string;
  status: "entwurf" | "geprueft";
}

export interface NormAnsicht {
  gesetz: GesetzInfo;
  norm: Omit<Norm, "text" | "verweise">;
  erlaeuterung?: Erlaeuterung;
  verweistAuf: NormRef[];
  erwaehntIn: NormRef[];
  gleicherAbschnitt: NormRef[];
}

export interface OrtAnsicht {
  eingabe: string;
  abgefragtAm: string;
  standort:
    | { status: "ok"; adresse: string; lat: number; lon: number; hausnummerGefunden: boolean; quelle: string }
    | { status: "nicht-gefunden" | "fehler"; hinweis: string };
  bplan:
    | {
        status: "gefunden" | "keiner";
        plaene: {
          nummer: string;
          name: string;
          rechtsverbindlichSeit?: string;
          baunvo?: string;
          vorhabenbezogen: boolean;
          verfahren?: string;
          dokumente?: { art: string; name: string; url: string; groesseMB: number }[];
          /** Planumring in Metern relativ zum Standort (x Osten, y Norden) */
          umriss: [number, number][][];
        }[];
        /** Pläne in Aufstellung, Veränderungssperren, unwirksame Pläne am Standort (null = nicht abrufbar) */
        weitere: { art: "in-aufstellung" | "veraenderungssperre" | "unwirksam"; nummer: string; name: string; hinweis?: string }[] | null;
        dokumenteAbrufbar: boolean;
        quelle: string;
      }
    | { status: "fehler"; hinweis: string; quelle: string };
  denkmal:
    | {
        status: "am-standort" | "umgebung" | "keiner";
        denkmale: {
          name: string;
          anschrift?: string;
          ausweisung: string;
          objekttyp?: string;
          beschreibung?: string;
          gruppe: boolean;
          entfernungM: number;
          amStandort: boolean;
          link?: string;
          /** Umriss in Metern relativ zum Standort (x Osten, y Norden) */
          umriss: [number, number][][];
        }[];
        radiusM: number;
        quelle: string;
      }
    | { status: "fehler"; hinweis: string; quelle: string };
  nutzerNenntDenkmal: boolean;
  einordnung: { thema: string; titel: string; text: string; paragraphen: NormRef[]; ton: "info" | "achtung" | "neutral" }[];
  links: { label: string; url: string }[];
}

export type Antwort =
  | { art: "text"; text: string }
  | { art: "norm"; ansicht: NormAnsicht }
  | { art: "auswahl"; frage: string; optionen: { label: string; anfrage: string }[] }
  | { art: "treffer"; frage: string; treffer: (NormRef & { anfrage: string; ausVerzeichnis?: boolean })[] }
  | { art: "ort"; ort: OrtAnsicht }
  | { art: "fehler"; text: string; vorschlaege?: { label: string; anfrage: string }[] };
