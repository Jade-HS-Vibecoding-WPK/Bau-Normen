"use client";
// Der Gecko – als bewegliches Skelett gezeichnet (Kopf, Rumpf, Becken, Schwanzglieder, vier Beine).
//
// Gang wie beim echten Gecko:
//  - diagonale Beinpaare im Wechsel (vorne links + hinten rechts, dann vorne rechts + hinten links)
//  - aufgesetzte Füße bleiben am Boden kleben, der Körper zieht darüber hinweg
//  - der Rumpf knickt im Takt abwechselnd zur Seite ein, der Schwanz schwingt als Welle nach
// Verhalten auf der Seite:
//  - läuft quer über den Bildschirm von Kasten zu Kasten und bleibt jeweils am rechten Rand stehen
//    (Körpermitte auf der Kante, Blickrichtung = Laufrichtung); klebt dort beim Scrollen fest
//  - setzt sich an neue Antworten; muss er umkehren, wendet er auf der Stelle (nie rückwärts)
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
}
type Anker = () => Platz | null;

// Kästen, an deren rechtem Rand der Gecko stehen bleibt
const KAESTEN = ".leiste .block, .arbeitsbereich, .verlauf .dokument, .verlauf .meldung";

/** Platz am rechten Rand eines Kastens; `anteil` = Höhe im sichtbaren Teil (0 = oben, 1 = unten). */
const AM_RAND =
  (el: Element, anteil: number): Anker =>
  () => {
    if (!el.isConnected) return null;
    const r = el.getBoundingClientRect();
    const oben = Math.max(r.top + 28, 110);
    const unten = Math.min(r.bottom - 28, window.innerHeight - 70);
    if (unten - oben < 16 || r.right > window.innerWidth - 12 || r.right < 30) return null;
    return { x: r.right, y: oben + (unten - oben) * anteil };
  };
