// Land Bremen: Bebauungspläne der Stadtgemeinde Bremen (XPlanung-Plattform, XPlanSynWFS), der Stadt Bremerhaven
// (WMS GetFeatureInfo, GeoInformation Bremen) und Kulturdenkmale des Landes (Landesamt für Denkmalpflege, WFS).
// Alle mit CORS-Kopfzeilen (geprüft 17.11.2026). Bodendenkmale: Dienst nur mit Anmeldung (HTTP 401) – nicht angebunden.
import { holeText } from "../abruf";
import { zweisprachig } from "../../sprache";
import { datumText, denkmaleImUmkreis, fehlerErgebnis, gekuerzt, gmlObjekte, LON_LAT, rechteck, wert, webLink, type DenkmalRoh, type Punkt } from "./hilfen";
import type { BplanDienst, DenkmalDienst, PlanTreffer } from "./typen";
import { XPLANSYN, xplanAbfrage } from "./xplanung";

export const bremenBplan: BplanDienst = {
  id: "hb-bremen-bplan",
  quelle: "Freie Hansestadt Bremen, Senatorin für Bau, Mobilität und Stadtentwicklung – Rechtskräftige Bebauungspläne (XPlanung, CC BY)",
  viewer: "https://www.bauleitplan.bremen.de/",
  gebiet: { land: "Bremen", gemeinde: "Bremen" },
  // WMS-Beschreibung: "Der Datensatz umfasst die Umrisse alle rechtsgültigen Bebauungspläne der Stadtgemeinde Bremen",
  // Datensatz-Metadaten (7952F580-…) zugleich: "Datenbestand im Aufbau: Die Geltungsbereiche werden z. Z. überarbeitet".
  // Wegen der noch nicht angepassten Geltungsbereiche nicht als vollständig gekennzeichnet.
  vollstaendig: false,
  browser: true, // Access-Control-Allow-Origin wird gespiegelt
  abdeckung: {
    de: "Laut Stadt alle rechtsgültigen Bebauungspläne der Stadtgemeinde Bremen; die Geltungsbereiche werden aber noch überarbeitet („Datenbestand im Aufbau“).",
    en: "According to the city all legally valid development plans of the municipality of Bremen; the plan boundaries are however still being revised (“data being built up”).",
  },
  abfrage: (lat, lon, sprache) =>
    xplanAbfrage(
      {
        wfs: "https://hb.xplanboxcloud.dataport.de/xplansyn-wfs/services/xplansynwfs",
        name: "Bebauungspläne Stadt Bremen",
        namensraum: XPLANSYN,
        hinweis: (x, s) =>
          /ANPASSUNG_UMRING/i.test(`${x.nummer ?? ""} ${x.name ?? ""}`)
            ? zweisprachig(s)("Geltungsbereich wird noch angepasst", "plan boundary still being adjusted")
            : undefined,
      },
      lat,
      lon,
      sprache,
    ),
};

const BHV_WMS = "https://geodienste.bremen.de/wms_bebauungsplaene_bhv";

export const bremerhavenBplan: BplanDienst = {
  id: "hb-bremerhaven-bplan",
  quelle: "Magistrat der Stadt Bremerhaven – Bebauungspläne (WMS GeoInformation Bremen, CC BY)",
  viewer: "https://geoportal.bremen.de/geoportal/",
  gebiet: { land: "Bremen", gemeinde: "Bremerhaven" },
  // Metadaten (metaver.de 04e56cb2-96c7-495f-ba9b-eb67c72d98cf) und WMS-Beschreibung:
  // "Der Datensatz umfasst die Umrisse alle rechtsgültigen Bebauungspläne der Stadt Bremerhaven."
  vollstaendig: true,
  browser: true, // Access-Control-Allow-Origin: *
  abdeckung: {
    de: "Alle rechtsgültigen Bebauungspläne der Stadt Bremerhaven (Umrisse); der Dienst nennt Nummer, Titel und Inkrafttreten, aber keine Planunterlagen.",
    en: "All legally valid development plans of the City of Bremerhaven (outlines); the service gives number, title and date of entry into force, but no plan documents.",
  },
  async abfrage(lat, lon, sprache) {
    // GetFeatureInfo am Punkt: 101 × 101 Pixel um den Punkt (ca. 1 m je Pixel), Abfrage in der Bildmitte
    const [a, b, c, d] = rechteck([lon, lat], 50);
    const url =
      `${BHV_WMS}?SERVICE=WMS&VERSION=1.3.0&REQUEST=GetFeatureInfo&LAYERS=bebauungsplaene_bhv&QUERY_LAYERS=bebauungsplaene_bhv&STYLES=` +
      `&CRS=CRS:84&BBOX=${[a, b, c, d].map((x) => x.toFixed(6)).join(",")}&WIDTH=101&HEIGHT=101&I=50&J=50&INFO_FORMAT=text/xml&FEATURE_COUNT=20`;
    try {
      const gesehen = new Set<string>();
      const treffer: PlanTreffer[] = [];
      for (const o of gmlObjekte(await holeText(url), LON_LAT)) {
        const x = o.werte;
        if (x.planwerk && !/BPLAN/i.test(x.planwerk)) continue;
        const nummer = wert(x.bplannr) ?? wert(x.quelle) ?? "?";
        if (gesehen.has(nummer)) continue;
        gesehen.add(nummer);
        treffer.push({ nummer, name: wert(x.titel) ?? "", rechtsverbindlichSeit: datumText(x.inkraftset, sprache), vorhabenbezogen: false, umriss: [] });
      }
      return { status: "ok", treffer };
    } catch (e) {
      return fehlerErgebnis("bplan", "Bebauungspläne Bremerhaven", e, sprache);
    }
  },
};

