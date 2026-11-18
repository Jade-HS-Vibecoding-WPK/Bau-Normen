# Leitfaden für Erläuterungen

Die Erläuterungen werden einmal geschrieben und **fest gespeichert** (`data/erlaeuterungen/<gesetz>.json`). Die App zeigt sie nur an; zur Laufzeit ist keine KI beteiligt. Bis zur fachlichen Prüfung tragen sie den Status `"entwurf"`.

## Format (je Paragraph)

```json
"34": {
  "kurz": "1 bis 2 Sätze: Worum geht es, für wen ist es wichtig?",
  "punkte": [
    { "titel": "Abs. 1: Stichwort", "text": "1 bis 3 Sätze in einfachen Worten" }
  ],
  "praxis": "1 bis 3 Sätze: Was bedeutet das konkret für Planung und Bau?",
  "status": "entwurf"
}
```

## Regeln

1. **Nur was im Text steht.** Grundlage ist ausschließlich der Wortlaut in `data/gesetze/<gesetz>.json` (Feld `text`). Keine Gerichtsurteile, keine Zahlen, Fristen oder Beispiele, die nicht im Gesetz stehen. Allgemein bekannte Fachbegriffe (z. B. „Bauvoranfrage“, „Bauaufsicht“) sind erlaubt.
2. **Jeder Absatz kommt vor.** Ein Punkt pro Absatz; sehr kleine oder eng zusammenhängende Absätze dürfen zusammengefasst werden („Abs. 4 und 5: …“). Wichtige Bedingungen (wenn, nur, nicht, ausnahmsweise) dürfen nicht verloren gehen.
3. **Leicht verständlich, aber genau.** Kurze Sätze, Fachwörter beim ersten Auftreten kurz erklären. Keine absoluten Aussagen, die der Text nicht trägt.
4. **Verweise exakt.** Andere Paragraphen nur mit den Nummern nennen, die tatsächlich im Text stehen.
5. **Nicht zitieren, sondern erklären.** Keine längeren wörtlichen Passagen; der Originaltext steht ohnehin darüber.
6. **Neutraler Ton**, keine Anrede („Sie“) nötig, keine Rechtsberatung („Sie sollten klagen …“).
7. **Weggefallene Paragraphen** bekommen keine Erläuterung.
8. **Selbstprüfung:** Nach dem Schreiben jede Erläuterung noch einmal Satz für Satz gegen den Originaltext lesen.
9. **Keine Gedankenstriche** („–“, „—“). Stattdessen Komma, Doppelpunkt, Klammer oder einen neuen Satz verwenden; Bereiche als „bis“ schreiben („§§ 14 bis 18“, „Abs. 2 bis 4“). Im Titel eines Punkts steht nach der Fundstelle ein Doppelpunkt („Abs. 1: Stichwort“). Wörtliche Gesetzeszitate bleiben unverändert.
