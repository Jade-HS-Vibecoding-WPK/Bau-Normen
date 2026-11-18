// Rheinland-Pfalz:
//  - B-Pläne: "Metadaten Bebauungspläne RP" der Zentralen Stelle GDI-RP (Geoportal.rlp, MapServer-WFS, dl-de/by-2.0) –
//    Umringe der im Geoportal beschriebenen Bebauungspläne (KomServ4GDI-RP, kommunale Portale wie Koblenz).
//    Der Dienst nennt weder Rechtsstand noch Datum; die großen Städte (Mainz, Ludwigshafen, Trier, Kaiserslautern) fehlen.
//  - Denkmale: Denkmalliste der Generaldirektion Kulturelles Erbe (GDKE) über die Registry des Geoportals (WFS, dl-de/by-2.0).
// Beide mit Access-Control-Allow-Origin: * (geprüft 17.11.2026).
import { holeJson } from "../abruf";
import { zweisprachig } from "../../sprache";
import { bboxBreiteLaenge, denkmaleImUmkreis, fehlerErgebnis, gekuerzt, geoJsonObjekte, liegtIn, LON_LAT, umrechnen, umrissVon, UTM, wert, type DenkmalRoh, type Punkt } from "./hilfen";
import type { BplanDienst, DenkmalDienst, PlanTreffer } from "./typen";

const BPLAN_WFS = "https://www.geoportal.rlp.de/cgi-bin/mapserv?map=/data/mapbender/tools/wms_extent/metadata_bplan.map";

export const rlpBplan: BplanDienst = {
  id: "rp-bplan",
  quelle: "Zentrale Stelle GDI-RP (LVermGeo RLP): Metadaten Bebauungspläne RP (Geoportal.rlp, dl-de/by-2.0)",
  viewer: "https://www.geoportal.rlp.de/",
  gebiet: { land: "Rheinland-Pfalz" },
  // Metadaten ohne Beschreibung und ohne Aussage zu Vollständigkeit oder Rechtsstand. Im Test keine Pläne in Mainz,
  // Ludwigshafen, Trier, Kaiserslautern, Worms und Landau.
  vollstaendig: false,
  browser: true,
  abdeckung: {
    de: "Nur Pläne, die Gemeinden im Geoportal beschrieben haben (z. B. Koblenz); Mainz, Ludwigshafen, Trier und Kaiserslautern fehlen. Der Dienst nennt weder Rechtsstand noch Datum.",
    en: "Only plans that municipalities have described in the geoportal (e.g. Koblenz); Mainz, Ludwigshafen, Trier and Kaiserslautern are missing. The service gives neither legal status nor date.",
  },
  async abfrage(lat, lon, sprache) {
    const t = zweisprachig(sprache);
    const p: Punkt = [lon, lat];
    const url = `${BPLAN_WFS}&SERVICE=WFS&VERSION=2.0.0&REQUEST=GetFeature&TYPENAMES=gdi-rp:bplan_polygon&COUNT=50&BBOX=${bboxBreiteLaenge(p, 1)}&OUTPUTFORMAT=${encodeURIComponent("application/json; subtype=geojson")}`;
    try {
      const treffer: PlanTreffer[] = [];
      const gesehen = new Set<string>();
      for (const f of geoJsonObjekte(await holeJson(url))) {
        const x = f.properties ?? {};
        const g = umrechnen(f.geometry, LON_LAT);
        if (g && !liegtIn(p, g)) continue;
        const id = wert(x.uuid) ?? wert(x.metadata_id) ?? "";
        if (gesehen.has(id)) continue;
        gesehen.add(id);
        // Plankennung der KomServ-Einträge steht im Beschreibungstext, z. B. "[BPlan.07143281.2.0]"
        // bzw. am Ende des Verweises auf die kommunalen Metadaten, z. B. ".../metadata/16_5" (Koblenz: Plan 16, 5. Änderung)
        const kennung = /\[(BPlan\.[^\]]+)\]/.exec(String(x.abstract ?? ""))?.[1] ?? /\/metadata\/([\w.-]+)$/.exec(String(x.link ?? ""))?.[1];
        const traeger = wert(x.responsible_party_name);
        treffer.push({
          nummer: kennung ?? "",
          name: [wert(x.title), traeger && !/\d{5}/.test(traeger) ? traeger : undefined].filter(Boolean).join(", "),
          vorhabenbezogen: /vorhabenbezogen/i.test(`${x.title ?? ""} ${x.abstract ?? ""}`),
          verfahren: t("Rechtsstand und Datum im Dienst nicht angegeben", "legal status and date not given by the service"),
          umriss: umrissVon(p, g, 300),
        });
      }
      return { status: "ok", treffer };
    } catch (e) {
      return fehlerErgebnis("bplan", "Bebauungspläne RP", e, sprache);
    }
  },
};

