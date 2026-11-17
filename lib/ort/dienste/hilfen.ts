// Gemeinsame Werkzeuge für die Dienst-Adapter der Länder und Gemeinden:
//  - kleines, abhängigkeitsfreies Lesen von XML/GML-Antworten (WFS GetFeature, WMS GetFeatureInfo)
//  - Umrechnung UTM (ETRS89, Zonen 32/33) <-> geographische Koordinaten
//  - Geometrie: Abstand, Lage im Umring, Umriss in Metern für die Lageskizze
//  - einheitliche Fehlermeldungen, Datumsangaben, Umkreis-Filter für Denkmale
// Läuft im Browser (statische Online-Version) und auf dem Server gleichermaßen – deshalb kein DOMParser.
import { DienstFehler, fehlerText } from "../abruf";
import { distanzMeter, inMeter, punktInGeometrie, type Punkt } from "../geo";
import { gebiet, type Sprache, zweisprachig } from "../../sprache";
import type { DenkmalTreffer, DienstErgebnis } from "./typen";

export type { Punkt };

/** Geometrie wie GeoJSON, Koordinaten immer [Längengrad, Breitengrad] */
export interface Geometrie {
  type: "Point" | "MultiPoint" | "LineString" | "MultiLineString" | "Polygon" | "MultiPolygon";
  coordinates: unknown;
}

/** Wandelt ein Koordinatenpaar aus der Antwort in [Längengrad, Breitengrad] um */
export type Achse = (a: number, b: number) => Punkt;
/** Paar ist bereits Länge, Breite (GeoJSON, CRS84) */
export const LON_LAT: Achse = (a, b) => [a, b];
/** Paar ist Breite, Länge (urn:ogc:def:crs:EPSG::4326 in GML) */
export const LAT_LON: Achse = (a, b) => [b, a];
/** Paar ist Rechtswert, Hochwert in UTM (ETRS89 / EPSG:25832 bzw. 25833) */
export const UTM = (zone: 32 | 33): Achse => (e, n) => utmZuWgs(e, n, zone);

// ---------------------------------------------------------------------------------------------
// Fehler und Texte

/** Einheitliches Fehlerergebnis eines Dienstes */
export function fehlerErgebnis<T>(art: "bplan" | "denkmal", quelle: string, e: unknown, sprache: Sprache): DienstErgebnis<T> {
  const t = zweisprachig(sprache);
  const wer = art === "bplan" ? t("B-Plan-Dienst", "Development plan service") : t("Denkmal-Dienst", "Monument service");
  return { status: "fehler", hinweis: `${wer} ${t(`„${quelle}“`, `“${quelle}”`)}: ${fehlerText(e, sprache)}.` };
}

/** Fehler, wenn eine Antwort nicht auswertbar ist (statt sie als „0 Treffer“ zu deuten) */
export const unlesbar = (was: string) => new DienstFehler(`Antwort nicht auswertbar (${was})`, `response not usable (${was})`);

/** Datum aus dem Dienst (ISO, "TT.MM.JJJJ" oder Millisekunden) in Landessprache; unbekannt -> undefined */
export function datumText(wert: unknown, sprache: Sprache): string | undefined {
  let d: Date | undefined;
  if (typeof wert === "number" && Number.isFinite(wert)) d = new Date(wert);
  else if (typeof wert === "string") {
    const s = wert.trim();
    let m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
    if (m) d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3], 12));
    else if ((m = /^(\d{1,2})\.(\d{1,2})\.(\d{4})/.exec(s))) d = new Date(Date.UTC(+m[3], +m[2] - 1, +m[1], 12));
  }
  if (!d || Number.isNaN(d.getTime()) || d.getUTCFullYear() < 1800) return undefined;
  return d.toLocaleDateString(gebiet(sprache), { timeZone: "Europe/Berlin", day: "2-digit", month: "2-digit", year: "numeric" });
}

/** Leere Platzhalter der Dienste ("", " ", "Null", "null", "-") als fehlend behandeln */
export function wert(x: unknown): string | undefined {
  if (x === null || x === undefined) return undefined;
  const s = String(x).replace(/\s+/g, " ").trim();
  return s && !/^(null|none|nan|-|–|unbekannt)$/i.test(s) ? s : undefined;
}

