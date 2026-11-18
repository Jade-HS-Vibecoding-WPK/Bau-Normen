// Brandenburg: rechtswirksame Bebauungspläne aus dem Planungsinformationssystem PLIS der Gemeinsamen Landesplanungsabteilung
// Berlin-Brandenburg (GeoServer-WFS, dl-de/by-2.0, Access-Control-Allow-Origin: *, geprüft 17.11.2026).
// Denkmale: Das BLDAM bietet WFS-Dienste an, seine Nutzungshinweise erlauben aber nur internen Gebrauch und verlangen für
// jede Veröffentlichung die vorherige schriftliche Zustimmung; CORS nur für geoportal.brandenburg.de – nicht angebunden.
// Angebunden ist nur der Denkmal-WMS der Stadt Frankfurt (Oder) (dl-de/by-2.0, CORS: Herkunft wird gespiegelt, geprüft 18.11.2026).
import { holeJson } from "../abruf";
import { zweisprachig } from "../../sprache";
import {
  datumText, fehlerErgebnis, gekuerzt, geoJsonObjekte, liegtIn, LON_LAT, umrechnen, umrissVon, wert, wmsInfoUrl, wmsStufen, type Punkt,
} from "./hilfen";
import type { BplanDienst, DenkmalDienst, DenkmalTreffer, PlanTreffer } from "./typen";

const WFS = "https://plis-bb.de/plisproject/inspire/index.php/geoserver/bebauungsplaene_rechtswirksam_wfs/wfs";

