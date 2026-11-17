---
pfad: "scripts/import-ndschg.mjs"
bereich: "Importskripte"
sprache: "JavaScript (Node, ESM)"
zeilen: 137
beschreibung: "Importiert das Niedersächsische Denkmalschutzgesetz (NDSchG) aus NI-VORIS, dem Niedersächsischen Vorschrifteninformationssystem (voris.wolterskluwer-online.de), und speichert es Paragraph für Paragraph als JSON – im selben Schema wie baugb.json."
tags:
  - "projekt"
  - "projekt/importskripte"
---

# scripts/import-ndschg.mjs

**Pfad:** `scripts/import-ndschg.mjs` · **Bereich:** Importskripte · **Sprache:** JavaScript (Node, ESM) · **Zeilen:** 137

## Kurzbeschreibung

Importiert das Niedersächsische Denkmalschutzgesetz (NDSchG) aus NI-VORIS, dem Niedersächsischen Vorschrifteninformationssystem (voris.wolterskluwer-online.de), und speichert es Paragraph für Paragraph als JSON – im selben Schema wie baugb.json.

> [!quote]- Kopfkommentar der Datei (vollständig)
> ```text
> Importiert das Niedersächsische Denkmalschutzgesetz (NDSchG) aus NI-VORIS,
> dem Niedersächsischen Vorschrifteninformationssystem (voris.wolterskluwer-online.de),
> und speichert es Paragraph für Paragraph als JSON – im selben Schema wie baugb.json.
> 
> Grundregel: Der Gesetzestext wird NICHT verändert. Wir übernehmen den Wortlaut
> exakt aus dem HTML von NI-VORIS und speichern nur zusätzlich seine Struktur
> (Absätze, Nummern, Buchstaben). Einzige Bearbeitung: Leerraum aus dem HTML-Quelltext
> (Zeilenumbrüche/Einrückungen, doppelte Leerzeichen) wird – wie im Browser – zu einem
> Leerzeichen zusammengefasst. Geschützte Leerzeichen (U+00A0) bleiben wie in der Quelle
> erhalten (wie beim BauGB). Nicht in den Normtext übernommen werden: Fußnotenzeichen,
> die Schlussformel hinter § 41 (separat in "schlussformel") und redaktionelle Hinweise
> von NI-VORIS (als {t:"hinweis"} markiert, z. B. § 38).
> 
> So kommt der Text zustande (wie im Browser bei „Gesamte Quelle anzeigen“):
>   1. Stammdokument des Gesetzes laden  -> Stand, gültige Fassung, Link „Gesamte Quelle anzeigen“
>   2. Seite „Gesamte Quelle anzeigen“   -> enthält die ersten Paragraphen direkt …
>   3. … die übrigen lädt die Seite per Drupal-AJAX nach (POST /browse/source/ajax/<id>).
>      Diese Endpunkte rufen wir nacheinander mit kleinen Pausen ab.
> Abruf und HTML-Umwandlung stehen in scripts/lib/voris.mjs (gemeinsam mit import-nbauo.mjs).
> 
> Rohdaten landen unter data/quellen/ndschg/ (dokument.html, quelle.html, nachgeladen.json).
> 
> Aufruf:  npm run import:ndschg             (lädt die aktuelle Fassung herunter, ca. 50 Abrufe, ~1 Minute)
>          npm run import:ndschg -- --offline (nutzt die bereits gespeicherten Rohdaten)
> ```

## Importiert (lokal)

- [[Projekt/scripts › lib › verweise.mjs.md|scripts/lib/verweise.mjs]]
- [[Projekt/scripts › lib › voris.mjs.md|scripts/lib/voris.mjs]]

## Daten

- **schreibt** `data/gesetze/ndschg.json` → [[NDSchG]]
- **verwendet** `data/quellen/ndschg` → Rohquelle für [[NDSchG]]

## Stellt bereit

`alsText`

## Externe Pakete

`node:fs`, `node:path`, `node:url`