/** Nur amtliche Web-Adressen aus dem Dienst als Link übernehmen */
export const webLink = (x: unknown): string | undefined => {
  const s = wert(x);
  return s && /^https?:\/\/[^\s"<>]+$/i.test(s) ? s.replace(/^http:\/\//i, "https://") : undefined;
};

/** Doppelt kodiertes UTF-8 ("HofflÃ¤chen") reparieren – nur wenn es eindeutig danach aussieht */
export function utf8Reparatur(s: string): string {
  if (!/[ÃÂ][\u0080-¿]/.test(s) || /[^\u0000-ÿ]/.test(s)) return s;
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(Uint8Array.from(s, (c) => c.charCodeAt(0)));
  } catch {
    return s;
  }
}

const BENANNT: Record<string, string> = {
  amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ", auml: "ä", ouml: "ö", uuml: "ü", Auml: "Ä", Ouml: "Ö", Uuml: "Ü",
  szlig: "ß", eacute: "é", egrave: "è", agrave: "à", aacute: "á", acirc: "â", ecirc: "ê", ccedil: "ç", oacute: "ó", ndash: "–",
  mdash: "—", bdquo: "„", ldquo: "“", rdquo: "”", sbquo: "‚", lsquo: "‘", rsquo: "’", hellip: "…", sect: "§", deg: "°", shy: "",
};

/** XML-/HTML-Entitäten auflösen */
export function entitaeten(s: string): string {
  return s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (ganz, k: string) => {
    if (k[0] === "#") {
      const n = k[1] === "x" || k[1] === "X" ? parseInt(k.slice(2), 16) : parseInt(k.slice(1), 10);
      return Number.isFinite(n) ? String.fromCodePoint(n) : ganz;
    }
    return BENANNT[k] ?? ganz;
  });
}

/** HTML-Ausschnitt aus einem Dienst in schlichten Text umwandeln (keine Auszeichnung übernehmen) */
export function htmlZuText(s: string): string {
  return entitaeten(s.replace(/<br\s*\/?>/gi, " ").replace(/<\/(p|div|li|tr)>/gi, " ").replace(/<[^>]*>/g, ""))
    .replace(/\s+/g, " ")
    .trim();
}

/** Lange Beschreibungstexte für die Anzeige kürzen */
export function gekuerzt(s: string | undefined, max = 600): string | undefined {
  if (!s) return undefined;
  return s.length > max ? `${s.slice(0, max).replace(/\s+\S*$/, "")} …` : s;
}

// ---------------------------------------------------------------------------------------------
// UTM (ETRS89/GRS80) – Krüger-Reihen, auf Millimeter genau im Zonenbereich

const A_ACHSE = 6378137;
const ABPL = 1 / 298.257222101;
const N_ = ABPL / (2 - ABPL);
const GROSS_A = (A_ACHSE / (1 + N_)) * (1 + N_ ** 2 / 4 + N_ ** 4 / 64);
const ALPHA = [N_ / 2 - (2 * N_ ** 2) / 3 + (5 * N_ ** 3) / 16, (13 * N_ ** 2) / 48 - (3 * N_ ** 3) / 5, (61 * N_ ** 3) / 240];
const BETA = [N_ / 2 - (2 * N_ ** 2) / 3 + (37 * N_ ** 3) / 96, N_ ** 2 / 48 + N_ ** 3 / 15, (17 * N_ ** 3) / 480];
const DELTA = [2 * N_ - (2 * N_ ** 2) / 3 - 2 * N_ ** 3, (7 * N_ ** 2) / 3 - (8 * N_ ** 3) / 5, (56 * N_ ** 3) / 15];
const K0 = 0.9996;
const RAD = Math.PI / 180;

/** Geographische Koordinaten -> [Rechtswert, Hochwert] in der UTM-Zone (32 oder 33) */
export function wgsZuUtm(lon: number, lat: number, zone: 32 | 33): Punkt {
  const phi = lat * RAD;
  const dl = (lon - (zone * 6 - 183)) * RAD;
  const c = (2 * Math.sqrt(N_)) / (1 + N_);
  const t = Math.sinh(Math.atanh(Math.sin(phi)) - c * Math.atanh(c * Math.sin(phi)));
  const xi = Math.atan(t / Math.cos(dl));
  const eta = Math.atanh(Math.sin(dl) / Math.sqrt(1 + t * t));
  let e = eta;
  let n = xi;
  ALPHA.forEach((a, i) => {
    const j = 2 * (i + 1);
    e += a * Math.cos(j * xi) * Math.sinh(j * eta);
    n += a * Math.sin(j * xi) * Math.cosh(j * eta);
  });
  return [500000 + K0 * GROSS_A * e, K0 * GROSS_A * n];
}