const HEIM: Anker = () => {
  const el = document.querySelector(".arbeitsbereich");
  return el ? AM_RAND(el, 0.85)() : null;
};
/** Zufälliger Platz an einem anderen Kasten – bevorzugt weiter weg, damit er quer über den Bildschirm läuft */
function anderenPlatz(von: V, ausser: Element | null): { anker: Anker; el: Element } | null {
  const kandidaten = [...document.querySelectorAll(KAESTEN)]
    .filter((el) => el !== ausser)
    .flatMap((el) => {
      const anker = AM_RAND(el, zufall(0.15, 0.85));
      const q = anker();
      return q ? [{ el, anker, d: laenge(minus(v(q.x, q.y), von)) }] : [];
    });
  const weit = kandidaten.filter((k) => k.d > 180);
  const auswahl = weit.length ? weit : kandidaten;
  return auswahl.length ? auswahl[Math.floor(Math.random() * auswahl.length)] : null;
}
/** Platz an einer neuen Antwort (oder, wenn das Ziel nicht im Bild ist, an der ganzen Antwortkarte) */
const AN_ANTWORT = (id: string): { anker: Anker; el: Element } | null => {
  const el = document.getElementById(id);
  if (!el) return null;
  for (const k of [el, el.closest(".dokument")]) {
    if (!k) continue;
    const anker = AM_RAND(k, 0.25);
    if (anker()) return { anker, el: k };
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
    const start = HEIM() ?? { x: window.innerWidth - 40, y: window.innerHeight - 120 };
    let w = -90; // Blickrichtung des Kopfes
    let kopf = plus(v(start.x, start.y), mal(richtung(w), S[MITTE]));
    // Spur der Kopfpositionen (neueste zuerst) – der Körper folgt ihr wie auf Schienen
    let spur: V[] = [kopf, minus(kopf, mal(richtung(w), S[N - 1] + 30))];
    let phi = 0; // Schrittphase
    let geht = false;
    let modus: "sitzt" | "laeuft" = "sitzt";
    let anker: Anker = HEIM;
    let ankerEl: Element | null = document.querySelector(".arbeitsbereich");
    let ankerVorher: V | null = v(start.x, start.y);
    let reiseWinkel = w; // Laufrichtung der aktuellen Strecke (so steht er am Ziel)
    let bis = performance.now() + zufall(6000, 12000);
    let sitzDauer = 10000; // wie lange er am nächsten Rand bleibt (zählt ab dem Ankommen)
    const tempo = 80;
    let e = 0; // 0 = normal, 1 = eingerollt
    let kopfDreh = 0;
    let kopfDrehZiel = 0;
    let kopfNaechst = performance.now() + zufall(3000, 6000);
    let schwanzRolle = 1; // 0 = gerade, 1 = im Stehen leicht eingerollt
    let ruhe = 1; // 0 = läuft, 1 = steht – im Stehen gehen Beine und Rumpf einmal sanft in die Ruhepose
    let drehRest = 0; // noch auszuführende Körperdrehung im Stehen (Grad)
    let drehNaechst = performance.now() + zufall(15000, 30000);
    let drehVersatz = 0;

    const verschiebe = (d: V) => {
      kopf = plus(kopf, d);
      spur = spur.map((q) => plus(q, d));
    };
    /** ganze Figur um die Körpermitte drehen (Wenden auf der Stelle, kleines Drehen im Stehen) */
    const rotiere = (grad: number) => {
      const c = mitte.current;
      const cs = Math.cos(grad * RAD);
      const sn = Math.sin(grad * RAD);
      const um = (q: V) => v(c.x + (q.x - c.x) * cs - (q.y - c.y) * sn, c.y + (q.x - c.x) * sn + (q.y - c.y) * cs);
      kopf = um(kopf);
      spur = spur.map(um);
      w += grad;
    };
    const geheZu = (ziel: { anker: Anker; el: Element | null } | null, sitzen: number) => {
      const q = ziel?.anker();
      if (!ziel || !q) return false;
      anker = ziel.anker;
      ankerEl = ziel.el;
      modus = "laeuft";
      ankerVorher = v(q.x, q.y);
      reiseWinkel = winkelVon(minus(v(q.x, q.y), mitte.current));
      sitzDauer = sitzen;
      bis = Infinity;
      return true;
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
    let wartendesZiel: { id: string; ab: number; bis: number } | null = null;
    let letzte = performance.now();
    let frame = 0;

    const tick = (t: number) => {
      const dt = Math.min(0.05, (t - letzte) / 1000);
      letzte = t;
      const sig = aktuell.current;

      // ---------- Signale aus der App ----------
      if (neu.current) {
        neu.current = false;
        wartendesZiel = sig.modus === "neu" && sig.ziel && !ruhig ? { id: sig.ziel, ab: t + 700, bis: t + 4500 } : null;
      }
      if (wartendesZiel && t >= wartendesZiel.ab && !halten.current) {
        if (geheZu(AN_ANTWORT(wartendesZiel.id), zufall(12000, 18000))) wartendesZiel = null;
        else if (t > wartendesZiel.bis) wartendesZiel = null;
      }

      // ---------- Ziel und Bewegung ----------
      e += ((halten.current ? 1 : 0) - e) * Math.min(1, dt * 7);
      geht = false;
      let platz = anker();
      if (!platz && !halten.current) {
        // Kasten verschwunden oder aus dem Bild gescrollt -> anderen Rand suchen
        if (!geheZu(anderenPlatz(mitte.current, ankerEl), zufall(7000, 16000))) geheZu({ anker: HEIM, el: document.querySelector(".arbeitsbereich") }, zufall(7000, 16000));
        platz = anker();
      }

      if (platz && !halten.current) {
        if (modus === "sitzt") {
          // am Rand kleben (folgt dem Scrollen)
          const jetzt = v(platz.x, platz.y);
          if (ankerVorher) {
            const d = minus(jetzt, ankerVorher);
            if (Math.abs(d.x) + Math.abs(d.y) > 0.01) verschiebe(d);
          }
          ankerVorher = jetzt;
          if (!ruhig) {
            if (sig.modus === "sucht") kopfDrehZiel = 14 * Math.sin(t / 900); // schaut sich langsam um
            else if (t > kopfNaechst) {
              // umschauen: Kopf deutlich zur Seite drehen, eine Weile halten, wieder geradeaus
              kopfDrehZiel = kopfDrehZiel === 0 ? (Math.random() < 0.5 ? -1 : 1) * zufall(10, 24) : 0;
              kopfNaechst = t + (kopfDrehZiel === 0 ? zufall(3000, 7000) : zufall(1800, 3500));
            }
            if (t > drehNaechst && drehRest === 0) {
              // ab und zu den ganzen Körper ein wenig drehen – und beim nächsten Mal wieder zurück
              drehRest = drehVersatz !== 0 ? -drehVersatz : (Math.random() < 0.5 ? -1 : 1) * zufall(6, 12);
              drehNaechst = t + zufall(15000, 30000);
            }
            // nach einer Weile zum nächsten Kasten – quer über den Bildschirm
            if (t > bis && !geheZu(anderenPlatz(mitte.current, ankerEl), zufall(7000, 16000))) bis = t + 5000;
          }
        } else if (!ruhig) {
          kopfDrehZiel = 0;
          // Körpermitte soll auf der Kante landen: Kopf steht dann ein Stück weiter in Laufrichtung
          const ziel = plus(v(platz.x, platz.y), mal(richtung(reiseWinkel), S[MITTE]));
          ankerVorher = v(platz.x, platz.y);
          const d = minus(ziel, kopf);
          const abst = laenge(d);
          if (abst < 3) {
            // angekommen: einfach stehen bleiben
            verschiebe(d);
            modus = "sitzt";
            bis = t + sitzDauer;
            drehVersatz = 0;
            drehRest = 0;
            kopfNaechst = t + zufall(2500, 5000);
            drehNaechst = t + zufall(15000, 30000);
          } else {
            const soll = winkelVon(d);
            const abw = diff(w, soll);
            // erst auf der Stelle zum Ziel drehen, dann geradeaus laufen – so landet die Körpermitte genau auf der Kante
            if (Math.abs(abw) > 20) {
              const dreh = Math.sign(abw) * Math.min(Math.abs(abw), 160 * dt);
              rotiere(dreh);
              phi += (Math.abs(dreh) / 30) * Math.PI; // Beine trippeln beim Wenden mit
            } else {
              w = drehe(w, soll, 120 * dt);
              const schritt = Math.min(abst, tempo * dt);
              kopf = plus(kopf, mal(richtung(w), schritt));
              phi += (schritt / SCHRITT) * Math.PI;
            }
            geht = true;
          }
        }
      }
      if (ruhig && platz && modus !== "sitzt") {
        // reduzierte Bewegung: ohne Laufen direkt an den Platz
        verschiebe(minus(plus(v(platz.x, platz.y), mal(richtung(reiseWinkel), S[MITTE])), kopf));
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
      // Im Stehen rollt sich die Schwanzspitze langsam ein
      const sollRolle = modus === "sitzt" && !halten.current ? 1 : 0;
      schwanzRolle += (sollRolle - schwanzRolle) * Math.min(1, dt * 1.6);
      if (Math.abs(sollRolle - schwanzRolle) < 0.003) schwanzRolle = sollRolle;
      ruhe += ((geht ? 0 : 1) - ruhe) * Math.min(1, dt * (geht ? 12 : 5));
      if (!geht && ruhe > 0.995) ruhe = 1; // nicht endlos nachschwingen
      // Langsame Körperdrehung im Stehen: ganze Figur um die Körpermitte drehen
      if (drehRest !== 0 && modus === "sitzt" && !halten.current) {
        const schrittDreh = Math.sign(drehRest) * Math.min(Math.abs(drehRest), 14 * dt);
        rotiere(schrittDreh);
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
