// Adresse -> Koordinaten (Geokodierung) für Adressen in ganz Deutschland.
// Dienst: Nominatim / OpenStreetMap. Wir prüfen, ob Postleitzahl, Ort und Hausnummer wirklich passen,
// und sagen es offen, wenn nur die Straße gefunden wurde.
//
// Suche:
//  - mit Postleitzahl und/oder Ort: genau dort
//  - ohne beides: zuerst in Oldenburg (Oldb), wo alle Datendienste angebunden sind, dann in ganz Deutschland.
//    Passt die Straße in mehreren Orten, fragt die App nach, statt einen Ort zu raten.
import { fehlerText, holeJson } from "./abruf";
import { type Sprache, zweisprachig } from "../sprache";

export interface AdressEingabe {
  strasse: string;
  hausnummer: string;
  plz?: string;
  ort?: string;
}

export interface Standort {
  status: "ok";
  adresse: string;
  lat: number;
  lon: number;
  hausnummerGefunden: boolean;
  quelle: string;
  /** Gemeinde bzw. Stadt, z. B. "Oldenburg (Oldb)", "Hannover" */
  ort: string;
  plz?: string;
  /** Bundesland laut Adressdaten, z. B. "Niedersachsen" */
  land: string;
  /** Stadt Oldenburg (Oldb) – dort sind B-Plan-Dienste angebunden */
  oldenburg: boolean;
}

export type StandortErgebnis =
  | Standort
  | { status: "nicht-gefunden" | "fehler"; hinweis: string }
  | { status: "mehrdeutig"; hinweis: string; kandidaten: { label: string; anfrage: string }[] };

interface NominatimTreffer {
  lat: string;
  lon: string;
  display_name: string;
  address: {
    road?: string;
    pedestrian?: string;
    house_number?: string;
    postcode?: string;
    city?: string;
    town?: string;
    village?: string;
    municipality?: string;
    state?: string;
    "ISO3166-2-lvl4"?: string;
  };
}

// Bundesland aus dem ISO-Code – bei Stadtstaaten (Berlin, Hamburg, Bremen) fehlt in den Adressdaten oft "state"
const LAENDER: Record<string, string> = {
  "DE-BW": "Baden-Württemberg", "DE-BY": "Bayern", "DE-BE": "Berlin", "DE-BB": "Brandenburg", "DE-HB": "Bremen", "DE-HH": "Hamburg",
  "DE-HE": "Hessen", "DE-MV": "Mecklenburg-Vorpommern", "DE-NI": "Niedersachsen", "DE-NW": "Nordrhein-Westfalen", "DE-RP": "Rheinland-Pfalz",
  "DE-SL": "Saarland", "DE-SN": "Sachsen", "DE-ST": "Sachsen-Anhalt", "DE-SH": "Schleswig-Holstein", "DE-TH": "Thüringen",
};
const landVon = (a: NominatimTreffer["address"]) => LAENDER[a["ISO3166-2-lvl4"] ?? ""] ?? a.state ?? "";

const QUELLE = "OpenStreetMap / Nominatim";
const vereinfacht = (s?: string) => (s ?? "").toLowerCase().replace(/\s+/g, "");
const ortVon = (a: NominatimTreffer["address"]) => a.city ?? a.town ?? a.village ?? a.municipality ?? "";
const istOldenburg = (a: NominatimTreffer["address"]) => ortVon(a) === "Oldenburg" && landVon(a) === "Niedersachsen";
const ortsName = (a: NominatimTreffer["address"]) => (istOldenburg(a) ? "Oldenburg (Oldb)" : ortVon(a));

async function suche(params: Record<string, string>): Promise<NominatimTreffer[]> {
  const p = new URLSearchParams({ format: "jsonv2", addressdetails: "1", countrycodes: "de", ...params });
  const url = `https://nominatim.openstreetmap.org/search?${p}`;
  try {
    return await holeJson<NominatimTreffer[]>(url);
  } catch {
    // Einzelne Aussetzer (Zeitüberschreitung, kurz überlastet) kommen vor: einmal nach einer Pause neu versuchen –
    // die Pause hält die Nutzungsregel von Nominatim ein (höchstens eine Anfrage pro Sekunde).
    await new Promise((r) => setTimeout(r, 1500));
    return holeJson<NominatimTreffer[]>(url);
  }
}

