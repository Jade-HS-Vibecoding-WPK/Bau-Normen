// Ortsauskunft: Adresse in Deutschland -> Standort -> B-Pläne und Denkmale aus den Diensten des Landes und der Stadt
// (lib/ort/dienste) -> feste, nachvollziehbare Regeln, welche Paragraphen zu beachten sind (Landesrecht über
// data/gegenstuecke). Keine KI beteiligt. Wo kein Dienst angebunden ist, sagt die Auskunft das offen.
// "Kein Plan" sagt sie nur, wenn ein Dienst nachweislich ALLE Pläne enthält – sonst "nicht verzeichnet".
//
// Grundsatz: Wenn ein Dienst nicht antwortet, sagen wir "keine Aussage möglich" –
// niemals "kein B-Plan" oder "kein Denkmal", nur weil eine Abfrage fehlgeschlagen ist.
// Alle Texte stehen zweisprachig (Deutsch/Englisch) nebeneinander; Paragraphen bleiben im deutschen Original.
import { alleGesetze, gegenstuecke, landesgesetz } from "../gesetze";
import { landNamens } from "../laender";
import { gebiet, type Sprache, zweisprachig } from "../sprache";
import type { Antwort, NormRef, OrtAnsicht } from "../typen";
import { BPLAN_QUELLE, BPLAN_VIEWER } from "./bplan";
import { planDokumente, weiterePlaene } from "./bplan-dokumente";
import { BPLAN_DIENSTE, DENKMAL_DIENSTE, diensteFuer, type DienstErgebnis, type PlanTreffer } from "./dienste";
import { type AdressEingabe, findeStandort } from "./standort";

const RADIUS_M = 50;

function refs(gesetzId: string, ids: string[]): NormRef[] {
  const g = alleGesetze().get(gesetzId);
  return ids.flatMap((id) => {
    const n = g?.normen.find((x) => x.id === id);
    return n && g ? [{ gesetz: g.kurz, id, bez: n.bez, titel: n.titel }] : [];
  });
}

/** Zitierweise mehrerer Vorschriften eines Gesetzes: "§ 8 NDSchG", "§§ 19, 20 NDSchG", "Art. 10, 11 BayDSchG" */
function zitat(r: NormRef[]): string {
  if (!r.length) return "";
  const sortiert = [...r].sort((a, b) => a.bez.localeCompare(b.bez, "de", { numeric: true }));
  const teile = sortiert.map((x) => x.bez.match(/^(§|Art\.)\s*(.+)$/));
  const zeichen = teile[0]?.[1];
  if (zeichen && teile.every((m) => m?.[1] === zeichen))
    return `${zeichen === "§" && r.length > 1 ? "§§" : zeichen} ${teile.map((m) => m![2]).join(", ")} ${r[0].gesetz}`;
  return `${sortiert.map((x) => x.bez).join(", ")} ${r[0].gesetz}`;
}

const klammer = (s: string) => (s ? ` (${s})` : "");

const norm = (s?: string) => (s ?? "").toLowerCase().replace(/str\./g, "straße").replace(/[\s-]+/g, "");

interface Zusammengefasst<T> {
  status: "ok";
  treffer: T[];
  /** Ein vollständiger Dienst hat geantwortet – nur dann bedeutet "nichts gefunden" wirklich "keins" */
  vollstaendig: boolean;
  quelle: string;
  /** Hinweise zur Abdeckung der unvollständigen Dienste */
  abdeckung: string[];
  /** Dienste, die nicht geantwortet haben */
  ausgefallen: string[];
}

/** Antworten mehrerer Dienste zusammenführen (doppelte Treffer nur einmal). null = kein Dienst angebunden. */
function zusammenfassen<T, D extends { quelle: string; vollstaendig: boolean; abdeckung?: { de: string; en: string } }>(
  dienste: D[],
  ergebnisse: DienstErgebnis<T>[],
  schluessel: (x: T) => string,
  sprache: Sprache,
): Zusammengefasst<T> | { status: "fehler"; hinweis: string } | null {
  if (!dienste.length) return null;
  const ok = dienste.map((d, i) => ({ d, e: ergebnisse[i] })).filter((x): x is { d: D; e: { status: "ok"; treffer: T[] } } => x.e.status === "ok");
  if (!ok.length) return { status: "fehler", hinweis: ergebnisse.map((e) => (e.status === "fehler" ? e.hinweis : "")).filter(Boolean).join(" ") };
  const gesehen = new Set<string>();
  const treffer = ok.flatMap((x) => x.e.treffer).filter((x) => !gesehen.has(schluessel(x)) && !!gesehen.add(schluessel(x)));
  return {
    status: "ok",
    treffer,
    vollstaendig: ok.some((x) => x.d.vollstaendig),
    quelle: ok.map((x) => x.d.quelle).join(" · "),
    // bei mehreren Diensten mit Quellenname davor, bei einem genügt der Hinweis (die Quelle steht direkt darüber)
    abdeckung: ok.filter((x) => !x.d.vollstaendig && x.d.abdeckung).map((x) => (ok.length > 1 ? `${x.d.quelle}: ${x.d.abdeckung![sprache]}` : x.d.abdeckung![sprache])),
    ausgefallen: dienste.filter((_, i) => ergebnisse[i].status === "fehler").map((d) => d.quelle),
  };
}

