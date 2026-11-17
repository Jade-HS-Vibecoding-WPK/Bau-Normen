// Thüringen: Bebauungspläne aus dem "WFS für kommunale Geodaten" der GDI-Th (TLBG), Ebene "Bebauungspläne und Satzungen
// Thüringen" (CC BY 4.0, Access-Control-Allow-Origin: *, geprüft 17.11.2026).
// Denkmale: Das Thüringische Landesamt für Denkmalpflege und Archäologie bietet keinen Geodatendienst an; es gibt nur
// einen aus dem Liegenschaftskataster (ALKIS) abgeleiteten INSPIRE-WMS der Vermessungsverwaltung mit bloßen Namen und
// ohne verlässlichen Umkreis – kein Dienst des Denkmalamts, daher nicht angebunden.
import { holeText } from "../abruf";
import { zweisprachig } from "../../sprache";
import { bboxUtm, datumText, fehlerErgebnis, gmlObjekte, LAT_LON, liegtIn, umrissVon, wert, webLink, type Punkt } from "./hilfen";
import type { BplanDienst, PlanTreffer } from "./typen";

const WFS = "https://www.geoproxy.geoportal-th.de/geoproxy/services/kommunal/komm_wfs";
/** XPlanung-Planarten, die Bebauungspläne sind (ohne Klarstellungs-/Innenbereichssatzungen, örtliche Bauvorschriften, Sonstiges) */
const BPLAN_ARTEN = new Set(["1000", "10000", "10001", "10002", "3000", "3100"]);

export const thueringenBplan: BplanDienst = {
  id: "th-bplan",
  quelle: "GDI-Th / TLBG – Bebauungspläne und Satzungen Thüringen (WFS kommunale Geodaten, © GDI-Th, CC BY 4.0)",
  viewer: "https://www.geoportal-th.de/",
  gebiet: { land: "Thüringen" },
  // Metadaten (ed1c7274-3fac-4226-b8d1-214796cfff8d): "Zusammenfassung der in der GDI-Th veröffentlichten Geltungsbereiche
  // … Es handelt sich um einen Sekundärdatenbestand" – enthält nur die Pläne, die Gemeinden in der GDI-Th veröffentlichen.
  vollstaendig: false,
  browser: true,
  abdeckung: {
    de: "Nur Pläne, die die Gemeinden in der Geodateninfrastruktur Thüringen veröffentlicht haben (Sekundärdatenbestand) – nicht vollständig.",
    en: "Only plans the municipalities have published in the Thuringian spatial data infrastructure (secondary data) – not complete.",
  },
  async abfrage(lat, lon, sprache) {
    const t = zweisprachig(sprache);
    const p: Punkt = [lon, lat];
    // Der Dienst wertet BBOX nur in EPSG:25832 aus; Ausgabe in WGS84 (Breite, Länge)
    const url = `${WFS}?SERVICE=WFS&VERSION=2.0.0&REQUEST=GetFeature&TYPENAMES=kommunal:komm_bp&COUNT=50&SRSNAME=urn:ogc:def:crs:EPSG::4326&BBOX=${bboxUtm(p, 1, 32)},urn:ogc:def:crs:EPSG::25832`;
    try {
      const treffer: PlanTreffer[] = [];
      for (const o of gmlObjekte(await holeText(url), LAT_LON)) {
        const x = o.werte;
        if (!BPLAN_ARTEN.has(wert(x.Planart) ?? "")) continue;
        if (!["4000", "4500"].includes(wert(x.Rechtsstand) ?? "")) continue;
        if (o.geometrie && !liegtIn(p, o.geometrie)) continue;
        const art = wert(x.Planart_Beschreibung);
        treffer.push({
          // Der Dienst führt keine Plannummer, nur die Bezeichnung
          nummer: "",
          name: [wert(x.Name), wert(x.Gemeinde)].filter(Boolean).join(" – "),
          rechtsverbindlichSeit: datumText(x.Datum_Rechtskraft, sprache),
          vorhabenbezogen: ["3000", "3100"].includes(wert(x.Planart) ?? ""),
          verfahren: [art, x.Rechtsstand === "4500" ? t("teilweise außer Kraft", "partly no longer in force") : undefined].filter(Boolean).join(" · ") || undefined,
          link: webLink(x.Planunterlagen) ?? webLink(x.Georeferenzierter_Plan),
          umriss: umrissVon(p, o.geometrie, 300),
        });
      }
      return { status: "ok", treffer };
    } catch (e) {
      return fehlerErgebnis("bplan", "Bebauungspläne Thüringen", e, sprache);
    }
  },
};
