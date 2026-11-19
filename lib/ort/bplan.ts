// Bebauungspläne der Stadt Oldenburg: welcher rechtsverbindliche B-Plan gilt an einem Punkt?
// Dienst: Open Data Stadt Oldenburg – "Umringe rechtsverbindlicher Bebauungspläne" (ArcGIS FeatureServer).
import { fehlerText, holeJson } from "./abruf";
import { gebiet, type Sprache, zweisprachig } from "../sprache";
import { inMeter } from "./geo";

const DIENST = "https://services5.arcgis.com/kqBnwL0FsBhsJf2P/arcgis/rest/services/Umringe_Bplan/FeatureServer/0/query";
export const BPLAN_QUELLE = "Stadt Oldenburg: Umringe rechtsverbindlicher Bebauungspläne (Open Data, dl-de/zero-2.0)";
export const BPLAN_VIEWER = "https://gis4ol.oldenburg.de/BauenWohnen/";

export interface BPlan {
  nummer: string;
  name: string;
  rechtsverbindlichSeit?: string;
  baunvo?: string;
  vorhabenbezogen: boolean;
  verfahren?: string;
  /** Planumring in Metern relativ zum Standort – für die Lageskizze */
  umriss: [number, number][][];
}

interface Antwort {
  features?: { attributes: Record<string, string | number | null>; geometry?: { rings: [number, number][][] } }[];
  error?: { message: string };
}

const VERFAHREN: Record<number, [string, string]> = {
  1: ["vereinfachtes Verfahren (§ 13 BauGB)", "simplified procedure (§ 13 BauGB)"],
  2: ["beschleunigtes Verfahren (§ 13a BauGB)", "accelerated procedure (§ 13a BauGB)"],
};

function datum(ms: unknown, sprache: Sprache): string | undefined {
  if (typeof ms !== "number") return undefined;
  return new Date(ms).toLocaleDateString(gebiet(sprache), { timeZone: "Europe/Berlin", day: "2-digit", month: "2-digit", year: "numeric" });
}

export async function bplaeneAmPunkt(lat: number, lon: number, sprache: Sprache = "de"): Promise<{ status: "ok"; plaene: BPlan[] } | { status: "fehler"; hinweis: string }> {
  const t = zweisprachig(sprache);
  const params = new URLSearchParams({
    geometry: `${lon},${lat}`,
    geometryType: "esriGeometryPoint",
    inSR: "4326",
    spatialRel: "esriSpatialRelIntersects",
    outFields: "Planverfahren,Name,BauNVO,rechtsverbindlich,Verfahren,Art",
    returnGeometry: "true",
    outSR: "4326",
    maxAllowableOffset: "0.00001",
    geometryPrecision: "6",
    f: "json",
  });
  try {
    const a = await holeJson<Antwort>(`${DIENST}?${params}`);
    if (a.error || !a.features) {
      const z = a.error ? `: ${a.error.message}` : "";
      return { status: "fehler", hinweis: t(`B-Plan-Dienst meldet einen Fehler${z}.`, `Development plan service reports an error${z}.`) };
    }
    const plaene = a.features.map(({ attributes: x, geometry }) => ({
      nummer: String(x.Planverfahren ?? "").trim(),
      name: String(x.Name ?? "").trim(),
      rechtsverbindlichSeit: datum(x.rechtsverbindlich, sprache),
      baunvo: x.BauNVO ? String(x.BauNVO) : undefined,
      vorhabenbezogen: /vhb/i.test(String(x.Planverfahren ?? "")),
      verfahren: typeof x.Verfahren === "number" && VERFAHREN[x.Verfahren] ? t(...VERFAHREN[x.Verfahren]) : undefined,
      umriss: geometry?.rings ? inMeter([lon, lat], geometry.rings, 300) : [],
    }));
    return { status: "ok", plaene };
  } catch (e) {
    return { status: "fehler", hinweis: t(`B-Plan-Dienst nicht erreichbar: ${fehlerText(e, "de")}.`, `Development plan service unreachable: ${fehlerText(e, "en")}.`) };
  }
}
