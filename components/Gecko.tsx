"use client";
// Der Gecko – als bewegliches Skelett gezeichnet (Kopf, Rumpf, Becken, Schwanzglieder, vier Beine).
//
// Gang wie beim echten Gecko:
//  - diagonale Beinpaare im Wechsel (vorne links + hinten rechts, dann vorne rechts + hinten links)
//  - aufgesetzte Füße bleiben am Boden kleben, der Körper zieht darüber hinweg
//  - der Rumpf knickt im Takt abwechselnd zur Seite ein, der Schwanz schwingt als Welle nach
// Verhalten auf der Seite:
//  - Stammplatz unten rechts an der Kante der Auskunftsfläche, klebt beim Scrollen fest
//  - setzt sich an neue Antworten, macht selten einen Ausflug an eine andere Kante
//  - beim Darüberfahren rollt er sich ein (Körper als C, Schwanz drumherum, Beine angezogen)
//  - bei Fehlern rot, bei Hinweisen orange; beim Darüberfahren zeigt er die Meldungen
// Alles folgt festen Regeln – keine KI.
import { useEffect, useRef, useState } from "react";
import type { GeckoSignal } from "@/lib/gecko";

type V = { x: number; y: number };
const RAD = Math.PI / 180;
const v = (x: number, y: number): V => ({ x, y });
const plus = (a: V, b: V) => v(a.x + b.x, a.y + b.y);
const minus = (a: V, b: V) => v(a.x - b.x, a.y - b.y);
const mal = (a: V, k: number) => v(a.x * k, a.y * k);
const laenge = (a: V) => Math.hypot(a.x, a.y);
const norm = (a: V) => {
  const l = laenge(a) || 1;
  return v(a.x / l, a.y / l);
};
const richtung = (grad: number) => v(Math.cos(grad * RAD), Math.sin(grad * RAD));
const winkelVon = (a: V) => Math.atan2(a.y, a.x) / RAD;
const mische = (a: V, b: V, t: number) => v(a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t);
const rechtsVon = (f: V) => v(-f.y, f.x); // rechte Körperseite (Bildschirm: y nach unten)
const zufall = (a: number, b: number) => a + Math.random() * (b - a);
const diff = (a: number, b: number) => ((((b - a) % 360) + 540) % 360) - 180;
const drehe = (ist: number, soll: number, max: number) => {
  const d = diff(ist, soll);
  return Math.abs(d) <= max ? soll : ist + Math.sign(d) * max;
};
const sanft = (t: number) => t * t * (3 - 2 * t);
const f1 = (n: number) => n.toFixed(1);

// ---------- Körperbau (Pixel) ----------
// Wirbelpunkte 0 (Schnauze) … 12 (Schwanzspitze); SEG = Abstand zum nächsten Punkt, HALB = halbe Körperbreite
const SEG = [6.5, 7, 6.5, 10, 10, 8, 7.5, 7.5, 7.5, 7.5, 7.5, 7.5];
const HALB = [2.4, 5.6, 4.0, 5.8, 6.4, 5.2, 3.6, 2.9, 2.3, 1.8, 1.3, 0.85, 0.35];
const S = SEG.reduce<number[]>((acc, l, i) => [...acc, acc[i] + l], [0]); // Bogenlänge je Punkt
const N = HALB.length;
const MITTE = 4; // Körpermitte (Bezugspunkt für Plätze)
const SCHRITT = 18; // zurückgelegte Strecke je Beinpaar-Schritt
// Rumpfbiegung im Takt (Gewicht je Segment; vor der Mitte negativ gezählt, dahinter positiv)
const BIEG_VORN = [-0.2, 0.3, 1.0, 0.85]; // Segmente 0..3
const BIEG_HINTEN = [0.85, 1.0, 0.6]; // Segmente 4..6
// Einrollen: Krümmung je Gelenk (Grad), wird aufsummiert
const ROLLE_VORN = 19;
const ROLLE_HINTEN = [12, 16, 28, 33, 36, 38, 38, 38];

