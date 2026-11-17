"use client";
// Oberfläche: Kopf (Sprache, Darstellung), Seitenleiste mit festen Formularen (Ortsauskunft, Paragraph),
// angeheftete Gebietsleiste und der Auskunfts-Verlauf (Chat).
import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { type GeckoSignal, geckoSignal } from "@/lib/gecko";
import { standDatum } from "@/lib/text";
import { LAENDER, landNamens, STANDARD_LAND } from "@/lib/laender";
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

type Anfrage = { text: string } | { adresse: { strasse: string; hausnummer: string; plz?: string; ort?: string } };

/** Statische Online-Version (GitHub Pages) – wird beim Bauen festgelegt. */
const STATISCH = process.env.NEXT_PUBLIC_STATISCH === "1";

export default function ChatApp({ gesetze, obsidianPfad }: { gesetze: GesetzInfo[]; obsidianPfad: string | null }) {
  const { e, setze } = useEinstellungen();
  const t = useT();
  const sp = e.sprache === "en" ? "en" : "de";
  const land = landNamens(e.land) ?? landNamens(STANDARD_LAND)!;
  // Regelwerke im Bereich des gewählten Landes: Bundesrecht, Gesetze dieses Landes, Muster und VOB
  const imLand = (g: GesetzInfo) => !g.land || g.land === land.name;
  const imBereich = gesetze.filter(imLand);
  const andereLaender = LAENDER.filter((l) => l.name !== land.name)
    .map((l) => ({ l, liste: gesetze.filter((g) => g.land === l.name) }))
    .filter((x) => x.liste.length);
  const [verlauf, setVerlauf] = useState<Eintrag[]>([]);
  const [eingabe, setEingabe] = useState("");
  const [laedt, setLaedt] = useState(false);
  // dauert eine Anfrage länger (Ortsauskunft: mehrere Dienste), sagt die Seite nach ein paar Sekunden, warum
  const [langsam, setLangsam] = useState(false);
  useEffect(() => {
    setLangsam(false);
    if (!laedt) return;
    const h = setTimeout(() => setLangsam(true), 4000);
    return () => clearTimeout(h);
  }, [laedt]);
  const [strasse, setStrasse] = useState("");
  const [hausnummer, setHausnummer] = useState("");
  const [plz, setPlz] = useState("");
  const [ortName, setOrtName] = useState("");
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

  // Online-Version: Lotse und Kurzfassung der Daten (klein) schon im Leerlauf vorladen – die erste Antwort kommt dann sofort
  useEffect(() => {
    if (!STATISCH) return;
    const vorladen = () => void import("@/lib/daten-browser").then((m) => m.ladeDaten()).catch(() => {});
    if ("requestIdleCallback" in window) {
      const h = window.requestIdleCallback(vorladen, { timeout: 3000 });
      return () => window.cancelIdleCallback(h);
    }
    const h = setTimeout(vorladen, 1500);
    return () => clearTimeout(h);
  }, []);

  async function senden(anfrage: Anfrage, anzeige: string) {
    if (laedt) return;
    setVerlauf((v) => [...v, { id: zaehler.current++, rolle: "nutzer", text: anzeige, zeit: uhrzeit() }]);
    setLaedt(true);
    const mitSprache = { ...anfrage, sprache: e.sprache, land: land.name };
    try {
      let antworten: Antwort[];
      if (STATISCH) {
        // Online-Version ohne Server: derselbe Lotse läuft direkt im Browser.
        const { beantworteImBrowser } = await import("@/lib/daten-browser");
        antworten = await beantworteImBrowser(mitSprache);
      } else {
        const res = await fetch("/api/frage", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(mitSprache) });
        antworten = ((await res.json()) as { antworten: Antwort[] }).antworten;
      }
      setVerlauf((v) => [...v, { id: zaehler.current++, rolle: "lotse", antworten, zeit: uhrzeit() }]);
      // Ortsauskunft in einem anderen Land: dessen Gesetze sind ab jetzt gemeint (Bauordnung, Stichworte, Suche)
      const ort = antworten.find((a) => a.art === "ort");
      const ortLand = ort?.art === "ort" && ort.ort.standort.status === "ok" ? landNamens(ort.ort.standort.land) : undefined;
      if (ortLand && ortLand.name !== land.name) setze({ land: ortLand.name });
    } catch {
      setVerlauf((v) => [
        ...v,
        {
          id: zaehler.current++,
          rolle: "lotse",
          zeit: uhrzeit(),
          antworten: [
            {
              art: "fehler",
              text: STATISCH
                ? t("Die Anfrage konnte nicht bearbeitet werden. Bitte die Seite neu laden und erneut versuchen.", "The request could not be processed. Please reload the page and try again.")
                : t("Keine Verbindung zur App (Server). Bitte erneut versuchen.", "No connection to the app (server). Please try again."),
            },
          ],
        },
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
              <span className="claim">{t("Baurecht im Wortlaut · Ortsauskunft Deutschland", "Building law, word for word · Location check Germany")}</span>
            </span>
          </a>
          <div className="kopf-meta">
            <span className="kopf-stand">
              {gesetze.filter((g) => g.imKopf || g.id === land.bauordnung).map((g) => (
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
              <span className="kennung">A</span> {t("Ortsauskunft Deutschland", "Location check Germany")}
            </h2>
            <form
              className="block-inhalt"
              onSubmit={(ev) => {
                ev.preventDefault();
                if (!strasse.trim() || !hausnummer.trim()) return;
                setGebietZu(null);
                const zusatz = [plz.trim(), ortName.trim()].filter(Boolean).join(" ");
                senden(
                  { adresse: { strasse: strasse.trim(), hausnummer: hausnummer.trim(), plz: plz.trim() || undefined, ort: ortName.trim() || undefined } },
                  `${t("Ortsauskunft", "Location check")}: ${strasse.trim()} ${hausnummer.trim()}${zusatz ? `, ${zusatz}` : ""}`,
                );
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
              <div className="feldreihe plz-reihe">
                <div className="feld">
                  <label htmlFor="plz">{t("PLZ", "Postcode")}</label>
                  <input
                    id="plz"
                    value={plz}
                    onChange={(ev) => setPlz(ev.target.value.replace(/\D/g, "").slice(0, 5))}
                    inputMode="numeric"
                    pattern="\d{5}"
                    placeholder={t("optional", "optional")}
                    autoComplete="off"
                    title={t("fünfstellige Postleitzahl (optional)", "five-digit postcode (optional)")}
                  />
                </div>
                <div className="feld">
                  <label htmlFor="ortname">{t("Ort", "Town")}</label>
                  <input id="ortname" value={ortName} onChange={(ev) => setOrtName(ev.target.value)} placeholder={t("optional", "optional")} autoComplete="off" />
                </div>
              </div>
              <button className="knopf knopf-breit" type="submit" disabled={laedt || !strasse.trim() || !hausnummer.trim()}>
                {t("Standort prüfen", "Check location")}
              </button>
              <p className="feld-hinweis">
                {t(
                  "Findet jede Adresse in Deutschland und nennt die zu beachtenden Paragraphen. Bebauungspläne und Denkmale kommen aus den amtlichen Diensten der Länder und Städte – wo keiner angebunden ist oder ein Dienst nicht alle Einträge enthält, sagt die Auskunft das offen. Ohne Postleitzahl wird zuerst in Oldenburg gesucht.",
                  "Finds any address in Germany and lists the relevant sections. Development plans and monuments come from the official services of the states and cities – where none is connected or a service does not contain every entry, the check says so openly. Without a postcode, Oldenburg is searched first.",
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
                const nr = paraNr.replace(/§|din|atv/gi, "").replace(/\s+/g, " ").trim();
                if (nr) frage(paraGesetz === "VOB/C" ? `DIN ${nr.replace(/\s/g, "")}` : `§ ${nr} ${paraGesetz}`);
                setParaNr("");
              }}
            >
              <div className="feldreihe para">
                <div className="feld">
                  <label htmlFor="gesetz">{t("Regelwerk", "Act")}</label>
                  <select id="gesetz" value={paraGesetz} onChange={(ev) => setParaGesetz(ev.target.value)}>
                    {imBereich.map((g) => (
                      <option key={g.id} value={g.kurz}>
                        {g.kurz}
                      </option>
                    ))}
                    {andereLaender.map(({ l, liste }) => (
                      <optgroup key={l.name} label={l.name}>
                        {liste.map((g) => (
                          <option key={g.id} value={g.kurz}>
                            {g.kurz}
                          </option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                </div>
                <div className="feld">
                  <label htmlFor="paranr">{paraGesetz === "VOB/C" ? "ATV DIN" : t("Paragraph", "Section")}</label>
                  <input
                    id="paranr"
                    value={paraNr}
                    onChange={(ev) => setParaNr(ev.target.value)}
                    placeholder={
                      paraGesetz === "VOB/C"
                        ? t("z. B. 18353", "e.g. 18353")
                        : paraGesetz === "VOB/A"
                          ? t("z. B. 3a oder 3a EU", "e.g. 3a or 3a EU")
                          : t("z. B. 34 oder 13a", "e.g. 34 or 13a")
                    }
                    autoComplete="off"
                  />
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
            <div className="land-wahl">
              <label htmlFor="land">{t("Bundesland", "State")}</label>
              <select id="land" value={land.name} onChange={(ev) => setze({ land: ev.target.value })}>
                {LAENDER.map((l) => (
                  <option key={l.name} value={l.name}>
                    {l.name}
                    {gesetze.some((g) => g.land === l.name) ? "" : t(" (noch ohne Landesrecht)", " (no state law yet)")}
                  </option>
                ))}
              </select>
            </div>
            {!gesetze.some((g) => g.land === land.name) && (
              <p className="land-hinweis">
                {t(
                  `Für ${land.name} sind Bauordnung (${land.bauordnungKurz}) und Denkmalschutzgesetz (${land.denkmalKurz}) noch nicht in der Bibliothek. Bundesrecht, Musterbauordnung und VOB gelten trotzdem.`,
                  `For ${land.name}, the building code (${land.bauordnungKurz}) and the monument protection act (${land.denkmalKurz}) are not in the library yet. Federal law, the model code and the VOB still apply.`,
                )}
              </p>
            )}
            <ul className="bibliothek">
              {imBereich.map((g, i) => {
                const neueGruppe = i === 0 || imBereich[i - 1].gruppe.de !== g.gruppe.de;
                return (
                  <Fragment key={g.id}>
                    {neueGruppe && <li className="bib-gruppe">{g.gruppe[sp]}</li>}
                    <li>
                      <span className="kuerzel">{g.kurz}</span>
                      <span>
                        <span className="titel" title={g.titel}>
                          {g.kurztitel[sp]}
                        </span>
                        <span className="meta">
                          {g.anzahl} {g.nurVerzeichnis ? "ATV" : "§§"} · {standDatum(g.stand) ?? "–"} ·{" "}
                          <a href={g.quelleUrl} target="_blank" rel="noreferrer" title={g.quelleName}>
                            {g.nurVerzeichnis ? "DIN ↗" : t("Quelle ↗", "source ↗")}
                          </a>
                        </span>
                      </span>
                    </li>
                  </Fragment>
                );
              })}
            </ul>
            {andereLaender.length > 0 && (
              <details className="weitere-laender">
                <summary>
                  {t("Weitere Länder", "Other states")} ({andereLaender.length})
                </summary>
                <ul className="bibliothek">
                  {andereLaender.map(({ l, liste }) => (
                    <Fragment key={l.name}>
                      <li className="bib-gruppe">{l.name}</li>
                      {liste.map((g) => (
                        <li key={g.id}>
                          <span className="kuerzel">{g.kurz}</span>
                          <span>
                            <span className="titel" title={g.titel}>
                              {g.kurztitel[sp]}
                            </span>
                            <span className="meta">
                              {g.anzahl} §§ · {standDatum(g.stand) ?? "–"} ·{" "}
                              <a href={g.quelleUrl} target="_blank" rel="noreferrer" title={g.quelleName}>
                                {t("Quelle ↗", "source ↗")}
                              </a>
                            </span>
                          </span>
                        </li>
                      ))}
                    </Fragment>
                  ))}
                </ul>
              </details>
            )}
          </section>

          <section className="block block-hinweis">
            <div className="block-inhalt">
              <p>
                <strong>{t("Verlässlichkeit:", "Reliability:")}</strong>{" "}
                {t(
                  "Gesetze, Musterbauordnung und VOB werden unverändert im Wortlaut der Quelle angezeigt, die VOB/C nur als Verzeichnis. Ortsauskünfte stammen live aus OpenStreetMap und den amtlichen Geodatendiensten der Länder und Städte (Quelle steht jeweils dabei). Die Auskunft ersetzt keine Rechtsberatung.",
                  "Acts, the model building code and the VOB are shown unchanged in their source wording (in German); the VOB/C as an index only. Location checks come live from OpenStreetMap and the official geodata services of the states and cities (each source is named). This is not legal advice.",
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
                        "Baugesetzbuch, Bauordnungen und Denkmalschutzgesetze der Länder, Musterbauordnung und VOB im Wortlaut, mit Erläuterung und Zusammenhängen – oder eine Ortsauskunft für ein Grundstück in Deutschland.",
                        "German building law, state building codes and monument protection acts, the model building code and the VOB in their original wording, with explanations and related provisions – or a location check for a plot anywhere in Germany.",
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
                    "Im Eingabefeld unten funktionieren auch freie Formulierungen wie „Ich brauche Paragraph 5“, „§§ 30 und 31 BauGB“, „§ 13 VOB/B“, „DIN 18353“ oder eine Adresse.",
                    "The input field below also understands free phrasing such as “section 35 BauGB”, “§§ 30 and 31 BauGB”, “§ 13 VOB/B”, “DIN 18353” or an address. Keyword search works with German terms.",
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
              <div className="laden" ref={letzteRef} role="status" aria-live="polite">
                <span className="laden-balken" /> {t("Wird abgefragt …", "Querying …")}
                {langsam && (
                  <span className="laden-hinweis">
                    {t(
                      "Die Ortsauskunft fragt mehrere amtliche Dienste ab – das dauert manchmal bis zu 20 Sekunden.",
                      "The location check queries several official services – this sometimes takes up to 20 seconds.",
                    )}
                  </span>
                )}
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
