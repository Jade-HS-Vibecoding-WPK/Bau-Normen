---
pfad: "lib/verstehen.ts"
bereich: "Lotse"
sprache: "TypeScript"
zeilen: 231
beschreibung: "Der \"Lotse\" – arbeitet regelbasiert, ganz ohne KI. Erkennt: Paragraph-Abrufe (\"§ 34 BauGB\", \"Paragraph 5\"), Adressen (\"Gartenstraße 5\") und Stichworte (kuratiertes Verzeichnis + Volltextsuche). Der Gesetzestext kommt immer unverändert aus der Bibliothek (lib/gesetze.ts)."
tags:
  - "projekt"
  - "projekt/lotse"
---

# lib/verstehen.ts

**Pfad:** `lib/verstehen.ts` · **Bereich:** Lotse · **Sprache:** TypeScript · **Zeilen:** 231

## Kurzbeschreibung

Der "Lotse" – arbeitet regelbasiert, ganz ohne KI. Erkennt: Paragraph-Abrufe ("§ 34 BauGB", "Paragraph 5"), Adressen ("Gartenstraße 5") und Stichworte (kuratiertes Verzeichnis + Volltextsuche). Der Gesetzestext kommt immer unverändert aus der Bibliothek (lib/gesetze.ts).

## Importiert (lokal)

- [[Projekt/lib › gesetze.ts.md|lib/gesetze.ts]]
- [[Projekt/lib › ort › index.ts.md|lib/ort/index.ts]]
- [[Projekt/lib › typen.ts.md|lib/typen.ts]] – nur Typen
- [[Projekt/lib › sprache.ts.md|lib/sprache.ts]]
- [[Projekt/lib › regelwerke.ts.md|lib/regelwerke.ts]]

## Stellt bereit

`erkenneGesetz`, `erkenneDin`, `erkenneNummern`, `erkenneAdresse`, `beantworte`

## Wird verwendet von

`lib/anfrage.ts`  
*(als Links im Bereich „Rückverweise“ von Obsidian)*
