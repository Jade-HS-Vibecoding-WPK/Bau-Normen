// Schleswig-Holstein: B-Pläne der XPlanung-Plattform (LVermGeo SH / GDI-SH, "Planungsdaten Schleswig-Holstein") und
// Denkmale aus dem INSPIRE-Dienst "Schutzgebiete" (Daten des Landesamts für Denkmalpflege).
// Beide Dienste spiegeln die anfragende Herkunft in Access-Control-Allow-Origin (geprüft 17.11.2026).
// Nicht angebunden: archäologische Denkmale des Archäologischen Landesamts – dessen Metadaten verlangen für jede
// Präsentation im Internet die schriftliche Einwilligung. Die vollständige Denkmalliste des LfD gibt es nur als
// wöchentliche Gesamtdatei (ca. 50 MB), nicht als abfragbaren Dienst.
import { holeText } from "../abruf";
import { zweisprachig } from "../../sprache";
import { bboxBreiteLaenge, denkmaleImUmkreis, fehlerErgebnis, gmlObjekte, LAT_LON, utf8Reparatur, wert, type DenkmalRoh, type Punkt } from "./hilfen";
import type { BplanDienst, DenkmalDienst } from "./typen";
import { xplanAbfrage } from "./xplanung";

export const shBplan: BplanDienst = {
  id: "sh-bplan",
  quelle: "GDI-SH / LVermGeo SH – Planungsdaten Schleswig-Holstein (XPlanung, dl-de/by-2.0)",
  gebiet: { land: "Schleswig-Holstein" },
  // Metadaten (dab5de7e-1c79-4744-a1c4-65f179e40eb4) ohne Aussage zur Vollständigkeit; enthält nur die bisher im
  // XPlanung-Format gemeldeten Pläne (rund 700 im ganzen Land, in Kiel nur drei).
  vollstaendig: false,
  browser: true,
  abdeckung: {
    de: "Nur die bisher im XPlanung-Format gemeldeten Pläne (rund 700 im ganzen Land) – die meisten Bebauungspläne fehlen noch.",
    en: "Only plans reported in XPlanung format so far (about 700 in the whole state) – most development plans are still missing.",
  },
  // Die Dokument-Verweise des Dienstes sind relative Pfade ohne funktionierende Basisadresse – sie werden nicht übernommen.
  abfrage: (lat, lon, sprache) => xplanAbfrage({ wfs: "https://service.gdi-sh.de/WFS_SH_PLANUNG", name: "Planungsdaten SH" }, lat, lon, sprache),
};

const PS_WFS = "https://service.gdi-sh.de/SH_INSPIREDOWNLOAD_AI_PS";
const ARTEN: Record<string, { de: string; en: string; gruppe: boolean }> = {
  Baudenkmal_SH: { de: "Baudenkmal", en: "Listed building", gruppe: false },
  Gruendenkmal_SH: { de: "Gründenkmal", en: "Listed garden or green space", gruppe: false },
  Denkmalbereich_SH: { de: "Denkmalbereich", en: "Conservation area", gruppe: true },
};

export const shDenkmal: DenkmalDienst = {
  id: "sh-denkmal",
  quelle: "GDI-SH / LVermGeo SH – INSPIRE Schutzgebiete, Daten des Landesamts für Denkmalpflege (CC BY 4.0)",
  viewer: "https://www.schleswig-holstein.de/denkmalkarte",
  gebiet: { land: "Schleswig-Holstein" },
  // Datensatz-Metadaten: "Der Datensatz ist nicht abschließend"; im Abgleich enthält der Dienst nur einen kleinen Teil der
  // Denkmalliste (z. B. 16 Baudenkmale im Raum Neumünster gegenüber rund 300 Einträgen der Liste). Lübeck fehlt.
  vollstaendig: false,
  browser: true,
  abdeckung: {
    de: "Nur ein kleiner Teil der Denkmalliste Schleswig-Holsteins (laut Land „nicht abschließend“); Lübeck und archäologische Denkmale fehlen.",
    en: "Only a small part of the Schleswig-Holstein list of monuments (according to the state “not exhaustive”); Lübeck and archaeological monuments are missing.",
  },
  async abfrage(lat, lon, radiusM, sprache) {
    const t = zweisprachig(sprache);
    const p: Punkt = [lon, lat];
    const typen = Object.keys(ARTEN).map((k) => `app:${k}`).join(",");
    const url = `${PS_WFS}?SERVICE=WFS&VERSION=2.0.0&REQUEST=GetFeature&TYPENAMES=${typen}&COUNT=100&SRSNAME=urn:ogc:def:crs:EPSG::4326&BBOX=${bboxBreiteLaenge(p, radiusM + 10)}`;
    try {
      const roh: DenkmalRoh[] = gmlObjekte(utf8Reparatur(await holeText(url, 12000)), LAT_LON).flatMap((o) => {
        const art = ARTEN[o.typ];
        if (!art) return [];
        return [
          {
            name: wert(o.werte.text) ?? t(art.de, art.en),
            ausweisung: t(art.de, art.en),
            gruppe: art.gruppe,
            geometrie: o.geometrie,
            schluessel: wert(o.werte.localId),
          },
        ];
      });
      return { status: "ok", treffer: denkmaleImUmkreis(p, radiusM, roh) };
    } catch (e) {
      return fehlerErgebnis("denkmal", "Denkmale Schleswig-Holstein", e, sprache);
    }
  },
};
