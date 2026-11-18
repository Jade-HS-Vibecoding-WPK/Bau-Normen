// Thüringen: Bebauungspläne aus dem "WFS für kommunale Geodaten" der GDI-Th (TLBG), Ebene "Bebauungspläne und Satzungen
// Thüringen" (CC BY 4.0, Access-Control-Allow-Origin: *, geprüft 17.11.2026).
// Denkmale: Das Thüringische Landesamt für Denkmalpflege und Archäologie bietet keinen Geodatendienst an. Ersatzweise
// angebunden ist der INSPIRE-Darstellungsdienst "Schutzgebiete" der Vermessungsverwaltung (TLBG), Unterthema Denkmale,
// vierteljährlich aus dem Liegenschaftskataster (ALKIS) abgeleitet (Metadaten 605d5273-0c78-45b2-a472-68b422d142b4;
// CC BY 4.0, Namensnennung "© GDI-Th"; Access-Control-Allow-Origin: *, geprüft 18.11.2026). Fachlich dünn: nur eine
// Bezeichnung (oft leer), keine Denkmalart, keine Anschrift; GetFeatureInfo liefert weder Umriss noch Begrenzungsrechteck.
import { holeText } from "../abruf";
import { zweisprachig } from "../../sprache";
import {
  bboxUtm, datumText, fehlerErgebnis, gmlObjekte, LAT_LON, liegtIn, LON_LAT, umrissVon, wert, webLink, wmsInfoUrl, wmsStufen, type Punkt,
} from "./hilfen";
import type { BplanDienst, DenkmalDienst, DenkmalTreffer, PlanTreffer } from "./typen";

const WFS = "https://www.geoproxy.geoportal-th.de/geoproxy/services/kommunal/komm_wfs";
/** XPlanung-Planarten, die Bebauungspläne sind (ohne Klarstellungs-/Innenbereichssatzungen, örtliche Bauvorschriften, Sonstiges) */
const BPLAN_ARTEN = new Set(["1000", "10000", "10001", "10002", "3000", "3100"]);

export const thueringenBplan: BplanDienst = {
  id: "th-bplan",
  quelle: "GDI-Th / TLBG: Bebauungspläne und Satzungen Thüringen (WFS kommunale Geodaten, © GDI-Th, CC BY 4.0)",
  viewer: "https://www.geoportal-th.de/",
  gebiet: { land: "Thüringen" },
  // Metadaten (ed1c7274-3fac-4226-b8d1-214796cfff8d): "Zusammenfassung der in der GDI-Th veröffentlichten Geltungsbereiche
  // … Es handelt sich um einen Sekundärdatenbestand" – enthält nur die Pläne, die Gemeinden in der GDI-Th veröffentlichen.
  vollstaendig: false,
  browser: true,
  abdeckung: {
    de: "Nur Pläne, die die Gemeinden in der Geodateninfrastruktur Thüringen veröffentlicht haben (Sekundärdatenbestand), nicht vollständig.",
    en: "Only plans the municipalities have published in the Thuringian spatial data infrastructure (secondary data), not complete.",
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
          name: [wert(x.Name), wert(x.Gemeinde)].filter(Boolean).join(", "),
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

// --- Denkmale (aus ALKIS abgeleitet) ---

const PS_WMS = "https://www.geoproxy.geoportal-th.de/geoproxy/services/INSPIREps";
/** Treffer-Toleranz des Dienstes in Pixeln – ausgemessen am Erfurter Dom etwa 7 (18.11.2026), knapp angesetzt */
const PS_TOLERANZ_PX = 6.5;

export const thueringenDenkmal: DenkmalDienst = {
  id: "th-denkmal",
  quelle: "GDI-Th / TLBG: INSPIRE Schutzgebiete aus ALKIS, Unterthema Denkmale (© GDI-Th, CC BY 4.0)",
  viewer: "https://www.geoportal-th.de/",
  gebiet: { land: "Thüringen" },
  // Kein Dienst des Denkmalamts, sondern aus dem Liegenschaftskataster abgeleitet – Vollständigkeit nicht belegt.
  vollstaendig: false,
  browser: true,
  abdeckung: {
    de: "Ersatzweise aus dem Liegenschaftskataster (ALKIS) abgeleitete Denkmalflächen der Vermessungsverwaltung: kein Dienst des Landesamts für Denkmalpflege, nicht vollständig, nur Bezeichnungen (oft leer), keine Denkmalart und Anschrift. Der Dienst liefert keine Umrisse: Entfernungen nur grob in Stufen (am Standort, bis etwa 10, 25 bzw. 50 m).",
    en: "As a substitute, monument areas derived from the real estate cadastre (ALKIS) by the surveying administration: not a service of the state heritage office, not complete, names only (often empty), no monument type or address. The service gives no outlines: distances only roughly in steps (at the location, up to about 10, 25 or 50 m).",
  },
  async abfrage(lat, lon, radiusM, sprache) {
    const t = zweisprachig(sprache);
    const p: Punkt = [lon, lat];
    try {
      const funde = await wmsStufen(
        async (halbeKanteM) =>
          gmlObjekte(await holeText(wmsInfoUrl(PS_WMS, "PS.ProtectedSite", p, halbeKanteM, "application/vnd.ogc.gml", 100)), LON_LAT)
            // nur Kulturdenkmale (INSPIRE-Klassen "cultural", "archaeological"), keine Naturschutzgebiete
            .filter((o) => !wert(o.werte.siteProtectionClassification) || /cultural|archaeolog/i.test(o.werte.siteProtectionClassification)),
        (o) => wert(o.werte.localId) ?? o.id ?? JSON.stringify(o.werte),
        radiusM,
        PS_TOLERANZ_PX,
      );
      const treffer: DenkmalTreffer[] = funde.map(({ objekt: o, entfernungM }) => ({
        name: wert(o.werte.siteName) ?? t("Kulturdenkmal (ohne Bezeichnung im Dienst)", "Cultural monument (no name in the service)"),
        ausweisung: /archaeolog/i.test(o.werte.siteProtectionClassification ?? "") ? t("Bodendenkmal", "Archaeological monument") : t("Kulturdenkmal", "Cultural monument"),
        gruppe: false,
        entfernungM,
        // keine Geometrie im Dienst – keine Lageskizze
        umriss: [],
      }));
      treffer.sort((x, y) => x.entfernungM - y.entfernungM || x.name.localeCompare(y.name, "de"));
      return { status: "ok", treffer };
    } catch (e) {
      return fehlerErgebnis("denkmal", "Schutzgebiete Thüringen (ALKIS)", e, sprache);
    }
  },
};
