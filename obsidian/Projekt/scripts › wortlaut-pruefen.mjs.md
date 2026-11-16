---
pfad: "scripts/wortlaut-pruefen.mjs"
bereich: "Importskripte"
sprache: "JavaScript (Node, ESM)"
zeilen: 75
beschreibung: "Prüfprogramm \"Wortlaut\": vergleicht jeden gespeicherten BauGB-Paragraphen mit der amtlichen Einzelseite auf gesetze-im-internet.de (unabhängige Darstellung derselben Quelle). Verglichen werden alle Zeichen außer Leerraum – jede abweichende Silbe, Zahl oder jedes Satzzeichen fällt auf."
tags:
  - "projekt"
  - "projekt/importskripte"
---

# scripts/wortlaut-pruefen.mjs

**Pfad:** `scripts/wortlaut-pruefen.mjs` · **Bereich:** Importskripte · **Sprache:** JavaScript (Node, ESM) · **Zeilen:** 75

## Kurzbeschreibung

Prüfprogramm "Wortlaut": vergleicht jeden gespeicherten BauGB-Paragraphen mit der amtlichen Einzelseite auf gesetze-im-internet.de (unabhängige Darstellung derselben Quelle). Verglichen werden alle Zeichen außer Leerraum – jede abweichende Silbe, Zahl oder jedes Satzzeichen fällt auf.

> [!quote]- Kopfkommentar der Datei (vollständig)
> ```text
> Prüfprogramm "Wortlaut": vergleicht jeden gespeicherten BauGB-Paragraphen mit der amtlichen
> Einzelseite auf gesetze-im-internet.de (unabhängige Darstellung derselben Quelle).
> Verglichen werden alle Zeichen außer Leerraum – jede abweichende Silbe, Zahl oder jedes Satzzeichen fällt auf.
> 
> Aufruf: node scripts/wortlaut-pruefen.mjs            (alle Paragraphen, ca. 2 Minuten)
>         node scripts/wortlaut-pruefen.mjs 34 35 13a  (nur ausgewählte)
> 
> Hinweis NDSchG: wurde beim Import gegen NI-VORIS geprüft; der Anbieter behält sich automatisierte
> Abrufe vor (§ 44b UrhG), deshalb hier keine erneute Massenprüfung.
> ```

## Importiert (lokal)

*Keine lokalen Importe.*

## Daten

- **liest** `data/gesetze/baugb.json` → [[BauGB]]

## Externe Pakete

`node:fs`, `node:path`, `node:url`
