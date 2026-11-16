// Der "Lotse" – arbeitet regelbasiert, ganz ohne KI.
// Erkennt: Paragraph-Abrufe ("§ 34 BauGB", "Paragraph 5"), Adressen ("Gartenstraße 5")
// und Stichworte (kuratiertes Verzeichnis + Volltextsuche).
// Der Gesetzestext kommt immer unverändert aus der Bibliothek (lib/gesetze.ts).
import { alleGesetze, normAnsicht, stichwortSuche, suche } from "./gesetze";
import { ortsauskunft } from "./ort";
import type { Antwort, NormRef } from "./typen";

const GESETZ_MUSTER: { id: string; re: RegExp }[] = [
  { id: "baugb", re: /\b(baugb|baugesetzbuch|bbaug)\b/i },
  { id: "ndschg", re: /\b(ndschg|nds\.?\s*dschg|ndsdschg|denkmalschutzgesetz)\b/i },
];

export function erkenneGesetz(t: string): string | null {
  for (const g of GESETZ_MUSTER) if (g.re.test(t)) return g.id;
  return null;
}

/** Findet Paragraphennummern wie "§ 34", "§§ 30, 34 und 35", "Paragraph 13a", "34 BauGB". */
export function erkenneNummern(t: string): string[] {
  const nummern: string[] = [];
  const schluessel = /(§§?|paragra(?:ph|f)(?:en|s)?|para\.)\s*/gi;
  let m: RegExpExecArray | null;
  while ((m = schluessel.exec(t))) {
    let pos = m.index + m[0].length;
    for (;;) {
      const rest = t.slice(pos);
      const nr = rest.match(/^(\d{1,3})(?:\s?([a-z])(?![a-zäöüß]))?/);
      if (!nr) break;
      nummern.push(nr[1] + (nr[2] ?? ""));
      pos += nr[0].length;
      const verb = t.slice(pos).match(/^\s*(,|und|sowie|oder)\s*/);
      if (!verb) break;
      pos += verb[0].length;
    }
  }
  // "35 BauGB" ohne §-Zeichen – nur wenn kein § erkannt wurde und die Zahl kein Absatz/Satz/Nummer ist.
  if (!nummern.length) {
    const nachgestellt = /(?<!(?:abs\.?|absatz|satz|nr\.?|nummer)\s*)\b(\d{1,3}[a-z]?)\s*(?:baugb|ndschg)\b/gi;
    while ((m = nachgestellt.exec(t))) nummern.push(m[1].toLowerCase());
  }
  return [...new Set(nummern)];
}

// --- Adressen ---
const ENDUNG = "(?:straße|strasse|str\\.|weg|platz|allee|ring|damm|gasse|deich|wall|chaussee|stieg|pfad|kamp|markt|ufer|graben|redder|twiete|brücke|esch|hof)";
const MIT_ENDUNG = new RegExp(`((?:[A-Za-zÄÖÜäöüß][\\wÄÖÜäöüß.-]*\\s+){0,3}[A-Za-zÄÖÜäöüß-]*${ENDUNG})\\s*(\\d{1,4})\\s?([a-zA-Z])?(?![\\wäöüß])`, "i");
const MIT_VORWORT = /\b((?:Am|An der|An den|Zum|Zur|Auf dem|Auf der|Hinter dem|Im|In der|Unter den|Alter|Alte|Neue|Neuer)\s+[A-ZÄÖÜ][\wäöüß-]+)\s+(\d{1,3})\s?([a-zA-Z])?(?![\wäöüß])/;
const KEIN_STRASSENTEIL = new Set([
  "ich", "wir", "mein", "meine", "unser", "unsere", "das", "die", "der", "dem", "den", "ein", "eine", "einem", "einen", "an", "in", "im", "auf", "bei", "für",
  "grundstück", "baugrundstück", "flurstück", "haus", "gebäude", "objekt", "adresse", "ortsauskunft", "prüfe", "prüfen", "bitte", "habe", "hab", "liegt", "steht",
]);

export function erkenneAdresse(t: string, nurMitEndung = false): { strasse: string; hausnummer: string } | null {
  const m = t.match(MIT_ENDUNG) ?? (nurMitEndung ? null : t.match(MIT_VORWORT));
  if (!m) return null;
  const woerter = m[1].trim().split(/\s+/);
  while (woerter.length > 1 && KEIN_STRASSENTEIL.has(woerter[0].toLowerCase())) woerter.shift();
  const strasse = woerter.join(" ").replace(/^./, (c) => c.toUpperCase());
  return { strasse, hausnummer: m[2] + (m[3] ? m[3].toLowerCase() : "") };
}