/** Obergrenze je Dienst: Manche Dienste fragen mehrmals nacheinander ab – länger als das wartet die Auskunft nicht. */
const FRIST_MS = 15000;
const frist = <T,>(p: Promise<T>, ersatz: () => T): Promise<T> =>
  Promise.race([p, new Promise<T>((ok) => setTimeout(() => ok(ersatz()), FRIST_MS))]);

/**
 * Derselbe Plan aus einem Landes- und einem Kreis- bzw. Gemeindedienst: Die Dienste schreiben Nummer und Namen verschieden
 * ("_190__" / "190", "549-Altstadt, Duisburg" / "Altstadt", "Eisenbahnstraße - Süd, Freiburg im Breisgau" /
 * "Bebauungsplan "Eisenbahnstraße-Süd""). Die Dienste sind von allgemein nach genau sortiert – der genauere gewinnt.
 * Verglichen wird nur zwischen verschiedenen Diensten (innerhalb eines Dienstes teilen Änderungen dieselbe Nummer).
 */
function ohneDoppelte(ergebnisse: DienstErgebnis<PlanTreffer>[], ort: string): DienstErgebnis<PlanTreffer>[] {
  const nr = (s: string) => s.toLowerCase().replace(/[^0-9a-zäöü]/g, "").replace(/^0+/, "");
  const ortszusatz = ort ? new RegExp(`\\s*[–,-]\\s*${ort.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*$`, "i") : null;
  const nm = (s: string) =>
    (ortszusatz ? s.replace(ortszusatz, "") : s)
      .toLowerCase()
      .replace(/ß/g, "ss")
      .replace(/^\s*\d+[a-z]?\s*[-–:]\s*/, "")
      .replace(/bebauungsplan(es)?/g, "")
      .replace(/[^0-9a-zäöü]/g, "");
  const gesehen: { nr: string; nm: string }[] = [];
  const aus = [...ergebnisse];
  for (let i = aus.length - 1; i >= 0; i--) {
    const e = aus[i];
    if (e.status !== "ok") continue;
    const eigene = e.treffer.map((p) => ({ nr: nr(p.nummer), nm: nm(p.name) }));
    aus[i] = {
      ...e,
      treffer: e.treffer.filter((_, k) => !gesehen.some((g) => (eigene[k].nr && g.nr === eigene[k].nr) || (eigene[k].nm.length > 3 && g.nm === eigene[k].nm))),
    };
    gesehen.push(...eigene);
  }
  return aus;
}

/** Ein Dienst, der wirft statt "fehler" zu melden oder die Frist überschreitet, zählt als ausgefallen */
const sicher = <T,>(p: Promise<DienstErgebnis<T>>, sprache: Sprache): Promise<DienstErgebnis<T>> =>
  frist(
    p.catch(() => ({ status: "fehler" as const, hinweis: sprache === "en" ? "Service not reachable. Please try again later." : "Dienst nicht erreichbar. Bitte später erneut versuchen." })),
    () => ({ status: "fehler" as const, hinweis: sprache === "en" ? "The service did not respond in time (usually overload or an outage at the provider). Please try again later." : "Der Dienst hat nicht rechtzeitig geantwortet (meist Überlastung oder Störung beim Anbieter). Bitte später erneut versuchen." }),
  );

/** Ortsauskunft als Antwort – bei mehrdeutiger Adresse (Straße in mehreren Orten) als Rückfrage. */
export async function ortsAntwort(e: AdressEingabe, frage: string, sprache: Sprache = "de"): Promise<Antwort> {
  const standort = await findeStandort(e, sprache);
  if (standort.status === "mehrdeutig") return { art: "auswahl", frage: standort.hinweis, optionen: standort.kandidaten };
  return { art: "ort", ort: await ortsauskunft(e, standort, frage, sprache) };
}

