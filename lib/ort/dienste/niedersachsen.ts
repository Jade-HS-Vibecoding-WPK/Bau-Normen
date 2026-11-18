// Niedersachsen: vorhandene Dienste (Stadt Oldenburg, Denkmalatlas) als einheitliche Dienste verpackt – ohne sie zu ändern.
// Einen landesweiten B-Plan-Dienst gibt es nicht (PlanDigital Niedersachsen enthält nur RROP und F-Pläne).
// Hannover: Bebauungspläne nur im sitzungsgebundenen Kartenviewer, kein offener Dienst.
// Braunschweig: ArcGIS-Dienst vorhanden, aber die Rechtlichen Hinweise der Stadt untersagen die Verwendung der Geodaten
// auf anderen Internetseiten – deshalb nicht angebunden.
//
// Ostfriesische Inseln (geprüft 17.11.2026):
//  - Borkum: Landkreis Leer, ArcGIS-Dienst "www_Bauleitplanung" (alle Gemeinden des Kreises) – angebunden
//  - Juist, Norderney, Baltrum: Landkreis Aurich, ArcGIS-Dienst "Planung/Bauleitplanung" (alle Gemeinden) – angebunden
//  - Langeoog, Spiekeroog (Landkreis Wittmund): die frühere ArcGIS-Online-App "Bauleitplanung öffentlich" ist nicht mehr
//    erreichbar ("Subscription is canceled"), kein anderer offener Dienst gefunden – nur PDFs auf den Gemeindeseiten
//  - Wangerooge (Landkreis Friesland): Datensatz "Bebauungspläne im Landkreis Friesland" nur als Metadaten (NUMIS), ohne Dienst
import { BPLAN_QUELLE, BPLAN_VIEWER, bplaeneAmPunkt } from "../bplan";
import { DENKMAL_QUELLE, DENKMAL_VIEWER, denkmaleImUmkreis } from "../denkmal";
import { bboxBreiteLaenge, datumText, esriGeometrie, fehlerErgebnis, umrissVon, wert, webLink, type Punkt } from "./hilfen";
import { arcgisBplan, esriAmPunkt, geojsonBplan, type ZuPlan } from "./plandienste";
import type { BplanDienst, DenkmalDienst, PlanTreffer } from "./typen";

// --- Landkreis Leer (mit Borkum) ---

const LEER_EBENE = "https://gis.lkleer.de/arcgis/rest/services/www_Bauleitplanung/MapServer/0";
// PLANART im Dienst: B, BI, BQ, BE = Bebauungspläne; VB = vorhabenbezogener Bebauungsplan; V+E = Vorhaben- und
// Erschließungsplan. Nicht als Bebauungsplan gezählt: I (Abrundungs-/Innenbereichssatzung), A und S (Splittersiedlungs-/
// Außenbereichssatzung), OBV (örtliche Bauvorschrift) – Satzungen nach §§ 34, 35 BauGB bzw. Gestaltungsvorschriften.
const LEER_PLAN = new Set(["B", "BI", "BQ", "BE", "VB", "V+E"]);
const LEER_VORHABEN: Record<string, { de: string; en: string }> = {
  VB: { de: "vorhabenbezogener Bebauungsplan", en: "project-related development plan" },
  "V+E": { de: "Vorhaben- und Erschließungsplan", en: "project and development plan" },
};

