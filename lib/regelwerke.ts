import { LAENDER, landVonGesetz } from "./laender";

// Angaben ZU den Regelwerken, die nicht aus der Quelle stammen, sondern von uns: Reihenfolge, Art,
// ein kurzer Hinweis zur Verbindlichkeit und wie der Wortlaut zustande kommt. Der Text der Vorschriften selbst
// steht ausschließlich in data/gesetze/*.json.

export type RegelwerkArt = "gesetz" | "muster" | "vergabe" | "vertrag" | "technik";

export interface RegelwerkMeta {
  reihenfolge: number;
  art: RegelwerkArt;
  /** Kurzbezeichnung der Art (Karten) */
  artText: { de: string; en: string };
  /** Gruppe in der Bibliothek */
  gruppe: { de: string; en: string };
  /** Kurzer Titel für die Bibliothek (der volle Titel steht im Tooltip) */
  kurztitel: { de: string; en: string };
  /** Hinweis zur Verbindlichkeit – erscheint in jeder Karte dieses Regelwerks */
  hinweis?: { de: string; en: string };
  /** Herkunft des Wortlauts (Zusatz bei „Originaltext“) */
  wortlaut: { de: string; en: string };
  /** Kein Wortlaut, nur Verzeichnis (VOB/C: DIN-Normen) */
  nurVerzeichnis?: boolean;
  /** Im Kopf der Seite mit Stand anzeigen */
  imKopf?: boolean;
  /** Landesgesetz: zu welchem Land es gehört (dann zeigt die App es im Zusammenhang dieses Landes) */
  land?: string;
}

const GESETZE = { de: "Bundesrecht", en: "Federal law" };
const MUSTER = { de: "Muster, kein geltendes Recht", en: "Model code, not law in force" };
const VOB = { de: "VOB (Vergabe- und Vertragsordnung)", en: "VOB (award and contract rules)" };

const AMTLICH = { de: "amtlicher Wortlaut, unverändert übernommen", en: "official German wording, reproduced unchanged; only the German text is legally binding" };

export const REGELWERKE: Record<string, RegelwerkMeta> = {
  baugb: {
    reihenfolge: 1,
    art: "gesetz",
    artText: { de: "Bundesgesetz", en: "Federal act" },
    gruppe: GESETZE,
    kurztitel: { de: "Baugesetzbuch", en: "Federal Building Code" },
    wortlaut: AMTLICH,
    imKopf: true,
  },
  mbo: {
    reihenfolge: 50,
    art: "muster",
    gruppe: MUSTER,
    kurztitel: { de: "Musterbauordnung", en: "Model Building Code" },
    artText: { de: "Muster, kein Gesetz", en: "Model code, not law" },
    hinweis: {
      de: "Die Musterbauordnung ist eine Vorlage der Bauministerkonferenz und kein geltendes Recht. Verbindlich ist die Bauordnung des jeweiligen Landes (z. B. NBauO, BayBO, BauO NRW). Deren Paragraphen können anders nummeriert sein und inhaltlich abweichen.",
      en: "The Model Building Code is a template from the conference of German building ministers, not law in force. What applies is the building code of each state (e.g. NBauO, BayBO, BauO NRW). Its sections may be numbered differently and may differ in content.",
    },
    wortlaut: { de: "Wortlaut der Musterbauordnung (DIBt), unverändert übernommen", en: "German wording of the model code (DIBt), reproduced unchanged" },
  },
  voba: {
    reihenfolge: 51,
    art: "vergabe",
    gruppe: VOB,
    kurztitel: { de: "Teil A: Vergabe", en: "Part A: Award of contracts" },
    artText: { de: "Vergaberegeln", en: "Award rules" },
    hinweis: {
      de: "Die VOB/A ist kein Gesetz. Öffentliche Auftraggeber wenden sie an, weil Haushalts- und Vergaberecht darauf verweisen: Abschnitt 1 unterhalb der EU-Schwellenwerte, Abschnitt 2 (EU) ab den Schwellenwerten über § 2 VgV, Abschnitt 3 (VS) für Verteidigung und Sicherheit über die VSVgV. Länder und Kommunen können eigene Wertgrenzen festlegen. In Niedersachsen gilt zusätzlich das NTVergG.",
      en: "The VOB/A is not an act of parliament. Public clients apply it because budget and procurement law refer to it: Section 1 below the EU thresholds, Section 2 (EU) above them via § 2 VgV, Section 3 (VS) for defence and security via the VSVgV. States and municipalities may set their own value limits. Lower Saxony also has the NTVergG.",
    },
    wortlaut: {
      de: "Wortlaut nach den Bekanntmachungen im Bundesanzeiger, unverändert übernommen (§ 3a: Änderungen von 2025 eingearbeitet)",
      en: "German wording as published in the Federal Gazette, reproduced unchanged (§ 3a: 2025 amendments incorporated)",
    },
  },
  vobb: {
    reihenfolge: 52,
    art: "vertrag",
    gruppe: VOB,
    kurztitel: { de: "Teil B: Vertragsbedingungen", en: "Part B: Contract terms" },
    artText: { de: "Vertragsbedingungen", en: "Contract terms" },
    hinweis: {
      de: "Die VOB/B ist kein Gesetz, sondern Allgemeine Geschäftsbedingungen für Bauverträge. Sie gilt nur, wenn sie wirksam in den Vertrag einbezogen ist; daneben gilt das Bauvertragsrecht des BGB (§§ 650a ff. BGB).",
      en: "The VOB/B is not an act of parliament but standard terms for construction contracts. It only applies if it has been validly agreed in the contract; the construction contract law of the BGB (§§ 650a ff.) applies alongside.",
    },
    wortlaut: {
      de: "Wortlaut der konsolidierten Fassung (Fachinformation Bundesbau), unverändert übernommen",
      en: "German wording of the consolidated version (Fachinformation Bundesbau), reproduced unchanged",
    },
  },
  vobc: {
    reihenfolge: 53,
    art: "technik",
    gruppe: VOB,
    kurztitel: { de: "Teil C: ATV (DIN-Normen)", en: "Part C: ATV (DIN standards)" },
    artText: { de: "Technische Vertragsbedingungen", en: "Technical contract terms" },
    hinweis: {
      de: "Die VOB/C besteht aus den Allgemeinen Technischen Vertragsbedingungen (ATV). Sie erscheinen als DIN-Normen und sind urheberrechtlich geschützt. Die App zeigt deshalb nur Nummer und Titel, den Wortlaut gibt es bei DIN Media. Ist die VOB/B vereinbart, gehört die VOB/C zum Vertrag (§ 1 Abs. 1 Satz 2 VOB/B).",
      en: "The VOB/C consists of the general technical contract terms (ATV). They are published as DIN standards and protected by copyright, so the app only lists number and title; the wording is available from DIN Media. Where the VOB/B is agreed, the VOB/C is part of the contract (§ 1(1) sentence 2 VOB/B).",
    },
    wortlaut: { de: "nur Verzeichnis, kein Wortlaut", en: "index only, no wording" },
    nurVerzeichnis: true,
  },
};

