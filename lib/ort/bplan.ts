// Bebauungspläne der Stadt Oldenburg: welcher rechtsverbindliche B-Plan gilt an einem Punkt?
// Dienst: Open Data Stadt Oldenburg – "Umringe rechtsverbindlicher Bebauungspläne" (ArcGIS FeatureServer).
import { DienstFehler, holeJson } from "./abruf";

const DIENST = "https://services5.arcgis.com/kqBnwL0FsBhsJf2P/arcgis/rest/services/Umringe_Bplan/FeatureServer/0/query";
export const BPLAN_QUELLE = "Stadt Oldenburg – Umringe rechtsverbindlicher Bebauungspläne (Open Data)";
export const BPLAN_VIEWER = "https://gis4ol.oldenburg.de/BauenWohnen/";

export interface BPlan {
  nummer: string;
  name: string;
  rechtsverbindlichSeit?: string;
  baunvo?: string;
  vorhabenbezogen: boolean;
  verfahren?: string;
}

interface Antwort {
  features?: { attributes: Record<string, string | number | null> }[];
  error?: { message: string };
}

const VERFAHREN: Record<number, string> = { 1: "vereinfachtes Verfahren (§ 13 BauGB)", 2: "beschleunigtes Verfahren (§ 13a BauGB)" };

function datum(ms: unknown): string | undefined {
  if (typeof ms !== "number") return undefined;
  return new Date(ms).toLocaleDateString("de-DE", { timeZone: "Europe/Berlin", day: "2-digit", month: "2-digit", year: "numeric" });
}

export async function bplaeneAmPunkt(lat: number, lon: number): Promise<{ status: "ok"; plaene: BPlan[] } | { status: "fehler"; hinweis: string }> {
  const params = new URLSearchParams({
    geometry: `${lon},${lat}`,
    geometryType: "esriGeometryPoint",
    inSR: "4326",
    spatialRel: "esriSpatialRelIntersects",
    outFields: "Planverfahren,Name,BauNVO,rechtsverbindlich,Verfahren,Art",
    returnGeometry: "false",
    f: "json",
  });
  try {
    const a = await holeJson<Antwort>(`${DIENST}?${params}`);
    if (a.error || !a.features) return { status: "fehler", hinweis: `B-Plan-Dienst meldet einen Fehler${a.error ? `: ${a.error.message}` : ""}.` };
    const plaene = a.features.map(({ attributes: x }) => ({
      nummer: String(x.Planverfahren ?? "").trim(),
      name: String(x.Name ?? "").trim(),
      rechtsverbindlichSeit: datum(x.rechtsverbindlich),
      baunvo: x.BauNVO ? String(x.BauNVO) : undefined,
      vorhabenbezogen: /vhb/i.test(String(x.Planverfahren ?? "")),
      verfahren: typeof x.Verfahren === "number" ? VERFAHREN[x.Verfahren] : undefined,
    }));
    return { status: "ok", plaene };
  } catch (e) {
    return { status: "fehler", hinweis: `B-Plan-Dienst nicht erreichbar: ${(e as DienstFehler).message}.` };
  }
}
