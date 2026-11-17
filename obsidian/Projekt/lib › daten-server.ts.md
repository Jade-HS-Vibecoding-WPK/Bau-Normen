---
pfad: "lib/daten-server.ts"
bereich: "Helfer"
sprache: "TypeScript"
zeilen: 62
beschreibung: "Datenquelle auf dem Server: liest data/*.json aus dem Dateisystem. Nach einem neuen Import (geänderte Dateien) wird automatisch neu geladen."
tags:
  - "projekt"
  - "projekt/helfer"
---

# lib/daten-server.ts

**Pfad:** `lib/daten-server.ts` · **Bereich:** Helfer · **Sprache:** TypeScript · **Zeilen:** 62

## Kurzbeschreibung

Datenquelle auf dem Server: liest data/\*.json aus dem Dateisystem. Nach einem neuen Import (geänderte Dateien) wird automatisch neu geladen.

## Importiert (lokal)

- [[Projekt/lib › gesetze.ts.md|lib/gesetze.ts]]
- [[Projekt/lib › typen.ts.md|lib/typen.ts]] – nur Typen

## Daten

- **liest** `data/gesetze/*` → [[BauGB]], [[MBO]], [[NBauO]], [[NDSchG]], [[VOB-A]], [[VOB-B]], [[VOB-C]]
- **liest** `data/stichworte.json`

## Stellt bereit

`serverDaten`

## Wird verwendet von

`app/api/frage/route.ts`, `app/page.tsx`  
*(als Links im Bereich „Rückverweise“ von Obsidian)*

## Externe Pakete

`node:fs`, `node:path`