const UNBEKANNT: RegelwerkMeta = { reihenfolge: 99, art: "gesetz", artText: { de: "Gesetz", en: "Act" }, gruppe: GESETZE, kurztitel: { de: "", en: "" }, wortlaut: AMTLICH };

// Landesgesetze (Bauordnungen und Denkmalschutzgesetze aller 16 Länder) – Angaben aus dem Länderverzeichnis
for (const [i, l] of LAENDER.entries()) {
  const gemeinsam = {
    art: "gesetz" as const,
    artText: { de: `Landesgesetz ${l.name}`, en: `State act, ${l.name}` },
    gruppe: { de: `Landesrecht ${l.name}`, en: `State law: ${l.name}` },
    wortlaut: AMTLICH,
    land: l.name,
  };
  REGELWERKE[l.bauordnung] = { ...gemeinsam, reihenfolge: 10 + i * 2, kurztitel: { de: "Bauordnung", en: "Building code" } };
  REGELWERKE[l.denkmalschutz] = { ...gemeinsam, reihenfolge: 11 + i * 2, kurztitel: { de: "Denkmalschutzgesetz", en: "Monument protection act" } };
}

// Landesgesetze, deren Wortlaut aus einer nichtamtlichen Lesefassung bzw. Synopse eines Ministeriums stammt
// (scripts/import-landesrecht-d.mjs) – die App sagt das in jeder Karte dazu.
const NICHTAMTLICH: Record<string, { de: string; en: string; zusatz?: { de: string; en: string } }> = {
  hbo: {
    de: "Lesefassung des Hessischen Wirtschaftsministeriums (Stand Oktober 2025)",
    en: "consolidated version published by the Hessian Ministry of Economics (as of October 2025)",
  },
  hbauo: {
    de: "Lesefassung aus der Gesamtsynopse der Hamburger Behörde für Stadtentwicklung und Wohnen (Stand 26.09.2026)",
    en: "consolidated version from the synopsis of Hamburg's Ministry of Urban Development and Housing (as of 26 Sep 2026)",
    zusatz: {
      de: " Die hochgestellten Satznummern hat die Behörde zur Orientierung ergänzt; sie gehören nicht zur amtlichen Fassung.",
      en: " The superscript sentence numbers were added by the authority for orientation and are not part of the official text.",
    },
  },
};
for (const [id, q] of Object.entries(NICHTAMTLICH)) {
  REGELWERKE[id] = {
    ...REGELWERKE[id],
    wortlaut: { de: `nichtamtliche ${q.de}, unverändert übernommen`, en: `unofficial ${q.en}, German wording reproduced unchanged` },
    hinweis: {
      de: "Nichtamtliche Lesefassung: Verbindlich ist allein der im Gesetz- und Verordnungsblatt des Landes verkündete Wortlaut." + (q.zusatz?.de ?? ""),
      en: "Unofficial consolidated version: only the text promulgated in the state's official gazette is legally binding." + (q.zusatz?.en ?? ""),
    },
  };
}

export const regelwerk = (id: string): RegelwerkMeta => REGELWERKE[id] ?? UNBEKANNT;

/** Gehört das Regelwerk zu einem Land (Landesrecht)? */
export const landDesRegelwerks = (id: string): string | undefined => landVonGesetz(id)?.name;

/** "3a-eu" -> "3a EU" (Paragraphen der VOB/A, Abschnitte 2 und 3) */
export const nummerText = (nr: string) => nr.replace(/-(eu|vs)$/i, (_, s: string) => " " + s.toUpperCase());
