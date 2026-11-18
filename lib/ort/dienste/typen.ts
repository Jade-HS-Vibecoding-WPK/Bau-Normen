// Gemeinsame Schnittstelle für Geodatendienste der Länder und Gemeinden (Bebauungspläne, Denkmale).
// Jeder Dienst sagt ehrlich, was er abdeckt: Nur wenn ein Dienst ALLE rechtsverbindlichen Pläne bzw. ALLE eingetragenen
// Denkmale seines Gebiets enthält ("vollstaendig"), darf ein leeres Ergebnis als "kein Plan" / "kein Denkmal" gelten.
// Sonst heißt ein leeres Ergebnis nur "im Dienst nicht verzeichnet".
import type { Sprache } from "../../sprache";

/** Gebiet eines Dienstes: ein ganzes Land, ein Landkreis oder eine einzelne Gemeinde */
export interface DienstGebiet {
  /** Bundesland, wie es lib/ort/standort.ts liefert, z. B. "Niedersachsen", "Bayern", "Berlin" */
  land: string;
  /** nur dieser Landkreis (Name wie in den Adressdaten, z. B. "Landkreis Leer") */
  kreis?: string;
  /** nur diese Gemeinde/Stadt (Name wie in den Adressdaten, z. B. "Oldenburg (Oldb)"); fehlen kreis und gemeinde = ganzes Land */
  gemeinde?: string;
}

export interface PlanTreffer {
  nummer: string;
  name: string;
  rechtsverbindlichSeit?: string;
  baunvo?: string;
  vorhabenbezogen: boolean;
  verfahren?: string;
  /** Link zum Plan (Planzeichnung, Detailseite) – nur amtliche Adressen aus dem Dienst */
  link?: string;
  /** Kein Plan, sondern eine Sicherung der Planung, die der Dienst mitführt (z. B. Veränderungssperre, § 14 BauGB) –
   *  die Ortsauskunft zeigt sie getrennt von den Plänen an */
  sicherung?: "veraenderungssperre";
  dokumente?: { art: string; name: string; url: string; groesseMB: number }[];
  /** Planumring in Metern relativ zum Standort (x Osten, y Norden) – leer, wenn der Dienst keine Geometrie liefert */
  umriss: [number, number][][];
}

export interface DenkmalTreffer {
  name: string;
  anschrift?: string;
  /** z. B. "Baudenkmal", "Bodendenkmal", "Ensemble" – Wortlaut aus dem Dienst */
  ausweisung: string;
  objekttyp?: string;
  beschreibung?: string;
  /** Gruppe/Ensemble/Denkmalbereich statt Einzeldenkmal */
  gruppe: boolean;
  /** 0 = Standort liegt in der Denkmalfläche */
  entfernungM: number;
  link?: string;
  umriss: [number, number][][];
}

export type DienstErgebnis<T> = { status: "ok"; treffer: T[] } | { status: "fehler"; hinweis: string };

interface DienstBasis {
  /** kurze Kennung, z. B. "by-bplan" */
  id: string;
  /** Anzeigename der Quelle, z. B. "Geoportal Bayern – Bauleitplanung" */
  quelle: string;
  /** Kartenansicht für Menschen (Link in der Auskunft) */
  viewer?: string;
  gebiet: DienstGebiet;
  /** Enthält der Dienst nachweislich alle rechtsverbindlichen Pläne bzw. eingetragenen Denkmale des Gebiets? */
  vollstaendig: boolean;
  /** Antwortet der Dienst mit CORS-Kopfzeilen, sodass er auch direkt aus dem Browser (GitHub Pages) abfragbar ist? */
  browser: boolean;
  /** Kurzer Hinweis zur Abdeckung, z. B. "nur Pläne der teilnehmenden Gemeinden" (deutsch und englisch) */
  abdeckung?: { de: string; en: string };
}

export interface BplanDienst extends DienstBasis {
  abfrage(lat: number, lon: number, sprache: Sprache): Promise<DienstErgebnis<PlanTreffer>>;
}

export interface DenkmalDienst extends DienstBasis {
  abfrage(lat: number, lon: number, radiusM: number, sprache: Sprache): Promise<DienstErgebnis<DenkmalTreffer>>;
}
