"use client";
// Einstellungen der Seite: Sprache (Deutsch/Englisch), Farbschema (hell/dunkel/automatisch), Gecko an/aus, Animationen an/aus.
// Gespeichert nur im Browser (localStorage) – reine Komfortfunktion, ohne Speicher funktioniert alles mit den Standardwerten.
import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import type { Sprache } from "@/lib/sprache";
import { EINSTELLUNGEN_SCHLUESSEL } from "@/lib/vorab";
import { landNamens, STANDARD_LAND } from "@/lib/laender";

export type Thema = "auto" | "hell" | "dunkel";
export interface Einstellungen {
  sprache: Sprache;
  thema: Thema;
  gecko: boolean;
  bewegung: boolean;
  /** Bundesland, dessen Gesetze gemeint sind (Bauordnung, Denkmalschutz) – nach einer Ortsauskunft das Land der Adresse */
  land: string;
}

const STANDARD: Einstellungen = { sprache: "de", thema: "auto", gecko: true, bewegung: true, land: STANDARD_LAND };
const SCHLUESSEL = EINSTELLUNGEN_SCHLUESSEL;

const Kontext = createContext<{ e: Einstellungen; setze: (teil: Partial<Einstellungen>) => void }>({ e: STANDARD, setze: () => {} });

export function EinstellungenProvider({ children }: { children: React.ReactNode }) {
  const [e, setE] = useState<Einstellungen>(STANDARD);
  // erst nach dem Laden anwenden und speichern – sonst würden die Standardwerte die gespeicherten überschreiben
  const [geladen, setGeladen] = useState(false);

  // gespeicherte Einstellungen übernehmen (auch die alte Gecko-Einstellung "bnk-gecko")
  useEffect(() => {
    try {
      const roh = JSON.parse(localStorage.getItem(SCHLUESSEL) ?? "{}") as Partial<Einstellungen>;
      const alt = localStorage.getItem("bnk-gecko");
      setE({
        sprache: roh.sprache === "en" ? "en" : "de",
        thema: roh.thema === "hell" || roh.thema === "dunkel" ? roh.thema : "auto",
        gecko: typeof roh.gecko === "boolean" ? roh.gecko : alt !== "aus",
        bewegung: roh.bewegung !== false,
        land: landNamens(roh.land)?.name ?? STANDARD_LAND,
      });
    } catch {
      /* kein Speicher verfügbar */
    }
    setGeladen(true);
  }, []);

  // auf die Seite anwenden und merken
  useEffect(() => {
    if (!geladen) return;
    const d = document.documentElement;
    d.lang = e.sprache;
    if (e.thema === "auto") delete d.dataset.theme;
    else d.dataset.theme = e.thema;
    if (e.bewegung) delete d.dataset.bewegung;
    else d.dataset.bewegung = "aus";
    try {
      localStorage.setItem(SCHLUESSEL, JSON.stringify(e));
    } catch {
      /* kein Speicher verfügbar */
    }
  }, [e, geladen]);

  const setze = useCallback((teil: Partial<Einstellungen>) => setE((alt) => ({ ...alt, ...teil })), []);
  return <Kontext.Provider value={{ e, setze }}>{children}</Kontext.Provider>;
}

export const useEinstellungen = () => useContext(Kontext);

/** t("Deutsch", "English") – Text in der eingestellten Sprache */
export function useT() {
  const { e } = useEinstellungen();
  return useCallback((de: string, en: string) => (e.sprache === "en" ? en : de), [e.sprache]);
}

/** Bewegung reduziert? (Einstellung auf der Seite oder Systemeinstellung "Bewegung reduzieren") */
export function bewegungAus(): boolean {
  if (typeof window === "undefined") return false;
  return document.documentElement.dataset.bewegung === "aus" || !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
}

// ---------- Bedienelemente im Kopf ----------

