---
pfad: "scripts/import-mbo.mjs"
bereich: "Importskripte"
sprache: "JavaScript (Node, ESM)"
zeilen: 1052
beschreibung: "Importiert die Musterbauordnung (MBO) aus dem amtlichen PDF des Deutschen Instituts für Bautechnik (DIBt) und speichert sie Paragraph für Paragraph als JSON – im selben Schema wie baugb.json und ndschg.json."
tags:
  - "projekt"
  - "projekt/importskripte"
---

# scripts/import-mbo.mjs

**Pfad:** `scripts/import-mbo.mjs` · **Bereich:** Importskripte · **Sprache:** JavaScript (Node, ESM) · **Zeilen:** 1052

## Kurzbeschreibung

Importiert die Musterbauordnung (MBO) aus dem amtlichen PDF des Deutschen Instituts für Bautechnik (DIBt) und speichert sie Paragraph für Paragraph als JSON – im selben Schema wie baugb.json und ndschg.json.

> [!quote]- Kopfkommentar der Datei (vollständig)
> ```text
> Importiert die Musterbauordnung (MBO) aus dem amtlichen PDF des Deutschen Instituts für
> Bautechnik (DIBt) und speichert sie Paragraph für Paragraph als JSON – im selben Schema wie
> baugb.json und ndschg.json.
> 
> Grundregel: Der Gesetzestext wird NICHT verändert. Wir übernehmen jedes Zeichen so, wie es im
> PDF steht, und speichern nur zusätzlich seine Struktur (Absätze, Nummern, Buchstaben,
> hochgestellte Satznummern). Erlaubt sind allein dokumentierte Reparaturen von Artefakten der
> PDF-Darstellung; jede ist unten beschrieben, wird gezählt und im Prüfprotokoll mit Seite gelistet.
> 
> So kommt der Text zustande:
>   1. PDF laden (www.dibt.de)                       -> data/quellen/mbo/mbo.pdf   (nicht versioniert)
>   2. Textoperatoren des PDF-Inhaltsstroms mit pypdf auslesen (Position, Schriftgröße, fett,
>      Text je Operator) und daraus Zeilen bilden    -> data/quellen/mbo/mbo.txt   (Rohtext, versioniert)
>      Hochgestelltes erkennen wir an der Geometrie: kleinere Schrift (8 statt 12 pt) UND
>      angehobene Grundlinie (+3,2 pt). Es wird im Rohtext als {^…} markiert.
>   3. Zwei unabhängige Vergleichsextraktionen speichern:
>        pdftotext -layout (xpdf/poppler)            -> data/quellen/mbo/mbo-pdftotext.txt
>        pypdf extract_text()                         -> data/quellen/mbo/mbo-pypdf.txt
>   4. Aus mbo.txt Gliederung, Paragraphen, Absätze und Listen aufbauen.
>   5. Gegenprüfung ohne Leerraum: Jede Seite und jeder Paragraph muss Zeichen für Zeichen mit
>      pdftotext übereinstimmen (Seiten zusätzlich mit pypdf extract_text). Ergebnis und alle
>      Einzelentscheidungen stehen in data/quellen/mbo/mbo-pruefung.txt.
> 
> Leerzeichen – die eine Regel: Ein Leerzeichen steht genau dort, wo das PDF ein Leerzeichen-
> Zeichen enthält. Positionslücken ohne Leerzeichen-Zeichen sind KEINE Wortgrenzen. Genau daran
> scheitern die gängigen Extraktoren: pdftotext trennt nach unterschnittenem „W“ („W ände“) und in
> gesperrten Blocksatzzeilen („Nutzungseinhei ten“), pypdf setzt an Grenzen zwischen Textblöcken
> Leerzeichen („si nd“, „Nut zung“). Wo die Vergleichsextraktoren voneinander oder von unserer Regel
> abweichen, wird das im Prüfprotokoll mit Seite und Kategorie aufgelistet (informativ).
> Mehrere Leerzeichen hintereinander werden – wie im Browser – zu einem zusammengefasst.
> 
> Zeilenumbrüche fallen weg: Jede PDF-Zeile, die mit einem Wort endet, trägt im PDF selbst ein
> Leerzeichen-Zeichen am Ende; Zeilen, die mit einem Bindestrich im Wort enden („CE-⏎Zeichen“,
> „öffentlich-⏎rechtlich“), tragen keins; Ergänzungsstriche („Gewerbe- ⏎und“) tragen eins. Damit
> ergibt sich der Text ohne jede Ergänzung – alle Zeilenend-Bindestriche stehen im Prüfprotokoll.
> 
> Reparaturen (jede einzeln gezählt; weicht die Anzahl ab, bricht der Import ab):
>   R1 Silbentrennung am Zeilenende (nur die Fälle in SILBENTRENNUNG): „Brandschutznach- ⏎weisen“
>      (S. 59, „Standsicherheits- oder Brandschutznach- weisen“) -> „Brandschutznachweisen“.
>      Im PDF steht dort Bindestrich + Leerzeichen; gedruckt ist es eine gewöhnliche Worttrennung.
>   R2 Satznummer als Zeichen „²“ statt als hochgestellte Ziffer (§ 16a, § 87 Abs. 4 und 6): wie die
>      übrigen Satznummern als {t:"sup", c:["2"]} gespeichert.
> 
> Hochgestelltes ({t:"sup"}) bleibt im Inhalt erhalten. Im reinen Text (Feld "text") fehlen
> Satznummern und Fußnotenzeichen (sonst klebten sie an den Wörtern: „1Bauliche“); hochgestellte
> Einheiten-Exponenten („m{^3}“) erscheinen dort als „m³“ – wie die übrigen Flächen-/Raumangaben,
> die das PDF ohnehin mit den Zeichen „²“/„³“ schreibt. Fußnotentexte („1 nach Landesrecht“)
> landen im Feld "fussnoten" des Paragraphen, in dem das Fußnotenzeichen steht.
> 
> Nicht übernommen: Titelseite, Inhaltsverzeichnis, Seitenzahlen, Fußnotenbereiche (als Text).
> 
> Voraussetzungen für den Abruf: Python 3 mit pypdf (entwickelt mit pypdf 6.16.2; genutzt werden
> interne Hilfsfunktionen des Layout-Modus) und pdftotext (xpdf oder poppler) im PATH –
> anpassbar über die Umgebungsvariablen PYTHON und PDFTOTEXT.
> 
> Aufruf:  node scripts/import-mbo.mjs                          (lädt das PDF, extrahiert, importiert)
>          node scripts/import-mbo.mjs --offline                (nutzt nur die gespeicherten Textdateien)
>          node scripts/import-mbo.mjs --offline --extrahieren  (extrahiert neu aus gespeichertem mbo.pdf)
> ```

## Importiert (lokal)

- [[Projekt/scripts › lib › verweise.mjs.md|scripts/lib/verweise.mjs]]

## Daten

- **schreibt** `data/gesetze/mbo.json` → [[MBO]]
- **schreibt** `data/quellen/mbo/` → Rohquelle für [[MBO]]
- **liest** `data/quellen/mbo/mbo-pdftotext.txt` → Rohquelle für [[MBO]]
- **schreibt** `data/quellen/mbo/mbo-pruefung.txt` → Rohquelle für [[MBO]]
- **liest und schreibt** `data/quellen/mbo/mbo-pypdf.txt` → Rohquelle für [[MBO]]
- **liest und schreibt** `data/quellen/mbo/mbo.pdf` → Rohquelle für [[MBO]]
- **liest und schreibt** `data/quellen/mbo/mbo.txt` → Rohquelle für [[MBO]]

## Externe Pakete

`node:child_process`, `node:crypto`, `node:fs`, `node:path`, `node:url`
