"use client";
// Antwort-Karten: Paragraph (NormKarte), Ortsauskunft (OrtKarte) und die angeheftete Gebietsleiste (GebietsLeiste).
// Oberflächentexte zweisprachig; Gesetzestext und Erläuterungen bleiben im deutschen Original.
import { useState } from "react";
import { alsText, standDatum } from "@/lib/text";
import type { NormAnsicht, NormRef, OrtAnsicht } from "@/lib/typen";
import { bewegungAus, useEinstellungen, useT } from "./Einstellungen";
import Normtext from "./Normtext";
import Lageskizze from "./Lageskizze";
import { obsidianLink, useLokal } from "./Obsidian";
import { SymbolDenkmal, SymbolPin, SymbolPlan } from "./Symbole";

type Frage = (text: string) => void;
type T = (de: string, en: string) => string;

const host = (url: string) => {
  try {
    return new URL(url).host.replace(/^www\./, "");
  } catch {
    return url;
  }
};

/** Dokumentarten der Stadt Oldenburg (Datenbezeichnung) auf Englisch */
const DOKUMENT_EN: Record<string, string> = {
  Planzeichnung: "Plan drawing",
  "Textliche Festsetzungen": "Written provisions",
  Begründung: "Explanatory memorandum",
  Umweltbericht: "Environmental report",
  Dokument: "Document",
};

export function NormChips({ refs, frage, max = 12 }: { refs: NormRef[]; frage: Frage; max?: number }) {
  const t = useT();
  const [alle, setAlle] = useState(false);
  const sichtbar = alle ? refs : refs.slice(0, max);
  return (
    <div className="chips">
      {sichtbar.map((r) => (
        <button key={`${r.gesetz}-${r.id}`} className="chip" title={r.titel} onClick={() => frage(`${r.bez} ${r.gesetz}`)}>
          {r.bez} {r.gesetz}
        </button>
      ))}
      {refs.length > max && !alle && (
        <button className="chip chip-mehr" onClick={() => setAlle(true)}>
          +{refs.length - max} {t("weitere", "more")}
        </button>
      )}
    </div>
  );
}

function TeilKopf({ nr, titel, zusatz, warn }: { nr: string; titel: string; zusatz?: string; warn?: boolean }) {
  return (
    <div className="teil-kopf">
      <span className="teil-nr">{nr}</span>
      <h3 className="teil-titel">{titel}</h3>
      {zusatz && <span className={`teil-zusatz ${warn ? "warn" : ""}`}>{zusatz}</span>}
    </div>
  );
}

