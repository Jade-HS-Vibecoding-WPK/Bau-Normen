// Der Gecko: kleines Gimmick. Aus der letzten Antwort wird nach festen Regeln (keine KI) abgeleitet,
// wohin er sich setzt und ob es Fehler oder Hinweise gibt (dann wird er orange bzw. rot).
import { alsText } from "./text";
import type { Antwort, TextKnoten } from "./typen";
import { type Sprache, zweisprachig } from "./sprache";

export interface GeckoProblem {
  stufe: "warnung" | "fehler";
  text: string;
}

export interface GeckoSignal {
  /** ruhe = sitzt an seinem Platz, sucht = Abfrage läuft, neu = setzt sich an die neue Antwort */
  modus: "ruhe" | "sucht" | "neu";
  /** id des Elements, an dessen Kante sich der Gecko setzt */
  ziel?: string;
  /** Fehler und Hinweise der letzten Antwort – werden beim Darüberfahren angezeigt */
  probleme: GeckoProblem[];
  nonce: number;
}

/** Wie verschachtelt ist ein Paragraph? (Absätze, Nummern/Buchstaben, Länge) */
export function komplexitaet(inhalt: TextKnoten[]) {
  let absaetze = 0;
  let punkte = 0;
  const lauf = (nodes: TextKnoten[]) => {
    for (const n of nodes) {
      if (typeof n === "string") continue;
      if (n.t === "p") {
        absaetze++;
        lauf(n.c);
      } else if (n.t === "dl") {
        punkte += n.items.length;
        n.items.forEach((it) => lauf(it.c));
      } else if ("c" in n) lauf(n.c);
    }
  };
  lauf(inhalt);
  const zeichen = alsText(inhalt).length;
  return { absaetze, punkte, zeichen, hoch: zeichen > 5000 || punkte > 15 || absaetze > 7 };
}

/** Sammelt Fehler (rot) und Hinweise (orange) aus den Antworten. */
export function geckoProbleme(antworten: Antwort[], sprache: Sprache = "de"): GeckoProblem[] {
  const t = zweisprachig(sprache);
  const liste: GeckoProblem[] = [];
  for (const a of antworten) {
    switch (a.art) {
      case "fehler":
        liste.push({ stufe: "fehler", text: a.text });
        break;
      case "auswahl":
        liste.push({ stufe: "warnung", text: t("Paragraphennummer nicht eindeutig – bitte das Gesetz auswählen.", "Section number is ambiguous – please choose the act.") });
        break;
      case "treffer":
        if (!a.treffer.some((t) => t.ausVerzeichnis)) liste.push({ stufe: "warnung", text: t("Kein Stichwort aus dem Verzeichnis erkannt – die Treffer stammen aus der Volltextsuche.", "No index term recognised – the results come from the full-text search.") });
        break;
      case "ort": {
        const o = a.ort;
        if (o.standort.status !== "ok") {
          liste.push({ stufe: "fehler", text: o.standort.hinweis });
          break;
        }
        if (!o.standort.hausnummerGefunden) liste.push({ stufe: "warnung", text: t("Hausnummer nicht gefunden – die Abfrage nutzt einen Punkt auf der Straße.", "House number not found – the query uses a point on the street.") });
        if (o.bplan.status === "fehler") liste.push({ stufe: "fehler", text: o.bplan.hinweis });
        else {
          if (!o.bplan.dokumenteAbrufbar) liste.push({ stufe: "warnung", text: t("Plan-Dokumente (PDF) konnten nicht abgerufen werden.", "Plan documents (PDF) could not be retrieved.") });
          if (o.bplan.weitere === null) liste.push({ stufe: "warnung", text: t("Laufende Verfahren (Aufstellung, Veränderungssperre) nicht abrufbar.", "Ongoing procedures (plans in preparation, development freezes) not retrievable.") });
        }
        if (o.denkmal.status === "fehler") liste.push({ stufe: "fehler", text: o.denkmal.hinweis });
        break;
      }
    }
  }
  return liste;
}

export function geckoSignal(antworten: Antwort[] | undefined, praefix: string, nonce: number, sprache: Sprache = "de"): GeckoSignal {
  const a = antworten?.[0];
  if (!a || !antworten) return { modus: "ruhe", probleme: [], nonce };
  const probleme = geckoProbleme(antworten, sprache);
  let ziel = `karte-${praefix}-0`;
  if (a.art === "ort" && a.ort.standort.status === "ok") ziel = `skizze-${praefix}-0`;
  // Bei sehr verschachtelten Paragraphen setzt sich der Gecko an die verständliche Erläuterung.
  if (a.art === "norm" && !a.ansicht.norm.weggefallen && komplexitaet(a.ansicht.norm.inhalt).hoch) ziel = `erl-${praefix}-0`;
  return { modus: "neu", ziel, probleme, nonce };
}

/**
 * Zusatzauftrag für den Gecko: in der Lageskizze die Fähnchen stecken.
 * Die Lageskizze schickt ihn als Ereignis "gecko-fahnen" (window); der Gecko setzt `angenommen` auf true,
 * läuft von Punkt zu Punkt und meldet jede gesteckte Fahne zurück. Danach macht er weiter wie bisher.
 */
export interface GeckoFahnenAuftrag {
  /** id der Lageskizze – dort setzt sich der Gecko anschließend an den rechten Rand */
  ziel: string;
  /** Bildschirmposition je Fahne (in Steck-Reihenfolge); null = gerade nicht sichtbar */
  punkte: (() => { x: number; y: number } | null)[];
  /** Fahne Nummer k (in Steck-Reihenfolge) ist gesteckt */
  gesetzt: (k: number) => void;
  /** Auftrag endet vorzeitig: alle übrigen Fahnen sofort zeigen */
  alleSetzen: () => void;
  angenommen: boolean;
}
