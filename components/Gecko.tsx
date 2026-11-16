"use client";
// Der Gecko sitzt an den Kanten der Website fest – Stammplatz: unten rechts am Rand der Auskunftsfläche.
//  - Bei einer neuen Antwort krabbelt er gemächlich an deren Kante und kehrt später zurück.
//  - Ab und zu wechselt er (selten) an eine andere Kante, z. B. ans Maßband im Kopf.
//  - Fährt man mit der Maus über ihn, rollt er sich ein.
//  - Gibt es Fehler oder wurde etwas nicht erkannt, wird er orange (Hinweis) bzw. rot (Fehler);
//    beim Darüberfahren zeigt er die Liste an.
// Kein Text wird von einer KI erzeugt – alles folgt festen Regeln (lib/gecko.ts).
import { useEffect, useRef, useState } from "react";
import type { GeckoSignal } from "@/lib/gecko";
import { GeckoFigur } from "./GeckoFigur";

const B = 36; // Breite in px
const H = 60; // Höhe in px

interface Platz {
  x: number;
  y: number;
  /** Blickrichtung in Grad (0 = rechts, 90 = unten, -90 = oben) */
  winkel: number;
}
type Anker = () => Platz | null;

const zufall = (a: number, b: number) => a + Math.random() * (b - a);
const diff = (a: number, b: number) => ((((b - a) % 360) + 540) % 360) - 180;
const drehe = (ist: number, soll: number, max: number) => {
  const d = diff(ist, soll);
  return Math.abs(d) <= max ? soll : ist + Math.sign(d) * max;
};
const rect = (sel: string) => document.querySelector(sel)?.getBoundingClientRect() ?? null;

// Ankerplätze an Kanten (werden jedes Bild neu berechnet, damit der Gecko beim Scrollen "kleben" bleibt)
const HEIM: Anker = () => {
  const r = rect(".arbeitsbereich");
  if (!r) return null;
  return { x: r.right, y: Math.min(window.innerHeight - 40, r.bottom - 44), winkel: -90 };
};
const MASSBAND: Anker = () => {
  const r = rect(".massband");
  if (!r || r.bottom < 0) return null;
  return { x: Math.min(r.right - 120, window.innerWidth - 140), y: r.top + 5, winkel: 180 };
};
const SEITENBLOCK: Anker = () => {
  const r = rect(".leiste .block");
  if (!r || r.top < 0 || r.bottom > window.innerHeight) return null;
  return { x: r.right, y: r.top + Math.min(70, r.height / 2), winkel: 90 };
};
const AN_ELEMENT =
  (id: string): Anker =>
  () => {
    const el = document.getElementById(id);
    if (!el) return null;
    const r = el.getBoundingClientRect();
    const oben = Math.max(r.top + 34, 60);
    if (oben > Math.min(r.bottom - 20, window.innerHeight - 90)) return null; // nicht (mehr) im Bild
    return { x: r.right, y: oben, winkel: -90 };
  };

