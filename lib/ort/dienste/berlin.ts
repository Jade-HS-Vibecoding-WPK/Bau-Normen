// Berlin: Bebauungspläne (SenSBW, GDI Berlin, WFS 2.0) und Denkmale (Landesdenkmalamt, GDI Berlin, WFS 2.0).
// Beide mit Access-Control-Allow-Origin: * (geprüft 17.11.2026), Lizenz dl-de/zero-2.0.
import { holeJson } from "../abruf";
import { zweisprachig } from "../../sprache";
import { datumText, denkmaleImUmkreis, fehlerErgebnis, gekuerzt, geoJsonObjekte, LON_LAT, umrechnen, umrissVon, wert, webLink, type DenkmalRoh, type Punkt } from "./hilfen";
import type { BplanDienst, DenkmalDienst, PlanTreffer } from "./typen";

const BPLAN_WFS = "https://gdi.berlin.de/services/wfs/bplan";
const DENKMAL_WFS = "https://gdi.berlin.de/services/wfs/denkmale";

/** FES-2.0-Filter: Geometrie schneidet den Punkt bzw. liegt im Abstand (Meter) – Punkt in urn:EPSG::4326 (Breite Länge) */
function filter(lat: number, lon: number, abstandM?: number): string {
  const punkt = `<gml:Point gml:id="p1" srsName="urn:ogc:def:crs:EPSG::4326"><gml:pos>${lat.toFixed(7)} ${lon.toFixed(7)}</gml:pos></gml:Point>`;
  const kern =
    abstandM === undefined
      ? `<fes:Intersects><fes:ValueReference>geom</fes:ValueReference>${punkt}</fes:Intersects>`
      : `<fes:DWithin><fes:ValueReference>geom</fes:ValueReference>${punkt}<fes:Distance uom="m">${abstandM}</fes:Distance></fes:DWithin>`;
  return encodeURIComponent(`<fes:Filter xmlns:fes="http://www.opengis.net/fes/2.0" xmlns:gml="http://www.opengis.net/gml/3.2">${kern}</fes:Filter>`);
}

export const berlinBplan: BplanDienst = {
  id: "be-bplan",
  quelle: "Senatsverwaltung für Stadtentwicklung, Bauen und Wohnen Berlin: Bebauungsplanverfahren (festgesetzte Pläne, dl-de/zero-2.0)",
  viewer: "https://gdi.berlin.de/viewer/main/",
  gebiet: { land: "Berlin" },
  // Abstract: "den Gesamtbestand aller Bebauungsplanverfahren in Berlin". Nicht enthalten ist aber der Baunutzungsplan
  // (West-Berlin 1958/60), der zusammen mit förmlich festgestellten Bau- und Straßenfluchtlinien als Bebauungsplan
  // fortgilt – er liegt nur als nicht abfragbare Rasterkarte vor. Deshalb nicht als vollständig gekennzeichnet.
  vollstaendig: false,
  browser: true,
  abdeckung: {
    de: "Alle festgesetzten Bebauungspläne Berlins; nicht enthalten ist der als Bebauungsplan fortgeltende Baunutzungsplan (West-Berlin, 1958/60) mit den förmlich festgestellten Fluchtlinien.",
    en: "All adopted development plans of Berlin; not included is the Baunutzungsplan (West Berlin, 1958/60) which, together with formally fixed building lines, continues to apply as a development plan.",
  },
  async abfrage(lat, lon, sprache) {
    const t = zweisprachig(sprache);
    const p: Punkt = [lon, lat];
    const url = `${BPLAN_WFS}?SERVICE=WFS&VERSION=2.0.0&REQUEST=GetFeature&TYPENAMES=bplan:b_bp_fs&COUNT=50&OUTPUTFORMAT=application/json&SRSNAME=EPSG:4326&FILTER=${filter(lat, lon)}`;
    try {
      const treffer: PlanTreffer[] = geoJsonObjekte(await holeJson(url)).map((f) => {
        const x = f.properties ?? {};
        const art = wert(x.planartname);
        const stand = wert(x.bp_rechtsstand);
        const festgesetzt = datumText(x.festsg_am, sprache);
        const verkuendet = datumText(x.fsg_gvbl_d, sprache);
        const verfahren = [
          art,
          stand && stand !== "In Kraft getreten" ? stand : undefined,
          festgesetzt ? t(`festgesetzt am ${festgesetzt}`, `adopted on ${festgesetzt}`) : undefined,
          verkuendet ? t(`verkündet im GVBl. vom ${verkuendet}`, `published in the official gazette on ${verkuendet}`) : undefined,
          wert(x.ersetztdurchteil) ? t("teilweise durch spätere Pläne ersetzt", "partly replaced by later plans") : undefined,
        ].filter(Boolean);
        return {
          nummer: wert(x.planname) ?? wert(x.planid) ?? "?",
          name: gekuerzt(wert(x.bereich), 160) ?? "",
          vorhabenbezogen: /vorhabenbezogen/i.test(art ?? ""),
          verfahren: verfahren.join(" · ") || undefined,
          link: webLink(x.scan_www) ?? webLink(x.url_www) ?? webLink(x.grund_www),
          umriss: umrissVon(p, umrechnen(f.geometry, LON_LAT), 300),
        };
      });
      return { status: "ok", treffer };
    } catch (e) {
      return fehlerErgebnis("bplan", "Bebauungspläne Berlin", e, sprache);
    }
  },
};

