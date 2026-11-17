// Hessen:
//  - B-Pläne: Es gibt keinen landesweiten Dienst (Geoportal Hessen nur einzelne Gemeindedienste, viele Gemeinden nur PDF im
//    Bauleitplanungsportal). Angebunden: Stadt Frankfurt am Main (Stadtplanungsamt, WFS "Geltungsbereiche", dl-de/by-2.0).
//    Wiesbaden und Kassel: kein offener Abfragedienst gefunden.
//  - Denkmale: Landesamt für Denkmalpflege Hessen, DenkXweb-Geodienste (WFS, dl-de/by-2.0).
// Beide mit Access-Control-Allow-Origin: * (geprüft 17.11.2026).
import { holeJson } from "../abruf";
import { zweisprachig } from "../../sprache";
import {
  abstand, bboxBreiteLaenge, bboxLaengeBreite, datumText, denkmaleImUmkreis, fehlerErgebnis, gekuerzt, geoJsonObjekte, htmlZuText, liegtIn, LON_LAT,
  umrechnen, umrissVon, wert, webLink, type DenkmalRoh, type Punkt,
} from "./hilfen";
import type { BplanDienst, DenkmalDienst, PlanTreffer } from "./typen";

const FFM_WFS = "https://planas.frankfurt.de/wfs/bebauungsplaene_geltungsbereiche";

export const frankfurtBplan: BplanDienst = {
  id: "he-frankfurt-bplan",
  quelle: "Stadt Frankfurt am Main, Stadtplanungsamt – Geltungsbereiche der Bebauungspläne (WFS, dl-de/by-2.0)",
  viewer: "https://planas.frankfurt.de/",
  gebiet: { land: "Hessen", gemeinde: "Frankfurt am Main" },
  // Metadaten: "Aktuelle Geltungsbereiche der rechtsverbindlichen und im Verfahren befindlichen Bebauungspläne der Stadt
  // Frankfurt am Main", tagesaktuell – eine ausdrückliche Aussage zur Vollständigkeit fehlt, daher nicht als vollständig gekennzeichnet.
  vollstaendig: false,
  browser: true,
  abdeckung: {
    de: "Geltungsbereiche der rechtsverbindlichen Bebauungspläne der Stadt Frankfurt am Main (tagesaktuell); eine ausdrückliche Aussage zur Vollständigkeit fehlt.",
    en: "Areas of the legally binding development plans of the City of Frankfurt am Main (updated daily); there is no explicit statement on completeness.",
  },
  async abfrage(lat, lon, sprache) {
    const p: Punkt = [lon, lat];
    // WFS 1.1.0 (QGIS Server): BBOX in Länge, Breite
    const url = `${FFM_WFS}?SERVICE=WFS&VERSION=1.1.0&REQUEST=GetFeature&TYPENAME=bplan_rv&MAXFEATURES=50&SRSNAME=EPSG:4326&BBOX=${bboxLaengeBreite(p, 1)},EPSG:4326&OUTPUTFORMAT=application/json`;
    try {
      const treffer: PlanTreffer[] = [];
      for (const f of geoJsonObjekte(await holeJson(url))) {
        const x = f.properties ?? {};
        if (wert(x.status) && !/rechtsverbindlich/i.test(String(x.status))) continue;
        const g = umrechnen(f.geometry, LON_LAT);
        if (g && !liegtIn(p, g)) continue;
        const typ = wert(x.typ);
        const titel = wert(x.titel);
        treffer.push({
          nummer: wert(x.projekt_nr) ?? "?",
          name: titel && !/^ohne titel$/i.test(titel) ? titel : "",
          rechtsverbindlichSeit: datumText(x.inkrafttreten, sprache),
          vorhabenbezogen: /vorhabenbezogen/i.test(typ ?? ""),
          verfahren: typ && typ !== "Bebauungsplan" ? typ : undefined,
          link: webLink(x.link_planas),
          umriss: umrissVon(p, g, 300),
        });
      }
      return { status: "ok", treffer };
    } catch (e) {
      return fehlerErgebnis("bplan", "Bebauungspläne Frankfurt am Main", e, sprache);
    }
  },
};

// --- Denkmale ---

const DENKX_WFS = "https://geodienste.denkx.de/geoserver/denkx/ows";
/** Bodendenkmale gibt der Dienst als Mittelpunkt an: "Im Umkreis von 300 m ist mit Bodendenkmälern zu rechnen" */
const BODEN_RADIUS_M = 300;

/** "Frankfurt, Stadt_Frankfurt_Innenstadt_Saalgasse 2" -> ["Saalgasse 2", "Frankfurt"] */
function namensTeile(siteName: string): [string, string | undefined] {
  const teile = siteName.split("_").map((s) => s.trim()).filter(Boolean);
  const gemeinde = teile.length > 1 ? teile[0].replace(/,\s*(Stadt|Gemeinde)$/i, "") : undefined;
  return [teile[teile.length - 1] ?? siteName, gemeinde];
}

