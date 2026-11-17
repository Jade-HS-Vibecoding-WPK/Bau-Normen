// Niedersachsen: vorhandene Dienste (Stadt Oldenburg, Denkmalatlas) als einheitliche Dienste verpackt – ohne sie zu ändern.
// Einen landesweiten B-Plan-Dienst gibt es nicht (PlanDigital Niedersachsen enthält nur RROP und F-Pläne).
// Hannover: Bebauungspläne nur im sitzungsgebundenen Kartenviewer, kein offener Dienst.
// Braunschweig: ArcGIS-Dienst vorhanden, aber die Rechtlichen Hinweise der Stadt untersagen die Verwendung der Geodaten
// auf anderen Internetseiten – deshalb nicht angebunden.
import { BPLAN_QUELLE, BPLAN_VIEWER, bplaeneAmPunkt } from "../bplan";
import { DENKMAL_QUELLE, DENKMAL_VIEWER, denkmaleImUmkreis } from "../denkmal";
import type { BplanDienst, DenkmalDienst } from "./typen";

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
