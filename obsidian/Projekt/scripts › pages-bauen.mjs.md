---
pfad: "scripts/pages-bauen.mjs"
bereich: "Importskripte"
sprache: "JavaScript (Node, ESM)"
zeilen: 27
beschreibung: "Baut die statische Online-Version für GitHub Pages nach out/. Aufruf: npm run build:pages (optional: NEXT_PUBLIC_BASIS=/Repo-Name, Standard /Bau-Normen-KI)"
tags:
  - "projekt"
  - "projekt/importskripte"
---

# scripts/pages-bauen.mjs

**Pfad:** `scripts/pages-bauen.mjs` · **Bereich:** Importskripte · **Sprache:** JavaScript (Node, ESM) · **Zeilen:** 27

## Kurzbeschreibung

Baut die statische Online-Version für GitHub Pages nach out/. Aufruf: npm run build:pages (optional: NEXT\_PUBLIC\_BASIS\=/Repo-Name, Standard /Bau-Normen-KI)

> [!quote]- Kopfkommentar der Datei (vollständig)
> ```text
> Baut die statische Online-Version für GitHub Pages nach out/.
> Aufruf: npm run build:pages   (optional: NEXT_PUBLIC_BASIS=/Repo-Name, Standard /Bau-Normen-KI)
> 
> 1. Kopiert die Gesetzesdaten (data/gesetze, data/erlaeuterungen, data/stichworte.json) nach public/daten/,
>    damit der Browser sie laden kann.
> 2. Baut Next.js im Modus "export" (siehe next.config.mjs) – ohne Server, ohne API-Route.
> ```

## Importiert (lokal)

*Keine lokalen Importe.*

## Daten

- **schreibt** `data/erlaeuterungen/` → Erläuterungen zu [[BauGB]], [[NDSchG]]
- **schreibt** `data/gesetze/` → [[BauGB]], [[MBO]], [[NDSchG]], [[VOB-A]], [[VOB-B]], [[VOB-C]]
- **schreibt** `data/stichworte.json`

## Externe Pakete

`node:child_process`, `node:fs`
