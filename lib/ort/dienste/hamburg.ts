// Hamburg: Bebauungspläne (LGV / BSW, OGC API Features) und Denkmale (Denkmalschutzamt, WFS; Bodendenkmale:
// Archäologisches Museum Hamburg, OGC API Features). Alle Dienste mit Access-Control-Allow-Origin: * (geprüft 17.11.2026).
import { holeJson } from "../abruf";
import { zweisprachig } from "../../sprache";
import {
  bboxLaengeBreite, datumText, denkmaleImUmkreis, fehlerErgebnis, gekuerzt, geoJsonObjekte, liegtIn, LON_LAT, umrechnen, umrissVon,
  wert, webLink, type DenkmalRoh, type Punkt,
} from "./hilfen";
import type { BplanDienst, DenkmalDienst, PlanTreffer } from "./typen";

const BPLAN_API = "https://api.hamburg.de/datasets/v1/bplaene/collections/hh_hh_festgestellt/items";
const BPLAN_QUELLE = "Freie und Hansestadt Hamburg, Behörde für Stadtentwicklung und Wohnen – Bebauungspläne (dl-de/by-2.0)";

/** Planart aus dem Namen (Hamburger Benennung): BS = Baustufenplan, TB = Teilbebauungsplan, D = Durchführungsplan */
function planart(name: string, en: boolean): string {
  if (/^BS/.test(name)) return en ? "Baustufenplan (zoning plan, counts as development plan)" : "Baustufenplan";
  if (/^TB/.test(name)) return en ? "Teilbebauungsplan (partial development plan)" : "Teilbebauungsplan";
  if (/^D\d/.test(name)) return en ? "Durchführungsplan (implementation plan)" : "Durchführungsplan";
  return en ? "Development plan" : "Bebauungsplan";
}

export const hamburgBplan: BplanDienst = {
  id: "hh-bplan",
  quelle: BPLAN_QUELLE,
  viewer: "https://geoportal-hamburg.de/planportal/",
  gebiet: { land: "Hamburg" },
  // Metadaten (metaver.de, EBA4BF12-3ED2-4305-9B67-8E689FE8C445): "Es werden alle festgestellten Bebauungspläne präsentiert"
  // – einschließlich Baustufen-, Teilbebauungs- und Durchführungsplänen.
  vollstaendig: true,
  browser: true,
  abdeckung: {
    de: "Alle festgestellten Bebauungspläne Hamburgs (auch Baustufen-, Teilbebauungs- und Durchführungspläne). Ältere Pläne können durch neuere ganz oder teilweise ersetzt sein – der Dienst sagt das nicht.",
    en: "All adopted development plans of Hamburg (including older zoning, partial and implementation plans). Older plans may be wholly or partly replaced by newer ones – the service does not say so.",
  },
  async abfrage(lat, lon, sprache) {
    const p: Punkt = [lon, lat];
    const url = `${BPLAN_API}?f=json&limit=50&filter-lang=cql2-text&filter=${encodeURIComponent(`S_INTERSECTS(geom,POINT(${lon.toFixed(6)} ${lat.toFixed(6)}))`)}`;
    try {
      const objekte = geoJsonObjekte(await holeJson(url));
      const treffer: PlanTreffer[] = objekte.map((f) => {
        const x = f.properties ?? {};
        const nummer = wert(x.geltendes_planrecht) ?? "?";
        const g = umrechnen(f.geometry, LON_LAT);
        return {
          nummer,
          name: planart(nummer, sprache === "en"),
          rechtsverbindlichSeit: datumText(x.feststellungsdatum, sprache),
          vorhabenbezogen: false,
          link: webLink(x.planrecht),
          umriss: umrissVon(p, g, 300),
          _drin: !g || liegtIn(p, g),
        };
      })
        .filter((x) => x._drin)
        .map(({ _drin, ...rest }) => rest);
      return { status: "ok", treffer };
    } catch (e) {
      return fehlerErgebnis("bplan", "Bebauungspläne Hamburg", e, sprache);
    }
  },
};

// --- Denkmale ---

const DENKMAL_WFS = "https://geodienste.hamburg.de/HH_WFS_Denkmalschutz";
const BODEN_API = "https://api.hamburg.de/datasets/v1/denkmal_public/collections/fundplaetze_elemente_bodendenkmale/items";

