---
pfad: "components/Lageskizze.tsx"
bereich: "Oberfläche"
sprache: "TypeScript (React)"
zeilen: 447
beschreibung: "Lageskizze der Ortsauskunft: OpenStreetMap als Hintergrund, darüber Standort, Umkreis 50 m, B-Plan-Umring und Denkmalflächen. Die Karte lässt sich zoomen (Mausrad, Knöpfe, Doppelklick, zwei Finger) und verschieben (Ziehen, Pfeiltasten). Die Fähnchen steckt der Gecko der Seite: Sobald die Skizze im Bild ist, bekommt er einen Auftrag (\"gecko-fahnen\") und läuft von Fahne zu Fahne. Ist der Gecko ausgeblendet (oder sind Animationen aus), erscheinen die Fahnen von selbst. Keine amtliche Karte – die Umrisse kommen aus den Datendiensten (Stadt Oldenburg, Denkmalatlas)."
tags:
  - "projekt"
  - "projekt/oberflaeche"
---

# components/Lageskizze.tsx

**Pfad:** `components/Lageskizze.tsx` · **Bereich:** Oberfläche · **Sprache:** TypeScript (React) · **Zeilen:** 447

## Kurzbeschreibung

Lageskizze der Ortsauskunft: OpenStreetMap als Hintergrund, darüber Standort, Umkreis 50 m, B-Plan-Umring und Denkmalflächen. Die Karte lässt sich zoomen (Mausrad, Knöpfe, Doppelklick, zwei Finger) und verschieben (Ziehen, Pfeiltasten). Die Fähnchen steckt der Gecko der Seite: Sobald die Skizze im Bild ist, bekommt er einen Auftrag ("gecko-fahnen") und läuft von Fahne zu Fahne. Ist der Gecko ausgeblendet (oder sind Animationen aus), erscheinen die Fahnen von selbst. Keine amtliche Karte – die Umrisse kommen aus den Datendiensten (Stadt Oldenburg, Denkmalatlas).

## Importiert (lokal)

- [[Projekt/lib › gecko.ts.md|lib/gecko.ts]] – nur Typen
- [[Projekt/lib › typen.ts.md|lib/typen.ts]] – nur Typen
- [[Projekt/components › Einstellungen.tsx.md|components/Einstellungen.tsx]]

## Stellt bereit

`Lageskizze`

## Wird verwendet von

`components/Karten.tsx`  
*(als Links im Bereich „Rückverweise“ von Obsidian)*

## Externe Pakete

`react`
