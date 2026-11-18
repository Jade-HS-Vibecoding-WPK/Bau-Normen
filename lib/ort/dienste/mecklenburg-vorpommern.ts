// Mecklenburg-Vorpommern: Bauleitpläne des Landes (Ministerium für Inneres und Bau, Bau- und Planungsportal M-V, WFS)
// und – mangels landesweiten Denkmal-Dienstes – Baudenkmale der Hansestadt Rostock und der Landeshauptstadt Schwerin sowie
// der Landkreise Rostock, Vorpommern-Rügen, Ludwigslust-Parchim und Mecklenburgische Seenplatte (Kreis-WFS der unteren
// Denkmalschutzbehörden). Der frühere "Denkmalpass MV" des Landesamts für Kultur und Denkmalpflege meldet "Daten nicht mehr verfügbar".
// Alle Dienste mit Access-Control-Allow-Origin: * (Land und Städte geprüft 17.11.2026, Landkreise 18.11.2026).
import { holeJson, holeText } from "../abruf";
import { zweisprachig } from "../../sprache";
import {
  bboxBreiteLaenge, bboxUtm, datumText, denkmaleImUmkreis, fehlerErgebnis, gekuerzt, geoJsonObjekte, gmlObjekte, LAT_LON, liegtIn, LON_LAT,
  umrechnen, umrissVon, UTM, wert, webLink, type DenkmalRoh, type GmlObjekt, type Punkt,
} from "./hilfen";
import type { BplanDienst, DenkmalDienst, PlanTreffer } from "./typen";

const BPLAN_WFS = "https://www.geodaten-mv.de/dienste/bauleitplan_wfs";
/** 4000 = in Kraft getreten, 4500 = teilweise untergegangen */
const IN_KRAFT = new Set(["4000", "4500"]);

