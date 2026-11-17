---
pfad: "lib/gesetze.ts"
bereich: "Bibliothek"
sprache: "TypeScript"
zeilen: 239
beschreibung: "Die \"Bibliothek\": lädt die importierten Gesetze und beantwortet Abrufe. Wichtig: Hier wird kein Text erzeugt – alles stammt 1:1 aus data/gesetze/*.json. Woher die Dateien kommen, regelt die Datenquelle: auf dem Server das Dateisystem (lib/daten-server.ts), in der statischen Online-Version (GitHub Pages) der Browser (lib/daten-browser.ts)."
tags:
  - "projekt"
  - "projekt/bibliothek"
---

# lib/gesetze.ts

**Pfad:** `lib/gesetze.ts` · **Bereich:** Bibliothek · **Sprache:** TypeScript · **Zeilen:** 239

## Kurzbeschreibung

Die "Bibliothek": lädt die importierten Gesetze und beantwortet Abrufe. Wichtig: Hier wird kein Text erzeugt – alles stammt 1:1 aus data/gesetze/\*.json. Woher die Dateien kommen, regelt die Datenquelle: auf dem Server das Dateisystem (lib/daten-server.ts), in der statischen Online-Version (GitHub Pages) der Browser (lib/daten-browser.ts).

> [!quote]- Kopfkommentar der Datei (vollständig)
> ```text
> Die "Bibliothek": lädt die importierten Gesetze und beantwortet Abrufe.
> Wichtig: Hier wird kein Text erzeugt – alles stammt 1:1 aus data/gesetze/*.json.
> Woher die Dateien kommen, regelt die Datenquelle: auf dem Server das Dateisystem (lib/daten-server.ts),
> in der statischen Online-Version (GitHub Pages) der Browser (lib/daten-browser.ts).
> 
> Damit die App auch mit vielen Regelwerken schnell bleibt:
> - Was sich aus den Daten ableiten lässt (Norm nach ID, „wird erwähnt in“, gleicher Abschnitt, Suchtexte),
>   wird einmal je Datenstand berechnet und nicht bei jeder Anfrage.
> - Die Online-Version lädt anfangs nur eine Kurzfassung (Titel, Gliederung, Verweise). Den Wortlaut einer
>   Vorschrift, die Erläuterungen eines Gesetzes und die Suchtexte holt sie erst, wenn sie gebraucht werden.
> ```

## Importiert (lokal)

- [[Projekt/lib › regelwerke.ts.md|lib/regelwerke.ts]]
- [[Projekt/lib › typen.ts.md|lib/typen.ts]] – nur Typen

## Stellt bereit

`Datenquelle`, `setzeDatenquelle`, `alleGesetze`, `gesetzInfo`, `gesetzListe`, `findeNorm`, `normAnsicht`, `stichwortSuche`, `suche`

## Wird verwendet von

`app/page.tsx`, `lib/daten-browser.ts`, `lib/daten-server.ts`, `lib/ort/index.ts`, `lib/verstehen.ts`  
*(als Links im Bereich „Rückverweise“ von Obsidian)*
