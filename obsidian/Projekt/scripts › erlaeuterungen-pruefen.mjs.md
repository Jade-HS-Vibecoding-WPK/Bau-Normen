---
pfad: "scripts/erlaeuterungen-pruefen.mjs"
bereich: "Importskripte"
sprache: "JavaScript (Node, ESM)"
zeilen: 112
beschreibung: "Prüft die fest gespeicherten Erläuterungen und führt neue Teil-Dateien zusammen."
tags:
  - "projekt"
  - "projekt/importskripte"
---

# scripts/erlaeuterungen-pruefen.mjs

**Pfad:** `scripts/erlaeuterungen-pruefen.mjs` · **Bereich:** Importskripte · **Sprache:** JavaScript (Node, ESM) · **Zeilen:** 112

## Kurzbeschreibung

Prüft die fest gespeicherten Erläuterungen und führt neue Teil-Dateien zusammen.

> [!quote]- Kopfkommentar der Datei (vollständig)
> ```text
> Prüft die fest gespeicherten Erläuterungen und führt neue Teil-Dateien zusammen.
> 
>   node scripts/erlaeuterungen-pruefen.mjs              -> nur prüfen
>   node scripts/erlaeuterungen-pruefen.mjs --uebernehmen -> data/erlaeuterungen/_teile/*.json übernehmen
>                                                             (bestehende Einträge bleiben, außer --ueberschreiben)
> 
> Geprüft wird je Erläuterung:
>  - Paragraph existiert im Gesetz und ist nicht weggefallen
>  - Pflichtfelder vorhanden (kurz, punkte[titel,text], status)
>  - Alle in der Erläuterung genannten Paragraphen ("§ 31", "§§ 14 und 15") kommen auch im Originaltext vor
>    oder sind der Paragraph selbst  -> sonst Warnung (mögliche Erfindung)
>  - Erwähnte Absätze ("Abs. 4") gibt es im Originaltext
> ```

## Importiert (lokal)

*Keine lokalen Importe.*

## Daten

- **liest** `data/erlaeuterungen/` → Erläuterungen zu [[BauGB]], [[NDSchG]]
- **liest** `data/erlaeuterungen/_teile/*` → Erläuterungen zu [[BauGB]], [[NDSchG]]
- **schreibt** `data/erlaeuterungen/*.json` → Erläuterungen zu [[BauGB]], [[NDSchG]]
- **liest** `data/gesetze/*` → [[BauGB]], [[MBO]], [[NDSchG]], [[VOB-A]], [[VOB-B]], [[VOB-C]]

## Externe Pakete

`node:fs`, `node:path`, `node:url`