// --- Denkmale ---

const GDKE_WFS = "https://www.geoportal.rlp.de/registry/wfs/665";
/** Objektarten der Denkmalliste (Typname -> Anzeige); Bodendenkmäler sind nicht enthalten */
const EBENEN: Record<string, { de: string; en: string; gruppe: boolean }> = {
  edm_flaechen: { de: "Einzeldenkmal", en: "Individual monument", gruppe: false },
  edm_punkte: { de: "Einzeldenkmal", en: "Individual monument", gruppe: false },
  edm_linien: { de: "Einzeldenkmal", en: "Individual monument", gruppe: false },
  denkmalzonen: { de: "Denkmalzone", en: "Monument zone", gruppe: true },
  bga: { de: "Bauliche Gesamtanlage", en: "Building complex (bauliche Gesamtanlage)", gruppe: true },
  gruenflaechen: { de: "Denkmal (Grünfläche)", en: "Monument (green space)", gruppe: false },
  wasserflaechen: { de: "Denkmal (Wasserfläche)", en: "Monument (water body)", gruppe: false },
};

export const rlpDenkmal: DenkmalDienst = {
  id: "rp-denkmal",
  quelle: "Generaldirektion Kulturelles Erbe Rheinland-Pfalz: Denkmalliste (Quellenvermerk: GDKE RLP, dl-de/by-2.0)",
  viewer: "https://www.geoportal.rlp.de/",
  gebiet: { land: "Rheinland-Pfalz" },
  // Dienst ohne Aussage zur Vollständigkeit; die Verzeichnisse der GDKE: "Das Verzeichnis erhebt keinen Anspruch auf
  // Vollständigkeit", der Denkmalschutz hängt nicht von der Eintragung ab. Bodendenkmäler nicht enthalten.
  vollstaendig: false,
  browser: true,
  abdeckung: {
    de: "Nachrichtliches Verzeichnis der Kulturdenkmäler (laut GDKE ohne Anspruch auf Vollständigkeit); Bodendenkmäler nicht enthalten.",
    en: "Informative list of cultural monuments (according to the state office without claim to completeness); archaeological monuments not included.",
  },
  async abfrage(lat, lon, radiusM, sprache) {
    const t = zweisprachig(sprache);
    const p: Punkt = [lon, lat];
    const bbox = bboxBreiteLaenge(p, radiusM + 10);
    // Der Registry-Proxy beantwortet nur eine Objektart je Anfrage; Ausgabe immer in EPSG:25832
    const ebenen = Object.keys(EBENEN);
    const anfrage = (ebene: string) =>
      holeJson(`${GDKE_WFS}?SERVICE=WFS&VERSION=2.0.0&REQUEST=GetFeature&TYPENAMES=gdke:${ebene}&COUNT=100&BBOX=${bbox}&OUTPUTFORMAT=application/json`, 12000);
    try {
      const antworten = await Promise.all(ebenen.map(anfrage));
      const roh: DenkmalRoh[] = antworten.flatMap((a, i) => {
        const ebene = EBENEN[ebenen[i]];
        return geoJsonObjekte(a).map((f) => {
          const x = f.properties ?? {};
          const art = wert(x.flaechentyp) ?? ebene.de;
          return {
            name: (wert(x.denkmalbezeichnung) ?? t(art, ebene.en)).replace(/^"(.*)"$/, "$1"),
            ausweisung: wert(x.flaechentyp) ? art : t(ebene.de, ebene.en),
            beschreibung: gekuerzt(wert(x.kurzbeschreibung)),
            gruppe: ebene.gruppe || /zone|gesamtanlage/i.test(art),
            geometrie: umrechnen(f.geometry, UTM(32)),
            schluessel: wert(x.pgis_id) ? `${x.pgis_id}|${art}` : undefined,
          };
        });
      });
      return { status: "ok", treffer: denkmaleImUmkreis(p, radiusM, roh) };
    } catch (e) {
      return fehlerErgebnis("denkmal", "Denkmalliste RLP", e, sprache);
    }
  },
};