/** Objektarten des Denkmalschutzamts (Typname -> Anzeige); Welterbe-Zonen und Tafeln sind keine Denkmale und fehlen bewusst */
const ARTEN: Record<string, { de: string; en: string; gruppe: boolean }> = {
  gebaeude: { de: "Baudenkmal", en: "Listed building", gruppe: false },
  ensembles: { de: "Ensemble", en: "Ensemble", gruppe: true },
  flaechen_gartendenkmale: { de: "Gartendenkmal", en: "Listed garden", gruppe: false },
  denkmalobjekte_symbolhaft: { de: "Denkmal (Punktdarstellung)", en: "Monument (shown as symbol)", gruppe: false },
  gebaeude_unterirdisch: { de: "Baudenkmal (unterirdisch)", en: "Listed building (underground)", gruppe: false },
  flaechen_gewaesser: { de: "Denkmal (Gewässer)", en: "Monument (water body)", gruppe: false },
  kd_flaechen_aussenanlagen: { de: "Denkmal (Außenanlage)", en: "Monument (outdoor feature)", gruppe: false },
  grenzsteine: { de: "Grenzstein", en: "Boundary stone", gruppe: false },
};

export const hamburgDenkmal: DenkmalDienst = {
  id: "hh-denkmal",
  quelle: "Freie und Hansestadt Hamburg, Denkmalschutzamt – Denkmalkartierung; Bodendenkmale: Archäologisches Museum Hamburg (dl-de/by-2.0)",
  viewer: "https://geoportal-hamburg.de/geo-online/",
  gebiet: { land: "Hamburg" },
  // Metadaten: "Erfasst werden aktuelle Denkmäler" – keine Aussage zur Vollständigkeit; Bodendenkmale laut Dienst nur
  // obertägig sichtbare, "Die Zahl der tatsächlich vorhandenen Schutzgebiete ist höher".
  vollstaendig: false,
  browser: true,
  abdeckung: {
    de: "Kartierung der Hamburger Denkmalliste ohne Aussage zur Vollständigkeit; Bodendenkmale nur teilweise (obertägig sichtbare, veröffentlichte).",
    en: "Mapping of the Hamburg list of monuments without a statement on completeness; archaeological monuments only partly (visible, published ones).",
  },
  async abfrage(lat, lon, radiusM, sprache) {
    const t = zweisprachig(sprache);
    const p: Punkt = [lon, lat];
    const bbox = bboxLaengeBreite(p, radiusM + 10);
    const typen = Object.keys(ARTEN).map((k) => `de.hh.up:${k}`).join(",");
    const wfs = `${DENKMAL_WFS}?SERVICE=WFS&VERSION=2.0.0&REQUEST=GetFeature&TYPENAMES=${typen}&COUNT=200&OUTPUTFORMAT=${encodeURIComponent("application/geo+json")}&SRSNAME=EPSG:4326&BBOX=${bbox},EPSG:4326`;
    const boden = `${BODEN_API}?f=json&limit=200&bbox=${bbox}`;
    try {
      const [bau, bod] = await Promise.all([holeJson(wfs, 12000), holeJson(boden, 12000)]);
      const roh: DenkmalRoh[] = [];
      for (const f of geoJsonObjekte(bau)) {
        const x = f.properties ?? {};
        const typ = /^DE\.HH\.UP_(.+)_\d+$/.exec(String(f.id ?? ""))?.[1]?.toLowerCase() ?? "";
        const art = ARTEN[typ];
        const status = wert(x.kdstatus ?? x.kd_status);
        // "NK": Gebäude im Ensemble, das selbst kein Denkmal ist – das Ensemble wird ohnehin angezeigt
        if (!art || status === "NK") continue;
        const fis = wert(x.fisid ?? x.fis_id);
        roh.push({
          name: wert(x.bezeichnung) ?? t(art.de, art.en),
          ausweisung: t(art.de, art.en),
          objekttyp: wert(x.bautyp),
          beschreibung: gekuerzt([wert(x.baujahr), wert(x.info)].filter(Boolean).join(" · ") || undefined),
          gruppe: art.gruppe,
          geometrie: umrechnen(f.geometry, LON_LAT),
          schluessel: fis ? `${typ}:${fis}` : undefined,
        });
      }
      for (const f of geoJsonObjekte(bod)) {
        const x = f.properties ?? {};
        const element = wert(x.element_typ);
        roh.push({
          name: [wert(x.fundplatzbezeichnung), element].filter(Boolean).join(" – ") || t("Bodendenkmal", "Archaeological monument"),
          ausweisung: t("Bodendenkmal", "Archaeological monument"),
          objekttyp: element,
          beschreibung: [wert(x.epoche_beginn), wert(x.epoche_ende)].filter(Boolean).join(" – ") || undefined,
          gruppe: false,
          geometrie: umrechnen(f.geometry, LON_LAT),
          schluessel: x.elemente_id !== undefined ? `boden:${x.elemente_id}` : undefined,
        });
      }
      return { status: "ok", treffer: denkmaleImUmkreis(p, radiusM, roh) };
    } catch (e) {
      return fehlerErgebnis("denkmal", "Denkmalkartierung Hamburg", e, sprache);
    }
  },
};