export const leerBplan: BplanDienst = {
  id: "ni-leer-bplan",
  quelle: "Landkreis Leer: Bauleitplanung, Geltungsbereiche der Bebauungspläne (ArcGIS, ohne Lizenzangabe)",
  viewer: "https://lkleer.maps.arcgis.com/apps/mapviewer/index.html?webmap=e4311f176259429d970921af4cf49ab2",
  gebiet: { land: "Niedersachsen", kreis: "Landkreis Leer" },
  // 2.414 Einträge aller 19 Gemeinden des Kreises (auch Stadt Borkum: 82), jede Fassung (Urschrift, Änderungen) mit
  // Satzungs-PDF. Hinweis im Dienst: "ggf. können weitere Änderungen für Teilbereiche wirksam sein, die nicht aus den
  // Plänen ersichtlich sind" – deshalb nicht als vollständig gekennzeichnet.
  vollstaendig: false,
  browser: true, // Access-Control-Allow-Origin für jede Herkunft (geprüft 17.11.2026)
  abdeckung: {
    de: "Bebauungspläne aller Gemeinden des Landkreises Leer einschließlich Borkum, je Fassung mit Satzung als PDF; laut Dienst können weitere Änderungen für Teilbereiche wirksam sein, die nicht aus den Plänen ersichtlich sind. Ohne Datum des Inkrafttretens.",
    en: "Development plans of all municipalities in the district of Leer including Borkum, each version with the statute as PDF; according to the service, further amendments may apply to parts of an area that are not visible from the plans. No date of entry into force.",
  },
  async abfrage(lat, lon, sprache) {
    const p: Punkt = [lon, lat];
    try {
      const treffer: PlanTreffer[] = (await esriAmPunkt(LEER_EBENE, lat, lon))
        .filter(({ attributes: x }) => LEER_PLAN.has(wert(x.PLANART) ?? ""))
        .map(({ attributes: x, geometry }) => {
          // PLANNAME z. B. "Nr. 37: Zentrum" oder "Nr. 06A: Reedestraße|Boelckestraße"; mehrere Straßen mit "|" getrennt
          const roh = (wert(x.PLANNAME) ?? "").replace(/\s*\|\s*/g, " / ");
          const m = roh.match(/^Nr\.\s*([^:]+):\s*(.*)$/);
          const fassung = wert(x.FASSUNG)?.replace(/\s*\|\s*/g, ", ");
          const art = wert(x.PLANART) ?? "";
          return {
            nummer: m ? m[1].trim() : "",
            // Änderungen sind eigene Satzungen: die Fassung gehört zum Namen, damit jede einzeln erscheint
            name: [m ? m[2].trim() : roh, fassung && fassung !== "Urschrift" ? fassung : ""].filter(Boolean).join(", "),
            vorhabenbezogen: art in LEER_VORHABEN,
            verfahren: LEER_VORHABEN[art]?.[sprache],
            link: webLink(x.URKUNDE),
            umriss: umrissVon(p, esriGeometrie(geometry), 300),
          };
        });
      return { status: "ok", treffer };
    } catch (e) {
      return fehlerErgebnis("bplan", "Bauleitplanung Landkreis Leer", e, sprache);
    }
  },
};

// --- Landkreis Aurich (mit Juist, Norderney, Baltrum) ---

const AURICH_EBENE = "https://gis.landkreis-aurich.de/server/rest/services/Planung/Bauleitplanung/MapServer/1";
// ART im Dienst: Bebauungspläne (auch vorhabenbezogen, Vorhaben- u. Erschließungsplan) mit STATUS "genehmigt" zählen als
// Plan; Veränderungssperren werden getrennt gemeldet. Nicht gezählt: Innen-/Außenbereichs- und Ergänzungssatzungen,
// Siedlungssplitter und die internen Einträge ("interne Absprache", "OVG interne Absprache").
const AURICH_PLAN = new Set(["Bebauungsplan", "vorhabenbezogener Bebauungsplan", "Vorhaben- u. Erschließungsplan"]);

