// Baden-Württemberg:
//  - B-Pläne landesweit (teilweise): Raumordnungskataster AROK der Regierungspräsidien (WFS "AROK BPL landesweit",
//    dl-de/by-2.0) – der Bezirk des RP Stuttgart fehlt bisher. Dazu die Landeshauptstadt Stuttgart (XPlanung-WFS über Komm.ONE).
//  - Denkmale: Landesamt für Denkmalpflege im RP Stuttgart (WFS über owsproxy.lgl-bw.de, dl-de/by-2.0) – Bau- und
//    Kunstdenkmale, Gesamtanlagen und archäologische Kulturdenkmale.
// CORS: AROK, Komm.ONE spiegeln die Herkunft, LAD "*" (geprüft 17.11.2026).
import { holeJson } from "../abruf";
import { zweisprachig } from "../../sprache";
import {
  bboxBreiteLaenge, datumText, denkmaleImUmkreis, fehlerErgebnis, gekuerzt, geoJsonObjekte, liegtIn, LON_LAT, umrechnen, umrissVon, UTM, wert,
  webLink, type DenkmalRoh, type Punkt,
} from "./hilfen";
import { geojsonBplan } from "./plandienste";
import type { BplanDienst, DenkmalDienst, PlanTreffer } from "./typen";

// --- B-Pläne: Raumordnungskataster ---

const AROK_WFS = "https://www.geoportal-raumordnung-bw.de/ows/services/org.1.89ce64b3-5e63-440c-ae65-cbbe2f7a08c0_wfs";
const AROK_ART: Record<string, [string, string]> = {
  "10": ["qualifizierter Bebauungsplan", "qualified development plan"],
  "30": ["einfacher Bebauungsplan", "simple development plan"],
  "50": ["vorhabenbezogener Bebauungsplan (VEP)", "project-related development plan"],
};

export const bwArokBplan: BplanDienst = {
  id: "bw-bplan",
  quelle: "Regierungspräsidien Baden-Württemberg: Raumordnungskataster, Bebauungspläne (© Daten aus dem Geoportal Raumordnung Baden-Württemberg, dl-de/by-2.0)",
  viewer: "https://www.geoportal-raumordnung-bw.de/client/",
  gebiet: { land: "Baden-Württemberg" },
  // RP: "Der Aufbau des AROK wird allerdings noch einige Zeit in Anspruch nehmen"; es werden "nicht die kompletten"
  // Bebauungspläne übernommen. Im Test: Bezirk RP Stuttgart (Stuttgart, Heilbronn) ohne Daten.
  vollstaendig: false,
  browser: true,
  abdeckung: {
    de: "Raumordnungskataster im Aufbau, nicht alle Bebauungspläne übernommen; der Regierungsbezirk Stuttgart fehlt bisher (Stadt Stuttgart über eigenen Dienst).",
    en: "Regional planning register under construction, not all development plans included; the Stuttgart administrative region is missing so far (City of Stuttgart via its own service).",
  },
  async abfrage(lat, lon, sprache) {
    const t = zweisprachig(sprache);
    const p: Punkt = [lon, lat];
    const url = `${AROK_WFS}?SERVICE=WFS&VERSION=2.0.0&REQUEST=GetFeature&TYPENAMES=arok-bpl:bplgelt&COUNT=50&OUTPUTFORMAT=${encodeURIComponent("application/geo+json")}&SRSNAME=urn:ogc:def:crs:EPSG::4326&BBOX=${bboxBreiteLaenge(p, 1)}`;
    try {
      const treffer: PlanTreffer[] = [];
      for (const f of geoJsonObjekte(await holeJson(url))) {
        const x = f.properties ?? {};
        // arokstatus 0 = Rechtsbestand; 2 = eingeleitetes Verfahren
        if (String(x.arokstatus ?? "0") !== "0") continue;
        const g = umrechnen(f.geometry, LON_LAT);
        if (g && !liegtIn(p, g)) continue;
        const quelle = wert(x.quelle) ?? "";
        const nummer = /Nr\.?\s*(.+)$/.exec(quelle)?.[1] ?? quelle;
        const art = AROK_ART[String(x.art ?? "")];
        treffer.push({
          nummer: nummer || "?",
          name: [wert(x.bezeich), wert(x.ars_t)].filter(Boolean).join(", "),
          rechtsverbindlichSeit: datumText(x.inkraft, sprache),
          baunvo: wert(x.fassung_t),
          vorhabenbezogen: String(x.art ?? "") === "50",
          verfahren: art ? t(...art) : undefined,
          umriss: umrissVon(p, g, 300),
        });
      }
      return { status: "ok", treffer };
    } catch (e) {
      return fehlerErgebnis("bplan", "Raumordnungskataster BW", e, sprache);
    }
  },
};

