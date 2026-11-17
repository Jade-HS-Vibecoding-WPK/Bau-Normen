// Sachsen: Bebauungspläne aus dem Raumordnungskataster RAPIS der Landesdirektion Sachsen (ArcGIS-Dienst hinter dem
// dokumentierten WMS "WMS_BPLAN", dl-de/by-2.0, Quellenvermerk "RAPIS Sachsen [Monat/Jahr]" mit Verweis auf rapis.sachsen.de)
// und Kulturdenkmale aus der Denkmalkarte des Landesamts für Denkmalpflege (CardoMap-WFS).
// Beide spiegeln die anfragende Herkunft in Access-Control-Allow-Origin (geprüft 17.11.2026).
// Archäologische Denkmale: zuständig ist das Landesamt für Archäologie – kein öffentlicher Dienst, nicht angebunden.
import { holeJson, holeText } from "../abruf";
import { zweisprachig } from "../../sprache";
import {
  bboxBreiteLaenge, datumText, denkmaleImUmkreis, fehlerErgebnis, geoJsonObjekte, gmlObjekte, LAT_LON, liegtIn, LON_LAT, umrechnen, umrissVon, wert,
  type DenkmalRoh, type Punkt,
} from "./hilfen";
import type { BplanDienst, DenkmalDienst, PlanTreffer } from "./typen";

const RAPIS = "https://rapis.ipm-gis.de/arcgis/rest/services/WMS_BPLAN/MapServer/3/query";

/** "B-Plan 194 A Ehemaliges Kontorhaus" -> ["194 A", "Ehemaliges Kontorhaus"] */
function nummerUndName(bez: string): [string, string] {
  const m = /^V?B-?Pl(?:an|\.)?\s+(\S+(?:\s[A-Z](?=\s))?)\s*(.*)$/i.exec(bez);
  return m ? [m[1], m[2].replace(/\s{2,}/g, " ")] : [bez, ""];
}

export const sachsenBplan: BplanDienst = {
  id: "sn-bplan",
  // Quellenvermerk laut Nutzungshinweisen: "RAPIS Sachsen [Monat/Jahr]"
  get quelle() {
    const d = new Date();
    return `RAPIS Sachsen ${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()} – Bebauungspläne im Freistaat Sachsen (Landesdirektion Sachsen, dl-de/by-2.0)`;
  },
  viewer: "https://rapis.sachsen.de/",
  gebiet: { land: "Sachsen" },
  // Metadaten: Bebauungsplanung aller Kommunen "nach Kenntnisstand in den Referaten Raumordnung der Landesdirektion";
  // Nutzungshinweise: "Für die Richtigkeit, Vollständigkeit, Vollzähligkeit … wird keine Gewähr übernommen."
  vollstaendig: false,
  browser: true,
  abdeckung: {
    de: "Pläne nach Kenntnisstand der Landesdirektion (Raumordnungskataster) – ohne Gewähr für Vollständigkeit; keine Planunterlagen.",
    en: "Plans as known to the state directorate (regional planning register) – no guarantee of completeness; no plan documents.",
  },
  async abfrage(lat, lon, sprache) {
    const t = zweisprachig(sprache);
    const p: Punkt = [lon, lat];
    const params = new URLSearchParams({
      geometry: `${lon},${lat}`,
      geometryType: "esriGeometryPoint",
      inSR: "4326",
      spatialRel: "esriSpatialRelIntersects",
      outFields: "NAME,STATUS,RECHTSGRL,PLANTYP,DAT_BEKANN,DAT_SATZ,AENDERUNG,GEMEINDE",
      returnGeometry: "true",
      outSR: "4326",
      maxAllowableOffset: "0.000005",
      f: "geojson",
    });
    try {
      const treffer: PlanTreffer[] = [];
      for (const f of geoJsonObjekte(await holeJson(`${RAPIS}?${params}`))) {
        const x = f.properties ?? {};
        const grundlage = wert(x.RECHTSGRL) ?? "";
        // Satzungen nach § 34 Abs. 4 / § 35 Abs. 6 BauGB sind keine Bebauungspläne
        if (wert(x.PLANTYP) === "SATZ" || /§\s*3[45]/.test(grundlage)) continue;
        if (wert(x.STATUS) && !/rechtskräftig/i.test(String(x.STATUS))) continue;
        const g = umrechnen(f.geometry, LON_LAT);
        if (g && !liegtIn(p, g)) continue;
        const [nummer, name] = nummerUndName(wert(x.NAME) ?? "?");
        const aenderung = wert(x.AENDERUNG);
        treffer.push({
          nummer,
          name,
          // Bekanntmachung = Inkrafttreten (§ 10 Abs. 3 BauGB)
          rechtsverbindlichSeit: datumText(x.DAT_BEKANN, sprache),
          vorhabenbezogen: /§\s*12/.test(grundlage) || /^VB/i.test(String(x.NAME ?? "")),
          verfahren:
            [/§\s*13a/.test(grundlage) ? t("beschleunigtes Verfahren (§ 13a BauGB)", "accelerated procedure (§ 13a BauGB)") : undefined,
              /§\s*13b/.test(grundlage) ? t("Verfahren nach § 13b BauGB", "procedure under § 13b BauGB") : undefined,
              aenderung ? t(`${aenderung} Änderung`, `amendment ${aenderung}`) : undefined].filter(Boolean).join(" · ") || undefined,
          umriss: umrissVon(p, g, 300),
        });
      }
      return { status: "ok", treffer };
    } catch (e) {
      return fehlerErgebnis("bplan", "RAPIS Sachsen", e, sprache);
    }
  },
};