export const aurichBplan: BplanDienst = {
  id: "ni-aurich-bplan",
  quelle: "Landkreis Aurich: Bauleitplanung, Bebauungspläne (ArcGIS, ohne Lizenzangabe)",
  viewer: "https://gis.landkreis-aurich.de/portal/apps/instant/sidebar/index.html?appid=00403100c7f84a0eacd86771280976d2",
  gebiet: { land: "Niedersachsen", kreis: "Landkreis Aurich" },
  // 1.669 Einträge der 15 Gemeinden des Kreises (Norderney 52, Juist 18, Baltrum 16), Status "genehmigt"; ohne Plannamen,
  // Datum und Dokumente; keine Aussage zur Vollständigkeit.
  vollstaendig: false,
  browser: true, // Access-Control-Allow-Origin für jede Herkunft (geprüft 17.11.2026)
  abdeckung: {
    de: "Bebauungspläne und Veränderungssperren der Gemeinden des Landkreises Aurich einschließlich Juist, Norderney und Baltrum (Status „genehmigt“); ohne Plannamen, Datum und Plandokumente, keine Aussage zur Vollständigkeit.",
    en: "Development plans and development freezes of the municipalities in the district of Aurich including Juist, Norderney and Baltrum (status “approved”); without plan names, dates or plan documents, no statement on completeness.",
  },
  async abfrage(lat, lon, sprache) {
    const p: Punkt = [lon, lat];
    try {
      const treffer: PlanTreffer[] = [];
      for (const { attributes: x, geometry } of await esriAmPunkt(AURICH_EBENE, lat, lon)) {
        const art = wert(x.ART) ?? "";
        const gemeinde = (wert(x.Gemeinde) ?? "").replace(/,\s*(Stadt|Inselgemeinde)$/, "");
        const nummer = (wert(x.NR) ?? "").trim();
        const umriss = umrissVon(p, esriGeometrie(geometry), 300);
        if (art.startsWith("Veränderungssperre")) {
          // "Veränderungssperre (BPlan 0536)" → "zu BPlan 0536, Aurich"; die Art zeigt die Auskunft ohnehin als Etikett
          const bezug = art.replace(/^Veränderungssperre\s*/, "").replace(/^\((.*)\)$/, "zu $1");
          treffer.push({ nummer, name: [bezug, gemeinde].filter(Boolean).join(", "), vorhabenbezogen: false, sicherung: "veraenderungssperre", umriss });
        } else if (AURICH_PLAN.has(art) && wert(x.STATUS) === "genehmigt") {
          const vorhaben = art !== "Bebauungsplan";
          treffer.push({
            nummer,
            name: [sprache === "en" ? "Development plan" : "Bebauungsplan", gemeinde].filter(Boolean).join(", "),
            vorhabenbezogen: vorhaben,
            verfahren: vorhaben ? LEER_VORHABEN[art === "vorhabenbezogener Bebauungsplan" ? "VB" : "V+E"][sprache] : undefined,
            umriss,
          });
        }
      }
      return { status: "ok", treffer };
    } catch (e) {
      return fehlerErgebnis("bplan", "Bauleitplanung Landkreis Aurich", e, sprache);
    }
  },
};

/** Stadt Oldenburg – Umringe rechtsverbindlicher Bebauungspläne (ArcGIS FeatureServer, Open Data) */
export const oldenburgBplan: BplanDienst = {
  id: "ni-oldenburg-bplan",
  quelle: BPLAN_QUELLE,
  viewer: BPLAN_VIEWER,
  gebiet: { land: "Niedersachsen", gemeinde: "Oldenburg (Oldb)" },
  // Dienstbeschreibung: "Umringe der rechtsverbindlichen Bebauungspläne der Stadt Oldenburg" – eine ausdrückliche
  // Aussage zur Vollständigkeit fehlt, deshalb nicht als vollständig gekennzeichnet.
  vollstaendig: false,
  browser: true, // Access-Control-Allow-Origin: * (geprüft 17.11.2026)
  abdeckung: {
    de: "Stadtgebiet Oldenburg; die Stadt beschreibt den Dienst als „Umringe der rechtsverbindlichen Bebauungspläne“, sagt aber nicht ausdrücklich, dass er vollständig ist.",
    en: "City of Oldenburg; the city describes the service as “outlines of the legally binding development plans” but does not state explicitly that it is complete.",
  },
  async abfrage(lat, lon, sprache) {
    const r = await bplaeneAmPunkt(lat, lon, sprache);
    return r.status === "ok" ? { status: "ok", treffer: r.plaene } : r;
  },
};

/** Denkmalatlas Niedersachsen (NLD) – OGC API Features */
export const niedersachsenDenkmal: DenkmalDienst = {
  id: "ni-denkmal",
  quelle: DENKMAL_QUELLE,
  viewer: DENKMAL_VIEWER,
  gebiet: { land: "Niedersachsen" },
  // Beschreibung der API: "Das Verzeichnis befindet sich derzeit in Qualifizierung und ist nicht vollständig";
  // nicht enthalten sind obertägig nicht erhaltene archäologische Denkmale und bewegliche Denkmale.
  vollstaendig: false,
  browser: true, // Access-Control-Allow-Origin: * (geprüft 17.11.2026)
  abdeckung: {
    de: "Laut NLD noch in Qualifizierung und nicht vollständig; obertägig nicht erhaltene Bodendenkmale fehlen.",
    en: "According to the state office still being qualified and not complete; archaeological sites not visible above ground are missing.",
  },
  async abfrage(lat, lon, radiusM, sprache) {
    const r = await denkmaleImUmkreis(lat, lon, radiusM, sprache);
    return r.status === "ok" ? { status: "ok", treffer: r.denkmale } : r;
  },
};