function alsStandort(t: NominatimTreffer, e: AdressEingabe, genau: boolean): Standort {
  const a = t.address;
  const ort = ortsName(a);
  return {
    status: "ok",
    adresse: `${a.road ?? a.pedestrian ?? e.strasse} ${genau ? a.house_number : ""}`.trim() + `, ${a.postcode ?? ""} ${ort}`.replace(/,\s+/, ", ").replace(/\s{2,}/g, " "),
    lat: Number(t.lat),
    lon: Number(t.lon),
    hausnummerGefunden: genau,
    quelle: QUELLE,
    ort,
    ...(a.postcode ? { plz: a.postcode } : {}),
    land: landVon(a),
    oldenburg: istOldenburg(a),
  };
}

export async function findeStandort(e: AdressEingabe, sprache: Sprache = "de"): Promise<StandortErgebnis> {
  const t = zweisprachig(sprache);
  const strasse = `${e.hausnummer} ${e.strasse}`.trim();
  const plz = e.plz?.trim();
  const ortEingabe = e.ort?.trim();
  const gesucht = [`${e.strasse} ${e.hausnummer}`, [plz, ortEingabe].filter(Boolean).join(" ")].filter(Boolean).join(", ");

  let treffer: NominatimTreffer[];
  try {
    if (plz || ortEingabe) {
      treffer = await suche({ street: strasse, limit: "10", ...(plz ? { postalcode: plz } : {}), ...(ortEingabe ? { city: ortEingabe } : {}) });
      // Nominatim liefert manchmal Nachbarorte – mit Postleitzahl nur Treffer genau in dieser PLZ
      if (plz) treffer = treffer.filter((x) => x.address.postcode === plz);
    } else {
      treffer = (await suche({ street: strasse, city: "Oldenburg", state: "Niedersachsen", limit: "5" })).filter((x) => istOldenburg(x.address));
      if (!treffer.length) treffer = await suche({ street: strasse, limit: "20" });
    }
  } catch (err) {
    return { status: "fehler", hinweis: t(`Adresssuche nicht möglich: ${fehlerText(err, "de")}.`, `Address search not possible: ${fehlerText(err, "en")}.`) };
  }
  // nur echte Straßenadressen (mit Straße und Ort)
  treffer = treffer.filter((x) => (x.address.road ?? x.address.pedestrian) && ortVon(x.address));
  if (!treffer.length) {
    return {
      status: "nicht-gefunden",
      hinweis: t(
        `„${gesucht}“ wurde nicht gefunden. Bitte Straßennamen, Hausnummer${plz || ortEingabe ? " und Postleitzahl bzw. Ort" : ""} prüfen${plz || ortEingabe ? "" : " – mit Postleitzahl wird die Suche eindeutig"}.`,
        `“${gesucht}” was not found. Please check the street name, house number${plz || ortEingabe ? " and postcode or town" : ""}${plz || ortEingabe ? "" : " – adding a postcode makes the search unambiguous"}.`,
      ),
    };
  }

  // Ohne PLZ/Ort deutschlandweit gefunden: liegt die Straße in mehreren Orten, nachfragen
  const orte = new Map<string, NominatimTreffer>();
  for (const x of treffer) {
    const k = `${x.address.postcode ?? ""}|${ortsName(x.address)}`;
    if (!orte.has(k)) orte.set(k, x);
  }
  if (!plz && !ortEingabe && !treffer.every((x) => istOldenburg(x.address)) && orte.size > 1) {
    const kandidaten = [...orte.values()].slice(0, 8).map((x) => {
      const label = `${x.address.road ?? x.address.pedestrian} ${e.hausnummer}, ${x.address.postcode ?? ""} ${ortsName(x.address)}`.replace(/\s{2,}/g, " ");
      return { label: `${label} (${landVon(x.address) || "?"})`, anfrage: label };
    });
    return {
      status: "mehrdeutig",
      hinweis: t(
        `„${e.strasse} ${e.hausnummer}“ gibt es in mehreren Orten. Welche Adresse ist gemeint? (Tipp: mit Postleitzahl, z. B. „${kandidaten[0].anfrage}“)`,
        `“${e.strasse} ${e.hausnummer}” exists in several places. Which address do you mean? (Tip: add the postcode, e.g. “${kandidaten[0].anfrage}”)`,
      ),
      kandidaten,
    };
  }

  const genau = treffer.find((x) => vereinfacht(x.address.house_number) === vereinfacht(e.hausnummer));
  return alsStandort(genau ?? treffer[0], e, !!genau);
}
