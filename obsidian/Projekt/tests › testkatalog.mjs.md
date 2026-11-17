---
pfad: "tests/testkatalog.mjs"
bereich: "Tests"
sprache: "JavaScript (Node, ESM)"
zeilen: 102
beschreibung: "Testkatalog: typische Fragen aus der Baupraxis und was die App antworten MUSS. Aufruf (Server muss laufen): node tests/testkatalog.mjs [http://localhost:3000]"
tags:
  - "projekt"
  - "projekt/tests"
---

# tests/testkatalog.mjs

**Pfad:** `tests/testkatalog.mjs` · **Bereich:** Tests · **Sprache:** JavaScript (Node, ESM) · **Zeilen:** 102

## Kurzbeschreibung

Testkatalog: typische Fragen aus der Baupraxis und was die App antworten MUSS. Aufruf (Server muss laufen): node tests/testkatalog.mjs \[http://localhost:3000\]

> [!quote]- Kopfkommentar der Datei (vollständig)
> ```text
> Testkatalog: typische Fragen aus der Baupraxis und was die App antworten MUSS.
> Aufruf (Server muss laufen):  node tests/testkatalog.mjs [http://localhost:3000]
> 
> Erwartung je Antwort: [art, detail, gesetz]
>   norm:    detail = "§ 34", gesetz = "baugb"
>   treffer: detail = Paragraph, der unter den Treffern sein muss
>   ort:     detail = "bplan-status/denkmal-status" (z. B. "gefunden/keiner"), "*" = egal,
>            "gefunden+dok" = B-Plan gefunden UND Planzeichnung als PDF verlinkt
> Hinweis: Die Orts-Fälle fragen echte Dienste ab (Stadt Oldenburg, Denkmalatlas, OpenStreetMap).
> ```

## Importiert (lokal)

*Keine lokalen Importe.*

## Ruft auf (HTTP)

- [[Projekt/app › api › frage › route.ts.md|app/api/frage/route.ts]]