// --- B-Pläne: Stuttgart ---

const STGT_WFS = "https://geodienste.komm.one/ows/services/org.152.b5d3e01f-2ed2-4ee4-b33f-7b80993045a0_wfs";

/** Verweise der Stuttgarter Daten: JSON-Text mit XP_SpezExterneReferenz-Objekten */
function stuttgartLink(text: unknown): string | undefined {
  try {
    const liste = JSON.parse(String(text ?? "[]")) as { XP_SpezExterneReferenz?: { referenzURL?: string; referenzMimeType?: string; typ?: string } }[];
    const refs = liste.map((r) => r.XP_SpezExterneReferenz).filter((r) => webLink(r?.referenzURL));
    return (refs.find((r) => r?.referenzMimeType === "application/pdf") ?? refs.find((r) => r?.typ === "1030") ?? refs[0])?.referenzURL;
  } catch {
    return undefined;
  }
}

export const stuttgartBplan: BplanDienst = {
  id: "bw-stuttgart-bplan",
  quelle: "Landeshauptstadt Stuttgart: Bebauungspläne im XPlanung-Format (WFS über Komm.ONE)",
  viewer: "https://gis6.stuttgart.de/maps/index.html?embed=0&path=/Bebauungsplan",
  gebiet: { land: "Baden-Württemberg", gemeinde: "Stuttgart" },
  // Metadaten (968866ab-a4b2-48c0-9ab6-740c000598e1): "WFS-Dienst mit allen in XPlanung 5.0 vorhandenen Bebauungsplänen der
  // Stadt Stuttgart" – also alle bereits ins XPlanung-Format überführten, nicht ausdrücklich alle Pläne.
  vollstaendig: false,
  browser: true,
  abdeckung: {
    de: "Alle bereits ins XPlanung-Format überführten Bebauungspläne der Stadt Stuttgart. Ob das alle Pläne sind, sagt der Dienst nicht. Stellplatzsatzungen (örtliche Bauvorschriften) werden nicht als Bebauungsplan gezählt.",
    en: "All development plans of the City of Stuttgart already converted to XPlanung. The service does not say whether these are all plans. Parking statutes (local building regulations) are not counted as development plans.",
  },
  async abfrage(lat, lon, sprache) {
    const p: Punkt = [lon, lat];
    const url = `${STGT_WFS}?SERVICE=WFS&VERSION=2.0.0&REQUEST=GetFeature&TYPENAMES=xplan:BP_Plan&COUNT=100&OUTPUTFORMAT=${encodeURIComponent("application/geo+json")}&SRSNAME=urn:ogc:def:crs:EPSG::4326&BBOX=${bboxBreiteLaenge(p, 1)}`;
    try {
      const heute = new Date().toISOString().slice(0, 10);
      const treffer: PlanTreffer[] = [];
      for (const f of geoJsonObjekte(await holeJson(url))) {
        const x = f.properties ?? {};
        const stand = String(x.rechtsstand ?? "");
        const inkraft = wert(x.inkrafttretensDatum);
        if (!/in kraft getreten|^4000$|^4500$|untergegangen/i.test(stand) && !(inkraft && inkraft <= heute)) continue;
        // planArt teils als Code: 4000 ff. Satzungen nach § 34/35 BauGB, 7000 örtliche Bauvorschrift
        if (/^(4000|40000|40001|40002|5000|7000)$/.test(String(x.planArt ?? ""))) continue;
        // Kfz-Stellplatzsatzungen sind örtliche Bauvorschriften (§ 74 LBO), auch wenn der Dienst sie als B-Plan führt
        if (/stellplatzsatzung/i.test(String(x.name ?? ""))) continue;
        const g = umrechnen(f.geometry, LON_LAT);
        if (g && !liegtIn(p, g)) continue;
        treffer.push({
          nummer: wert(x.nummer) ?? "?",
          name: wert(x.name) ?? "",
          rechtsverbindlichSeit: datumText(inkraft, sprache),
          vorhabenbezogen: x.durchfuehrungsVertrag === true || /vorhaben/i.test(String(x.planArt ?? "")),
          link: stuttgartLink(x.externeReferenz),
          umriss: umrissVon(p, g, 300),
        });
      }
      return { status: "ok", treffer };
    } catch (e) {
      return fehlerErgebnis("bplan", "Bebauungspläne Stuttgart", e, sprache);
    }
  },
};

