// Gemeinsamer Baustein für B-Plan-Dienste der XPlanung-Plattformen (deegree "XPlanSynWFS" bzw. XPlanWFS):
// Bremen, Sachsen-Anhalt, Schleswig-Holstein. Gleiche Feldnamen (planArtWert, rechtsstandWert, inkrafttretensDatum …).
// Nur Pläne, die nach dem Dienst in Kraft sind (Rechtsstand "in Kraft getreten"/"teilweise untergegangen" oder ein
// Inkrafttretensdatum in der Vergangenheit), und nur Bebauungspläne – keine Satzungen nach § 34/35 BauGB, keine
// örtlichen Bauvorschriften.
import { holeJson } from "../abruf";
import { type Sprache, zweisprachig } from "../../sprache";
import { bboxBreiteLaenge, datumText, fehlerErgebnis, gekuerzt, geoJsonObjekte, liegtIn, LON_LAT, umrechnen, umrissVon, wert, type Punkt } from "./hilfen";
import type { DienstErgebnis, PlanTreffer } from "./typen";

const IN_KRAFT = /^(InkraftGetreten|TeilweiseUntergegangen|4000|4500)$/i;
const KEIN_BPLAN = /satzung|bauvorschrift|^(4000|40000|40001|40002|5000|7000)$/i;

const VERFAHREN: Record<string, [string, string]> = {
  Parag13: ["vereinfachtes Verfahren (§ 13 BauGB)", "simplified procedure (§ 13 BauGB)"],
  Parag13a: ["beschleunigtes Verfahren (§ 13a BauGB)", "accelerated procedure (§ 13a BauGB)"],
  Parag13b: ["Verfahren nach § 13b BauGB", "procedure under § 13b BauGB"],
};

const PLANART: Record<string, [string, string]> = {
  EinfacherBPlan: ["einfacher Bebauungsplan", "simple development plan"],
  QualifizierterBPlan: ["qualifizierter Bebauungsplan", "qualified development plan"],
  VorhabenbezogenerBPlan: ["vorhabenbezogener Bebauungsplan", "project-related development plan"],
  VorhabenUndErschliessungsplan: ["Vorhaben- und Erschließungsplan", "project and development plan"],
  BebauungsplanZurWohnraumversorgung: ["Bebauungsplan zur Wohnraumversorgung", "development plan for housing supply"],
};

/** Verweise im Format "[URL | Art][URL | Art]" */
export function referenzen(text: unknown): { url: string; art: string }[] {
  const aus: { url: string; art: string }[] = [];
  for (const m of String(text ?? "").matchAll(/\[\s*([^|\]]*?)\s*\|\s*([^\]]*?)\s*\]/g)) if (/^https?:\/\//i.test(m[1])) aus.push({ url: m[1], art: m[2] });
  return aus;
}

/** Bevorzugt den rechtsverbindlichen Plan, sonst die Planzeichnung, sonst die Informationsseite */
function hauptLink(text: unknown): string | undefined {
  const refs = referenzen(text);
  return (
    refs.find((r) => /rechtsplan|rechtsverbindlich|urkunde/i.test(r.art)) ??
    refs.find((r) => /plan|karte|zeichnung/i.test(r.art) && !/legende/i.test(r.art)) ??
    refs.find((r) => /informell/i.test(r.art)) ??
    refs[0]
  )?.url;
}

/** Plannamen wie "Schlachthof_150030000000_Magdeburg_BP_223-1" lesbar machen */
const lesbarerName = (name: string) => (/_\d{12}_/.test(name) ? name.split("_")[0] : name).replace(/_/g, " ");

/** Namensraum der XPlanSyn-Dienste (deegree) */
export const XPLANSYN = "http://www.deegree.org/xplanung/1/0";

export interface XplanOptionen {
  /** WFS-Endpunkt (ohne Parameter) */
  wfs: string;
  /** Kurzname für Fehlermeldungen */
  name: string;
  /** Namensraum-Angabe für "xplan:" (XPlanSynWFS braucht sie, andere XPlanWFS nicht) */
  namensraum?: string;
  /** zusätzlicher Hinweis zu einem Plan, z. B. noch anzupassender Geltungsbereich */
  hinweis?: (x: Record<string, unknown>, sprache: Sprache) => string | undefined;
}

/** B-Pläne am Punkt aus einem XPlanSyn-WFS (GeoJSON, BBOX ±1 m, danach exakte Lageprüfung) */
export async function xplanAbfrage(o: XplanOptionen, lat: number, lon: number, sprache: Sprache): Promise<DienstErgebnis<PlanTreffer>> {
  const t = zweisprachig(sprache);
  const p: Punkt = [lon, lat];
  const url =
    `${o.wfs}?SERVICE=WFS&VERSION=2.0.0&REQUEST=GetFeature&TYPENAMES=xplan:BP_Plan` +
    (o.namensraum ? `&NAMESPACES=${encodeURIComponent(`xmlns(xplan,${o.namensraum})`)}` : "") +
    "&COUNT=100" +
    `&SRSNAME=EPSG:4326&OUTPUTFORMAT=${encodeURIComponent("application/geo+json")}&BBOX=${bboxBreiteLaenge(p, 1)}`;
  try {
    const heute = new Date().toISOString().slice(0, 10);
    const gesehen = new Set<string>();
    const treffer: PlanTreffer[] = [];
    for (const f of geoJsonObjekte(await holeJson(url, 12000))) {
      const x = f.properties ?? {};
      const stand = wert(x.rechtsstandWert) ?? wert(x.rechtsstand) ?? wert(x.xpRechtsstand) ?? "";
      const inkraft = wert(x.inkrafttretensDatum);
      if (!IN_KRAFT.test(stand) && !(inkraft && inkraft.slice(0, 10) <= heute)) continue;
      const art = wert(x.planArtWert) ?? wert(x.planArt) ?? "";
      if (KEIN_BPLAN.test(art)) continue;
      const g = umrechnen(f.geometry, LON_LAT);
      if (g && !liegtIn(p, g)) continue;
      const nummer = wert(x.nummer) ?? wert(x.name) ?? "?";
      // dieselben Pläne erscheinen in manchen Diensten mehrfach (mehrere Importe)
      const schluessel = `${nummer}|${x.gemeinde ?? ""}|${inkraft ?? ""}`;
      if (gesehen.has(schluessel)) continue;
      gesehen.add(schluessel);
      const artKurz = art.replace(/\s+/g, "");
      const verfahren = [
        PLANART[artKurz] ? t(...PLANART[artKurz]) : undefined,
        VERFAHREN[wert(x.verfahrenWert) ?? ""] ? t(...VERFAHREN[wert(x.verfahrenWert)!]) : undefined,
        /TeilweiseUntergegangen|4500/i.test(stand) ? t("teilweise außer Kraft", "partly no longer in force") : undefined,
        o.hinweis?.(x, sprache),
      ].filter(Boolean);
      treffer.push({
        nummer,
        name: gekuerzt(lesbarerName(wert(x.name) ?? "") || wert(x.beschreibung), 160) ?? "",
        rechtsverbindlichSeit: datumText(inkraft, sprache),
        vorhabenbezogen: /vorhaben/i.test(art),
        verfahren: verfahren.join(" · ") || undefined,
        link: hauptLink(x.externeReferenz),
        umriss: umrissVon(p, g, 300),
      });
    }
    return { status: "ok", treffer };
  } catch (e) {
    return fehlerErgebnis("bplan", o.name, e, sprache);
  }
}
