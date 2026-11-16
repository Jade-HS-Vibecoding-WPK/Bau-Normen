---
pfad: "scripts/import-baugb.mjs"
bereich: "Importskripte"
sprache: "JavaScript (Node, ESM)"
zeilen: 208
beschreibung: "Importiert das Baugesetzbuch aus der amtlichen XML-Fassung von gesetze-im-internet.de und speichert es Paragraph für Paragraph als JSON."
tags:
  - "projekt"
  - "projekt/importskripte"
---

# scripts/import-baugb.mjs

**Pfad:** `scripts/import-baugb.mjs` · **Bereich:** Importskripte · **Sprache:** JavaScript (Node, ESM) · **Zeilen:** 208

## Kurzbeschreibung

Importiert das Baugesetzbuch aus der amtlichen XML-Fassung von gesetze-im-internet.de und speichert es Paragraph für Paragraph als JSON.

> [!quote]- Kopfkommentar der Datei (vollständig)
> ```text
> Importiert das Baugesetzbuch aus der amtlichen XML-Fassung von gesetze-im-internet.de
> und speichert es Paragraph für Paragraph als JSON.
> 
> Grundregel: Der Gesetzestext wird NICHT verändert. Wir übernehmen den Wortlaut
> exakt aus der XML-Datei und speichern nur zusätzlich seine Struktur
> (Absätze, Nummern, Buchstaben), damit er im Chat sauber dargestellt werden kann.
> 
> Aufruf:  npm run import:baugb            (lädt die aktuelle Fassung herunter)
>          npm run import:baugb -- --offline (nutzt die bereits gespeicherte XML-Datei)
> ```

## Importiert (lokal)

- [[Projekt/scripts › lib › verweise.mjs.md|scripts/lib/verweise.mjs]]

## Daten

- **schreibt** `data/gesetze/baugb.json` → [[BauGB]]
- **liest und schreibt** `data/quellen/baugb/*` → Rohquelle für [[BauGB]]
- **schreibt** `data/quellen/baugb/xml.zip` → Rohquelle für [[BauGB]]

## Stellt bereit

`alsText`

## Externe Pakete

`@xmldom/xmldom`, `node:child_process`, `node:fs`, `node:path`, `node:url`