// --- Denkmale ---

const LAD = "https://owsproxy.lgl-bw.de/owsproxy/wfs";
const LAD_EBENEN: { dienst: string; typ: string; de: string; en: string; gruppe: boolean }[] = [
  { dienst: "WFS_LAD_Kulturdenkmale_Bau_Kunstdenkmalpflege", typ: "v_bau_kunstdenkmalpflege_kulturdenkmale", de: "Bau- und Kunstdenkmal", en: "Listed building or monument", gruppe: false },
  { dienst: "WFS_LAD_Kulturdenkmale_Bau_Kunstdenkmalpflege", typ: "v_bau_kunstdenkmalpflege_gesamtanlagen", de: "Gesamtanlage", en: "Protected ensemble (Gesamtanlage)", gruppe: true },
  { dienst: "WFS_LAD_Archaeologische_Kulturdenkmale_BW", typ: "v_archaeologie_kulturdenkmale", de: "Archäologisches Kulturdenkmal", en: "Archaeological monument", gruppe: false },
];

export const bwDenkmal: DenkmalDienst = {
  id: "bw-denkmal",
  quelle: "Landesamt für Denkmalpflege im Regierungspräsidium Stuttgart: Kulturdenkmale (www.denkmalpflege-bw.de, dl-de/by-2.0)",
  viewer: "https://www.geoportal-bw.de/",
  gebiet: { land: "Baden-Württemberg" },
  // Metadaten: "Die hier bereitgestellten Daten vermitteln eine inoffizielle Version der Liste … Sie sind daher für
  // Planungszwecke nicht geeignet!" – keine Aussage zur Vollständigkeit.
  vollstaendig: false,
  browser: true,
  abdeckung: {
    de: "Laut Landesamt eine inoffizielle Fassung der Denkmalliste, für Planungszwecke nicht geeignet; keine Aussage zur Vollständigkeit.",
    en: "According to the state office an unofficial version of the list of monuments, not suitable for planning purposes; no statement on completeness.",
  },
  async abfrage(lat, lon, radiusM, sprache) {
    const t = zweisprachig(sprache);
    const p: Punkt = [lon, lat];
    const bbox = bboxBreiteLaenge(p, radiusM + 10);
    // je Ebene eine Anfrage (der Dienst verbindet keine Objektarten); Ausgabe in EPSG:25832, weil WGS84 auf 4 Stellen gerundet wird
    const anfrage = (e: (typeof LAD_EBENEN)[number]) =>
      holeJson(`${LAD}/${e.dienst}?SERVICE=WFS&VERSION=2.0.0&REQUEST=GetFeature&TYPENAMES=${e.typ}&COUNT=100&OUTPUTFORMAT=application/json&SRSNAME=EPSG:25832&BBOX=${bbox}`, 12000);
    try {
      const antworten = await Promise.all(LAD_EBENEN.map(anfrage));
      const roh: DenkmalRoh[] = antworten.flatMap((a, i) => {
        const e = LAD_EBENEN[i];
        return geoJsonObjekte(a).map((f) => {
          const x = f.properties ?? {};
          const info = wert(x.info)?.replace(/\r/g, " ");
          // "info" beginnt mit der Bezeichnung, z. B. "Münster Unserer Lieben Frau, ev. Stadtpfarrkirche, …"
          const name = wert(x.name) ?? gekuerzt(info?.split(/[;,]\s/)[0], 100) ?? t(e.de, e.en);
          return {
            name,
            ausweisung: t(e.de, e.en),
            beschreibung: gekuerzt(info),
            gruppe: e.gruppe,
            geometrie: umrechnen(f.geometry, UTM(32)),
            schluessel: wert(x.objektid) ? `${e.typ}:${x.objektid}` : undefined,
          };
        });
      });
      return { status: "ok", treffer: denkmaleImUmkreis(p, radiusM, roh) };
    } catch (e) {
      return fehlerErgebnis("denkmal", "Kulturdenkmale Baden-Württemberg", e, sprache);
    }
  },
};