export const hessenDenkmal: DenkmalDienst = {
  id: "he-denkmal",
  quelle: "Landesamt für Denkmalpflege Hessen – DenkXweb Kulturdenkmäler (WFS, dl-de/by-2.0)",
  viewer: "https://denkxweb.denkmalpflege-hessen.de/",
  gebiet: { land: "Hessen" },
  // Dienstbeschreibung: "Die Themen 'Baudenkmal' und 'Flächendenkmal' decken nicht die gesamte Landesfläche ab"
  // (Bearbeitungsstand: https://denkxweb.denkmalpflege-hessen.de/bearbeitungsstand/). Bodendenkmale landesweit, aber nur
  // als Mittelpunkt mit 300 m Wirkumkreis.
  vollstaendig: false,
  browser: true,
  abdeckung: {
    de: "Bau- und Flächendenkmäler noch nicht für das ganze Land erfasst; Bodendenkmäler nur als Mittelpunkt mit 300 m Umkreis, in dem mit Funden zu rechnen ist.",
    en: "Listed buildings and areas not yet recorded for the whole state; archaeological monuments only as a centre point with a 300 m radius in which finds are to be expected.",
  },
  async abfrage(lat, lon, radiusM, sprache) {
    const t = zweisprachig(sprache);
    const p: Punkt = [lon, lat];
    // GeoServer verbindet hier keine Objektarten in einer Anfrage – je Ebene eine
    const anfrage = (typ: string, umkreis: number) =>
      holeJson(`${DENKX_WFS}?SERVICE=WFS&VERSION=2.0.0&REQUEST=GetFeature&TYPENAMES=denkx:${typ}&COUNT=200&OUTPUTFORMAT=application/json&SRSNAME=EPSG:4326&BBOX=${bboxBreiteLaenge(p, umkreis)}`, 12000);
    try {
      const [bau, flaeche, boden] = await Promise.all([
        anfrage("baudenkmal", radiusM + 10),
        anfrage("flaechendenkmal", radiusM + 10),
        anfrage("archaeologischesDenkmal", radiusM + BODEN_RADIUS_M + 10),
      ]);
      const baulich = (f: ReturnType<typeof geoJsonObjekte>[number]): DenkmalRoh => {
        const x = f.properties ?? {};
        const [name, gemeinde] = namensTeile(wert(x.siteName) ?? "");
        const flaechig = x.siteDesignation === "flaechendenkmal" || /gesamtanlage/i.test(String(x.designationLegalDefinition ?? ""));
        const definition = String(x.designationLegalDefinition ?? "");
        const art = flaechig
          ? t("Gesamtanlage", "Ensemble (Gesamtanlage)")
          : /gruenflaeche/i.test(definition)
            ? t("Kulturdenkmal (Grünfläche)", "Listed monument (green space)")
            : /wasserflaeche/i.test(definition)
              ? t("Kulturdenkmal (Wasserfläche)", "Listed monument (water body)")
              : t("Kulturdenkmal", "Listed monument");
        return {
          name: name || t("Kulturdenkmal", "Listed monument"),
          anschrift: /\d/.test(name) && gemeinde ? `${name}, ${gemeinde}` : undefined,
          ausweisung: art,
          beschreibung: gekuerzt(htmlZuText(String(x.legalFoundationDocument ?? "")) || undefined),
          gruppe: flaechig,
          link: webLink(x.publicationSource),
          geometrie: umrechnen(f.geometry, LON_LAT),
          schluessel: wert(x.inspireID),
        };
      };
      const treffer = denkmaleImUmkreis(p, radiusM, [...geoJsonObjekte(bau).map(baulich), ...geoJsonObjekte(flaeche).map(baulich)]);
      // Bodendenkmale: Der Dienst nennt nur Mittelpunkte; im Umkreis von 300 m um jeden ist mit Bodendenkmälern zu rechnen.
      // Alle Umkreise, die den Standort (plus Suchradius) erfassen, werden zu einem Eintrag zusammengefasst.
      const fundstellen = geoJsonObjekte(boden)
        .flatMap((f) => {
          const g = umrechnen(f.geometry, LON_LAT);
          const mitte = g?.type === "Point" ? (g.coordinates as Punkt) : g?.type === "MultiPoint" ? (g.coordinates as Punkt[])[0] : undefined;
          return mitte ? [{ name: wert(f.properties?.siteName) ?? "?", mitte, abstand: abstand(p, { type: "Point", coordinates: mitte }) }] : [];
        })
        .filter((x) => x.abstand <= BODEN_RADIUS_M + radiusM)
        .sort((a, b) => a.abstand - b.abstand);
      if (fundstellen.length) {
        const naechste = fundstellen[0];
        const liste = fundstellen.slice(0, 8).map((x) => x.name).join(", ") + (fundstellen.length > 8 ? " …" : "");
        treffer.push({
          name: t(
            fundstellen.length === 1 ? `Bodendenkmal ${naechste.name} (Umkreis 300 m)` : `${fundstellen.length} Bodendenkmal-Fundstellen (Umkreis je 300 m)`,
            fundstellen.length === 1 ? `Archaeological monument ${naechste.name} (300 m radius)` : `${fundstellen.length} archaeological sites (300 m radius each)`,
          ),
          ausweisung: t("Bodendenkmal (Mittelpunkt mit 300 m Wirkumkreis)", "Archaeological monument (centre point with 300 m radius)"),
          beschreibung: t(
            `Laut Landesamt ist im Umkreis von 300 m um jede verzeichnete Fundstelle mit Bodendenkmälern zu rechnen. Fundstellen: ${liste}; nächster Mittelpunkt in ${Math.round(naechste.abstand)} m.`,
            `According to the state office, archaeological monuments are to be expected within 300 m of each recorded site. Sites: ${liste}; nearest centre ${Math.round(naechste.abstand)} m away.`,
          ),
          gruppe: false,
          // 0 = Standort liegt im 300-m-Umkreis einer Fundstelle
          entfernungM: Math.max(0, Math.round(naechste.abstand - BODEN_RADIUS_M)),
          umriss: umrissVon(p, { type: "Point", coordinates: naechste.mitte }),
        });
        treffer.sort((x, y) => x.entfernungM - y.entfernungM || Number(x.gruppe) - Number(y.gruppe));
      }
      return { status: "ok", treffer };
    } catch (e) {
      return fehlerErgebnis("denkmal", "DenkXweb Hessen", e, sprache);
    }
  },
};
