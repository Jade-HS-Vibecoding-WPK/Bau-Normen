"use client";
// Ein kleiner Gecko streift über die Seite – wie ein echter:
//  - läuft in kurzen, schnellen Schüben mit kleinen Pausen (stop-and-go)
//  - hält sich bevorzugt an Kanten auf (Maßband im Kopf, Ränder der Flächen, Bildschirmrand)
//  - flüchtet, wenn der Mauszeiger zu nah kommt
//  - läuft bei einer neuen Antwort zu ihr hin, bei Denkmalen nimmt er Tarnfarbe (ocker) an
// Er blockiert nie etwas (pointer-events: none) und verschwindet bei "reduzierter Bewegung" ins Ruhen.
import { useEffect, useRef } from "react";
import type { GeckoSignal } from "@/lib/gecko";
import { GeckoFigur } from "./GeckoFigur";

const B = 24; // Breite in px
const H = 40; // Höhe in px (Kopf bis Schwanzende)

interface Platz {
  x: number;
  y: number;
  /** Blickrichtung in Grad (0 = nach rechts, 90 = nach unten) */
  winkel: number;
}

const zufall = (a: number, b: number) => a + Math.random() * (b - a);
const diff = (a: number, b: number) => ((((b - a) % 360) + 540) % 360) - 180;
const drehe = (ist: number, soll: number, max: number) => {
  const d = diff(ist, soll);
  return Math.abs(d) <= max ? soll : ist + Math.sign(d) * max;
};

/** Mögliche Aufenthaltsorte: Kanten von Maßband, Flächen und Bildschirm */
function plaetze(): Platz[] {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const liste: Platz[] = [];
  const dazu = (x: number, y: number, winkel: number) => {
    if (x > 16 && x < vw - 12 && y > 24 && y < vh - 24) liste.push({ x, y, winkel });
  };
  const waag = () => (Math.random() < 0.5 ? 0 : 180);
  const senk = () => (Math.random() < 0.5 ? 90 : -90);
  const m = document.querySelector(".massband")?.getBoundingClientRect();
  if (m) for (let i = 0; i < 2; i++) dazu(zufall(m.left + 60, m.right - 60), m.top + 5, waag());
  document.querySelectorAll(".arbeitsbereich, .leiste .block").forEach((el) => {
    const r = el.getBoundingClientRect();
    if (r.height < 60) return;
    dazu(r.left, zufall(r.top + 30, r.bottom - 30), senk());
    dazu(r.right, zufall(r.top + 30, r.bottom - 30), senk());
    dazu(zufall(r.left + 30, r.right - 30), r.top, waag());
    dazu(zufall(r.left + 30, r.right - 30), r.bottom, waag());
  });
  dazu(vw - 14, zufall(120, vh - 60), senk());
  return liste;
}

/** Platz an der Oberkante eines Elements (z. B. der neuen Antwort) */
function platzAn(id: string): Platz | null {
  const el = document.getElementById(id);
  if (!el) return null;
  const r = el.getBoundingClientRect();
  const y = Math.max(40, Math.min(window.innerHeight - 40, r.top));
  return { x: Math.min(window.innerWidth - 30, r.right - zufall(30, 90)), y, winkel: 180 };
}

