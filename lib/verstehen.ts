// Der "Lotse" – arbeitet regelbasiert, ganz ohne KI.
// Erkennt: Paragraph-Abrufe ("§ 34 BauGB", "Paragraph 5"), Adressen ("Gartenstraße 5")
// und Stichworte (kuratiertes Verzeichnis + Volltextsuche).
// Der Gesetzestext kommt immer unverändert aus der Bibliothek (lib/gesetze.ts).
import { alleGesetze, normAnsicht, stichwortSuche, suche } from "./gesetze";
import { ortsAntwort } from "./ort";
import type { Antwort, NormRef } from "./typen";
import { type Sprache, zweisprachig } from "./sprache";
import { nummerText } from "./regelwerke";

// Teil A/B/C der VOB: "VOB/A", "VOB A", "VOB-A", "VOBA", "VOB Teil A", auch "VOB/A-EU"
const vobTeil = (b: string) => new RegExp(`\\bvob\\s*(?:\\/|-|\\s+teil)?\\s*${b}(?![a-zäöüß])`, "i");

const GESETZ_MUSTER: { id: string; re: RegExp }[] = [
  { id: "baugb", re: /\b(baugb|baugesetzbuch|bbaug)\b/i },
  { id: "ndschg", re: /\b(ndschg|nds\.?\s*dschg|ndsdschg|denkmalschutzgesetz)\b/i },
  { id: "mbo", re: /\b(mbo|musterbauordnung|muster-bauordnung)\b/i },
  // Landesbauordnungen sind (noch) nicht in der Bibliothek – nicht mit der Musterbauordnung verwechseln
  { id: "nbauo", re: /\b(nbauo|niedersächsische[nr]? bauordnung|landesbauordnung|lbo)\b/i },
  { id: "voba", re: vobTeil("a") },
  { id: "vobb", re: vobTeil("b") },
  { id: "vobc", re: vobTeil("c") },
  // "VOB" ohne Teil: Teil A oder B (Teil C hat keine Paragraphen)
  { id: "vob", re: /\bvob\b/i },
];

export function erkenneGesetz(t: string): string | null {
  for (const g of GESETZ_MUSTER) if (g.re.test(t)) return g.id;
  return null;
}

/** ATV der VOB/C: "DIN 18353", "ATV DIN 18300", "ATV 18299" */
export function erkenneDin(t: string): string[] {
  const nr = [...t.matchAll(/\b(?:atv\s*)?din\s*(18\d{3})\b|\batv\s*(18\d{3})\b/gi)].map((m) => m[1] ?? m[2]);
  return [...new Set(nr)];
}

