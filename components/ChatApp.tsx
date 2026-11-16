"use client";
// Oberfläche: Kopf, Seitenleiste mit festen Formularen (Ortsauskunft, Paragraph) und der Auskunfts-Verlauf (Chat).
import { useEffect, useRef, useState } from "react";
import { standDatum } from "@/lib/text";
import type { Antwort, GesetzInfo } from "@/lib/typen";
import { NormKarte, OrtKarte } from "./Karten";
import { Logo } from "./Symbole";

interface Eintrag {
  id: number;
  rolle: "nutzer" | "lotse";
  text?: string;
  zeit: string;
  antworten?: Antwort[];
}

type Anfrage = { text: string } | { adresse: { strasse: string; hausnummer: string } };

const uhrzeit = () => new Date().toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" });

export default function ChatApp({ gesetze }: { gesetze: GesetzInfo[] }) {
  const [verlauf, setVerlauf] = useState<Eintrag[]>([]);
  const [eingabe, setEingabe] = useState("");
  const [laedt, setLaedt] = useState(false);
  const [strasse, setStrasse] = useState("");
  const [hausnummer, setHausnummer] = useState("");
  const [paraGesetz, setParaGesetz] = useState(gesetze[0]?.kurz ?? "BauGB");
  const [paraNr, setParaNr] = useState("");
  const letzteRef = useRef<HTMLDivElement>(null);
  const strasseRef = useRef<HTMLInputElement>(null);
  const zaehler = useRef(1);

  // Neue Nachricht: an ihren Anfang scrollen, damit man oben mit dem Lesen beginnt.
  useEffect(() => {
    letzteRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [verlauf.length, laedt]);

  async function senden(anfrage: Anfrage, anzeige: string) {
    if (laedt) return;
    setVerlauf((v) => [...v, { id: zaehler.current++, rolle: "nutzer", text: anzeige, zeit: uhrzeit() }]);
    setLaedt(true);
    try {
      const res = await fetch("/api/frage", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(anfrage) });
      const daten = (await res.json()) as { antworten: Antwort[] };
      setVerlauf((v) => [...v, { id: zaehler.current++, rolle: "lotse", antworten: daten.antworten, zeit: uhrzeit() }]);
    } catch {
      setVerlauf((v) => [...v, { id: zaehler.current++, rolle: "lotse", zeit: uhrzeit(), antworten: [{ art: "fehler", text: "Verbindung fehlgeschlagen. Bitte erneut versuchen." }] }]);
    } finally {
      setLaedt(false);
    }
  }

  const frage = (text: string) => {
    const t = text.trim();
    if (!t) return;
    setEingabe("");
    senden({ text: t }, t);
  };

  return (
    <>
      <header className="kopf">
        <div className="kopf-innen">
          <a className="marke" href="/">
            <Logo />
            <span>
              <span className="wortmarke">Bau-Normen-KI</span>
              <span className="claim">Baurecht im Wortlaut · Ortsauskunft Oldenburg</span>
            </span>
          </a>
          <div className="kopf-meta">
            {gesetze.map((g) => (
              <span key={g.id}>
                <b>{g.kurz}</b> Stand {standDatum(g.stand) ?? "–"}
              </span>
            ))}
            <span className="tag-prototyp">Prototyp</span>
          </div>
        </div>
        <div className="massband" aria-hidden="true" />
      </header>

      <div className="seite">
        <aside className="leiste">
          <section className="block">
            <h2 className="block-titel">
              <span className="kennung">A</span> Ortsauskunft Oldenburg
            </h2>
            <form
              className="block-inhalt"
              onSubmit={(e) => {
                e.preventDefault();
                if (!strasse.trim() || !hausnummer.trim()) return;
                senden({ adresse: { strasse: strasse.trim(), hausnummer: hausnummer.trim() } }, `Ortsauskunft: ${strasse.trim()} ${hausnummer.trim()}`);
              }}
            >
              <div className="feldreihe">
                <div className="feld">
                  <label htmlFor="strasse">Straße</label>
                  <input id="strasse" ref={strasseRef} value={strasse} onChange={(e) => setStrasse(e.target.value)} autoComplete="off" />
                </div>
                <div className="feld">
                  <label htmlFor="hnr">Nr.</label>
                  <input id="hnr" value={hausnummer} onChange={(e) => setHausnummer(e.target.value)} autoComplete="off" />
                </div>
              </div>
              <button className="knopf knopf-breit" type="submit" disabled={laedt || !strasse.trim() || !hausnummer.trim()}>
                Standort prüfen
              </button>
              <p className="feld-hinweis">Prüft Bebauungsplan (Stadt Oldenburg) und Denkmalschutz (Denkmalatlas Niedersachsen) und nennt die zu beachtenden Paragraphen.</p>
            </form>
          </section>

          <section className="block">
            <h2 className="block-titel">
              <span className="kennung">B</span> Paragraph abrufen
            </h2>
            <form
              className="block-inhalt"
              onSubmit={(e) => {
                e.preventDefault();
                const nr = paraNr.replace(/[§\s]/g, "");
                if (nr) frage(`§ ${nr} ${paraGesetz}`);
                setParaNr("");
              }}
            >
              <div className="feldreihe para">
                <div className="feld">
                  <label htmlFor="gesetz">Gesetz</label>
                  <select id="gesetz" value={paraGesetz} onChange={(e) => setParaGesetz(e.target.value)}>
                    {gesetze.map((g) => (
                      <option key={g.id} value={g.kurz}>
                        {g.kurz}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="feld">
                  <label htmlFor="paranr">Paragraph</label>
                  <input id="paranr" value={paraNr} onChange={(e) => setParaNr(e.target.value)} placeholder="z. B. 34 oder 13a" autoComplete="off" />
                </div>
              </div>
              <button className="knopf knopf-zweit knopf-breit" type="submit" disabled={laedt || !paraNr.trim()}>
                Wortlaut anzeigen
              </button>
            </form>
          </section>

          <section className="block">
            <h2 className="block-titel">
              <span className="kennung">C</span> Bibliothek
            </h2>
            <ul className="bibliothek">
              {gesetze.map((g) => (
                <li key={g.id}>
                  <span className="kuerzel">{g.kurz}</span>
                  <span>
                    <span className="titel">{g.titel}</span>
                    <span className="meta">
                      {g.anzahl} Vorschriften · Stand {standDatum(g.stand) ?? "–"}
                      <br />
                      <a href={g.quelleUrl} target="_blank" rel="noreferrer">
                        amtliche Quelle ↗
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
                <strong>Verlässlichkeit:</strong> Gesetzestexte werden unverändert aus amtlichen Quellen angezeigt. Ortsauskünfte stammen live aus den Datendiensten der Stadt Oldenburg und des Landesamts für Denkmalpflege. Die
                Auskunft ersetzt keine Rechtsberatung.
              </p>
            </div>
          </section>
        </aside>

        <main className="arbeitsbereich">
          <div className="verlauf">
            {verlauf.length === 0 && !laedt && (
              <div className="leer">
                <span className="sf-gesetz">Auskunft</span>
                <h1>Was möchten Sie nachschlagen?</h1>
                <p>Paragraphen im amtlichen Wortlaut mit Erläuterung und Zusammenhängen – oder eine Ortsauskunft zu Bebauungsplan und Denkmalschutz für ein Grundstück in Oldenburg.</p>
                <div className="beispiele">
                  <button className="beispiel" onClick={() => frage("§ 34 BauGB")}>
                    <span className="art">Paragraph</span>
                    <span className="wert">§ 34 BauGB</span>
                    <span className="erkl">Bauen im Innenbereich ohne Bebauungsplan</span>
                  </button>
                  <button className="beispiel" onClick={() => frage("Bauen neben einem Denkmal")}>
                    <span className="art">Stichwort</span>
                    <span className="wert">Bauen neben einem Denkmal</span>
                    <span className="erkl">findet die einschlägigen Vorschriften</span>
                  </button>
                  <button className="beispiel" onClick={() => strasseRef.current?.focus()}>
                    <span className="art">Ortsauskunft</span>
                    <span className="wert">Adresse prüfen</span>
                    <span className="erkl">Straße und Hausnummer links eingeben</span>
                  </button>
                </div>
                <p className="leer-fuss">Im Eingabefeld unten funktionieren auch freie Formulierungen wie „Ich brauche Paragraph 5“, „§§ 30 und 31 BauGB“ oder eine Adresse.</p>
              </div>
            )}

            {verlauf.map((e, i) =>
              e.rolle === "nutzer" ? (
                <div key={e.id} className="anfrage" ref={i === verlauf.length - 1 ? letzteRef : undefined}>
                  <div className="anfrage-box">
                    <span className="anfrage-label">Anfrage · {e.zeit}</span>
                    {e.text}
                  </div>
                </div>
              ) : (
                <div key={e.id} className="antworten" ref={i === verlauf.length - 1 ? letzteRef : undefined}>
                  {e.antworten?.map((a, j) => <AntwortAnzeige key={j} a={a} frage={frage} />)}
                </div>
              ),
            )}
            {laedt && (
              <div className="laden" ref={letzteRef}>
                <span className="laden-balken" /> Wird abgefragt …
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
              <label htmlFor="frage">Anfrage</label>
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
                placeholder="z. B. „§ 35 BauGB“, „Vorkaufsrecht“ oder eine Adresse"
              />
            </div>
            <button className="knopf" type="submit" disabled={laedt || !eingabe.trim()}>
              Senden
            </button>
          </form>
        </main>
      </div>
    </>
  );
}

function AntwortAnzeige({ a, frage }: { a: Antwort; frage: (t: string) => void }) {
  switch (a.art) {
    case "norm":
      return <NormKarte a={a.ansicht} frage={frage} />;
    case "ort":
      return <OrtKarte o={a.ort} frage={frage} />;
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
            {a.treffer.map((t) => (
              <li key={t.anfrage}>
                <button className="treffer" onClick={() => frage(t.anfrage)}>
                  <span className="treffer-bez">
                    {t.bez} {t.gesetz}
                  </span>
                  <span>{t.titel}</span>
                  {t.ausVerzeichnis && <span className="treffer-tag">Stichwortverzeichnis</span>}
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
