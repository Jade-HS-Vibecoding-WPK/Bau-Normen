// Bayern:
//  - B-Pläne landesweit: "Bauleitpläne Bayern" (LDBV / GDI-BY, WMS GetFeatureInfo, CC BY-ND 4.0) – nur Pläne, die Gemeinden
//    an das Landesportal melden; München fehlt, Nürnberg nur als Weiterleitung. Deshalb zusätzlich die Dienste der
//    Landeshauptstadt München (Geoportal, WMS) und der Stadt Nürnberg (BISS, ArcGIS REST).
//  - Denkmale: Bayerisches Landesamt für Denkmalpflege, Denkmal-Daten (WMS GetFeatureInfo, CC BY-ND 4.0). Ein öffentlicher
//    WFS mit Geometrie fehlt; Entfernungen werden deshalb aus den Begrenzungsrechtecken bestimmt.
// CORS: Landesdienste und München "*", Nürnberg "*", BLfD spiegelt die Herkunft (alle geprüft 17.11.2026).
import { holeJson, holeText } from "../abruf";
import { type Sprache, zweisprachig } from "../../sprache";
import {
  abstand, alsJson, datumText, esriGeometrie, fehlerErgebnis, gekuerzt, geoJsonObjekte, gmlObjekte, liegtIn, LON_LAT, rechteck, rechteckFlaeche,
  umrechnen, umrissVon, unlesbar, wert, webLink, type Punkt,
} from "./hilfen";
import type { BplanDienst, DenkmalDienst, DenkmalTreffer, DienstErgebnis, PlanTreffer } from "./typen";

/** WMS-1.3.0-GetFeatureInfo in EPSG:4326 (Achsen Breite, Länge): Bild 101 × 101 Pixel um den Punkt, Abfrage in der Mitte */
function gfiUrl(basis: string, ebenen: string, lat: number, lon: number, halbeKanteM: number, format: string, anzahl = 20): string {
  const [a, b, c, d] = rechteck([lon, lat], halbeKanteM);
  return (
    `${basis}?SERVICE=WMS&VERSION=1.3.0&REQUEST=GetFeatureInfo&LAYERS=${ebenen}&QUERY_LAYERS=${ebenen}&STYLES=&CRS=EPSG:4326` +
    `&BBOX=${[b, a, d, c].map((x) => x.toFixed(6)).join(",")}&WIDTH=101&HEIGHT=101&I=50&J=50&INFO_FORMAT=${encodeURIComponent(format)}&FEATURE_COUNT=${anzahl}`
  );
}

/** Der Landesdienst antwortet gelegentlich mit HTTP 500 – bis zu zweimal wiederholen */
async function mitWiederholung<T>(f: () => Promise<T>, versuche = 3): Promise<T> {
  for (let i = 1; ; i++) {
    try {
      return await f();
    } catch (e) {
      if (i >= versuche) throw e;
      await new Promise((r) => setTimeout(r, 400 * i));
    }
  }
}

// --- B-Pläne: Landesportal ---

const BY_WMS = "https://gdiserv.bayern.de/bauleitplanung/wms";
/** Planart laut Leitfaden "Bauleitpläne Bayern": 4000 ff. sind Satzungen nach § 34/35 BauGB, keine Bebauungspläne */
const BY_PLANART: Record<string, [string, string]> = {
  "1000": ["einfacher Bebauungsplan", "simple development plan"],
  "2000": ["qualifizierter Bebauungsplan", "qualified development plan"],
  "3000": ["vorhabenbezogener Bebauungsplan", "project-related development plan"],
  "6000": ["Bebauungsplan der Innenentwicklung", "development plan for inner development"],
};