// --- B-Pläne: Stadt Freiburg im Breisgau (Prüfung 18.11.2026) ---
// WFS "Geltungsbereiche der rechtskräftigen Bebauungspläne", Fees: "Dieser Datensatz/Dienst kann gemäß der 'Datenlizenz
// Deutschland - Namensnennung - Version 2.0' … genutzt werden. 'Datengrundlage: Stadt Freiburg, www.freiburg.de'"
// (GDI-DE e1ce9975-…). Access-Control-Allow-Origin: *. Nur status_enm "in Kraft" zählt.
export const freiburgBplan = geojsonBplan({
  id: "bw-freiburg-bplan",
  quelle: "Stadt Freiburg im Breisgau: Geltungsbereiche der rechtskräftigen Bebauungspläne (WFS, dl-de/by-2.0, Datengrundlage: Stadt Freiburg)",
  viewer: "https://geoportal.freiburg.de/freigis/",
  gebiet: { land: "Baden-Württemberg", gemeinde: "Freiburg im Breisgau" },
  vollstaendig: false,
  browser: true,
  abdeckung: {
    de: "Geltungsbereiche der rechtskräftigen Bebauungspläne der Stadt Freiburg mit Link zur Planansicht; eine ausdrückliche Aussage zur Vollständigkeit fehlt.",
    en: "Areas of the legally binding development plans of the City of Freiburg with a link to the plan view; there is no explicit statement on completeness.",
  },
  url: (p) =>
    `https://geoportal.freiburg.de/wfs/stpla_bplan/wfs_mapfile/geltungsbereiche?SERVICE=WFS&VERSION=2.0.0&REQUEST=GetFeature&TYPENAMES=ms:geltungsbereiche&COUNT=50&OUTPUTFORMAT=${encodeURIComponent("application/json; subtype=geojson; charset=utf-8")}&SRSNAME=EPSG:4326&BBOX=${bboxBreiteLaenge(p, 2)}`,
  fehlerName: "Bebauungspläne Freiburg",
  zuPlan: (x, sprache) => {
    if (wert(x.status_enm) !== "in Kraft") return null;
    const vorhaben = wert(x.is_vorhabenbplan) === "true";
    return {
      nummer: wert(x.nummer) ?? wert(x.plannr) ?? "",
      name: wert(x.planbez) ?? "",
      vorhabenbezogen: vorhaben,
      verfahren: vorhaben ? (sprache === "en" ? "project-related development plan" : "vorhabenbezogener Bebauungsplan") : undefined,
      link: webLink(x.plan_laden),
    };
  },
});
