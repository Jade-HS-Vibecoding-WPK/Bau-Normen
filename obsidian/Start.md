# Bau-Normen-KI in Obsidian

Dieser Ordner ist ein **Obsidian-Vault**. Er zeigt die Gesetze Paragraph für Paragraph mit ihrer Gliederung und ihren Verweisen – und daneben die Dateien der App mit ihren Abhängigkeiten.

## So öffnen Sie den Vault

1. Obsidian starten (kostenlos unter obsidian.md).
2. „Ordner als Vault öffnen“ wählen und den Ordner `obsidian` in diesem Projekt auswählen.
3. Die **Graph-Ansicht** öffnen: `Strg+G` oder das Graph-Symbol in der linken Leiste.
4. Im Graph oben rechts das Zahnrad öffnen: Unter „Gruppen“ stehen die Farben, unter „Filter“ lassen sich Teile ausblenden.
5. In jeder Notiz zeigt „Lokalen Graph öffnen“ (Menü ⋯) nur die direkten Nachbarn.

## Farblegende (Graph-Ansicht)

- <span style="color:#7d93ad">●</span> **grau-blau** – Gliederung (Kapitel, Teile, Abschnitte)
- <span style="color:#4a9a5b">●</span> **grün** – BauGB – Paragraphen, Anlagen und Übersicht
- <span style="color:#c8952c">●</span> **ocker** – NDSchG – Paragraphen und Übersicht
- <span style="color:#9a9a9a">●</span> **grau** – Projektdateien und Architektur
- ohne Farbe – diese Startseite

## Einstieg

- [[BauGB]] – Baugesetzbuch (Übersicht mit Inhaltsbaum)
- [[NDSchG]] – Niedersächsisches Denkmalschutzgesetz (Übersicht mit Inhaltsbaum)
- [[Architektur]] – wie die Teile der App zusammenspielen

## Nützliche Filter

In das Suchfeld der Graph-Ansicht eingeben:

- `tag:#gesetz/baugb` – nur BauGB
- `tag:#gesetz/ndschg` – nur NDSchG
- `-tag:#gliederung` – Gliederung ausblenden, dann sieht man nur die Verweise zwischen Paragraphen
- `tag:#projekt` – nur die App-Dateien

## Was steht wo?

- `Gesetze/` – 339 Paragraph- und Anlagen-Notizen, 62 Gliederungsnotizen, 2 Übersichten
- `Projekt/` – 23 Notizen zu Quelldateien und die Notiz [[Architektur]]

## Aktualisieren

Im Projektordner `npm run obsidian` ausführen. Dabei werden `Gesetze/`, `Projekt/` und diese Datei neu erzeugt – eigene Notizen bitte außerhalb dieser Ordner ablegen. Einstellungen in `.obsidian/` bleiben erhalten.

> [!warning] Hinweis
> Der Gesetzestext ist wortgetreu aus den amtlichen Quellen übernommen; maßgeblich ist trotzdem allein die amtliche Fassung (Link in jeder Notiz). Erläuterungen sind ungeprüfte Entwürfe und keine Rechtsberatung.
