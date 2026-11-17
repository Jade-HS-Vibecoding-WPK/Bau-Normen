// Mecklenburg-Vorpommern: Bauleitpläne des Landes (Ministerium für Inneres und Bau, Bau- und Planungsportal M-V, WFS)
// und – mangels landesweiten Denkmal-Dienstes – Baudenkmale der Hansestadt Rostock und der Landeshauptstadt Schwerin.
// Der frühere "Denkmalpass MV" des Landesamts für Kultur und Denkmalpflege meldet "Daten nicht mehr verfügbar".
// Alle Dienste mit Access-Control-Allow-Origin: * (geprüft 17.11.2026).
import { holeJson, holeText } from "../abruf";
import { zweisprachig } from "../../sprache";
import {
  bboxBreiteLaenge, datumText, denkmaleImUmkreis, fehlerErgebnis, gekuerzt, geoJsonObjekte, gmlObjekte, LAT_LON, liegtIn, LON_LAT, umrechnen,
  umrissVon, wert, webLink, type DenkmalRoh, type Punkt,
} from "./hilfen";
import type { BplanDienst, DenkmalDienst, PlanTreffer } from "./typen";

const BPLAN_WFS = "https://www.geodaten-mv.de/dienste/bauleitplan_wfs";
/** 4000 = in Kraft getreten, 4500 = teilweise untergegangen */
const IN_KRAFT = new Set(["4000", "4500"]);

export const mvBplan: BplanDienst = {
  id: "mv-bplan",
  quelle: "Land Mecklenburg-Vorpommern, Ministerium für Inneres und Bau – Bauleitpläne in MV (dl-de/by-2.0)",
  viewer: "https://www.bauportal-mv.de/",
  gebiet: { land: "Mecklenburg-Vorpommern" },
  // Metadaten (b541de72-470c-45a8-95a4-b6c506e8271f): "Die Daten erheben keinen Anspruch auf Vollständigkeit und Aktualität."
  vollstaendig: false,
  browser: true,
  abdeckung: {
    de: "Landesweite Sammlung aus dem Bau- und Planungsportal M-V – laut Land ohne Anspruch auf Vollständigkeit und Aktualität.",
    en: "State-wide collection from the building and planning portal M-V – according to the state without claim to completeness or currency.",
  },
  async abfrage(lat, lon, sprache) {
    const t = zweisprachig(sprache);
    const p: Punkt = [lon, lat];
    const url = `${BPLAN_WFS}?SERVICE=WFS&VERSION=2.0.0&REQUEST=GetFeature&TYPENAMES=sm:B_Plan_wfs&COUNT=50&OUTPUTFORMAT=${encodeURIComponent("application/json; subtype=geojson")}&SRSNAME=urn:ogc:def:crs:EPSG::4326&BBOX=${bboxBreiteLaenge(p, 1)}`;
    try {
      const treffer: PlanTreffer[] = [];
      for (const f of geoJsonObjekte(await holeJson(url))) {
        const x = f.properties ?? {};
        if (!IN_KRAFT.has(String(x.rechtsstand ?? ""))) continue;
        const g = umrechnen(f.geometry, LON_LAT);
        if (g && !liegtIn(p, g)) continue;
        const gemeinde = Array.isArray(x.gemeinde) ? wert((x.gemeinde[0] as Record<string, unknown>)?.gemeindename) : undefined;
        const nummer = wert(x.nummer) ?? "?";
        // "BPlan Nr. 11.M.200  Rostock, Hanse- und Universitätsstadt Am Rathaus/ Am Schilde" -> Name ohne Nummer und Gemeinde
        let name = (wert(x.anzeigename) ?? "").replace(/^.*?Nr\.\s*\S+\s*/, "");
        if (gemeinde && name.startsWith(gemeinde)) name = name.slice(gemeinde.length).trim();
        const verfahren = [
          wert(x.planart_text),
          wert(x.verfahren_text) && x.verfahren_text !== "Normal" ? String(x.verfahren_text).replace(/^Parag/, "§ ") + " BauGB" : undefined,
          String(x.rechtsstand) === "4500" ? t("teilweise untergegangen", "partly lapsed") : undefined,
        ].filter(Boolean);
        treffer.push({
          nummer,
          name: name || (gemeinde ?? ""),
          rechtsverbindlichSeit: datumText(x.inkrafttretensdatum, sprache),
          vorhabenbezogen: /vorhaben/i.test(String(x.planart_text ?? "")),
          verfahren: verfahren.join(" · ") || undefined,
          link: webLink(x.link),
          umriss: umrissVon(p, g, 300),
        });
      }
      return { status: "ok", treffer };
    } catch (e) {
      return fehlerErgebnis("bplan", "Bauleitpläne MV", e, sprache);
    }
  },
};

// --- Rostock ---

const HRO_WFS = "https://geo.sv.rostock.de/geodienste/baudenkmale_denkmalbereiche/wfs";