const GRUPPE = new Set(["Ensemble", "Gesamtanlage"]);
const ART_EN: Record<string, string> = {
  Baudenkmal: "Listed building",
  Gesamtanlage: "Listed complex (Gesamtanlage)",
  Gartendenkmal: "Listed garden",
  Ensemble: "Ensemble",
  Bodendenkmal: "Archaeological monument",
};

export const berlinDenkmal: DenkmalDienst = {
  id: "be-denkmal",
  quelle: "Landesdenkmalamt Berlin: Denkmale (GDI Berlin, dl-de/zero-2.0)",
  viewer: "https://denkmaldatenbank.berlin.de/",
  gebiet: { land: "Berlin" },
  // Abstract: die "in der Denkmalliste Berlin aufgeführten Denkmalpositionen", nachrichtlicher Charakter; laut
  // Landesdenkmalamt sind Ensemble-Bestandteile noch nicht vollständig gebäudegenau kartiert.
  vollstaendig: false,
  browser: true,
  abdeckung: {
    de: "Kartierung der Denkmalliste Berlin (nachrichtlich); Ensemble-Bestandteile noch nicht vollständig erfasst. Der Dienst nennt nur Art und Nummer; Name und Beschreibung stehen in der Denkmaldatenbank (Link).",
    en: "Mapping of the Berlin list of monuments (for information only); ensemble parts not yet fully mapped. The service only gives type and number; name and description are in the monument database (link).",
  },
  async abfrage(lat, lon, radiusM, sprache) {
    const t = zweisprachig(sprache);
    const p: Punkt = [lon, lat];
    const url = `${DENKMAL_WFS}?SERVICE=WFS&VERSION=2.0.0&REQUEST=GetFeature&TYPENAMES=denkmale:denkmale&COUNT=100&OUTPUTFORMAT=application/json&SRSNAME=EPSG:4326&FILTER=${filter(lat, lon, radiusM + 5)}`;
    try {
      const roh: DenkmalRoh[] = geoJsonObjekte(await holeJson(url, 12000)).map((f) => {
        const x = f.properties ?? {};
        const typ = wert(x.typ) ?? "Denkmal";
        const nr = wert(x.id) ?? "?";
        const art = t(typ, ART_EN[typ] ?? typ);
        return {
          name: t(`${typ} Nr. ${nr}`, `${art} no. ${nr}`),
          ausweisung: art,
          gruppe: GRUPPE.has(typ),
          link: webLink(x.link),
          geometrie: umrechnen(f.geometry, LON_LAT),
          schluessel: wert(x.gisid),
        };
      });
      return { status: "ok", treffer: denkmaleImUmkreis(p, radiusM, roh) };
    } catch (e) {
      return fehlerErgebnis("denkmal", "Denkmale Berlin", e, sprache);
    }
  },
};
