// Adresse -> Koordinaten (Geokodierung) für die Stadt Oldenburg (Oldb).
// Dienst: Nominatim / OpenStreetMap. Wir prüfen, ob Stadt und Hausnummer wirklich passen,
// und sagen es offen, wenn nur die Straße gefunden wurde.
import { fehlerText, holeJson } from "./abruf";
import { type Sprache, zweisprachig } from "../sprache";

export interface Standort {
  status: "ok";
  adresse: string;
  lat: number;
  lon: number;
  hausnummerGefunden: boolean;
  quelle: string;
}

interface NominatimTreffer {
  lat: string;
  lon: string;
  display_name: string;
  address: { road?: string; pedestrian?: string; house_number?: string; postcode?: string; city?: string; town?: string; state?: string };
}

const QUELLE = "OpenStreetMap / Nominatim";

export async function findeStandort(strasse: string, hausnummer: string, sprache: Sprache = "de"): Promise<Standort | { status: "nicht-gefunden" | "fehler"; hinweis: string }> {
  const params = new URLSearchParams({
    format: "jsonv2",
    addressdetails: "1",
    limit: "5",
    countrycodes: "de",
    street: `${hausnummer} ${strasse}`.trim(),
    city: "Oldenburg",
    state: "Niedersachsen",
  });
  let treffer: NominatimTreffer[];
  try {
    treffer = await holeJson<NominatimTreffer[]>(`https://nominatim.openstreetmap.org/search?${params}`);
  } catch (e) {
    return { status: "fehler", hinweis: zweisprachig(sprache)(`Adresssuche nicht möglich: ${fehlerText(e, "de")}.`, `Address search not possible: ${fehlerText(e, "en")}.`) };
  }
  const inOldenburg = treffer.filter((t) => (t.address.city ?? t.address.town) === "Oldenburg" && t.address.state === "Niedersachsen");
  if (!inOldenburg.length) {
    return {
      status: "nicht-gefunden",
      hinweis: zweisprachig(sprache)(
        `„${strasse} ${hausnummer}“ wurde in Oldenburg (Oldb) nicht gefunden. Bitte Straßennamen und Hausnummer prüfen.`,
        `“${strasse} ${hausnummer}” was not found in Oldenburg (Oldb). Please check the street name and house number.`,
      ),
    };
  }
  const norm = (s?: string) => (s ?? "").toLowerCase().replace(/\s+/g, "");
  const genau = inOldenburg.find((t) => norm(t.address.house_number) === norm(hausnummer));
  const t = genau ?? inOldenburg[0];
  const a = t.address;
  return {
    status: "ok",
    adresse: `${a.road ?? a.pedestrian ?? strasse} ${genau ? a.house_number : ""}`.trim() + `, ${a.postcode ?? ""} Oldenburg (Oldb)`.replace(" ,", ","),
    lat: Number(t.lat),
    lon: Number(t.lon),
    hausnummerGefunden: !!genau,
    quelle: QUELLE,
  };
}
