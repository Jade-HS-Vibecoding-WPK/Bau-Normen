// Niedersachsen: vorhandene Dienste (Stadt Oldenburg, Denkmalatlas) als einheitliche Dienste verpackt – ohne sie zu ändern.
// Einen landesweiten B-Plan-Dienst gibt es nicht (PlanDigital Niedersachsen enthält nur RROP und F-Pläne).
// Hannover: Bebauungspläne nur im sitzungsgebundenen Kartenviewer, kein offener Dienst.
// Braunschweig: ArcGIS-Dienst vorhanden, aber die Rechtlichen Hinweise der Stadt untersagen die Verwendung der Geodaten
// auf anderen Internetseiten – deshalb nicht angebunden.
//
// Ostfriesische Inseln (geprüft 17.11.2026):
//  - Borkum: Landkreis Leer, ArcGIS-Dienst "www_Bauleitplanung" (alle Gemeinden des Kreises) – angebunden
//  - Juist, Norderney, Baltrum: Landkreis Aurich, ArcGIS-Dienst "Planung/Bauleitplanung" (alle Gemeinden) – angebunden
//  - Langeoog, Spiekeroog (Landkreis Wittmund): die frühere ArcGIS-Online-App "Bauleitplanung öffentlich" ist nicht mehr
//    erreichbar ("Subscription is canceled"), kein anderer offener Dienst gefunden – nur PDFs auf den Gemeindeseiten
//  - Wangerooge (Landkreis Friesland): Datensatz "Bebauungspläne im Landkreis Friesland" nur als Metadaten (NUMIS), ohne Dienst
import { holeJson } from "../abruf";
import { BPLAN_QUELLE, BPLAN_VIEWER, bplaeneAmPunkt } from "../bplan";
import { DENKMAL_QUELLE, DENKMAL_VIEWER, denkmaleImUmkreis } from "../denkmal";
import { esriGeometrie, fehlerErgebnis, unlesbar, umrissVon, wert, webLink, type Punkt } from "./hilfen";
import type { BplanDienst, DenkmalDienst, PlanTreffer } from "./typen";

interface EsriAntwort {
  features?: { attributes: Record<string, unknown>; geometry?: unknown }[];
  error?: { message?: string };
}

