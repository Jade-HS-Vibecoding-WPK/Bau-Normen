---
pfad: "lib/ort/standort.ts"
bereich: "Ortsauskunft"
sprache: "TypeScript"
zeilen: 150
beschreibung: "Adresse -> Koordinaten (Geokodierung) für Adressen in ganz Deutschland. Dienst: Nominatim / OpenStreetMap. Wir prüfen, ob Postleitzahl, Ort und Hausnummer wirklich passen, und sagen es offen, wenn nur die Straße gefunden wurde."
tags:
  - "projekt"
  - "projekt/ortsauskunft"
---

# lib/ort/standort.ts

**Pfad:** `lib/ort/standort.ts` · **Bereich:** Ortsauskunft · **Sprache:** TypeScript · **Zeilen:** 150

## Kurzbeschreibung

Adresse -\> Koordinaten (Geokodierung) für Adressen in ganz Deutschland. Dienst: Nominatim / OpenStreetMap. Wir prüfen, ob Postleitzahl, Ort und Hausnummer wirklich passen, und sagen es offen, wenn nur die Straße gefunden wurde.

> [!quote]- Kopfkommentar der Datei (vollständig)
> ```text
> Adresse -> Koordinaten (Geokodierung) für Adressen in ganz Deutschland.
> Dienst: Nominatim / OpenStreetMap. Wir prüfen, ob Postleitzahl, Ort und Hausnummer wirklich passen,
> und sagen es offen, wenn nur die Straße gefunden wurde.
> 
> Suche:
>  - mit Postleitzahl und/oder Ort: genau dort
>  - ohne beides: zuerst in Oldenburg (Oldb), wo alle Datendienste angebunden sind, dann in ganz Deutschland.
>    Passt die Straße in mehreren Orten, fragt die App nach, statt einen Ort zu raten.
> ```

## Importiert (lokal)

- [[Projekt/lib › ort › abruf.ts.md|lib/ort/abruf.ts]]
- [[Projekt/lib › sprache.ts.md|lib/sprache.ts]]

## Stellt bereit

`AdressEingabe`, `Standort`, `StandortErgebnis`, `findeStandort`

## Wird verwendet von

`lib/ort/index.ts`  
*(als Links im Bereich „Rückverweise“ von Obsidian)*
