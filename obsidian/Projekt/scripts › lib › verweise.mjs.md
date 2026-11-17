---
pfad: "scripts/lib/verweise.mjs"
bereich: "Importskripte"
sprache: "JavaScript (Node, ESM)"
zeilen: 76
beschreibung: "Erkennt Verweise auf andere Paragraphen DESSELBEN Gesetzes im Gesetzestext."
tags:
  - "projekt"
  - "projekt/importskripte"
---

# scripts/lib/verweise.mjs

**Pfad:** `scripts/lib/verweise.mjs` · **Bereich:** Importskripte · **Sprache:** JavaScript (Node, ESM) · **Zeilen:** 76

## Kurzbeschreibung

Erkennt Verweise auf andere Paragraphen DESSELBEN Gesetzes im Gesetzestext.

> [!quote]- Kopfkommentar der Datei (vollständig)
> ```text
> Erkennt Verweise auf andere Paragraphen DESSELBEN Gesetzes im Gesetzestext.
> 
> Beispiele, die erkannt werden:
>   "§ 31 Absatz 1"               -> 31
>   "§§ 31, 33 bis 35"            -> 31, 33, 34, 35 (inkl. z. B. 35a, falls vorhanden)
>   "§ 9 Absatz 1 Nummer 2 und 3" -> 9   (2 und 3 sind Nummern, keine Paragraphen)
> Nicht übernommen werden Verweise auf andere Gesetze:
>   "§ 1 des Bundesnaturschutzgesetzes", "§ 4 der Baunutzungsverordnung"
> ```

## Importiert (lokal)

*Keine lokalen Importe.*

## Stellt bereit

`extrahiereVerweise`

## Wird verwendet von

`scripts/import-baugb.mjs`, `scripts/import-mbo.mjs`, `scripts/import-nbauo.mjs`, `scripts/import-ndschg.mjs`  
*(als Links im Bereich „Rückverweise“ von Obsidian)*
