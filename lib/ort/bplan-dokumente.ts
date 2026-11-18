// Zusatzauskünfte aus der "Bebauungsplanauskunft" der Stadt Oldenburg (Kartenportal gis4ol):
//  - frei abrufbare Plan-Dokumente (Planzeichnung, Begründung …) als PDF-Anhänge der rechtsverbindlichen Pläne
//  - Bebauungspläne in Aufstellung, Veränderungssperren und vom OVG für unwirksam erklärte Pläne am Standort
// Alles ohne KI. Fällt der Dienst aus, fehlen nur diese Zusatzangaben – die Hauptauskunft bleibt bestehen.
import { holeJson } from "./abruf";
import { gebiet, type Sprache, zweisprachig } from "../sprache";

const DIENST = "https://gis4ol.oldenburg.de/portal/sharing/servers/b0a09ae4c16f48e09d380fb5208427b3/rest/services/FD400/FD400_Bebauungsplanauskunft/MapServer";
export const KARTENPORTAL_QUELLE = "Stadt Oldenburg: Bebauungsplanauskunft (Kartenportal Bauen & Wohnen)";

const LAYER = { rechtsverbindlich: 12, inAufstellung: 7, veraenderungssperre: [10, 11], unwirksam: 15 } as const;

export interface PlanDokument {
  art: string;
  name: string;
  url: string;
  groesseMB: number;
}

export interface WeitererPlan {
  art: "in-aufstellung" | "veraenderungssperre" | "unwirksam";
  nummer: string;
  name: string;
  /** z. B. "Aufstellungsbeschluss 01.02.2020" oder "gültig bis 31.12.2026" */
  hinweis?: string;
}

interface Abfrage {
  features?: { attributes: Record<string, string | number | null> }[];
  error?: unknown;
}

interface Anhaenge {
  attachmentGroups?: { parentObjectId: number; attachmentInfos: { id: number; name: string; contentType: string; size: number }[] }[];
  error?: unknown;
}

const datum = (ms: unknown, sprache: Sprache = "de") =>
  typeof ms === "number" ? new Date(ms).toLocaleDateString(gebiet(sprache), { timeZone: "Europe/Berlin", day: "2-digit", month: "2-digit", year: "numeric" }) : undefined;

function punktAbfrage(layer: number, lat: number, lon: number, felder = "*") {
  const p = new URLSearchParams({
    geometry: `${lon},${lat}`,
    geometryType: "esriGeometryPoint",
    inSR: "4326",
    spatialRel: "esriSpatialRelIntersects",
    outFields: felder,
    returnGeometry: "false",
    f: "json",
  });
  return holeJson<Abfrage>(`${DIENST}/${layer}/query?${p}`);
}

function dokumentArt(name: string): string {
  const n = name.toLowerCase();
  if (n.includes("planzeichnung")) return "Planzeichnung";
  if (n.includes("begr")) return "Begründung";
  if (n.includes("text")) return "Textliche Festsetzungen";
  if (n.includes("umwelt")) return "Umweltbericht";
  return "Dokument";
}

const REIHENFOLGE = ["Planzeichnung", "Textliche Festsetzungen", "Begründung", "Umweltbericht", "Dokument"];

/** PDF-Dokumente der rechtsverbindlichen Pläne am Standort, nach Plannummer. */
export async function planDokumente(lat: number, lon: number): Promise<Map<string, PlanDokument[]> | null> {
  try {
    const plaene = await punktAbfrage(LAYER.rechtsverbindlich, lat, lon, "OBJECTID,Planverfahren");
    if (plaene.error || !plaene.features) return null;
    const ids = plaene.features.map((f) => Number(f.attributes.OBJECTID)).filter(Boolean);
    const ergebnis = new Map<string, PlanDokument[]>();
    if (!ids.length) return ergebnis;
    const nummerZuId = new Map(plaene.features.map((f) => [Number(f.attributes.OBJECTID), String(f.attributes.Planverfahren ?? "").trim()]));
    const a = await holeJson<Anhaenge>(`${DIENST}/${LAYER.rechtsverbindlich}/queryAttachments?objectIds=${ids.join(",")}&f=json`);
    if (a.error || !a.attachmentGroups) return null;
    for (const g of a.attachmentGroups) {
      const nummer = nummerZuId.get(g.parentObjectId);
      if (!nummer) continue;
      const docs = g.attachmentInfos
        .filter((x) => x.contentType === "application/pdf")
        .map((x) => ({
          art: dokumentArt(x.name),
          name: x.name.replace(/\s+\.pdf$/i, ".pdf"),
          url: `${DIENST}/${LAYER.rechtsverbindlich}/${g.parentObjectId}/attachments/${x.id}`,
          groesseMB: Math.round((x.size / 1024 / 1024) * 10) / 10,
        }))
        .sort((x, y) => REIHENFOLGE.indexOf(x.art) - REIHENFOLGE.indexOf(y.art));
      ergebnis.set(nummer, [...(ergebnis.get(nummer) ?? []), ...docs]);
    }
    return ergebnis;
  } catch {
    return null;
  }
}

/** Pläne in Aufstellung, Veränderungssperren und unwirksame Pläne am Standort. null = Dienst nicht erreichbar. */
export async function weiterePlaene(lat: number, lon: number, sprache: Sprache = "de"): Promise<WeitererPlan[] | null> {
  const t = zweisprachig(sprache);
  try {
    const [auf, sperren, unwirksam] = await Promise.all([
      punktAbfrage(LAYER.inAufstellung, lat, lon),
      Promise.all(LAYER.veraenderungssperre.map((l) => punktAbfrage(l, lat, lon))),
      punktAbfrage(LAYER.unwirksam, lat, lon),
    ]);
    if ([auf, unwirksam, ...sperren].some((x) => x.error || !x.features)) return null;
    const plan = (art: WeitererPlan["art"], x: Record<string, string | number | null>, hinweis?: string): WeitererPlan => ({
      art,
      nummer: String(x.Planverfahren ?? "").trim(),
      name: String(x.Name ?? "").trim(),
      hinweis,
    });
    return [
      ...auf.features!.map((f) => {
        const d = datum(f.attributes.Aufstellungsbeschluss_Rat_VA, sprache);
        return plan("in-aufstellung", f.attributes, d ? t(`Aufstellungsbeschluss ${d}`, `decision to prepare ${d}`) : undefined);
      }),
      ...sperren.flatMap((s) =>
        s.features!.map((f) => {
          const bis = datum(f.attributes["gültig_bis"], sprache);
          return plan("veraenderungssperre", f.attributes, bis ? t(`gültig bis ${bis}`, `valid until ${bis}`) : undefined);
        }),
      ),
      ...unwirksam.features!.map((f) => plan("unwirksam", f.attributes)),
    ];
  } catch {
    return null;
  }
}