/** [Rechtswert, Hochwert] in der UTM-Zone -> [Längengrad, Breitengrad] */
export function utmZuWgs(rechts: number, hoch: number, zone: 32 | 33): Punkt {
  const xi = hoch / (K0 * GROSS_A);
  const eta = (rechts - 500000) / (K0 * GROSS_A);
  let xs = xi;
  let es = eta;
  BETA.forEach((b, i) => {
    const j = 2 * (i + 1);
    xs -= b * Math.sin(j * xi) * Math.cosh(j * eta);
    es -= b * Math.cos(j * xi) * Math.sinh(j * eta);
  });
  const chi = Math.asin(Math.sin(xs) / Math.cosh(es));
  let phi = chi;
  DELTA.forEach((d, i) => (phi += d * Math.sin(2 * (i + 1) * chi)));
  const lon = zone * 6 - 183 + Math.atan(Math.sinh(es) / Math.cos(xs)) / RAD;
  return [lon, phi / RAD];
}

// ---------------------------------------------------------------------------------------------
// Umkreise für Abfragen

/** Rechteck um den Punkt: [minLon, minLat, maxLon, maxLat] */
export function rechteck([lon, lat]: Punkt, radiusM: number): [number, number, number, number] {
  const dLat = radiusM / 110540;
  const dLon = radiusM / (111320 * Math.cos(lat * RAD));
  return [lon - dLon, lat - dLat, lon + dLon, lat + dLat];
}

const f6 = (x: number) => x.toFixed(6);
/** BBOX-Parameter in urn:ogc:def:crs:EPSG::4326 (Achsenfolge Breite, Länge) */
export function bboxBreiteLaenge(p: Punkt, radiusM: number): string {
  const [a, b, c, d] = rechteck(p, radiusM);
  return `${f6(b)},${f6(a)},${f6(d)},${f6(c)},urn:ogc:def:crs:EPSG::4326`;
}
/** BBOX in Länge, Breite (CRS84 bzw. "EPSG:4326" mit Ost-Nord-Folge) – ohne CRS-Angabe */
export function bboxLaengeBreite(p: Punkt, radiusM: number): string {
  return rechteck(p, radiusM).map(f6).join(",");
}
/** BBOX in UTM: "minE,minN,maxE,maxN" */
export function bboxUtm([lon, lat]: Punkt, radiusM: number, zone: 32 | 33): string {
  const [e, n] = wgsZuUtm(lon, lat, zone);
  return [e - radiusM, n - radiusM, e + radiusM, n + radiusM].map((x) => x.toFixed(1)).join(",");
}

// ---------------------------------------------------------------------------------------------
// Geometrie

function segmentAbstand(p: Punkt, a: Punkt, b: Punkt, kx: number, ky: number): number {
  const ax = (a[0] - p[0]) * kx, ay = (a[1] - p[1]) * ky;
  const bx = (b[0] - p[0]) * kx, by = (b[1] - p[1]) * ky;
  const dx = bx - ax, dy = by - ay;
  const t = dx || dy ? Math.max(0, Math.min(1, -(ax * dx + ay * dy) / (dx * dx + dy * dy))) : 0;
  return Math.hypot(ax + t * dx, ay + t * dy);
}

function linienVon(g: Geometrie): Punkt[][] {
  switch (g.type) {
    case "Polygon":
    case "MultiLineString":
      return g.coordinates as Punkt[][];
    case "MultiPolygon":
      return (g.coordinates as Punkt[][][]).flat();
    case "LineString":
      return [g.coordinates as Punkt[]];
    default:
      return [];
  }
}

const punkteVon = (g: Geometrie): Punkt[] =>
  g.type === "Point" ? [g.coordinates as Punkt] : g.type === "MultiPoint" ? (g.coordinates as Punkt[]) : [];

/** Liegt der Punkt in der Fläche? (Linien und Punkte: nie) */
export const liegtIn = (p: Punkt, g: Geometrie | null | undefined): boolean => !!g && punktInGeometrie(p, g);