export function NormKarte({ a, frage, obsidianPfad, kartenId }: { a: NormAnsicht; frage: Frage; obsidianPfad?: string | null; kartenId: string }) {
  const t = useT();
  const { e } = useEinstellungen();
  const [offen, setOffen] = useState(false);
  const lokal = useLokal();
  const [kopiert, setKopiert] = useState(false);
  const { norm, gesetz, erlaeuterung } = a;
  const lang = norm.inhalt.length > 4 || JSON.stringify(norm.inhalt).length > 2500;
  const datum = standDatum(gesetz.stand);
  const nummer = norm.bez.replace(/^§\s*/, "§ ");
  const verzeichnis = !!gesetz.nurVerzeichnis;
  const sp = e.sprache === "en" ? "en" : "de";
  const abschnitt = norm.gliederung.at(-1)?.split(" – ")[1];

  async function kopieren() {
    const text = `${norm.bez} ${gesetz.kurz} – ${norm.titel}\n\n${alsText(norm.inhalt)}\n\nQuelle: ${gesetz.quelleName}, ${norm.url}\nStand: ${gesetz.stand}`;
    try {
      await navigator.clipboard.writeText(text);
      setKopiert(true);
      setTimeout(() => setKopiert(false), 1800);
    } catch {
      /* Zwischenablage nicht verfügbar */
    }
  }

  return (
    <article className="dokument" id={`karte-${kartenId}`}>
      <header className="schriftfeld">
        <div className="sf-haupt">
          <div className="sf-para">{nummer}</div>
          <div className="sf-titel">
            <span className="sf-gesetz">
              {gesetz.kurz} · {gesetz.titel}
            </span>
            <h2 lang="de">{norm.titel || t("(ohne Überschrift)", "(no heading)")}</h2>
          </div>
        </div>
        <dl className="sf-felder">
          <div title={norm.gliederung.join(" › ")}>
            <dt>{t("Abschnitt", "Part")}</dt>
            <dd lang="de">{abschnitt ?? "–"}</dd>
          </div>
          <div title={gesetz.stand}>
            <dt>{t("Stand", "Version")}</dt>
            <dd className="mono">{datum ?? gesetz.stand}</dd>
          </div>
          <div>
            <dt>{t("Quelle", "Source")}</dt>
            <dd>
              <a href={norm.url} target="_blank" rel="noreferrer">
                {host(norm.url)} ↗
              </a>
            </dd>
          </div>
          <div>
            <dt>{t("Wortlaut", "Wording")}</dt>
            <dd>
              {verzeichnis ? (
                <span title={t("Der Wortlaut ist eine DIN-Norm und nicht enthalten.", "The wording is a DIN standard and not included.")}>{t("nur bei DIN", "DIN only")}</span>
              ) : (
                <button onClick={kopieren}>{kopiert ? t("kopiert ✓", "copied ✓") : t("kopieren", "copy")}</button>
              )}
            </dd>
          </div>
          {obsidianPfad && lokal && (
            <div>
              <dt>Obsidian</dt>
              <dd>
                <a href={obsidianLink(obsidianPfad, `Gesetze/${gesetz.kurz.replace(/\//g, "-")}/${norm.bez} ${gesetz.kurz.replace(/\//g, "-")}.md`)}>{t("Notiz öffnen", "Open note")}</a>
              </dd>
            </div>
          )}
        </dl>
      </header>

      {gesetz.hinweis && (
        <p className={`regelwerk-hinweis rh-${gesetz.art}`}>
          <b>{gesetz.artText[sp]}</b> {gesetz.hinweis[sp]}
        </p>
      )}

      <section className="teil">
        <TeilKopf nr="01" titel={verzeichnis ? t("Verzeichniseintrag", "Index entry") : t("Originaltext", "Original text")} zusatz={gesetz.wortlaut[sp]} />
        <div className={`original ${lang && !offen ? "eingeklappt" : ""}`} lang="de">
          {norm.weggefallen ? <p className="weggefallen">(weggefallen)</p> : <Normtext inhalt={norm.inhalt} />}
          {norm.fussnoten && <p className="fussnote">{norm.fussnoten}</p>}
        </div>
        {lang && (
          <button className="knopf knopf-zweit knopf-klein aufklappen" onClick={() => setOffen(!offen)}>
            {offen ? t("Text einklappen", "Collapse text") : t("Vollständigen Text anzeigen", "Show full text")}
          </button>
        )}
      </section>

      <section className="teil" id={`erl-${kartenId}`}>
        <TeilKopf
          nr="02"
          titel={t("Erläuterung", "Explanation")}
          zusatz={t("Orientierung, keine Rechtsberatung – maßgeblich ist der Originaltext", "guidance only, not legal advice – the original text prevails")}
          warn
        />
        {e.sprache === "en" && erlaeuterung && <p className="nur-deutsch">Explanations are currently available in German only.</p>}
        {erlaeuterung ? (
          <div lang="de">
            <p className="erl-kurz">{erlaeuterung.kurz}</p>
            <ul className="erl-punkte">
              {erlaeuterung.punkte.map((p, i) => (
                <li key={i}>
                  <b>{p.titel}</b>
                  {p.text}
                </li>
              ))}
            </ul>
            {erlaeuterung.praxis && (
              <p className="erl-praxis">
                <strong>Für die Praxis: </strong>
                {erlaeuterung.praxis}
              </p>
            )}
          </div>
        ) : (
          <p className="leer-text">{t("Für diese Vorschrift liegt noch keine Erläuterung vor.", "No explanation is available for this provision yet.")}</p>
        )}
        {erlaeuterung?.status === "entwurf" && <p className="erl-status">{t("Entwurf · fachliche Prüfung ausstehend", "Draft · expert review pending")}</p>}
      </section>

      <section className="teil">
        <TeilKopf nr="03" titel={t("Zusammenhang", "Related provisions")} zusatz={t("aus den Verweisen im Gesetzestext ermittelt", "derived from the cross-references in the text")} />
        {a.verweistAuf.length || a.erwaehntIn.length || a.gleicherAbschnitt.length ? (
          <dl className="bezug">
            {a.verweistAuf.length > 0 && (
              <>
                <dt>{t("Verweist auf", "Refers to")}</dt>
                <dd>
                  <NormChips refs={a.verweistAuf} frage={frage} />
                </dd>
              </>
            )}
            {a.erwaehntIn.length > 0 && (
              <>
                <dt>{t("Wird erwähnt in", "Referred to in")}</dt>
                <dd>
                  <NormChips refs={a.erwaehntIn} frage={frage} max={10} />
                </dd>
              </>
            )}
            {a.gleicherAbschnitt.length > 0 && (
              <>
                <dt>{t("Gleicher Abschnitt", "Same part")}</dt>
                <dd>
                  <NormChips refs={a.gleicherAbschnitt} frage={frage} max={10} />
                </dd>
              </>
            )}
          </dl>
        ) : (
          <p className="leer-text">{t("Keine Verweise innerhalb des Regelwerks.", "No cross-references within the act.")}</p>
        )}
      </section>
    </article>
  );
}

