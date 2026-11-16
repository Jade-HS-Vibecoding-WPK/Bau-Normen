// Ortsauskunft: Adresse -> Standort -> B-Plan (Stadt Oldenburg) + Denkmale (Denkmalatlas Niedersachsen)
// -> feste, nachvollziehbare Regeln, welche Paragraphen zu beachten sind. Keine KI beteiligt.
//
// Grundsatz: Wenn ein Dienst nicht antwortet, sagen wir "keine Aussage möglich" –
// niemals "kein B-Plan" oder "kein Denkmal", nur weil eine Abfrage fehlgeschlagen ist.
import { alleGesetze } from "../gesetze";
import type { NormRef, OrtAnsicht } from "../typen";
import { BPLAN_QUELLE, BPLAN_VIEWER, bplaeneAmPunkt } from "./bplan";
import { DENKMAL_QUELLE, DENKMAL_VIEWER, denkmaleImUmkreis } from "./denkmal";
import { findeStandort } from "./standort";

const RADIUS_M = 50;

function refs(gesetzId: string, ids: string[]): NormRef[] {
  const g = alleGesetze().get(gesetzId);
  return ids.flatMap((id) => {
    const n = g?.normen.find((x) => x.id === id);
    return n && g ? [{ gesetz: g.kurz, id, bez: n.bez, titel: n.titel }] : [];
  });
}

const norm = (s?: string) => (s ?? "").toLowerCase().replace(/str\./g, "straße").replace(/[\s-]+/g, "");