/** Findet Paragraphennummern wie "§ 34", "§§ 30, 34 und 35", "Paragraph 13a", "34 BauGB". */
export function erkenneNummern(t: string): string[] {
  const nummern: string[] = [];
  const schluessel = /(§§?|paragra(?:ph|f)(?:en|s)?|para\.|sections?|sec\.)\s*/gi;
  let m: RegExpExecArray | null;
  while ((m = schluessel.exec(t))) {
    let pos = m.index + m[0].length;
    for (;;) {
      const rest = t.slice(pos);
      const nr = rest.match(/^(\d{1,3})(?:\s?([a-z])(?![a-zäöüß]))?/);
      if (!nr) break;
      pos += nr[0].length;
      // VOB/A Abschnitt 2 und 3: "§ 3a EU", "§ 6 VS"
      const abschnitt = t.slice(pos).match(/^\s*(eu|vs)\b/i);
      if (abschnitt) pos += abschnitt[0].length;
      nummern.push(nr[1] + (nr[2] ?? "") + (abschnitt ? "-" + abschnitt[1].toLowerCase() : ""));
      const verb = t.slice(pos).match(/^\s*(,|und|sowie|oder)\s*/);
      if (!verb) break;
      pos += verb[0].length;
    }
  }
  // "35 BauGB" ohne §-Zeichen – nur wenn kein § erkannt wurde und die Zahl kein Absatz/Satz/Nummer ist.
  if (!nummern.length) {
    const nachgestellt = /(?<!(?:abs\.?|absatz|satz|nr\.?|nummer)\s*)\b(\d{1,3}[a-z]?)\s*(?:baugb|ndschg|nbauo|mbo|vob\s*\/?\s*[ab])\b/gi;
    while ((m = nachgestellt.exec(t))) nummern.push(m[1].toLowerCase());
  }
  // "§ 3 VOB/A-EU" bzw. "VOB/A EU § 3" -> § 3 EU
  const teil = t.match(/\bvob\s*\/?\s*a\s*[-–]?\s*(eu|vs)\b/i);
  if (teil) return [...new Set(nummern.map((n) => (/-(eu|vs)$/.test(n) ? n : `${n}-${teil[1].toLowerCase()}`)))];
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

// Nach der Hausnummer: Postleitzahl und/oder Ort, z. B. ", 26122 Oldenburg", " 30159 Hannover", ", Frankfurt am Main"
const ORTSNAME = "[A-ZÄÖÜ][\\wäöüß.()/-]*(?:\\s+(?:[A-ZÄÖÜ(][\\wäöüß.()/-]*|am|an|der|im|in|bei|ob|vor|a\\.|i\\.|v\\.|d\\.))*";
const PLZ_ORT = new RegExp(`^\\s*,?\\s*(?:in\\s+)?(\\d{5})(?:\\s+(${ORTSNAME}))?|^\\s*(?:,|\\bin\\b)\\s*(${ORTSNAME})`);

export function erkenneAdresse(t: string, nurMitEndung = false): { strasse: string; hausnummer: string; plz?: string; ort?: string } | null {
  const m = t.match(MIT_ENDUNG) ?? (nurMitEndung ? null : t.match(MIT_VORWORT));
  if (!m) return null;
  const woerter = m[1].trim().split(/\s+/);
  while (woerter.length > 1 && KEIN_STRASSENTEIL.has(woerter[0].toLowerCase())) woerter.shift();
  const strasse = woerter.join(" ").replace(/^./, (c) => c.toUpperCase());
  const rest = t.slice((m.index ?? 0) + m[0].length).match(PLZ_ORT);
  const plz = rest?.[1];
  const ort = (rest?.[2] ?? rest?.[3])?.trim();
  return { strasse, hausnummer: m[2] + (m[3] ? m[3].toLowerCase() : ""), ...(plz ? { plz } : {}), ...(ort ? { ort } : {}) };
}

async function normAntwort(gesetzId: string, nr: string, sprache: Sprache): Promise<Antwort> {
  const g = alleGesetze().get(gesetzId)!;
  const ansicht = await normAnsicht(gesetzId, nr);
  if (ansicht) return { art: "norm", ansicht };
  const tx = zweisprachig(sprache);
  const paragraphen = g.normen.filter((n) => n.bez.startsWith("§"));
  const bereich = paragraphen.length ? `${paragraphen[0].bez} – ${paragraphen.at(-1)!.bez}` : "?";
  // VOB/A: "§ 3a" gibt es auch als "§ 3a EU" / "§ 3a VS" -> anbieten
  const varianten = g.normen.filter((n) => n.id === `${nr}-eu` || n.id === `${nr}-vs`);
  return {
    art: "fehler",
    text: tx(
      `${g.kurz}: Einen § ${nummerText(nr)} gibt es dort nicht (vorhanden: ${bereich}). Es wird kein Text angezeigt, statt zu raten.`,
      `${g.kurz}: there is no § ${nummerText(nr)} (available: ${bereich}). No text is shown rather than guessing.`,
    ),
    ...(varianten.length ? { vorschlaege: varianten.map((n) => ({ label: `${n.bez} ${g.kurz}`, anfrage: `${n.bez} ${g.kurz}` })) } : {}),
  };
}

async function dinAntwort(nr: string, sprache: Sprache): Promise<Antwort> {
  const tx = zweisprachig(sprache);
  const vobc = alleGesetze().get("vobc");
  if (vobc && vobc.normen.some((n) => n.id === nr)) return { art: "norm", ansicht: (await normAnsicht("vobc", nr))! };
  return {
    art: "fehler",
    text: tx(
      `DIN ${nr} ist keine ATV der VOB/C (Stand: VOB 2019 mit Ergänzungsband 2023). Normen außerhalb der VOB/C enthält die Bibliothek nicht.`,
      `DIN ${nr} is not one of the VOB/C standards (as of VOB 2019 with the 2023 supplement). Other standards are not in the library.`,
    ),
  };
}

async function paragraphAntwort(t: string, nummern: string[], sprache: Sprache): Promise<Antwort[]> {
  const tx = zweisprachig(sprache);
  const gesetze = alleGesetze();
  const gesetzId = erkenneGesetz(t);
  const verfuegbar = [...gesetze.values()].map((g) => g.kurz).join(", ");
  if (gesetzId === "vobc") {
    return [
      {
        art: "fehler",
        text: tx(
          "Die VOB/C hat keine Paragraphen, sondern ATV-Normen – z. B. „DIN 18300“ (Erdarbeiten) oder „DIN 18353“ (Estricharbeiten).",
          "The VOB/C has no sections but ATV standards – e.g. “DIN 18300” (earthworks) or “DIN 18353” (screed work).",
        ),
        vorschlaege: [
          { label: "DIN 18299", anfrage: "DIN 18299" },
          { label: "DIN 18300", anfrage: "DIN 18300" },
        ],
      },
    ];
  }
  if (gesetzId === "nbauo" && !gesetze.has("nbauo")) {
    return [
      {
        art: "fehler",
        text: tx(
          `Die Niedersächsische Bauordnung (NBauO) ist noch nicht in der Bibliothek. Verfügbar: ${verfuegbar}. Die Musterbauordnung (MBO) ist nur eine Vorlage – ihre Paragraphen stimmen nicht mit der NBauO überein.`,
          `The Lower Saxony building code (NBauO) is not in the library yet. Available: ${verfuegbar}. The model code (MBO) is only a template – its sections do not match the NBauO.`,
        ),
      },
    ];
  }
  if (gesetzId && gesetzId !== "vob" && gesetze.has(gesetzId)) return Promise.all(nummern.slice(0, 3).map((nr) => normAntwort(gesetzId, nr, sprache)));
  if (gesetzId && gesetzId !== "vob" && !gesetze.has(gesetzId)) {
    return [{ art: "fehler", text: tx(`Dieses Gesetz ist noch nicht in der Bibliothek. Verfügbar: ${verfuegbar}.`, `This act is not in the library yet. Available: ${verfuegbar}.`) }];
  }
  const nr = nummern[0];
  // "§ 13 VOB" ohne Teil -> nur VOB/A und VOB/B kommen infrage
  const kandidaten = [...gesetze.values()].filter((g) => (gesetzId !== "vob" || g.id === "voba" || g.id === "vobb") && g.normen.some((n) => n.id === nr));
  // Nur ein Gesetz hat diesen Paragraphen -> eindeutig, keine Rückfrage nötig.
  if (kandidaten.length === 1) return Promise.all(nummern.slice(0, 3).map((x) => normAntwort(kandidaten[0].id, x, sprache)));
  if (kandidaten.length === 0) {
    return [{ art: "fehler", text: tx(`Einen § ${nummerText(nr)} gibt es in keinem der verfügbaren Regelwerke (${verfuegbar}).`, `None of the available acts has a § ${nummerText(nr)} (${verfuegbar}).`) }];
  }
  return [
    {
      art: "auswahl",
      frage: tx(`§ ${nummerText(nr)} gibt es in mehreren Regelwerken. Welches ist gemeint?`, `§ ${nummerText(nr)} exists in several acts. Which one do you mean?`),
      optionen: kandidaten.map((g) => {
        const n = g.normen.find((x) => x.id === nr)!;
        return { label: `${n.bez} ${g.kurz} – ${n.titel}`, anfrage: `${n.bez} ${g.kurz}` };
      }),
    },
  ];
}

export async function beantworte(eingabe: string, sprache: Sprache = "de"): Promise<Antwort[]> {
  const t = eingabe.trim();
  const tx = zweisprachig(sprache);
  if (!t) return [];

  // 1) Adresse mit typischer Straßenendung ("…straße 5", "…weg 12") -> Ortsauskunft
  const adresse = erkenneAdresse(t, true);
  if (adresse) return [await ortsAntwort(adresse, t, sprache)];

  // 2) ATV der VOB/C ("DIN 18353")
  const din = erkenneDin(t);
  if (din.length) return Promise.all(din.slice(0, 3).map((nr) => dinAntwort(nr, sprache)));

  // 2b) Paragraph-Abruf
  const nummern = erkenneNummern(t);
  if (nummern.length) return paragraphAntwort(t, nummern, sprache);

  // 3) Adressen ohne Endung ("Am Stadtmuseum 4")
  const adresse2 = erkenneAdresse(t);
  if (adresse2) return [await ortsAntwort(adresse2, t, sprache)];

  // 4) Stichworte: erst das kuratierte Verzeichnis, dann Volltextsuche
  const { refs, begriffe } = stichwortSuche(t);
  const volltext = (await suche(t, 8)).filter((r) => !refs.some((x) => x.gesetz === r.gesetz && x.id === r.id));
  const treffer: NormRef[] = [...refs, ...volltext].slice(0, 8);
  if (treffer.length) {
    return [
      {
        art: "treffer",
        frage: begriffe.length
          ? tx(`Zu „${begriffe.slice(0, 3).join("“, „")}“ sind diese Vorschriften einschlägig:`, `These provisions are relevant to “${begriffe.slice(0, 3).join("”, “")}”:`)
          : tx(
              "Kein Stichwort aus dem Verzeichnis erkannt. Diese Vorschriften enthalten Ihre Suchbegriffe:",
              "No term from the index recognised. These provisions contain your search words (the search works with German terms):",
            ),
        treffer: treffer.map((r, i) => ({ ...r, anfrage: `${r.bez} ${r.gesetz}`, ausVerzeichnis: i < refs.length })),
      },
    ];
  }
  return [
    {
      art: "fehler",
      text: tx(
        "Dazu wurde nichts gefunden. Möglich sind: ein Paragraph („§ 34 BauGB“), ein Stichwort („Vorkaufsrecht“) oder eine Adresse („Straße Hausnummer, PLZ Ort“).",
        "Nothing found. You can enter a section (“§ 34 BauGB”), a German keyword (“Vorkaufsrecht”) or an address (“street house number, postcode town”).",
      ),
    },
  ];
}
