---
pfad: "scripts/import-vob.mjs"
bereich: "Importskripte"
sprache: "JavaScript (Node, ESM)"
zeilen: 1422
beschreibung: "Importiert die Vergabe- und Vertragsordnung für Bauleistungen – VOB/A (Abschnitte 1 bis 3) und VOB/B – aus den PDF-Bekanntmachungen und speichert sie Paragraph für Paragraph als JSON (data/gesetze/voba.json und data/gesetze/vobb.json) – im selben Schema wie baugb.json."
tags:
  - "projekt"
  - "projekt/importskripte"
---

# scripts/import-vob.mjs

**Pfad:** `scripts/import-vob.mjs` · **Bereich:** Importskripte · **Sprache:** JavaScript (Node, ESM) · **Zeilen:** 1422

## Kurzbeschreibung

Importiert die Vergabe- und Vertragsordnung für Bauleistungen – VOB/A (Abschnitte 1 bis 3) und VOB/B – aus den PDF-Bekanntmachungen und speichert sie Paragraph für Paragraph als JSON (data/gesetze/voba.json und data/gesetze/vobb.json) – im selben Schema wie baugb.json.

> [!quote]- Kopfkommentar der Datei (vollständig)
> ```text
> Importiert die Vergabe- und Vertragsordnung für Bauleistungen – VOB/A (Abschnitte 1 bis 3) und
> VOB/B – aus den PDF-Bekanntmachungen und speichert sie Paragraph für Paragraph als JSON
> (data/gesetze/voba.json und data/gesetze/vobb.json) – im selben Schema wie baugb.json.
> 
> Grundregel: Der Text wird NICHT verändert. Jedes Zeichen stammt aus dem PDF der Quelle; wir speichern
> nur zusätzlich die Struktur (Absätze, Nummern, Buchstaben). Weil PDFs keinen Fließtext enthalten,
> sondern einzelne Zeichen an Positionen, müssen beim Zusammensetzen dokumentierte Entscheidungen
> getroffen werden. Es sind genau diese (alle werden in data/quellen/vob/import-protokoll.txt aufgelistet):
>   1. Zeilen eines Absatzes werden mit einem Leerzeichen verbunden.
>   2. Silbentrennung am Zeilenende („Ver-⏎weisung“): Der Trennstrich entfällt, wenn die nächste Zeile
>      klein weitergeht – außer das zusammengesetzte Wort mit Bindestrich kommt in den Quellen öfter vor
>      als ohne. Er bleibt (ohne Leerzeichen), wenn die nächste Zeile groß oder mit Ziffer beginnt
>      („Lebenszyklus-⏎Stadium“), und bleibt mit Leerzeichen, wenn „und/oder/sowie/bzw.“ folgt
>      (Ergänzungsstrich: „Mehr-⏎oder Minderkosten“ -> „Mehr- oder Minderkosten“).
>   3. Kopf- und Fußzeilen der Seiten (z. B. „Seite 3 von 57“, Seitenzahlen) und das gedrehte
>      Wasserzeichen „nichtamtliche Fassung“ der VOB/B-Lesefassung werden nicht übernommen.
>   4. Fußnoten: Das hochgestellte Fußnotenzeichen (erkannt an kleinerer Schrift und angehobener
>      Grundlinie, nicht am Zeichen selbst) wird aus dem Text genommen; der Fußnotentext steht in
>      „fussnoten“ der Norm („1 Richtlinie 2014/24/EU …“). Fußnoten an einer Abschnittsüberschrift
>      erhält der erste Paragraph des Abschnitts.
>   5. Ein größerer Zeilenabstand innerhalb eines Absatzes oder Listenpunkts (neuer Unterabsatz)
>      wird als Zeilenumbruch {t:"br"} gespeichert.
>   6. § 3a (Abschnitt 1): Die Änderungsbefehle der Bekanntmachungen vom 11.03.2025 (BAnz AT 02.04.2025 B7)
>      und 24.11.2025 (BAnz AT 16.12.2025 B7) werden auf den Text von 2019 angewendet. Der neue Wortlaut
>      wird dabei aus dem PDF der Änderungsbekanntmachung gelesen, nicht von Hand eingetragen.
> 
> Quellen (Stand 17.11.2026):
>   VOB/A Abschnitt 1:     BAnz AT 19.02.2019 B2 (bundesanzeiger.de), § 3a i. d. F. BAnz AT 16.12.2025 B7
>   VOB/A Abschnitte 2, 3: BAnz AT 24.08.2026 B6 (bundesanzeiger.de), Ausgabe 2026
>   VOB/B:                 nichtamtliche Lesefassung 2016 der Fachinformation Bundesbau (fib-bund.de)
> 
> Ablauf:
>   1. PDFs laden -> data/quellen/vob/*.pdf (werden nicht versioniert)
>   2. Text mit Lage und Schriftgröße auslesen (kleiner eigener PDF-Leser, siehe unten)
>      -> data/quellen/vob/*.txt (versioniert; eine Zeile je Textzeile im PDF, hochgestellt als ^{…})
>   3. Aus diesen Textzeilen Paragraphen, Absätze, Nummern und Buchstaben aufbauen -> JSON
> 
> Aufruf:  node scripts/import-vob.mjs            (lädt die PDFs neu herunter und liest sie aus)
>          node scripts/import-vob.mjs --offline  (nutzt die gespeicherten Textauszüge bzw. PDFs)
> ```

## Importiert (lokal)

*Keine lokalen Importe.*

## Daten

- **schreibt** `data/gesetze/` → [[BauGB]], [[MBO]], [[NBauO]], [[NDSchG]], [[VOB-A]], [[VOB-B]], [[VOB-C]]
- **schreibt** `data/gesetze/voba.json` → [[VOB-A]]
- **schreibt** `data/gesetze/vobb.json` → [[VOB-B]]
- **schreibt** `data/quellen/vob/`
- **schreibt** `data/quellen/vob/import-protokoll.txt`

## Externe Pakete

`node:crypto`, `node:fs`, `node:path`, `node:url`, `node:zlib`