export async function ortsauskunft(strasse: string, hausnummer: string, frage: string): Promise<OrtAnsicht> {
  const nutzerNenntDenkmal = /denkmal/i.test(frage);
  const abgefragtAm = new Date().toLocaleString("de-DE", { timeZone: "Europe/Berlin", dateStyle: "medium", timeStyle: "short" });
  const standort = await findeStandort(strasse, hausnummer);
  const einordnung: OrtAnsicht["einordnung"] = [];
  const links: OrtAnsicht["links"] = [
    { label: "Kartenportal Bauen & Wohnen (Stadt Oldenburg)", url: BPLAN_VIEWER },
    { label: "Pläne in Aufstellung (Beteiligungsportal)", url: "https://oldenburg.planungsbeteiligung.de/" },
    { label: "Denkmalatlas Niedersachsen", url: DENKMAL_VIEWER },
  ];

  if (standort.status !== "ok") {
    return {
      eingabe: `${strasse} ${hausnummer}`,
      abgefragtAm,
      standort,
      bplan: { status: "fehler", hinweis: "Nicht abgefragt – Standort unbekannt.", quelle: BPLAN_QUELLE },
      denkmal: { status: "fehler", hinweis: "Nicht abgefragt – Standort unbekannt.", quelle: DENKMAL_QUELLE },
      nutzerNenntDenkmal,
      einordnung,
      links,
    };
  }

  const [bp, dm] = await Promise.all([bplaeneAmPunkt(standort.lat, standort.lon), denkmaleImUmkreis(standort.lat, standort.lon, RADIUS_M)]);

  if (!standort.hausnummerGefunden) {
    einordnung.push({
      thema: "Standort",
      titel: "Hausnummer nicht eindeutig gefunden",
      text: `Die Hausnummer „${hausnummer}“ ist im Adressdatenbestand nicht verzeichnet. Die Abfrage nutzt deshalb einen Punkt auf der Straße. Ergebnisse können für Ihr Grundstück abweichen – bitte im Kartenportal der Stadt prüfen.`,
      paragraphen: [],
      ton: "achtung",
    });
  }

  // --- Bauplanungsrecht ---
  let bplan: OrtAnsicht["bplan"];
  if (bp.status === "fehler") {
    bplan = { status: "fehler", hinweis: bp.hinweis, quelle: BPLAN_QUELLE };
    einordnung.push({
      thema: "Bauplanungsrecht",
      titel: "Keine Aussage zum Bebauungsplan möglich",
      text: `${bp.hinweis} Ob ein Bebauungsplan gilt, bitte im Kartenportal der Stadt Oldenburg prüfen.`,
      paragraphen: [],
      ton: "achtung",
    });
  } else if (bp.plaene.length) {
    bplan = { status: "gefunden", plaene: bp.plaene, quelle: BPLAN_QUELLE };
    const vhb = bp.plaene.some((p) => p.vorhabenbezogen);
    const liste = bp.plaene.map((p) => `Nr. ${p.nummer} „${p.name}“`).join(", ");
    einordnung.push({
      thema: "Bauplanungsrecht",
      titel: bp.plaene.length > 1 ? "Mehrere Bebauungspläne verzeichnet" : "Bebauungsplan verzeichnet",
      text:
        `Für den Standort ist ${bp.plaene.length > 1 ? "folgende Bebauungspläne" : "der Bebauungsplan"} ${liste} als rechtsverbindlich verzeichnet. ` +
        `Ein Vorhaben ist dann nach § 30 BauGB zu beurteilen: Es darf den Festsetzungen nicht widersprechen, die Erschließung muss gesichert sein. ` +
        (vhb ? "Bei einem vorhabenbezogenen Bebauungsplan gilt § 30 Abs. 2 in Verbindung mit § 12 BauGB. " : "") +
        `Abweichungen von Festsetzungen sind nur über Ausnahmen oder Befreiungen möglich (§ 31 BauGB).` +
        (bp.plaene.length > 1 ? " Überlagern sich mehrere Pläne (z. B. Änderungen), kann das Zusammenspiel nur das Stadtplanungsamt verbindlich klären." : ""),
      paragraphen: refs("baugb", vhb ? ["30", "12", "31"] : ["30", "31"]),
      ton: "info",
    });
  } else {
    bplan = { status: "keiner", plaene: [], quelle: BPLAN_QUELLE };
    einordnung.push({
      thema: "Bauplanungsrecht",
      titel: "Kein rechtsverbindlicher Bebauungsplan verzeichnet",
      text:
        "Für den Standort ist kein rechtsverbindlicher Bebauungsplan verzeichnet. Die Zulässigkeit eines Vorhabens richtet sich dann nach § 34 BauGB (innerhalb eines im Zusammenhang bebauten Ortsteils) oder nach § 35 BauGB (Außenbereich). " +
        "Welche Vorschrift gilt, hängt von der tatsächlichen Bebauung ab – verbindlich klärt das die Bauaufsicht, z. B. über eine Bauvoranfrage. Pläne, die sich noch in Aufstellung befinden, sind in diesem Datensatz nicht enthalten.",
      paragraphen: refs("baugb", ["34", "35"]),
      ton: "info",
    });
  }

  // --- Denkmalrecht ---
  let denkmal: OrtAnsicht["denkmal"];
  if (dm.status === "fehler") {
    denkmal = { status: "fehler", hinweis: dm.hinweis, quelle: DENKMAL_QUELLE };
    einordnung.push({
      thema: "Denkmalrecht",
      titel: "Keine Aussage zum Denkmalschutz möglich",
      text: `${dm.hinweis} Bitte im Denkmalatlas Niedersachsen prüfen oder bei der unteren Denkmalschutzbehörde nachfragen.`,
      paragraphen: refs("ndschg", ["5"]),
      ton: "achtung",
    });
  } else {
    const adr = norm(`${standort.adresse.split(",")[0]}`);
    const denkmale = dm.denkmale.map((d) => ({ ...d, amStandort: d.entfernungM === 0 || (!!d.anschrift && norm(d.anschrift) === adr) }));
    const amStandort = denkmale.filter((d) => d.amStandort);
    const einzelAmStandort = amStandort.filter((d) => !d.gruppe);
    const gruppeAmStandort = amStandort.filter((d) => d.gruppe);
    const umgebung = denkmale.filter((d) => !d.amStandort);
    denkmal = { status: amStandort.length ? "am-standort" : umgebung.length ? "umgebung" : "keiner", denkmale, radiusM: RADIUS_M, quelle: DENKMAL_QUELLE };

    if (einzelAmStandort.length) {
      einordnung.push({
        thema: "Denkmalrecht",
        titel: "Am Standort ist ein Baudenkmal verzeichnet",
        text:
          `Im Denkmalatlas verzeichnet: ${einzelAmStandort.map((d) => (d.objekttyp ? `${d.name} (${d.objekttyp})` : d.name)).join("; ")}. ` +
          "Wer ein Kulturdenkmal verändern, instandsetzen, wiederherstellen, entfernen oder seine Nutzung ändern will, braucht eine Genehmigung der Denkmalschutzbehörde (§ 10 Abs. 1 NDSchG). " +
          "Für Baudenkmale besteht eine Erhaltungspflicht (§ 6 NDSchG). Zuständig ist die untere Denkmalschutzbehörde – in Oldenburg die Stadt (§§ 19, 20 NDSchG).",
        paragraphen: refs("ndschg", ["3", "6", "10", "19", "20"]),
        ton: "achtung",
      });
    }
    if (gruppeAmStandort.length) {
      einordnung.push({
        thema: "Denkmalrecht",
        titel: "Standort liegt in einer Denkmalgruppe",
        text:
          `Der Standort liegt in: ${gruppeAmStandort.map((d) => d.name).join("; ")}. ` +
          "Eine Gruppe baulicher Anlagen ist als Ganzes ein Baudenkmal – unabhängig davon, ob das einzelne Gebäude für sich ein Baudenkmal ist (§ 3 Abs. 3 NDSchG). " +
          "Maßnahmen, die die Gruppe verändern, bedürfen einer Genehmigung (§ 10 Abs. 1 NDSchG).",
        paragraphen: refs("ndschg", ["3", "10"]),
        ton: "achtung",
      });
    }
    if (umgebung.length) {
      einordnung.push({
        thema: "Denkmalrecht",
        titel: `In der Umgebung (bis ${RADIUS_M} m) ${umgebung.length === 1 ? "ist ein Kulturdenkmal" : `sind ${umgebung.length} Kulturdenkmale`} verzeichnet`,
        text:
          "In der Umgebung eines Baudenkmals dürfen Anlagen nicht errichtet, geändert oder beseitigt werden, wenn dadurch sein Erscheinungsbild beeinträchtigt wird (§ 8 NDSchG). " +
          "Beeinflusst ein Vorhaben das Erscheinungsbild, ist eine Genehmigung erforderlich (§ 10 Abs. 1 Nr. 4 NDSchG).",
        paragraphen: refs("ndschg", ["8", "10"]),
        ton: amStandort.length ? "info" : "achtung",
      });
    }
    if (!amStandort.length && nutzerNenntDenkmal) {
      einordnung.push({
        thema: "Denkmalrecht",
        titel: "Ihre Angabe: Denkmal auf dem Grundstück",
        text:
          "Am Standort selbst ist im Denkmalatlas kein Denkmal verzeichnet. Ein Kulturdenkmal ist aber auch ohne Eintragung geschützt, wenn es die Merkmale des § 3 NDSchG erfüllt (§ 5 Abs. 1 NDSchG). " +
          "Klären Sie den Status vor der Planung mit der unteren Denkmalschutzbehörde der Stadt Oldenburg.",
        paragraphen: refs("ndschg", ["3", "5", "10"]),
        ton: "achtung",
      });
    }
    if (!denkmale.length && !nutzerNenntDenkmal) {
      einordnung.push({
        thema: "Denkmalrecht",
        titel: `Kein Kulturdenkmal im Umkreis von ${RADIUS_M} m verzeichnet`,
        text: "Im Denkmalatlas ist im Umkreis kein Kulturdenkmal eingetragen. Der Schutz hängt jedoch nicht von der Eintragung ab (§ 5 Abs. 1 NDSchG), und der Denkmalatlas wird noch vervollständigt.",
        paragraphen: refs("ndschg", ["5"]),
        ton: "neutral",
      });
    }
    if (amStandort.length || umgebung.length || nutzerNenntDenkmal) {
      einordnung.push({
        thema: "Zusammenspiel",
        titel: "Baurecht und Denkmalrecht gelten nebeneinander",
        text: "Das Bauplanungsrecht lässt andere öffentlich-rechtliche Vorschriften ausdrücklich unberührt (§ 29 Abs. 2 BauGB). Planungsrechtliche Zulässigkeit und denkmalrechtliche Genehmigung sind also getrennt zu prüfen.",
        paragraphen: refs("baugb", ["29"]),
        ton: "neutral",
      });
    }
  }

  einordnung.push({
    thema: "Allgemein",
    titel: "Bei Erdarbeiten",
    text: "Wer Erdarbeiten an einer Stelle plant, an der Kulturdenkmale (z. B. archäologische Funde) vermutet werden, braucht eine Genehmigung (§ 13 NDSchG). Bodenfunde sind unverzüglich anzuzeigen (§ 14 NDSchG).",
    paragraphen: refs("ndschg", ["13", "14"]),
    ton: "neutral",
  });

  return { eingabe: `${strasse} ${hausnummer}`, abgefragtAm, standort, bplan, denkmal, nutzerNenntDenkmal, einordnung, links };
}
