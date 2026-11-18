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
import { geojsonBplan, type ZuPlan } from "./plandienste";
import type { BplanDienst, DenkmalDienst, PlanTreffer } from "./typen";

const FFM_WFS = "https://planas.frankfurt.de/wfs/bebauungsplaene_geltungsbereiche";

export const frankfurtBplan: BplanDienst = {
  id: "he-frankfurt-bplan",
  quelle: "Stadt Frankfurt am Main, Stadtplanungsamt: Geltungsbereiche der Bebauungspläne (WFS, dl-de/by-2.0)",
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
  quelle: "Landesamt für Denkmalpflege Hessen: DenkXweb Kulturdenkmäler (WFS, dl-de/by-2.0)",
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

// ---------------------------------------------------------------------------------------------
// Weitere B-Plan-Dienste (Recherche und Prüfung 18.11.2026)

/** GDI-Südhessen-Plattform (gdi-inspireumsetzer.de): je Kreis bzw. Stadt ein WFS im selben Schema "ft1:Planung".
 *  WMS-Fees aller Dienste: "Die Nutzung der Daten erfolgt unter den Bedingungen der Datenlizenz Deutschland -
 *  Namensnennung - Version 2.0 … Lizenzgeber ist die zuständige datenhaltende Stelle"; "Es besteht kein Anspruch auf
 *  Vollständigkeit." Der Dienst enthält auch Satzungen (TYP "Weitere Satzung") – nur TYP "Bebauungsplan" mit
 *  Rechtskraftdatum zählt. */
const suedhessenBplan: ZuPlan = (x, sprache) => {
  const art = wert(x.ART) ?? "";
  if (wert(x.TYP) !== "Bebauungsplan" || !wert(x.RECHTSKR)) return null;
  if (!/^(Bebauungsplan|Vorhaben- und Erschließungsplan)$|vorhabenbezogen/i.test(art)) return null;
  const vorhaben = /vorhaben/i.test(art);
  return {
    nummer: wert(x.NAME_A) ?? "",
    name: wert(x.NAME) ?? "",
    rechtsverbindlichSeit: datumText(x.RECHTSKR, sprache),
    vorhabenbezogen: vorhaben,
    verfahren: vorhaben ? art : undefined,
    link: webLink(x.PLAN_GES),
  };
};

function suedhessen(id: string, name: string, gebiet: { kreis?: string; gemeinde?: string }, orgId: string): BplanDienst {
  return geojsonBplan({
    id: `he-${id}-bplan`,
    quelle: `${name}: Bauleitplanung (GDI-Südhessen, dl-de/by-2.0)`,
    viewer: "https://www.geoportal.hessen.de/",
    gebiet: { land: "Hessen", ...gebiet },
    vollstaendig: false,
    browser: true, // die Plattform spiegelt die anfragende Herkunft (geprüft 18.11.2026)
    abdeckung: {
      de: `Rechtskräftige Bebauungspläne (${name}) aus der GDI-Südhessen-Plattform, mit Plan als PDF; laut Anbieter kein Anspruch auf Vollständigkeit.`,
      en: `Legally binding development plans (${name}) from the GDI South Hesse platform, with plan as PDF; according to the provider, no claim to completeness.`,
    },
    url: (p) =>
      `https://www.gdi-inspireumsetzer.de/ows/services/${orgId}_wfs?SERVICE=WFS&VERSION=2.0.0&REQUEST=GetFeature&TYPENAMES=ft1:Planung&COUNT=50&OUTPUTFORMAT=${encodeURIComponent("application/geo+json")}&SRSNAME=EPSG:4326&BBOX=${bboxBreiteLaenge(p, 2)}`,
    fehlerName: `Bauleitplanung ${name}`,
    zuPlan: suedhessenBplan,
  });
}

export const hochtaunusBplan = suedhessen("hochtaunus", "Hochtaunuskreis", { kreis: "Hochtaunuskreis" }, "org.11.b749c494-5ea4-4edb-9551-3f34fe245119");
export const wetterauBplan = suedhessen("wetterau", "Wetteraukreis", { kreis: "Wetteraukreis" }, "org.60.0056de89-e0b1-4d18-9c7d-22709e87f279");
export const bergstrasseBplan = suedhessen("bergstrasse", "Kreis Bergstraße", { kreis: "Kreis Bergstraße" }, "org.20.aab6a228-f01d-475b-b58d-a091bb6c3265");
export const grossGerauBplan = suedhessen("gross-gerau", "Kreis Groß-Gerau", { kreis: "Kreis Groß-Gerau" }, "org.4.15109c6b-ec98-4ab8-818a-418aa659eebc");
export const rheingauTaunusBplan = suedhessen("rheingau-taunus", "Rheingau-Taunus-Kreis", { kreis: "Rheingau-Taunus-Kreis" }, "org.45.bd7db733-0b0c-4eea-8e18-f68bc6e2ec43");
export const limburgWeilburgBplan = suedhessen("limburg-weilburg", "Landkreis Limburg-Weilburg", { kreis: "Landkreis Limburg-Weilburg" }, "org.48.9eb0070a-2cbc-4fc5-a162-9b435248face");
export const odenwaldBplan = suedhessen("odenwald", "Odenwaldkreis", { kreis: "Odenwaldkreis" }, "org.5.6996260f-4741-4b30-be09-cf8e11d0f8f9");
export const hanauBplan = suedhessen("hanau", "Stadt Hanau", { gemeinde: "Hanau" }, "org.59.5e174c7e-0b46-44d5-b47e-f7ff16e325fb");
export const ruesselsheimBplan = suedhessen("ruesselsheim", "Stadt Rüsselsheim am Main", { gemeinde: "Rüsselsheim am Main" }, "org.31.d0dea01a-0f0a-47de-8c76-633e568564fc");

/** Landkreis Fulda (CC0, ISO-Metadaten 5bab97ab-… im Geoportal Hessen): "Geltungsbereiche aller rechtskräftigen
 *  Bebauungspläne und Satzungen der Kommunen im Landkreis Fulda" – Satzungen und Einträge ohne Planart werden
 *  herausgefiltert. Abgefragt wird der Quell-WFS: Der OGC-API-Proxy des Geoportals lieferte am 18.11.2026 nur einen Teil
 *  der gemeldeten Treffer (numberMatched 5, numberReturned 0). Der Quell-WFS sendet keine CORS-Kopfzeilen → nur Server. */
export const fuldaBplan = geojsonBplan({
  id: "he-fulda-bplan",
  quelle: "Landkreis Fulda: Bebauungspläne der Kommunen (WFS, CC0)",
  viewer: "https://www.geoportal.hessen.de/",
  gebiet: { land: "Hessen", kreis: "Landkreis Fulda" },
  vollstaendig: false,
  browser: false,
  abdeckung: {
    de: "Rechtskräftige Bebauungspläne der Kommunen im Landkreis Fulda (einschließlich Stadt Fulda) mit Plan als PDF; eine ausdrückliche Aussage zur Vollständigkeit fehlt. In der Online-Version nicht abrufbar (technische Sperre des Dienstes).",
    en: "Legally binding development plans of the municipalities in the district of Fulda (including the town of Fulda) with plan as PDF; there is no explicit statement on completeness. Not available in the online version (technical restriction of the service).",
  },
  url: (p) =>
    `https://gmsck09.kc-systemhaus.de/geoserver/BPLKFD/wfs?SERVICE=WFS&VERSION=2.0.0&REQUEST=GetFeature&TYPENAMES=BPLKFD:BP_LKFD&COUNT=50&OUTPUTFORMAT=application/json&SRSNAME=EPSG:4326&BBOX=${bboxBreiteLaenge(p, 2)}`,
  fehlerName: "Bebauungspläne Landkreis Fulda",
  zuPlan: (x, sprache) => {
    const art = wert(x.PLAN_ART) ?? "";
    if (!/bebauungsplan/i.test(art)) return null;
    const vorhaben = /vorhaben/i.test(art);
    return {
      nummer: "",
      name: (wert(x.PLAN_NAME) ?? "").replace(/_/g, " "),
      rechtsverbindlichSeit: datumText(x.DAT_RECHT, sprache),
      vorhabenbezogen: vorhaben,
      verfahren: art !== "Bebauungsplan" ? art : undefined,
      link: webLink(x.LINK_SONST),
    };
  },
});
