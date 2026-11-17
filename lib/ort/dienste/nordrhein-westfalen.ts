// Nordrhein-Westfalen:
//  - B-Pläne: OGC API "Bauleitplanung in NRW (INSPIRE)" von IT.NRW für das Bauministerium – Gemeinden liefern freiwillig
//  - Denkmale: INSPIRE-WFS "Listen der Denkmäler nach dem DSchG NRW" (Land, lückenhaft), dazu die Denkmalliste der Stadt Köln
//    (WFS) und der Stadt Dortmund (Open-Data-Schnittstelle), weil das Landes-Dataset dort fehlt bzw. unbrauchbar ist.
// Alle mit CORS-Kopfzeilen (geprüft 17.11.2026). Düsseldorf, Bonn (B-Pläne), Wuppertal: keine offenen Abfragedienste gefunden.
import { holeJson, holeText } from "../abruf";
import { zweisprachig } from "../../sprache";
import {
  bboxBreiteLaenge, bboxUtm, datumText, denkmaleImUmkreis, fehlerErgebnis, gekuerzt, geoJsonObjekte, gmlObjekte, liegtIn, LON_LAT, umrechnen,
  umrissVon, unlesbar, UTM, wert, webLink, type DenkmalRoh, type Punkt,
} from "./hilfen";
import type { BplanDienst, DenkmalDienst, PlanTreffer } from "./typen";

const BPLAN_API = "https://ogc-api.nrw.de/inspire-lu-bplan/v1/collections/spatialplan/items";
/** planart-Codes, die keine Bebauungspläne sind: Veränderungssperre, Satzungen nach § 34/35 BauGB, örtliche Bauvorschrift */
const KEIN_BPLAN = new Set(["1100", "4000", "40000", "40001", "40002", "5000", "7000"]);

export const nrwBplan: BplanDienst = {
  id: "nw-bplan",
  quelle: "Land NRW (IT.NRW / MHKBD) – Bauleitplanung in NRW, OGC API (dl-de/by-2.0)",
  viewer: "https://www.bauleitplanung.nrw.de/",
  gebiet: { land: "Nordrhein-Westfalen" },
  // Metadaten: "Der Datenbestand befindet sich im Aufbau und ist … unvollständig, da eine Bereitstellung der kommunalen
  // Bauleitpläne an die Landesebene auf freiwilliger Basis erfolgt". Z. B. Bonn und Wuppertal fehlen, Düsseldorf nur teilweise.
  vollstaendig: false,
  browser: true,
  abdeckung: {
    de: "Nur Pläne der Gemeinden, die freiwillig an das Land liefern (z. B. Köln, Dortmund, Essen; Bonn und Wuppertal fehlen, Düsseldorf nur teilweise).",
    en: "Only plans of municipalities that voluntarily report to the state (e.g. Cologne, Dortmund, Essen; Bonn and Wuppertal missing, Düsseldorf only partly).",
  },
  async abfrage(lat, lon, sprache) {
    const t = zweisprachig(sprache);
    const p: Punkt = [lon, lat];
    const filter = `S_INTERSECTS(extent,POINT(${lon.toFixed(6)} ${lat.toFixed(6)})) AND planTypeName.code = 1000 AND processStepGeneral.code IN (4000,4500)`;
    const url = `${BPLAN_API}?f=json&limit=100&filter-lang=cql2-text&filter=${encodeURIComponent(filter)}`;
    try {
      const treffer: PlanTreffer[] = [];
      for (const f of geoJsonObjekte(await holeJson(url))) {
        const x = f.properties ?? {};
        if (Number(x["planTypeName.code"]) !== 1000 || ![4000, 4500].includes(Number(x["processStepGeneral.code"]))) continue;
        if (KEIN_BPLAN.has(String(x["planart.code"] ?? ""))) continue;
        const g = umrechnen(f.geometry, LON_LAT);
        if (g && !liegtIn(p, g)) continue;
        const art = wert(x["planart.title"]);
        treffer.push({
          nummer: wert(x.nr) ?? String(f.id ?? "?"),
          name: [wert(x.officialTitle), wert(x.kommune)].filter(Boolean).join(" – "),
          rechtsverbindlichSeit: datumText(x.validFrom, sprache),
          vorhabenbezogen: ["3000", "3100"].includes(String(x["planart.code"] ?? "")),
          verfahren:
            [art && !/ohne Angabe/i.test(art) ? art : undefined, Number(x["processStepGeneral.code"]) === 4500 ? t("teilweise aufgehoben", "partly repealed") : undefined]
              .filter(Boolean)
              .join(" · ") || undefined,
          link: webLink(x.officialDocument),
          umriss: umrissVon(p, g, 300),
        });
      }
      return { status: "ok", treffer };
    } catch (e) {
      return fehlerErgebnis("bplan", "Bauleitplanung NRW", e, sprache);
    }
  },
};

// --- Denkmale: Land ---