export default function Gecko({ signal }: { signal: GeckoSignal }) {
  const knoten = useRef<HTMLDivElement>(null);
  const aktuell = useRef(signal);
  const neu = useRef(false);

  useEffect(() => {
    aktuell.current = signal;
    neu.current = true;
  }, [signal]);

  useEffect(() => {
    const el = knoten.current!;
    const ruhig = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    const start = plaetze()[0] ?? { x: window.innerWidth - 40, y: window.innerHeight / 2, winkel: 0 };
    const s = {
      x: start.x,
      y: start.y,
      w: start.winkel,
      modus: "rast" as "rast" | "lauf" | "pause" | "dreh",
      bis: performance.now() + zufall(1500, 3500),
      ziel: null as Platz | null,
      rast: [2500, 8000] as [number, number],
      tempo: 200,
      schub: 0,
      flucht: false,
    };
    let maus = { x: -1e4, y: -1e4 };
    const zeichnen = () => {
      el.style.transform = `translate(${s.x - B / 2}px, ${s.y - H / 2}px) rotate(${s.w + 90}deg)`;
    };
    const laufZu = (p: Platz, rast: [number, number], tempo: number) => {
      s.ziel = p;
      s.rast = rast;
      s.tempo = tempo;
      s.modus = "lauf";
      s.schub = zufall(50, 170);
    };
    const wegVon = (x: number, y: number) => {
      const kandidaten = plaetze().filter((p) => Math.hypot(p.x - x, p.y - y) > 220);
      return kandidaten[Math.floor(Math.random() * kandidaten.length)] ?? plaetze()[0];
    };

    zeichnen();
    el.style.opacity = "1";
    if (ruhig) return;

    const mausBewegt = (e: MouseEvent) => {
      maus = { x: e.clientX, y: e.clientY };
    };
    window.addEventListener("mousemove", mausBewegt, { passive: true });

    let warten: ReturnType<typeof setTimeout> | undefined;
    let letzte = performance.now();
    let frame = 0;
    const tick = (t: number) => {
      const dt = Math.min(0.05, (t - letzte) / 1000);
      letzte = t;
      const sig = aktuell.current;

      // Neues Signal aus der App
      if (neu.current) {
        neu.current = false;
        clearTimeout(warten);
        if (sig.modus === "sucht") {
          const p = wegVon(s.x, s.y);
          if (p) laufZu(p, [250, 700], 320);
        } else if (sig.modus === "neu" && sig.ziel) {
          const id = sig.ziel;
          // kurz warten, bis die Antwort ins Bild gescrollt ist
          warten = setTimeout(() => {
            const p = platzAn(id);
            if (p) laufZu(p, [6000, 11000], 260);
          }, 800);
        }
      }

      // Flucht vor dem Mauszeiger
      if (!s.flucht && Math.hypot(maus.x - s.x, maus.y - s.y) < 70) {
        const p = wegVon(maus.x, maus.y);
        if (p) {
          laufZu(p, [3000, 7000], 560);
          s.flucht = true;
        }
      }

      if (s.modus === "rast") {
        if (t > s.bis) {
          s.flucht = false;
          const p = wegVon(s.x, s.y);
          const sucht = sig.modus === "sucht";
          if (p) laufZu(p, sucht ? [250, 700] : [3000, 9000], sucht ? 320 : zufall(160, 240));
        } else if (Math.random() < dt * 0.35) {
          // kurzes Kopfdrehen oder Schwanzzucken im Sitzen
          s.w += zufall(-14, 14);
          el.classList.add("zuckt");
          setTimeout(() => el.classList.remove("zuckt"), 380);
        }
      } else if (s.modus === "pause") {
        if (t > s.bis) {
          s.modus = "lauf";
          s.schub = zufall(50, 170);
        }
      } else if (s.modus === "lauf" && s.ziel) {
        const dx = s.ziel.x - s.x;
        const dy = s.ziel.y - s.y;
        const d = Math.hypot(dx, dy);
        if (d < 3) {
          s.x = s.ziel.x;
          s.y = s.ziel.y;
          s.modus = "dreh";
        } else {
          const soll = (Math.atan2(dy, dx) * 180) / Math.PI;
          s.w = drehe(s.w, soll, 600 * dt);
          const faktor = Math.abs(diff(s.w, soll)) > 50 ? 0.25 : 1;
          const v = Math.min(d, s.tempo * dt * faktor);
          s.x += Math.cos((s.w * Math.PI) / 180) * v;
          s.y += Math.sin((s.w * Math.PI) / 180) * v;
          s.schub -= v;
          if (s.schub <= 0 && !s.flucht && d > 40) {
            s.modus = "pause";
            s.bis = t + zufall(120, 520);
          }
        }
      } else if (s.modus === "dreh") {
        const soll = s.ziel?.winkel ?? s.w;
        s.w = drehe(s.w, soll, 300 * dt);
        if (Math.abs(diff(s.w, soll)) < 1) {
          s.modus = "rast";
          s.bis = t + zufall(...s.rast);
        }
      }

      el.classList.toggle("laeuft", s.modus === "lauf");
      el.style.setProperty("--takt", `${Math.max(0.09, Math.min(0.24, 32 / s.tempo))}s`);
      zeichnen();
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);

    const groesse = () => {
      s.x = Math.min(s.x, window.innerWidth - 16);
      s.y = Math.min(s.y, window.innerHeight - 24);
    };
    window.addEventListener("resize", groesse);
    return () => {
      cancelAnimationFrame(frame);
      clearTimeout(warten);
      window.removeEventListener("mousemove", mausBewegt);
      window.removeEventListener("resize", groesse);
    };
  }, []);

  return (
    <div ref={knoten} className={`gecko ${signal.farbe === "ocker" ? "ocker" : ""}`} aria-hidden="true">
      <svg viewBox="0 0 60 100" width={B} height={H}>
        <GeckoFigur />
      </svg>
    </div>
  );
}