// --- Denkmale ---

const LFD_WFS = "https://cardomap3.idu.de/lfds/public/ogc.ashx?PKGID=5";

/** Darstellungsklassen ("typ") laut Legende der Denkmalkarte; 7 = vorgeschlagenes Denkmalschutzgebiet (kein Denkmal) */
const KLASSEN: Record<string, { de: string; en: string; gruppe: boolean }> = {
  "1": { de: "Einzeldenkmal", en: "Individual monument", gruppe: false },
  "2": { de: "Nebenanlage eines Denkmals", en: "Ancillary structure of a monument", gruppe: false },
  "3": { de: "Gartendenkmal", en: "Listed garden", gruppe: false },
  "4": { de: "Sachgesamtheit", en: "Monument ensemble (Sachgesamtheit)", gruppe: true },
  "5": { de: "Denkmalschutzgebiet", en: "Conservation area", gruppe: true },
  "6": { de: "Einzeldenkmal (flächig)", en: "Individual monument (area)", gruppe: false },
};

export const sachsenDenkmal: DenkmalDienst = {
  id: "sn-denkmal",
  quelle: "Landesamt für Denkmalpflege Sachsen – Denkmalkarte Sachsen (Kulturdenkmale)",
  viewer: "https://denkmalliste.denkmalpflege.sachsen.de/default.aspx?User=Gast",
  gebiet: { land: "Sachsen" },
  // LfD: "nachrichtliches Verzeichnis", "Die Kulturdenkmalliste ist niemals abgeschlossen", "Auch Objekte, die nicht
  // verzeichnet sind, können Denkmale sein"; archäologische Denkmale sind nicht enthalten.
  vollstaendig: false,
  browser: true,
  abdeckung: {
    de: "Nachrichtliches Verzeichnis der Bau- und Kunstdenkmale (laut LfD nie abgeschlossen); archäologische Denkmale fehlen.",
    en: "Informative list of architectural monuments (according to the state office never closed); archaeological monuments are missing.",
  },
  async abfrage(lat, lon, radiusM, sprache) {
    const t = zweisprachig(sprache);
    const p: Punkt = [lon, lat];
    const bbox = bboxBreiteLaenge(p, radiusM + 10);
    // Ebenen getrennt abfragen (der Dienst verbindet keine Objektarten): Flächen, Linien, Punkte
    const anfrage = (ebene: string) =>
      holeText(`${LFD_WFS}&SERVICE=WFS&VERSION=2.0.0&REQUEST=GetFeature&TYPENAMES=cls:${ebene}&COUNT=200&SRSNAME=urn:ogc:def:crs:EPSG::4326&BBOX=${bbox}`, 12000);
    try {
      const antworten = await Promise.all(["L1", "L2", "L3"].map(anfrage));
      const roh: DenkmalRoh[] = antworten.flatMap((xml) =>
        gmlObjekte(xml, LAT_LON).flatMap((o) => {
          const x = o.werte;
          const typ = wert(x.typ) ?? "1";
          const klasse = KLASSEN[typ];
          if (!klasse) return [];
          const nr = wert(x.obj_nr) ?? wert(x.ext_hida_nr);
          const haus = wert(x.ext_hausnummer);
          const anschrift = [wert(x.ext_strassenname), haus && haus !== "-" ? haus : undefined].filter(Boolean).join(" ");
          const ort = (wert(x.ext_gemeinde) ?? "").replace(/,\s*(Stadt|Gemeinde)$/i, "");
          return [
            {
              name: wert(x.ext_eigenname) ?? wert(x.ext_kurzcharakteristik) ?? t(klasse.de, klasse.en),
              anschrift: anschrift ? `${anschrift}${ort ? `, ${ort}` : ""}` : undefined,
              ausweisung: t(klasse.de, klasse.en),
              objekttyp: wert(x.ext_kurzcharakteristik),
              beschreibung: wert(x.ext_datierung),
              gruppe: klasse.gruppe,
              link: nr ? `https://denkmalliste.denkmalpflege.sachsen.de/CardoMap/Denkmalliste_Report.aspx?HIDA_Nr=${encodeURIComponent(nr)}` : undefined,
              geometrie: o.geometrie,
              schluessel: nr ? `${nr}|${typ}` : undefined,
            },
          ];
        }),
      );
      return { status: "ok", treffer: denkmaleImUmkreis(p, radiusM, roh) };
    } catch (e) {
      return fehlerErgebnis("denkmal", "Denkmalkarte Sachsen", e, sprache);
    }
  },
};