// ---------------------------------------------------------------------------------------------
// Weitere Landkreise und Städte (Recherche und Prüfung 18.11.2026; Lizenzen aus den Metadaten im GDI-DE-Katalog bzw. im
// Dienst, CORS mit fremder Herkunft geprüft). Nur rechtskräftige Bebauungspläne zählen; Satzungen nach §§ 34, 35 BauGB,
// örtliche Bauvorschriften und Pläne in Aufstellung werden herausgefiltert. Kein Dienst erklärt sich für vollständig.
// Bewusst NICHT angebunden: Stadt Osnabrück (kein Rechtsstand im Dienst, überwiegend "digital Arbeitsplan", Metadaten
// widersprüchlich: dl-de/by-2.0 und zugleich "Lesen für Infozwecke"), Stadt Hameln und LK Cuxhaven (keine Lizenz).

/** XPlanung-Planart: Bebauungspläne (1000 BPlan, 10000 einfach, 10001 qualifiziert, 10002 Wohnraumversorgung) und
 *  vorhabenbezogene (3000, 3100 Vorhaben- und Erschließungsplan); Satzungen (4000 ff., 5000), örtliche Bauvorschriften
 *  (7000) und Sonstiges zählen nicht */
const XPLAN_BPLAN = new Set([1000, 10000, 10001, 10002, 3000, 3100]);
const XPLAN_VORHABEN = new Set([3000, 3100]);
/** XPlanung-Rechtsstand: 4000 in Kraft, 4500 teilweise untergegangen */
const XPLAN_IN_KRAFT = new Set([4000, 4500]);
const zahl = (x: unknown) => Number(wert(x));
/** Fassung an den Namen hängen, außer bei der Ursprungsfassung (Änderungen sind eigene Satzungen) */
const mitFassung = (name: string, fassung: unknown) => {
  const f = wert(fassung);
  return f && !/^(urschrift|ursprungsplan|urplan|original)$/i.test(f) ? `${name}, ${f}` : name;
};
const vorhabenText = (ja: boolean, sprache: "de" | "en") => (ja ? LEER_VORHABEN.VB[sprache] : undefined);

/** Landkreis Osterholz – Planmanager (dl-de/by-2.0, GDI-DE eb15f842-…) */
export const osterholzBplan = arcgisBplan({
  id: "ni-osterholz-bplan",
  quelle: "Landkreis Osterholz: Geltungsbereiche der Bebauungspläne (ArcGIS, dl-de/by-2.0)",
  viewer: "https://experience.arcgis.com/experience/9dc95fc7755647028454e5f45b38adfb",
  gebiet: { land: "Niedersachsen", kreis: "Landkreis Osterholz" },
  vollstaendig: false,
  browser: true,
  abdeckung: {
    de: "Bebauungspläne aller Gemeinden des Landkreises Osterholz mit Satzung als PDF; laut Landkreis ohne Gewähr für Vollständigkeit.",
    en: "Development plans of all municipalities in the district of Osterholz with the statute as PDF; no guarantee of completeness according to the district.",
  },
  ebene: "https://gis.landkreis-osterholz.de/arcgis/rest/services/www/BPlanWWW/MapServer/0",
  fehlerName: "Bebauungspläne Landkreis Osterholz",
  // STAND: "Rechtskräftig" / "In Aufstellung befindlich"; PLANART: B, VB
  zuPlan: (x, sprache) =>
    wert(x.STAND) === "Rechtskräftig" && ["B", "VB"].includes(wert(x.PLANART) ?? "")
      ? {
          nummer: "",
          name: wert(x.PLANNAME) ?? "",
          rechtsverbindlichSeit: datumText(x.INKRAFT, sprache),
          baunvo: wert(x.BAUNVONUM),
          vorhabenbezogen: wert(x.PLANART) === "VB",
          verfahren: vorhabenText(wert(x.PLANART) === "VB", sprache),
          link: webLink(x.URKUNDE),
        }
      : null,
});

