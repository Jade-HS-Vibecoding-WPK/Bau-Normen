"use client";
// Lageskizze der Ortsauskunft: OpenStreetMap als Hintergrund, darüber Standort, Umkreis 50 m, B-Plan-Umring und Denkmalflächen.
// Die Karte lässt sich zoomen (Mausrad, Knöpfe, Doppelklick, zwei Finger) und verschieben (Ziehen, Pfeiltasten).
// Die Fähnchen steckt der Gecko der Seite: Sobald die Skizze im Bild ist, bekommt er einen Auftrag ("gecko-fahnen")
// und läuft von Fahne zu Fahne. Ist der Gecko ausgeblendet (oder sind Animationen aus), erscheinen die Fahnen von selbst.
// Keine amtliche Karte – die Umrisse kommen aus den Datendiensten (Stadt Oldenburg, Denkmalatlas).
import { useEffect, useId, useMemo, useRef, useState } from "react";
import type { GeckoFahnenAuftrag } from "@/lib/gecko";
import type { OrtAnsicht } from "@/lib/typen";
import { bewegungAus, useT } from "./Einstellungen";

type P = [number, number];
const BREITE = 80; // halbe Breite des Bildausschnitts (Bildkoordinaten; bei Zoom 1 = Meter)
const HOEHE = 60;
const ZOOM_MIN = 0.5;
const ZOOM_MAX = 6;
const RAND_M = 300; // so weit lässt sich die Karte vom Standort wegschieben

interface Ansicht {
  vx: number; // Bildmitte in Metern östlich des Standorts
  vy: number; // … nördlich des Standorts
  k: number; // Zoomfaktor (Bildeinheiten je Meter)
}
const START: Ansicht = { vx: 0, vy: 0, k: 1 };
const begrenze = (a: Ansicht): Ansicht => ({
  k: Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, a.k)),
  vx: Math.min(RAND_M, Math.max(-RAND_M, a.vx)),
  vy: Math.min(RAND_M, Math.max(-RAND_M, a.vy)),
});
/** Meter (Osten, Norden) -> Bildkoordinaten (y nach unten) */
const bild = (a: Ansicht, x: number, y: number): P => [(x - a.vx) * a.k, -(y - a.vy) * a.k];

const svgPfad = (a: Ansicht, ringe: P[][]) =>
  ringe
    .map(
      (r) =>
        "M" +
        r
          .map(([x, y]) => bild(a, x, y))
          .map(([x, y]) => `${x.toFixed(2)} ${y.toFixed(2)}`)
          .join(" L") +
        " Z",
    )
    .join(" ");

function ankerpunkt(ringe: P[][]): P {
  const pts = ringe.flat();
  if (!pts.length) return [0, 0];
  const mitte: P = [pts.reduce((s, p) => s + p[0], 0) / pts.length, pts.reduce((s, p) => s + p[1], 0) / pts.length];
  const imBild = (p: P) => Math.abs(p[0]) < BREITE - 6 && Math.abs(p[1]) < HOEHE - 8;
  if (imBild(mitte)) return mitte;
  // Große Flächen (z. B. Gruppen, Parks): den nächstgelegenen Punkt im Ausschnitt nehmen
  const naechster = pts.reduce((a, b) => (Math.hypot(...b) < Math.hypot(...a) ? b : a));
  return [Math.max(-BREITE + 8, Math.min(BREITE - 8, naechster[0])), Math.max(-HOEHE + 10, Math.min(HOEHE - 6, naechster[1]))];
}

