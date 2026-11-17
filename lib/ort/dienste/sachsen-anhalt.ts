// Sachsen-Anhalt: B-Pläne der XPlanung-Plattform des Landes (LVermGeo / MID, XPlanSynWFS) und Denkmale aus dem
// Denkmalinformationssystem des Landesamts für Denkmalpflege und Archäologie (ArcGIS-Dienst "LDA/denkmale_public").
// Beide spiegeln die anfragende Herkunft in Access-Control-Allow-Origin (geprüft 17.11.2026).
// Hinweis: Der dokumentierte WMS des Denkmalinformationssystems (wss-org2/service/denkmale/guest) lehnt Anfragen aus
// fremden Browser-Herkünften mit HTTP 403 ab; der ArcGIS-Dienst desselben Servers liefert dieselben Objekte mit Geometrie.
import { holeJson } from "../abruf";
import { zweisprachig } from "../../sprache";
import { denkmaleImUmkreis, esriGeometrie, fehlerErgebnis, gekuerzt, rechteck, unlesbar, wert, type DenkmalRoh, type Punkt } from "./hilfen";
import type { BplanDienst, DenkmalDienst } from "./typen";
import { XPLANSYN, xplanAbfrage } from "./xplanung";

export const sachsenAnhaltBplan: BplanDienst = {
  id: "st-bplan",
  quelle: "Land Sachsen-Anhalt, LVermGeo / Ministerium für Infrastruktur und Digitales – XPlanung-Plattform (Bauleitplanung)",
  viewer: "https://xplan.geodatenportal.sachsen-anhalt.de/",
  gebiet: { land: "Sachsen-Anhalt" },
  // Ministerium: Im laufenden Projekt wird "ein Großteil der Bauleitplanung im Land" XPlanung-konform digitalisiert,
  // Abschluss Ende 2026 – also (noch) nicht vollständig. Lizenz im Dienst nicht angegeben.
  vollstaendig: false,
  browser: true,
  abdeckung: {
    de: "Pläne, die im Landesprojekt bisher ins XPlanung-Format überführt wurden (Projekt läuft bis Ende 2026) – nicht vollständig.",
    en: "Plans converted to XPlanung format in the state project so far (project runs until end of 2026) – not complete.",
  },
  abfrage: (lat, lon, sprache) =>
    xplanAbfrage(
      { wfs: "https://xplan2.geodatenportal.sachsen-anhalt.de/xplansyn-wfs/services/xplansynwfs", name: "XPlanung Sachsen-Anhalt", namensraum: XPLANSYN },
      lat,
      lon,
      sprache,
    ),
};

const DENKMAL_DIENST = "https://www.geodatenportal.sachsen-anhalt.de/arcgis/rest/services/LDA/denkmale_public/MapServer/identify";

interface Identify {
  results?: { layerId: number; layerName: string; attributes: Record<string, string>; geometry: unknown }[];
  error?: { message?: string };
}

/** Gruppen: Denkmalbereiche und ihre Teilobjekte, archäologische Flächendenkmale (z. B. historischer Stadtkern) */
const GRUPPE = /denkmalbereich|flächendenkmal/i;

export const sachsenAnhaltDenkmal: DenkmalDienst = {
  id: "st-denkmal",
  quelle: "Landesamt für Denkmalpflege und Archäologie Sachsen-Anhalt – Denkmalinformationssystem",
  viewer: "https://lda.sachsen-anhalt.de/denkmalinformationssystem/",
  gebiet: { land: "Sachsen-Anhalt" },
  // LDA: "Zum derzeitigen Stand wird keine Vollständigkeit erreicht. Flächen ohne Kartierungen sind daher nicht per se
  // als denkmalfrei anzusehen." Archäologie nur geprüfte obertägig sichtbare Strukturen und Flächendenkmale.
  vollstaendig: false,
  browser: true,
  abdeckung: {
    de: "Laut Landesamt noch nicht vollständig; Flächen ohne Kartierung sind nicht automatisch denkmalfrei. Bodendenkmale nur teilweise.",
    en: "According to the state office not yet complete; areas without mapping are not automatically free of monuments. Archaeological monuments only partly.",
  },
  async abfrage(lat, lon, radiusM, sprache) {
    const t = zweisprachig(sprache);
    const p: Punkt = [lon, lat];
    // Identify über alle Ebenen in einer Anfrage: Kartenausschnitt 200 × 200 Pixel, Toleranz = Umkreis in Pixeln
    const rand = radiusM + 20;
    const ausschnitt = rechteck(p, rand).map((x) => x.toFixed(6)).join(",");
    const toleranz = Math.ceil((radiusM * 100) / rand) + 2;
    const url =
      `${DENKMAL_DIENST}?geometry=${lon.toFixed(6)},${lat.toFixed(6)}&geometryType=esriGeometryPoint&sr=4326&layers=all` +
      `&tolerance=${toleranz}&mapExtent=${ausschnitt}&imageDisplay=200,200,96&returnGeometry=true&maxAllowableOffset=0.000005&f=json`;
    try {
      const a = await holeJson<Identify>(url, 12000);
      if (a.error || !Array.isArray(a.results)) throw unlesbar(a.error?.message ?? "keine Ergebnisliste");
      const roh: DenkmalRoh[] = a.results.map(({ attributes: x, geometry }) => {
        const typ = wert(x.Denkmaltyp) ?? wert(x.Ausweisungsart) ?? "Kulturdenkmal";
        const art = wert(x.Ausweisungsart) ?? typ;
        const objekttyp = wert(x.Objekttyp);
        const ort = [gekuerzt(wert(x.Lage), 120), wert(x.Gemeinde)].filter(Boolean).join(", ");
        return {
          name: wert(x.Bezeichnung) ?? ([objekttyp, wert(x.Lage)].filter(Boolean).join(", ") || t(typ, "Monument")),
          anschrift: ort || undefined,
          ausweisung: art,
          objekttyp,
          beschreibung: gekuerzt([wert(x.Beschreibung), wert(x.Ausweisungsmerkmale)].filter(Boolean).join(" · ") || undefined),
          gruppe: GRUPPE.test(`${typ} ${art}`),
          geometrie: esriGeometrie(geometry),
          schluessel: wert(x["Denkmal-ID"]),
        };
      });
      return { status: "ok", treffer: denkmaleImUmkreis(p, radiusM, roh) };
    } catch (e) {
      return fehlerErgebnis("denkmal", "Denkmalinformationssystem Sachsen-Anhalt", e, sprache);
    }
  },
};