function Segment<W extends string>({ wert, optionen, onWahl, label }: { wert: W; optionen: { w: W; text: string; titel?: string }[]; onWahl: (w: W) => void; label: string }) {
  return (
    <div className="segment" role="radiogroup" aria-label={label}>
      {optionen.map((o) => (
        <button key={o.w} type="button" role="radio" aria-checked={wert === o.w} className={wert === o.w ? "an" : ""} title={o.titel} onClick={() => onWahl(o.w)}>
          {o.text}
        </button>
      ))}
    </div>
  );
}

export function SprachWahl() {
  const { e, setze } = useEinstellungen();
  return (
    <Segment
      label={e.sprache === "en" ? "Language" : "Sprache"}
      wert={e.sprache}
      onWahl={(s) => setze({ sprache: s })}
      optionen={[
        { w: "de", text: "DE", titel: "Deutsch" },
        { w: "en", text: "EN", titel: "English" },
      ]}
    />
  );
}

export function DarstellungsMenue() {
  const { e, setze } = useEinstellungen();
  const t = useT();
  const [offen, setOffen] = useState(false);
  const huelle = useRef<HTMLDivElement>(null);

  // schließen bei Klick daneben oder Escape
  useEffect(() => {
    if (!offen) return;
    const klick = (ev: MouseEvent) => !huelle.current?.contains(ev.target as Node) && setOffen(false);
    const taste = (ev: KeyboardEvent) => ev.key === "Escape" && setOffen(false);
    document.addEventListener("mousedown", klick);
    document.addEventListener("keydown", taste);
    return () => {
      document.removeEventListener("mousedown", klick);
      document.removeEventListener("keydown", taste);
    };
  }, [offen]);

  return (
    <div className="menue" ref={huelle}>
      <button type="button" className="kopf-knopf" aria-expanded={offen} aria-haspopup="true" onClick={() => setOffen(!offen)}>
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
          <path d="M4 7h10M18 7h2M4 17h4M12 17h8" />
          <circle cx="16" cy="7" r="2.2" />
          <circle cx="10" cy="17" r="2.2" />
        </svg>
        {t("Darstellung", "Display")}
      </button>
      {offen && (
        <div className="menue-panel" role="dialog" aria-label={t("Darstellung", "Display")}>
          <div className="menue-zeile">
            <span>{t("Farbschema", "Colour scheme")}</span>
            <Segment
              label={t("Farbschema", "Colour scheme")}
              wert={e.thema}
              onWahl={(thema) => setze({ thema })}
              optionen={[
                { w: "hell", text: t("Hell", "Light") },
                { w: "dunkel", text: t("Dunkel", "Dark") },
                { w: "auto", text: "Auto", titel: t("wie im Betriebssystem eingestellt", "follow the operating system") },
              ]}
            />
          </div>
          <div className="menue-zeile">
            <span>{t("Gecko", "Gecko")}</span>
            <Segment
              label="Gecko"
              wert={e.gecko ? "an" : "aus"}
              onWahl={(w) => setze({ gecko: w === "an" })}
              optionen={[
                { w: "an", text: t("Läuft", "Roams"), titel: t("läuft über die Seite und steckt Fähnchen", "walks around the page and plants flags") },
                { w: "aus", text: t("Sitzt still", "Stays put"), titel: t("bleibt an seinem Platz und zeigt nur Fehler und Hinweise", "stays in place and only signals errors and notes") },
              ]}
            />
          </div>
          <div className="menue-zeile">
            <span>{t("Animationen", "Animations")}</span>
            <Segment
              label={t("Animationen", "Animations")}
              wert={e.bewegung ? "an" : "aus"}
              onWahl={(w) => setze({ bewegung: w === "an" })}
              optionen={[
                { w: "an", text: t("An", "On") },
                { w: "aus", text: t("Aus", "Off") },
              ]}
            />
          </div>
          <p className="menue-hinweis">
            {t(
              "Der Gecko zeigt immer an, ob es Fehler (rot) oder Hinweise (orange) gibt. „Sitzt still“: Er bleibt unten rechts sitzen. Ohne Animationen bewegt sich nichts von selbst.",
              "The gecko always signals errors (red) and notes (orange). “Stays put”: it stays at the bottom right. With animations off, nothing moves by itself.",
            )}
          </p>
        </div>
      )}
    </div>
  );
}