function normAntwort(gesetzId: string, nr: string): Antwort {
  const g = alleGesetze().get(gesetzId)!;
  const ansicht = normAnsicht(gesetzId, nr);
  if (ansicht) return { art: "norm", ansicht };
  const letzte = [...g.normen].reverse().find((n) => n.bez.startsWith("§"));
  return {
    art: "fehler",
    text: `§ ${nr} gibt es im ${g.kurz} nicht. Das ${g.kurz} reicht von § 1 bis ${letzte?.bez ?? "?"}. Es wird kein Text angezeigt, statt zu raten.`,
  };
}

function paragraphAntwort(t: string, nummern: string[]): Antwort[] {
  const gesetze = alleGesetze();
  const gesetzId = erkenneGesetz(t);
  if (gesetzId && gesetze.has(gesetzId)) return nummern.slice(0, 3).map((nr) => normAntwort(gesetzId, nr));
  if (gesetzId && !gesetze.has(gesetzId)) {
    return [{ art: "fehler", text: `Dieses Gesetz ist noch nicht in der Bibliothek. Verfügbar: ${[...gesetze.values()].map((g) => g.kurz).join(", ")}.` }];
  }
  const nr = nummern[0];
  const kandidaten = [...gesetze.values()].filter((g) => g.normen.some((n) => n.id === nr));
  // Nur ein Gesetz hat diesen Paragraphen -> eindeutig, keine Rückfrage nötig.
  if (kandidaten.length === 1) return nummern.slice(0, 3).map((x) => normAntwort(kandidaten[0].id, x));
  if (kandidaten.length === 0) {
    return [{ art: "fehler", text: `Einen § ${nr} gibt es in keinem der verfügbaren Gesetze (${[...gesetze.values()].map((g) => g.kurz).join(", ")}).` }];
  }
  return [
    {
      art: "auswahl",
      frage: `§ ${nr} gibt es in mehreren Gesetzen. Welches ist gemeint?`,
      optionen: kandidaten.map((g) => {
        const n = g.normen.find((x) => x.id === nr)!;
        return { label: `§ ${nr} ${g.kurz} – ${n.titel}`, anfrage: `§ ${nr} ${g.kurz}` };
      }),
    },
  ];
}

export async function beantworte(eingabe: string): Promise<Antwort[]> {
  const t = eingabe.trim();
  if (!t) return [];

  // 1) Adresse mit typischer Straßenendung ("…straße 5", "…weg 12") -> Ortsauskunft
  const adresse = erkenneAdresse(t, true);
  if (adresse) return [{ art: "ort", ort: await ortsauskunft(adresse.strasse, adresse.hausnummer, t) }];

  // 2) Paragraph-Abruf
  const nummern = erkenneNummern(t);
  if (nummern.length) return paragraphAntwort(t, nummern);

  // 3) Adressen ohne Endung ("Am Stadtmuseum 4")
  const adresse2 = erkenneAdresse(t);
  if (adresse2) return [{ art: "ort", ort: await ortsauskunft(adresse2.strasse, adresse2.hausnummer, t) }];

  // 4) Stichworte: erst das kuratierte Verzeichnis, dann Volltextsuche
  const { refs, begriffe } = stichwortSuche(t);
  const volltext = suche(t, 8).filter((r) => !refs.some((x) => x.gesetz === r.gesetz && x.id === r.id));
  const treffer: NormRef[] = [...refs, ...volltext].slice(0, 8);
  if (treffer.length) {
    return [
      {
        art: "treffer",
        frage: begriffe.length
          ? `Zu „${begriffe.slice(0, 3).join("“, „")}“ sind diese Vorschriften einschlägig:`
          : "Kein Stichwort aus dem Verzeichnis erkannt. Diese Vorschriften enthalten Ihre Suchbegriffe:",
        treffer: treffer.map((r, i) => ({ ...r, anfrage: `${r.bez} ${r.gesetz}`, ausVerzeichnis: i < refs.length })),
      },
    ];
  }
  return [
    {
      art: "fehler",
      text: "Dazu wurde nichts gefunden. Möglich sind: ein Paragraph („§ 34 BauGB“), ein Stichwort („Vorkaufsrecht“) oder eine Adresse in Oldenburg („Straße Hausnummer“).",
    },
  ];
}
