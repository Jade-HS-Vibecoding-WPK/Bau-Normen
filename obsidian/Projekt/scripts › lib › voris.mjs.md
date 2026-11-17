---
pfad: "scripts/lib/voris.mjs"
bereich: "Importskripte"
sprache: "JavaScript (Node, ESM)"
zeilen: 400
beschreibung: "Gemeinsame Bausteine für Importe aus NI-VORIS, dem Niedersächsischen Vorschrifteninformationssystem (voris.wolterskluwer-online.de). Genutzt von scripts/import-ndschg.mjs und scripts/import-nbauo.mjs."
tags:
  - "projekt"
  - "projekt/importskripte"
---

# scripts/lib/voris.mjs

**Pfad:** `scripts/lib/voris.mjs` · **Bereich:** Importskripte · **Sprache:** JavaScript (Node, ESM) · **Zeilen:** 400

## Kurzbeschreibung

Gemeinsame Bausteine für Importe aus NI-VORIS, dem Niedersächsischen Vorschrifteninformationssystem (voris.wolterskluwer-online.de). Genutzt von scripts/import-ndschg.mjs und scripts/import-nbauo.mjs.

> [!quote]- Kopfkommentar der Datei (vollständig)
> ```text
> Gemeinsame Bausteine für Importe aus NI-VORIS, dem Niedersächsischen
> Vorschrifteninformationssystem (voris.wolterskluwer-online.de).
> Genutzt von scripts/import-ndschg.mjs und scripts/import-nbauo.mjs.
> 
> Grundregel: Der Gesetzestext wird NICHT verändert. Wir übernehmen den Wortlaut exakt aus dem
> HTML von NI-VORIS und speichern nur zusätzlich seine Struktur (Absätze, Nummern, Buchstaben).
> Einzige Bearbeitung: Leerraum aus dem HTML-Quelltext (Zeilenumbrüche/Einrückungen, doppelte
> Leerzeichen) wird – wie im Browser – zu einem Leerzeichen zusammengefasst. Geschützte
> Leerzeichen (U+00A0) bleiben wie in der Quelle erhalten.
> 
> So kommt der Text zustande (wie im Browser bei „Gesamte Quelle anzeigen“):
>   1. Stammdokument des Gesetzes laden  -> Stand, gültige Fassung, Link „Gesamte Quelle anzeigen“
>   2. Seite „Gesamte Quelle anzeigen“   -> enthält die ersten Paragraphen direkt …
>   3. … die übrigen lädt die Seite per Drupal-AJAX nach (POST /browse/source/ajax/<id>).
>      Diese Endpunkte rufen wir nacheinander mit kleinen Pausen ab.
> 
> NI-VORIS behält sich Text- und Data-Mining vor (§ 44b Abs. 3 UrhG): wenige Abrufe, Pausen,
> neutraler User-Agent; Rohdaten nur lokal unter data/quellen/<gesetz>/ (nicht versioniert).
> ```

## Importiert (lokal)

*Keine lokalen Importe.*

## Stellt bereit

`BASIS`, `PAUSE_MS`, `pause`, `holeText`, `ladeQuelle`, `zusammensetzen`, `aktuelleFassung`, `parseFragment`, `kinder`, `tag`, `klassen`, `hatKlasse`, `elemente`, `finde`, `text`, `SATZNUMMERN`, `inline`, `leer`, `bloecke`, `liste`, `tabelle`, `normWs`, `aufraeumen`, `trimmen`, `alsText`, `normInhalt`, `schlussformel`, `fussnotenText`, `stuecke`, `gliederungAusUeberschrift`, `kopfDaten`, `fuerVerweise`

## Wird verwendet von

`scripts/import-nbauo.mjs`, `scripts/import-ndschg.mjs`  
*(als Links im Bereich „Rückverweise“ von Obsidian)*

## Externe Pakete

`@xmldom/xmldom`, `node:fs`, `node:path`
