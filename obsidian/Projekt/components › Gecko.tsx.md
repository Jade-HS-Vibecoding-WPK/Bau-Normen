---
pfad: "components/Gecko.tsx"
bereich: "Oberfläche"
sprache: "TypeScript (React)"
zeilen: 624
beschreibung: "Der Gecko – als bewegliches Skelett gezeichnet (Kopf, Rumpf, Becken, Schwanzglieder, vier Beine)."
tags:
  - "projekt"
  - "projekt/oberflaeche"
---

# components/Gecko.tsx

**Pfad:** `components/Gecko.tsx` · **Bereich:** Oberfläche · **Sprache:** TypeScript (React) · **Zeilen:** 624

## Kurzbeschreibung

Der Gecko – als bewegliches Skelett gezeichnet (Kopf, Rumpf, Becken, Schwanzglieder, vier Beine).

> [!quote]- Kopfkommentar der Datei (vollständig)
> ```text
> Der Gecko – als bewegliches Skelett gezeichnet (Kopf, Rumpf, Becken, Schwanzglieder, vier Beine).
> 
> Gang wie beim echten Gecko:
>  - diagonale Beinpaare im Wechsel (vorne links + hinten rechts, dann vorne rechts + hinten links)
>  - aufgesetzte Füße bleiben am Boden kleben, der Körper zieht darüber hinweg
>  - der Rumpf knickt im Takt abwechselnd zur Seite ein, der Schwanz schwingt als Welle nach
> Verhalten auf der Seite:
>  - läuft quer über den Bildschirm von Kasten zu Kasten und bleibt jeweils am rechten Rand stehen
>    (Körpermitte auf der Kante, Blickrichtung = Laufrichtung); klebt dort beim Scrollen fest
>  - setzt sich an neue Antworten; muss er umkehren, wendet er auf der Stelle (nie rückwärts)
>  - beim Darüberfahren rollt er sich ein (Körper als C, Schwanz drumherum, Beine angezogen)
>  - bei Fehlern rot, bei Hinweisen orange; beim Darüberfahren zeigt er die Meldungen
>  - Zusatzauftrag: kommt eine Lageskizze ins Bild, läuft er hin und steckt die Fähnchen
>    (Ereignis "gecko-fahnen"); danach setzt er sich an die Skizze und macht weiter wie oben
>  - über Text wird er durchsichtiger, damit nichts verdeckt wird
>  - "Gecko aus" (fest): sitzt still am Stammplatz und dient nur noch als Signal für Fehler und Hinweise
> Alles folgt festen Regeln – keine KI.
> ```

## Importiert (lokal)

- [[Projekt/lib › gecko.ts.md|lib/gecko.ts]] – nur Typen
- [[Projekt/components › Einstellungen.tsx.md|components/Einstellungen.tsx]]

## Stellt bereit

`Gecko`

## Wird verwendet von

`components/ChatApp.tsx`  
*(als Links im Bereich „Rückverweise“ von Obsidian)*

## Externe Pakete

`react`