async function ortsauskunft(e: AdressEingabe, standort: Exclude<Awaited<ReturnType<typeof findeStandort>>, { status: "mehrdeutig" }>, frage: string, sprache: Sprache): Promise<OrtAnsicht> {
  const { strasse, hausnummer } = e;
  const t = zweisprachig(sprache);
  const nutzerNenntDenkmal = /denkmal|monument|listed/i.test(frage);
  const abgefragtAm = new Date().toLocaleString(gebiet(sprache), { timeZone: "Europe/Berlin", dateStyle: "medium", timeStyle: "short" });
  const eingabe = [`${strasse} ${hausnummer}`, [e.plz, e.ort].filter(Boolean).join(" ")].filter(Boolean).join(", ");
  const einordnung: OrtAnsicht["einordnung"] = [];
  const oldenburg = standort.status === "ok" && standort.oldenburg;
  const links: OrtAnsicht["links"] = [
    ...(oldenburg
      ? [
          { label: t("Kartenportal Bauen & Wohnen (Stadt Oldenburg)", "Map portal “Bauen & Wohnen” (City of Oldenburg)"), url: BPLAN_VIEWER },
          { label: t("Pläne in Aufstellung (Beteiligungsportal)", "Plans in preparation (participation portal)"), url: "https://oldenburg.planungsbeteiligung.de/" },
        ]
      : []),
  ];
  const THEMA = {
    standort: t("Standort", "Location"),
    planung: t("Bauplanungsrecht", "Planning law"),
    ordnung: t("Bauordnungsrecht", "Building regulations"),
    denkmal: t("Denkmalrecht", "Monument protection law"),
    zusammen: t("Zusammenspiel", "Interplay"),
    allgemein: t("Allgemein", "General"),
  };

  if (standort.status !== "ok") {
    const hinweis = t("Nicht abgefragt, Standort unbekannt.", "Not queried, location unknown.");
    return {
      eingabe,
      abgefragtAm,
      standort,
      bplan: { status: "fehler", hinweis, quelle: "" },
      denkmal: { status: "fehler", hinweis, quelle: "" },
      nutzerNenntDenkmal,
      einordnung,
      links,
    };
  }

  // Dienste für Land, Landkreis und Gemeinde (landesweite zuerst) – alle gleichzeitig abfragen. Im Browser (Online-Version)
  // nur Dienste, die Abfragen aus fremden Webseiten erlauben (browser: true); die übrigen nutzt nur die lokale Fassung.
  const imBrowser = typeof window !== "undefined";
  const nutzbar = <T extends { browser: boolean }>(d: T) => !imBrowser || d.browser;
  const bpDienste = diensteFuer(BPLAN_DIENSTE, standort.land, standort.ort, standort.kreis).filter(nutzbar);
  const dmDienste = diensteFuer(DENKMAL_DIENSTE, standort.land, standort.ort, standort.kreis).filter(nutzbar);
  const [bpErg, dmErg, dokumente, weitere] = await Promise.all([
    Promise.all(bpDienste.map((d) => sicher(d.abfrage(standort.lat, standort.lon, sprache), sprache))),
    Promise.all(dmDienste.map((d) => sicher(d.abfrage(standort.lat, standort.lon, RADIUS_M, sprache), sprache))),
    // null = nicht abrufbar (die Auskunft sagt das dann offen)
    oldenburg ? frist(planDokumente(standort.lat, standort.lon).catch(() => null), () => null) : null,
    oldenburg ? frist(weiterePlaene(standort.lat, standort.lon, sprache).catch(() => null), () => null) : null,
  ]);
  const bp = zusammenfassen(bpDienste, ohneDoppelte(bpErg, standort.ort), (p) => `${p.nummer}|${p.name}`, sprache);
  // Veränderungssperren, die ein Dienst mitführt (z. B. Landkreis Aurich), sind keine Pläne: getrennt anzeigen – wie die
  // laufenden Verfahren aus dem Oldenburger Kartenportal. null = nicht abrufbar (nur Oldenburg fragt sie eigens ab).
  const sperren = bp?.status === "ok" ? bp.treffer.filter((p) => p.sicherung === "veraenderungssperre") : [];
  if (bp?.status === "ok") bp.treffer = bp.treffer.filter((p) => !p.sicherung);
  const ausDiensten = sperren.map((s) => ({ art: "veraenderungssperre" as const, nummer: s.nummer, name: s.name }));
  const weitereAlle = oldenburg ? (weitere === null ? null : [...weitere, ...ausDiensten]) : ausDiensten.length ? ausDiensten : null;
  const dm = zusammenfassen(dmDienste, dmErg, (d) => `${d.name}|${d.anschrift ?? ""}|${d.entfernungM}`, sprache);
  for (const d of [...bpDienste, ...dmDienste])
    if (d.viewer && !links.some((l) => l.url === d.viewer)) links.push({ label: `${d.quelle} ↗`.replace(/ ↗$/, ""), url: d.viewer });
  const ausfall = (x: { ausgefallen: string[] }) =>
    x.ausgefallen.length ? t(` Nicht erreichbar war: ${x.ausgefallen.join(", ")}.`, ` Not reachable: ${x.ausgefallen.join(", ")}.`) : "";
  const ortText = standort.ort || t("diesen Ort", "this place");
  const landText = standort.land || t("das jeweilige Bundesland", "the respective state");

  if (!standort.hausnummerGefunden) {
    einordnung.push({
      thema: THEMA.standort,
      titel: t("Hausnummer nicht eindeutig gefunden", "House number not clearly found"),
      text: t(
        `Die Hausnummer „${hausnummer}“ ist im Adressdatenbestand nicht verzeichnet. Die Abfrage nutzt deshalb einen Punkt auf der Straße. Ergebnisse können für Ihr Grundstück abweichen. Bitte im Kartenportal der Stadt prüfen.`,
        `House number “${hausnummer}” is not listed in the address data. The query therefore uses a point on the street. Results may differ for your plot. Please check in the city’s map portal.`,
      ),
      paragraphen: [],
      ton: "achtung",
    });
  }

  // --- Bauplanungsrecht ---
  let bplan: OrtAnsicht["bplan"];
  if (bp === null) {
    bplan = {
      status: "fehler",
      hinweis: t(`Für ${ortText} ist noch kein Bebauungsplan-Dienst angebunden.`, `No development plan service is connected for ${ortText} yet.`),
      quelle: t("nicht angebunden", "not connected"),
      nichtAngebunden: true,
    };
    einordnung.push({
      thema: THEMA.planung,
      titel: t("Bebauungsplan: keine Aussage möglich", "Development plan: no statement possible"),
      text: t(
        `Für ${ortText} ist bisher kein amtlicher Bebauungsplan-Dienst angebunden. Ob für den Standort ein Bebauungsplan gilt, erfahren Sie bei der Gemeinde (Geoportal oder Stadtplanungsamt). ` +
          "Gilt ein rechtsverbindlicher Bebauungsplan, ist ein Vorhaben nach § 30 BauGB zu beurteilen; sonst nach § 34 BauGB (im Zusammenhang bebauter Ortsteil) oder § 35 BauGB (Außenbereich).",
        `No official development plan service is connected for ${ortText} yet. Whether a development plan applies at this location can be found out from the municipality (geoportal or planning office). ` +
          "If a legally binding development plan applies, a project is assessed under § 30 BauGB; otherwise under § 34 BauGB (built-up area) or § 35 BauGB (outer area).",
      ),
      paragraphen: refs("baugb", ["30", "34", "35"]),
      ton: "achtung",
    });
  } else if (bp.status === "fehler") {
    bplan = { status: "fehler", hinweis: bp.hinweis, quelle: bpDienste.map((d) => d.quelle).join(" · ") };
    einordnung.push({
      thema: THEMA.planung,
      titel: t("Keine Aussage zum Bebauungsplan möglich", "No statement on the development plan possible"),
      text: `${bp.hinweis} ${t("Ob ein Bebauungsplan gilt, bitte bei der Gemeinde prüfen (Geoportal oder Stadtplanungsamt).", "Please check with the municipality (geoportal or planning office) whether a development plan applies.")}`,
      paragraphen: [],
      ton: "achtung",
    });
  } else if (bp.treffer.length) {
    const mitDokumenten = bp.treffer.map((p) => ({ ...p, dokumente: dokumente?.get(p.nummer) ?? p.dokumente ?? [] }));
    bplan = { status: "gefunden", plaene: mitDokumenten, weitere: weitereAlle, dokumenteAbrufbar: !oldenburg || dokumente !== null, quelle: bp.quelle, vollstaendig: bp.vollstaendig, ...(bp.abdeckung.length ? { abdeckung: bp.abdeckung.join(" ") } : {}), ...(bp.ausgefallen.length ? { ausgefallen: bp.ausgefallen } : {}) };
    const vhb = bp.treffer.some((p) => p.vorhabenbezogen);
    const mehrere = bp.treffer.length > 1;
    const liste = bp.treffer.map((p) => (p.nummer ? `Nr. ${p.nummer} „${p.name}“` : `„${p.name}“`)).join(", ");
    einordnung.push({
      thema: THEMA.planung,
      titel: mehrere ? t("Mehrere Bebauungspläne verzeichnet", "Several development plans listed") : t("Bebauungsplan verzeichnet", "Development plan listed"),
      text: t(
        `Für den Standort ${mehrere ? "sind folgende Bebauungspläne" : "ist der Bebauungsplan"} ${liste} als rechtsverbindlich verzeichnet. ` +
          "Ein Vorhaben ist dann nach § 30 BauGB zu beurteilen: Es darf den Festsetzungen nicht widersprechen, die Erschließung muss gesichert sein. " +
          (vhb ? "Bei einem vorhabenbezogenen Bebauungsplan gilt § 30 Abs. 2 in Verbindung mit § 12 BauGB. " : "") +
          "Abweichungen von Festsetzungen sind nur über Ausnahmen oder Befreiungen möglich (§ 31 BauGB)." +
          (mehrere ? " Überlagern sich mehrere Pläne (z. B. Änderungen), kann das Zusammenspiel nur das Stadtplanungsamt verbindlich klären." : ""),
        `For this location, ${mehrere ? "the following development plans are" : "the development plan"} ${liste} ${mehrere ? "" : "is "}listed as legally binding. ` +
          "A project is then assessed under § 30 BauGB: it must not contradict the plan’s provisions, and access and utilities must be secured. " +
          (vhb ? "For a project-related development plan, § 30(2) in conjunction with § 12 BauGB applies. " : "") +
          "Deviations from the provisions are only possible by way of exceptions or exemptions (§ 31 BauGB)." +
          (mehrere ? " Where several plans overlap (e.g. amendments), only the city planning office can clarify their interplay bindingly." : ""),
      ) + ausfall(bp),
      paragraphen: refs("baugb", vhb ? ["30", "12", "31"] : ["30", "31"]),
      ton: "info",
    });
  } else {
    bplan = { status: "keiner", plaene: [], weitere: weitereAlle, dokumenteAbrufbar: !oldenburg || dokumente !== null, quelle: bp.quelle, vollstaendig: bp.vollstaendig, ...(bp.abdeckung.length ? { abdeckung: bp.abdeckung.join(" ") } : {}), ...(bp.ausgefallen.length ? { ausgefallen: bp.ausgefallen } : {}) };
    einordnung.push(
      bp.vollstaendig
        ? {
            thema: THEMA.planung,
            titel: t("Kein rechtsverbindlicher Bebauungsplan", "No legally binding development plan"),
            text: t(
              `Der Dienst (${bp.quelle}) enthält alle rechtsverbindlichen Bebauungspläne des Gebiets; für den Standort ist keiner verzeichnet. Die Zulässigkeit eines Vorhabens richtet sich dann nach § 34 BauGB (innerhalb eines im Zusammenhang bebauten Ortsteils) oder nach § 35 BauGB (Außenbereich). ` +
                "Welche Vorschrift gilt, hängt von der tatsächlichen Bebauung ab. Verbindlich klärt das die Bauaufsicht, z. B. über eine Bauvoranfrage.",
              `The service (${bp.quelle}) contains all legally binding development plans of the area; none is listed for this location. A project is then assessed under § 34 BauGB (within a built-up area) or § 35 BauGB (outer area). ` +
                "Which provision applies depends on the actual surrounding development. The building authority clarifies this bindingly, e.g. via a preliminary building enquiry.",
            ),
            paragraphen: refs("baugb", ["34", "35"]),
            ton: "info",
          }
        : {
            thema: THEMA.planung,
            titel: t("Kein Bebauungsplan verzeichnet, Dienst nicht vollständig", "No development plan listed, service not complete"),
            text:
              t(
                `In den angebundenen Diensten (${bp.quelle}) ist für den Standort kein rechtsverbindlicher Bebauungsplan verzeichnet. Diese Dienste enthalten nicht nachweislich alle Pläne. Ob doch einer gilt, klärt die Gemeinde (Stadtplanungsamt). ` +
                  "Gilt kein Plan, richtet sich die Zulässigkeit nach § 34 BauGB (im Zusammenhang bebauter Ortsteil) oder § 35 BauGB (Außenbereich).",
                `The connected services (${bp.quelle}) list no legally binding development plan for this location. These services are not proven to contain every plan. The municipality (planning office) can tell whether one applies after all. ` +
                  "If no plan applies, a project is assessed under § 34 BauGB (built-up area) or § 35 BauGB (outer area).",
              ) + ausfall(bp),
            paragraphen: refs("baugb", ["30", "34", "35"]),
            ton: "achtung",
          },
    );
  }

  // --- Laufende Planungen und Sicherungsinstrumente (Kartenportal der Stadt Oldenburg; Veränderungssperren auch aus
  // Kreisdiensten wie dem Landkreis Aurich) ---
  if (oldenburg && weitere === null) {
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
  } else if (weitereAlle) {
    const weitere = weitereAlle;
    const liste = (art: string) =>
      weitere
        .filter((w) => w.art === art)
        .map((w) => [w.nummer && `Nr. ${w.nummer}`, w.name && `„${w.name}“`, "hinweis" in w && w.hinweis && `(${w.hinweis})`].filter(Boolean).join(" "))
        .join(", ");
    // Woher die Angabe stammt: Oldenburger Kartenportal oder der Kreisdienst
    const woDe = oldenburg ? "Im Kartenportal der Stadt" : `Im Dienst (${bp && bp.status === "ok" ? bp.quelle : ""})`;
    const woEn = oldenburg ? "The city’s map portal lists" : `The service (${bp && bp.status === "ok" ? bp.quelle : ""}) lists`;
    if (weitere.some((w) => w.art === "veraenderungssperre")) {
      einordnung.push({
        thema: THEMA.planung,
        titel: t("Veränderungssperre verzeichnet", "Development freeze listed"),
        text: t(
          `${woDe} ist für den Standort eine Veränderungssperre verzeichnet: ${liste("veraenderungssperre")}. ` +
            "Eine Veränderungssperre kann insbesondere bestimmen, dass Vorhaben im Sinne des § 29 BauGB nicht durchgeführt und bauliche Anlagen nicht beseitigt werden dürfen. Ausnahmen sind möglich, wenn überwiegende öffentliche Belange nicht entgegenstehen (§ 14 Abs. 2 BauGB).",
          `${woEn} a development freeze for this location: ${liste("veraenderungssperre")}. ` +
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

  // --- Denkmalrecht: Denkmalschutzgesetz des Landes, in dem die Adresse liegt ---
  // Welche Vorschriften welches Thema regeln und ob der Schutz von der Eintragung abhängt, steht geprüft in
  // data/gegenstuecke/<gesetz>.json (mit wörtlichem Beleg). Ohne importiertes Gesetz: allgemeiner Text ohne Paragraphen.
  const dschg = landesgesetz(standort.land, "denkmalschutz");
  const dsg = dschg ? gegenstuecke(dschg.id) : undefined;
  const dsKurz = dschg?.kurz ?? landNamens(standort.land)?.denkmalKurz ?? t("Denkmalschutzgesetz des Landes", "state monument protection act");
  /** Vorschriften des Landes-Denkmalschutzgesetzes zu den Themen (jede nur einmal) */
  const ds = (...themen: string[]): NormRef[] => (dschg ? refs(dschg.id, [...new Set(themen.flatMap((k) => dsg?.themen[k] ?? []))]) : []);
  /** Fundstelle in Klammern, z. B. " (§§ 10, 24 NDSchG)" oder " (Art. 6 BayDSchG)" – leer, wenn das Gesetz fehlt */
  const ks = (...themen: string[]) => klammer(zitat(ds(...themen)));
  /** nur die erste (wichtigste) Vorschrift eines Themas */
  const ks1 = (thema: string) => klammer(zitat(ds(thema).slice(0, 1)));
  const fehltGesetz = t(
    ` Maßgeblich ist das Denkmalschutzgesetz des Landes (${dsKurz}); es ist noch nicht in der Bibliothek.`,
    ` The governing law is the state’s monument protection act (${dsKurz}); it is not in the library yet.`,
  );
  // Hängt der Schutz von der Eintragung ab? Nur nach dem geprüften Eintrag, mit dem wörtlichen Satz aus dem Gesetz
  const beleg = dsg?.belege?.schutzOhneEintragung;
  const belegBez = dschg && beleg ? refs(dschg.id, [beleg.norm])[0]?.bez : undefined;
  const belegText = dschg && beleg && belegBez ? ` (${belegBez} ${dschg.kurz}: „${beleg.satz}“)` : "";
  const eintragungSatz = !dschg
    ? t(
        `Ob ein Denkmal auch ohne Eintragung in die Denkmalliste geschützt ist, regelt das Denkmalschutzgesetz des Landes (${dsKurz}); es ist noch nicht in der Bibliothek.`,
        `Whether a monument is protected even without being entered in the list of monuments is governed by the state’s monument protection act (${dsKurz}); it is not in the library yet.`,
      )
    : dsg?.schutzOhneEintragung === true
      ? t(
          `Nach dem ${dschg.kurz} hängt der Schutz nicht von der Eintragung in die Denkmalliste ab${belegText}.`,
          `Under the ${dschg.kurz}, protection does not depend on being entered in the list of monuments${belegText}.`,
        )
      : dsg?.schutzOhneEintragung === false
        ? t(
            `Nach dem ${dschg.kurz} entsteht der Schutz grundsätzlich erst mit der Eintragung bzw. Unterschutzstellung${belegText}. Für einzelne Denkmalarten können Ausnahmen gelten, siehe die Vorschriften zur Eintragung.`,
            `Under the ${dschg.kurz}, protection generally only arises upon entry in the list or formal designation${belegText}. Exceptions may apply to certain kinds of monuments, see the provisions on entry.`,
          )
        : t(
            `Ob ein Denkmal nach dem ${dschg.kurz} auch ohne Eintragung geschützt ist, ist hier nicht hinterlegt. Bitte bei der Denkmalschutzbehörde klären.`,
            `Whether a monument is protected under the ${dschg.kurz} without being listed is not recorded here. Please ask the monument protection authority.`,
          );

  let denkmal: OrtAnsicht["denkmal"];
  if (dm === null) {
    // Gibt es im Land Dienste, nur nicht für diesen Ort (z. B. Brandenburg: nur Frankfurt (Oder)), den Ort nennen
    const imLandAngebunden = DENKMAL_DIENSTE.some((d) => d.gebiet.land === standort.land);
    const dmWo = imLandAngebunden && standort.ort ? `${standort.ort} (${landText})` : landText;
    denkmal = {
      status: "fehler",
      hinweis: t(`Für ${dmWo} ist noch kein Denkmal-Dienst angebunden.`, `No monument service is connected for ${dmWo} yet.`),
      quelle: t("nicht angebunden", "not connected"),
      nichtAngebunden: true,
    };
    einordnung.push({
      thema: THEMA.denkmal,
      titel: t("Denkmalschutz: keine Aussage möglich", "Monument protection: no statement possible"),
      text:
        t(
          `Für ${dmWo} ist kein amtlicher Denkmal-Dienst angebunden. Ob am Standort oder in der Umgebung ein Kulturdenkmal besteht, klären Sie mit der zuständigen Denkmalschutzbehörde oder dem Landesamt für Denkmalpflege. `,
          `No official monument service is connected for ${dmWo}. Please check with the competent monument protection authority or the state heritage office whether there is a cultural monument at or near this location. `,
        ) + eintragungSatz,
      paragraphen: ds("begriffe", "eintragung"),
      ton: "achtung",
    });
  } else if (dm.status === "fehler") {
    denkmal = { status: "fehler", hinweis: dm.hinweis, quelle: dmDienste.map((d) => d.quelle).join(" · ") };
    einordnung.push({
      thema: THEMA.denkmal,
      titel: t("Keine Aussage zum Denkmalschutz möglich", "No statement on monument protection possible"),
      text: `${dm.hinweis} ${t("Bitte in der amtlichen Denkmalkarte prüfen (unter „Weiterführend“) oder bei der Denkmalschutzbehörde nachfragen.", "Please check the official monument map (under “Further information”) or ask the monument protection authority.")}`,
      paragraphen: ds("eintragung"),
      ton: "achtung",
    });
  } else {
    const adr = norm(`${standort.adresse.split(",")[0]}`);
    const denkmale = dm.treffer.map((d) => ({ ...d, amStandort: d.entfernungM === 0 || (!!d.anschrift && norm(d.anschrift) === adr) }));
    const amStandort = denkmale.filter((d) => d.amStandort);
    const einzelAmStandort = amStandort.filter((d) => !d.gruppe);
    const gruppeAmStandort = amStandort.filter((d) => d.gruppe);
    const umgebung = denkmale.filter((d) => !d.amStandort);
    denkmal = {
      status: amStandort.length ? "am-standort" : umgebung.length ? "umgebung" : "keiner",
      denkmale,
      radiusM: RADIUS_M,
      quelle: dm.quelle,
      vollstaendig: dm.vollstaendig,
      ...(dm.abdeckung.length ? { abdeckung: dm.abdeckung.join(" ") } : {}),
      ...(dm.ausgefallen.length ? { ausgefallen: dm.ausgefallen } : {}),
    };
    const behoerde =
      t(
        `Zuständig ist die Denkmalschutzbehörde${oldenburg ? ", in Oldenburg die Stadt als untere Denkmalschutzbehörde" : ""}`,
        `The competent body is the monument protection authority${oldenburg ? ", in Oldenburg the city itself as the local authority" : ""}`,
      ) + `${ks("behoerden")}.`;

    if (einzelAmStandort.length) {
      const namen = einzelAmStandort
        .map((d) => {
          // Objekttyp (z. B. "Villa"), sonst die Ausweisung ("Bodendenkmal"); lange Beschreibungen (z. B. Sachsen) stehen
          // ohnehin in der Denkmalliste der Kachel, und was schon im Namen steht, wird nicht wiederholt
          const name = d.name.replace(/\.$/, "");
          const neu = (s?: string) => !!s && s.length <= 60 && !name.toLowerCase().includes(s.toLowerCase());
          const art = neu(d.objekttyp) ? d.objekttyp : neu(d.ausweisung) ? d.ausweisung : "";
          return art ? `${name} (${art})` : name;
        })
        .join("; ");
      einordnung.push({
        thema: THEMA.denkmal,
        titel: t("Am Standort ist ein Kulturdenkmal verzeichnet", "A cultural monument is recorded at this location"),
        text: dschg
          ? t(
              `Im Denkmal-Dienst verzeichnet: ${namen}. ` +
                `Wer ein Kulturdenkmal verändern, instand setzen, beseitigen oder seine Nutzung ändern will, braucht in der Regel eine Genehmigung bzw. Erlaubnis der Denkmalschutzbehörde${ks("genehmigungspflicht")}. ` +
                `Für Kulturdenkmale besteht eine Erhaltungspflicht${ks("erhaltungspflicht")}. ${behoerde}`,
              `Recorded in the monument service: ${namen}. ` +
                `Anyone who wants to alter, repair, remove a cultural monument or change its use generally needs a permit from the monument protection authority${ks("genehmigungspflicht")}. ` +
                `Cultural monuments must be preserved${ks("erhaltungspflicht")}. ${behoerde}`,
            )
          : t(
              `Im Denkmal-Dienst verzeichnet: ${namen}. Wer ein Kulturdenkmal verändern, beseitigen oder seine Nutzung ändern will, braucht in der Regel eine Genehmigung der Denkmalschutzbehörde.`,
              `Recorded in the monument service: ${namen}. Anyone who wants to alter or remove a cultural monument or change its use generally needs a permit from the monument protection authority.`,
            ) + fehltGesetz,
        paragraphen: ds("begriffe", "erhaltungspflicht", "genehmigungspflicht", "behoerden"),
        ton: "achtung",
      });
    }
    if (gruppeAmStandort.length) {
      const namen = gruppeAmStandort.map((d) => d.name).join("; ");
      einordnung.push({
        thema: THEMA.denkmal,
        titel: t("Standort liegt in einer Denkmalgruppe", "Location is part of a monument ensemble"),
        text:
          t(
            `Der Standort liegt in: ${namen}. ` +
              `Eine Gruppe baulicher Anlagen (Ensemble, Denkmalbereich, Sachgesamtheit) kann als Ganzes geschützt sein, auch wenn nicht jedes einzelne Gebäude für sich ein Denkmal ist${ks("begriffe")}. ` +
              `Maßnahmen, die die Gruppe oder ihr Erscheinungsbild verändern, können genehmigungspflichtig sein${ks("genehmigungspflicht")}.`,
            `The location lies within: ${namen}. ` +
              `A group of structures (ensemble, monument area) can be protected as a whole, even if not every individual building is a monument in its own right${ks("begriffe")}. ` +
              `Measures that alter the ensemble or its appearance may require a permit${ks("genehmigungspflicht")}.`,
          ) + (dschg ? "" : fehltGesetz),
        paragraphen: ds("begriffe", "genehmigungspflicht"),
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
        text:
          t(
            `Auch Vorhaben in der Umgebung eines Kulturdenkmals können einer denkmalrechtlichen Genehmigung bedürfen, wenn sie sein Erscheinungsbild beeinträchtigen können${ks("umgebungsschutz")}.`,
            `Projects in the surroundings of a cultural monument may also require a monument permit if they can impair its appearance${ks("umgebungsschutz")}.`,
          ) + (dschg ? "" : fehltGesetz),
        paragraphen: ds("umgebungsschutz", "genehmigungspflicht"),
        ton: amStandort.length ? "info" : "achtung",
      });
    }
    if (denkmale.length && dm.ausgefallen.length) {
      einordnung.push({
        thema: THEMA.denkmal,
        titel: t("Nicht alle Denkmal-Dienste erreichbar", "Not all monument services reachable"),
        text: t("Weitere Denkmale können in der Auskunft fehlen.", "Further monuments may be missing from this information.") + ausfall(dm),
        paragraphen: [],
        ton: "achtung",
      });
    }
    if (!amStandort.length && nutzerNenntDenkmal) {
      einordnung.push({
        thema: THEMA.denkmal,
        titel: t("Ihre Angabe: Denkmal auf dem Grundstück", "Your note: monument on the plot"),
        text:
          t(
            `Am Standort selbst ist im Denkmal-Dienst kein Denkmal verzeichnet${dm.vollstaendig ? "" : "; der Dienst enthält aber nicht nachweislich alle Denkmale"}. ${eintragungSatz} ` +
              `Klären Sie den Status vor der Planung mit der Denkmalschutzbehörde${oldenburg ? " der Stadt Oldenburg" : ""}.`,
            `The monument service records no monument at the location itself${dm.vollstaendig ? "" : "; but the service is not proven to contain every monument"}. ${eintragungSatz} ` +
              `Please clarify the status with the ${oldenburg ? "City of Oldenburg’s " : ""}monument protection authority before planning.`,
          ) + ausfall(dm),
        paragraphen: ds("begriffe", "eintragung", "genehmigungspflicht"),
        ton: "achtung",
      });
    }
    if (!denkmale.length && !nutzerNenntDenkmal) {
      einordnung.push(
        dm.vollstaendig
          ? {
              thema: THEMA.denkmal,
              titel: t(`Kein Kulturdenkmal im Umkreis von ${RADIUS_M} m verzeichnet`, `No cultural monument recorded within ${RADIUS_M} m`),
              text: t(
                `Der Dienst (${dm.quelle}) enthält alle eingetragenen Denkmale des Gebiets; im Umkreis ist keins verzeichnet. ${eintragungSatz}`,
                `The service (${dm.quelle}) contains all listed monuments of the area; none is recorded in the vicinity. ${eintragungSatz}`,
              ),
              paragraphen: ds("eintragung"),
              ton: "neutral",
            }
          : {
              thema: THEMA.denkmal,
              titel: t(
                `Kein Kulturdenkmal im Umkreis von ${RADIUS_M} m verzeichnet, Dienst nicht vollständig`,
                `No cultural monument recorded within ${RADIUS_M} m, service not complete`,
              ),
              text:
                t(
                  `In den angebundenen Diensten (${dm.quelle}) ist im Umkreis kein Kulturdenkmal verzeichnet. Diese Dienste enthalten nicht nachweislich alle Denkmale. ${eintragungSatz}`,
                  `The connected services (${dm.quelle}) record no cultural monument in the vicinity. These services are not proven to contain every monument. ${eintragungSatz}`,
                ) + ausfall(dm),
              paragraphen: ds("eintragung"),
              ton: dm.ausgefallen.length ? "achtung" : "neutral",
            },
      );
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

  // --- Bauordnungsrecht: Landesrecht des Landes, in dem die Adresse liegt ---
  const lbo = landesgesetz(standort.land, "bauordnung");
  if (lbo) {
    // welche Vorschriften die Themen regeln, steht geprüft in data/gegenstuecke/<gesetz>.json
    const themen = gegenstuecke(lbo.id)?.themen ?? {};
    const ids = ["genehmigungspflicht", "verfahrensfrei", "genehmigungsfreistellung", "vereinfachtes-verfahren", "baugenehmigungsverfahren", "abstandsflaechen"].flatMap((k) => themen[k] ?? []);
    einordnung.push({
      thema: THEMA.ordnung,
      titel: t(`Bauordnungsrecht: ${lbo.titel}`, `Building regulations: ${lbo.titel}`),
      text: t(
        `Ob ein Vorhaben eine Baugenehmigung braucht, regelt die ${lbo.kurz}: Genehmigungspflicht, verfahrensfreie und genehmigungsfreie Vorhaben, vereinfachtes Verfahren und Baugenehmigungsverfahren. Auch die Abstände zu den Grundstücksgrenzen stehen dort. Die einschlägigen Vorschriften:`,
        `Whether a project needs a building permit is governed by the ${lbo.kurz}: permit requirement, procedure-free and permit-free projects, simplified procedure and building permit procedure. Distances to plot boundaries are set out there as well. The relevant provisions:`,
      ),
      paragraphen: refs(lbo.id, [...new Set(ids)]),
      ton: "info",
    });
  } else {
    einordnung.push({
      thema: THEMA.ordnung,
      titel: t(`Bauordnungsrecht: Landesbauordnung ${landText}`, `Building regulations: building code of ${landText}`),
      text: t(
        `Genehmigungspflicht, Abstandsflächen und Bauausführung regelt die Bauordnung des Landes ${landText}. Sie ist noch nicht in der Bibliothek. Die Musterbauordnung zeigt den gemeinsamen Aufbau der Landesbauordnungen. Nummerierung und Inhalte weichen aber ab, verbindlich ist allein die Landesbauordnung.`,
        `Permit requirements, distance areas and construction are governed by the building code of ${landText}. It is not in the library yet. The model building code shows the common structure of the state building codes. Numbering and content differ, however; only the state building code is binding.`,
      ),
      paragraphen: refs("mbo", ["59", "61", "6"]),
      ton: "neutral",
    });
  }

  // --- Erdarbeiten und Bodenfunde: Denkmalschutzgesetz des Landes ---
  if (dschg && ds("erdarbeiten", "bodenfunde").length) {
    einordnung.push({
      thema: THEMA.allgemein,
      titel: t("Bei Erdarbeiten", "For earthworks"),
      text: t(
        `Nachforschungen und Erdarbeiten an Stellen, an denen Bodendenkmale bekannt sind oder vermutet werden, können genehmigungspflichtig sein${ks("erdarbeiten")}. Funde im Boden sind anzuzeigen${ks1("bodenfunde")}.`,
        `Investigations and earthworks where archaeological monuments are known or suspected may require a permit${ks("erdarbeiten")}. Finds in the ground must be reported${ks1("bodenfunde")}.`,
      ),
      paragraphen: ds("erdarbeiten", "bodenfunde"),
      ton: "neutral",
    });
  } else if (!dschg) {
    einordnung.push({
      thema: THEMA.allgemein,
      titel: t("Bei Erdarbeiten", "For earthworks"),
      text: t(
        `Für Erdarbeiten an Stellen mit Bodendenkmalen und für Funde im Boden gelten Genehmigungs- und Anzeigepflichten nach dem Denkmalschutzgesetz des Landes (${dsKurz}); es ist noch nicht in der Bibliothek.`,
        `Earthworks at sites with archaeological monuments and finds in the ground are subject to permit and reporting duties under the state’s monument protection act (${dsKurz}); it is not in the library yet.`,
      ),
      paragraphen: [],
      ton: "neutral",
    });
  }

  return { eingabe, abgefragtAm, standort, bplan, denkmal, nutzerNenntDenkmal, einordnung, links };
}
