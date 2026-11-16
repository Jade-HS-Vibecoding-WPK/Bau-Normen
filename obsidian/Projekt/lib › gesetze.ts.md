---
pfad: "lib/gesetze.ts"
bereich: "Bibliothek"
sprache: "TypeScript"
zeilen: 169
beschreibung: "Die \"Bibliothek\": lädt die importierten Gesetze und beantwortet Abrufe. Wichtig: Hier wird kein Text erzeugt – alles stammt 1:1 aus data/gesetze/*.json."
tags:
  - "projekt"
  - "projekt/bibliothek"
---

# lib/gesetze.ts

**Pfad:** `lib/gesetze.ts` · **Bereich:** Bibliothek · **Sprache:** TypeScript · **Zeilen:** 169

## Kurzbeschreibung

Die "Bibliothek": lädt die importierten Gesetze und beantwortet Abrufe. Wichtig: Hier wird kein Text erzeugt – alles stammt 1:1 aus data/gesetze/\*.json.

## Importiert (lokal)

- [[Projekt/lib › typen.ts.md|lib/typen.ts]] – nur Typen

## Daten

- **liest** `data/erlaeuterungen/*.json` → Erläuterungen zu [[BauGB]]
- **liest** `data/gesetze/*` → [[BauGB]], [[NDSchG]]
- **liest** `data/stichworte.json`

## Stellt bereit

`alleGesetze`, `gesetzInfo`, `gesetzListe`, `findeNorm`, `normAnsicht`, `stichwortSuche`, `suche`

## Wird verwendet von

`app/page.tsx`, `lib/ort/index.ts`, `lib/verstehen.ts`  
*(als Links im Bereich „Rückverweise“ von Obsidian)*

## Externe Pakete

`node:fs`, `node:path`