/** Landkreis Rotenburg (Wümme) – liefert keine Geometrie, nur die Treffer am Punkt (dl-de/zero-2.0, GDI-DE 0b49ff48-…) */
export const rotenburgBplan = arcgisBplan({
  id: "ni-rotenburg-bplan",
  quelle: "Landkreis Rotenburg (Wümme): Geltungsbereiche der Bebauungspläne (ArcGIS, dl-de/zero-2.0)",
  gebiet: { land: "Niedersachsen", kreis: "Landkreis Rotenburg (Wümme)" },
  vollstaendig: false,
  browser: true,
  abdeckung: {
    de: "Gültige und rechtskräftige Bebauungspläne der Gemeinden des Landkreises Rotenburg (Wümme), mit Satzung als PDF; der Dienst liefert keine Umrisse für die Lageskizze.",
    en: "Valid, legally binding development plans of the municipalities in the district of Rotenburg (Wümme), with the statute as PDF; the service provides no outlines for the site map.",
  },
  ebene: "https://gis.lk-row.de/server/rest/services/Geoportal_BPlaene_LKROW_WFS/MapServer/8",
  fehlerName: "Bebauungspläne Landkreis Rotenburg (Wümme)",
  zuPlan: (x, sprache) => {
    const art = zahl(x.PLANART);
    if (!XPLAN_BPLAN.has(art)) return null;
    const aenderung = wert(x.AENDERUNG);
    return {
      nummer: wert(x.NUMMER) ?? "",
      name: `${wert(x.NAME) ?? ""}${aenderung && aenderung !== "0" ? `, ${aenderung}. Änderung` : ""}`,
      rechtsverbindlichSeit: datumText(x.RECHTSDATUM, sprache),
      vorhabenbezogen: XPLAN_VORHABEN.has(art),
      verfahren: vorhabenText(XPLAN_VORHABEN.has(art), sprache),
      link: webLink(x.RECHTSURL_I),
    };
  },
});

/** Landkreis Stade – ohne Hansestadt Stade und Buxtehude (dl-de/by-2.0, ArcGIS-Item aa56a135…) */
export const stadeBplan = arcgisBplan({
  id: "ni-stade-bplan",
  quelle: "Landkreis Stade: Bebauungspläne (ArcGIS Online, dl-de/by-2.0)",
  gebiet: { land: "Niedersachsen", kreis: "Landkreis Stade" },
  vollstaendig: false,
  browser: true,
  abdeckung: {
    de: "Bebauungspläne der Gemeinden des Landkreises Stade mit Planzeichnung als PDF; laut Landkreis fehlen die Pläne der Hansestädte Stade und Buxtehude ganz oder teilweise.",
    en: "Development plans of the municipalities in the district of Stade with plan drawing as PDF; according to the district, plans of the Hanseatic towns of Stade and Buxtehude are missing entirely or in part.",
  },
  ebene: "https://services1.arcgis.com/gj4UKoDigJC9AuBF/arcgis/rest/services/Bebauungsplaene/FeatureServer/0",
  fehlerName: "Bebauungspläne Landkreis Stade",
  // AGO_Kategorie: Bebauungsplan, Satzung, Vorhaben- und Erschließungsplan, Aufbauplan, Veränderungssperre
  zuPlan: (x, sprache) => {
    const kat = wert(x.AGO_Kategorie) ?? "";
    const typ = wert(x.TYP) ?? "";
    const aenderung = typ.match(/(\d+)\.\s*Änderung/i);
    const name = `${wert(x.LANGNAME) ?? ""}${aenderung ? `, ${aenderung[1]}. Änderung` : ""}`;
    if (kat === "Veränderungssperre") return { nummer: wert(x.Plannummer) ?? "", name, vorhabenbezogen: false, sicherung: "veraenderungssperre" };
    if (kat !== "Bebauungsplan" && kat !== "Vorhaben- und Erschließungsplan") return null;
    const vorhaben = /vorhaben/i.test(`${kat} ${typ}`);
    return {
      nummer: wert(x.Plannummer) ?? "",
      name,
      vorhabenbezogen: vorhaben,
      verfahren: vorhaben ? (kat === "Vorhaben- und Erschließungsplan" ? LEER_VORHABEN["V+E"] : LEER_VORHABEN.VB)[sprache] : undefined,
      link: webLink(x.PDF_PlanZ),
    };
  },
});