/** OSM-Kacheln für den sichtbaren Ausschnitt – als Rechtecke in Bildkoordinaten (gleiche Umrechnung wie lib/ort/geo.ts). */
function kacheln(lat: number, lon: number, a: Ansicht, z: number) {
  const kx = 111320 * Math.cos((lat * Math.PI) / 180);
  const ky = 110540;
  const n = 2 ** z;
  const kachelX = (lo: number) => Math.floor(((lo + 180) / 360) * n);
  const kachelY = (la: number) => {
    const r = (la * Math.PI) / 180;
    return Math.floor(((1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2) * n);
  };
  const lonVon = (x: number) => (x / n) * 360 - 180;
  const latVon = (y: number) => (Math.atan(Math.sinh(Math.PI * (1 - (2 * y) / n))) * 180) / Math.PI;
  const halbB = BREITE / a.k;
  const halbH = HOEHE / a.k;
  const x0 = kachelX(lon + (a.vx - halbB) / kx);
  const x1 = kachelX(lon + (a.vx + halbB) / kx);
  const y0 = kachelY(lat + (a.vy + halbH) / ky);
  const y1 = kachelY(lat + (a.vy - halbH) / ky);
  const liste: { url: string; x: number; y: number; b: number; h: number }[] = [];
  if ((x1 - x0 + 1) * (y1 - y0 + 1) > 64) return liste; // Sicherheitsgrenze
  for (let x = x0; x <= x1; x++) {
    for (let y = y0; y <= y1; y++) {
      const [bx, by] = bild(a, (lonVon(x) - lon) * kx, (latVon(y) - lat) * ky);
      const [ex, ey] = bild(a, (lonVon(x + 1) - lon) * kx, (latVon(y + 1) - lat) * ky);
      liste.push({ url: `https://tile.openstreetmap.org/${z}/${x}/${y}.png`, x: bx, y: by, b: ex - bx, h: ey - by });
    }
  }
  return liste;
}

/** passende Kachelstufe: Kachelpixel ≈ Bildschirmpixel */
function kachelStufe(lat: number, k: number, pxJeEinheit: number) {
  const dpr = typeof window !== "undefined" ? Math.min(2, window.devicePixelRatio || 1) : 1;
  const z = Math.round(Math.log2(156543.03 * Math.cos((lat * Math.PI) / 180) * k * pxJeEinheit * dpr) - 0.3);
  return Math.min(19, Math.max(12, z));
}

/** Maßstabsbalken: runde Länge, die auf dem Bild etwa 15–30 Einheiten lang ist */
function massstab(k: number) {
  const laengen = [1, 2, 5, 10, 20, 50, 100, 200, 500];
  const m = [...laengen].reverse().find((l) => l * k <= 30) ?? 1;
  return { m, laenge: m * k };
}

const FARBE = { standort: "var(--flagge-standort)", hier: "var(--flagge-hier)", einzel: "var(--flagge-einzel)", gruppe: "var(--flagge-gruppe)" };

export default function Lageskizze({ o, id }: { o: OrtAnsicht; id: string }) {
  const t = useT();
  const uid = useId().replace(/:/g, "");
  const svgRef = useRef<SVGSVGElement>(null);
  const denkmale = useMemo(() => (o.denkmal.status !== "fehler" ? o.denkmal.denkmale : []), [o.denkmal]);
  const plaene = o.bplan.status !== "fehler" ? o.bplan.plaene : [];
  const ort = o.standort.status === "ok" ? o.standort : null;

  const [ansicht, setAnsicht] = useState<Ansicht>(START);
  const ansichtRef = useRef(ansicht);
  ansichtRef.current = ansicht;
  const [pxJeEinheit, setPxJeEinheit] = useState(4);

  // Größe der Skizze auf dem Bildschirm (für die passende Kachelstufe)
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const messen = () => setPxJeEinheit(Math.max(1, svg.getBoundingClientRect().width / (BREITE * 2)));
    messen();
    const ro = new ResizeObserver(messen);
    ro.observe(svg);
    return () => ro.disconnect();
  }, []);

  // ---------- Zoomen und Verschieben ----------
  const imBild = (clientX: number, clientY: number) => {
    const r = svgRef.current!.getBoundingClientRect();
    return { ux: ((clientX - r.left) / r.width) * BREITE * 2 - BREITE, uy: ((clientY - r.top) / r.height) * HOEHE * 2 - HOEHE, r };
  };
  const zoomeUm = (faktor: number, ux = 0, uy = 0) =>
    setAnsicht((a) => {
      const k = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, a.k * faktor));
      const mx = a.vx + ux / a.k;
      const my = a.vy - uy / a.k;
      return begrenze({ k, vx: mx - ux / k, vy: my + uy / k });
    });
  const verschiebe = (dxPx: number, dyPx: number, r: DOMRect) =>
    setAnsicht((a) => begrenze({ ...a, vx: a.vx - ((dxPx / r.width) * BREITE * 2) / a.k, vy: a.vy + ((dyPx / r.height) * HOEHE * 2) / a.k }));

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    // Mausrad zoomt die Karte (nicht die Seite) – braucht einen nicht-passiven Listener
    const rad = (ev: WheelEvent) => {
      ev.preventDefault();
      const { ux, uy } = imBild(ev.clientX, ev.clientY);
      zoomeUm(Math.exp(-ev.deltaY * (ev.deltaMode === 1 ? 0.05 : 0.0016)), ux, uy);
    };
    svg.addEventListener("wheel", rad, { passive: false });
    return () => svg.removeEventListener("wheel", rad);
  }, []);

  const zeiger = useRef(new Map<number, { x: number; y: number }>());
  const [zieht, setZieht] = useState(false);
  const runter = (ev: React.PointerEvent<SVGSVGElement>) => {
    if (ev.pointerType === "mouse" && ev.button !== 0) return;
    ev.currentTarget.setPointerCapture(ev.pointerId);
    zeiger.current.set(ev.pointerId, { x: ev.clientX, y: ev.clientY });
    setZieht(true);
  };
  const bewegt = (ev: React.PointerEvent<SVGSVGElement>) => {
    const alt = zeiger.current.get(ev.pointerId);
    if (!alt) return;
    const r = svgRef.current!.getBoundingClientRect();
    if (zeiger.current.size === 1) {
      verschiebe(ev.clientX - alt.x, ev.clientY - alt.y, r);
    } else if (zeiger.current.size === 2) {
      // zwei Finger: auseinander/zusammen = zoomen, gemeinsam bewegen = verschieben
      const [p1, p2] = [...zeiger.current.entries()].map(([pid, p]) => (pid === ev.pointerId ? { x: ev.clientX, y: ev.clientY } : p));
      const [q1, q2] = [...zeiger.current.values()];
      const vorher = Math.hypot(q1.x - q2.x, q1.y - q2.y) || 1;
      const nachher = Math.hypot(p1.x - p2.x, p1.y - p2.y) || 1;
      const { ux, uy } = imBild((p1.x + p2.x) / 2, (p1.y + p2.y) / 2);
      zoomeUm(nachher / vorher, ux, uy);
      verschiebe((p1.x + p2.x) / 2 - (q1.x + q2.x) / 2, (p1.y + p2.y) / 2 - (q1.y + q2.y) / 2, r);
    }
    zeiger.current.set(ev.pointerId, { x: ev.clientX, y: ev.clientY });
  };
  const hoch = (ev: React.PointerEvent<SVGSVGElement>) => {
    zeiger.current.delete(ev.pointerId);
    if (!zeiger.current.size) setZieht(false);
  };
  const taste = (ev: React.KeyboardEvent<SVGSVGElement>) => {
    const r = svgRef.current!.getBoundingClientRect();
    const schritt = r.width / 8;
    const aktion: Record<string, () => void> = {
      ArrowLeft: () => verschiebe(schritt, 0, r),
      ArrowRight: () => verschiebe(-schritt, 0, r),
      ArrowUp: () => verschiebe(0, schritt, r),
      ArrowDown: () => verschiebe(0, -schritt, r),
      "+": () => zoomeUm(1.4),
      "=": () => zoomeUm(1.4),
      "-": () => zoomeUm(1 / 1.4),
      "0": () => setAnsicht(START),
    };
    if (aktion[ev.key]) {
      ev.preventDefault();
      aktion[ev.key]();
    }
  };

  // ---------- Fähnchen ----------
  // Standort + je Denkmal; leicht versetzt, wenn zwei an derselben Stelle stehen
  const fahnen = useMemo(() => {
    const liste: { p: P; farbe: string; titel: string }[] = [{ p: [0, 0], farbe: FARBE.standort, titel: "Standort" }];
    denkmale.forEach((d) => {
      let p = ankerpunkt(d.umriss as P[][]);
      while (liste.some((f) => Math.hypot(f.p[0] - p[0], f.p[1] - p[1]) < 4)) p = [p[0] + 4.5, p[1] + 1.5];
      liste.push({ p, farbe: d.amStandort ? FARBE.hier : d.gruppe ? FARBE.gruppe : FARBE.einzel, titel: `${d.name} – ${d.ausweisung}${d.amStandort ? "" : ` (${d.entfernungM} m)`}` });
    });
    return liste;
  }, [denkmale]);

  // Reihenfolge: erst der Standort, dann jeweils das nächstgelegene Denkmal
  const reihenfolge = useMemo(() => {
    const folge = [0];
    const offen = fahnen.slice(1).map((f, i) => ({ ...f, i: i + 1 }));
    let aktuell: P = [0, 0];
    while (offen.length) {
      offen.sort((a, b) => Math.hypot(a.p[0] - aktuell[0], a.p[1] - aktuell[1]) - Math.hypot(b.p[0] - aktuell[0], b.p[1] - aktuell[1]));
      const n = offen.shift()!;
      folge.push(n.i);
      aktuell = n.p;
    }
    return folge;
  }, [fahnen]);

  const [gesteckt, setGesteckt] = useState<boolean[]>([]);

  useEffect(() => {
    let aktiv = true;
    let gestartet = false;
    const zeitgeber: ReturnType<typeof setTimeout>[] = [];
    const setze = (i: number) => aktiv && setGesteckt((g) => (g[i] ? g : Object.assign([...g], { [i]: true })));
    const alleSetzen = () => fahnen.forEach((_, i) => setze(i));

    /** Bildschirmposition des Fahnenfußes – null, wenn sie nicht sichtbar ist (dann steckt der Gecko sie nicht). */
    const punkt = (i: number) => () => {
      const svg = svgRef.current;
      const ctm = svg?.isConnected ? svg.getScreenCTM() : null;
      if (!svg || !ctm) return null;
      const [bx, by] = bild(ansichtRef.current, fahnen[i].p[0], fahnen[i].p[1]);
      const q = new DOMPoint(bx, by).matrixTransform(ctm);
      const karte = svg.getBoundingClientRect();
      const r = (svg.closest(".verlauf") ?? document.documentElement).getBoundingClientRect();
      const oben = Math.max(r.top, karte.top, 0) + 16;
      const unten = Math.min(r.bottom, karte.bottom, window.innerHeight) - 12;
      if (q.y < oben || q.y > unten || q.x < karte.left + 8 || q.x > karte.right - 8) return null;
      return { x: q.x, y: q.y };
    };

    const los = () => {
      const auftrag: GeckoFahnenAuftrag = {
        ziel: id,
        punkte: reihenfolge.map(punkt),
        gesetzt: (k) => setze(reihenfolge[k]),
        alleSetzen,
        angenommen: false,
      };
      if (!bewegungAus()) window.dispatchEvent(new CustomEvent("gecko-fahnen", { detail: auftrag }));
      if (!auftrag.angenommen) {
        // kein Gecko unterwegs: Fahnen von selbst (ohne Animationen sofort)
        const abstand = bewegungAus() ? 0 : 220;
        reihenfolge.forEach((i, k) => zeitgeber.push(setTimeout(() => setze(i), abstand ? 150 + k * abstand : 0)));
      } else {
        zeitgeber.push(setTimeout(alleSetzen, 90000)); // Sicherheitsnetz
      }
    };

    // erst, wenn die Skizze weitgehend im Bild ist
    const beobachter = new IntersectionObserver(
      (e) => {
        if (e[0].isIntersecting && !gestartet) {
          gestartet = true;
          beobachter.disconnect();
          los();
        }
      },
      { threshold: 0.75 },
    );
    if (svgRef.current) beobachter.observe(svgRef.current);
    return () => {
      aktiv = false;
      beobachter.disconnect();
      zeitgeber.forEach(clearTimeout);
    };
  }, [fahnen, reihenfolge, id]);

  // ---------- Zeichnen ----------
  const a = ansicht;
  const z = ort ? kachelStufe(ort.lat, a.k, pxJeEinheit) : 0;
  const unten = useMemo(() => (ort ? kacheln(ort.lat, ort.lon, a, z - 1) : []), [ort, a, z]);
  const oben = useMemo(() => (ort ? kacheln(ort.lat, ort.lon, a, z) : []), [ort, a, z]);
  const plan = plaene[0];
  const planLabel = plan?.umriss.length ? ankerpunkt(plan.umriss as P[][]) : null;
  const radius = o.denkmal.status !== "fehler" ? o.denkmal.radiusM : 50;
  const [mx, my] = bild(a, 0, 0);
  const skala = massstab(a.k);
  const veraendert = a.k !== 1 || a.vx !== 0 || a.vy !== 0;
  const kachelBild = (k: { url: string; x: number; y: number; b: number; h: number }) => (
    <image key={k.url} href={k.url} x={k.x} y={k.y} width={k.b + 0.08} height={k.h + 0.08} preserveAspectRatio="none" />
  );

  return (
    <div className="skizze" id={id}>
      <div className="skizze-karte">
        <svg
          ref={svgRef}
          viewBox={`${-BREITE} ${-HOEHE} ${BREITE * 2} ${HOEHE * 2}`}
          role="img"
          tabIndex={0}
          aria-label={t(
            "Lageskizze auf einer OpenStreetMap-Karte. Pfeiltasten verschieben, Plus und Minus zoomen, 0 setzt zurück.",
            "Site map on an OpenStreetMap background. Arrow keys pan, plus and minus zoom, 0 resets.",
          )}
          className={zieht ? "zieht" : ""}
          onPointerDown={runter}
          onPointerMove={bewegt}
          onPointerUp={hoch}
          onPointerCancel={hoch}
          onDoubleClick={(ev) => {
            const { ux, uy } = imBild(ev.clientX, ev.clientY);
            zoomeUm(1.8, ux, uy);
          }}
          onKeyDown={taste}
        >
          <defs>
            <pattern id={`schraffur-${uid}`} width="3" height="3" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
              <line x1="0" y1="0" x2="0" y2="3" stroke="var(--flagge-gruppe)" strokeWidth="0.5" opacity="0.5" />
            </pattern>
            <clipPath id={`ausschnitt-${uid}`}>
              <rect x={-BREITE} y={-HOEHE} width={BREITE * 2} height={HOEHE * 2} />
            </clipPath>
          </defs>
          <rect x={-BREITE} y={-HOEHE} width={BREITE * 2} height={HOEHE * 2} className="sk-grund" />
          {/* Hintergrundkarte: OpenStreetMap (gröbere Stufe darunter, damit beim Zoomen nichts leer bleibt) */}
          <g className="sk-karte" clipPath={`url(#ausschnitt-${uid})`}>
            {unten.map(kachelBild)}
            {oben.map(kachelBild)}
          </g>
          <rect x={-BREITE} y={-HOEHE} width={BREITE * 2} height={HOEHE * 2} className="sk-schleier" />
          <g clipPath={`url(#ausschnitt-${uid})`}>
            {plaene.map((p) => (
              <path key={p.nummer} d={svgPfad(a, p.umriss as P[][])} className="sk-bplan" />
            ))}
            {denkmale
              .filter((d) => d.gruppe)
              .map((d, i) => (
                <path key={`g${i}`} d={svgPfad(a, d.umriss as P[][])} className="sk-gruppe" fill={`url(#schraffur-${uid})`} />
              ))}
            {denkmale
              .filter((d) => !d.gruppe)
              .map((d, i) => (
                <path key={`e${i}`} d={svgPfad(a, d.umriss as P[][])} className={d.amStandort ? "sk-hier" : "sk-einzel"}>
                  <title>{d.name}</title>
                </path>
              ))}
            <circle cx={mx} cy={my} r={radius * a.k} className="sk-umkreis" />
            {plan && planLabel && (
              <text x={bild(a, ...planLabel)[0]} y={bild(a, ...planLabel)[1]} className="sk-text sk-text-plan">
                B-Plan {plan.nummer}
              </text>
            )}
            {/* Fähnchen (bleiben beim Zoomen gleich groß) */}
            {fahnen.map((f, i) => {
              const [fx, fy] = bild(a, f.p[0], f.p[1]);
              return (
                <g key={i} className={`sk-fahne ${gesteckt[i] ? "steht" : ""}`} transform={`translate(${fx.toFixed(2)} ${fy.toFixed(2)})`}>
                  <title>{i === 0 ? t("Standort", "Location") : f.titel}</title>
                  <line x1="0" y1="0" x2="0" y2="-9" />
                  <path d="M0 -9 L7.5 -7 L0 -5 Z" fill={f.farbe} />
                  <circle r="0.9" />
                </g>
              );
            })}
          </g>
          {/* Nordpfeil, Maßstab, Kartenquelle */}
          <g transform={`translate(${BREITE - 8} ${-HOEHE + 9})`} className="sk-nord">
            <path d="M0 -5 L2.5 3 L0 1.5 L-2.5 3 Z" />
            <text y="9" className="sk-text">
              N
            </text>
          </g>
          <g transform={`translate(${-BREITE + 6} ${HOEHE - 6})`} className="sk-massstab">
            <line x1="0" y1="0" x2={skala.laenge} y2="0" />
            <line x1="0" y1="-1.5" x2="0" y2="1.5" />
            <line x1={skala.laenge} y1="-1.5" x2={skala.laenge} y2="1.5" />
            <text x={skala.laenge / 2} y="-2.5" className="sk-text">
              {skala.m} m
            </text>
          </g>
          {ort && (
            <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">
              <text x={BREITE - 1.5} y={HOEHE - 1.8} className="sk-text sk-osm">
                © {t("OpenStreetMap-Mitwirkende", "OpenStreetMap contributors")}
              </text>
            </a>
          )}
        </svg>
        <div className="karten-knoepfe">
          <button type="button" onClick={() => zoomeUm(1.4)} aria-label={t("Hineinzoomen", "Zoom in")} title={t("Hineinzoomen", "Zoom in")}>
            +
          </button>
          <button type="button" onClick={() => zoomeUm(1 / 1.4)} aria-label={t("Herauszoomen", "Zoom out")} title={t("Herauszoomen", "Zoom out")}>
            −
          </button>
          <button type="button" onClick={() => setAnsicht(START)} disabled={!veraendert} aria-label={t("Ansicht zurücksetzen", "Reset view")} title={t("Ansicht zurücksetzen", "Reset view")}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <circle cx="12" cy="12" r="3" />
              <path d="M12 2v4M12 18v4M2 12h4M18 12h4" />
            </svg>
          </button>
        </div>
      </div>
      <ul className="sk-legende">
        <li>
          <i style={{ background: "var(--flagge-standort)" }} /> {t("Standort", "Location")}
        </li>
        <li>
          <i style={{ background: "var(--flagge-hier)" }} /> {t("Denkmal am Standort", "Monument at the location")}
        </li>
        <li>
          <i style={{ background: "var(--flagge-einzel)" }} /> {t("Einzeldenkmal in der Umgebung", "Individual monument nearby")}
        </li>
        <li>
          <i style={{ background: "var(--flagge-gruppe)" }} /> {t("Denkmalgruppe", "Monument ensemble")}
        </li>
        <li>
          <i className="strich" /> {t("B-Plan-Geltungsbereich", "Development plan area")}
        </li>
        <li>
          <i className="kreis" /> {t(`Umkreis ${radius} m`, `${radius} m radius`)}
        </li>
      </ul>
      <p className="sk-hinweis">
        {t("Lageskizze, keine amtliche Karte. Umrisse: Stadt Oldenburg, Denkmalatlas Niedersachsen. Karte:", "Sketch, not an official map. Outlines: City of Oldenburg, Lower Saxony monument atlas. Map:")}{" "}
        <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">
          © {t("OpenStreetMap-Mitwirkende", "OpenStreetMap contributors")}
        </a>
        .
      </p>
    </div>
  );
}
