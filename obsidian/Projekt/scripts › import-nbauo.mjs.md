---
pfad: "scripts/import-nbauo.mjs"
bereich: "Importskripte"
sprache: "JavaScript (Node, ESM)"
zeilen: 397
beschreibung: "Importiert die Niedersächsische Bauordnung (NBauO) aus NI-VORIS, dem Niedersächsischen Vorschrifteninformationssystem (voris.wolterskluwer-online.de), und speichert sie Paragraph für Paragraph als JSON – im selben Schema wie ndschg.json und baugb.json."
tags:
  - "projekt"
  - "projekt/importskripte"
---

# scripts/import-nbauo.mjs

**Pfad:** `scripts/import-nbauo.mjs` · **Bereich:** Importskripte · **Sprache:** JavaScript (Node, ESM) · **Zeilen:** 397

## Kurzbeschreibung

Importiert die Niedersächsische Bauordnung (NBauO) aus NI-VORIS, dem Niedersächsischen Vorschrifteninformationssystem (voris.wolterskluwer-online.de), und speichert sie Paragraph für Paragraph als JSON – im selben Schema wie ndschg.json und baugb.json.

> [!quote]- Kopfkommentar der Datei (vollständig)
> ```text
> Importiert die Niedersächsische Bauordnung (NBauO) aus NI-VORIS, dem Niedersächsischen
> Vorschrifteninformationssystem (voris.wolterskluwer-online.de), und speichert sie Paragraph für
> Paragraph als JSON – im selben Schema wie ndschg.json und baugb.json.
> 
> Grundregel: Der Gesetzestext wird NICHT verändert. Wir übernehmen den Wortlaut exakt aus dem
> HTML von NI-VORIS und speichern nur zusätzlich seine Struktur (Absätze, Nummern, Buchstaben).
> Einzige Bearbeitung: Leerraum aus dem HTML-Quelltext (Zeilenumbrüche/Einrückungen, doppelte
> Leerzeichen) wird – wie im Browser – zu einem Leerzeichen zusammengefasst. Geschützte
> Leerzeichen (U+00A0) bleiben wie in der Quelle erhalten.
> 
> Abruf und HTML-Umwandlung wie beim NDSchG (gemeinsamer Code in scripts/lib/voris.mjs):
>   1. Stammdokument „NBauO,NI - Niedersächsische Bauordnung“ -> Stand, gültige Fassung
>   2. Seite „Gesamte Quelle anzeigen“ + per Drupal-AJAX nachgeladene Teile (je Dokument ein Abruf,
>      gut 100 Abrufe mit je 1,2 s Pause, ~2,5 Minuten)
> 
> Besonderheiten der NBauO gegenüber dem NDSchG:
>   - Satznummern: NI-VORIS zeigt die Sätze eines Absatzes hochgestellt nummeriert
>     (<sup class="satz">1</sup>). Sie bleiben im Inhalt als {t:"sup"} erhalten – wie bei der MBO.
>     Im reinen Text (Feld "text") fehlen sie, sonst klebten sie am Wort („1Bauliche“); dort
>     trennt die weggelassene Nummer wie ein Leerzeichen (einmal fehlt in der Quelle das
>     Leerzeichen davor: § 52 Abs. 1 „bereitzuhalten.⁶Die“, einmal steht eins dahinter: § 3a).
>     Die Satznummern jedes Absatzes laufen 1, 2, 3, … (geprüft).
>   - Hochgestellte Exponenten von Maßeinheiten („m<sup>2</sup>“) bleiben im Inhalt {t:"sup"}
>     und erscheinen im Feld "text" als „m²“/„m³“. Andere Hochstellungen gibt es nicht (geprüft).
>   - Der Anhang (Verfahrensfreie Baumaßnahmen, zu § 60 Abs. 1) steht in NI-VORIS nicht in
>     Absatz-Containern, sondern als Folge: „(zu § 60 Abs. 1)“, Übersichtstabelle, dann je Gruppe
>     eine Überschrift „<b>1.</b><br><b>Gebäude</b>“ und die Liste 1.1, 1.2, … (mit a), aa) …).
>     Wir speichern die Gruppen als verschachtelte Liste ({t:"dl"}, Marke „1.“, darin die
>     Gruppenüberschrift fett und die Unterliste) – der Wortlaut bleibt Zeichen für Zeichen gleich.
>   - Nicht in den Normtext übernommen: Fußnotenzeichen, die redaktionelle Anmerkung von NI-VORIS
>     zur Inhaltsübersicht im Stammdokument und die Schlussformel hinter § 88 (separat in
>     "schlussformel"). Lose <p> in einem Paragraphen wären redaktionelle Hinweise ({t:"hinweis"}).
> 
> Vollständigkeit (immer, ohne Abruf): Jeder Eintrag muss ohne Leerraum Zeichen für Zeichen den
> Text seines HTML-Dokuments enthalten (prüft die Umwandlung).
> 
> Gegenprüfung (--pruefen): vergleicht für eine Stichprobe von Paragraphen und den Anhang den
> gespeicherten Wortlaut mit der Druckansicht des Einzeldokuments in NI-VORIS
> (/browse/document/<id>/print/doc) – unabhängig vom Weg über „Gesamte Quelle“. Verglichen werden
> alle Zeichen außer Leerraum. Die Druckseiten liegen unter data/quellen/nbauo/pruefung/.
> 
> NI-VORIS behält sich Text- und Data-Mining vor (§ 44b Abs. 3 UrhG): Rohdaten nur lokal unter
> data/quellen/nbauo/ (nicht versioniert), wenige Abrufe mit Pausen, neutraler User-Agent.
> 
> Aufruf:  npm run import:nbauo                         (lädt die aktuelle Fassung herunter und importiert)
>          npm run import:nbauo -- --offline            (nutzt die bereits gespeicherten Rohdaten)
>          npm run import:nbauo -- --offline --pruefen  (importiert und prüft gegen die Druckansichten;
>                                                        fehlende Druckseiten werden geladen)
> ```

## Importiert (lokal)

- [[Projekt/scripts › lib › verweise.mjs.md|scripts/lib/verweise.mjs]]
- [[Projekt/scripts › lib › voris.mjs.md|scripts/lib/voris.mjs]]

## Daten

- **schreibt** `data/gesetze/nbauo.json` → [[NBauO]]
- **schreibt** `data/quellen/nbauo/pruefung/` → Rohquelle für [[NBauO]]
- **liest und schreibt** `data/quellen/nbauo/pruefung/*.json` → Rohquelle für [[NBauO]]

## Externe Pakete

`node:fs`, `node:path`, `node:url`
