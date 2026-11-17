"use client";
// Oberfläche: Kopf (Sprache, Darstellung), Seitenleiste mit festen Formularen (Ortsauskunft, Paragraph),
// angeheftete Gebietsleiste und der Auskunfts-Verlauf (Chat).
import { useEffect, useMemo, useRef, useState } from "react";
import { type GeckoSignal, geckoSignal } from "@/lib/gecko";
import { standDatum } from "@/lib/text";
import type { Antwort, GesetzInfo, OrtAnsicht } from "@/lib/typen";
import { bewegungAus, DarstellungsMenue, SprachWahl, useEinstellungen, useT } from "./Einstellungen";
import { GebietsLeiste, NormKarte, OrtKarte } from "./Karten";
import Gecko from "./Gecko";
import { ObsidianKnopf } from "./Obsidian";
import { KopfLinien, Landschaft, LinienBild, Welle } from "./Organisch";
import { Logo } from "./Symbole";

interface Eintrag {
  id: number;
  rolle: "nutzer" | "lotse";
  text?: string;
  zeit: string;
  antworten?: Antwort[];
}

type Anfrage = { text: string } | { adresse: { strasse: string; hausnummer: string } };

/** Statische Online-Version (GitHub Pages) – wird beim Bauen festgelegt. */
const STATISCH = process.env.NEXT_PUBLIC_STATISCH === "1";

