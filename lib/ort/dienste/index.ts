// Verzeichnis aller angebundenen B-Plan- und Denkmal-Dienste der Länder und Gemeinden (Stand der Prüfung: 17.11.2026).
//
// Auswahl für einen Standort: alle Dienste, deren gebiet.land dem Bundesland des Standorts entspricht und die entweder
// landesweit gelten, für den Landkreis des Standorts (gebiet.kreis, z. B. "Landkreis Leer") oder für seinen Ort
// (gebiet.gemeinde; Namen wie in lib/ort/standort.ts, z. B. "München", "Frankfurt am Main", "Oldenburg (Oldb)").
// Landes-, Kreis- und Gemeindedienste können sich ergänzen und überschneiden (z. B. Bayern landesweit + München). Ein leeres Ergebnis bedeutet nur bei
// vollstaendig === true "kein Plan / kein Denkmal", sonst "im Dienst nicht verzeichnet".
// browser === false hieße: nur serverseitig nutzbar (fehlende CORS-Kopfzeilen) – derzeit erlauben alle Dienste den Browser.
//
// Bewusst nicht angebunden (Begründung jeweils in der Länderdatei):
//  - B-Pläne: Saarland (Nutzungsbedingungen erlauben nur das Anschauen im GeoPortal), Braunschweig (Nutzungsverbot auf
//    anderen Internetseiten), Hannover, Hessen landesweit, Kiel/Lübeck, Mainz u. a. (kein offener Abfragedienst),
//    Landkreise Wittmund (Langeoog, Spiekeroog) und Friesland (Wangerooge): kein erreichbarer Dienst
//  - Denkmale: Brandenburg (BLDAM: Veröffentlichung nur mit schriftlicher Zustimmung), Mecklenburg-Vorpommern landesweit
//    (Dienst eingestellt), Thüringen (kein Dienst des Landesamts), archäologische Denkmale in Sachsen und
//    Schleswig-Holstein, Bodendenkmale in Bremen (nur mit Anmeldung)
import { bwArokBplan, bwDenkmal, stuttgartBplan } from "./baden-wuerttemberg";
import { bayernBplan, bayernDenkmal, muenchenBplan, nuernbergBplan } from "./bayern";
import { berlinBplan, berlinDenkmal } from "./berlin";
import { brandenburgBplan } from "./brandenburg";
import { bremenBplan, bremenDenkmal, bremerhavenBplan } from "./bremen";
import { hamburgBplan, hamburgDenkmal } from "./hamburg";
import { frankfurtBplan, hessenDenkmal } from "./hessen";
import { mvBplan, rostockDenkmal, schwerinDenkmal } from "./mecklenburg-vorpommern";
import { aurichBplan, leerBplan, niedersachsenDenkmal, oldenburgBplan } from "./niedersachsen";
import { dortmundDenkmal, koelnDenkmal, nrwBplan, nrwDenkmal } from "./nordrhein-westfalen";
import { rlpBplan, rlpDenkmal } from "./rheinland-pfalz";
import { saarlandDenkmal } from "./saarland";
import { sachsenBplan, sachsenDenkmal } from "./sachsen";
import { sachsenAnhaltBplan, sachsenAnhaltDenkmal } from "./sachsen-anhalt";
import { shBplan, shDenkmal } from "./schleswig-holstein";
import { thueringenBplan } from "./thueringen";
import type { BplanDienst, DenkmalDienst, DienstGebiet } from "./typen";

export type { BplanDienst, DenkmalDienst, DenkmalTreffer, DienstErgebnis, DienstGebiet, PlanTreffer } from "./typen";

export const BPLAN_DIENSTE: BplanDienst[] = [
  bwArokBplan,
  stuttgartBplan,
  bayernBplan,
  muenchenBplan,
  nuernbergBplan,
  berlinBplan,
  brandenburgBplan,
  bremenBplan,
  bremerhavenBplan,
  hamburgBplan,
  frankfurtBplan,
  mvBplan,
  oldenburgBplan,
  leerBplan,
  aurichBplan,
  nrwBplan,
  rlpBplan,
  sachsenBplan,
  sachsenAnhaltBplan,
  shBplan,
  thueringenBplan,
];

export const DENKMAL_DIENSTE: DenkmalDienst[] = [
  bwDenkmal,
  bayernDenkmal,
  berlinDenkmal,
  bremenDenkmal,
  hamburgDenkmal,
  hessenDenkmal,
  rostockDenkmal,
  schwerinDenkmal,
  niedersachsenDenkmal,
  nrwDenkmal,
  koelnDenkmal,
  dortmundDenkmal,
  rlpDenkmal,
  saarlandDenkmal,
  sachsenDenkmal,
  sachsenAnhaltDenkmal,
  shDenkmal,
];

const gleich = (a: string, b: string) => a.localeCompare(b, "de", { sensitivity: "base" }) === 0;

/** Gilt ein Dienstgebiet für den Standort (Bundesland und – bei Kreis- bzw. Gemeindediensten – Landkreis bzw. Ort)? */
export function gebietPasst(g: DienstGebiet, land: string, ort?: string, kreis?: string): boolean {
  return (
    gleich(g.land, land) && (!g.kreis || (!!kreis && gleich(g.kreis, kreis))) && (!g.gemeinde || (!!ort && gleich(g.gemeinde, ort)))
  );
}

/** Für einen Standort zuständige Dienste (landesweite zuerst, dann Kreis-, dann Gemeindedienste) */
export function diensteFuer<T extends { gebiet: DienstGebiet }>(dienste: T[], land: string, ort?: string, kreis?: string): T[] {
  const stufe = (g: DienstGebiet) => (g.gemeinde ? 2 : g.kreis ? 1 : 0);
  return dienste.filter((d) => gebietPasst(d.gebiet, land, ort, kreis)).sort((a, b) => stufe(a.gebiet) - stufe(b.gebiet));
}