// Beine: feste, geknickte Form (vorne nach vorn, hinten nach hinten) – sie drehen sich nur am Ansatz.
// Koordinaten relativ zum Ansatz für die rechte Seite: x = nach vorn, y = nach außen.
const FORM_VORN = { gelenk: [-2.5, 9.5] as [number, number], fuss: [5.5, 15.5] as [number, number] };
const FORM_HINTEN = { gelenk: [2.5, 9.5] as [number, number], fuss: [-6.5, 15.5] as [number, number] };
const SCHWENK = 24; // Grad, um die ein Bein beim Laufen vor und zurück schwenkt

interface BeinBau {
  anker: number;
  seite: 1 | -1;
  paar: 0 | 1;
  vorne: boolean;
}
const BEINE: BeinBau[] = [
  { anker: 3, seite: -1, paar: 0, vorne: true }, // vorne links
  { anker: 3, seite: 1, paar: 1, vorne: true }, // vorne rechts
  { anker: 5, seite: -1, paar: 1, vorne: false }, // hinten links
  { anker: 5, seite: 1, paar: 0, vorne: false }, // hinten rechts
];

interface Platz {
  x: number;
  y: number;
  winkel: number;
}
type Anker = () => Platz | null;
const rect = (sel: string) => document.querySelector(sel)?.getBoundingClientRect() ?? null;

// Plätze an Kanten (Körpermitte auf der Kante, Blick parallel zur Kante)
const HEIM: Anker = () => {
  const r = rect(".arbeitsbereich");
  if (!r) return null;
  return { x: r.right, y: Math.min(window.innerHeight - 90, r.bottom - 100), winkel: -90 }; // über der Eingabezeile
};
const MASSBAND: Anker = () => {
  const r = rect(".massband");
  if (!r || r.bottom < 0) return null;
  return { x: Math.min(r.right - 160, window.innerWidth - 170), y: r.top + 5, winkel: 180 };
};
const SEITENBLOCK: Anker = () => {
  const r = rect(".leiste .block");
  if (!r || r.top < 0 || r.bottom > window.innerHeight) return null;
  return { x: r.right, y: r.top + Math.min(80, r.height / 2), winkel: 90 };
};
const AN_ELEMENT =
  (id: string): Anker =>
  () => {
    const el = document.getElementById(id);
    if (!el) return null;
    // Ziel selbst – oder, wenn es (noch) nicht im Bild ist, die sichtbare Kante der ganzen Antwortkarte
    for (const kandidat of [el, el.closest(".dokument")]) {
      if (!kandidat) continue;
      const r = kandidat.getBoundingClientRect();
      const y = Math.max(r.top + 50, 80);
      if (y <= Math.min(r.bottom - 30, window.innerHeight - 90)) return { x: r.right, y, winkel: -90 };
    }
    return null;
  };

/** Catmull-Rom-Spline durch geschlossene Punktliste -> glatter SVG-Pfad */
function glatterPfad(p: V[]): string {
  const n = p.length;
  let d = `M${f1(p[0].x)} ${f1(p[0].y)}`;
  for (let i = 0; i < n; i++) {
    const p0 = p[(i - 1 + n) % n];
    const p1 = p[i];
    const p2 = p[(i + 1) % n];
    const p3 = p[(i + 2) % n];
    const c1 = plus(p1, mal(minus(p2, p0), 1 / 6));
    const c2 = minus(p2, mal(minus(p3, p1), 1 / 6));
    d += `C${f1(c1.x)} ${f1(c1.y)} ${f1(c2.x)} ${f1(c2.y)} ${f1(p2.x)} ${f1(p2.y)}`;
  }
  return d + "Z";
}