export default function Gecko({ signal }: { signal: GeckoSignal }) {
  const knoten = useRef<HTMLDivElement>(null);
  const aktuell = useRef(signal);
  const neu = useRef(false);
  const halten = useRef(false);
  const pos = useRef({ x: 0, y: 0 });
  const verlassen = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const [eingerollt, setEingerollt] = useState(false);
  const [tipp, setTipp] = useState<{ x: number; y: number } | null>(null);

  const stufe = signal.probleme.some((p) => p.stufe === "fehler") ? "fehler" : signal.probleme.length ? "warnung" : "";

  useEffect(() => {
    aktuell.current = signal;
    neu.current = true;
  }, [signal]);

  useEffect(() => {
    const el = knoten.current!;
    const ruhig = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    const start = HEIM() ?? { x: window.innerWidth - 30, y: window.innerHeight - 80, winkel: -90 };
    const s = {
      x: start.x,
      y: start.y,
      w: start.winkel,
      modus: "sitzt" as "sitzt" | "laeuft" | "dreht",
      anker: HEIM as Anker, // wo er gerade sitzt bzw. hinläuft
      bis: performance.now() + zufall(45000, 90000), // wann er seinen Platz wieder verlässt
      tempo: 110,
    };
    const zeichnen = () => {
      pos.current = { x: s.x, y: s.y };
      el.style.transform = `translate(${s.x - B / 2}px, ${s.y - H / 2}px) rotate(${s.w + 90}deg)`;
    };
    const geheZu = (anker: Anker, sitzen: number, tempo = 110) => {
      if (!anker()) return;
      s.anker = anker;
      s.modus = "laeuft";
      s.tempo = tempo;
      s.bis = performance.now() + sitzen;
    };

    zeichnen();
    el.style.opacity = "1";

    let warten: ReturnType<typeof setTimeout> | undefined;
    let letzte = performance.now();
    let frame = 0;
    const tick = (t: number) => {
      const dt = Math.min(0.05, (t - letzte) / 1000);
      letzte = t;
      const sig = aktuell.current;

      if (neu.current) {
        neu.current = false;
        clearTimeout(warten);
        if (sig.modus === "neu" && sig.ziel && !ruhig) {
          const ziel = AN_ELEMENT(sig.ziel);
          // kurz warten, bis die Antwort ins Bild gescrollt ist
          warten = setTimeout(() => geheZu(ziel, zufall(12000, 18000)), 900);
        }
      }

      let p = s.anker();
      if (!p) {
        // Element verschwunden oder aus dem Bild gescrollt -> gemächlich heimlaufen
        s.anker = HEIM;
        if (s.modus !== "laeuft") s.modus = "laeuft";
        p = HEIM();
      }
      if (!p) {
        frame = requestAnimationFrame(tick);
        return;
      }

      if (halten.current) {
        // Maus ist über ihm: stillhalten (eingerollt), aber am Anker kleben bleiben
        if (s.modus === "sitzt") {
          s.x = p.x;
          s.y = p.y;
        }
      } else if (ruhig) {
        s.x = p.x;
        s.y = p.y;
        s.w = p.winkel;
      } else if (s.modus === "sitzt") {
        // am Anker kleben (folgt Scrollen) und ab und zu den Kopf drehen
        s.x += (p.x - s.x) * Math.min(1, dt * 14);
        s.y += (p.y - s.y) * Math.min(1, dt * 14);
        if (Math.random() < dt * 0.12) {
          s.w = p.winkel + zufall(-12, 12);
          el.classList.add("zuckt");
          setTimeout(() => el.classList.remove("zuckt"), 380);
        } else s.w = drehe(s.w, p.winkel, 40 * dt);
        if (t > s.bis) {
          if (s.anker !== HEIM) geheZu(HEIM, zufall(45000, 90000));
          else {
            const ausflug = Math.random() < 0.5 ? MASSBAND : SEITENBLOCK;
            if (ausflug()) geheZu(ausflug, zufall(15000, 30000));
            else s.bis = t + zufall(45000, 90000);
          }
        }
      } else if (s.modus === "laeuft") {
        const dx = p.x - s.x;
        const dy = p.y - s.y;
        const d = Math.hypot(dx, dy);
        if (d < 2) {
          s.x = p.x;
          s.y = p.y;
          s.modus = "dreht";
        } else {
          const soll = (Math.atan2(dy, dx) * 180) / Math.PI;
          s.w = drehe(s.w, soll, 360 * dt);
          const faktor = Math.abs(diff(s.w, soll)) > 45 ? 0.2 : 1;
          const v = Math.min(d, s.tempo * dt * faktor);
          s.x += Math.cos((s.w * Math.PI) / 180) * v;
          s.y += Math.sin((s.w * Math.PI) / 180) * v;
        }
      } else if (s.modus === "dreht") {
        s.w = drehe(s.w, p.winkel, 240 * dt);
        if (Math.abs(diff(s.w, p.winkel)) < 1) s.modus = "sitzt";
      }

      el.classList.toggle("laeuft", s.modus === "laeuft" && !halten.current);
      el.classList.toggle("wartet", sig.modus === "sucht");
      zeichnen();
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(frame);
      clearTimeout(warten);
    };
  }, []);

  const rein = () => {
    clearTimeout(verlassen.current);
    halten.current = true;
    setEingerollt(true);
    setTipp({ ...pos.current });
  };
  const raus = () => {
    clearTimeout(verlassen.current);
    verlassen.current = setTimeout(() => {
      halten.current = false;
      setEingerollt(false);
      setTipp(null);
    }, 450);
  };

  // Liste links neben dem Gecko (bzw. rechts, wenn links kein Platz ist)
  const tippStil = tipp
    ? (() => {
        const breite = 300;
        const links = tipp.x - B / 2 - 12 - breite;
        return {
          left: links > 8 ? links : Math.min(tipp.x + B / 2 + 12, window.innerWidth - breite - 8),
          top: Math.max(8, Math.min(tipp.y - 40, window.innerHeight - 220)),
          width: breite,
        };
      })()
    : undefined;

  return (
    <>
      <div
        ref={knoten}
        className={`gecko ${stufe} ${eingerollt ? "eingerollt" : ""}`}
        onMouseEnter={rein}
        onMouseLeave={raus}
        onClick={() => (eingerollt ? raus() : rein())}
        role="img"
        aria-label={stufe ? `Gecko: ${signal.probleme.length} ${signal.probleme.length === 1 ? "Hinweis" : "Hinweise"}` : "Gecko"}
      >
        <svg viewBox="0 0 60 100" width={B} height={H}>
          <GeckoFigur />
        </svg>
      </div>
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
