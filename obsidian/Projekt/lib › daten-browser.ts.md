---
pfad: "lib/daten-browser.ts"
bereich: "Helfer"
sprache: "TypeScript"
zeilen: 73
beschreibung: "Statische Online-Version (GitHub Pages): Es gibt keinen Server. Die Daten liegen als JSON neben der Seite (public/daten, von scripts/pages-bauen.mjs aus data/ erzeugt) und der Lotse läuft direkt im Browser – mit genau demselben Code wie auf dem Server."
tags:
  - "projekt"
  - "projekt/helfer"
---

# lib/daten-browser.ts

**Pfad:** `lib/daten-browser.ts` · **Bereich:** Helfer · **Sprache:** TypeScript · **Zeilen:** 73

## Kurzbeschreibung

Statische Online-Version (GitHub Pages): Es gibt keinen Server. Die Daten liegen als JSON neben der Seite (public/daten, von scripts/pages-bauen.mjs aus data/ erzeugt) und der Lotse läuft direkt im Browser – mit genau demselben Code wie auf dem Server.

> [!quote]- Kopfkommentar der Datei (vollständig)
> ```text
> Statische Online-Version (GitHub Pages): Es gibt keinen Server. Die Daten liegen als JSON neben der Seite
> (public/daten, von scripts/pages-bauen.mjs aus data/ erzeugt) und der Lotse läuft direkt im Browser – mit genau
> demselben Code wie auf dem Server.
> 
> Damit die Seite schnell bleibt, auch wenn weitere Regelwerke dazukommen, wird in Stufen geladen:
>   index.json                       sofort: alle Regelwerke mit Titel, Gliederung und Verweisen je Vorschrift (klein)
>   wortlaut/<gesetz>/<id>.json      erst, wenn eine Vorschrift angezeigt wird
>   erlaeuterungen/<gesetz>.json     erst, wenn die erste Vorschrift dieses Gesetzes angezeigt wird
>   suche.json                       erst bei einer Freitextsuche
> Alles Geladene bleibt für die Sitzung im Speicher.
> ```

## Importiert (lokal)

- [[Projekt/lib › anfrage.ts.md|lib/anfrage.ts]]
- [[Projekt/lib › gesetze.ts.md|lib/gesetze.ts]]
- [[Projekt/lib › typen.ts.md|lib/typen.ts]] – nur Typen

## Stellt bereit

`ladeDaten`, `beantworteImBrowser`

## Wird verwendet von

`components/ChatApp.tsx`  
*(als Links im Bereich „Rückverweise“ von Obsidian)*