/** Abstand in Metern (0 = Punkt liegt in der Fläche); Punkte, Linien und Flächen */
export function abstand(p: Punkt, g: Geometrie): number {
  if (liegtIn(p, g)) return 0;
  const kx = 111320 * Math.cos(p[1] * RAD);
  const ky = 110540;
  let min = Infinity;
  for (const linie of linienVon(g)) for (let i = 0; i < linie.length - 1; i++) min = Math.min(min, segmentAbstand(p, linie[i], linie[i + 1], kx, ky));
  for (const q of punkteVon(g)) min = Math.min(min, distanzMeter(p, q));
  return min;
}

/**
 * Umriss in Metern relativ zum Standort für die Lageskizze: Flächen als äußere Ringe,
 * Linien als hin und zurück laufender Ring (wird als Strich gezeichnet), Punkte als Ein-Punkt-Ring.
 */
export function umrissVon(p: Punkt, g: Geometrie | null | undefined, maxPunkte = 120): [number, number][][] {
  if (!g) return [];
  switch (g.type) {
    case "Polygon":
      return inMeter(p, [(g.coordinates as Punkt[][])[0]], maxPunkte);
    case "MultiPolygon":
      return inMeter(p, (g.coordinates as Punkt[][][]).map((x) => x[0]), maxPunkte);
    case "LineString":
    case "MultiLineString":
      return inMeter(p, linienVon(g).map((l) => [...l, ...l.slice(0, -1).reverse()]), maxPunkte);
    default:
      return inMeter(p, punkteVon(g).map((q) => [q]), maxPunkte);
  }
}

/** Koordinaten einer GeoJSON-Geometrie umrechnen (z. B. UTM -> WGS84 oder Achsen tauschen) */
export function umrechnen(g: { type: string; coordinates: unknown } | null | undefined, achse: Achse): Geometrie | null {
  if (!g || !g.coordinates) return null;
  const tief = (x: unknown): unknown => (Array.isArray(x) && typeof x[0] === "number" ? achse(x[0], x[1] as number) : Array.isArray(x) ? x.map(tief) : x);
  const typen = ["Point", "MultiPoint", "LineString", "MultiLineString", "Polygon", "MultiPolygon"];
  return typen.includes(g.type) ? ({ type: g.type, coordinates: tief(g.coordinates) } as Geometrie) : null;
}

/** ArcGIS-REST-Geometrie (x/y, points, paths, rings) in WGS84 -> GeoJSON-artige Geometrie; Ringe nach Umlaufsinn in Außenringe und Löcher */
export function esriGeometrie(g: unknown): Geometrie | null {
  const e = g as { x?: number; y?: number; points?: Punkt[]; paths?: Punkt[][]; rings?: Punkt[][] } | null;
  if (!e) return null;
  if (typeof e.x === "number" && typeof e.y === "number") return { type: "Point", coordinates: [e.x, e.y] };
  if (e.points?.length) return { type: "MultiPoint", coordinates: e.points };
  if (e.paths?.length) return { type: "MultiLineString", coordinates: e.paths };
  if (!e.rings?.length) return null;
  const flaeche = (r: Punkt[]) => r.reduce((s, [x, y], i) => s + x * r[(i + 1) % r.length][1] - r[(i + 1) % r.length][0] * y, 0) / 2;
  // ArcGIS: Außenringe im Uhrzeigersinn (negative Fläche), Löcher gegen den Uhrzeigersinn
  const aussen = e.rings.filter((r) => flaeche(r) <= 0).map((r) => [r]);
  for (const loch of e.rings.filter((r) => flaeche(r) > 0)) {
    const ziel = aussen.find((poly) => punktInGeometrie(loch[0], { type: "Polygon", coordinates: [poly[0]] }));
    if (ziel) ziel.push(loch);
    else aussen.push([loch]);
  }
  return aussen.length === 1 ? { type: "Polygon", coordinates: aussen[0] } : { type: "MultiPolygon", coordinates: aussen };
}

/** Kreis (als Polygon) um einen Mittelpunkt – für Dienste, die eine Fläche als Mittelpunkt mit Wirkradius angeben */
export function kreis([lon, lat]: Punkt, radiusM: number, ecken = 36): Geometrie {
  const ring: Punkt[] = [];
  for (let i = 0; i <= ecken; i++) {
    const w = (2 * Math.PI * i) / ecken;
    ring.push([lon + (radiusM * Math.cos(w)) / (111320 * Math.cos(lat * RAD)), lat + (radiusM * Math.sin(w)) / 110540]);
  }
  return { type: "Polygon", coordinates: [ring] };
}

