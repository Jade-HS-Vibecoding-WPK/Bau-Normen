// Kleine Geometrie-Helfer (ohne externe Bibliothek).
// Koordinaten immer als [Längengrad, Breitengrad] wie in GeoJSON.

export type Punkt = [number, number];
type Ring = Punkt[];

/** Liegt der Punkt in einem GeoJSON-Polygon bzw. -MultiPolygon? (Ray-Casting, Löcher berücksichtigt) */
export function punktInGeometrie(p: Punkt, geom: { type: string; coordinates: unknown }): boolean {
  if (geom.type === "Polygon") return punktInPolygon(p, geom.coordinates as Ring[]);
  if (geom.type === "MultiPolygon") return (geom.coordinates as Ring[][]).some((poly) => punktInPolygon(p, poly));
  return false;
}

function punktInPolygon(p: Punkt, ringe: Ring[]): boolean {
  if (!ringe.length || !inRing(p, ringe[0])) return false;
  return !ringe.slice(1).some((loch) => inRing(p, loch));
}

function inRing([x, y]: Punkt, ring: Ring): boolean {
  let drin = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) drin = !drin;
  }
  return drin;
}

/** Abstand Punkt -> Geometrie in Metern (0, wenn der Punkt drinliegt). Genau genug für Umkreise bis ~1 km. */
export function abstandMeter(p: Punkt, geom: { type: string; coordinates: unknown }): number {
  if (punktInGeometrie(p, geom)) return 0;
  const ringe: Ring[] =
    geom.type === "Polygon" ? (geom.coordinates as Ring[]) : geom.type === "MultiPolygon" ? (geom.coordinates as Ring[][]).flat() : [];
  if (geom.type === "Point") return distanzMeter(p, geom.coordinates as Punkt);
  const kx = 111320 * Math.cos((p[1] * Math.PI) / 180);
  const ky = 110540;
  let min = Infinity;
  for (const ring of ringe) {
    for (let i = 0; i < ring.length - 1; i++) {
      const ax = (ring[i][0] - p[0]) * kx, ay = (ring[i][1] - p[1]) * ky;
      const bx = (ring[i + 1][0] - p[0]) * kx, by = (ring[i + 1][1] - p[1]) * ky;
      const dx = bx - ax, dy = by - ay;
      const t = dx || dy ? Math.max(0, Math.min(1, -(ax * dx + ay * dy) / (dx * dx + dy * dy))) : 0;
      min = Math.min(min, Math.hypot(ax + t * dx, ay + t * dy));
    }
  }
  return min;
}

export function distanzMeter(a: Punkt, b: Punkt): number {
  const kx = 111320 * Math.cos((a[1] * Math.PI) / 180);
  return Math.hypot((a[0] - b[0]) * kx, (a[1] - b[1]) * 110540);
}

/**
 * Wandelt Polygon-Ringe (lon/lat) in lokale Meter um den Standort um (x = Osten, y = Norden),
 * vereinfacht lange Ringe und rundet auf 10 cm – für die schematische Lageskizze.
 */
export function inMeter(ursprung: Punkt, ringe: Ring[], maxPunkte = 120): [number, number][][] {
  const kx = 111320 * Math.cos((ursprung[1] * Math.PI) / 180);
  const ky = 110540;
  return ringe.map((ring) => {
    const schritt = Math.max(1, Math.ceil(ring.length / maxPunkte));
    const auswahl = ring.filter((_, i) => i % schritt === 0 || i === ring.length - 1);
    return auswahl.map(([lon, lat]) => [Math.round((lon - ursprung[0]) * kx * 10) / 10, Math.round((lat - ursprung[1]) * ky * 10) / 10] as [number, number]);
  });
}

/** Äußere Ringe eines GeoJSON-Polygons/-MultiPolygons. */
export function aussenRinge(geom: { type: string; coordinates: unknown }): Ring[] {
  if (geom.type === "Polygon") return [(geom.coordinates as Ring[])[0]];
  if (geom.type === "MultiPolygon") return (geom.coordinates as Ring[][]).map((p) => p[0]);
  return [];
}

/** Begrenzungsrechteck (lon/lat) für einen Umkreis in Metern. */
export function bbox([lon, lat]: Punkt, radiusM: number): [number, number, number, number] {
  const dLat = radiusM / 110540;
  const dLon = radiusM / (111320 * Math.cos((lat * Math.PI) / 180));
  return [lon - dLon, lat - dLat, lon + dLon, lat + dLat];
}