/** 'Nr. 16 "Hotel und Büropark Voltaireweg"' -> Nummer "16", Name "Hotel und Büropark Voltaireweg" */
function nummerUndName(bez: string): [string, string] {
  const zitat = /^(?:Nr\.\s*)?([^"„“]*?)\s*["„“]([^"„“]*)["“”]\s*(.*)$/.exec(bez);
  if (zitat && zitat[1]) return [zitat[1], [zitat[2], zitat[3]].filter(Boolean).join(" ")];
  const erstes = /^(?:Nr\.\s*)?(\S*\d\S*)\s+(.+)$/.exec(bez);
  return erstes ? [erstes[1], erstes[2]] : [bez, ""];
}

export const brandenburgBplan: BplanDienst = {
  id: "bb-bplan",
  quelle: "Gemeinsame Landesplanungsabteilung Berlin-Brandenburg / LBV – rechtswirksame Bebauungspläne (PLIS, dl-de/by-2.0)",
  gebiet: { land: "Brandenburg" },
  // Metadaten (00e2a688-dadc-4043-acc9-502be162170f): Daten werden im Rahmen von Beteiligungen der Raumordnungsbehörde bzw.
  // durch zusätzliche Recherchen erfasst; "Weitere Auskünfte zu den Inhalten können nur die jeweiligen Kommunen erteilen."
  vollstaendig: false,
  browser: true,
  abdeckung: {
    de: "Landesweite Sammlung der Landesplanung (Erfassung über Beteiligungsverfahren) – nicht als vollständig ausgewiesen; ohne Planunterlagen. Verbindlich ist die Auskunft der Gemeinde.",
    en: "State-wide collection by the regional planning authority (gathered through consultation procedures) – not declared complete; no plan documents. The municipality’s information is binding.",
  },
  async abfrage(lat, lon, sprache) {
    const p: Punkt = [lon, lat];
    const cql = encodeURIComponent(`INTERSECTS(the_geom,SRID=4326;POINT(${lon.toFixed(7)} ${lat.toFixed(7)}))`);
    const url = `${WFS}?SERVICE=WFS&VERSION=2.0.0&REQUEST=GetFeature&TYPENAMES=bebauungsplaene_rechtswirksam_wfs:bp_rechtswirksam_flaechen&OUTPUTFORMAT=application/json&SRSNAME=EPSG:4326&COUNT=50&CQL_FILTER=${cql}`;
    try {
      const treffer: PlanTreffer[] = [];
      for (const f of geoJsonObjekte(await holeJson(url))) {
        const x = f.properties ?? {};
        if (wert(x.bp_t_ent_g) && !/rechtswirksam/i.test(String(x.bp_t_ent_g))) continue;
        const g = umrechnen(f.geometry, LON_LAT);
        if (g && !liegtIn(p, g)) continue;
        const [nummer, name] = nummerUndName(wert(x.bp_bez) ?? "?");
        const art = wert(x.bp_t_part);
        const gemeinde = wert(x.gemname);
        treffer.push({
          nummer,
          name: gemeinde && !name.includes(gemeinde) ? `${name}${name ? " – " : ""}${gemeinde}` : name,
          // bp_dat_bek: Datum der Bekanntmachung
          rechtsverbindlichSeit: datumText(x.bp_dat_bek, sprache),
          vorhabenbezogen: /vorhabenbezogen/i.test(art ?? ""),
          verfahren: art && art !== "Bebauungsplan" ? art : undefined,
          umriss: umrissVon(p, g, 300),
        });
      }
      return { status: "ok", treffer };
    } catch (e) {
      return fehlerErgebnis("bplan", "PLIS Brandenburg", e, sprache);
    }
  },
};

// --- Denkmale: Frankfurt (Oder) ---

// Capabilities (AccessConstraints): Datenlizenz Deutschland – Namensnennung 2.0, Namensnennung "GeoDaten-KVA / Stadt
// Frankfurt (Oder)". Ebenen: denkmaeler_f (Baudenkmale, Gartendenkmale, Denkmalbereiche, Ensembles als Flächen) und
// denkmaeler_p (punkthafte Denkmale). ArcGIS-WMS: GetFeatureInfo ohne Geometrie (geometry: null) – Entfernungen in Stufen
// über die Treffer-Toleranz (ausgemessen etwa 2,5 Pixel, 18.11.2026).
const FFO_WMS = "https://geoportal.frankfurt-oder.de/wss/service/WMS_Denkmaeler/guest";
const FFO_TOLERANZ_PX = 2.4;
/** Datentyp laut Dienst ("1 - Baudenkmale") -> Ausweisung in der Einzahl; andere Werte unverändert ohne Ziffer */
const FFO_ART: Record<string, [string, string]> = {
  "1": ["Baudenkmal", "Listed building"],
  "3": ["Gartendenkmal", "Listed garden"],
  "4": ["Denkmalbereich", "Conservation area"],
  "6": ["Ensemble / Gesamtanlage", "Ensemble"],
};
const ohneTrennung = (s: string | undefined) => s?.replace(/­/g, "");

export const frankfurtOderDenkmal: DenkmalDienst = {
  id: "bb-frankfurt-oder-denkmal",
  quelle: "Stadt Frankfurt (Oder) – Denkmäler (© GeoDaten-KVA / Stadt Frankfurt (Oder), dl-de/by-2.0)",
  viewer: "https://geoportal.frankfurt-oder.de/Geoportal/",
  gebiet: { land: "Brandenburg", gemeinde: "Frankfurt (Oder)" },
  // Capabilities ohne Aussage zur Vollständigkeit; maßgeblich ist die Denkmalliste des Landes (BLDAM).
  vollstaendig: false,
  browser: true,
  abdeckung: {
    de: "Denkmale der Stadt Frankfurt (Oder) (Kataster- und Vermessungsamt); keine Aussage zur Vollständigkeit – maßgeblich ist die Denkmalliste des Landes. Der Dienst liefert keine Umrisse: Entfernungen nur grob in Stufen (am Standort, bis etwa 10, 25 bzw. 50 m).",
    en: "Monuments of the City of Frankfurt (Oder) (land surveying office); no statement on completeness – the state list of monuments is authoritative. The service gives no outlines: distances only roughly in steps (at the location, up to about 10, 25 or 50 m).",
  },
  async abfrage(lat, lon, radiusM, sprache) {
    const t = zweisprachig(sprache);
    const p: Punkt = [lon, lat];
    try {
      const funde = await wmsStufen(
        async (halbeKanteM) => geoJsonObjekte(await holeJson(wmsInfoUrl(FFO_WMS, "denkmaeler_f,denkmaeler_p", p, halbeKanteM, "application/geo+json", 50))),
        (f) => String(wert(f.properties?.obj_nr) ?? wert(f.properties?.OBJECTID) ?? JSON.stringify(f.properties)),
        radiusM,
        FFO_TOLERANZ_PX,
      );
      const treffer: DenkmalTreffer[] = funde.map(({ objekt: f, entfernungM }) => {
        const x = f.properties ?? {};
        const typ = wert(x.datentyp) ?? "";
        const art = FFO_ART[/^\d+/.exec(typ)?.[0] ?? ""];
        const gruppe = /bereich|ensemble|gesamtanlage/i.test(typ);
        const bezeichnung = ohneTrennung(wert(x.bezeichnung_de));
        // Denkmalbereiche: "Satzung der Stadt … über die Unterschutzstellung des Denkmalbereichs Gubener Vorstadt (…)"
        const satzung = /Denkmalbereichs\s+["„“]?(.+?)["“”]?\s*\(/.exec(bezeichnung ?? "")?.[1];
        const strasse = ohneTrennung([wert(x.strasse), wert(x.hausnummer)].filter(Boolean).join(" ")) || undefined;
        return {
          name: satzung
            ? t(`Denkmalbereich ${satzung}`, `Conservation area ${satzung}`)
            : bezeichnung?.replace(/^["„“]+|["“”]+$/g, "").trim() || strasse || t("Denkmal", "Monument"),
          anschrift: strasse && !gruppe ? `${strasse}, Frankfurt (Oder)` : undefined,
          ausweisung: art ? t(...art) : typ.replace(/^\d+\s*-\s*/, "") || t("Denkmal", "Monument"),
          beschreibung: gekuerzt(satzung ? bezeichnung : (wert(x.bezeichnung_lat) ?? (gruppe && strasse ? strasse : undefined)), 300),
          gruppe,
          entfernungM,
          // keine Geometrie im Dienst – keine Lageskizze
          umriss: [],
        };
      });
      treffer.sort((x, y) => x.entfernungM - y.entfernungM || Number(x.gruppe) - Number(y.gruppe) || x.name.localeCompare(y.name, "de"));
      return { status: "ok", treffer };
    } catch (e) {
      return fehlerErgebnis("denkmal", "Denkmäler Frankfurt (Oder)", e, sprache);
    }
  },
};
