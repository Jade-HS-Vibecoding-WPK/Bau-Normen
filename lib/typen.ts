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
  /** Gliederung, Adresse und Verweise fehlen im Katalog der Online-Version (werden je Gesetz nachgeladen) */
  gliederung?: string[];
  weggefallen: boolean;
  /** Wortlaut als Strukturbaum. Fehlt in der Kurzfassung der Online-Version (wird bei Bedarf nachgeladen). */
  inhalt?: TextKnoten[];
  /** Reiner Text (für die Suche). Fehlt in der Kurzfassung der Online-Version. */
  text?: string;
  fussnoten?: string;
  url?: string;
  verweise?: string[];
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
  /** Landesgesetz: zugehöriges Land */
  land?: string;
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
  norm: Omit<Norm, "text" | "verweise" | "inhalt" | "gliederung" | "url"> & { inhalt: TextKnoten[]; gliederung: string[]; url: string };
  erlaeuterung?: Erlaeuterung;
  verweistAuf: NormRef[];
  erwaehntIn: NormRef[];
  gleicherAbschnitt: NormRef[];
}

export interface OrtAnsicht {
  eingabe: string;
  abgefragtAm: string;
  standort:
    | {
        status: "ok";
        adresse: string;
        lat: number;
        lon: number;
        hausnummerGefunden: boolean;
        quelle: string;
        /** Gemeinde/Stadt, Postleitzahl und Bundesland laut Adressdaten */
        ort: string;
        plz?: string;
        land: string;
        /** Landkreis laut Adressdaten (fehlt bei kreisfreien Städten) */
        kreis?: string;
        /** Stadt Oldenburg (Oldb): dort sind die B-Plan-Dienste angebunden */
        oldenburg: boolean;
      }
    | { status: "nicht-gefunden" | "fehler" | "ort-fehlt"; hinweis: string };
  bplan:
    | {
        status: "gefunden" | "keiner";
        plaene: {
          /** kann leer sein, wenn der Dienst keine Plannummer führt */
          nummer: string;
          name: string;
          rechtsverbindlichSeit?: string;
          baunvo?: string;
          vorhabenbezogen: boolean;
          verfahren?: string;
          /** Link zum Plan (Planzeichnung, Detailseite) – amtliche Adresse aus dem Dienst */
          link?: string;
          dokumente?: { art: string; name: string; url: string; groesseMB: number }[];
          /** Planumring in Metern relativ zum Standort (x Osten, y Norden) */
          umriss: [number, number][][];
        }[];
        /** Pläne in Aufstellung, Veränderungssperren, unwirksame Pläne am Standort (null = nicht abrufbar) */
        weitere: { art: "in-aufstellung" | "veraenderungssperre" | "unwirksam"; nummer: string; name: string; hinweis?: string }[] | null;
        dokumenteAbrufbar: boolean;
        quelle: string;
        /** ein vollständiger Dienst hat geantwortet – nur dann heißt "keiner" wirklich "kein Plan" */
        vollstaendig?: boolean;
        abdeckung?: string;
        /** Dienste, die nicht geantwortet haben, obwohl andere geantwortet haben (Teilausfall) */
        ausgefallen?: string[];
      }
    | { status: "fehler"; hinweis: string; quelle: string; /** Für diesen Ort ist (noch) kein Dienst angebunden */ nichtAngebunden?: boolean };
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
          /** Umriss in Metern relativ zum Standort (x Osten, y Norden) – AUS DEM DIENST */
          umriss: [number, number][][];
        }[];
        radiusM: number;
        quelle: string;
        /** ein vollständiger Dienst hat geantwortet – nur dann heißt "keiner" wirklich "kein Denkmal" */
        vollstaendig?: boolean;
        abdeckung?: string;
        /** Dienste, die nicht geantwortet haben, obwohl andere geantwortet haben (Teilausfall) */
        ausgefallen?: string[];
      }
    | { status: "fehler"; hinweis: string; quelle: string; /** Für diesen Ort ist (noch) kein Dienst angebunden */ nichtAngebunden?: boolean };
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