export const bayernBplan: BplanDienst = {
  id: "by-bplan",
  quelle: "Bauleitpläne Bayern: LDBV / Geschäftsstelle GDI-BY (CC BY-ND 4.0)",
  viewer: "https://portal.diplanung.de/",
  gebiet: { land: "Bayern" },
  // Datensatz-Metadaten (26d2b2b8-3944-4a49-aec2-59f827d9aa9e): "Die Daten liegen nicht flächendeckend vor."
  vollstaendig: false,
  browser: true,
  abdeckung: {
    de: "Nur Pläne der Gemeinden, die an das Landesportal melden („nicht flächendeckend“); München und Nürnberg über eigene Dienste.",
    en: "Only plans of municipalities reporting to the state portal (“not area-wide”); Munich and Nuremberg via their own services.",
  },
  async abfrage(lat, lon, sprache) {
    const t = zweisprachig(sprache);
    // ± 25 m: Ebene wird in diesem Maßstab sicher dargestellt, Treffer-Toleranz wenige Dezimeter
    const url = gfiUrl(BY_WMS, "bplan_rechtskraft", lat, lon, 25, "application/json");
    try {
      const text = await mitWiederholung(() => holeText(url));
      // Kaskadierender Dienst: zuerst GeoJSON des Landesservers, danach ggf. HTML weiterer Server – nur das GeoJSON zählt
      const ende = text.search(/<!DOCTYPE|<html/i);
      const objekte = geoJsonObjekte(alsJson(ende >= 0 ? text.slice(0, ende) : text));
      const treffer: PlanTreffer[] = [];
      for (const f of objekte) {
        const x = f.properties ?? {};
        if (/weiterleitung/i.test(`${x.planname ?? ""} ${x.beschr ?? ""}`)) continue; // Platzhalter (z. B. Nürnberg)
        if (x.rechtssta !== undefined && String(x.rechtssta) !== "4000") continue;
        const art = String(x.planart ?? "");
        if (/^[45789]000$/.test(art)) continue; // Satzungen
        treffer.push({
          nummer: wert(x.nummer) ?? wert(x.planid) ?? "?",
          name: [wert(x.planname), wert(x.stadt)].filter(Boolean).join(", "),
          rechtsverbindlichSeit: datumText(x.inkrafttre, sprache),
          vorhabenbezogen: art === "3000",
          verfahren: BY_PLANART[art] ? t(...BY_PLANART[art]) : undefined,
          link: webLink(x.scanurl) ?? webLink(x.rechtsurl) ?? webLink(x.texturl),
          // Geometrie im Dienst auf 4 Nachkommastellen gerundet – reicht für die Skizze, nicht für eine eigene Lageprüfung
          umriss: umrissVon([lon, lat], umrechnen(f.geometry, LON_LAT), 300),
        });
      }
      return { status: "ok", treffer };
    } catch (e) {
      return fehlerErgebnis("bplan", "Bauleitpläne Bayern", e, sprache);
    }
  },
};

// --- B-Pläne: München ---

const M_WMS = "https://geoportal.muenchen.de/geoserver/plan/wms";

export const muenchenBplan: BplanDienst = {
  id: "by-muenchen-bplan",
  quelle: "Landeshauptstadt München: rechtsverbindliche Bebauungspläne (Geoportal München)",
  viewer: "https://geoportal.muenchen.de/portal/opendata/",
  gebiet: { land: "Bayern", gemeinde: "München" },
  // Hinweis im Dienst: "Eine Gewähr für die Richtigkeit, Vollzähligkeit … wird nicht übernommen."
  vollstaendig: false,
  browser: true,
  abdeckung: {
    de: "Rechtsverbindliche Bebauungspläne der Landeshauptstadt München; die Stadt übernimmt keine Gewähr für Vollzähligkeit. Ohne Datum des Inkrafttretens.",
    en: "Legally binding development plans of the City of Munich; the city gives no guarantee of completeness. Without date of entry into force.",
  },
  async abfrage(lat, lon, sprache) {
    const p: Punkt = [lon, lat];
    // ± 50 m: bei größerem Maßstab blendet der Dienst die Ebene aus
    const url = gfiUrl(M_WMS, "vagrund_baug_umgriff_veredelt_in_kraft", lat, lon, 50, "application/json");
    try {
      const treffer: PlanTreffer[] = [];
      for (const f of geoJsonObjekte(await holeJson(url))) {
        const x = f.properties ?? {};
        if (wert(x.art) && x.art !== "BEBPLAN") continue;
        const g = umrechnen(f.geometry, LON_LAT);
        if (g && !liegtIn(p, g)) continue;
        treffer.push({
          nummer: wert(x.nr_plan) ?? wert(x.nr) ?? "?",
          name: "",
          vorhabenbezogen: false,
          link: webLink(x.bplan_te_3) ?? webLink(x.bplan_te_1),
          umriss: umrissVon(p, g, 300),
        });
      }
      return { status: "ok", treffer };
    } catch (e) {
      return fehlerErgebnis("bplan", "Bebauungspläne München", e, sprache);
    }
  },
};

// --- B-Pläne: Nürnberg ---

const N_REST = "https://geoportal.nuernberg.de/server/rest/services/Fachdaten/BISS_MP_F_V/MapServer";

interface EsriAntwort {
  features?: { attributes: Record<string, unknown>; geometry?: unknown }[];
  error?: { message?: string };
}

async function nuernbergEbene(ebene: number, lat: number, lon: number): Promise<NonNullable<EsriAntwort["features"]>> {
  const params = new URLSearchParams({
    geometry: `${lon},${lat}`,
    geometryType: "esriGeometryPoint",
    inSR: "4326",
    spatialRel: "esriSpatialRelIntersects",
    outFields: "*",
    returnGeometry: "true",
    outSR: "4326",
    maxAllowableOffset: "0.000005",
    f: "json",
  });
  const a = await holeJson<EsriAntwort>(`${N_REST}/${ebene}/query?${params}`);
  if (a.error || !Array.isArray(a.features)) throw unlesbar(a.error?.message ?? "keine Objektliste");
  return a.features;
}