const DENKMAL_WFS = "https://geodienste.bremen.de/wfs_kulturdenkmale";

export const bremenDenkmal: DenkmalDienst = {
  id: "hb-denkmal",
  quelle: "Landesamt für Denkmalpflege und Archäologie Bremen – Kulturdenkmale Land Bremen (WFS, CC BY)",
  viewer: "https://geoportal.bremen.de/denkmalinfosystem/",
  gebiet: { land: "Bremen" },
  // Metadaten ohne Aussage zur Vollständigkeit; Bodendenkmale sind nicht frei abrufbar.
  vollstaendig: false,
  browser: true, // Access-Control-Allow-Origin: *
  abdeckung: {
    de: "Einzeldenkmale und Ensembles in Bremen und Bremerhaven; keine Aussage zur Vollständigkeit, Bodendenkmale fehlen (nicht frei abrufbar).",
    en: "Individual monuments and ensembles in Bremen and Bremerhaven; no statement on completeness, archaeological monuments missing (not openly available).",
  },
  async abfrage(lat, lon, radiusM, sprache) {
    const t = zweisprachig(sprache);
    const p: Punkt = [lon, lat];
    const bbox = rechteck(p, radiusM + 10).map((x) => x.toFixed(6)).join(",");
    const url = `${DENKMAL_WFS}?SERVICE=WFS&VERSION=2.0.0&REQUEST=GetFeature&COUNT=200&TYPENAMES=app:einzeldenkmale,app:ensembles,app:bestandteile&SRSNAME=EPSG:4326&BBOX=${bbox},EPSG:4326`;
    try {
      const objekte = gmlObjekte(await holeText(url, 12000), LON_LAT);
      // Ensemble-Bestandteile, die zugleich Einzeldenkmal sind, nur einmal (als Einzeldenkmal) zeigen
      const einzeln = new Set(objekte.filter((o) => o.typ === "einzeldenkmale").map((o) => o.werte.objdoknr));
      const roh: DenkmalRoh[] = objekte.filter((o) => o.typ !== "bestandteile" || !einzeln.has(o.werte.objdoknr)).map((o) => {
        const x = o.werte;
        const typ = wert(x.typ) ?? (o.typ === "ensembles" ? "Ensemble" : "Kulturdenkmal");
        // Bestandteile sind als Teil des Ensembles geschützt, nicht als Einzeldenkmal
        const gruppe = o.typ !== "einzeldenkmale" || /ensemble/i.test(typ);
        const anschrift = [wert(x.strasse), wert(x.hausnr) !== "0" ? wert(x.hausnr) : undefined].filter(Boolean).join(" ") || undefined;
        return {
          name: wert(x.d_5202) ?? anschrift ?? t(typ, "Monument"),
          anschrift: anschrift && wert(x.stadt) ? `${anschrift}, ${x.stadt}` : anschrift,
          ausweisung: o.typ === "bestandteile" ? t(`${typ} (Teil eines Ensembles)`, `${typ} (part of an ensemble)`) : typ,
          beschreibung: gekuerzt([wert(x.d_5080), wert(x.d_4100)].filter(Boolean).join(" · ") || undefined),
          gruppe,
          link: webLink(x.link),
          geometrie: o.geometrie,
          schluessel: wert(x.objdoknr) ? `${o.typ}:${x.objdoknr}` : undefined,
        };
      });
      return { status: "ok", treffer: denkmaleImUmkreis(p, radiusM, roh) };
    } catch (e) {
      return fehlerErgebnis("denkmal", "Kulturdenkmale Bremen", e, sprache);
    }
  },
};
