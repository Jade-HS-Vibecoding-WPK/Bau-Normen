// Der Gecko: kleines Gimmick ohne Text. Aus der letzten Antwort wird nur abgeleitet,
// wohin er krabbelt und welche Farbe er hat (feste Regeln, keine KI).
import { alsText } from "./text";
import type { Antwort, TextKnoten } from "./typen";

export interface GeckoSignal {
  /** ruhe = herumstreifen, sucht = flink umherlaufen (Abfrage läuft), neu = zur neuen Antwort laufen */
  modus: "ruhe" | "sucht" | "neu";
  /** ocker = Tarnfarbe, wenn ein Denkmal gefunden wurde */
  farbe: "gruen" | "ocker";
  /** id des Elements, an dessen Oberkante sich der Gecko setzt */
  ziel?: string;
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

export function geckoSignal(antworten: Antwort[] | undefined, praefix: string, nonce: number): GeckoSignal {
  const a = antworten?.[0];
  if (!a) return { modus: "ruhe", farbe: "gruen", nonce };
  if (a.art === "ort") {
    const o = a.ort;
    const denkmal = o.denkmal.status === "am-standort" || o.denkmal.status === "umgebung";
    return { modus: "neu", farbe: denkmal ? "ocker" : "gruen", ziel: o.standort.status === "ok" ? `skizze-${praefix}-0` : undefined, nonce };
  }
  if (a.art === "norm") {
    // Bei sehr verschachtelten Paragraphen setzt sich der Gecko an die verständliche Erläuterung.
    const schwer = !a.ansicht.norm.weggefallen && komplexitaet(a.ansicht.norm.inhalt).hoch;
    return { modus: "neu", farbe: "gruen", ziel: schwer ? `erl-${praefix}-0` : `karte-${praefix}-0`, nonce };
  }
  return { modus: "neu", farbe: "gruen", nonce };
}
