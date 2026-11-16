"use client";
// Brücke zu Obsidian: öffnet den lokal erzeugten Vault (Ordner "obsidian/") über das obsidian://-Protokoll.
// Funktioniert nur auf dem Rechner, auf dem die App läuft und Obsidian installiert ist.
import { useEffect, useRef, useState } from "react";

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
  const dialog = useRef<HTMLDialogElement>(null);
  const lokal = useLokal();
  const [kopiert, setKopiert] = useState(false);

  return (
    <>
      <button className="kopf-knopf" onClick={() => dialog.current?.showModal()}>
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
          <circle cx="5" cy="6" r="2.2" />
          <circle cx="19" cy="5" r="2.2" />
          <circle cx="12" cy="13" r="2.2" />
          <circle cx="6" cy="19" r="2.2" />
          <circle cx="19" cy="18" r="2.2" />
          <path d="M6.8 7.3 10.4 11.4M17.3 6.3l-3.8 5M10.4 14.7 7.5 17.4M14 14l3.3 2.8" />
        </svg>
        Obsidian-Ansicht
      </button>
      <dialog ref={dialog} className="dialog" onClick={(e) => e.target === dialog.current && dialog.current?.close()}>
        <div className="dialog-kopf">
          <h2>Obsidian-Ansicht</h2>
          <button className="dialog-zu" onClick={() => dialog.current?.close()} aria-label="Schließen">
            ×
          </button>
        </div>
        <div className="dialog-inhalt">
          <p>
            Alle Paragraphen von BauGB und NDSchG als vernetzte Notizen – mit Gliederung, Verweisen und den Dateien der App. In der <strong>Graph-Ansicht</strong> (Strg + G) sehen Sie die Zusammenhänge auf einen Blick.
          </p>
          {!vaultPfad ? (
            <p className="dialog-warn">Der Vault wurde noch nicht erzeugt. Bitte einmal <code>npm run obsidian</code> ausführen.</p>
          ) : !lokal ? (
            <p className="dialog-warn">Die Obsidian-Ansicht ist nur auf dem Rechner verfügbar, auf dem die App läuft.</p>
          ) : (
            <>
              <a className="knopf" href={obsidianLink(vaultPfad, "Start.md")}>
                In Obsidian öffnen
              </a>
              <div className="dialog-schritte">
                <span className="sf-gesetz">Beim ersten Mal</span>
                <p>
                  Obsidian muss den Ordner einmal kennen: In Obsidian „Ordner als Vault öffnen“ wählen und diesen Ordner angeben. Danach öffnet der Knopf den Vault direkt.
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
                    {kopiert ? "kopiert ✓" : "Pfad kopieren"}
                  </button>
                </div>
                <p className="dialog-fuss">
                  Farben im Graph: BauGB grün · NDSchG ocker · Gliederung grau-blau · Projektdateien grau. Nach Änderungen an Gesetzen oder Code aktualisiert <code>npm run obsidian</code> den Vault.
                </p>
              </div>
            </>
          )}
        </div>
      </dialog>
    </>
  );
}