/** Landkreis Nienburg/Weser – XPlanung-Felder (dl-de/zero-2.0, GDI-DE b196a83b-…) */
export const nienburgBplan = arcgisBplan({
  id: "ni-nienburg-bplan",
  quelle: "Landkreis Nienburg/Weser: Bebauungspläne (XPlanung, ArcGIS, dl-de/zero-2.0)",
  gebiet: { land: "Niedersachsen", kreis: "Landkreis Nienburg/Weser" },
  vollstaendig: false,
  browser: true,
  abdeckung: {
    de: "Bebauungspläne der Gemeinden des Landkreises Nienburg/Weser im XPlanung-Format (Rechtsstand „in Kraft“), mit Plan als Datei; keine Aussage zur Vollständigkeit.",
    en: "Development plans of the municipalities in the district of Nienburg/Weser in XPlanung format (legal status “in force”), with the plan as a file; no statement on completeness.",
  },
  ebene: "https://geoportal.lk-ni.de/server/rest/services/opengov/BPlaene_sonstigePlaene/MapServer/68",
  fehlerName: "Bebauungspläne Landkreis Nienburg/Weser",
  zuPlan: (x, sprache) => {
    const art = zahl(x.planArt);
    if (!XPLAN_BPLAN.has(art) || !XPLAN_IN_KRAFT.has(zahl(x.rechtsstand))) return null;
    return {
      nummer: wert(x.nummer) ?? "",
      name: wert(x.name) ?? "",
      rechtsverbindlichSeit: datumText(x.inkrafttretensDatum, sprache),
      vorhabenbezogen: XPLAN_VORHABEN.has(art),
      verfahren: vorhabenText(XPLAN_VORHABEN.has(art), sprache),
      link: webLink(x.refRechtsplan),
    };
  },
});

/** Landkreis Diepholz – Planauskunft aller Kommunen (dl-de/by-2.0, GDI-DE 166b16f9-…) */
export const diepholzBplan = arcgisBplan({
  id: "ni-diepholz-bplan",
  quelle: "Landkreis Diepholz: Planauskunft, rechtskräftige Bebauungspläne (ArcGIS, dl-de/by-2.0)",
  gebiet: { land: "Niedersachsen", kreis: "Landkreis Diepholz" },
  vollstaendig: false,
  browser: true,
  abdeckung: {
    de: "Geltungsbereiche der rechtskräftigen Bebauungspläne aller Kommunen im Landkreis Diepholz; Satzungs-PDF nur teilweise.",
    en: "Areas of the legally binding development plans of all municipalities in the district of Diepholz; statute PDFs only in part.",
  },
  ebene: "https://geo.diepholz.de/arcgis/rest/services/Download/Planauskunft_Download_AGO/MapServer/1",
  fehlerName: "Planauskunft Landkreis Diepholz",
  zuPlan: (x, sprache) =>
    wert(x.STAND) === "rechtskräftig" && wert(x.PLANART) === "B"
      ? {
          nummer: "",
          name: mitFassung(wert(x.PLANNAME) ?? "", x.FASSUNG),
          rechtsverbindlichSeit: datumText(x.INKRAFT, sprache),
          baunvo: wert(x.BAUNVONUM),
          vorhabenbezogen: false,
          link: webLink(x.URKUNDE),
        }
      : null,
});

/** Landkreis Harburg – nur über den Server nutzbar: Die CORS-Kopfzeile ist falsch geschrieben ("Access-Control-AllowOrigin"),
 *  Browser ignorieren sie (dl-de/zero-2.0, GDI-DE 163c95e8-…) */
