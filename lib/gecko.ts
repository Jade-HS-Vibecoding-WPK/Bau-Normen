// Der Gecko: kleines Gimmick. Aus der letzten Antwort wird nach festen Regeln (keine KI) abgeleitet,
// wohin er sich setzt und ob es Fehler oder Hinweise gibt (dann wird er orange bzw. rot).
import { alsText } from "./text";
import type { Antwort, TextKnoten } from "./typen";

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
export function geckoProbleme(antworten: Antwort[]): GeckoProblem[] {
  const liste: GeckoProblem[] = [];
  for (const a of antworten) {
    switch (a.art) {
      case "fehler":
        liste.push({ stufe: "fehler", text: a.text });
        break;
      case "auswahl":
        liste.push({ stufe: "warnung", text: "Paragraphennummer nicht eindeutig – bitte das Gesetz auswählen." });
        break;
      case "treffer":
        if (!a.treffer.some((t) => t.ausVerzeichnis)) liste.push({ stufe: "warnung", text: "Kein Stichwort aus dem Verzeichnis erkannt – die Treffer stammen aus der Volltextsuche." });
        break;
      case "ort": {
        const o = a.ort;
        if (o.standort.status !== "ok") {
          liste.push({ stufe: "fehler", text: o.standort.hinweis });
          break;
        }
        if (!o.standort.hausnummerGefunden) liste.push({ stufe: "warnung", text: "Hausnummer nicht gefunden – die Abfrage nutzt einen Punkt auf der Straße." });
        if (o.bplan.status === "fehler") liste.push({ stufe: "fehler", text: o.bplan.hinweis });
        else {
          if (!o.bplan.dokumenteAbrufbar) liste.push({ stufe: "warnung", text: "Plan-Dokumente (PDF) konnten nicht abgerufen werden." });
          if (o.bplan.weitere === null) liste.push({ stufe: "warnung", text: "Laufende Verfahren (Aufstellung, Veränderungssperre) nicht abrufbar." });
        }
        if (o.denkmal.status === "fehler") liste.push({ stufe: "fehler", text: o.denkmal.hinweis });
        break;
      }
    }
  }
  return liste;
}

export function geckoSignal(antworten: Antwort[] | undefined, praefix: string, nonce: number): GeckoSignal {
  const a = antworten?.[0];
  if (!a || !antworten) return { modus: "ruhe", probleme: [], nonce };
  const probleme = geckoProbleme(antworten);
  let ziel = `karte-${praefix}-0`;
  if (a.art === "ort" && a.ort.standort.status === "ok") ziel = `skizze-${praefix}-0`;
  // Bei sehr verschachtelten Paragraphen setzt sich der Gecko an die verständliche Erläuterung.
  if (a.art === "norm" && !a.ansicht.norm.weggefallen && komplexitaet(a.ansicht.norm.inhalt).hoch) ziel = `erl-${praefix}-0`;
  return { modus: "neu", ziel, probleme, nonce };
}