/** Objekte einer ArcGIS-MapServer-Ebene, die den Punkt enthalten (Geometrie in WGS84) */
async function esriAmPunkt(ebeneUrl: string, lat: number, lon: number): Promise<NonNullable<EsriAntwort["features"]>> {
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

// --- Landkreis Leer (mit Borkum) ---

const LEER_EBENE = "https://gis.lkleer.de/arcgis/rest/services/www_Bauleitplanung/MapServer/0";
// PLANART im Dienst: B, BI, BQ, BE = Bebauungspläne; VB = vorhabenbezogener Bebauungsplan; V+E = Vorhaben- und
// Erschließungsplan. Nicht als Bebauungsplan gezählt: I (Abrundungs-/Innenbereichssatzung), A und S (Splittersiedlungs-/
// Außenbereichssatzung), OBV (örtliche Bauvorschrift) – Satzungen nach §§ 34, 35 BauGB bzw. Gestaltungsvorschriften.
const LEER_PLAN = new Set(["B", "BI", "BQ", "BE", "VB", "V+E"]);
const LEER_VORHABEN: Record<string, { de: string; en: string }> = {
  VB: { de: "vorhabenbezogener Bebauungsplan", en: "project-related development plan" },
  "V+E": { de: "Vorhaben- und Erschließungsplan", en: "project and development plan" },
};

export const leerBplan: BplanDienst = {
  id: "ni-leer-bplan",
  quelle: "Landkreis Leer – Bauleitplanung, Geltungsbereiche der Bebauungspläne (ArcGIS, ohne Lizenzangabe)",
  viewer: "https://lkleer.maps.arcgis.com/apps/mapviewer/index.html?webmap=e4311f176259429d970921af4cf49ab2",
  gebiet: { land: "Niedersachsen", kreis: "Landkreis Leer" },
  // 2.414 Einträge aller 19 Gemeinden des Kreises (auch Stadt Borkum: 82), jede Fassung (Urschrift, Änderungen) mit
  // Satzungs-PDF. Hinweis im Dienst: "ggf. können weitere Änderungen für Teilbereiche wirksam sein, die nicht aus den
  // Plänen ersichtlich sind" – deshalb nicht als vollständig gekennzeichnet.
  vollstaendig: false,
  browser: true, // Access-Control-Allow-Origin für jede Herkunft (geprüft 17.11.2026)
  abdeckung: {
    de: "Bebauungspläne aller Gemeinden des Landkreises Leer einschließlich Borkum, je Fassung mit Satzung als PDF; laut Dienst können weitere Änderungen für Teilbereiche wirksam sein, die nicht aus den Plänen ersichtlich sind. Ohne Datum des Inkrafttretens.",
    en: "Development plans of all municipalities in the district of Leer including Borkum, each version with the statute as PDF; according to the service, further amendments may apply to parts of an area that are not visible from the plans. No date of entry into force.",
  },
  async abfrage(lat, lon, sprache) {
    const p: Punkt = [lon, lat];
    try {
      const treffer: PlanTreffer[] = (await esriAmPunkt(LEER_EBENE, lat, lon))
        .filter(({ attributes: x }) => LEER_PLAN.has(wert(x.PLANART) ?? ""))
        .map(({ attributes: x, geometry }) => {
          // PLANNAME z. B. "Nr. 37: Zentrum" oder "Nr. 06A: Reedestraße|Boelckestraße"; mehrere Straßen mit "|" getrennt
          const roh = (wert(x.PLANNAME) ?? "").replace(/\s*\|\s*/g, " / ");
          const m = roh.match(/^Nr\.\s*([^:]+):\s*(.*)$/);
          const fassung = wert(x.FASSUNG)?.replace(/\s*\|\s*/g, ", ");
          const art = wert(x.PLANART) ?? "";
          return {
            nummer: m ? m[1].trim() : "",
            // Änderungen sind eigene Satzungen: die Fassung gehört zum Namen, damit jede einzeln erscheint
            name: [m ? m[2].trim() : roh, fassung && fassung !== "Urschrift" ? fassung : ""].filter(Boolean).join(" – "),
            vorhabenbezogen: art in LEER_VORHABEN,
            verfahren: LEER_VORHABEN[art]?.[sprache],
            link: webLink(x.URKUNDE),
            umriss: umrissVon(p, esriGeometrie(geometry), 300),
          };
        });
      return { status: "ok", treffer };
    } catch (e) {
      return fehlerErgebnis("bplan", "Bauleitplanung Landkreis Leer", e, sprache);
    }
  },
};

// --- Landkreis Aurich (mit Juist, Norderney, Baltrum) ---

const AURICH_EBENE = "https://gis.landkreis-aurich.de/server/rest/services/Planung/Bauleitplanung/MapServer/1";
// ART im Dienst: Bebauungspläne (auch vorhabenbezogen, Vorhaben- u. Erschließungsplan) mit STATUS "genehmigt" zählen als
// Plan; Veränderungssperren werden getrennt gemeldet. Nicht gezählt: Innen-/Außenbereichs- und Ergänzungssatzungen,
// Siedlungssplitter und die internen Einträge ("interne Absprache", "OVG interne Absprache").
const AURICH_PLAN = new Set(["Bebauungsplan", "vorhabenbezogener Bebauungsplan", "Vorhaben- u. Erschließungsplan"]);

export const aurichBplan: BplanDienst = {
  id: "ni-aurich-bplan",
  quelle: "Landkreis Aurich – Bauleitplanung, Bebauungspläne (ArcGIS, ohne Lizenzangabe)",
  viewer: "https://gis.landkreis-aurich.de/portal/apps/instant/sidebar/index.html?appid=00403100c7f84a0eacd86771280976d2",
  gebiet: { land: "Niedersachsen", kreis: "Landkreis Aurich" },
  // 1.669 Einträge der 15 Gemeinden des Kreises (Norderney 52, Juist 18, Baltrum 16), Status "genehmigt"; ohne Plannamen,
  // Datum und Dokumente; keine Aussage zur Vollständigkeit.
  vollstaendig: false,
  browser: true, // Access-Control-Allow-Origin für jede Herkunft (geprüft 17.11.2026)
  abdeckung: {
    de: "Bebauungspläne und Veränderungssperren der Gemeinden des Landkreises Aurich einschließlich Juist, Norderney und Baltrum (Status „genehmigt“); ohne Plannamen, Datum und Plandokumente, keine Aussage zur Vollständigkeit.",
    en: "Development plans and development freezes of the municipalities in the district of Aurich including Juist, Norderney and Baltrum (status “approved”); without plan names, dates or plan documents, no statement on completeness.",
  },
  async abfrage(lat, lon, sprache) {
    const p: Punkt = [lon, lat];
    try {
      const treffer: PlanTreffer[] = [];
      for (const { attributes: x, geometry } of await esriAmPunkt(AURICH_EBENE, lat, lon)) {
        const art = wert(x.ART) ?? "";
        const gemeinde = (wert(x.Gemeinde) ?? "").replace(/,\s*(Stadt|Inselgemeinde)$/, "");
        const nummer = (wert(x.NR) ?? "").trim();
        const umriss = umrissVon(p, esriGeometrie(geometry), 300);
        if (art.startsWith("Veränderungssperre")) {
          // "Veränderungssperre (BPlan 0536)" → "zu BPlan 0536, Aurich"; die Art zeigt die Auskunft ohnehin als Etikett
          const bezug = art.replace(/^Veränderungssperre\s*/, "").replace(/^\((.*)\)$/, "zu $1");
          treffer.push({ nummer, name: [bezug, gemeinde].filter(Boolean).join(", "), vorhabenbezogen: false, sicherung: "veraenderungssperre", umriss });
        } else if (AURICH_PLAN.has(art) && wert(x.STATUS) === "genehmigt") {
          const vorhaben = art !== "Bebauungsplan";
          treffer.push({
            nummer,
            name: [sprache === "en" ? "Development plan" : "Bebauungsplan", gemeinde].filter(Boolean).join(", "),
            vorhabenbezogen: vorhaben,
            verfahren: vorhaben ? LEER_VORHABEN[art === "vorhabenbezogener Bebauungsplan" ? "VB" : "V+E"][sprache] : undefined,
            umriss,
          });
        }
      }
      return { status: "ok", treffer };
    } catch (e) {
      return fehlerErgebnis("bplan", "Bauleitplanung Landkreis Aurich", e, sprache);
    }
  },
};

/** Stadt Oldenburg – Umringe rechtsverbindlicher Bebauungspläne (ArcGIS FeatureServer, Open Data) */
export const oldenburgBplan: BplanDienst = {
  id: "ni-oldenburg-bplan",
  quelle: BPLAN_QUELLE,
  viewer: BPLAN_VIEWER,
  gebiet: { land: "Niedersachsen", gemeinde: "Oldenburg (Oldb)" },
  // Dienstbeschreibung: "Umringe der rechtsverbindlichen Bebauungspläne der Stadt Oldenburg" – eine ausdrückliche
  // Aussage zur Vollständigkeit fehlt, deshalb nicht als vollständig gekennzeichnet.
  vollstaendig: false,
  browser: true, // Access-Control-Allow-Origin: * (geprüft 17.11.2026)
  abdeckung: {
    de: "Stadtgebiet Oldenburg; die Stadt beschreibt den Dienst als „Umringe der rechtsverbindlichen Bebauungspläne“, sagt aber nicht ausdrücklich, dass er vollständig ist.",
    en: "City of Oldenburg; the city describes the service as “outlines of the legally binding development plans” but does not state explicitly that it is complete.",
  },
  async abfrage(lat, lon, sprache) {
    const r = await bplaeneAmPunkt(lat, lon, sprache);
    return r.status === "ok" ? { status: "ok", treffer: r.plaene } : r;
  },
};

/** Denkmalatlas Niedersachsen (NLD) – OGC API Features */
export const niedersachsenDenkmal: DenkmalDienst = {
  id: "ni-denkmal",
  quelle: DENKMAL_QUELLE,
  viewer: DENKMAL_VIEWER,
  gebiet: { land: "Niedersachsen" },
  // Beschreibung der API: "Das Verzeichnis befindet sich derzeit in Qualifizierung und ist nicht vollständig";
  // nicht enthalten sind obertägig nicht erhaltene archäologische Denkmale und bewegliche Denkmale.
  vollstaendig: false,
  browser: true, // Access-Control-Allow-Origin: * (geprüft 17.11.2026)
  abdeckung: {
    de: "Laut NLD noch in Qualifizierung und nicht vollständig; obertägig nicht erhaltene Bodendenkmale fehlen.",
    en: "According to the state office still being qualified and not complete; archaeological sites not visible above ground are missing.",
  },
  async abfrage(lat, lon, radiusM, sprache) {
    const r = await denkmaleImUmkreis(lat, lon, radiusM, sprache);
    return r.status === "ok" ? { status: "ok", treffer: r.denkmale } : r;
  },
};