export const nuernbergBplan: BplanDienst = {
  id: "by-nuernberg-bplan",
  quelle: "Stadt Nürnberg, Stadtplanungsamt: Bebauungsplan-Informationssystem BISS (© Stadt Nürnberg)",
  viewer: "https://geoportal.nuernberg.de/masterportal/bebauungsplaene/",
  gebiet: { land: "Bayern", gemeinde: "Nürnberg" },
  // Hinweis im Dienst: "Für die Richtigkeit, Aktualität und Vollständigkeit der Daten wird keine Gewähr übernommen."
  vollstaendig: false,
  browser: true,
  abdeckung: {
    de: "Bebauungspläne und übergeleitete Baulinienpläne der Stadt Nürnberg; die Stadt übernimmt keine Gewähr für Vollständigkeit.",
    en: "Development plans and transferred building-line plans of the City of Nuremberg; the city gives no guarantee of completeness.",
  },
  async abfrage(lat, lon, sprache): Promise<DienstErgebnis<PlanTreffer>> {
    const t = zweisprachig(sprache);
    const p: Punkt = [lon, lat];
    try {
      // Ebene 1: Bebauungspläne in Kraft; Ebene 3: übergeleitete Baulinienpläne (Geltungsbereiche)
      const [plaene, baulinien] = await Promise.all([nuernbergEbene(1, lat, lon), nuernbergEbene(3, lat, lon)]);
      const treffer: PlanTreffer[] = [
        ...plaene
          .filter(({ attributes: x }) => !wert(x.BEZ_RS) || /in kraft/i.test(String(x.BEZ_RS)))
          .map(({ attributes: x, geometry }) => {
            const art = wert(x.BEZ_ART);
            return {
              nummer: wert(x.NR) ?? "?",
              name: wert(x.TITEL) ?? gekuerzt(wert(x.GEBIET), 160) ?? "",
              rechtsverbindlichSeit: datumText(x.IN_KRAFT, sprache),
              vorhabenbezogen: /vorhabenbezogen/i.test(art ?? ""),
              verfahren: art && art !== "Bebauungsplan" ? art : undefined,
              link: webLink(x.SCANURL) ?? webLink(x.TEXTURL),
              umriss: umrissVon(p, esriGeometrie(geometry), 300),
            };
          }),
        ...baulinien
          .filter(({ attributes: x }) => !wert(x.BEZ_RS_BL) || /in kraft/i.test(String(x.BEZ_RS_BL)))
          .map(({ attributes: x, geometry }) => ({
            nummer: wert(x.B_NR) ?? "?",
            name: t(`Katasterblatt ${wert(x.B_NR) ?? ""}`.trim(), `Cadastral sheet ${wert(x.B_NR) ?? ""}`.trim()),
            vorhabenbezogen: false,
            verfahren: wert(x.BEZ_ART_BL) ?? t("übergeleiteter Baulinienplan", "transferred building-line plan"),
            link: webLink(x.BLURL),
            umriss: umrissVon(p, esriGeometrie(geometry), 300),
          })),
      ];
      return { status: "ok", treffer };
    } catch (e) {
      return fehlerErgebnis("bplan", "BISS Nürnberg", e, sprache);
    }
  },
};

// --- Denkmale ---

const BLFD_WMS = "https://geoservices.bayern.de/od/wms/gdi/v1/denkmal";
const BLFD_EBENEN = "einzeldenkmalO,bauensembleO,bodendenkmalO";

/** Gemeindeliste (PDF) des BLfD aus der Aktennummer, z. B. D-1-62-000-1808 -> denkmalliste_merge_162000.pdf */
function listenLink(akte: string | undefined): string | undefined {
  const m = /^[DE]-(\d)-(\d{2})-(\d{3})-/.exec(akte ?? "");
  return m ? `https://www.geodaten.bayern.de/denkmal_static_data/externe_denkmalliste/pdf/denkmalliste_merge_${m[1]}${m[2]}${m[3]}.pdf` : undefined;
}

interface BlfdObjekt extends Omit<DenkmalTreffer, "entfernungM" | "umriss"> {
  akte?: string;
  huelle?: [Punkt, Punkt];
}

