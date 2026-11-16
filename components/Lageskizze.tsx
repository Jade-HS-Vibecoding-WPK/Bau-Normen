"use client";
// Schematische Lageskizze der Ortsauskunft: Standort, Umkreis 50 m, B-Plan-Umring und Denkmalflächen.
// Ein kleiner Gecko krabbelt über das Grundstück und steckt an jedem Denkmal ein Fähnchen.
// Keine amtliche Karte – die Umrisse kommen aus den Datendiensten (Stadt Oldenburg, Denkmalatlas).
import { useEffect, useId, useMemo, useRef, useState } from "react";
import type { OrtAnsicht } from "@/lib/typen";
import { GeckoFigur } from "./GeckoFigur";

type P = [number, number];
const BREITE = 80; // halbe Breite des Ausschnitts in Metern
const HOEHE = 60;

const svgPfad = (ringe: P[][]) => ringe.map((r) => "M" + r.map(([x, y]) => `${x} ${-y}`).join(" L") + " Z").join(" ");

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

const FARBE = { standort: "var(--flagge-standort)", hier: "var(--flagge-hier)", einzel: "var(--flagge-einzel)", gruppe: "var(--flagge-gruppe)" };

export default function Lageskizze({ o, id }: { o: OrtAnsicht; id: string }) {
  const uid = useId().replace(/:/g, "");
  const svgRef = useRef<SVGSVGElement>(null);
  const denkmale = o.denkmal.status !== "fehler" ? o.denkmal.denkmale : [];
  const plaene = o.bplan.status !== "fehler" ? o.bplan.plaene : [];

  // Fähnchen: Standort + je Denkmal; leicht versetzt, wenn zwei an derselben Stelle stehen
  const fahnen = useMemo(() => {
    const liste: { p: P; farbe: string; titel: string }[] = [{ p: [0, 0], farbe: FARBE.standort, titel: "Standort" }];
    denkmale.forEach((d) => {
      let p = ankerpunkt(d.umriss as P[][]);
      while (liste.some((f) => Math.hypot(f.p[0] - p[0], f.p[1] - p[1]) < 4)) p = [p[0] + 4.5, p[1] + 1.5];
      liste.push({ p, farbe: d.amStandort ? FARBE.hier : d.gruppe ? FARBE.gruppe : FARBE.einzel, titel: `${d.name} – ${d.ausweisung}${d.amStandort ? " (am Standort)" : ` (${d.entfernungM} m)`}` });
    });
    return liste;
  }, [denkmale]);

  // Krabbelweg: von unten links zum Standort, dann jeweils zum nächstgelegenen Denkmal
  const weg = useMemo(() => {
    const punkte: { p: P; fahne: number }[] = [{ p: [-BREITE + 6, -HOEHE + 8], fahne: -1 }, { p: [0, 0], fahne: 0 }];
    const offen = fahnen.slice(1).map((f, i) => ({ ...f, i: i + 1 }));
    let aktuell: P = [0, 0];
    while (offen.length) {
      offen.sort((a, b) => Math.hypot(a.p[0] - aktuell[0], a.p[1] - aktuell[1]) - Math.hypot(b.p[0] - aktuell[0], b.p[1] - aktuell[1]));
      const n = offen.shift()!;
      punkte.push({ p: [n.p[0] - 3, n.p[1] - 2], fahne: n.i });
      aktuell = n.p;
    }
    return punkte;
  }, [fahnen]);

  const [gesteckt, setGesteckt] = useState<number>(-1); // Index der letzten gesteckten Fahne
  const [gecko, setGecko] = useState<{ p: P; winkel: number; laeuft: boolean }>({ p: weg[0].p, winkel: 0, laeuft: false });

  useEffect(() => {
    const ruhig = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    const ende = weg[weg.length - 1].p;
    if (ruhig) {
      setGesteckt(fahnen.length - 1);
      setGecko({ p: ende, winkel: 0, laeuft: false });
      return;
    }
    const laengen = weg.slice(1).map((w, i) => Math.hypot(w.p[0] - weg[i].p[0], w.p[1] - weg[i].p[1]));
    const gesamt = laengen.reduce((s, l) => s + l, 0);
    const tempo = Math.max(40, gesamt / 6); // Meter pro Sekunde, max. ca. 6 s
    let start = 0;
    let frame = 0;
    let gestartet = false;
    const schritt = (t: number) => {
      if (!start) start = t;
      let rest = ((t - start) / 1000) * tempo;
      let i = 0;
      while (i < laengen.length && rest > laengen[i]) {
        rest -= laengen[i];
        i++;
      }
      if (i >= laengen.length) {
        setGesteckt(fahnen.length - 1);
        setGecko((g) => ({ ...g, p: ende, laeuft: false }));
        return;
      }
      const a = weg[i].p;
      const b = weg[i + 1].p;
      const f = laengen[i] ? rest / laengen[i] : 1;
      setGecko({ p: [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f], winkel: (Math.atan2(-(b[1] - a[1]), b[0] - a[0]) * 180) / Math.PI, laeuft: true });
      setGesteckt(Math.max(...weg.slice(0, i + 1).map((w) => w.fahne)));
      frame = requestAnimationFrame(schritt);
    };
    // erst loslaufen, wenn die Skizze sichtbar ist
    const beobachter = new IntersectionObserver(
      (e) => {
        if (e[0].isIntersecting && !gestartet) {
          gestartet = true;
          frame = requestAnimationFrame(schritt);
        }
      },
      { threshold: 0.4 },
    );
    if (svgRef.current) beobachter.observe(svgRef.current);
    return () => {
      beobachter.disconnect();
      cancelAnimationFrame(frame);
    };
  }, [weg, fahnen.length]);

  const plan = plaene[0];
  const planLabel = plan?.umriss.length ? ankerpunkt(plan.umriss as P[][]) : null;

  return (
    <div className="skizze" id={id}>
      <svg ref={svgRef} viewBox={`${-BREITE} ${-HOEHE} ${BREITE * 2} ${HOEHE * 2}`} role="img" aria-label="Schematische Lageskizze des Standorts">
        <defs>
          <pattern id={`raster-${uid}`} width="10" height="10" patternUnits="userSpaceOnUse">
            <path d="M10 0 L0 0 0 10" fill="none" stroke="var(--line)" strokeWidth="0.25" />
          </pattern>
          <pattern id={`schraffur-${uid}`} width="3" height="3" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <line x1="0" y1="0" x2="0" y2="3" stroke="var(--flagge-gruppe)" strokeWidth="0.5" opacity="0.5" />
          </pattern>
          <clipPath id={`ausschnitt-${uid}`}>
            <rect x={-BREITE} y={-HOEHE} width={BREITE * 2} height={HOEHE * 2} />
          </clipPath>
        </defs>
        <rect x={-BREITE} y={-HOEHE} width={BREITE * 2} height={HOEHE * 2} fill="var(--surface-2)" />
        <rect x={-BREITE} y={-HOEHE} width={BREITE * 2} height={HOEHE * 2} fill={`url(#raster-${uid})`} />
        <g clipPath={`url(#ausschnitt-${uid})`}>
          {plaene.map((p) => (
            <path key={p.nummer} d={svgPfad(p.umriss as P[][])} className="sk-bplan" />
          ))}
          {denkmale
            .filter((d) => d.gruppe)
            .map((d, i) => (
              <path key={`g${i}`} d={svgPfad(d.umriss as P[][])} className="sk-gruppe" fill={`url(#schraffur-${uid})`} />
            ))}
          {denkmale
            .filter((d) => !d.gruppe)
            .map((d, i) => (
              <path key={`e${i}`} d={svgPfad(d.umriss as P[][])} className={d.amStandort ? "sk-hier" : "sk-einzel"}>
                <title>{d.name}</title>
              </path>
            ))}
          <circle cx="0" cy="0" r={o.denkmal.status !== "fehler" ? o.denkmal.radiusM : 50} className="sk-umkreis" />
        </g>
        {plan && planLabel && (
          <text x={planLabel[0]} y={-planLabel[1]} className="sk-text sk-text-plan">
            B-Plan {plan.nummer}
          </text>
        )}
        {/* Fähnchen */}
        {fahnen.map((f, i) => (
          <g key={i} className={`sk-fahne ${i <= gesteckt ? "steht" : ""}`} transform={`translate(${f.p[0]} ${-f.p[1]})`}>
            <title>{f.titel}</title>
            <line x1="0" y1="0" x2="0" y2="-9" />
            <path d="M0 -9 L7.5 -7 L0 -5 Z" fill={f.farbe} />
            <circle r="0.9" />
          </g>
        ))}
        {/* Mini-Gecko (gleiche Silhouette wie auf der Seite, ca. 14 m lang) */}
        <g className={`sk-gecko ${gecko.laeuft ? "laeuft" : ""}`} transform={`translate(${gecko.p[0]} ${-gecko.p[1]}) rotate(${gecko.winkel + 90}) scale(0.14) translate(-30 -45)`}>
          <GeckoFigur />
        </g>
        {/* Nordpfeil und Maßstab */}
        <g transform={`translate(${BREITE - 8} ${-HOEHE + 9})`} className="sk-nord">
          <path d="M0 -5 L2.5 3 L0 1.5 L-2.5 3 Z" />
          <text y="9" className="sk-text">
            N
          </text>
        </g>
        <g transform={`translate(${-BREITE + 6} ${HOEHE - 6})`} className="sk-massstab">
          <line x1="0" y1="0" x2="20" y2="0" />
          <line x1="0" y1="-1.5" x2="0" y2="1.5" />
          <line x1="20" y1="-1.5" x2="20" y2="1.5" />
          <text x="10" y="-2.5" className="sk-text">
            20 m
          </text>
        </g>
      </svg>
      <ul className="sk-legende">
        <li>
          <i style={{ background: "var(--flagge-standort)" }} /> Standort
        </li>
        <li>
          <i style={{ background: "var(--flagge-hier)" }} /> Denkmal am Standort
        </li>
        <li>
          <i style={{ background: "var(--flagge-einzel)" }} /> Einzeldenkmal in der Umgebung
        </li>
        <li>
          <i style={{ background: "var(--flagge-gruppe)" }} /> Denkmalgruppe
        </li>
        <li>
          <i className="strich" /> B-Plan-Geltungsbereich
        </li>
        <li>
          <i className="kreis" /> Umkreis {o.denkmal.status !== "fehler" ? o.denkmal.radiusM : 50} m
        </li>
      </ul>
      <p className="sk-hinweis">Schematische Lageskizze, keine amtliche Karte. Umrisse: Stadt Oldenburg, Denkmalatlas Niedersachsen.</p>
    </div>
  );
}
