// Bausteine für Bebauungsplan-Dienste, die nach demselben Muster abgefragt werden:
//  - ArcGIS-MapServer/FeatureServer: Abfrage "Welche Flächen enthalten den Punkt?" (der Server prüft die Lage)
//  - WFS 2.0 bzw. OGC API Features mit GeoJSON: kleines Rechteck um den Punkt holen, dann selbst prüfen, welche Fläche
//    den Punkt wirklich enthält
// Jeder Dienst liefert eine eigene Umsetzung "zuPlan": Sie entscheidet anhand der Felder, ob ein Eintrag ein
// rechtskräftiger Bebauungsplan ist (sonst null) und wie Nummer, Name, Datum und Link heißen. So bleibt die Filterregel
// je Dienst sichtbar und nachprüfbar.
import { holeJson } from "../abruf";
import type { Sprache } from "../../sprache";
import { esriGeometrie, fehlerErgebnis, geoJsonObjekte, liegtIn, LON_LAT, umrechnen, umrissVon, unlesbar, type Punkt } from "./hilfen";
import type { BplanDienst, DienstErgebnis, PlanTreffer } from "./typen";

/** Was ein Dienst aus einem Eintrag macht: Plan (ohne Umriss) oder null = kein rechtskräftiger Bebauungsplan */
export type ZuPlan = (x: Record<string, unknown>, sprache: Sprache) => Omit<PlanTreffer, "umriss"> | null;

type DienstKopf = Omit<BplanDienst, "abfrage">;

interface EsriAntwort {
  features?: { attributes: Record<string, unknown>; geometry?: unknown }[];
  error?: { message?: string };
}

/** Objekte einer ArcGIS-Ebene, die den Punkt enthalten (Geometrie in WGS84) */
export async function esriAmPunkt(ebeneUrl: string, lat: number, lon: number): Promise<NonNullable<EsriAntwort["features"]>> {
  const params = new URLSearchParams({
    geometry: `${lon},${lat}`,
    geometryType: "esriGeometryPoint",
    inSR: "4326",
    spatialRel: "esriSpatialRelIntersects",
    outFields: "*",
    returnGeometry: "true",
    outSR: "4326",
    maxAllowableOffset: "0.000005",
    f: "json",
  });
  const a = await holeJson<EsriAntwort>(`${ebeneUrl}/query?${params}`);
  if (a.error || !Array.isArray(a.features)) throw unlesbar(a.error?.message ?? "keine Objektliste");
  return a.features;
}

/** Felder ohne Tabellen-Präfix ("PLANMANAGER_B.PLANNAME" → "PLANNAME") – manche Dienste liefern verbundene Tabellen */
function ohnePraefix(x: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(Object.entries(x).map(([k, v]) => [k.replace(/^.*\./, ""), v]));
}

/** Bebauungsplan-Dienst über eine ArcGIS-Ebene */
export function arcgisBplan(kopf: DienstKopf & { ebene: string; zuPlan: ZuPlan; fehlerName: string }): BplanDienst {
  const { ebene, zuPlan, fehlerName, ...rest } = kopf;
  return {
    ...rest,
    async abfrage(lat, lon, sprache): Promise<DienstErgebnis<PlanTreffer>> {
      const p: Punkt = [lon, lat];
      try {
        const treffer: PlanTreffer[] = [];
        for (const { attributes, geometry } of await esriAmPunkt(ebene, lat, lon)) {
          const plan = zuPlan(ohnePraefix(attributes), sprache);
          if (plan) treffer.push({ ...plan, umriss: umrissVon(p, esriGeometrie(geometry), 300) });
        }
        return { status: "ok", treffer };
      } catch (e) {
        return fehlerErgebnis("bplan", fehlerName, e, sprache);
      }
    },
  };
}

/** GeometryCollection (z. B. Landkreis Fulda: Linien und Flächen gemischt) → nur die Flächen als MultiPolygon */
function nurFlaechen(g: { type: string; coordinates?: unknown; geometries?: { type: string; coordinates: unknown }[] } | null) {
  if (!g || g.type !== "GeometryCollection") return g as { type: string; coordinates: unknown } | null;
  const polys = (g.geometries ?? []).flatMap((t) => (t.type === "Polygon" ? [t.coordinates] : t.type === "MultiPolygon" ? (t.coordinates as unknown[]) : []));
  return polys.length ? { type: "MultiPolygon", coordinates: polys } : null;
}

/** Bebauungsplan-Dienst über GeoJSON (WFS 2.0 oder OGC API Features); url liefert die Abfrage für ein Rechteck um den Punkt */
export function geojsonBplan(kopf: DienstKopf & { url: (p: Punkt) => string; zuPlan: ZuPlan; fehlerName: string }): BplanDienst {
  const { url, zuPlan, fehlerName, ...rest } = kopf;
  return {
    ...rest,
    async abfrage(lat, lon, sprache): Promise<DienstErgebnis<PlanTreffer>> {
      const p: Punkt = [lon, lat];
      try {
        const treffer: PlanTreffer[] = [];
        for (const f of geoJsonObjekte(await holeJson(url(p), 12000))) {
          // alle geprüften Dienste liefern GeoJSON in Länge, Breite
          const g = umrechnen(nurFlaechen(f.geometry), LON_LAT);
          if (!g || !liegtIn(p, g)) continue;
          const plan = zuPlan(f.properties ?? {}, sprache);
          if (plan) treffer.push({ ...plan, umriss: umrissVon(p, g, 300) });
        }
        return { status: "ok", treffer };
      } catch (e) {
        return fehlerErgebnis("bplan", fehlerName, e, sprache);
      }
    },
  };
}