// ---------- Ortsauskunft ----------

const bplanStatus = (t: T) =>
  ({
    gefunden: [t("verzeichnet", "listed"), "status-gruen"],
    keiner: [t("kein Plan", "no plan"), "status-neutral"],
    fehler: [t("keine Aussage", "no statement"), "status-signal"],
  }) as const;

const denkmalStatus = (t: T) =>
  ({
    "am-standort": [t("am Standort", "at the location"), "status-ocker"],
    umgebung: [t("in der Umgebung", "nearby"), "status-ocker"],
    keiner: [t("kein Eintrag", "none listed"), "status-neutral"],
    fehler: [t("keine Aussage", "no statement"), "status-signal"],
  }) as const;

const osmLink = (lat: number, lon: number) => `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lon}#map=19/${lat}/${lon}`;

export function OrtKarte({ o, frage, kartenId }: { o: OrtAnsicht; frage: Frage; kartenId: string }) {
  const t = useT();
  const { e } = useEinstellungen();
  const [alleDenkmale, setAlleDenkmale] = useState(false);

  if (o.standort.status !== "ok") {
    return (
      <div className="meldung meldung-fehler">
        <p>
          <strong>{t("Ortsauskunft nicht möglich.", "Location check not possible.")}</strong> {o.standort.hinweis}
        </p>
        <p>
          {t(
            "Die Ortsauskunft findet Adressen in ganz Deutschland – mit Postleitzahl wird die Suche eindeutig. Bebauungspläne sind für die Stadt Oldenburg angebunden, Denkmale für Niedersachsen.",
            "The location check finds addresses anywhere in Germany – adding a postcode makes the search unambiguous. Development plans are connected for the City of Oldenburg, monuments for Lower Saxony.",
          )}
        </p>
      </div>
    );
  }

  const s = o.standort;
  const [bLabel, bKlasse] = bplanStatus(t)[o.bplan.status];
  const [dLabel, dKlasse] = denkmalStatus(t)[o.denkmal.status];
  const denkmale = o.denkmal.status !== "fehler" ? o.denkmal.denkmale : [];
  const sichtbar = alleDenkmale ? denkmale : denkmale.slice(0, 4);
  const doku = (art: string) => (e.sprache === "en" ? (DOKUMENT_EN[art] ?? art) : art);

  return (
    <article className="dokument" id={`karte-${kartenId}`}>
      <header className="schriftfeld">
        <div className="sf-haupt">
          <div className="sf-symbol">
            <SymbolPin />
          </div>
          <div className="sf-titel">
            <span className="sf-gesetz">
              {t("Ortsauskunft", "Location check")} · {s.oldenburg ? t("Stadt Oldenburg (Oldb)", "City of Oldenburg (Oldb)") : [s.ort, s.land].filter(Boolean).join(", ")}
            </span>
            <h2>{s.adresse}</h2>
          </div>
        </div>
        <dl className="sf-felder">
          <div>
            <dt>{t("Koordinaten", "Coordinates")}</dt>
            <dd className="mono">
              {s.lat.toFixed(5)}, {s.lon.toFixed(5)}
            </dd>
          </div>
          <div>
            <dt>{t("Abgefragt", "Queried")}</dt>
            <dd className="mono">{o.abgefragtAm}</dd>
          </div>
          <div>
            <dt>{t("Lage prüfen", "Check location")}</dt>
            <dd>
              <a href={osmLink(s.lat, s.lon)} target="_blank" rel="noreferrer">
                {t("Karte öffnen ↗", "Open map ↗")}
              </a>
            </dd>
          </div>
        </dl>
      </header>

      <div className="befund">
        <div className="kachel">
          <div className="kachel-kopf">
            <span className="kachel-titel">
              <SymbolPlan /> {t("Bebauungsplan", "Development plan")}
            </span>
            <span className={`status ${bKlasse}`}>{bLabel}</span>
          </div>
          {o.bplan.status === "fehler" && <p className="kachel-sub">{o.bplan.hinweis}</p>}
          {o.bplan.status === "keiner" && <p className="kachel-wert">{t("Kein rechtsverbindlicher Bebauungsplan verzeichnet", "No legally binding development plan listed")}</p>}
          {o.bplan.status === "gefunden" &&
            o.bplan.plaene.map((p) => (
              <div key={p.nummer} className="plan">
                <p className="kachel-wert">
                  Nr. {p.nummer} – <span lang="de">{p.name}</span>
                </p>
                <p className="kachel-sub">
                  {p.rechtsverbindlichSeit && (
                    <>
                      {t("rechtsverbindlich seit", "legally binding since")} {p.rechtsverbindlichSeit}
                    </>
                  )}
                  {p.baunvo && <> · BauNVO {p.baunvo}</>}
                  {p.vorhabenbezogen && <> · {t("vorhabenbezogen", "project-related")}</>}
                  {p.verfahren && <> · {p.verfahren}</>}
                </p>
                {p.dokumente && p.dokumente.length > 0 ? (
                  <ul className="dokumente">
                    {p.dokumente.map((d) => (
                      <li key={d.url}>
                        <a href={d.url} target="_blank" rel="noreferrer" title={d.name}>
                          {doku(d.art)} ↗
                        </a>
                        <span className="mono">
                          {" "}
                          {d.name} · {d.groesseMB.toLocaleString(e.sprache === "en" ? "en-GB" : "de-DE")} MB
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="kachel-sub">
                    {o.bplan.status === "gefunden" && !o.bplan.dokumenteAbrufbar
                      ? t("Plan-Dokumente derzeit nicht abrufbar – bitte im Kartenportal öffnen.", "Plan documents currently not retrievable – please open them in the map portal.")
                      : t("Keine Plan-Dokumente online verfügbar – erhältlich beim Stadtplanungsamt.", "No plan documents online – available from the city planning office.")}
                  </p>
                )}
              </div>
            ))}
          {o.bplan.status !== "fehler" && o.bplan.weitere && o.bplan.weitere.length > 0 && (
            <ul className="weitere">
              {o.bplan.weitere.map((w, i) => (
                <li key={i}>
                  <span className={`status ${w.art === "in-aufstellung" ? "status-neutral" : "status-ocker"}`}>
                    {w.art === "in-aufstellung"
                      ? t("in Aufstellung", "in preparation")
                      : w.art === "veraenderungssperre"
                        ? t("Veränderungssperre", "development freeze")
                        : t("unwirksam (OVG)", "invalid (court)")}
                  </span>{" "}
                  {[w.nummer && `Nr. ${w.nummer}`, w.name, w.hinweis && `(${w.hinweis})`].filter(Boolean).join(" – ")}
                </li>
              ))}
            </ul>
          )}
          <p className="kachel-quelle">{o.bplan.quelle}</p>
        </div>

        <div className="kachel">
          <div className="kachel-kopf">
            <span className="kachel-titel">
              <SymbolDenkmal /> {t("Denkmalschutz", "Monument protection")}
            </span>
            <span className={`status ${dKlasse}`}>{dLabel}</span>
          </div>
          {o.denkmal.status === "fehler" && <p className="kachel-sub">{o.denkmal.hinweis}</p>}
          {o.denkmal.status === "keiner" && (
            <p className="kachel-wert">
              {t(`Kein Kulturdenkmal im Umkreis von ${o.denkmal.radiusM} m verzeichnet`, `No cultural monument recorded within ${o.denkmal.radiusM} m`)}
            </p>
          )}
          {denkmale.length > 0 && (
            <ul className="dm-liste">
              {sichtbar.map((d, i) => (
                <li key={i}>
                  <span className={`dm-dist ${d.amStandort ? "hier" : ""}`}>{d.amStandort ? t("hier", "here") : `${d.entfernungM} m`}</span>
                  <span lang="de">
                    <span className="dm-name">
                      {d.link ? (
                        <a href={d.link} target="_blank" rel="noreferrer">
                          {d.name}
                        </a>
                      ) : (
                        d.name
                      )}
                    </span>
                    <span className="dm-meta">
                      {d.ausweisung}
                      {d.objekttyp ? ` · ${d.objekttyp}` : ""}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          )}
          {denkmale.length > 4 && !alleDenkmale && (
            <button className="chip chip-mehr" onClick={() => setAlleDenkmale(true)}>
              +{denkmale.length - 4} {t("weitere", "more")}
            </button>
          )}
          <p className="kachel-quelle">{o.denkmal.quelle}</p>
        </div>
      </div>

      <section className="teil">
        <TeilKopf
          nr="01"
          titel={t("Lageskizze", "Site map")}
          zusatz={t("der Gecko markiert Denkmale mit Fähnchen · Mausrad zoomt, Ziehen verschiebt", "the gecko marks monuments with flags · scroll to zoom, drag to pan")}
        />
        <Lageskizze o={o} id={`skizze-${kartenId}`} />
      </section>

      <section className="teil">
        <TeilKopf nr="02" titel={t("Einordnung", "Assessment")} zusatz={t("feste Regeln, keine Rechtsberatung", "fixed rules, not legal advice")} warn />
        <ul className="einordnung">
          {o.einordnung.map((x, i) => (
            <li key={i} className={`ton-${x.ton}`}>
              <span className="ein-thema">{x.thema}</span>
              <p className="ein-titel">{x.titel}</p>
              <p className="ein-text">{x.text}</p>
              {x.paragraphen.length > 0 && <NormChips refs={x.paragraphen} frage={frage} />}
            </li>
          ))}
        </ul>
      </section>

      <section className="teil">
        <TeilKopf nr="03" titel={t("Weiterführend", "Further information")} />
        <div className="links">
          {o.links.map((l) => (
            <a key={l.url} className="knopf knopf-zweit knopf-klein" href={l.url} target="_blank" rel="noreferrer">
              {l.label} ↗
            </a>
          ))}
        </div>
      </section>
      <div className="fusszeile">
        {t(
          `Automatische Auswertung von Datendiensten (${[s.quelle, s.oldenburg && "Stadt Oldenburg", s.land === "Niedersachsen" && "Denkmalatlas Niedersachsen"].filter(Boolean).join(", ")}). Ersetzt keine Auskunft der Bauaufsicht oder der Denkmalschutzbehörde.`,
          `Automatic evaluation of data services (${[s.quelle, s.oldenburg && "City of Oldenburg", s.land === "Niedersachsen" && "Lower Saxony monument atlas"].filter(Boolean).join(", ")}). Does not replace information from the building authority or the monument protection authority.`,
        )}
      </div>
    </article>
  );
}

/**
 * Angeheftete Hauptinformationen zum zuletzt geprüften Gebiet – steht fest über dem Verlauf
 * (scrollt nur mit der Seite), während die Details im Verlauf darunter beweglich bleiben.
 */
export function GebietsLeiste({ o, kartenId, onSchliessen }: { o: OrtAnsicht; kartenId: string; onSchliessen: () => void }) {
  const t = useT();
  if (o.standort.status !== "ok") return null;
  const s = o.standort;
  const [bLabel, bKlasse] = bplanStatus(t)[o.bplan.status];
  const [dLabel, dKlasse] = denkmalStatus(t)[o.denkmal.status];
  const plan = o.bplan.status === "gefunden" ? o.bplan.plaene[0] : undefined;
  const zeichnung = plan?.dokumente?.find((d) => d.art === "Planzeichnung") ?? plan?.dokumente?.[0];
  const denkmale = o.denkmal.status !== "fehler" ? o.denkmal.denkmale : [];
  const naechstes = denkmale[0];
  // nur den Verlauf scrollen (nicht die ganze Seite)
  const zeige = (id: string) => {
    const el = document.getElementById(id);
    const v = el?.closest(".verlauf");
    if (!el || !v) return;
    v.scrollTo({ top: v.scrollTop + el.getBoundingClientRect().top - v.getBoundingClientRect().top - 12, behavior: bewegungAus() ? "auto" : "smooth" });
  };

  const bText =
    o.bplan.status === "gefunden" && plan
      ? `Nr. ${plan.nummer} – ${plan.name}${o.bplan.plaene.length > 1 ? ` (+${o.bplan.plaene.length - 1})` : ""}`
      : o.bplan.status === "keiner"
        ? t("kein rechtsverbindlicher Plan – § 34/35 BauGB", "no binding plan – § 34/35 BauGB")
        : o.bplan.status === "fehler" && o.bplan.nichtAngebunden
          ? t("für diesen Ort nicht angebunden – § 30/34/35 BauGB", "not connected for this place – § 30/34/35 BauGB")
          : t("Dienst nicht erreichbar", "service unreachable");
  const dText =
    o.denkmal.status === "fehler"
      ? o.denkmal.nichtAngebunden
        ? t("Denkmaldaten bisher nur für Niedersachsen", "monument data so far only for Lower Saxony")
        : t("Dienst nicht erreichbar", "service unreachable")
      : naechstes
        ? `${naechstes.amStandort ? t("hier", "here") : `${naechstes.entfernungM} m`}: ${naechstes.name}${denkmale.length > 1 ? ` (+${denkmale.length - 1})` : ""}`
        : t(`keins im Umkreis von ${o.denkmal.radiusM} m`, `none within ${o.denkmal.radiusM} m`);

  return (
    <section className="gebiet" aria-label={t("Hauptinformationen zum Gebiet", "Key facts about the area")}>
      <div className="gebiet-ort">
        <span className="gebiet-symbol">
          <SymbolPin size={20} />
        </span>
        <div>
          <span className="eyebrow">{t("Gebiet", "Area")}</span>
          <strong className="gebiet-adresse">{s.adresse}</strong>
        </div>
      </div>
      <div className="gebiet-fakt">
        <span className="gebiet-label">
          <SymbolPlan /> {t("B-Plan", "Dev. plan")} <span className={`status ${bKlasse}`}>{bLabel}</span>
        </span>
        <span className="gebiet-wert" lang="de">
          {bText}
          {zeichnung && (
            <>
              {" · "}
              <a href={zeichnung.url} target="_blank" rel="noreferrer">
                {t("Planzeichnung ↗", "Plan drawing ↗")}
              </a>
            </>
          )}
        </span>
      </div>
      <div className="gebiet-fakt">
        <span className="gebiet-label">
          <SymbolDenkmal /> {t("Denkmal", "Monument")} <span className={`status ${dKlasse}`}>{dLabel}</span>
        </span>
        <span className="gebiet-wert" lang="de">
          {dText}
        </span>
      </div>
      <div className="gebiet-aktionen">
        <button className="knopf knopf-zweit knopf-klein" onClick={() => zeige(`karte-${kartenId}`)}>
          {t("Details", "Details")}
        </button>
        <button className="knopf knopf-zweit knopf-klein" onClick={() => zeige(`skizze-${kartenId}`)}>
          {t("Karte", "Map")}
        </button>
        <button className="gebiet-zu" onClick={onSchliessen} aria-label={t("Leiste schließen", "Close bar")} title={t("Leiste schließen", "Close bar")}>
          ×
        </button>
      </div>
    </section>
  );
}