export const mvBplan: BplanDienst = {
  id: "mv-bplan",
  quelle: "Land Mecklenburg-Vorpommern, Ministerium für Inneres und Bau: Bauleitpläne in MV (dl-de/by-2.0)",
  viewer: "https://www.bauportal-mv.de/",
  gebiet: { land: "Mecklenburg-Vorpommern" },
  // Metadaten (b541de72-470c-45a8-95a4-b6c506e8271f): "Die Daten erheben keinen Anspruch auf Vollständigkeit und Aktualität."
  vollstaendig: false,
  browser: true,
  abdeckung: {
    de: "Landesweite Sammlung aus dem Bau- und Planungsportal M-V, laut Land ohne Anspruch auf Vollständigkeit und Aktualität.",
    en: "State-wide collection from the building and planning portal M-V, according to the state without claim to completeness or currency.",
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
  quelle: "Hanse- und Universitätsstadt Rostock: Baudenkmale und Denkmalbereiche (Open Data, CC0)",
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
  quelle: "Landeshauptstadt Schwerin: Denkmalschutz (Geoportal Landkreis Ludwigslust-Parchim, dl-de/by-2.0)",
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

// --- Landkreise ---

/** BBOX der Kreis-WFS in EPSG:25833 – diese Dienste werten nur UTM 33 aus (in EPSG:4326 leer bzw. HTTP 400) */
const bboxUtm33 = (p: Punkt, radiusM: number) => `${bboxUtm(p, radiusM + 10, 33)},urn:ogc:def:crs:EPSG::25833`;
const wfsGetFeature = (basis: string, typ: string, p: Punkt, radiusM: number, extra = "") =>
  holeText(`${basis}?SERVICE=WFS&VERSION=2.0.0&REQUEST=GetFeature&TYPENAMES=${typ}&COUNT=200${extra}&BBOX=${bboxUtm33(p, radiusM)}`);

// Landkreis Rostock: Capabilities (AccessConstraints, 18.11.2026): Datenlizenz Deutschland – Namensnennung 2.0, Quellenvermerk
// "© Landkreis Rostock"; zugleich heißt es dort, die Daten "dienen ausschließlich Informationszwecken". (Der WMS-Eintrag im
// Geoportal MV nennt CC0 – maßgeblich ist hier die strengere Angabe des WFS.) Baudenkmale als Beschriftungspunkte (ein Punkt je
// Gebäude bzw. Gebäudeteil, gleiche Denkmalnummer), Denkmalensembles als Flächen; ohne Hansestadt Rostock (eigener Dienst oben).
const LROS_WFS = "https://geoportal.lkros.de/dienste/baudenkmale";

export const landkreisRostockDenkmal: DenkmalDienst = {
  id: "mv-lkros-denkmal",
  quelle: "Landkreis Rostock: Baudenkmale und Denkmalensembles (© Landkreis Rostock, dl-de/by-2.0)",
  viewer: "https://geoportal.lkros.de/",
  gebiet: { land: "Mecklenburg-Vorpommern", kreis: "Landkreis Rostock" },
  // Capabilities ohne Aussage zur Vollständigkeit; Bodendenkmale nicht enthalten.
  vollstaendig: false,
  browser: true,
  abdeckung: {
    de: "Baudenkmale (als Punkte, Lage ungefähr) und Denkmalensembles des Landkreises Rostock; keine Aussage zur Vollständigkeit, keine Bodendenkmale. Laut Landkreis nur zur Information.",
    en: "Listed buildings (as points, approximate position) and monument ensembles of the district of Rostock; no statement on completeness, no archaeological monuments. According to the district for information only.",
  },
  async abfrage(lat, lon, radiusM, sprache) {
    const t = zweisprachig(sprache);
    const p: Punkt = [lon, lat];
    try {
      const [bau, ensembles] = await Promise.all([wfsGetFeature(LROS_WFS, "ms:baudenkmale", p, radiusM), wfsGetFeature(LROS_WFS, "ms:Denkmalensembles", p, radiusM)]);
      const anschrift = (x: Record<string, string>) =>
        wert(x.anschrift_standort) ? [wert(x.anschrift_standort), [wert(x.plz), wert(x.ort_gemarkung)].filter(Boolean).join(" ")].filter(Boolean).join(", ") : undefined;
      const roh: DenkmalRoh[] = [
        ...gmlObjekte(bau, UTM(33)).map((o) => {
          const x = o.werte;
          const name = wert(x.objektbezeichnung) ?? wert(x.anschrift_standort) ?? t("Baudenkmal", "Listed building");
          // bemerkung: meist der Gebäudeteil, zu dem der Punkt gehört (z. B. "Scheune" einer Gutsanlage)
          const teil = wert(x.bemerkung);
          return {
            name,
            anschrift: anschrift(x),
            ausweisung: t("Baudenkmal", "Listed building"),
            beschreibung: teil && !name.toLowerCase().includes(teil.toLowerCase()) ? teil : undefined,
            gruppe: false,
            geometrie: o.geometrie,
            // mehrere Punkte je Denkmal (Gebäudeteile) -> ein Eintrag je Denkmalnummer
            schluessel: wert(x.dl_nr) ? `dl-${x.dl_nr}` : undefined,
          };
        }),
        ...gmlObjekte(ensembles, UTM(33)).map((o) => {
          const x = o.werte;
          return {
            name: wert(x.objektbezeichnung) ?? wert(x.bemerkung) ?? t("Denkmalensemble", "Monument ensemble"),
            // anschrift_standort ist bei Ensembles oft nur ein Flurname ("Wallanlagen") – nur echte Anschriften übernehmen
            anschrift: /\d/.test(x.anschrift_standort ?? "") ? anschrift(x) : undefined,
            ausweisung: t("Denkmalensemble", "Monument ensemble"),
            gruppe: true,
            geometrie: o.geometrie,
            schluessel: o.id,
          };
        }),
      ];
      return { status: "ok", treffer: denkmaleImUmkreis(p, radiusM, roh) };
    } catch (e) {
      return fehlerErgebnis("denkmal", "Baudenkmale Landkreis Rostock", e, sprache);
    }
  },
};

// Landkreis Vorpommern-Rügen: Datensatz-Metadaten (1505276b-429c-4c0f-a7d2-c9defeb58b9a, Stand 06.11.2025): dl-de/by-2.0;
// daneben verweisen sie auf die Allgemeinen Geschäfts- und Nutzungsbedingungen (AGNB) des GeoPORT.VR. Baudenkmale als
// Gebäudeflächen nur mit Bezeichnung (keine Anschrift), Denkmalbereiche (§ 5 Abs. 3 DSchG M-V) als Flächen.
// Die Hansestadt Stralsund ist im Dienst nicht enthalten (geprüft 18.11.2026).
const VR_OWS = "https://geodienste.lk-vr.de/ows/denkmale";

export const vorpommernRuegenDenkmal: DenkmalDienst = {
  id: "mv-vr-denkmal",
  quelle: "Landkreis Vorpommern-Rügen: Baudenkmale und Denkmalbereiche (dl-de/by-2.0)",
  viewer: "https://geoport.lk-vr.de/geoport/",
  gebiet: { land: "Mecklenburg-Vorpommern", kreis: "Vorpommern-Rügen" },
  // Metadaten ohne Aussage zur Vollständigkeit; Stralsund fehlt, Bodendenkmale nicht enthalten.
  vollstaendig: false,
  browser: true,
  abdeckung: {
    de: "Baudenkmale (Gebäudeflächen, nur Bezeichnung ohne Anschrift) und Denkmalbereiche des Landkreises Vorpommern-Rügen ohne die Hansestadt Stralsund; keine Aussage zur Vollständigkeit, keine Bodendenkmale.",
    en: "Listed buildings (building footprints, name only without address) and conservation areas of the district of Vorpommern-Rügen, excluding the Hanseatic City of Stralsund; no statement on completeness, no archaeological monuments.",
  },
  async abfrage(lat, lon, radiusM, sprache) {
    const t = zweisprachig(sprache);
    const p: Punkt = [lon, lat];
    try {
      const [bau, bereiche] = await Promise.all([
        wfsGetFeature(`${VR_OWS}/baudenkmale`, "ms:baudenkmale", p, radiusM),
        wfsGetFeature(`${VR_OWS}/denkmalbereiche`, "ms:denkmalbereiche", p, radiusM),
      ]);
      const roh: DenkmalRoh[] = [
        ...gmlObjekte(bau, UTM(33)).map((o) => ({
          name: wert(o.werte.bez) ?? t("Baudenkmal", "Listed building"),
          ausweisung: t("Baudenkmal", "Listed building"),
          gruppe: false,
          geometrie: o.geometrie,
          schluessel: wert(o.werte.id) ? `bd-${o.werte.id}` : undefined,
        })),
        ...gmlObjekte(bereiche, UTM(33)).map((o) => {
          const x = o.werte;
          const seit = datumText(x.rechtskraeftig_seit, sprache);
          return {
            name: wert(x.bezeichnung) ?? t("Denkmalbereich", "Conservation area"),
            ausweisung: t("Denkmalbereich", "Conservation area"),
            beschreibung: seit ? t(`rechtskräftig seit ${seit}`, `legally binding since ${seit}`) : undefined,
            gruppe: true,
            geometrie: o.geometrie,
            schluessel: wert(x.id) ? `db-${x.id}` : undefined,
          };
        }),
      ];
      return { status: "ok", treffer: denkmaleImUmkreis(p, radiusM, roh) };
    } catch (e) {
      return fehlerErgebnis("denkmal", "Baudenkmale Vorpommern-Rügen", e, sprache);
    }
  },
};

// Landkreis Ludwigslust-Parchim: Capabilities: "Datenlizenz Deutschland - Namensnennung - 2.0. Quellenvermerk: Landkreis
// Ludwigslust-Parchim"; die Metadaten (dff27d4a-0dae-4a16-bbc1-33042bda8980) nennen dieselbe Lizenz, führen aber zugleich eine
// INSPIRE-Zugangsbeschränkung nach Art. 13 Abs. 1 Buchst. e (Rechte des geistigen Eigentums) – der WFS selbst ist frei abrufbar.
// Baudenkmale nur als Punkte (Ebene "Baudenkmale" ist leer, Daten in "Baudenkmaldaten"); die kreisfreie Landeshauptstadt
// Schwerin hat einen eigenen Dienst auf demselben Server (oben).
const LUP_WFS = "https://geoportal.kreis-lup.de/ows/masterportal/denkmalpflege-lup";

export const ludwigslustParchimDenkmal: DenkmalDienst = {
  id: "mv-lup-denkmal",
  quelle: "Landkreis Ludwigslust-Parchim: Denkmalpflege, Baudenkmale (Quellenvermerk: Landkreis Ludwigslust-Parchim, dl-de/by-2.0)",
  viewer: "https://geoportal.kreis-lup.de/",
  gebiet: { land: "Mecklenburg-Vorpommern", kreis: "Ludwigslust-Parchim" },
  // Metadaten ohne Aussage zur Vollständigkeit; keine Bodendenkmale, keine Denkmalbereiche.
  vollstaendig: false,
  browser: true,
  abdeckung: {
    de: "Baudenkmale des Landkreises Ludwigslust-Parchim als Punkte (Lage ungefähr); keine Aussage zur Vollständigkeit, keine Bodendenkmale und Denkmalbereiche.",
    en: "Listed buildings of the district of Ludwigslust-Parchim as points (approximate position); no statement on completeness, no archaeological monuments or conservation areas.",
  },
  async abfrage(lat, lon, radiusM, sprache) {
    const t = zweisprachig(sprache);
    const p: Punkt = [lon, lat];
    const url = `${LUP_WFS}?SERVICE=WFS&VERSION=2.0.0&REQUEST=GetFeature&TYPENAMES=masterportal:Baudenkmaldaten&COUNT=200&SRSNAME=urn:ogc:def:crs:EPSG::4326&BBOX=${bboxBreiteLaenge(p, radiusM + 10)}`;
    try {
      const roh: DenkmalRoh[] = gmlObjekte(await holeText(url), LAT_LON).map((o) => {
        const x = o.werte;
        const strasse = wert(x.strasse);
        return {
          name: wert(x.bezeichnung) ?? strasse ?? t("Baudenkmal", "Listed building"),
          anschrift: strasse ? [strasse, wert(x.ort)].filter(Boolean).join(", ") : undefined,
          ausweisung: t("Baudenkmal", "Listed building"),
          gruppe: false,
          geometrie: o.geometrie,
        };
      });
      return { status: "ok", treffer: denkmaleImUmkreis(p, radiusM, roh) };
    } catch (e) {
      return fehlerErgebnis("denkmal", "Baudenkmale Ludwigslust-Parchim", e, sprache);
    }
  },
};

// Landkreis Mecklenburgische Seenplatte: Metadaten (539d3abb-6b46-4142-8348-55ddf3e28f21): CC BY 4.0; "Baudenkmale im Bereich
// der Stadt Neubrandenburg sind nicht enthalten. Die Vollständigkeit und Aktualität der Daten kann nicht garantiert werden."
// Einzeldenkmale und Denkmalbereiche als Flächen; für Neubrandenburg nur ein Platzhalter ("externe Liste") – übersprungen.
// Datenschutz: Der Dienst führt zu jedem Objekt Namen, Telefonnummern und E-Mail-Adressen der Sachbearbeitung. Deshalb werden
// per PROPERTYNAME nur die Fachfelder abgerufen (Feldnamen ohne Präfix – mit "lkmse:" fehlt die Geometrie).
const MSE_WFS = "https://geoport-lk-mse.de/webservices/wfs/mp_baudenkmale";
const MSE_FELDER = "msGeometry,schluessel,typ,ort,strasse,obj,bemerk,internet";

export const seenplatteDenkmal: DenkmalDienst = {
  id: "mv-mse-denkmal",
  quelle: "Landkreis Mecklenburgische Seenplatte: Baudenkmale (CC BY 4.0)",
  viewer: "https://geoport-lk-mse.de/geoportal/",
  gebiet: { land: "Mecklenburg-Vorpommern", kreis: "Mecklenburgische Seenplatte" },
  vollstaendig: false,
  browser: true,
  abdeckung: {
    de: "Einzeldenkmale und Denkmalbereiche des Landkreises Mecklenburgische Seenplatte ohne die Stadt Neubrandenburg (eigene Denkmalliste der Stadt); laut Landkreis ohne Gewähr für Vollständigkeit und Aktualität, keine Bodendenkmale.",
    en: "Individual monuments and conservation areas of the district of Mecklenburgische Seenplatte, excluding the city of Neubrandenburg (separate list of the city); according to the district no guarantee of completeness or currency, no archaeological monuments.",
  },
  async abfrage(lat, lon, radiusM, sprache) {
    const t = zweisprachig(sprache);
    const p: Punkt = [lon, lat];
    try {
      const xml = await wfsGetFeature(MSE_WFS, "lkmse:baudenkmalewfs", p, radiusM, `&PROPERTYNAME=${MSE_FELDER}`);
      // Schlüssel "MST_813_2" = Denkmal 813 in Neustrelitz, Teil 2. Die Bezeichnung ist auf die Teile verteilt
      // ("Wohnhaus und" | "Hinterhaus," | … | "Hofpflaster") – wieder zusammensetzen. Derselbe Teil kommt je Ortslage mehrfach vor.
      const teile = new Map<string, GmlObjekt>();
      for (const o of gmlObjekte(xml, UTM(33))) teile.set(wert(o.werte.schluessel) ?? o.id ?? `#${teile.size}`, o);
      const denkmalVon = (k: string) => k.replace(/_\d+$/, "");
      const lfd = (k: string) => Number(/_(\d+)$/.exec(k)?.[1] ?? 0);
      const namen = new Map<string, string>();
      for (const k of [...teile.keys()].sort((a, b) => lfd(a) - lfd(b))) {
        const obj = wert(teile.get(k)!.werte.obj);
        if (obj) namen.set(denkmalVon(k), [namen.get(denkmalVon(k)), obj].filter(Boolean).join(" "));
      }
      const roh: DenkmalRoh[] = [];
      for (const [k, o] of teile) {
        const x = o.werte;
        const typ = wert(x.typ) ?? "";
        if (/extern/i.test(typ)) continue; // Platzhalter mit Verweis auf eine andere Liste, kein Denkmal
        const bereich = /bereich/i.test(typ);
        const strasse = wert(x.strasse);
        // Fehlen Teile außerhalb des Abfragebereichs, endet die Bezeichnung offen ("Pension und Gaststätte mit") -> kürzen
        let name = namen.get(denkmalVon(k)) ?? "";
        if (/[,;]$|\s(und|mit|sowie)$/i.test(name)) name = `${name.replace(/[\s,;]+$/, "").replace(/\s(und|mit|sowie)$/i, "")} …`;
        roh.push({
          name: name || strasse || (bereich ? t("Denkmalbereich", "Conservation area") : t("Baudenkmal", "Listed building")),
          // Denkmalbereiche: Straßenliste statt Anschrift
          anschrift: !bereich && strasse ? [strasse, wert(x.ort)].filter(Boolean).join(", ") : undefined,
          ausweisung: bereich ? t("Denkmalbereich", "Conservation area") : /einzel/i.test(typ) || !typ ? t("Baudenkmal", "Listed building") : typ,
          beschreibung: gekuerzt(bereich ? strasse : wert(x.bemerk), 300),
          gruppe: bereich,
          link: webLink(x.internet),
          geometrie: o.geometrie,
          // alle Teile eines Denkmals -> ein Eintrag (nächster Teil bestimmt die Entfernung)
          schluessel: denkmalVon(k),
        });
      }
      return { status: "ok", treffer: denkmaleImUmkreis(p, radiusM, roh) };
    } catch (e) {
      return fehlerErgebnis("denkmal", "Baudenkmale Mecklenburgische Seenplatte", e, sprache);
    }
  },
};