export const rostockDenkmal: DenkmalDienst = {
  id: "mv-rostock-denkmal",
  quelle: "Hanse- und Universitätsstadt Rostock – Baudenkmale und Denkmalbereiche (Open Data, CC0)",
  viewer: "https://www.opendata-hro.de/dataset/baudenkmale_denkmalbereiche",
  gebiet: { land: "Mecklenburg-Vorpommern", gemeinde: "Rostock" },
  // Metadaten (f6fe6624-e5a0-4934-b06a-48466999fd47) ohne Aussage zur Vollständigkeit; Bodendenkmale nicht enthalten.
  vollstaendig: false,
  browser: true,
  abdeckung: {
    de: "Baudenkmale und Denkmalbereiche der Stadt Rostock; keine Aussage zur Vollständigkeit, Bodendenkmale nicht enthalten.",
    en: "Listed buildings and conservation areas of the City of Rostock; no statement on completeness, archaeological monuments not included.",
  },
  async abfrage(lat, lon, radiusM, sprache) {
    const t = zweisprachig(sprache);
    const p: Punkt = [lon, lat];
    const anfrage = (typ: string) =>
      holeJson(`${HRO_WFS}?SERVICE=WFS&VERSION=2.0.0&REQUEST=GetFeature&TYPENAMES=baudenkmale_denkmalbereiche:hro.baudenkmale_denkmalbereiche.${typ}&COUNT=200&OUTPUTFORMAT=${encodeURIComponent("application/geo+json")}&SRSNAME=urn:ogc:def:crs:EPSG::4326&BBOX=${bboxBreiteLaenge(p, radiusM + 10)}`);
    try {
      const [bau, bereiche] = await Promise.all([anfrage("baudenkmale"), anfrage("denkmalbereiche")]);
      const roh: DenkmalRoh[] = [
        ...geoJsonObjekte(bau).map((f) => {
          const x = f.properties ?? {};
          const anschrift = [wert(x.strasse_name), [wert(x.hausnummer), wert(x.hausnummer_zusatz)].filter(Boolean).join("")].filter(Boolean).join(" ");
          const garten = x.gartendenkmal === true;
          return {
            name: wert(x.beschreibung) ?? (anschrift || t("Baudenkmal", "Listed building")),
            anschrift: anschrift ? `${anschrift}${wert(x.postleitzahl) ? `, ${x.postleitzahl} Rostock` : ""}` : undefined,
            ausweisung: garten ? t("Gartendenkmal", "Listed garden") : t("Baudenkmal", "Listed building"),
            gruppe: false,
            // GeoJSON dieses Dienstes liefert Breite vor Länge
            geometrie: umrechnen(f.geometry, LAT_LON),
            schluessel: wert(x.uuid),
          };
        }),
        ...geoJsonObjekte(bereiche).map((f) => {
          const x = f.properties ?? {};
          return {
            name: wert(x.bezeichnung) ?? t("Denkmalbereich", "Conservation area"),
            ausweisung: t("Denkmalbereich", "Conservation area"),
            beschreibung: gekuerzt(wert(x.beschreibung)),
            gruppe: true,
            geometrie: umrechnen(f.geometry, LAT_LON),
            schluessel: wert(x.uuid),
          };
        }),
      ];
      return { status: "ok", treffer: denkmaleImUmkreis(p, radiusM, roh) };
    } catch (e) {
      return fehlerErgebnis("denkmal", "Baudenkmale Rostock", e, sprache);
    }
  },
};

// --- Schwerin ---

const SN_WFS = "https://geoportal.kreis-lup.de/ows/masterportal/denkmalschutz-sn";

export const schwerinDenkmal: DenkmalDienst = {
  id: "mv-schwerin-denkmal",
  quelle: "Landeshauptstadt Schwerin – Denkmalschutz (Geoportal Landkreis Ludwigslust-Parchim, dl-de/by-2.0)",
  gebiet: { land: "Mecklenburg-Vorpommern", gemeinde: "Schwerin" },
  // Metadaten (f60b25dd-e0e8-4040-88a6-0f455b4d7f9e) ohne Aussage zur Vollständigkeit; Baudenkmale nur als Punkte.
  vollstaendig: false,
  browser: true,
  abdeckung: {
    de: "Baudenkmale der Landeshauptstadt Schwerin als Punkte (Lage ungefähr); keine Aussage zur Vollständigkeit, keine Bodendenkmale.",
    en: "Listed buildings of the state capital Schwerin as points (approximate position); no statement on completeness, no archaeological monuments.",
  },
  async abfrage(lat, lon, radiusM, sprache) {
    const t = zweisprachig(sprache);
    const p: Punkt = [lon, lat];
    const url = `${SN_WFS}?SERVICE=WFS&VERSION=2.0.0&REQUEST=GetFeature&TYPENAMES=masterportal:Baudenkmaldaten&COUNT=200&SRSNAME=urn:ogc:def:crs:EPSG::4326&BBOX=${bboxBreiteLaenge(p, radiusM + 10)}`;
    try {
      const roh: DenkmalRoh[] = gmlObjekte(await holeText(url), LAT_LON).map((o) => {
        const x = o.werte;
        const bezeichnung = wert(x.bezeichnung);
        const bemerkung = wert(x.bemerkung);
        return {
          name: bemerkung ?? bezeichnung ?? t("Baudenkmal", "Listed building"),
          anschrift: wert(x.lage) ? `${x.lage}, Schwerin` : undefined,
          ausweisung: t("Baudenkmal", "Listed building"),
          beschreibung: bemerkung && bezeichnung && bezeichnung !== x.lage ? bezeichnung : undefined,
          gruppe: false,
          geometrie: o.geometrie,
        };
      });
      return { status: "ok", treffer: denkmaleImUmkreis(p, radiusM, roh) };
    } catch (e) {
      return fehlerErgebnis("denkmal", "Denkmalschutz Schwerin", e, sprache);
    }
  },
};