export const harburgBplan = arcgisBplan({
  id: "ni-harburg-bplan",
  quelle: "Landkreis Harburg: Bebauungspläne (ArcGIS, dl-de/zero-2.0)",
  gebiet: { land: "Niedersachsen", kreis: "Landkreis Harburg" },
  vollstaendig: false,
  browser: false,
  abdeckung: {
    de: "Bebauungspläne der Gemeinden des Landkreises Harburg mit Planzeichnung als PDF; laut Landkreis ohne Gewähr für Vollständigkeit. In der Online-Version nicht abrufbar (technische Sperre des Dienstes).",
    en: "Development plans of the municipalities in the district of Harburg with plan drawing as PDF; no guarantee of completeness according to the district. Not available in the online version (technical restriction of the service).",
  },
  ebene: "https://gis.itk-harburg.de/arcgis/rest/services/WMS/LKHarburg_Bebauungsplan/MapServer/0",
  fehlerName: "Bebauungspläne Landkreis Harburg",
  zuPlan: (x, sprache) => {
    const art = zahl(x.PLANART);
    if (!XPLAN_BPLAN.has(art)) return null;
    return {
      nummer: "",
      name: wert(x.NAME) ?? "",
      rechtsverbindlichSeit: datumText(x.RECHTSKRAFT, sprache),
      vorhabenbezogen: XPLAN_VORHABEN.has(art),
      verfahren: vorhabenText(XPLAN_VORHABEN.has(art), sprache),
      link: webLink(x.PLANZEICHNUNG),
    };
  },
});

/** Landkreis Hameln-Pyrmont – 7 Gemeinden ohne Stadt Hameln (CC BY-SA 4.0, GDI-DE 2db8a6e9-…) */
export const hamelnPyrmontBplan = arcgisBplan({
  id: "ni-hameln-pyrmont-bplan",
  quelle: "Landkreis Hameln-Pyrmont: Planauskunft, Bebauungspläne (ArcGIS, CC BY-SA 4.0)",
  gebiet: { land: "Niedersachsen", kreis: "Landkreis Hameln-Pyrmont" },
  vollstaendig: false,
  browser: true,
  abdeckung: {
    de: "Bebauungspläne der Gemeinden des Landkreises Hameln-Pyrmont ohne die Stadt Hameln; keine Aussage zur Vollständigkeit.",
    en: "Development plans of the municipalities in the district of Hameln-Pyrmont excluding the town of Hameln; no statement on completeness.",
  },
  ebene: "https://gis.hameln-pyrmont.de/arcgis/rest/services/public/Planauskunft2021/MapServer/2",
  fehlerName: "Planauskunft Landkreis Hameln-Pyrmont",
  // BPRECHTSSTAND: XPlanung-Rechtsstand; PLANART wie im Landkreis Leer (B, BI, BQ, BE, VB, V+E)
  zuPlan: (x, sprache) => {
    const art = wert(x.PLANART) ?? "";
    if (!LEER_PLAN.has(art) || !XPLAN_IN_KRAFT.has(zahl(x.BPRECHTSSTAND))) return null;
    return {
      nummer: "",
      name: mitFassung(wert(x.PLANNAME) ?? "", x.FASSUNG),
      rechtsverbindlichSeit: datumText(x.INKRAFT, sprache),
      vorhabenbezogen: art in LEER_VORHABEN,
      verfahren: LEER_VORHABEN[art]?.[sprache],
    };
  },
});

/** Stadt Göttingen – INSPIRE-Bebauungspläne (dl-de/by-2.0, GDI-DE d22ef753-…) */
export const goettingenBplan = arcgisBplan({
  id: "ni-goettingen-bplan",
  quelle: "Stadt Göttingen: Bebauungspläne (INSPIRE, ArcGIS, dl-de/by-2.0)",
  viewer: "https://geoportal.goettingen.de/",
  gebiet: { land: "Niedersachsen", gemeinde: "Göttingen" },
  vollstaendig: false,
  browser: true,
  abdeckung: {
    de: "Umringe der gültigen und rechtskräftigen Bebauungspläne der Stadt Göttingen mit Plan als PDF; eine ausdrückliche Aussage zur Vollständigkeit fehlt.",
    en: "Outlines of the valid, legally binding development plans of the City of Göttingen with plan as PDF; there is no explicit statement on completeness.",
  },
  ebene: "https://geoportal.goettingen.de/arcgis/rest/services/Inspire/Inspire_Internet/MapServer/0",
  fehlerName: "Bebauungspläne Stadt Göttingen",
  zuPlan: (x, sprache) =>
    wert(x.STAND) === "rechtskräftig" && ["B", "VB"].includes(wert(x.PLANART) ?? "")
      ? {
          nummer: wert(x.PLAN_NR) ?? "",
          name: wert(x.officialTitle) ?? wert(x.Bezeichnung) ?? "",
          rechtsverbindlichSeit: datumText(x.validFrom, sprache),
          baunvo: wert(x.BAUNVONUM),
          vorhabenbezogen: wert(x.PLANART) === "VB",
          verfahren: vorhabenText(wert(x.PLANART) === "VB", sprache),
          link: webLink(x.planDocument),
        }
      : null,
});