const NRW_WFS = "https://www.wfs.nrw.de/wfs/wfs_nw_inspire-denkmal";
const NRW_TYPEN = ["Cultural", "Archaeological"].flatMap((a) => ["Point", "Multipoint", "Line", "Surface"].map((g) => `ps:ProtectedSites_${a}_${g}`));
/** Gemeinden mit eigenem Dienst (Köln) bzw. unbrauchbaren Landesdaten (Dortmund: alle Punkte auf einer Koordinate) */
const NRW_AUSGENOMMEN = /^DE_0?5(315|913)000/;

export const nrwDenkmal: DenkmalDienst = {
  id: "nw-denkmal",
  quelle: "Land NRW (IT.NRW / MHKBD) – INSPIRE Denkmäler nach dem DSchG NRW (dl-de/zero-2.0)",
  gebiet: { land: "Nordrhein-Westfalen" },
  // Capabilities: "befindet sich zur Zeit noch im Aufbau und kann daher u.U. … unvollständig sein". Im Test ohne Daten:
  // Köln, Düsseldorf, Münster, Duisburg, Paderborn; Dortmund unbrauchbar (wird hier ausgefiltert).
  vollstaendig: false,
  browser: true,
  abdeckung: {
    de: "Landesweite Sammlung der kommunalen Denkmallisten im Aufbau – für viele Städte (z. B. Düsseldorf, Münster, Duisburg) noch ohne Daten.",
    en: "State-wide collection of the municipal lists of monuments, still being built up – no data yet for many cities (e.g. Düsseldorf, Münster, Duisburg).",
  },
  async abfrage(lat, lon, radiusM, sprache) {
    const t = zweisprachig(sprache);
    const p: Punkt = [lon, lat];
    // Der Dienst wertet eine BBOX nur in EPSG:25832 aus; Antwort dann ebenfalls in EPSG:25832
    const url = `${NRW_WFS}?SERVICE=WFS&VERSION=2.0.0&REQUEST=GetFeature&TYPENAMES=${NRW_TYPEN.join(",")}&COUNT=300&BBOX=${bboxUtm(p, radiusM + 10, 32)},urn:ogc:def:crs:EPSG::25832`;
    try {
      const roh: DenkmalRoh[] = gmlObjekte(await holeText(url, 12000), UTM(32)).flatMap((o) => {
        const x = o.werte;
        const nr = wert(x.nummer) ?? wert(x.id_localid);
        if (nr && NRW_AUSGENOMMEN.test(nr)) return [];
        const art = wert(x.designation) ?? (/Archaeological/.test(o.typ) ? "Bodendenkmal" : "Denkmal");
        const seit = datumText(x.legalfoundationdate, sprache);
        return [
          {
            name: wert(x.sitename) ?? t(art, "Monument"),
            ausweisung: art,
            beschreibung: seit ? t(`eingetragen am ${seit}`, `listed on ${seit}`) : undefined,
            gruppe: /bereich/i.test(art),
            geometrie: o.geometrie,
            schluessel: nr,
          },
        ];
      });
      return { status: "ok", treffer: denkmaleImUmkreis(p, radiusM, roh) };
    } catch (e) {
      return fehlerErgebnis("denkmal", "Denkmäler NRW", e, sprache);
    }
  },
};

// --- Denkmale: Köln ---

const KOELN_WFS = "https://geoportal.stadt-koeln.de/wss/service/denkmalliste_wfs/guest";
/** Ebenen der Kölner Denkmalliste mit ihren Titeln aus dem Dienst (ohne UNESCO-Pufferzone – kein Denkmal) */
const KOELN_EBENEN: Record<string, [string, string]> = {
  gebaeude: ["Baudenkmal (Gebäude)", "Listed building"],
  punkte: ["Baudenkmal (Kleindenkmal)", "Listed small monument"],
  linie: ["Baudenkmal (Fassade/Einfriedung)", "Listed façade/enclosure"],
  freiflaechen: ["Baudenkmal (Freifläche)", "Listed open space"],
  gruenflaeche: ["Baudenkmal (Grünanlage)", "Listed green space"],
  gewaesser: ["Baudenkmal (Gewässer)", "Listed water body"],
  alleen: ["Baudenkmal (Allee/Baumreihe)", "Listed avenue/row of trees"],
  baum: ["Baudenkmal (Baum)", "Listed tree"],
};

