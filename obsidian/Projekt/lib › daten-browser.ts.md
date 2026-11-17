---
pfad: "lib/daten-browser.ts"
bereich: "Helfer"
sprache: "TypeScript"
zeilen: 40
beschreibung: "Statische Online-Version (GitHub Pages): Es gibt keinen Server. Die Gesetzesdaten liegen als JSON neben der Seite (public/daten, beim Bauen aus data/ kopiert) und der Lotse läuft direkt im Browser – mit genau demselben Code."
tags:
  - "projekt"
  - "projekt/helfer"
---

# lib/daten-browser.ts

**Pfad:** `lib/daten-browser.ts` · **Bereich:** Helfer · **Sprache:** TypeScript · **Zeilen:** 40

## Kurzbeschreibung

Statische Online-Version (GitHub Pages): Es gibt keinen Server. Die Gesetzesdaten liegen als JSON neben der Seite (public/daten, beim Bauen aus data/ kopiert) und der Lotse läuft direkt im Browser – mit genau demselben Code.

## Importiert (lokal)

- [[Projekt/lib › anfrage.ts.md|lib/anfrage.ts]]
- [[Projekt/lib › gesetze.ts.md|lib/gesetze.ts]]
- [[Projekt/lib › typen.ts.md|lib/typen.ts]] – nur Typen

## Stellt bereit

`ladeDaten`, `beantworteImBrowser`

## Wird verwendet von

`components/ChatApp.tsx`  
*(als Links im Bereich „Rückverweise“ von Obsidian)*
