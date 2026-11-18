// Kulturdenkmale in Niedersachsen am Standort und in der Umgebung.
// Dienst: Denkmalatlas Niedersachsen (NLD), OGC API Features "denkmale/v1", Sammlung "protectedsite".
import { fehlerText, holeJson } from "./abruf";
import { type Sprache, zweisprachig } from "../sprache";
import { abstandMeter, aussenRinge, bbox, inMeter, punktInGeometrie, type Punkt } from "./geo";

const DIENST = "https://geodatendienste.denkmalatlas.niedersachsen.de/xtraserver-webapi/denkmale/v1/collections/protectedsite/items";
export const DENKMAL_QUELLE = "Denkmalatlas Niedersachsen: Niedersächsisches Landesamt für Denkmalpflege";
export const DENKMAL_VIEWER = "https://denkmalatlas.niedersachsen.de/viewer/";

export interface Denkmal {
  name: string;
  anschrift?: string;
  ausweisung: string; // z. B. "Baudenkmal (Einzeln)", "Baudenkmal (Gruppen)"
  objekttyp?: string;
  beschreibung?: string;
  gruppe: boolean;
  entfernungM: number; // 0 = Standort liegt in der Denkmalfläche
  link?: string;
  /** Umriss in Metern relativ zum Standort (x Osten, y Norden) – für die Lageskizze */
  umriss: [number, number][][];
}

interface Antwort {
  features?: { properties: Record<string, string | undefined>; geometry: { type: string; coordinates: unknown } | null }[];
}

export async function denkmaleImUmkreis(
  lat: number,
  lon: number,
  radiusM = 50,
  sprache: Sprache = "de",
): Promise<{ status: "ok"; denkmale: Denkmal[] } | { status: "fehler"; hinweis: string }> {
  const t = zweisprachig(sprache);
  const p: Punkt = [lon, lat];
  const [a, b, c, d] = bbox(p, radiusM + 10);
  const url = `${DIENST}?f=json&limit=200&bbox=${a.toFixed(6)},${b.toFixed(6)},${c.toFixed(6)},${d.toFixed(6)}`;
  try {
    const antwort = await holeJson<Antwort>(url, 12000);
    if (!antwort.features) return { status: "fehler", hinweis: t("Denkmal-Dienst lieferte keine auswertbaren Daten.", "Monument service returned no usable data.") };
    const denkmale = antwort.features
      .filter((f) => f.geometry)
      .map((f) => {
        const x = f.properties;
        const name = (x.siteName ?? "").replace(/^Oldenburg(\s*\(Oldb\))?,\s*Stadt,\s*/i, "").replace(/^Oldenburg,\s*/i, "").replace(/\s{2,}/g, " ");
        return {
          name,
          anschrift: x["lage.anschrift"],
          ausweisung: x.ausweisung ?? x.fachbereich ?? "Kulturdenkmal",
          objekttyp: x.objekttyp,
          beschreibung: x.beschreibung,
          gruppe: /gruppe/i.test(`${x.ausweisung ?? ""} ${x.fachbereich ?? ""}`),
          entfernungM: Math.round(abstandMeter(p, f.geometry!)),
          link: x.inspireId?.startsWith("https://denkmalatlas.niedersachsen.de/") ? x.inspireId : undefined,
          umriss: inMeter(p, aussenRinge(f.geometry!)),
          _drin: punktInGeometrie(p, f.geometry!),
        };
      })
      .filter((x) => x.entfernungM <= radiusM)
      .sort((x, y) => x.entfernungM - y.entfernungM || Number(x.gruppe) - Number(y.gruppe))
      .map(({ _drin, ...rest }) => rest);
    return { status: "ok", denkmale };
  } catch (e) {
    return { status: "fehler", hinweis: t(`Denkmal-Dienst nicht erreichbar: ${fehlerText(e, "de")}.`, `Monument service unreachable: ${fehlerText(e, "en")}.`) };
  }
}
