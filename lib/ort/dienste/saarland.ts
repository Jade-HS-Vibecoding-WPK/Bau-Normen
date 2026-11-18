// Saarland: Denkmale aus dem Dienst "Denkmalschutz" der GDI-SL (Daten des Landesdenkmalamts, ArcGIS-WFS, CC BY 4.0,
// Access-Control-Allow-Origin: *, geprüft 17.11.2026).
// B-Pläne: Der landesweite WMS "Bebauungspläne Saarland" erlaubt laut seinen Nutzungsbedingungen nur das Anschauen im
// GeoPortal.Saarland ("Sämtliche Rechte … liegen bei den einzelnen Gemeinden") und deckt Saarbrücken nicht ab – nicht angebunden.
import { holeJson } from "../abruf";
import { zweisprachig } from "../../sprache";
import { denkmaleImUmkreis, fehlerErgebnis, gekuerzt, geoJsonObjekte, LON_LAT, rechteck, umrechnen, wert, webLink, type DenkmalRoh, type Punkt } from "./hilfen";
import type { DenkmalDienst } from "./typen";

const WFS = "https://geoportal.saarland.de/arcgis/services/Internet/Denkmalschutz/MapServer/WFSServer";

/** "Am Ludwigsplatz 18, Ludwigskirche, ev.-luth. Pfarr- und Hofkirche, 1762-1775 …" -> "Ludwigskirche, ev.-luth. Pfarr- und Hofkirche" */
function bezeichnung(text: string, adresse?: string): string | undefined {
  const teile = text.split(/,\s+/);
  if (adresse && teile[0]?.trim() === adresse.trim()) teile.shift();
  const name: string[] = [];
  for (const teil of teile) {
    if (/\d{3,4}|\(/.test(teil) && name.length) break;
    name.push(teil);
    if (name.length >= 3) break;
  }
  return name.join(", ") || undefined;
}

export const saarlandDenkmal: DenkmalDienst = {
  id: "sl-denkmal",
  quelle: "GDI-SL / Landesdenkmalamt Saarland: Denkmalschutz (© GDI-SL, CC BY 4.0)",
  viewer: "https://geoportal.saarland.de/",
  gebiet: { land: "Saarland" },
  // Registry-Metadaten ohne Aussage zur Vollständigkeit; verweist auf die Denkmalliste vom 01.07.2022.
  // Baudenkmale nur als Punkte, Bodendenkmale praktisch nicht enthalten (3 Objekte).
  vollstaendig: false,
  browser: true,
  abdeckung: {
    de: "Baudenkmale als Punkte (Stand der verknüpften Denkmalliste: 2022), keine Aussage zur Vollständigkeit; Bodendenkmale praktisch nicht enthalten.",
    en: "Listed buildings as points (linked list of monuments dated 2022), no statement on completeness; archaeological monuments practically not included.",
  },
  async abfrage(lat, lon, radiusM, sprache) {
    const t = zweisprachig(sprache);
    const p: Punkt = [lon, lat];
    // Dieser ArcGIS-WFS wertet die BBOX nur als "Breite,Länge,…,EPSG:4326" aus
    const [a, b, c, d] = rechteck(p, radiusM + 10);
    const bbox = [b, a, d, c].map((x) => x.toFixed(6)).join(",");
    // je Objektart eine Anfrage (bei mehreren hängt der Dienst zwei GeoJSON-Dokumente aneinander)
    const anfrage = (typ: string) =>
      holeJson(`${WFS}?SERVICE=WFS&VERSION=2.0.0&REQUEST=GetFeature&TYPENAMES=Denkmalschutz:${typ}&COUNT=200&OUTPUTFORMAT=GEOJSON&BBOX=${bbox},EPSG:4326`, 12000);
    try {
      const antworten = await Promise.all([anfrage("Baudenkmale"), anfrage("Bodendenkmal")]);
      const roh: DenkmalRoh[] = antworten.flatMap(geoJsonObjekte).map((f) => {
        const x = f.properties ?? {};
        const boden = /^Bodendenkmal/i.test(String(x.GmlID ?? "")) || x.LISTENTEXT !== undefined;
        if (boden) {
          return {
            name: gekuerzt(wert(x.LISTENTEXT), 120) ?? t("Bodendenkmal", "Archaeological monument"),
            anschrift: [wert(x.STRASSENNAME), wert(x.GEMEINDE)].filter(Boolean).join(", ") || undefined,
            ausweisung: t("Bodendenkmal", "Archaeological monument"),
            gruppe: false,
            geometrie: umrechnen(f.geometry, LON_LAT),
            schluessel: wert(x.ID) ? `boden:${x.ID}` : undefined,
          };
        }
        const text = wert(x.text_1) ?? "";
        const adresse = wert(x.strhn_1);
        return {
          name: bezeichnung(text, adresse) ?? adresse ?? t("Baudenkmal", "Listed building"),
          anschrift: adresse ? `${adresse}${wert(x.gemeinde_1) ? `, ${x.gemeinde_1}` : ""}` : undefined,
          ausweisung: t("Baudenkmal", "Listed building"),
          beschreibung: gekuerzt(text || undefined),
          gruppe: false,
          link: webLink(x.Baud_Land),
          geometrie: umrechnen(f.geometry, LON_LAT),
          schluessel: wert(x.Id_1) ? `bau:${x.Id_1}` : undefined,
        };
      });
      return { status: "ok", treffer: denkmaleImUmkreis(p, radiusM, roh) };
    } catch (e) {
      return fehlerErgebnis("denkmal", "Denkmalschutz Saarland", e, sprache);
    }
  },
};
