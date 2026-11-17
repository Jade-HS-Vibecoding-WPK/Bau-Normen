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
}

const GESETZE = { de: "Gesetze", en: "Acts" };
const MUSTER = { de: "Muster – kein geltendes Recht", en: "Model code – not law in force" };
const VOB = { de: "VOB – Vergabe- und Vertragsordnung", en: "VOB – award and contract rules" };

const AMTLICH = { de: "amtlicher Wortlaut, unverändert übernommen", en: "official German wording, reproduced unchanged – only the German text is legally binding" };

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
  ndschg: {
    reihenfolge: 2,
    art: "gesetz",
    artText: { de: "Landesgesetz Niedersachsen", en: "Lower Saxony act" },
    gruppe: GESETZE,
    kurztitel: { de: "Denkmalschutzgesetz (Nds.)", en: "Monument Protection Act" },
    wortlaut: AMTLICH,
  },
  nbauo: {
    reihenfolge: 3,
    art: "gesetz",
    artText: { de: "Landesgesetz Niedersachsen", en: "Lower Saxony act" },
    gruppe: GESETZE,
    kurztitel: { de: "Bauordnung (Nds.)", en: "Building Code (Lower Saxony)" },
    wortlaut: AMTLICH,
    imKopf: true,
  },
  mbo: {
    reihenfolge: 4,
    art: "muster",
    gruppe: MUSTER,
    kurztitel: { de: "Musterbauordnung", en: "Model Building Code" },
    artText: { de: "Muster, kein Gesetz", en: "Model code, not law" },
    hinweis: {
      de: "Die Musterbauordnung ist eine Vorlage der Bauministerkonferenz und kein geltendes Recht. Verbindlich ist die Bauordnung des jeweiligen Landes – in Niedersachsen die Niedersächsische Bauordnung (NBauO). Deren Paragraphen können anders nummeriert sein und inhaltlich abweichen.",
      en: "The Model Building Code is a template from the conference of German building ministers, not law in force. What applies is the building code of each state – in Lower Saxony the NBauO. Its sections may be numbered differently and may differ in content.",
    },
    wortlaut: { de: "Wortlaut der Musterbauordnung (DIBt), unverändert übernommen", en: "German wording of the model code (DIBt), reproduced unchanged" },
  },
  voba: {
    reihenfolge: 5,
    art: "vergabe",
    gruppe: VOB,
    kurztitel: { de: "Teil A – Vergabe", en: "Part A – Award of contracts" },
    artText: { de: "Vergaberegeln", en: "Award rules" },
    hinweis: {
      de: "Die VOB/A ist kein Gesetz. Öffentliche Auftraggeber wenden sie an, weil Haushalts- und Vergaberecht darauf verweisen: Abschnitt 1 unterhalb der EU-Schwellenwerte, Abschnitt 2 (EU) ab den Schwellenwerten über § 2 VgV, Abschnitt 3 (VS) für Verteidigung und Sicherheit über die VSVgV. Länder und Kommunen können eigene Wertgrenzen festlegen – in Niedersachsen gilt zusätzlich das NTVergG.",
      en: "The VOB/A is not an act of parliament. Public clients apply it because budget and procurement law refer to it: Section 1 below the EU thresholds, Section 2 (EU) above them via § 2 VgV, Section 3 (VS) for defence and security via the VSVgV. States and municipalities may set their own value limits – Lower Saxony also has the NTVergG.",
    },
    wortlaut: {
      de: "Wortlaut nach den Bekanntmachungen im Bundesanzeiger, unverändert übernommen (§ 3a: Änderungen von 2025 eingearbeitet)",
      en: "German wording as published in the Federal Gazette, reproduced unchanged (§ 3a: 2025 amendments incorporated)",
    },
  },
  vobb: {
    reihenfolge: 6,
    art: "vertrag",
    gruppe: VOB,
    kurztitel: { de: "Teil B – Vertragsbedingungen", en: "Part B – Contract terms" },
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
    reihenfolge: 7,
    art: "technik",
    gruppe: VOB,
    kurztitel: { de: "Teil C – ATV (DIN-Normen)", en: "Part C – ATV (DIN standards)" },
    artText: { de: "Technische Vertragsbedingungen", en: "Technical contract terms" },
    hinweis: {
      de: "Die VOB/C besteht aus den Allgemeinen Technischen Vertragsbedingungen (ATV). Sie erscheinen als DIN-Normen und sind urheberrechtlich geschützt – die App zeigt deshalb nur Nummer und Titel, den Wortlaut gibt es bei DIN Media. Ist die VOB/B vereinbart, gehört die VOB/C zum Vertrag (§ 1 Abs. 1 Satz 2 VOB/B).",
      en: "The VOB/C consists of the general technical contract terms (ATV). They are published as DIN standards and protected by copyright – so the app only lists number and title; the wording is available from DIN Media. Where the VOB/B is agreed, the VOB/C is part of the contract (§ 1(1) sentence 2 VOB/B).",
    },
    wortlaut: { de: "nur Verzeichnis – kein Wortlaut", en: "index only – no wording" },
    nurVerzeichnis: true,
  },
};

const UNBEKANNT: RegelwerkMeta = { reihenfolge: 99, art: "gesetz", artText: { de: "Gesetz", en: "Act" }, gruppe: GESETZE, kurztitel: { de: "", en: "" }, wortlaut: AMTLICH };

export const regelwerk = (id: string): RegelwerkMeta => REGELWERKE[id] ?? UNBEKANNT;

/** "3a-eu" -> "3a EU" (Paragraphen der VOB/A, Abschnitte 2 und 3) */
export const nummerText = (nr: string) => nr.replace(/-(eu|vs)$/i, (_, s: string) => " " + s.toUpperCase());
