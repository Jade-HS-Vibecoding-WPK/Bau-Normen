// Brandenburg: rechtswirksame Bebauungspläne aus dem Planungsinformationssystem PLIS der Gemeinsamen Landesplanungsabteilung
// Berlin-Brandenburg (GeoServer-WFS, dl-de/by-2.0, Access-Control-Allow-Origin: *, geprüft 17.11.2026).
// Denkmale: Das BLDAM bietet WFS-Dienste an, seine Nutzungshinweise erlauben aber nur internen Gebrauch und verlangen für
// jede Veröffentlichung die vorherige schriftliche Zustimmung; CORS nur für geoportal.brandenburg.de – nicht angebunden.
import { holeJson } from "../abruf";
import { datumText, fehlerErgebnis, geoJsonObjekte, liegtIn, LON_LAT, umrechnen, umrissVon, wert, type Punkt } from "./hilfen";
import type { BplanDienst, PlanTreffer } from "./typen";

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
