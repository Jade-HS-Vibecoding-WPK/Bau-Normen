"use client";
// Brücke zu Obsidian: öffnet den lokal erzeugten Vault (Ordner "obsidian/") über das obsidian://-Protokoll.
// Funktioniert nur auf dem Rechner, auf dem die App läuft und Obsidian installiert ist.
import { useEffect, useRef, useState } from "react";
import { useT } from "./Einstellungen";

export function obsidianLink(vaultPfad: string, relativeDatei: string): string {
  const trenner = vaultPfad.includes("\\") ? "\\" : "/";
  const voll = [vaultPfad, ...relativeDatei.split("/")].join(trenner);
  return `obsidian://open?path=${encodeURIComponent(voll)}`;
}

export function useLokal(): boolean {
  const [lokal, setLokal] = useState(false);
  useEffect(() => {
    setLokal(["localhost", "127.0.0.1", "[::1]"].includes(window.location.hostname));
  }, []);
  return lokal;
}

export function ObsidianKnopf({ vaultPfad }: { vaultPfad: string | null }) {
  const t = useT();
  const dialog = useRef<HTMLDialogElement>(null);
  const lokal = useLokal();
  const [kopiert, setKopiert] = useState(false);

  return (
    <>
      <button className="kopf-knopf obsidian-knopf" onClick={() => dialog.current?.showModal()}>
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
          <circle cx="5" cy="6" r="2.2" />
          <circle cx="19" cy="5" r="2.2" />
          <circle cx="12" cy="13" r="2.2" />
          <circle cx="6" cy="19" r="2.2" />
          <circle cx="19" cy="18" r="2.2" />
          <path d="M6.8 7.3 10.4 11.4M17.3 6.3l-3.8 5M10.4 14.7 7.5 17.4M14 14l3.3 2.8" />
        </svg>
        {t("Obsidian-Ansicht", "Obsidian view")}
      </button>
      <dialog ref={dialog} className="dialog" onClick={(e) => e.target === dialog.current && dialog.current?.close()}>
        <div className="dialog-kopf">
          <h2>{t("Obsidian-Ansicht", "Obsidian view")}</h2>
          <button className="dialog-zu" onClick={() => dialog.current?.close()} aria-label={t("Schließen", "Close")}>
            ×
          </button>
        </div>
        <div className="dialog-inhalt">
          <p>
            {t(
              "Alle Paragraphen von BauGB, NDSchG, Musterbauordnung und VOB als vernetzte Notizen – mit Gliederung, Verweisen und den Dateien der App. In der Graph-Ansicht (Strg + G) sehen Sie die Zusammenhänge auf einen Blick.",
              "All sections of the BauGB, NDSchG, model building code and VOB as linked notes – with structure, cross-references and the app’s files. The graph view (Ctrl + G) shows how everything connects.",
            )}
          </p>
          {!vaultPfad ? (
            <p className="dialog-warn">
              {t("Der Vault wurde noch nicht erzeugt. Bitte einmal", "The vault has not been generated yet. Please run")} <code>npm run obsidian</code> {t("ausführen.", "once.")}
            </p>
          ) : !lokal ? (
            <p className="dialog-warn">{t("Die Obsidian-Ansicht ist nur auf dem Rechner verfügbar, auf dem die App läuft.", "The Obsidian view is only available on the computer running the app.")}</p>
          ) : (
            <>
              <a className="knopf" href={obsidianLink(vaultPfad, "Start.md")}>
                {t("In Obsidian öffnen", "Open in Obsidian")}
              </a>
              <div className="dialog-schritte">
                <span className="sf-gesetz">{t("Beim ersten Mal", "First time")}</span>
                <p>
                  {t(
                    "Obsidian muss den Ordner einmal kennen: In Obsidian „Ordner als Vault öffnen“ wählen und diesen Ordner angeben. Danach öffnet der Knopf den Vault direkt.",
                    "Obsidian needs to know the folder once: choose “Open folder as vault” in Obsidian and select this folder. After that, the button opens the vault directly.",
                  )}
                </p>
                <div className="pfad">
                  <code>{vaultPfad}</code>
                  <button
                    className="knopf knopf-zweit knopf-klein"
                    onClick={async () => {
                      try {
                        await navigator.clipboard.writeText(vaultPfad);
                        setKopiert(true);
                        setTimeout(() => setKopiert(false), 1600);
                      } catch {
                        /* Zwischenablage nicht verfügbar */
                      }
                    }}
                  >
                    {kopiert ? t("kopiert ✓", "copied ✓") : t("Pfad kopieren", "Copy path")}
                  </button>
                </div>
                <p className="dialog-fuss">
                  {t(
                    "Farben im Graph: BauGB grün · NDSchG ocker · MBO blau · VOB/A violett · VOB/B rot · VOB/C braun · Gliederung grau-blau · Projektdateien grau. Nach Änderungen an Gesetzen oder Code aktualisiert",
                    "Graph colours: BauGB green · NDSchG ochre · MBO blue · VOB/A purple · VOB/B red · VOB/C brown · structure grey-blue · project files grey. After changes to laws or code,",
                  )}{" "}
                  <code>npm run obsidian</code> {t("den Vault.", "updates the vault.")}
                </p>
              </div>
            </>
          )}
        </div>
      </dialog>
    </>
  );
}
