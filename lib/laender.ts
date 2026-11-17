// Die 16 Länder mit ihrer Bauordnung und ihrem Denkmalschutzgesetz (IDs wie in data/gesetze/*.json).
// Ein Land gilt in der App als "angebunden", sobald seine Gesetze importiert sind – fehlt eine Datei,
// sagt die App das offen, statt auf ein anderes Land auszuweichen.

export interface Land {
  name: string;
  /** Kürzel nach ISO 3166-2 ohne "DE-" */
  kuerzel: string;
  bauordnung: string;
  denkmalschutz: string;
  /** übliche Abkürzungen (auch für Gesetze, die noch nicht importiert sind) */
  bauordnungKurz: string;
  denkmalKurz: string;
}

export const LAENDER: Land[] = [
  { name: "Baden-Württemberg", kuerzel: "BW", bauordnung: "lbo-bw", denkmalschutz: "dschg-bw", bauordnungKurz: "LBO BW", denkmalKurz: "DSchG BW" },
  { name: "Bayern", kuerzel: "BY", bauordnung: "baybo", denkmalschutz: "baydschg", bauordnungKurz: "BayBO", denkmalKurz: "BayDSchG" },
  { name: "Berlin", kuerzel: "BE", bauordnung: "bauo-bln", denkmalschutz: "dschg-bln", bauordnungKurz: "BauO Bln", denkmalKurz: "DSchG Bln" },
  { name: "Brandenburg", kuerzel: "BB", bauordnung: "bbgbo", denkmalschutz: "bbgdschg", bauordnungKurz: "BbgBO", denkmalKurz: "BbgDSchG" },
  { name: "Bremen", kuerzel: "HB", bauordnung: "bremlbo", denkmalschutz: "bremdschg", bauordnungKurz: "BremLBO", denkmalKurz: "BremDSchG" },
  { name: "Hamburg", kuerzel: "HH", bauordnung: "hbauo", denkmalschutz: "dschg-hh", bauordnungKurz: "HBauO", denkmalKurz: "DSchG HH" },
  { name: "Hessen", kuerzel: "HE", bauordnung: "hbo", denkmalschutz: "hdschg", bauordnungKurz: "HBO", denkmalKurz: "HDSchG" },
  { name: "Mecklenburg-Vorpommern", kuerzel: "MV", bauordnung: "lbauo-mv", denkmalschutz: "dschg-mv", bauordnungKurz: "LBauO M-V", denkmalKurz: "DSchG M-V" },
  { name: "Niedersachsen", kuerzel: "NI", bauordnung: "nbauo", denkmalschutz: "ndschg", bauordnungKurz: "NBauO", denkmalKurz: "NDSchG" },
  { name: "Nordrhein-Westfalen", kuerzel: "NW", bauordnung: "bauo-nrw", denkmalschutz: "dschg-nrw", bauordnungKurz: "BauO NRW", denkmalKurz: "DSchG NRW" },
  { name: "Rheinland-Pfalz", kuerzel: "RP", bauordnung: "lbauo-rlp", denkmalschutz: "dschg-rlp", bauordnungKurz: "LBauO RLP", denkmalKurz: "DSchG RLP" },
  { name: "Saarland", kuerzel: "SL", bauordnung: "lbo-sl", denkmalschutz: "sdschg", bauordnungKurz: "LBO SL", denkmalKurz: "SDschG" },
  { name: "Sachsen", kuerzel: "SN", bauordnung: "saechsbo", denkmalschutz: "saechsdschg", bauordnungKurz: "SächsBO", denkmalKurz: "SächsDSchG" },
  { name: "Sachsen-Anhalt", kuerzel: "ST", bauordnung: "bauo-lsa", denkmalschutz: "denkmschg-lsa", bauordnungKurz: "BauO LSA", denkmalKurz: "DenkmSchG LSA" },
  { name: "Schleswig-Holstein", kuerzel: "SH", bauordnung: "lbo-sh", denkmalschutz: "dschg-sh", bauordnungKurz: "LBO SH", denkmalKurz: "DSchG SH" },
  { name: "Thüringen", kuerzel: "TH", bauordnung: "thuerbo", denkmalschutz: "thuerdschg", bauordnungKurz: "ThürBO", denkmalKurz: "ThürDSchG" },
];

export const STANDARD_LAND = "Niedersachsen";

export const landNamens = (name?: string | null): Land | undefined => LAENDER.find((l) => l.name === name);

/** Zu welchem Land gehört ein Landesgesetz? */
export const landVonGesetz = (gesetzId: string): Land | undefined => LAENDER.find((l) => l.bauordnung === gesetzId || l.denkmalschutz === gesetzId);

/** Landesgesetze sind Bauordnungen und Denkmalschutzgesetze der Länder */
export const istLandesgesetz = (gesetzId: string) => !!landVonGesetz(gesetzId);