/** INSPIRE "SpatialPlan" (WFS, GeoJSON): rechtskräftig = processStepGeneral legalForce; Bebauungspläne = Plantyp 6_… */
const inspireBplan: ZuPlan = (x, sprache) => {
  const schritt = JSON.stringify(x.processStepGeneral ?? "");
  const typ = JSON.stringify(x.planTypeName ?? "");
  if (!/legalForce/.test(schritt) || !/PlanTypeNameValue\/6_/.test(typ)) return null;
  return {
    nummer: "",
    name: wert(x.officialTitle) ?? wert(x.alternativeTitle) ?? "",
    rechtsverbindlichSeit: datumText(x.validFrom, sprache),
    vorhabenbezogen: /vorhabenbezogen/i.test(typ),
    verfahren: vorhabenText(/vorhabenbezogen/i.test(typ), sprache),
  };
};
const inspireUrl = (dienst: string) => (p: Punkt) =>
  `${dienst}?SERVICE=WFS&VERSION=2.0.0&REQUEST=GetFeature&TYPENAMES=plu:SpatialPlan&COUNT=50&OUTPUTFORMAT=${encodeURIComponent("application/geo+json")}&SRSNAME=EPSG:4326&BBOX=${bboxBreiteLaenge(p, 2)}`;

/** Stadt Hildesheim – INSPIRE-WFS aus XPlanung (dl-de/by-2.0, Rechteinhaber Stadt Hildesheim) */
export const hildesheimBplan = geojsonBplan({
  id: "ni-hildesheim-bplan",
  quelle: "Stadt Hildesheim: Bebauungspläne (INSPIRE-WFS, dl-de/by-2.0)",
  gebiet: { land: "Niedersachsen", gemeinde: "Hildesheim" },
  vollstaendig: false,
  browser: true,
  abdeckung: {
    de: "Alle in das INSPIRE-Schema überführten Bebauungspläne der Stadt Hildesheim (aus XPlanung); keine Aussage zur Vollständigkeit.",
    en: "All development plans of the City of Hildesheim transferred to the INSPIRE schema (from XPlanung); no statement on completeness.",
  },
  url: inspireUrl("https://services.gdi.stadt-hildesheim.de/ows/services/org.2.75925358-79cc-4fa7-81de-bc9f0adcda9f_wfs"),
  fehlerName: "Bebauungspläne Stadt Hildesheim",
  zuPlan: inspireBplan,
});

/** Stadt Langenhagen (Region Hannover) – INSPIRE-WFS über KDO govconnect (CC BY 4.0) */
export const langenhagenBplan = geojsonBplan({
  id: "ni-langenhagen-bplan",
  quelle: "Stadt Langenhagen: Bebauungspläne (INSPIRE-WFS, CC BY 4.0, geodaten.langenhagen.de)",
  gebiet: { land: "Niedersachsen", gemeinde: "Langenhagen" },
  vollstaendig: false,
  browser: true,
  abdeckung: {
    de: "Bebauungspläne der Stadt Langenhagen im INSPIRE-Schema; keine Aussage zur Vollständigkeit.",
    en: "Development plans of the City of Langenhagen in the INSPIRE schema; no statement on completeness.",
  },
  url: inspireUrl("https://inspire.govconnect.de/ows/services/org.52.b60f142d-fffa-4f86-9270-9e83e35ee1f5_wfs"),
  fehlerName: "Bebauungspläne Stadt Langenhagen",
  zuPlan: inspireBplan,
});
