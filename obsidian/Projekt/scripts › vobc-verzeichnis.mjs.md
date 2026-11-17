---
pfad: "scripts/vobc-verzeichnis.mjs"
bereich: "Importskripte"
sprache: "JavaScript (Node, ESM)"
zeilen: 149
beschreibung: "Erzeugt das Verzeichnis der VOB Teil C (Allgemeine Technische Vertragsbedingungen für Bauleistungen, ATV) als data/gesetze/vobc.json – im selben Schema wie die Gesetze, aber OHNE Wortlaut."
tags:
  - "projekt"
  - "projekt/importskripte"
---

# scripts/vobc-verzeichnis.mjs

**Pfad:** `scripts/vobc-verzeichnis.mjs` · **Bereich:** Importskripte · **Sprache:** JavaScript (Node, ESM) · **Zeilen:** 149

## Kurzbeschreibung

Erzeugt das Verzeichnis der VOB Teil C (Allgemeine Technische Vertragsbedingungen für Bauleistungen, ATV) als data/gesetze/vobc.json – im selben Schema wie die Gesetze, aber OHNE Wortlaut.

> [!quote]- Kopfkommentar der Datei (vollständig)
> ```text
> Erzeugt das Verzeichnis der VOB Teil C (Allgemeine Technische Vertragsbedingungen für Bauleistungen, ATV)
> als data/gesetze/vobc.json – im selben Schema wie die Gesetze, aber OHNE Wortlaut.
> 
> Warum ohne Wortlaut? Die ATV erscheinen als DIN-Normen (DIN 18299 ff.). Normen privater Normungsorganisationen
> bleiben urheberrechtlich geschützt, auch wenn Gesetze oder Verträge auf sie verweisen (§ 5 Abs. 3 UrhG).
> Der Text ist nur bei DIN Media erhältlich. Die App führt deshalb nur Nummer und Titel jeder ATV.
> 
> Stand: VOB Gesamtausgabe 2019 mit Ergänzungsband 2023 (Einführungserlass des BMWSB vom 20.09.2023,
> in Kraft seit 01.10.2023). DIN 18310 ist zurückgezogen und gehört nicht mehr dazu.
> Titel abgeglichen mit dem BMWSB-Erlass (für die 2023 überarbeiteten und neuen ATV) und dem Normenverzeichnis
> von DIN Media. Abweichung: Der Erlass schreibt bei DIN 18451 „Gerüstbauarbeiten“, der Normtitel lautet „Gerüstarbeiten“.
> 
> Aufruf: node scripts/vobc-verzeichnis.mjs
> ```

## Importiert (lokal)

*Keine lokalen Importe.*

## Daten

- **schreibt** `data/gesetze/vobc.json` → [[VOB-C]]

## Externe Pakete

`node:fs`, `node:path`, `node:url`