/** Rechteck (Begrenzung) als Polygon */
export function rechteckFlaeche([a, b]: [Punkt, Punkt]): Geometrie {
  return { type: "Polygon", coordinates: [[a, [b[0], a[1]], b, [a[0], b[1]], a]] };
}

// ---------------------------------------------------------------------------------------------
// Kleiner XML-Leser (nur, was WFS/WMS-Antworten brauchen)

interface XmlElement {
  name: string;
  lokal: string;
  attribute: string;
  inhalt: string;
}

function tagEnde(xml: string, start: number): number {
  let q = "";
  for (let i = start + 1; i < xml.length; i++) {
    const c = xml[i];
    if (q) {
      if (c === q) q = "";
    } else if (c === '"' || c === "'") q = c;
    else if (c === ">") return i;
  }
  return -1;
}

/** Direkte Kindelemente eines XML-Ausschnitts */
export function xmlKinder(xml: string): XmlElement[] {
  const aus: XmlElement[] = [];
  let i = 0;
  while (i < xml.length) {
    const s = xml.indexOf("<", i);
    if (s < 0) break;
    if (xml.startsWith("<!--", s)) {
      const e = xml.indexOf("-->", s);
      i = e < 0 ? xml.length : e + 3;
      continue;
    }
    if (xml.startsWith("<![CDATA[", s)) {
      const e = xml.indexOf("]]>", s);
      i = e < 0 ? xml.length : e + 3;
      continue;
    }
    const e = tagEnde(xml, s);
    if (e < 0) break;
    if ("?!/".includes(xml[s + 1])) {
      i = e + 1;
      continue;
    }
    const kopf = xml.slice(s + 1, e);
    const name = /^[^\s/>]+/.exec(kopf)?.[0] ?? "";
    const lokal = name.slice(name.indexOf(":") + 1);
    if (kopf.endsWith("/")) {
      aus.push({ name, lokal, attribute: kopf.slice(name.length, -1), inhalt: "" });
      i = e + 1;
      continue;
    }
    const muster = new RegExp(`<(/?)${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?=[\\s/>])`, "g");
    muster.lastIndex = e + 1;
    let tiefe = 1;
    let ende = -1;
    let weiter = xml.length;
    for (let m = muster.exec(xml); m; m = muster.exec(xml)) {
      const te = tagEnde(xml, m.index);
      if (te < 0) break;
      if (m[1]) {
        if (--tiefe === 0) {
          ende = m.index;
          weiter = te + 1;
          break;
        }
      } else if (xml[te - 1] !== "/") tiefe++;
      muster.lastIndex = te + 1;
    }
    if (ende < 0) break;
    aus.push({ name, lokal, attribute: kopf.slice(name.length), inhalt: xml.slice(e + 1, ende) });
    i = weiter;
  }
  return aus;
}

/** Textinhalt eines Elements (CDATA, Entitäten; verschachtelte Auszeichnung wird zu Leerzeichen) */
export function xmlText(inhalt: string): string {
  const teile: string[] = [];
  let rest = inhalt;
  for (let m = /<!\[CDATA\[([\s\S]*?)\]\]>/.exec(rest); m; m = /<!\[CDATA\[([\s\S]*?)\]\]>/.exec(rest)) {
    teile.push(entitaeten(rest.slice(0, m.index).replace(/<[^>]*>/g, " ")), m[1]);
    rest = rest.slice(m.index + m[0].length);
  }
  teile.push(entitaeten(rest.replace(/<[^>]*>/g, " ")));
  return teile.join("").replace(/\s+/g, " ").trim();
}

const attributWert = (attribute: string, name: string) => new RegExp(`(?:^|\\s)${name}\\s*=\\s*"([^"]*)"`).exec(attribute)?.[1];

function koordinaten(xml: string, achse: Achse): Punkt[] {
  const aus: Punkt[] = [];
  const muster = /<(?:[\w.-]+:)?(posList|pos|coordinates)(\s[^>]*)?>([^<]*)<\//g;
  for (let m = muster.exec(xml); m; m = muster.exec(xml)) {
    if (m[1] === "coordinates") {
      for (const tupel of m[3].trim().split(/\s+/)) {
        const [a, b] = tupel.split(",").map(Number);
        if (Number.isFinite(a) && Number.isFinite(b)) aus.push(achse(a, b));
      }
      continue;
    }
    const zahlen = m[3].trim().split(/\s+/).map(Number);
    const dim = Number(attributWert(m[2] ?? "", "srsDimension") ?? attributWert(m[2] ?? "", "dimension") ?? 2) || 2;
    for (let i = 0; i + 1 < zahlen.length; i += dim) if (Number.isFinite(zahlen[i]) && Number.isFinite(zahlen[i + 1])) aus.push(achse(zahlen[i], zahlen[i + 1]));
  }
  return aus;
}

