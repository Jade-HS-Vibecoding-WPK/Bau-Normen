---
pfad: "scripts/pages-bauen.mjs"
bereich: "Importskripte"
sprache: "JavaScript (Node, ESM)"
zeilen: 60
beschreibung: "Baut die statische Online-Version für GitHub Pages nach out/. Aufruf: npm run build:pages (optional: NEXT_PUBLIC_BASIS=/Repo-Name, Standard /Bau-Normen-KI)"
tags:
  - "projekt"
  - "projekt/importskripte"
---

# scripts/pages-bauen.mjs

**Pfad:** `scripts/pages-bauen.mjs` · **Bereich:** Importskripte · **Sprache:** JavaScript (Node, ESM) · **Zeilen:** 60

## Kurzbeschreibung

Baut die statische Online-Version für GitHub Pages nach out/. Aufruf: npm run build:pages (optional: NEXT\_PUBLIC\_BASIS\=/Repo-Name, Standard /Bau-Normen-KI)

> [!quote]- Kopfkommentar der Datei (vollständig)
> ```text
> Baut die statische Online-Version für GitHub Pages nach out/.
> Aufruf: npm run build:pages   (optional: NEXT_PUBLIC_BASIS=/Repo-Name, Standard /Bau-Normen-KI)
> 
> 1. Bereitet die Daten für den Browser in kleinen Teilen vor (public/daten/), damit die Seite auch mit vielen
>    Regelwerken schnell bleibt – der Browser lädt nur, was er gerade braucht (siehe lib/daten-browser.ts):
>      index.json                    alle Regelwerke: Kopfdaten + je Vorschrift Bezeichnung, Titel, Gliederung, Verweise
>      wortlaut/<gesetz>/<id>.json   Wortlaut (inhalt, fussnoten) je Vorschrift – unverändert aus data/gesetze
>      suche.json                    Suchtexte in Kleinbuchstaben ("gesetz:id" -> text) für die Volltextsuche
>      erlaeuterungen/, stichworte.json  wie in data/
> 2. Baut Next.js im Modus "export" (siehe next.config.mjs) – ohne Server, ohne API-Route.
> ```

## Importiert (lokal)

*Keine lokalen Importe.*

## Daten

- **liest und schreibt** `data/erlaeuterungen/` → Erläuterungen zu [[BauGB]], [[NDSchG]]
- **liest** `data/gesetze/*` → [[BauGB]], [[MBO]], [[NBauO]], [[NDSchG]], [[VOB-A]], [[VOB-B]], [[VOB-C]]
- **schreibt** `data/stichworte.json`

## Externe Pakete

`node:child_process`, `node:fs`, `node:path`