export default function Gecko({ signal }: { signal: GeckoSignal }) {
  const rumpfRef = useRef<SVGPathElement>(null);
  const beineRef = useRef<SVGPathElement>(null);
  const zehenRef = useRef<SVGPathElement>(null);
  const ballenRef = useRef<SVGPathElement>(null);
  const augenRef = useRef<SVGPathElement>(null);
  const trefferRef = useRef<SVGCircleElement>(null);
  const aktuell = useRef(signal);
  const neu = useRef(false);
  const halten = useRef(false);
  const mitte = useRef<V>(v(0, 0));
  const verlassen = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const [eingerollt, setEingerollt] = useState(false);
  const [tipp, setTipp] = useState<V | null>(null);
  const stufe = signal.probleme.some((p) => p.stufe === "fehler") ? "fehler" : signal.probleme.length ? "warnung" : "";

  useEffect(() => {
    aktuell.current = signal;
    neu.current = true;
  }, [signal]);

  useEffect(() => {
    const ruhig = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

    // ---------- Zustand ----------
    const start = HEIM() ?? { x: window.innerWidth - 40, y: window.innerHeight - 120, winkel: -90 };
    let kopf = plus(v(start.x, start.y), mal(richtung(start.winkel), S[MITTE]));
    let w = start.winkel; // Blickrichtung des Kopfes
    // Spur der Kopfpositionen (neueste zuerst) – der Körper folgt ihr wie auf Schienen
    let spur: V[] = [kopf, minus(kopf, mal(richtung(w), S[N - 1] + 30))];
    let phi = 0; // Schrittphase
    let geht = false;
    let modus: "sitzt" | "laeuft" = "sitzt";
    let anker: Anker = HEIM;
    let ankerVorher: V | null = v(start.x, start.y);
    let zielStufe: 0 | 1 = 1; // 0 = Anlaufpunkt hinter dem Platz, 1 = Platz selbst
    let bis = performance.now() + zufall(45000, 90000);
    let tempo = 70;
    let e = 0; // 0 = normal, 1 = eingerollt
    let kopfDreh = 0;
    let kopfDrehZiel = 0;
    let kopfNaechst = performance.now() + zufall(10000, 25000); // nächste (seltene) Kopfbewegung im Sitzen
    let schwanzRolle = 1; // 0 = gerade, 1 = am Stammplatz leicht eingerollt (er startet dort)
    let ruhe = 1; // 0 = läuft, 1 = steht – im Stehen gehen Beine und Rumpf einmal sanft in die Ruhepose
    let drehRest = 0; // noch auszuführende Körperdrehung im Stehen (Grad)
    let drehNaechst = performance.now() + zufall(15000, 30000);
    let drehVersatz = 0; // aktuelle Abweichung von der Ausrichtung am Platz (Grad)

    const verschiebe = (d: V) => {
      kopf = plus(kopf, d);
      spur = spur.map((p) => plus(p, d));
    };
    const geheZu = (a: Anker, sitzen: number) => {
      if (!a()) return;
      anker = a;
      modus = "laeuft";
      zielStufe = 0;
      ankerVorher = null;
      bis = performance.now() + sitzen;
    };

    /** Winkel der Spur an Bogenlänge s (Blickrichtung) */
    const spurWinkel = (s: number) => {
      let rest = s;
      for (let i = 0; i < spur.length - 1; i++) {
        const l = laenge(minus(spur[i], spur[i + 1]));
        if (rest <= l || i === spur.length - 2) return winkelVon(minus(spur[i], spur[i + 1]));
        rest -= l;
      }
      return w;
    };
    const spurPunkt = (s: number) => {
      let rest = s;
      for (let i = 0; i < spur.length - 1; i++) {
        const seg = minus(spur[i + 1], spur[i]);
        const l = laenge(seg);
        if (rest <= l) return plus(spur[i], mal(norm(seg), rest));
        rest -= l;
      }
      const a = spur[spur.length - 2];
      const b = spur[spur.length - 1];
      return plus(b, mal(norm(minus(b, a)), rest));
    };

    // Ziel aus einer neuen Antwort: kurz warten, bis sie ins Bild gescrollt ist (höchstens ein paar Sekunden)
    let wartendesZiel: { anker: Anker; ab: number; bis: number } | null = null;
    let letzte = performance.now();
    let frame = 0;

    const tick = (t: number) => {
      const dt = Math.min(0.05, (t - letzte) / 1000);
      letzte = t;
      const sig = aktuell.current;

      // ---------- Signale aus der App ----------
      if (neu.current) {
        neu.current = false;
        wartendesZiel = sig.modus === "neu" && sig.ziel && !ruhig ? { anker: AN_ELEMENT(sig.ziel), ab: t + 700, bis: t + 4500 } : null;
      }
      if (wartendesZiel && t >= wartendesZiel.ab && !halten.current) {
        if (wartendesZiel.anker()) {
          geheZu(wartendesZiel.anker, zufall(12000, 18000));
          wartendesZiel = null;
        } else if (t > wartendesZiel.bis) wartendesZiel = null;
      }

      // ---------- Ziel und Bewegung ----------
      let platz = anker();
      if (!platz) {
        anker = HEIM;
        platz = HEIM();
        if (modus === "sitzt") {
          modus = "laeuft";
          zielStufe = 0;
        }
      }
      e += ((halten.current ? 1 : 0) - e) * Math.min(1, dt * 7);
      geht = false;

      if (platz) {
        const kopfZiel = plus(v(platz.x, platz.y), mal(richtung(platz.winkel), S[MITTE]));
        if (modus === "sitzt") {
          // am Platz kleben (folgt dem Scrollen)
          const jetzt = v(platz.x, platz.y);
          if (ankerVorher) {
            const d = minus(jetzt, ankerVorher);
            if (Math.abs(d.x) + Math.abs(d.y) > 0.01) verschiebe(d);
          } else verschiebe(minus(kopfZiel, kopf));
          ankerVorher = jetzt;
          if (!halten.current && !ruhig) {
            const daheim = anker === HEIM;
            if (sig.modus === "sucht") kopfDrehZiel = 14 * Math.sin(t / 900); // schaut sich langsam um
            else if (t > kopfNaechst) {
              // ruhig umschauen: Kopf zur Seite drehen, eine Weile halten, wieder geradeaus
              kopfDrehZiel = kopfDrehZiel === 0 ? (Math.random() < 0.5 ? -1 : 1) * (daheim ? zufall(12, 26) : zufall(8, 16)) : 0;
              kopfNaechst = t + (kopfDrehZiel === 0 ? (daheim ? zufall(3000, 7000) : zufall(6000, 14000)) : zufall(1800, 3500));
            }
            if (t > drehNaechst && drehRest === 0) {
              // ab und zu den ganzen Körper ein wenig drehen – und beim nächsten Mal wieder zurück
              drehRest = drehVersatz !== 0 ? -drehVersatz : (Math.random() < 0.5 ? -1 : 1) * zufall(6, 12);
              drehNaechst = t + zufall(15000, 30000);
            }
            if (t > bis) {
              if (anker !== HEIM) geheZu(HEIM, zufall(45000, 90000));
              else {
                const ausflug = Math.random() < 0.5 ? MASSBAND : SEITENBLOCK;
                if (ausflug()) geheZu(ausflug, zufall(15000, 30000));
                else bis = t + zufall(45000, 90000);
              }
            }
          }
        } else if (!halten.current && !ruhig) {
          kopfDrehZiel = 0;
          const anlauf = minus(kopfZiel, mal(richtung(platz.winkel), 30));
          // nah am Platz: Anlaufpunkt überspringen
          if (zielStufe === 0 && laenge(minus(kopfZiel, kopf)) < 36) zielStufe = 1;
          const ziel = zielStufe === 0 ? anlauf : kopfZiel;
          const d = minus(ziel, kopf);
          const abst = laenge(d);
          if (zielStufe === 0 && abst < 10) zielStufe = 1;
          else if (zielStufe === 1 && abst < 3) {
            // angekommen: Rest ohne Schritt angleichen und einfach stehen bleiben
            verschiebe(d);
            modus = "sitzt";
            ankerVorher = v(platz.x, platz.y);
            drehVersatz = 0;
            drehRest = 0;
            kopfNaechst = t + zufall(2500, 5000);
            drehNaechst = t + zufall(15000, 30000);
          } else {
            const soll = winkelVon(d);
            // nahe am Ziel schneller einlenken und direkt hinlaufen – sonst kreist er um den Punkt
            const nah = abst < 18;
            w = drehe(w, soll, (abst < 45 ? 420 : 220) * dt);
            const faktor = !nah && Math.abs(diff(w, soll)) > 60 ? 0.35 : 1;
            const schritt = Math.min(abst, tempo * dt * faktor);
            kopf = plus(kopf, mal(nah ? norm(d) : richtung(w), schritt));
            phi += (schritt / SCHRITT) * Math.PI;
            geht = true;
          }
        }
      }
      if (ruhig && platz && modus !== "sitzt") {
        // reduzierte Bewegung: ohne Laufen direkt an den Platz
        verschiebe(minus(plus(v(platz.x, platz.y), mal(richtung(platz.winkel), S[MITTE])), kopf));
        modus = "sitzt";
        ankerVorher = v(platz.x, platz.y);
      }

      // Spur fortschreiben
      if (laenge(minus(kopf, spur[0])) > 1.5) spur.unshift(kopf);
      else spur[0] = kopf;
      let summe = 0;
      for (let i = 1; i < spur.length; i++) {
        summe += laenge(minus(spur[i - 1], spur[i]));
        if (summe > S[N - 1] + 40) {
          spur = spur.slice(0, i + 1);
          break;
        }
      }

      // ---------- Skelett ----------
      kopfDreh += (kopfDrehZiel * (1 - e) - kopfDreh) * Math.min(1, dt * 2.5);
      if (Math.abs(kopfDrehZiel * (1 - e) - kopfDreh) < 0.05) kopfDreh = kopfDrehZiel * (1 - e);
      // Am Stammplatz rollt sich die Schwanzspitze langsam ein
      const sollRolle = modus === "sitzt" && anker === HEIM && !halten.current ? 1 : 0;
      schwanzRolle += (sollRolle - schwanzRolle) * Math.min(1, dt * 1.6);
      if (Math.abs(sollRolle - schwanzRolle) < 0.003) schwanzRolle = sollRolle;
      ruhe += ((geht ? 0 : 1) - ruhe) * Math.min(1, dt * (geht ? 12 : 5));
      if (!geht && ruhe > 0.995) ruhe = 1; // nicht endlos nachschwingen
      // Langsame Körperdrehung im Stehen: ganze Figur um die Körpermitte drehen
      if (drehRest !== 0 && modus === "sitzt" && !halten.current) {
        const schrittDreh = Math.sign(drehRest) * Math.min(Math.abs(drehRest), 14 * dt);
        const c = mitte.current;
        const cs = Math.cos(schrittDreh * RAD);
        const sn = Math.sin(schrittDreh * RAD);
        const um = (q: V) => v(c.x + (q.x - c.x) * cs - (q.y - c.y) * sn, c.y + (q.x - c.x) * sn + (q.y - c.y) * cs);
        kopf = um(kopf);
        spur = spur.map(um);
        w += schrittDreh;
        drehRest -= schrittDreh;
        drehVersatz += schrittDreh;
        if (Math.abs(drehRest) < 0.01) drehRest = 0;
      }
      // Rumpf knickt im Schritttakt abwechselnd ein; beim Stehenbleiben geht er einmal sanft in die gerade Ruhepose
      const B = 11 * Math.cos(phi) * (1 - ruhe) * (1 - e);
      const winkelSeg: number[] = [];
      for (let j = 0; j < N - 1; j++) winkelSeg.push(spurWinkel((S[j] + S[j + 1]) / 2));
      // vorne (Segmente 0..3): Biegung + Kopfdrehung + Einrollen (aufsummiert zur Mitte hin)
      let rolle = 0;
      for (let j = MITTE - 1; j >= 0; j--) {
        rolle += ROLLE_VORN * e;
        winkelSeg[j] += -B * BIEG_VORN[j] - rolle + (j <= 1 ? kopfDreh * (j === 0 ? 1 : 0.6) : 0);
      }
      // hinten (Segmente 4..11): Biegung, Schwanzwelle, Einrollen
      rolle = 0;
      for (let j = MITTE; j < N - 1; j++) {
        const k = j - MITTE;
        // Einrollen (Darüberfahren) nach links, Schwanzspitze am Stammplatz nach außen (rechts)
        rolle += (ROLLE_HINTEN[k] ?? 32) * e - (j >= 7 ? 17 * schwanzRolle * (1 - e) : 0);
        // Schwanz schwingt beim Laufen als Welle nach (an den Schritt gekoppelt, im Stehen eingefroren)
        const welle = j >= 6 ? 9 * (1 - ruhe) * Math.sin(phi - (j - 5) * 0.8) * Math.min(1, (j - 5) / 3) : 0;
        winkelSeg[j] += B * (BIEG_HINTEN[k] ?? 0) + welle * (1 - e) + rolle;
      }
      const p: V[] = new Array(N);
      p[MITTE] = spurPunkt(S[MITTE]);
      for (let j = MITTE - 1; j >= 0; j--) p[j] = plus(p[j + 1], mal(richtung(winkelSeg[j]), SEG[j]));
      for (let j = MITTE; j < N - 1; j++) p[j + 1] = minus(p[j], mal(richtung(winkelSeg[j]), SEG[j]));
      mitte.current = p[MITTE];

      // ---------- Beine (feste Form, drehen nur am Ansatz) ----------
      const beinPfad: string[] = [];
      const zehenPfad: string[] = [];
      const ballen: string[] = [];
      BEINE.forEach((b) => {
        const a = p[b.anker];
        const vorn = norm(minus(p[b.anker - 1], p[b.anker + 1]));
        const rechts = rechtsVon(vorn);
        // Schrittphase dieses Beins: Schwung nach vorn (weich), dann Stütze nach hinten (gleichmäßig).
        // Diagonale Paare sind um eine halbe Phase versetzt; im Stehen bleibt die Stellung einfach stehen.
        const psi = (((phi - b.paar * Math.PI) % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
        const f = psi < Math.PI ? -1 + 2 * sanft(psi / Math.PI) : 1 - (2 * (psi - Math.PI)) / Math.PI;
        // Beim Einrollen legen sich die Beine an den Körper (vorne nach vorn, hinten nach hinten)
        const schwenk = (SCHWENK * f * (1 - ruhe) * (1 - e) + (b.vorne ? 35 : -35) * e) * -b.seite;
        const groesse = 1 - 0.45 * e;
        const form = b.vorne ? FORM_VORN : FORM_HINTEN;
        const cs = Math.cos(schwenk * RAD);
        const sn = Math.sin(schwenk * RAD);
        const welt = ([x, y]: [number, number]) => {
          const ly = y * b.seite;
          return plus(a, plus(mal(vorn, (x * cs - ly * sn) * groesse), mal(rechts, (x * sn + ly * cs) * groesse)));
        };
        const gelenk = welt(form.gelenk);
        const fuss = welt(form.fuss);
        beinPfad.push(`M${f1(a.x)} ${f1(a.y)}L${f1(gelenk.x)} ${f1(gelenk.y)}L${f1(fuss.x)} ${f1(fuss.y)}`);
        // gespreizte Zehen mit Haftballen
        const fussWinkel = winkelVon(minus(fuss, gelenk));
        const zehLaenge = 4.4 * groesse;
        for (const z of [-58, -29, 0, 29, 58]) {
          const spitze = plus(fuss, mal(richtung(fussWinkel + z), zehLaenge));
          zehenPfad.push(`M${f1(fuss.x)} ${f1(fuss.y)}L${f1(spitze.x)} ${f1(spitze.y)}`);
          ballen.push(`M${f1(spitze.x - 1.3)} ${f1(spitze.y)}a1.3 1.3 0 1 0 2.6 0a1.3 1.3 0 1 0 -2.6 0`);
        }
      });

      // ---------- Umriss ----------
      const links: V[] = [];
      const rechtsSeite: V[] = [];
      for (let i = 0; i < N; i++) {
        const tang = norm(minus(p[Math.max(0, i - 1)], p[Math.min(N - 1, i + 1)]));
        const nRechts = rechtsVon(tang);
        links.push(minus(p[i], mal(nRechts, HALB[i])));
        rechtsSeite.push(plus(p[i], mal(nRechts, HALB[i])));
      }
      const spitzeVorn = plus(p[0], mal(norm(minus(p[0], p[1])), 2.2));
      const umriss = [spitzeVorn, ...links, ...rechtsSeite.reverse()];
      rumpfRef.current?.setAttribute("d", glatterPfad(umriss));
      beineRef.current?.setAttribute("d", beinPfad.join(""));
      zehenRef.current?.setAttribute("d", zehenPfad.join(""));
      ballenRef.current?.setAttribute("d", ballen.join(""));
      // Augen
      const kopfTang = norm(minus(p[0], p[2]));
      const kopfRechts = rechtsVon(kopfTang);
      const aug = mische(p[1], p[0], 0.3);
      const augen = [plus(aug, mal(kopfRechts, 3.5)), minus(aug, mal(kopfRechts, 3.5))]
        .map((q) => `M${f1(q.x - 1.2)} ${f1(q.y)}a1.2 1.2 0 1 0 2.4 0a1.2 1.2 0 1 0 -2.4 0`)
        .join("");
      augenRef.current?.setAttribute("d", augen);
      trefferRef.current?.setAttribute("cx", f1(p[MITTE].x));
      trefferRef.current?.setAttribute("cy", f1(p[MITTE].y));

      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(frame);

    };
  }, []);

  const rein = () => {
    clearTimeout(verlassen.current);
    halten.current = true;
    setEingerollt(true);
    setTipp({ ...mitte.current });
  };
  const raus = () => {
    clearTimeout(verlassen.current);
    verlassen.current = setTimeout(() => {
      halten.current = false;
      setEingerollt(false);
      setTipp(null);
    }, 450);
  };

  const tippStil = tipp
    ? (() => {
        const breite = 300;
        const links = tipp.x - 40 - breite;
        return {
          left: links > 8 ? links : Math.min(tipp.x + 40, window.innerWidth - breite - 8),
          top: Math.max(8, Math.min(tipp.y - 40, window.innerHeight - 220)),
          width: breite,
        };
      })()
    : undefined;

  return (
    <>
      <svg className="gecko-buehne" aria-hidden={stufe ? undefined : true}>
        <g
          className={`gecko-tier ${stufe} ${eingerollt ? "eingerollt" : ""}`}
          onMouseEnter={rein}
          onMouseLeave={raus}
          onClick={() => (eingerollt ? raus() : rein())}
          role={stufe ? "img" : undefined}
          aria-label={stufe ? `Gecko: ${signal.probleme.length} ${signal.probleme.length === 1 ? "Meldung" : "Meldungen"}` : undefined}
        >
          <path ref={beineRef} className="gecko-beine" />
          <path ref={zehenRef} className="gecko-zehen" />
          <path ref={ballenRef} className="gecko-ballen" />
          <path ref={rumpfRef} className="gecko-rumpf" />
          <path ref={augenRef} className="gecko-augen" />
          <circle ref={trefferRef} className="gecko-treffer" r="20" />
        </g>
      </svg>
      {tipp && signal.probleme.length > 0 && (
        <div className={`gecko-tipp ${stufe}`} style={tippStil} onMouseEnter={rein} onMouseLeave={raus} role="status">
          <span className="gecko-tipp-kopf">
            {signal.probleme.length} {signal.probleme.length === 1 ? "Meldung" : "Meldungen"} zur letzten Anfrage
          </span>
          <ul>
            {signal.probleme.map((p, i) => (
              <li key={i} className={p.stufe}>
                <span className="punkt" />
                {p.text}
              </li>
            ))}
          </ul>
        </div>
      )}
    </>
  );
}
