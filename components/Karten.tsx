"use client";
// Antwort-Karten im "Schriftfeld"-Stil: Paragraph (NormKarte) und Ortsauskunft (OrtKarte).
import { useState } from "react";
import { alsText, standDatum } from "@/lib/text";
import type { NormAnsicht, NormRef, OrtAnsicht } from "@/lib/typen";
import Normtext from "./Normtext";
import { obsidianLink, useLokal } from "./Obsidian";
import { SymbolDenkmal, SymbolPin, SymbolPlan } from "./Symbole";

type Frage = (text: string) => void;

const host = (url: string) => {
  try {
    return new URL(url).host.replace(/^www\./, "");
  } catch {
    return url;
  }
};

export function NormChips({ refs, frage, max = 12 }: { refs: NormRef[]; frage: Frage; max?: number }) {
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
          +{refs.length - max} weitere
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

export function NormKarte({ a, frage, obsidianPfad }: { a: NormAnsicht; frage: Frage; obsidianPfad?: string | null }) {
  const [offen, setOffen] = useState(false);
  const lokal = useLokal();
  const [kopiert, setKopiert] = useState(false);
  const { norm, gesetz, erlaeuterung } = a;
  const lang = norm.inhalt.length > 4 || JSON.stringify(norm.inhalt).length > 2500;
  const datum = standDatum(gesetz.stand);
  const nummer = norm.bez.replace(/^§\s*/, "§ ");
  const abschnitt = norm.gliederung.at(-1)?.split(" – ")[1];

  async function kopieren() {
    const t = `${norm.bez} ${gesetz.kurz} – ${norm.titel}\n\n${alsText(norm.inhalt)}\n\nQuelle: ${gesetz.quelleName}, ${norm.url}\nStand: ${gesetz.stand}`;
    try {
      await navigator.clipboard.writeText(t);
      setKopiert(true);
      setTimeout(() => setKopiert(false), 1800);
    } catch {
      /* Zwischenablage nicht verfügbar */
    }
  }

  return (
    <article className="dokument">
      <header className="schriftfeld">
        <div className="sf-haupt">
          <div className="sf-para">{nummer}</div>
          <div className="sf-titel">
            <span className="sf-gesetz">
              {gesetz.kurz} · {gesetz.titel}
            </span>
            <h2>{norm.titel || "(ohne Überschrift)"}</h2>
          </div>
        </div>
        <dl className="sf-felder">
          <div title={norm.gliederung.join(" › ")}>
            <dt>Abschnitt</dt>
            <dd>{abschnitt ?? "–"}</dd>
          </div>
          <div title={gesetz.stand}>
            <dt>Stand</dt>
            <dd className="mono">{datum ?? gesetz.stand}</dd>
          </div>
          <div>
            <dt>Quelle</dt>
            <dd>
              <a href={norm.url} target="_blank" rel="noreferrer">
                {host(norm.url)} ↗
              </a>
            </dd>
          </div>
          <div>
            <dt>Wortlaut</dt>
            <dd>
              <button onClick={kopieren}>{kopiert ? "kopiert ✓" : "kopieren"}</button>
            </dd>
          </div>
          {obsidianPfad && lokal && (
            <div>
              <dt>Obsidian</dt>
              <dd>
                <a href={obsidianLink(obsidianPfad, `Gesetze/${gesetz.kurz}/${norm.bez} ${gesetz.kurz}.md`)}>Notiz öffnen</a>
              </dd>
            </div>
          )}
        </dl>
      </header>

      <section className="teil">
        <TeilKopf nr="01" titel="Originaltext" zusatz="amtlicher Wortlaut, unverändert übernommen" />
        <div className={`original ${lang && !offen ? "eingeklappt" : ""}`}>
          {norm.weggefallen ? <p className="weggefallen">(weggefallen)</p> : <Normtext inhalt={norm.inhalt} />}
          {norm.fussnoten && <p className="fussnote">{norm.fussnoten}</p>}
        </div>
        {lang && (
          <button className="knopf knopf-zweit knopf-klein aufklappen" onClick={() => setOffen(!offen)}>
            {offen ? "Text einklappen" : "Vollständigen Text anzeigen"}
          </button>
        )}
      </section>

      <section className="teil">
        <TeilKopf nr="02" titel="Erläuterung" zusatz="Orientierung, keine Rechtsberatung – maßgeblich ist der Originaltext" warn />
        {erlaeuterung ? (
          <>
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
            {erlaeuterung.status === "entwurf" && <p className="erl-status">Entwurf · fachliche Prüfung ausstehend</p>}
          </>
        ) : (
          <p className="leer-text">Für diesen Paragraphen liegt noch keine Erläuterung vor.</p>
        )}
      </section>

      <section className="teil">
        <TeilKopf nr="03" titel="Zusammenhang" zusatz="aus den Verweisen im Gesetzestext ermittelt" />
        {a.verweistAuf.length || a.erwaehntIn.length || a.gleicherAbschnitt.length ? (
          <dl className="bezug">
            {a.verweistAuf.length > 0 && (
              <>
                <dt>Verweist auf</dt>
                <dd>
                  <NormChips refs={a.verweistAuf} frage={frage} />
                </dd>
              </>
            )}
            {a.erwaehntIn.length > 0 && (
              <>
                <dt>Wird erwähnt in</dt>
                <dd>
                  <NormChips refs={a.erwaehntIn} frage={frage} max={10} />
                </dd>
              </>
            )}
            {a.gleicherAbschnitt.length > 0 && (
              <>
                <dt>Gleicher Abschnitt</dt>
                <dd>
                  <NormChips refs={a.gleicherAbschnitt} frage={frage} max={10} />
                </dd>
              </>
            )}
          </dl>
        ) : (
          <p className="leer-text">Keine Verweise innerhalb des Gesetzes.</p>
        )}
      </section>
    </article>
  );
}

const BPLAN_STATUS = {
  gefunden: ["verzeichnet", "status-gruen"],
  keiner: ["kein Plan", "status-neutral"],
  fehler: ["keine Aussage", "status-signal"],
} as const;

const DENKMAL_STATUS = {
  "am-standort": ["am Standort", "status-ocker"],
  umgebung: ["in der Umgebung", "status-ocker"],
  keiner: ["kein Eintrag", "status-neutral"],
  fehler: ["keine Aussage", "status-signal"],
} as const;

export function OrtKarte({ o, frage }: { o: OrtAnsicht; frage: Frage }) {
  const [alleDenkmale, setAlleDenkmale] = useState(false);

  if (o.standort.status !== "ok") {
    return (
      <div className="meldung meldung-fehler">
        <p>
          <strong>Ortsauskunft nicht möglich.</strong> {o.standort.hinweis}
        </p>
        <p>Die Ortsauskunft gilt derzeit für Adressen in der Stadt Oldenburg (Oldb).</p>
      </div>
    );
  }

  const s = o.standort;
  const [bLabel, bKlasse] = BPLAN_STATUS[o.bplan.status];
  const [dLabel, dKlasse] = DENKMAL_STATUS[o.denkmal.status];
  const denkmale = o.denkmal.status !== "fehler" ? o.denkmal.denkmale : [];
  const sichtbar = alleDenkmale ? denkmale : denkmale.slice(0, 4);
  const karte = `https://www.openstreetmap.org/?mlat=${s.lat}&mlon=${s.lon}#map=19/${s.lat}/${s.lon}`;

  return (
    <article className="dokument">
      <header className="schriftfeld">
        <div className="sf-haupt">
          <div className="sf-symbol">
            <SymbolPin />
          </div>
          <div className="sf-titel">
            <span className="sf-gesetz">Ortsauskunft · Stadt Oldenburg (Oldb)</span>
            <h2>{s.adresse}</h2>
          </div>
        </div>
        <dl className="sf-felder">
          <div>
            <dt>Koordinaten</dt>
            <dd className="mono">
              {s.lat.toFixed(5)}, {s.lon.toFixed(5)}
            </dd>
          </div>
          <div>
            <dt>Abgefragt</dt>
            <dd className="mono">{o.abgefragtAm}</dd>
          </div>
          <div>
            <dt>Lage prüfen</dt>
            <dd>
              <a href={karte} target="_blank" rel="noreferrer">
                Karte öffnen ↗
              </a>
            </dd>
          </div>
        </dl>
      </header>

      <div className="befund">
        <div className="kachel">
          <div className="kachel-kopf">
            <span className="kachel-titel">
              <SymbolPlan /> Bebauungsplan
            </span>
            <span className={`status ${bKlasse}`}>{bLabel}</span>
          </div>
          {o.bplan.status === "fehler" && <p className="kachel-sub">{o.bplan.hinweis}</p>}
          {o.bplan.status === "keiner" && <p className="kachel-wert">Kein rechtsverbindlicher Bebauungsplan verzeichnet</p>}
          {o.bplan.status === "gefunden" &&
            o.bplan.plaene.map((p) => (
              <div key={p.nummer} className="plan">
                <p className="kachel-wert">
                  Nr. {p.nummer} – {p.name}
                </p>
                <p className="kachel-sub">
                  {p.rechtsverbindlichSeit && <>rechtsverbindlich seit {p.rechtsverbindlichSeit}</>}
                  {p.baunvo && <> · BauNVO {p.baunvo}</>}
                  {p.vorhabenbezogen && <> · vorhabenbezogen</>}
                  {p.verfahren && <> · {p.verfahren}</>}
                </p>
                {p.dokumente && p.dokumente.length > 0 ? (
                  <ul className="dokumente">
                    {p.dokumente.map((d) => (
                      <li key={d.url}>
                        <a href={d.url} target="_blank" rel="noreferrer" title={d.name}>
                          {d.art} ↗
                        </a>
                        <span className="mono">
                          {" "}
                          {d.name} · {d.groesseMB.toLocaleString("de-DE")} MB
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="kachel-sub">
                    {o.bplan.status === "gefunden" && !o.bplan.dokumenteAbrufbar
                      ? "Plan-Dokumente derzeit nicht abrufbar – bitte im Kartenportal öffnen."
                      : "Keine Plan-Dokumente online verfügbar – erhältlich beim Stadtplanungsamt."}
                  </p>
                )}
              </div>
            ))}
          {o.bplan.status !== "fehler" && o.bplan.weitere && o.bplan.weitere.length > 0 && (
            <ul className="weitere">
              {o.bplan.weitere.map((w, i) => (
                <li key={i}>
                  <span className={`status ${w.art === "in-aufstellung" ? "status-neutral" : "status-ocker"}`}>
                    {w.art === "in-aufstellung" ? "in Aufstellung" : w.art === "veraenderungssperre" ? "Veränderungssperre" : "unwirksam (OVG)"}
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
              <SymbolDenkmal /> Denkmalschutz
            </span>
            <span className={`status ${dKlasse}`}>{dLabel}</span>
          </div>
          {o.denkmal.status === "fehler" && <p className="kachel-sub">{o.denkmal.hinweis}</p>}
          {o.denkmal.status === "keiner" && <p className="kachel-wert">Kein Kulturdenkmal im Umkreis von {o.denkmal.radiusM} m verzeichnet</p>}
          {denkmale.length > 0 && (
            <ul className="dm-liste">
              {sichtbar.map((d, i) => (
                <li key={i}>
                  <span className={`dm-dist ${d.amStandort ? "hier" : ""}`}>{d.amStandort ? "hier" : `${d.entfernungM} m`}</span>
                  <span>
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
              +{denkmale.length - 4} weitere
            </button>
          )}
          <p className="kachel-quelle">{o.denkmal.quelle}</p>
        </div>
      </div>

      <section className="teil">
        <TeilKopf nr="01" titel="Einordnung" zusatz="feste Regeln, keine Rechtsberatung" warn />
        <ul className="einordnung">
          {o.einordnung.map((e, i) => (
            <li key={i} className={`ton-${e.ton}`}>
              <span className="ein-thema">{e.thema}</span>
              <p className="ein-titel">{e.titel}</p>
              <p className="ein-text">{e.text}</p>
              {e.paragraphen.length > 0 && <NormChips refs={e.paragraphen} frage={frage} />}
            </li>
          ))}
        </ul>
      </section>

      <section className="teil">
        <TeilKopf nr="02" titel="Weiterführend" />
        <div className="links">
          {o.links.map((l) => (
            <a key={l.url} className="knopf knopf-zweit knopf-klein" href={l.url} target="_blank" rel="noreferrer">
              {l.label} ↗
            </a>
          ))}
        </div>
      </section>
      <div className="fusszeile">
        Automatische Auswertung amtlicher Datendienste ({s.quelle}, Stadt Oldenburg, Denkmalatlas Niedersachsen). Ersetzt keine Auskunft der Bauaufsicht oder der Denkmalschutzbehörde.
      </div>
    </article>
  );
}
