---
pfad: "lib/ort/index.ts"
bereich: "Ortsauskunft"
sprache: "TypeScript"
zeilen: 251
beschreibung: "Ortsauskunft: Adresse -> Standort -> B-Plan (Stadt Oldenburg) + Denkmale (Denkmalatlas Niedersachsen) -> feste, nachvollziehbare Regeln, welche Paragraphen zu beachten sind. Keine KI beteiligt."
tags:
  - "projekt"
  - "projekt/ortsauskunft"
---

# lib/ort/index.ts

**Pfad:** `lib/ort/index.ts` · **Bereich:** Ortsauskunft · **Sprache:** TypeScript · **Zeilen:** 251

## Kurzbeschreibung

Ortsauskunft: Adresse -\> Standort -\> B-Plan (Stadt Oldenburg) + Denkmale (Denkmalatlas Niedersachsen) -\> feste, nachvollziehbare Regeln, welche Paragraphen zu beachten sind. Keine KI beteiligt.

> [!quote]- Kopfkommentar der Datei (vollständig)
> ```text
> Ortsauskunft: Adresse -> Standort -> B-Plan (Stadt Oldenburg) + Denkmale (Denkmalatlas Niedersachsen)
> -> feste, nachvollziehbare Regeln, welche Paragraphen zu beachten sind. Keine KI beteiligt.
> 
> Grundsatz: Wenn ein Dienst nicht antwortet, sagen wir "keine Aussage möglich" –
> niemals "kein B-Plan" oder "kein Denkmal", nur weil eine Abfrage fehlgeschlagen ist.
> ```

## Importiert (lokal)

- [[Projekt/lib › gesetze.ts.md|lib/gesetze.ts]]
- [[Projekt/lib › typen.ts.md|lib/typen.ts]] – nur Typen
- [[Projekt/lib › ort › bplan.ts.md|lib/ort/bplan.ts]]
- [[Projekt/lib › ort › bplan-dokumente.ts.md|lib/ort/bplan-dokumente.ts]]
- [[Projekt/lib › ort › denkmal.ts.md|lib/ort/denkmal.ts]]
- [[Projekt/lib › ort › standort.ts.md|lib/ort/standort.ts]]

## Stellt bereit

`ortsauskunft`

## Wird verwendet von

`app/api/frage/route.ts`, `lib/verstehen.ts`  
*(als Links im Bereich „Rückverweise“ von Obsidian)*