/** Alle (nicht verschachtelten) Blöcke eines GML-Elementtyps, z. B. "Polygon" */
function bloecke(xml: string, lokal: string): string[] {
  const aus: string[] = [];
  const auf = new RegExp(`<([\\w.-]+:)?${lokal}(?=[\\s>])`, "g");
  for (let m = auf.exec(xml); m; m = auf.exec(xml)) {
    const zu = `</${m[1] ?? ""}${lokal}>`;
    const ende = xml.indexOf(zu, m.index);
    if (ende < 0) break;
    aus.push(xml.slice(m.index, ende));
    auf.lastIndex = ende + zu.length;
  }
  return aus;
}

/** GML-Geometrie (GML 2/3.x) aus einem Ausschnitt lesen: Flächen vor Linien vor Punkten */
export function gmlGeometrie(xml: string, achse: Achse): Geometrie | null {
  const flaechen = [...bloecke(xml, "Polygon"), ...bloecke(xml, "PolygonPatch")]
    .map((poly) => {
      const aussen = [...bloecke(poly, "exterior"), ...bloecke(poly, "outerBoundaryIs")].map((r) => koordinaten(r, achse));
      const innen = [...bloecke(poly, "interior"), ...bloecke(poly, "innerBoundaryIs")].map((r) => koordinaten(r, achse));
      return [...aussen.slice(0, 1), ...innen].filter((r) => r.length >= 3);
    })
    .filter((p) => p.length);
  if (flaechen.length) return flaechen.length === 1 ? { type: "Polygon", coordinates: flaechen[0] } : { type: "MultiPolygon", coordinates: flaechen };
  const linien = [...bloecke(xml, "LineString"), ...bloecke(xml, "LineStringSegment")].map((l) => koordinaten(l, achse)).filter((l) => l.length >= 2);
  if (linien.length) return linien.length === 1 ? { type: "LineString", coordinates: linien[0] } : { type: "MultiLineString", coordinates: linien };
  const punkte = bloecke(xml, "Point").flatMap((p) => koordinaten(p, achse).slice(0, 1));
  if (punkte.length) return punkte.length === 1 ? { type: "Point", coordinates: punkte[0] } : { type: "MultiPoint", coordinates: punkte };
  return null;
}

/** Ein Objekt aus einer GML-Antwort */
export interface GmlObjekt {
  /** lokaler Elementname, z. B. "einzeldenkmale" oder "einzeldenkmalO_feature" */
  typ: string;
  id?: string;
  werte: Record<string, string>;
  geometrie: Geometrie | null;
  /** Begrenzungsrechteck aus gml:boundedBy (falls angegeben) */
  huelle?: [Punkt, Punkt];
}

const SAMMLER = new Set(["member", "featureMember", "featureMembers", "FeatureCollection", "featureCollection"]);

function objektAus(el: XmlElement, achse: Achse): GmlObjekt {
  const werte: Record<string, string> = {};
  let geometrie: Geometrie | null = null;
  let huelle: [Punkt, Punkt] | undefined;
  for (const k of xmlKinder(el.inhalt)) {
    if (k.lokal === "boundedBy") {
      const ecken = koordinaten(k.inhalt, achse);
      if (ecken.length >= 2) {
        const lons = ecken.map((x) => x[0]), lats = ecken.map((x) => x[1]);
        huelle = [[Math.min(...lons), Math.min(...lats)], [Math.max(...lons), Math.max(...lats)]];
      }
      continue;
    }
    if (k.inhalt.includes("<") && !k.inhalt.trimStart().startsWith("<![CDATA[")) {
      const g = gmlGeometrie(k.inhalt, achse);
      if (g) {
        geometrie ??= g;
        continue;
      }
    }
    const text = xmlText(k.inhalt);
    werte[k.lokal] = werte[k.lokal] && text ? `${werte[k.lokal]}; ${text}` : text || werte[k.lokal] || "";
  }
  return { typ: el.lokal, id: attributWert(el.attribute, "gml:id") ?? attributWert(el.attribute, "fid"), werte, geometrie, huelle };
}