export default function ChatApp({ gesetze, obsidianPfad }: { gesetze: GesetzInfo[]; obsidianPfad: string | null }) {
  const { e } = useEinstellungen();
  const t = useT();
  const [verlauf, setVerlauf] = useState<Eintrag[]>([]);
  const [eingabe, setEingabe] = useState("");
  const [laedt, setLaedt] = useState(false);
  const [strasse, setStrasse] = useState("");
  const [hausnummer, setHausnummer] = useState("");
  const [paraGesetz, setParaGesetz] = useState(gesetze[0]?.kurz ?? "BauGB");
  const [paraNr, setParaNr] = useState("");
  const [gebietZu, setGebietZu] = useState<number | null>(null);
  const letzteRef = useRef<HTMLDivElement>(null);
  const verlaufRef = useRef<HTMLDivElement>(null);
  const strasseRef = useRef<HTMLInputElement>(null);
  const zaehler = useRef(1);

  const uhrzeit = () => new Date().toLocaleTimeString(e.sprache === "en" ? "en-GB" : "de-DE", { hour: "2-digit", minute: "2-digit" });

  const letzteAntwort = [...verlauf].reverse().find((x) => x.rolle === "lotse");
  const signal = useMemo<GeckoSignal>(
    () =>
      laedt
        ? { modus: "sucht", probleme: [], nonce: -zaehler.current }
        : letzteAntwort
          ? geckoSignal(letzteAntwort.antworten, String(letzteAntwort.id), letzteAntwort.id, e.sprache)
          : { modus: "ruhe", probleme: [], nonce: 0 },
    [laedt, letzteAntwort, e.sprache],
  );

  // Zuletzt geprüftes Gebiet: dessen Hauptinformationen stehen fest über dem Verlauf
  const gebiet = useMemo(() => {
    for (const x of [...verlauf].reverse()) {
      const j = x.antworten?.findIndex((a) => a.art === "ort" && a.ort.standort.status === "ok") ?? -1;
      if (j >= 0) return { id: x.id, kartenId: `${x.id}-${j}`, o: (x.antworten![j] as { art: "ort"; ort: OrtAnsicht }).ort };
    }
    return null;
  }, [verlauf]);

  // Neue Nachricht: an ihren Anfang scrollen, damit man oben mit dem Lesen beginnt.
  // Nur der Verlauf scrollt – die Seite selbst (Kopf, Formulare, Gebietsleiste) bleibt, wo sie ist.
  useEffect(() => {
    const v = verlaufRef.current;
    const el = letzteRef.current;
    if (!v || !el) return;
    const ziel = v.scrollTop + el.getBoundingClientRect().top - v.getBoundingClientRect().top - 16;
    v.scrollTo({ top: Math.max(0, ziel), behavior: bewegungAus() ? "auto" : "smooth" });
  }, [verlauf.length, laedt]);

  async function senden(anfrage: Anfrage, anzeige: string) {
    if (laedt) return;
    setVerlauf((v) => [...v, { id: zaehler.current++, rolle: "nutzer", text: anzeige, zeit: uhrzeit() }]);
    setLaedt(true);
    const mitSprache = { ...anfrage, sprache: e.sprache };
    try {
      let antworten: Antwort[];
      if (STATISCH) {
        // Online-Version ohne Server: derselbe Lotse läuft direkt im Browser.
        const { beantworteImBrowser } = await import("@/lib/daten-browser");
        antworten = await beantworteImBrowser(mitSprache, gesetze.map((g) => g.id));
      } else {
        const res = await fetch("/api/frage", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(mitSprache) });
        antworten = ((await res.json()) as { antworten: Antwort[] }).antworten;
      }
      setVerlauf((v) => [...v, { id: zaehler.current++, rolle: "lotse", antworten, zeit: uhrzeit() }]);
    } catch {
      setVerlauf((v) => [
        ...v,
        { id: zaehler.current++, rolle: "lotse", zeit: uhrzeit(), antworten: [{ art: "fehler", text: t("Verbindung fehlgeschlagen. Bitte erneut versuchen.", "Connection failed. Please try again.") }] },
      ]);
    } finally {
      setLaedt(false);
    }
  }

  const frage = (text: string) => {
    const x = text.trim();
    if (!x) return;
    setEingabe("");
    senden({ text: x }, x);
  };

  return (
    <>
      <Landschaft />
      <header className="kopf">
        <KopfLinien />
        <div className="kopf-innen">
          <a className="marke" href="./">
            <Logo />
            <span>
              <span className="wortmarke">Bau-Normen-KI</span>
              <span className="claim">{t("Baurecht im Wortlaut · Ortsauskunft Oldenburg", "Building law, word for word · Location check Oldenburg")}</span>
            </span>
          </a>
          <div className="kopf-meta">
            <span className="kopf-stand">
              {gesetze.map((g) => (
                <span key={g.id}>
                  <b>{g.kurz}</b> {t("Stand", "as of")} {standDatum(g.stand) ?? "–"}
                </span>
              ))}
            </span>
            <span className="tag-prototyp">{t("Prototyp", "Prototype")}</span>
            {!STATISCH && <ObsidianKnopf vaultPfad={obsidianPfad} />}
            <SprachWahl />
            <DarstellungsMenue />
          </div>
        </div>
        <Welle />
      </header>

      <div className="seite">
        <aside className="leiste">
          <section className="block">
            <h2 className="block-titel">
              <span className="kennung">A</span> {t("Ortsauskunft Oldenburg", "Location check Oldenburg")}
            </h2>
            <form
              className="block-inhalt"
              onSubmit={(ev) => {
                ev.preventDefault();
                if (!strasse.trim() || !hausnummer.trim()) return;
                setGebietZu(null);
                senden({ adresse: { strasse: strasse.trim(), hausnummer: hausnummer.trim() } }, `${t("Ortsauskunft", "Location check")}: ${strasse.trim()} ${hausnummer.trim()}`);
              }}
            >
              <div className="feldreihe">
                <div className="feld">
                  <label htmlFor="strasse">{t("Straße", "Street")}</label>
                  <input id="strasse" ref={strasseRef} value={strasse} onChange={(ev) => setStrasse(ev.target.value)} autoComplete="off" />
                </div>
                <div className="feld">
                  <label htmlFor="hnr">{t("Nr.", "No.")}</label>
                  <input id="hnr" value={hausnummer} onChange={(ev) => setHausnummer(ev.target.value)} autoComplete="off" />
                </div>
              </div>
              <button className="knopf knopf-breit" type="submit" disabled={laedt || !strasse.trim() || !hausnummer.trim()}>
                {t("Standort prüfen", "Check location")}
              </button>
              <p className="feld-hinweis">
                {t(
                  "Prüft Bebauungsplan (Stadt Oldenburg) und Denkmalschutz (Denkmalatlas Niedersachsen) und nennt die zu beachtenden Paragraphen.",
                  "Checks the development plan (City of Oldenburg) and monument protection (Lower Saxony monument atlas) and lists the relevant sections.",
                )}
              </p>
            </form>
          </section>

          <section className="block">
            <h2 className="block-titel">
              <span className="kennung">B</span> {t("Paragraph abrufen", "Look up a section")}
            </h2>
            <form
              className="block-inhalt"
              onSubmit={(ev) => {
                ev.preventDefault();
                const nr = paraNr.replace(/[§\s]/g, "");
                if (nr) frage(`§ ${nr} ${paraGesetz}`);
                setParaNr("");
              }}
            >
              <div className="feldreihe para">
                <div className="feld">
                  <label htmlFor="gesetz">{t("Gesetz", "Act")}</label>
                  <select id="gesetz" value={paraGesetz} onChange={(ev) => setParaGesetz(ev.target.value)}>
                    {gesetze.map((g) => (
                      <option key={g.id} value={g.kurz}>
                        {g.kurz}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="feld">
                  <label htmlFor="paranr">{t("Paragraph", "Section")}</label>
                  <input id="paranr" value={paraNr} onChange={(ev) => setParaNr(ev.target.value)} placeholder={t("z. B. 34 oder 13a", "e.g. 34 or 13a")} autoComplete="off" />
                </div>
              </div>
              <button className="knopf knopf-zweit knopf-breit" type="submit" disabled={laedt || !paraNr.trim()}>
                {t("Wortlaut anzeigen", "Show wording")}
              </button>
            </form>
          </section>

          <section className="block">
            <h2 className="block-titel">
              <span className="kennung">C</span> {t("Bibliothek", "Library")}
            </h2>
            <ul className="bibliothek">
              {gesetze.map((g) => (
                <li key={g.id}>
                  <span className="kuerzel">{g.kurz}</span>
                  <span>
                    <span className="titel" lang="de">
                      {g.titel}
                    </span>
                    <span className="meta">
                      {g.anzahl} {t("Vorschriften", "provisions")} · {t("Stand", "as of")} {standDatum(g.stand) ?? "–"}
                      <br />
                      <a href={g.quelleUrl} target="_blank" rel="noreferrer">
                        {t("amtliche Quelle ↗", "official source ↗")}
                      </a>
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          </section>

          <section className="block block-hinweis">
            <div className="block-inhalt">
              <p>
                <strong>{t("Verlässlichkeit:", "Reliability:")}</strong>{" "}
                {t(
                  "Gesetzestexte werden unverändert aus amtlichen Quellen angezeigt. Ortsauskünfte stammen live aus den Datendiensten der Stadt Oldenburg und des Landesamts für Denkmalpflege. Die Auskunft ersetzt keine Rechtsberatung.",
                  "Statutory texts are shown unchanged from official sources (in German). Location checks come live from the data services of the City of Oldenburg and the Lower Saxony State Office for Heritage. This is not legal advice.",
                )}
              </p>
              {STATISCH && (
                <p className="online-hinweis">
                  {t(
                    "Online-Version: Alles läuft direkt in Ihrem Browser – ohne Server und ohne KI. Die Ortsauskunft fragt die Dienste von Stadt und Land unmittelbar ab.",
                    "Online version: everything runs directly in your browser – no server, no AI. The location check queries the city and state services directly.",
                  )}
                </p>
              )}
            </div>
          </section>
        </aside>

        <main className="arbeitsbereich">
          {gebiet && gebietZu !== gebiet.id && <GebietsLeiste o={gebiet.o} kartenId={gebiet.kartenId} onSchliessen={() => setGebietZu(gebiet.id)} />}
          <div className="verlauf" ref={verlaufRef}>
            {verlauf.length === 0 && !laedt && (
              <div className="leer">
                <div className="leer-kopf">
                  <div>
                    <span className="eyebrow">{t("Auskunft", "Enquiry")}</span>
                    <h1>
                      {t("Was möchten Sie ", "What would you like to ")}
                      <em>{t("nachschlagen?", "look up?")}</em>
                    </h1>
                    <p>
                      {t(
                        "Paragraphen im amtlichen Wortlaut mit Erläuterung und Zusammenhängen – oder eine Ortsauskunft zu Bebauungsplan und Denkmalschutz für ein Grundstück in Oldenburg.",
                        "Sections of German building law in their official wording, with explanations and related provisions – or a location check on development plans and monument protection for a plot in Oldenburg.",
                      )}
                    </p>
                  </div>
                  <LinienBild className="leer-bild" />
                </div>
                <div className="beispiele">
                  <button className="beispiel" onClick={() => frage("§ 34 BauGB")}>
                    <span className="art">{t("Paragraph", "Section")}</span>
                    <span className="wert">§ 34 BauGB</span>
                    <span className="erkl">{t("Bauen im Innenbereich ohne Bebauungsplan", "Building in built-up areas without a development plan")}</span>
                  </button>
                  <button className="beispiel" onClick={() => frage("Bauen neben einem Denkmal")}>
                    <span className="art">{t("Stichwort", "Keyword")}</span>
                    <span className="wert" lang="de">
                      Bauen neben einem Denkmal
                    </span>
                    <span className="erkl">{t("findet die einschlägigen Vorschriften", "“building next to a monument” – finds the relevant provisions")}</span>
                  </button>
                  <button className="beispiel" onClick={() => strasseRef.current?.focus()}>
                    <span className="art">{t("Ortsauskunft", "Location check")}</span>
                    <span className="wert">{t("Adresse prüfen", "Check an address")}</span>
                    <span className="erkl">{t("Straße und Hausnummer im Formular „Ortsauskunft“ eingeben", "Enter street and house number in the “Location check” form")}</span>
                  </button>
                </div>
                <p className="leer-fuss">
                  {t(
                    "Im Eingabefeld unten funktionieren auch freie Formulierungen wie „Ich brauche Paragraph 5“, „§§ 30 und 31 BauGB“ oder eine Adresse.",
                    "The input field below also understands free phrasing such as “section 35 BauGB”, “§§ 30 and 31 BauGB” or an address. Keyword search works with German terms.",
                  )}
                </p>
              </div>
            )}

            {verlauf.map((x, i) =>
              x.rolle === "nutzer" ? (
                <div key={x.id} className="anfrage" ref={i === verlauf.length - 1 ? letzteRef : undefined}>
                  <div className="anfrage-box">
                    <span className="anfrage-label">
                      {t("Anfrage", "Enquiry")} · {x.zeit}
                    </span>
                    {x.text}
                  </div>
                </div>
              ) : (
                <div key={x.id} className="antworten" ref={i === verlauf.length - 1 ? letzteRef : undefined}>
                  {x.antworten?.map((a, j) =>
                    a.art === "norm" || a.art === "ort" ? (
                      <AntwortAnzeige key={j} a={a} frage={frage} obsidianPfad={obsidianPfad} kartenId={`${x.id}-${j}`} />
                    ) : (
                      <div key={j} id={`karte-${x.id}-${j}`}>
                        <AntwortAnzeige a={a} frage={frage} obsidianPfad={obsidianPfad} kartenId={`${x.id}-${j}`} />
                      </div>
                    ),
                  )}
                </div>
              ),
            )}
            {laedt && (
              <div className="laden" ref={letzteRef}>
                <span className="laden-balken" /> {t("Wird abgefragt …", "Querying …")}
              </div>
            )}
          </div>

          <form
            className="eingabe"
            onSubmit={(ev) => {
              ev.preventDefault();
              frage(eingabe);
            }}
          >
            <div className="feld" style={{ flex: 1 }}>
              <label htmlFor="frage">{t("Anfrage", "Enquiry")}</label>
              <textarea
                id="frage"
                rows={1}
                value={eingabe}
                onChange={(ev) => setEingabe(ev.target.value)}
                onKeyDown={(ev) => {
                  if (ev.key === "Enter" && !ev.shiftKey) {
                    ev.preventDefault();
                    frage(eingabe);
                  }
                }}
                placeholder={t("z. B. „§ 35 BauGB“, „Vorkaufsrecht“ oder eine Adresse", "e.g. “§ 35 BauGB”, “Vorkaufsrecht” or an address")}
              />
            </div>
            <button className="knopf" type="submit" disabled={laedt || !eingabe.trim()}>
              {t("Senden", "Send")}
            </button>
          </form>
        </main>
      </div>
      {/* "Gecko aus" = sitzt still am Stammplatz und zeigt nur noch Fehler/Hinweise an */}
      <Gecko signal={signal} fest={!e.gecko || !e.bewegung} ruhig={!e.bewegung} />
    </>
  );
}

function AntwortAnzeige({ a, frage, obsidianPfad, kartenId }: { a: Antwort; frage: (t: string) => void; obsidianPfad: string | null; kartenId: string }) {
  const t = useT();
  switch (a.art) {
    case "norm":
      return <NormKarte a={a.ansicht} frage={frage} obsidianPfad={obsidianPfad} kartenId={kartenId} />;
    case "ort":
      return <OrtKarte o={a.ort} frage={frage} kartenId={kartenId} />;
    case "text":
      return (
        <div className="meldung">
          <p>{a.text}</p>
        </div>
      );
    case "auswahl":
      return (
        <div className="meldung">
          <p>{a.frage}</p>
          <div className="optionen">
            {a.optionen.map((o) => (
              <button key={o.anfrage} className="knopf knopf-zweit knopf-klein" onClick={() => frage(o.anfrage)}>
                {o.label}
              </button>
            ))}
          </div>
        </div>
      );
    case "treffer":
      return (
        <div className="meldung">
          <p>{a.frage}</p>
          <ul className="trefferliste">
            {a.treffer.map((x) => (
              <li key={x.anfrage}>
                <button className="treffer" onClick={() => frage(x.anfrage)}>
                  <span className="treffer-bez">
                    {x.bez} {x.gesetz}
                  </span>
                  <span lang="de">{x.titel}</span>
                  {x.ausVerzeichnis && <span className="treffer-tag">{t("Stichwortverzeichnis", "Keyword index")}</span>}
                </button>
              </li>
            ))}
          </ul>
        </div>
      );
    case "fehler":
      return (
        <div className="meldung meldung-fehler">
          <p>{a.text}</p>
          {a.vorschlaege && (
            <div className="optionen">
              {a.vorschlaege.map((o) => (
                <button key={o.anfrage} className="knopf knopf-zweit knopf-klein" onClick={() => frage(o.anfrage)}>
                  {o.label}
                </button>
              ))}
            </div>
          )}
        </div>
      );
  }
}