export const koelnDenkmal: DenkmalDienst = {
  id: "nw-koeln-denkmal",
  quelle: "Stadt Köln, Stadtkonservator*in – Denkmalliste Stadt Köln (WFS, dl-de/zero-2.0)",
  viewer: "https://www.stadt-koeln.de/leben-in-koeln/planen-bauen/denkmalschutz/",
  gebiet: { land: "Nordrhein-Westfalen", gemeinde: "Köln" },
  // Open-Data-Beschreibung: "umfasst derzeit etwa 10.000 Positionen" – keine Aussage zur Vollständigkeit; nur Baudenkmäler.
  vollstaendig: false,
  browser: true,
  abdeckung: {
    de: "Baudenkmäler der Kölner Denkmalliste (etwa 10.000 Positionen) ohne Aussage zur Vollständigkeit; Bodendenkmäler nicht enthalten.",
    en: "Listed buildings of the Cologne list of monuments (about 10,000 entries) without a statement on completeness; archaeological monuments not included.",
  },
  async abfrage(lat, lon, radiusM, sprache) {
    const t = zweisprachig(sprache);
    const p: Punkt = [lon, lat];
    const bbox = bboxBreiteLaenge(p, radiusM + 10);
    // Der Dienst beantwortet nur eine Ebene je Anfrage; Ausgabe immer in EPSG:25832
    const anfrage = (ebene: string) =>
      holeJson(`${KOELN_WFS}?SERVICE=WFS&VERSION=2.0.0&REQUEST=GetFeature&TYPENAMES=ms:koeln_denkmal_${ebene}&COUNT=100&BBOX=${bbox}&OUTPUTFORMAT=${encodeURIComponent("application/json; subtype=geojson")}`, 12000);
    try {
      const ebenen = Object.keys(KOELN_EBENEN);
      const antworten = await Promise.all(ebenen.map(anfrage));
      const roh: DenkmalRoh[] = antworten.flatMap((a, i) =>
        geoJsonObjekte(a).map((f) => {
          const x = f.properties ?? {};
          const seit = wert(x["geschützt_seit"]);
          return {
            name: (wert(x.Bezeichnung) ?? wert(x.Adresse) ?? t("Baudenkmal", "Listed building")).replace(/^"(.*)"$/, "$1"),
            anschrift: wert(x.Adresse),
            ausweisung: t(...KOELN_EBENEN[ebenen[i]]),
            beschreibung: [wert(x.Baujahr), seit ? t(`geschützt seit ${seit}`, `protected since ${seit}`) : undefined].filter(Boolean).join(" · ") || undefined,
            gruppe: false,
            geometrie: umrechnen(f.geometry, UTM(32)),
            schluessel: wert(x.Denkmalnummer),
          };
        }),
      );
      return { status: "ok", treffer: denkmaleImUmkreis(p, radiusM, roh) };
    } catch (e) {
      return fehlerErgebnis("denkmal", "Denkmalliste Köln", e, sprache);
    }
  },
};

// --- Denkmale: Dortmund ---

const DORTMUND_API = "https://open-data.dortmund.de/api/explore/v2.1/catalog/datasets/fb61-denkmale/records";

interface OdsAntwort {
  total_count?: number;
  results?: Record<string, unknown>[];
}

export const dortmundDenkmal: DenkmalDienst = {
  id: "nw-dortmund-denkmal",
  quelle: "Stadt Dortmund – Denkmale (Open Data, dl-de/zero-2.0)",
  viewer: "https://open-data.dortmund.de/explore/dataset/fb61-denkmale/",
  gebiet: { land: "Nordrhein-Westfalen", gemeinde: "Dortmund" },
  // Datensatzbeschreibung ohne Aussage zur Vollständigkeit; Denkmale als Adresspunkte.
  vollstaendig: false,
  browser: true, // access-control-allow-origin: *
  abdeckung: {
    de: "Denkmalliste der Stadt Dortmund als Adresspunkte (Lage ungefähr); keine Aussage zur Vollständigkeit.",
    en: "List of monuments of the City of Dortmund as address points (approximate position); no statement on completeness.",
  },
  async abfrage(lat, lon, radiusM, sprache) {
    const t = zweisprachig(sprache);
    const p: Punkt = [lon, lat];
    const where = `within_distance(geo_point_2d, geom'POINT(${lon.toFixed(6)} ${lat.toFixed(6)})', ${Math.round(radiusM + 10)}m)`;
    const felder = "denkmal_nr,bezeichnung,anschrift,datum_der_eintragung,hinweise,kategorie,geo_point_2d";
    const url = `${DORTMUND_API}?where=${encodeURIComponent(where)}&limit=100&select=${felder}`;
    try {
      const a = await holeJson<OdsAntwort>(url);
      if (!Array.isArray(a.results)) throw unlesbar("keine Ergebnisliste");
      const roh: DenkmalRoh[] = a.results.map((x) => {
        const punkt = x.geo_point_2d as { lon?: number; lat?: number } | undefined;
        const seit = datumText(x.datum_der_eintragung, sprache);
        const nr = wert(x.denkmal_nr);
        return {
          name: wert(x.bezeichnung) ?? wert(x.anschrift) ?? t("Denkmal", "Monument"),
          anschrift: wert(x.anschrift) ? `${x.anschrift}, Dortmund` : undefined,
          ausweisung: t("Eingetragenes Denkmal", "Listed monument"),
          beschreibung: gekuerzt([seit ? t(`eingetragen am ${seit}`, `listed on ${seit}`) : undefined, wert(x.hinweise)].filter(Boolean).join(" · ") || undefined),
          gruppe: false,
          geometrie: typeof punkt?.lon === "number" && typeof punkt.lat === "number" ? { type: "Point", coordinates: [punkt.lon, punkt.lat] } : null,
          // ein Denkmal kann mehrere Adresspunkte haben
          schluessel: nr,
        };
      });
      return { status: "ok", treffer: denkmaleImUmkreis(p, radiusM, roh) };
    } catch (e) {
      return fehlerErgebnis("denkmal", "Denkmale Dortmund", e, sprache);
    }
  },
};