function sammle(el: XmlElement, achse: Achse, aus: GmlObjekt[]) {
  for (const k of xmlKinder(el.inhalt)) {
    if (k.lokal === "boundedBy" || (k.name.startsWith("gml:") && !SAMMLER.has(k.lokal))) continue;
    if (SAMMLER.has(k.lokal) || k.lokal.endsWith("_layer") || k.lokal === "additionalObjects") sammle(k, achse, aus);
    else aus.push(objektAus(k, achse));
  }
}

/**
 * Objekte aus einer WFS-GetFeature- oder WMS-GetFeatureInfo-Antwort (GML/XML).
 * Fehlerberichte und unbekannte Antworten lösen einen DienstFehler aus – nie "0 Treffer".
 */
export function gmlObjekte(xml: string, achse: Achse): GmlObjekt[] {
  const wurzel = xmlKinder(xml)[0];
  if (!wurzel) throw unlesbar(xml.trim() ? "kein XML" : "leer");
  if (/exception/i.test(wurzel.lokal)) {
    const text = xmlText(wurzel.inhalt).slice(0, 160);
    throw new DienstFehler(`Dienst meldet einen Fehler${text ? `: ${text}` : ""}`, `service reports an error${text ? `: ${text}` : ""}`);
  }
  if (!/featurecollection|msgmloutput|featureinfo|getfeatureinforesponse/i.test(wurzel.lokal)) throw unlesbar(`unerwartetes Element ${wurzel.name}`);
  const aus: GmlObjekt[] = [];
  sammle(wurzel, achse, aus);
  return aus;
}

// ---------------------------------------------------------------------------------------------
// GeoJSON-Antworten

export interface GeoJsonObjekt {
  id?: string | number;
  properties: Record<string, unknown> | null;
  geometry: { type: string; coordinates: unknown } | null;
}

/** Objekte einer GeoJSON-FeatureCollection; leere Sammlungen ohne "features" (deegree) zählen als 0 Treffer */
export function geoJsonObjekte(antwort: unknown): GeoJsonObjekt[] {
  const a = antwort as { type?: string; features?: GeoJsonObjekt[] } | null;
  if (!a || a.type !== "FeatureCollection") throw unlesbar("keine FeatureCollection");
  if (a.features !== undefined && !Array.isArray(a.features)) throw unlesbar("features fehlerhaft");
  return (a.features ?? []).map((f) => ({ ...f, properties: f.properties ?? {} }));
}

/** GeoJSON in einer Text-Antwort lesen (für Dienste mit falschem Content-Type) */
export function alsJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    throw unlesbar(/^\s*</.test(text) ? "XML/HTML statt JSON" : "kein JSON");
  }
}

// ---------------------------------------------------------------------------------------------
// Denkmale: Umkreis-Filter und Sortierung

export type DenkmalRoh = Omit<DenkmalTreffer, "entfernungM" | "umriss"> & { geometrie: Geometrie | null; schluessel?: string };

/**
 * Entfernung und Umriss berechnen, auf den Umkreis begrenzen, doppelte Einträge (gleicher Schlüssel) zusammenfassen
 * und nach Entfernung sortieren (Einzeldenkmale vor Gruppen).
 */
export function denkmaleImUmkreis(p: Punkt, radiusM: number, roh: DenkmalRoh[]): DenkmalTreffer[] {
  const beste = new Map<string, DenkmalTreffer>();
  roh.forEach(({ geometrie, schluessel, ...rest }, i) => {
    if (!geometrie) return;
    const entfernungM = Math.round(abstand(p, geometrie));
    if (entfernungM > radiusM) return;
    const treffer: DenkmalTreffer = { ...rest, entfernungM, umriss: umrissVon(p, geometrie) };
    const k = schluessel ?? `#${i}`;
    const alt = beste.get(k);
    if (!alt) beste.set(k, treffer);
    else beste.set(k, { ...(treffer.entfernungM < alt.entfernungM ? treffer : alt), umriss: [...alt.umriss, ...treffer.umriss] });
  });
  return [...beste.values()].sort((x, y) => x.entfernungM - y.entfernungM || Number(x.gruppe) - Number(y.gruppe) || x.name.localeCompare(y.name, "de"));
}