function blfdObjekte(xml: string, sprache: Sprache): BlfdObjekt[] {
  const t = zweisprachig(sprache);
  return gmlObjekte(xml, LON_LAT).map((o) => {
    const x = o.werte;
    const akte = wert(x.aktennummer);
    const ensemble = o.typ.startsWith("bauensemble");
    const boden = o.typ.startsWith("bodendenkmal");
    const name = ensemble
      ? t(`Ensemble ${akte ?? ""}`.trim(), `Ensemble ${akte ?? ""}`.trim())
      : boden
        ? (gekuerzt(wert(x.beschreibung) ?? wert(x.bezeichnung), 120) ?? t("Bodendenkmal", "Archaeological monument"))
        : (wert(x.tradobjbez) ?? wert(x.funktion) ?? wert(x.adresse) ?? t("Baudenkmal", "Listed building"));
    return {
      akte,
      huelle: o.huelle,
      name,
      anschrift: wert(x.adresse),
      ausweisung: ensemble ? t("Ensemble", "Ensemble") : boden ? t("Bodendenkmal", "Archaeological monument") : t("Baudenkmal", "Listed building"),
      objekttyp: boden ? undefined : wert(x.funktion),
      beschreibung: gekuerzt(boden ? (wert(x.verfahrensstand) ? t(`Verfahrensstand: ${x.verfahrensstand}`, `Procedure status: ${x.verfahrensstand}`) : undefined) : wert(x.beschreibung)),
      gruppe: ensemble,
      link: listenLink(akte),
    };
  });
}

export const bayernDenkmal: DenkmalDienst = {
  id: "by-denkmal",
  quelle: "Bayerisches Landesamt für Denkmalpflege: Denkmal-Daten (© BLfD, CC BY-ND 4.0)",
  viewer: "https://geoportal.bayern.de/denkmalatlas/",
  gebiet: { land: "Bayern" },
  // Metadaten: Kartierungen der Bau- und Bodendenkmäler sowie Ensembles, die nach Art. 2 BayDSchG in die Denkmalliste
  // eingetragen sind; zugleich: "Die Zahl der tatsächlich vorhandenen Bodendenkmäler kann höher sein."
  vollstaendig: false,
  browser: true,
  abdeckung: {
    de: "Kartierung der Bayerischen Denkmalliste; laut BLfD kann es mehr Bodendenkmäler geben als verzeichnet. Der Dienst liefert keine Umrisse: Entfernungen sind Mindestabstände zum Begrenzungsrechteck (ungefähr).",
    en: "Mapping of the Bavarian list of monuments; according to the state office there may be more archaeological monuments than listed. The service gives no outlines: distances are minimum distances to the bounding box (approximate).",
  },
  async abfrage(lat, lon, radiusM, sprache) {
    const p: Punkt = [lon, lat];
    try {
      // 1) am Standort: kleiner Ausschnitt (± 5 m), Toleranz unter 1 m -> Denkmale, in deren Fläche der Punkt liegt
      // 2) Umgebung: Pixelgröße ≈ Umkreis / 3, weil der Dienst etwa 3 Pixel Toleranz anwendet
      const halbeKante = ((radiusM + 10) / 3) * 50.5;
      const [hier, umgebung] = await Promise.all([
        holeText(gfiUrl(BLFD_WMS, BLFD_EBENEN, lat, lon, 5, "application/vnd.ogc.gml", 20)),
        holeText(gfiUrl(BLFD_WMS, BLFD_EBENEN, lat, lon, halbeKante, "application/vnd.ogc.gml", 50)),
      ]);
      const amStandort = blfdObjekte(hier, sprache);
      const drin = new Set(amStandort.map((d) => d.akte).filter(Boolean));
      const gesehen = new Set<string>();
      const treffer: DenkmalTreffer[] = [];
      for (const { akte, huelle, ...d } of [...amStandort, ...blfdObjekte(umgebung, sprache)]) {
        const schluessel = akte ?? d.name;
        if (gesehen.has(schluessel)) continue;
        gesehen.add(schluessel);
        const istDrin = !!akte && drin.has(akte);
        if (!huelle && !istDrin) continue;
        // Entfernung zum Begrenzungsrechteck (untere Schranke): im Rechteck, aber nicht im Denkmal -> 1 m
        const entfernungM = istDrin ? 0 : Math.max(1, Math.round(abstand(p, rechteckFlaeche(huelle!))));
        if (entfernungM > radiusM) continue;
        // Umriss nur als Mittelpunkt des Rechtecks – eine echte Umrisslinie liefert der Dienst nicht
        const mitte: Punkt | undefined = huelle ? [(huelle[0][0] + huelle[1][0]) / 2, (huelle[0][1] + huelle[1][1]) / 2] : undefined;
        treffer.push({ ...d, entfernungM, umriss: mitte ? umrissVon(p, { type: "Point", coordinates: mitte }) : [] });
      }
      treffer.sort((x, y) => x.entfernungM - y.entfernungM || Number(x.gruppe) - Number(y.gruppe));
      return { status: "ok", treffer };
    } catch (e) {
      return fehlerErgebnis("denkmal", "Denkmal-Daten Bayern", e, sprache);
    }
  },
};
