// Ortsauskunft: Adresse -> Standort -> B-Plan (Stadt Oldenburg) + Denkmale (Denkmalatlas Niedersachsen)
// -> feste, nachvollziehbare Regeln, welche Paragraphen zu beachten sind. Keine KI beteiligt.
//
// Grundsatz: Wenn ein Dienst nicht antwortet, sagen wir "keine Aussage möglich" –
// niemals "kein B-Plan" oder "kein Denkmal", nur weil eine Abfrage fehlgeschlagen ist.
// Alle Texte stehen zweisprachig (Deutsch/Englisch) nebeneinander; Paragraphen bleiben im deutschen Original.
import { alleGesetze } from "../gesetze";
import { gebiet, type Sprache, zweisprachig } from "../sprache";
import type { NormRef, OrtAnsicht } from "../typen";
import { BPLAN_QUELLE, BPLAN_VIEWER, bplaeneAmPunkt } from "./bplan";
import { planDokumente, weiterePlaene } from "./bplan-dokumente";
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

export async function ortsauskunft(strasse: string, hausnummer: string, frage: string, sprache: Sprache = "de"): Promise<OrtAnsicht> {
  const t = zweisprachig(sprache);
  const nutzerNenntDenkmal = /denkmal|monument|listed/i.test(frage);
  const abgefragtAm = new Date().toLocaleString(gebiet(sprache), { timeZone: "Europe/Berlin", dateStyle: "medium", timeStyle: "short" });
  const standort = await findeStandort(strasse, hausnummer, sprache);
  const einordnung: OrtAnsicht["einordnung"] = [];
  const links: OrtAnsicht["links"] = [
    { label: t("Kartenportal Bauen & Wohnen (Stadt Oldenburg)", "Map portal “Bauen & Wohnen” (City of Oldenburg)"), url: BPLAN_VIEWER },
    { label: t("Pläne in Aufstellung (Beteiligungsportal)", "Plans in preparation (participation portal)"), url: "https://oldenburg.planungsbeteiligung.de/" },
    { label: t("Denkmalatlas Niedersachsen", "Monument atlas of Lower Saxony"), url: DENKMAL_VIEWER },
  ];
  const THEMA = {
    standort: t("Standort", "Location"),
    planung: t("Bauplanungsrecht", "Planning law"),
    denkmal: t("Denkmalrecht", "Monument protection law"),
    zusammen: t("Zusammenspiel", "Interplay"),
    allgemein: t("Allgemein", "General"),
  };

  if (standort.status !== "ok") {
    const hinweis = t("Nicht abgefragt – Standort unbekannt.", "Not queried – location unknown.");
    return {
      eingabe: `${strasse} ${hausnummer}`,
      abgefragtAm,
      standort,
      bplan: { status: "fehler", hinweis, quelle: BPLAN_QUELLE },
      denkmal: { status: "fehler", hinweis, quelle: DENKMAL_QUELLE },
      nutzerNenntDenkmal,
      einordnung,
      links,
    };
  }

  const [bp, dm, dokumente, weitere] = await Promise.all([
    bplaeneAmPunkt(standort.lat, standort.lon, sprache),
    denkmaleImUmkreis(standort.lat, standort.lon, RADIUS_M, sprache),
    planDokumente(standort.lat, standort.lon),
    weiterePlaene(standort.lat, standort.lon, sprache),
  ]);

  if (!standort.hausnummerGefunden) {
    einordnung.push({
      thema: THEMA.standort,
      titel: t("Hausnummer nicht eindeutig gefunden", "House number not clearly found"),
      text: t(
        `Die Hausnummer „${hausnummer}“ ist im Adressdatenbestand nicht verzeichnet. Die Abfrage nutzt deshalb einen Punkt auf der Straße. Ergebnisse können für Ihr Grundstück abweichen – bitte im Kartenportal der Stadt prüfen.`,
        `House number “${hausnummer}” is not listed in the address data. The query therefore uses a point on the street. Results may differ for your plot – please check in the city’s map portal.`,
      ),
      paragraphen: [],
      ton: "achtung",
    });
  }

  // --- Bauplanungsrecht ---
  let bplan: OrtAnsicht["bplan"];
  if (bp.status === "fehler") {
    bplan = { status: "fehler", hinweis: bp.hinweis, quelle: BPLAN_QUELLE };
    einordnung.push({
      thema: THEMA.planung,
      titel: t("Keine Aussage zum Bebauungsplan möglich", "No statement on the development plan possible"),
      text: `${bp.hinweis} ${t("Ob ein Bebauungsplan gilt, bitte im Kartenportal der Stadt Oldenburg prüfen.", "Please check in the City of Oldenburg’s map portal whether a development plan applies.")}`,
      paragraphen: [],
      ton: "achtung",
    });
  } else if (bp.plaene.length) {
    const mitDokumenten = bp.plaene.map((p) => ({ ...p, dokumente: dokumente?.get(p.nummer) ?? [] }));
    bplan = { status: "gefunden", plaene: mitDokumenten, weitere, dokumenteAbrufbar: dokumente !== null, quelle: BPLAN_QUELLE };
    const vhb = bp.plaene.some((p) => p.vorhabenbezogen);
    const mehrere = bp.plaene.length > 1;
    const liste = bp.plaene.map((p) => `Nr. ${p.nummer} „${p.name}“`).join(", ");
    einordnung.push({
      thema: THEMA.planung,
      titel: mehrere ? t("Mehrere Bebauungspläne verzeichnet", "Several development plans listed") : t("Bebauungsplan verzeichnet", "Development plan listed"),
      text: t(
        `Für den Standort ist ${mehrere ? "folgende Bebauungspläne" : "der Bebauungsplan"} ${liste} als rechtsverbindlich verzeichnet. ` +
          "Ein Vorhaben ist dann nach § 30 BauGB zu beurteilen: Es darf den Festsetzungen nicht widersprechen, die Erschließung muss gesichert sein. " +
          (vhb ? "Bei einem vorhabenbezogenen Bebauungsplan gilt § 30 Abs. 2 in Verbindung mit § 12 BauGB. " : "") +
          "Abweichungen von Festsetzungen sind nur über Ausnahmen oder Befreiungen möglich (§ 31 BauGB)." +
          (mehrere ? " Überlagern sich mehrere Pläne (z. B. Änderungen), kann das Zusammenspiel nur das Stadtplanungsamt verbindlich klären." : ""),
        `For this location, ${mehrere ? "the following development plans are" : "the development plan"} ${liste} ${mehrere ? "" : "is "}listed as legally binding. ` +
          "A project is then assessed under § 30 BauGB: it must not contradict the plan’s provisions, and access and utilities must be secured. " +
          (vhb ? "For a project-related development plan, § 30(2) in conjunction with § 12 BauGB applies. " : "") +
          "Deviations from the provisions are only possible by way of exceptions or exemptions (§ 31 BauGB)." +
          (mehrere ? " Where several plans overlap (e.g. amendments), only the city planning office can clarify their interplay bindingly." : ""),
      ),
      paragraphen: refs("baugb", vhb ? ["30", "12", "31"] : ["30", "31"]),
      ton: "info",
    });
  } else {
    bplan = { status: "keiner", plaene: [], weitere, dokumenteAbrufbar: dokumente !== null, quelle: BPLAN_QUELLE };
    einordnung.push({
      thema: THEMA.planung,
      titel: t("Kein rechtsverbindlicher Bebauungsplan verzeichnet", "No legally binding development plan listed"),
      text: t(
        "Für den Standort ist kein rechtsverbindlicher Bebauungsplan verzeichnet. Die Zulässigkeit eines Vorhabens richtet sich dann nach § 34 BauGB (innerhalb eines im Zusammenhang bebauten Ortsteils) oder nach § 35 BauGB (Außenbereich). " +
          "Welche Vorschrift gilt, hängt von der tatsächlichen Bebauung ab – verbindlich klärt das die Bauaufsicht, z. B. über eine Bauvoranfrage. Pläne, die sich noch in Aufstellung befinden, sind in diesem Datensatz nicht enthalten.",
        "No legally binding development plan is listed for this location. A project is then assessed under § 34 BauGB (within a built-up area) or § 35 BauGB (outer area). " +
          "Which provision applies depends on the actual surrounding development – the building authority clarifies this bindingly, e.g. via a preliminary building enquiry. Plans still in preparation are not part of this dataset.",
      ),
      paragraphen: refs("baugb", ["34", "35"]),
      ton: "info",
    });
  }

  // --- Laufende Planungen und Sicherungsinstrumente (Kartenportal der Stadt) ---
  if (weitere === null) {
    einordnung.push({
      thema: THEMA.planung,
      titel: t("Laufende Verfahren nicht abrufbar", "Ongoing procedures not retrievable"),
      text: t(
        "Ob für den Standort ein Bebauungsplan in Aufstellung ist oder eine Veränderungssperre gilt, konnte nicht abgefragt werden. Bitte im Kartenportal der Stadt Oldenburg prüfen.",
        "It could not be checked whether a development plan is in preparation or a development freeze applies here. Please check in the City of Oldenburg’s map portal.",
      ),
      paragraphen: [],
      ton: "achtung",
    });
  } else {
    const liste = (art: string) =>
      weitere
        .filter((w) => w.art === art)
        .map((w) => [w.nummer && `Nr. ${w.nummer}`, w.name && `„${w.name}“`, w.hinweis && `(${w.hinweis})`].filter(Boolean).join(" "))
        .join(", ");
    if (weitere.some((w) => w.art === "veraenderungssperre")) {
      einordnung.push({
        thema: THEMA.planung,
        titel: t("Veränderungssperre verzeichnet", "Development freeze listed"),
        text: t(
          `Im Kartenportal der Stadt ist für den Standort eine Veränderungssperre verzeichnet: ${liste("veraenderungssperre")}. ` +
            "Eine Veränderungssperre kann insbesondere bestimmen, dass Vorhaben im Sinne des § 29 BauGB nicht durchgeführt und bauliche Anlagen nicht beseitigt werden dürfen. Ausnahmen sind möglich, wenn überwiegende öffentliche Belange nicht entgegenstehen (§ 14 Abs. 2 BauGB).",
          `The city’s map portal lists a development freeze for this location: ${liste("veraenderungssperre")}. ` +
            "A development freeze can in particular stipulate that projects within the meaning of § 29 BauGB may not be carried out and structures may not be removed. Exceptions are possible if overriding public interests do not stand in the way (§ 14(2) BauGB).",
        ),
        paragraphen: refs("baugb", ["14", "16", "17"]),
        ton: "achtung",
      });
    }
    if (weitere.some((w) => w.art === "in-aufstellung")) {
      einordnung.push({
        thema: THEMA.planung,
        titel: t("Bebauungsplan in Aufstellung", "Development plan in preparation"),
        text: t(
          `Im Kartenportal der Stadt ist für den Standort ein Bebauungsplan in Aufstellung verzeichnet: ${liste("in-aufstellung")}. ` +
            "Während der Planaufstellung kann ein Vorhaben unter den Voraussetzungen des § 33 BauGB zulässig sein. Die Gemeinde kann die Planung durch eine Veränderungssperre (§ 14 BauGB) oder die Zurückstellung von Baugesuchen (§ 15 BauGB) sichern.",
          `The city’s map portal lists a development plan in preparation for this location: ${liste("in-aufstellung")}. ` +
            "While the plan is being prepared, a project may be permissible under the conditions of § 33 BauGB. The municipality can secure its planning with a development freeze (§ 14 BauGB) or by deferring building applications (§ 15 BauGB).",
        ),
        paragraphen: refs("baugb", ["33", "14", "15"]),
        ton: "achtung",
      });
    }
    if (weitere.some((w) => w.art === "unwirksam")) {
      einordnung.push({
        thema: THEMA.planung,
        titel: t("Für unwirksam erklärter Bebauungsplan", "Development plan declared invalid"),
        text: t(
          `Im Kartenportal der Stadt ist für den Standort ein Bebauungsplan als „unwirksam durch OVG“ geführt: ${liste("unwirksam")}. Welche Rechtslage stattdessen gilt, sollte beim Stadtplanungsamt geklärt werden.`,
          `The city’s map portal lists a development plan for this location as “invalid by decision of the Higher Administrative Court”: ${liste("unwirksam")}. Which legal situation applies instead should be clarified with the city planning office.`,
        ),
        paragraphen: [],
        ton: "achtung",
      });
    }
  }

  // --- Denkmalrecht ---
  let denkmal: OrtAnsicht["denkmal"];
  if (dm.status === "fehler") {
    denkmal = { status: "fehler", hinweis: dm.hinweis, quelle: DENKMAL_QUELLE };
    einordnung.push({
      thema: THEMA.denkmal,
      titel: t("Keine Aussage zum Denkmalschutz möglich", "No statement on monument protection possible"),
      text: `${dm.hinweis} ${t("Bitte im Denkmalatlas Niedersachsen prüfen oder bei der unteren Denkmalschutzbehörde nachfragen.", "Please check the Lower Saxony monument atlas or ask the local monument protection authority.")}`,
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
      const namen = einzelAmStandort.map((d) => (d.objekttyp ? `${d.name} (${d.objekttyp})` : d.name)).join("; ");
      einordnung.push({
        thema: THEMA.denkmal,
        titel: t("Am Standort ist ein Baudenkmal verzeichnet", "A listed building is recorded at this location"),
        text: t(
          `Im Denkmalatlas verzeichnet: ${namen}. ` +
            "Wer ein Kulturdenkmal verändern, instandsetzen, wiederherstellen, entfernen oder seine Nutzung ändern will, braucht eine Genehmigung der Denkmalschutzbehörde (§ 10 Abs. 1 NDSchG). " +
            "Für Baudenkmale besteht eine Erhaltungspflicht (§ 6 NDSchG). Zuständig ist die untere Denkmalschutzbehörde – in Oldenburg die Stadt (§§ 19, 20 NDSchG).",
          `Recorded in the monument atlas: ${namen}. ` +
            "Anyone who wants to alter, repair, restore or remove a cultural monument, or change its use, needs a permit from the monument protection authority (§ 10(1) NDSchG). " +
            "Listed buildings must be preserved (§ 6 NDSchG). The competent body is the local monument protection authority – in Oldenburg the city itself (§§ 19, 20 NDSchG).",
        ),
        paragraphen: refs("ndschg", ["3", "6", "10", "19", "20"]),
        ton: "achtung",
      });
    }
    if (gruppeAmStandort.length) {
      const namen = gruppeAmStandort.map((d) => d.name).join("; ");
      einordnung.push({
        thema: THEMA.denkmal,
        titel: t("Standort liegt in einer Denkmalgruppe", "Location is part of a monument ensemble"),
        text: t(
          `Der Standort liegt in: ${namen}. ` +
            "Eine Gruppe baulicher Anlagen ist als Ganzes ein Baudenkmal – unabhängig davon, ob das einzelne Gebäude für sich ein Baudenkmal ist (§ 3 Abs. 3 NDSchG). " +
            "Maßnahmen, die die Gruppe verändern, bedürfen einer Genehmigung (§ 10 Abs. 1 NDSchG).",
          `The location lies within: ${namen}. ` +
            "A group of structures is protected as a whole – regardless of whether the individual building is a listed building in its own right (§ 3(3) NDSchG). " +
            "Measures that alter the ensemble require a permit (§ 10(1) NDSchG).",
        ),
        paragraphen: refs("ndschg", ["3", "10"]),
        ton: "achtung",
      });
    }
    if (umgebung.length) {
      const eins = umgebung.length === 1;
      einordnung.push({
        thema: THEMA.denkmal,
        titel: t(
          `In der Umgebung (bis ${RADIUS_M} m) ${eins ? "ist ein Kulturdenkmal" : `sind ${umgebung.length} Kulturdenkmale`} verzeichnet`,
          `${eins ? "One cultural monument is" : `${umgebung.length} cultural monuments are`} recorded nearby (within ${RADIUS_M} m)`,
        ),
        text: t(
          "In der Umgebung eines Baudenkmals dürfen Anlagen nicht errichtet, geändert oder beseitigt werden, wenn dadurch sein Erscheinungsbild beeinträchtigt wird (§ 8 NDSchG). " +
            "Beeinflusst ein Vorhaben das Erscheinungsbild, ist eine Genehmigung erforderlich (§ 10 Abs. 1 Nr. 4 NDSchG).",
          "In the surroundings of a listed building, structures may not be erected, altered or removed if this impairs its appearance (§ 8 NDSchG). " +
            "If a project affects the appearance, a permit is required (§ 10(1) no. 4 NDSchG).",
        ),
        paragraphen: refs("ndschg", ["8", "10"]),
        ton: amStandort.length ? "info" : "achtung",
      });
    }
    if (!amStandort.length && nutzerNenntDenkmal) {
      einordnung.push({
        thema: THEMA.denkmal,
        titel: t("Ihre Angabe: Denkmal auf dem Grundstück", "Your note: monument on the plot"),
        text: t(
          "Am Standort selbst ist im Denkmalatlas kein Denkmal verzeichnet. Ein Kulturdenkmal ist aber auch ohne Eintragung geschützt, wenn es die Merkmale des § 3 NDSchG erfüllt (§ 5 Abs. 1 NDSchG). " +
            "Klären Sie den Status vor der Planung mit der unteren Denkmalschutzbehörde der Stadt Oldenburg.",
          "The monument atlas records no monument at the location itself. However, a cultural monument is protected even without being listed if it meets the criteria of § 3 NDSchG (§ 5(1) NDSchG). " +
            "Please clarify the status with the City of Oldenburg’s monument protection authority before planning.",
        ),
        paragraphen: refs("ndschg", ["3", "5", "10"]),
        ton: "achtung",
      });
    }
    if (!denkmale.length && !nutzerNenntDenkmal) {
      einordnung.push({
        thema: THEMA.denkmal,
        titel: t(`Kein Kulturdenkmal im Umkreis von ${RADIUS_M} m verzeichnet`, `No cultural monument recorded within ${RADIUS_M} m`),
        text: t(
          "Im Denkmalatlas ist im Umkreis kein Kulturdenkmal eingetragen. Der Schutz hängt jedoch nicht von der Eintragung ab (§ 5 Abs. 1 NDSchG), und der Denkmalatlas wird noch vervollständigt.",
          "The monument atlas lists no cultural monument in the vicinity. Protection does not, however, depend on being listed (§ 5(1) NDSchG), and the atlas is still being completed.",
        ),
        paragraphen: refs("ndschg", ["5"]),
        ton: "neutral",
      });
    }
    if (amStandort.length || umgebung.length || nutzerNenntDenkmal) {
      einordnung.push({
        thema: THEMA.zusammen,
        titel: t("Baurecht und Denkmalrecht gelten nebeneinander", "Building law and monument law apply side by side"),
        text: t(
          "Das Bauplanungsrecht lässt andere öffentlich-rechtliche Vorschriften ausdrücklich unberührt (§ 29 Abs. 2 BauGB). Planungsrechtliche Zulässigkeit und denkmalrechtliche Genehmigung sind also getrennt zu prüfen.",
          "Planning law expressly leaves other public-law provisions unaffected (§ 29(2) BauGB). Planning permissibility and the monument permit must therefore be assessed separately.",
        ),
        paragraphen: refs("baugb", ["29"]),
        ton: "neutral",
      });
    }
  }

  einordnung.push({
    thema: THEMA.allgemein,
    titel: t("Bei Erdarbeiten", "For earthworks"),
    text: t(
      "Wer Erdarbeiten an einer Stelle plant, an der Kulturdenkmale (z. B. archäologische Funde) vermutet werden, braucht eine Genehmigung (§ 13 NDSchG). Bodenfunde sind unverzüglich anzuzeigen (§ 14 NDSchG).",
      "Anyone planning earthworks where cultural monuments (e.g. archaeological finds) are suspected needs a permit (§ 13 NDSchG). Finds in the ground must be reported without delay (§ 14 NDSchG).",
    ),
    paragraphen: refs("ndschg", ["13", "14"]),
    ton: "neutral",
  });

  return { eingabe: `${strasse} ${hausnummer}`, abgefragtAm, standort, bplan, denkmal, nutzerNenntDenkmal, einordnung, links };
}
