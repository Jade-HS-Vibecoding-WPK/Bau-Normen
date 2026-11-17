---
pfad: "lib/ort/index.ts"
bereich: "Ortsauskunft"
sprache: "TypeScript"
zeilen: 399
beschreibung: "Ortsauskunft: Adresse in Deutschland -> Standort -> B-Plan (angebunden: Stadt Oldenburg) + Denkmale (angebunden: Denkmalatlas Niedersachsen) -> feste, nachvollziehbare Regeln, welche Paragraphen zu beachten sind. Keine KI beteiligt. Wo kein Dienst angebunden ist, sagt die Auskunft das offen und nennt nur die bundesweit geltenden Regeln (BauGB) – niemals „kein B-Plan“ oder „kein Denkmal“."
tags:
  - "projekt"
  - "projekt/ortsauskunft"
---

# lib/ort/index.ts

**Pfad:** `lib/ort/index.ts` · **Bereich:** Ortsauskunft · **Sprache:** TypeScript · **Zeilen:** 399

## Kurzbeschreibung

Ortsauskunft: Adresse in Deutschland -\> Standort -\> B-Plan (angebunden: Stadt Oldenburg) + Denkmale (angebunden: Denkmalatlas Niedersachsen) -\> feste, nachvollziehbare Regeln, welche Paragraphen zu beachten sind. Keine KI beteiligt. Wo kein Dienst angebunden ist, sagt die Auskunft das offen und nennt nur die bundesweit geltenden Regeln (BauGB) – niemals „kein B-Plan“ oder „kein Denkmal“.

> [!quote]- Kopfkommentar der Datei (vollständig)
> ```text
> Ortsauskunft: Adresse in Deutschland -> Standort -> B-Plan (angebunden: Stadt Oldenburg) + Denkmale
> (angebunden: Denkmalatlas Niedersachsen) -> feste, nachvollziehbare Regeln, welche Paragraphen zu beachten sind.
> Keine KI beteiligt. Wo kein Dienst angebunden ist, sagt die Auskunft das offen und nennt nur die bundesweit
> geltenden Regeln (BauGB) – niemals „kein B-Plan“ oder „kein Denkmal“.
> 
> Grundsatz: Wenn ein Dienst nicht antwortet, sagen wir "keine Aussage möglich" –
> niemals "kein B-Plan" oder "kein Denkmal", nur weil eine Abfrage fehlgeschlagen ist.
> Alle Texte stehen zweisprachig (Deutsch/Englisch) nebeneinander; Paragraphen bleiben im deutschen Original.
> ```

## Importiert (lokal)

- [[Projekt/lib › gesetze.ts.md|lib/gesetze.ts]]
- [[Projekt/lib › sprache.ts.md|lib/sprache.ts]]
- [[Projekt/lib › typen.ts.md|lib/typen.ts]] – nur Typen
- [[Projekt/lib › ort › bplan.ts.md|lib/ort/bplan.ts]]
- [[Projekt/lib › ort › bplan-dokumente.ts.md|lib/ort/bplan-dokumente.ts]]
- [[Projekt/lib › ort › denkmal.ts.md|lib/ort/denkmal.ts]]
- [[Projekt/lib › ort › standort.ts.md|lib/ort/standort.ts]]

## Stellt bereit

`ortsAntwort`

## Wird verwendet von

`lib/anfrage.ts`, `lib/verstehen.ts`  
*(als Links im Bereich „Rückverweise“ von Obsidian)*
