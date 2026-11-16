---
pfad: "scripts/export-obsidian.mjs"
bereich: "Export (Obsidian)"
sprache: "JavaScript (Node, ESM)"
zeilen: 1489
beschreibung: "Exportiert Gesetze und Projektdateien als Obsidian-Vault in den Ordner obsidian/, damit man Aufbau und Zusammenhänge in Obsidian (vor allem in der Graph-Ansicht) ansehen kann."
tags:
  - "projekt"
  - "projekt/export"
---

# scripts/export-obsidian.mjs

**Pfad:** `scripts/export-obsidian.mjs` · **Bereich:** Export (Obsidian) · **Sprache:** JavaScript (Node, ESM) · **Zeilen:** 1489

## Kurzbeschreibung

Exportiert Gesetze und Projektdateien als Obsidian-Vault in den Ordner obsidian/, damit man Aufbau und Zusammenhänge in Obsidian (vor allem in der Graph-Ansicht) ansehen kann.

> [!quote]- Kopfkommentar der Datei (vollständig)
> ```text
> Exportiert Gesetze und Projektdateien als Obsidian-Vault in den Ordner obsidian/,
> damit man Aufbau und Zusammenhänge in Obsidian (vor allem in der Graph-Ansicht) ansehen kann.
> 
>   obsidian/Gesetze/   eine Notiz pro Paragraph/Anlage, pro Gliederungsebene und pro Gesetz
>   obsidian/Projekt/   eine Notiz pro Quelldatei (app, components, lib, scripts, tests) + Architektur
>   obsidian/Start.md   Anleitung, Farblegende und Einstieg
>   obsidian/.obsidian/graph.json  Farbgruppen für die Graph-Ansicht (nur wenn noch nicht vorhanden)
> 
> Grundregel: Der Gesetzestext wird NICHT verändert. Zeichen, die in Markdown/Obsidian eine
> Bedeutung haben (* _ # [ ] | > ` $ % = ~ ^ & < \), werden mit "\" maskiert, damit Obsidian
> den Wortlaut exakt so anzeigt, wie er in der Quelle steht. Ein Selbsttest prüft vor dem
> Schreiben jede Vorschrift: Maskierung wieder entfernen, Leerraum vereinheitlichen und mit dem
> Feld "text" aus data/gesetze/*.json vergleichen. Bei einer Abweichung bricht das Skript ab
> und schreibt nichts.
> 
> Aufruf:  npm run obsidian
>          (Standard: Brotkrumen verlinken nur die direkte Oberebene -> übersichtlicher Baum im Graph)
>          npm run obsidian -- --voller-pfad      (Brotkrumen verlinken alle Ebenen)
>          npm run obsidian -- --graph-farben     (Farbgruppen in einer vorhandenen graph.json neu setzen)
> 
> Das Skript löscht und erzeugt nur obsidian/Gesetze/, obsidian/Projekt/ und obsidian/Start.md.
> Eigene Notizen an anderer Stelle im Vault und der Ordner .obsidian/ bleiben unangetastet.
> ```

## Importiert (lokal)

*Keine lokalen Importe.*

## Daten

- **liest** `data/erlaeuterungen/*.json` → Erläuterungen zu [[BauGB]]
- **liest** `data/gesetze/*` → [[BauGB]], [[NDSchG]]

## Externe Pakete

`node:fs`, `node:path`, `node:url`
