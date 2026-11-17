<p align="center">
  <img src="docs/bilder/banner.png" alt="Bau-Normen-KI – Baurecht im Wortlaut, Ortsauskunft Oldenburg" width="100%">
</p>

<p align="center">
  <a href="https://jade-hs-vibecoding-wpk.github.io/Bau-Normen-KI/"><b>▶ Online ausprobieren</b></a>
  &nbsp;·&nbsp; <a href="#schnellstart">Lokal starten</a>
  &nbsp;·&nbsp; <a href="#so-funktioniert-es">So funktioniert es</a>
  &nbsp;·&nbsp; <a href="TODO.md">Plan &amp; nächste Schritte</a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Next.js-16-1e3428?logo=nextdotjs&logoColor=white" alt="Next.js 16">
  <img src="https://img.shields.io/badge/zur%20Laufzeit-ohne%20KI-4d7858" alt="Läuft ohne KI">
  <img src="https://img.shields.io/badge/Wortlaut-297%2F297%20gepr%C3%BCft-6c9570" alt="Wortlaut 297/297 geprüft">
  <img src="https://img.shields.io/badge/Testkatalog-29%2F29-a7bb57" alt="Testkatalog 29/29">
  <img src="https://img.shields.io/badge/Lizenz-MIT-345a43" alt="Lizenz MIT">
</p>

# Bau-Normen-KI – Baurecht im Wortlaut

Ein Nachschlage- und Auskunftswerkzeug für die Baubranche:

- **Gesetze im amtlichen Wortlaut** – Baugesetzbuch (BauGB) und Niedersächsisches Denkmalschutzgesetz (NDSchG), Paragraph für Paragraph, unverändert aus den amtlichen Quellen
- **verständlich erklärt** – zu jedem Paragraphen eine Erläuterung und die zusammenhängenden Vorschriften
- **Ortsauskunft für Oldenburg (Oldb)** – zu einer Adresse: gilt ein Bebauungsplan, gibt es Kulturdenkmale, welche Paragraphen sind zu beachten

> **Prototyp**, Stand 17.11.2026. Die Auskünfte ersetzen keine Rechtsberatung und keine Auskunft der Bauaufsicht oder der Denkmalschutzbehörde.

<p align="center">
  <img src="docs/bilder/startseite.png" alt="Startseite: links die Formulare Ortsauskunft, Paragraph abrufen und Bibliothek, rechts der Auskunftsbereich mit Beispielen" width="100%">
</p>

---

## Inhalt

1. [Funktionen](#funktionen)
2. [Einblick](#einblick)
3. [Grundsätze: Warum man der App trauen kann](#grundsätze-warum-man-der-app-trauen-kann)
4. [Schnellstart](#schnellstart)
5. [Online-Version (GitHub Pages)](#online-version-github-pages)
6. [Bedienung](#bedienung)
7. [So funktioniert es](#so-funktioniert-es)
8. [Projektstruktur](#projektstruktur)
9. [Befehle](#befehle)
10. [Gesetze aktualisieren](#gesetze-aktualisieren)
11. [Qualitätssicherung](#qualitätssicherung)
12. [Gestaltung](#gestaltung)
13. [Obsidian-Ansicht](#obsidian-ansicht)
14. [Der Gecko](#der-gecko)
15. [Datenquellen und Rechtliches](#datenquellen-und-rechtliches)
16. [Weiterführende Dokumente](#weiterführende-dokumente)

---

## Funktionen

| Funktion | Was passiert |
|---|---|
| **Paragraph abrufen** | „§ 34 BauGB“, „§§ 30, 34 und 35 BauGB“, „35 BauGB“, „Paragraph 13a“ – der Paragraph erscheint im amtlichen Wortlaut mit Stand, Quelle und Kopier-Knopf. Gibt es eine Nummer in beiden Gesetzen („Paragraph 5“), fragt die App nach. Gibt es sie nicht („§ 300 BauGB“), sagt sie das – statt zu raten. |
| **Erläuterung** | Unter dem Wortlaut steht eine leicht verständliche, aber detaillierte Erläuterung: Kurzfassung, jeder Absatz einzeln, Hinweis für die Praxis. Vorhanden für BauGB §§ 1–38 und das komplette NDSchG (88 Paragraphen, Status „Entwurf“). |
| **Zusammenhang** | „Verweist auf“, „Wird erwähnt in“ und „Gleicher Abschnitt“ – automatisch aus den Verweisen im Gesetzestext ermittelt, jeweils anklickbar. |
| **Stichwortsuche** | „Vorkaufsrecht“, „Innenbereich“, „Bauen neben einem Denkmal“ – ein von Hand gepflegtes Stichwortverzeichnis (rund 60 Fachbegriffe) plus Volltextsuche. |
| **Ortsauskunft Oldenburg** | Adresse → Standort → **Bebauungsplan** der Stadt Oldenburg (mit Planzeichnung und Begründung als PDF, falls online verfügbar), **Pläne in Aufstellung**, **Veränderungssperren** → **Kulturdenkmale** im Umkreis von 50 m (Denkmalatlas Niedersachsen) → **Einordnung** nach festen Regeln mit den einschlägigen Paragraphen. |
| **Gebietsleiste** | Die Hauptinformationen zum zuletzt geprüften Gebiet – Adresse, Bebauungsplan (mit Link zur Planzeichnung) und Denkmalschutz – stehen fest über dem Verlauf. Sie bewegen sich nur mit der Seite; die Details darunter scrollen wie im Chat. |
| **Lageskizze** | Skizze des Standorts auf einer **OpenStreetMap-Karte**: Umkreis 50 m, B-Plan-Grenze, Denkmalflächen. Die Karte lässt sich **zoomen** (Mausrad, +/−, Doppelklick, zwei Finger) und **verschieben** (Ziehen, Pfeiltasten). Der Gecko der Seite läuft hin und steckt an Standort und Denkmalen die Fähnchen. |
| **Obsidian-Ansicht** | Alle Paragraphen, die Gliederung und die Dateien der App als vernetzte Notizen für [Obsidian](https://obsidian.md) – mit Graph-Ansicht. |
| **Gecko** | Ein kleines Maskottchen, das auf der Seite unterwegs ist und bei Fehlern oder Hinweisen die Farbe wechselt. Über Text wird er durchsichtig; auf Wunsch sitzt er still und dient nur als Signal. |
| **Hell & Dunkel** | Helles und dunkles Farbschema, oder automatisch wie im Betriebssystem eingestellt (Menü **Darstellung**). |
| **Deutsch & Englisch** | Die gesamte Oberfläche, die Ortsauskunft und alle Hinweise gibt es auf Deutsch und Englisch (Umschalter **DE/EN**). Der Gesetzestext bleibt im amtlichen deutschen Wortlaut. |
| **Online-Version** | Die App läuft auch ohne Server direkt im Browser – veröffentlicht auf [GitHub Pages](https://jade-hs-vibecoding-wpk.github.io/Bau-Normen-KI/). |

---

## Einblick

<table>
  <tr>
    <td width="50%" valign="top">
      <img src="docs/bilder/paragraph.png" alt="Paragraph-Karte § 34 BauGB mit amtlichem Wortlaut" width="100%">
      <p align="center"><b>Paragraph abrufen</b><br><sub>„§ 34 BauGB“ – Wortlaut mit Stand, Quelle und Kopier-Knopf</sub></p>
    </td>
    <td width="50%" valign="top">
      <img src="docs/bilder/ortsauskunft.png" alt="Ortsauskunft Gartenstraße 5 mit Bebauungsplan und Denkmalschutz" width="100%">
      <p align="center"><b>Ortsauskunft</b><br><sub>„Gartenstraße 5“ – Bebauungsplan und Kulturdenkmale, live abgefragt</sub></p>
    </td>
  </tr>
  <tr>
    <td width="50%" valign="top">
      <img src="docs/bilder/erlaeuterung.png" alt="Erläuterung zu § 34 BauGB mit Absätzen, Praxishinweis und Zusammenhang" width="100%">
      <p align="center"><b>Erläuterung &amp; Zusammenhang</b><br><sub>jeder Absatz einzeln erklärt, verwandte Paragraphen zum Weiterklicken</sub></p>
    </td>
    <td width="50%" valign="top">
      <img src="docs/bilder/lageskizze.png" alt="Lageskizze auf OpenStreetMap: Der Gecko steckt Fähnchen an den Denkmalen" width="100%">
      <p align="center"><b>Lageskizze</b><br><sub>auf OpenStreetMap – der Gecko läuft hin und steckt die Fähnchen</sub></p>
    </td>
  </tr>
</table>

<p align="center">
  <img src="docs/bilder/dunkel-englisch.png" alt="Ortsauskunft Damm 30 im dunklen Farbschema auf Englisch, mit angehefteter Gebietsleiste" width="100%">
  <br><sub><b>Dunkel &amp; Englisch</b> – Ortsauskunft „Damm 30“ mit angehefteter Gebietsleiste; umschaltbar über <b>DE/EN</b> und <b>Darstellung</b></sub>
</p>

<table>
  <tr>
    <td width="33%" valign="top"><img src="docs/bilder/mobil.png" alt="Startseite auf dem Smartphone" width="100%"></td>
    <td width="33%" valign="top"><img src="docs/bilder/mobil-paragraph.png" alt="§ 8 NDSchG auf dem Smartphone" width="100%"></td>
    <td width="34%" valign="middle">
      <b>Auch unterwegs</b><br>
      Auf dem Smartphone stehen Auskunft und Eingabe oben, die Formulare darunter. Gesetzestext und Erläuterung bleiben gut lesbar – etwa beim Ortstermin oder auf der Baustelle.
    </td>
  </tr>
</table>

---

## Grundsätze: Warum man der App trauen kann

1. **Der Gesetzestext wird nie von einer KI geschrieben.** Er wird einmal aus der amtlichen Quelle importiert und unverändert angezeigt. Ein Prüfprogramm vergleicht jeden gespeicherten BauGB-Paragraphen Zeichen für Zeichen mit der amtlichen Einzelseite (zuletzt: 297 von 297 identisch).
2. **Die App braucht zur Laufzeit keine KI.** Paragraphen, Stichworte und Ortsauskunft funktionieren nach festen, nachvollziehbaren Regeln. Es wird kein API-Schlüssel benötigt.
3. **Erläuterungen sind fest gespeichert** – sie wurden während der Entwicklung geschrieben, gegen den Gesetzestext geprüft und als Datei abgelegt. Jede/r sieht denselben Text; bis zur fachlichen Prüfung tragen sie den Status „Entwurf“.
4. **Kein Raten bei Ausfällen.** Antwortet ein Datendienst nicht, steht dort „keine Aussage möglich“ – niemals „kein B-Plan“ oder „kein Denkmal“.
5. **Quelle und Stand stehen immer dabei.**
6. **Hinweis Denkmalschutz:** In Niedersachsen ist ein Kulturdenkmal auch ohne Eintrag im Verzeichnis geschützt (§ 5 Abs. 1 NDSchG). Kein Treffer im Denkmalatlas heißt also nicht automatisch „kein Denkmal“ – die App weist jedes Mal darauf hin.
7. **Englisch ohne Übersetzungsdienst:** Alle englischen Texte stehen im Code direkt neben dem deutschen Original (`t("…", "…")`). Gesetzestext und Erläuterungen werden nicht übersetzt – verbindlich ist allein der deutsche Wortlaut, und die App sagt das auch auf Englisch.

---

## Schnellstart

Voraussetzung: [Node.js](https://nodejs.org) 20 oder neuer.

```bash
npm install
npm run dev
```

Dann im Browser **http://localhost:3000** öffnen.

Die Gesetze und Erläuterungen liegen bereits im Repository (`data/`) – ein Import ist für den Start nicht nötig. Für die Ortsauskunft braucht der Rechner eine Internetverbindung.

Ohne Installation geht es auch: **[Online-Version auf GitHub Pages](https://jade-hs-vibecoding-wpk.github.io/Bau-Normen-KI/)**.

---

## Online-Version (GitHub Pages)

**Adresse:** https://jade-hs-vibecoding-wpk.github.io/Bau-Normen-KI/

GitHub Pages liefert nur fertige Dateien aus – einen Server gibt es dort nicht. Die App ist deshalb so gebaut, dass **derselbe Code** in zwei Betriebsarten läuft:

| | Lokal (`npm run dev`) | Online (GitHub Pages) |
|---|---|---|
| Wer beantwortet die Anfrage? | Next.js-Server, Schnittstelle `/api/frage` | der Browser selbst |
| Woher kommen Gesetze und Erläuterungen? | `data/` vom Dateisystem (`lib/daten-server.ts`) | Kopie unter `/daten/`, wird beim ersten Abruf geladen (`lib/daten-browser.ts`) |
| Ortsauskunft | Server fragt Stadt Oldenburg, Denkmalatlas und OpenStreetMap ab | Browser fragt dieselben Dienste direkt ab (alle erlauben das) |
| Obsidian-Knopf | ja | nein – der Vault liegt nur auf dem eigenen Rechner |

Lotse, Bibliothek und Ortsauskunft (`lib/`) sind in beiden Fällen identisch – es gibt keine zweite, abweichende Fassung der Regeln.

**Veröffentlichen:** Bei jedem Push auf `main` baut der Workflow [`.github/workflows/pages.yml`](.github/workflows/pages.yml) die Seite neu und veröffentlicht sie. Einmalig muss im Repository unter **Settings → Pages → Source** „**GitHub Actions**“ ausgewählt sein.

**Lokal ausprobieren:**

```bash
npm run build:pages      # baut die Online-Version nach out/
npm run preview:pages    # zeigt sie unter http://localhost:3100/Bau-Normen-KI/
```

---

## Bedienung

Die Seite hat links drei feste Formulare und rechts den Auskunftsbereich mit Eingabefeld. Oben rechts stehen die Sprachwahl **DE/EN** und das Menü **Darstellung**.

| Bereich | Verwendung |
|---|---|
| **A · Ortsauskunft Oldenburg** | Straße und Hausnummer eintragen → „Standort prüfen“ |
| **B · Paragraph abrufen** | Gesetz wählen, Nummer eintragen (z. B. `34` oder `13a`) → „Wortlaut anzeigen“ |
| **C · Bibliothek** | Welche Gesetze in welchem Stand enthalten sind, mit Link zur amtlichen Quelle |
| **Eingabefeld unten** | Freie Eingabe: Paragraph, Stichwort oder Adresse, z. B. „Ich brauche § 35 BauGB“, „section 35 BauGB“, „Vorkaufsrecht“, „Gartenstraße 5“ |
| **Gebietsleiste** | Erscheint nach einer Ortsauskunft fest über dem Verlauf: Adresse, B-Plan, Denkmalschutz; „Details“ und „Karte“ springen zur Auskunft, „×“ blendet sie aus |
| **DE / EN** | Sprache der Oberfläche und der Antworten (neue Anfragen werden in der gewählten Sprache beantwortet) |
| **Darstellung** | Farbschema Hell / Dunkel / Auto · Gecko „Läuft“ oder „Sitzt still“ · Animationen an/aus – wird im Browser gemerkt |

In jeder Paragraph-Karte: **kopieren** (Wortlaut mit Quelle in die Zwischenablage), **Quelle ↗** (amtliche Einzelseite), **Obsidian → Notiz öffnen** (nur lokal), Paragraphen-Chips zum Weiterklicken.

Karte der Lageskizze: **Mausrad** oder **+/−** zoomt, **Ziehen** verschiebt, **Doppelklick** zoomt hinein, der Knopf mit dem Fadenkreuz setzt zurück. Auf dem Smartphone mit zwei Fingern; per Tastatur nach einem Klick in die Karte mit den Pfeiltasten, `+`, `−` und `0`.

---

## So funktioniert es

```mermaid
flowchart LR
  A["Anfrage<br/>Formular oder Eingabefeld"] --> W{"lokal oder<br/>online?"}
  W -->|"lokal"| R["Server<br/>app/api/frage"]
  W -->|"GitHub Pages"| BR["Browser<br/>lib/daten-browser.ts"]
  R --> L["Lotse<br/>lib/verstehen.ts"]
  BR --> L
  L -->|"Paragraph / Stichwort"| B["Bibliothek<br/>lib/gesetze.ts"]
  B --> D[("data/gesetze<br/>data/erlaeuterungen<br/>data/stichworte.json")]
  L -->|"Adresse"| O["Ortsauskunft<br/>lib/ort/"]
  O --> N["OpenStreetMap<br/>Adresse → Koordinaten"]
  O --> S["Stadt Oldenburg<br/>B-Pläne, PDFs, Verfahren"]
  O --> M["Denkmalatlas<br/>Niedersachsen"]
  B --> K["Antwortkarten<br/>components/"]
  O --> K
  classDef kern fill:#cfe4d3,stroke:#4d7858,color:#1e3428
  classDef daten fill:#e7ebcb,stroke:#a7bb57,color:#1e3428
  classDef dienst fill:#f1ede2,stroke:#92b38e,color:#1e3428
  class L,B,O,K kern
  class D daten
  class N,S,M dienst
```

- **Lotse** (`lib/verstehen.ts`): erkennt nach festen Mustern, ob nach einem Paragraphen, einem Stichwort oder einer Adresse gefragt wird.
- **Bibliothek** (`lib/gesetze.ts`): liefert Wortlaut, Erläuterung und Zusammenhänge aus `data/` – hier wird kein Text erzeugt.
- **Ortsauskunft** (`lib/ort/`): fragt die Datendienste ab und leitet nach festen Regeln ab, welche Paragraphen gelten (z. B. kein B-Plan → § 34 oder § 35 BauGB; Denkmal am Standort → § 10 NDSchG).
- **Oberfläche** (`components/`): zeigt die Antworten als Karten – mit Kopfteil (Paragraph, Titel, Stand, Quelle) und den Abschnitten Originaltext, Erläuterung, Zusammenhang.
- **Datenquelle** (`lib/daten-server.ts` bzw. `lib/daten-browser.ts`): regelt nur, *woher* die Dateien kommen – Dateisystem oder Browser.

---

## Projektstruktur

| Pfad | Inhalt |
|---|---|
| `app/` | Seite (`page.tsx`), Grundgerüst und Schriften (`layout.tsx`), Gestaltung (`globals.css`) und die Schnittstelle `api/frage/route.ts` für die lokale Fassung |
| `components/` | Oberfläche: `ChatApp.tsx` (Seite mit Formularen und Verlauf), `Karten.tsx` (Paragraph- und Ortsauskunft-Karte), `Normtext.tsx` (Wortlaut), `Lageskizze.tsx` (Karte und Fähnchen), `Obsidian.tsx` (Knopf und Links), `Gecko.tsx`, `Organisch.tsx` (Flächen, Höhenlinien, Linienzeichnung), `Einstellungen.tsx` (Sprache, Farbschema, Gecko, Animationen), `Symbole.tsx` |
| `lib/` | Logik: `anfrage.ts` (eine Anfrage bearbeiten), `verstehen.ts` (Lotse), `gesetze.ts` (Bibliothek, Suche), `daten-server.ts` / `daten-browser.ts` (Datenquelle lokal bzw. online), `ort/` (Ortsauskunft: Standort, B-Plan, Plan-Dokumente, Denkmale, Geometrie), `gecko.ts` (Regeln für den Gecko), `sprache.ts` (Deutsch/Englisch), `vorab.ts` (Einstellungen vor dem ersten Zeichnen), `typen.ts`, `text.ts` |
| `data/gesetze/` | Die Gesetze als JSON – Paragraph für Paragraph mit Struktur, Wortlaut und erkannten Verweisen |
| `data/erlaeuterungen/` | Erläuterungen je Gesetz, dazu `LEITFADEN.md` (Regeln zum Schreiben) und `PRUEFHINWEISE.md` (Stellen für die fachliche Prüfung) |
| `data/stichworte.json` | Stichwortverzeichnis (Begriff → Paragraphen) |
| `data/quellen/` | Amtliche Rohdaten (BauGB-XML); NI-VORIS-Rohdaten werden bewusst nicht versioniert |
| `scripts/` | Import der Gesetze, Prüfprogramme, Obsidian-Export, Bau und Vorschau der Online-Version (`pages-bauen.mjs`, `pages-vorschau.mjs`) |
| `tests/testkatalog.mjs` | Testfragen mit erwarteten Antworten |
| `obsidian/` | Erzeugter Obsidian-Vault (Gesetze, Gliederung, Projektdateien) |
| `.github/workflows/pages.yml` | Veröffentlicht die Online-Version bei jedem Push auf `main` |
| `docs/bilder/` | Bilder für diese README (Screenshots, Banner, Gestaltung – Banner und Gestaltung mit HTML-Quelle) |
| `TODO.md` | Plan, erledigte Punkte, nächste Schritte |

---

## Befehle

| Befehl | Zweck |
|---|---|
| `npm run dev` | App lokal starten (http://localhost:3000) |
| `npm run build` / `npm start` | Produktionsversion bauen bzw. starten |
| `npm run build:pages` | Online-Version für GitHub Pages nach `out/` bauen |
| `npm run preview:pages` | Online-Version lokal ansehen (http://localhost:3100/Bau-Normen-KI/) |
| `npm run import:all` | BauGB und NDSchG neu aus den amtlichen Quellen laden (`import:baugb`, `import:ndschg` einzeln) |
| `node scripts/wortlaut-pruefen.mjs` | Jeden BauGB-Paragraphen mit der amtlichen Einzelseite vergleichen (ca. 2 Minuten; einzelne: `… 34 35`) |
| `node scripts/erlaeuterungen-pruefen.mjs` | Erläuterungen prüfen (Pflichtfelder, nur Paragraphen/Absätze, die es im Original gibt) |
| `npm run obsidian` | Obsidian-Vault neu erzeugen – mit Selbsttest, dass der Wortlaut unverändert ist |
| `node tests/testkatalog.mjs` | Testkatalog gegen die laufende App (`npm run dev` muss laufen; fragt teils echte Dienste ab) |

---

## Gesetze aktualisieren

Wenn sich ein Gesetz ändert (das NDSchG etwa wird derzeit im Landtag novelliert):

```bash
npm run import:all                          # 1. neue Fassung laden
node scripts/wortlaut-pruefen.mjs           # 2. Wortlaut gegen die amtlichen Seiten prüfen
node scripts/erlaeuterungen-pruefen.mjs     # 3. passen die Erläuterungen noch?
npm run obsidian                            # 4. Obsidian-Vault aktualisieren
node tests/testkatalog.mjs                  # 5. Testkatalog (App muss laufen)
```

Geänderte Paragraphen sollten danach auch inhaltlich mit ihrer Erläuterung abgeglichen werden. Die Online-Version übernimmt die neuen Daten automatisch beim nächsten Push auf `main`.

---

## Qualitätssicherung

| Prüfung | Ergebnis (17.11.2026) |
|---|---|
| Wortlaut BauGB gegen gesetze-im-internet.de | 297/297 Paragraphen identisch |
| Wortlaut NDSchG gegen NI-VORIS (beim Import) | Stichproben Zeichen für Zeichen identisch |
| Erläuterungen (automatische Prüfung) | 88 Erläuterungen, 0 Fehler, 0 Warnungen |
| Obsidian-Export (Wortlaut-Selbsttest) | 339/339 Vorschriften identisch |
| Testkatalog | 29/29 Fragen – Paragraphen, Rückfragen, Stichworte, Ortsauskunft (live) |
| Online-Version (statischer Bau) | Paragraph, Rückfrage, Stichwort und Ortsauskunft mit B-Plan-PDFs direkt im Browser geprüft, keine Fehler |

---

## Gestaltung

<p align="center">
  <img src="docs/bilder/gestaltung.png" alt="Farbpalette Tanne, Moos, Minze, Aqua, Flieder, Papier und die Schriften Fraunces, Figtree, DM Mono, Source Serif 4" width="100%">
</p>

**„Gelände & Linie“** – Organic Shapes & Line Art, hell und pastellig, abgeleitet aus dem Fachgebiet:

- **Weiche Flächen** in Minze, Aqua und Flieder – wie Grünflächen im Lageplan. Sie liegen im Hintergrund, in den Kennungen A/B/C und hinter der Paragraphennummer.
- **Heller Kopf** mit Pastellverlauf (Minze → Aqua → Flieder) und weicher, gewellter Unterkante; Tannengrün nur für Schrift und Knöpfe, damit alles gut lesbar bleibt.
- **Höhenlinien** – feine, konzentrische Linien wie auf einer Geländekarte, als ruhige Linienkunst im Kopf der Karten und im Hintergrund.
- **Linienzeichnung** auf der Startseite: Gelände, Haus, Pflanze, Baum – mit einem durchgehenden Strich.
- **Hell und Dunkel:** Beide Farbschemata nutzen dieselben Formen; im Dunkelmodus wird auch die Kartenkachel abgedunkelt. Alle Farben sind als CSS-Variablen festgelegt.
- **Lesbarkeit zuerst:** Der Gesetzestext steht auf ruhigem, fast weißem Grund in einer Buchschrift; die Dekoration bleibt im Hintergrund und ist für Screenreader ausgeblendet.

Farben und Formen sind zentral als CSS-Variablen in [`app/globals.css`](app/globals.css) festgelegt, die Formen in [`components/Organisch.tsx`](components/Organisch.tsx).

---

## Obsidian-Ansicht

Der Ordner `obsidian/` ist ein [Obsidian](https://obsidian.md)-Vault:

- je Paragraph eine Notiz mit Wortlaut, Erläuterung, Verweisen und Quelle
- die Gliederung (Kapitel → Teil → Abschnitt) als Baum
- jede Datei der App mit Kurzbeschreibung und Verbindungen zu anderen Dateien
- Farben im Graph: BauGB grün · NDSchG ocker · Gliederung grau-blau · Projektdateien grau

**Öffnen:** einmalig in Obsidian „Ordner als Vault öffnen“ → Ordner `obsidian` wählen. Danach öffnet der Knopf **„Obsidian-Ansicht“** oben rechts in der App den Vault direkt, und jede Paragraph-Karte hat einen Link „Notiz öffnen“. Graph-Ansicht: `Strg + G`. (Nur in der lokalen Fassung – die Online-Version hat keinen Zugriff auf den eigenen Rechner.)

Nach Änderungen an Gesetzen oder Code: `npm run obsidian`.

---

## Der Gecko

<img src="docs/bilder/gecko.png" alt="Roter, eingerollter Gecko mit der Meldung: Fantasiestraße 999 wurde in Oldenburg nicht gefunden" width="470" align="right">

Ein kleines, bewusst zurückhaltendes Maskottchen:

- läuft quer über den Bildschirm von Kasten zu Kasten und bleibt am **rechten Rand** der Kästen stehen
- setzt sich an neue Antworten; im Stehen ist er ruhig, rollt die Schwanzspitze ein und schaut sich ab und zu um
- **Fähnchen:** Kommt bei einer Ortsauskunft die Lageskizze ins Bild, läuft er auf die Karte und steckt an Standort und Denkmalen nacheinander die Fähnchen – danach setzt er sich an den Rand der Skizze. Ist er ausgeblendet, erscheinen die Fähnchen von selbst.
- **Maus darüber:** er rollt sich ein
- **Farbe:** grün = alles in Ordnung · **orange** = Hinweis (z. B. Hausnummer nicht gefunden, kein Stichwort erkannt) · **rot** = Fehler (z. B. Paragraph existiert nicht, Dienst nicht erreichbar) – beim Darüberfahren zeigt er die Meldungen
- **über Text** wird er durchsichtig, damit er nichts verdeckt; auf der Karte bleibt er deutlich sichtbar
- **Darstellung → Gecko „Sitzt still“:** Er setzt sich unten rechts an den Auskunftsbereich und bleibt dort. Er bewegt nur noch Kopf und Schwanz und zeigt weiterhin Fehler und Hinweise an; die Fähnchen erscheinen dann von selbst
- **Animationen aus** (oder „reduzierte Bewegung“ im Betriebssystem): Er sitzt ganz still, auch sonst bewegt sich nichts von selbst
- er blockiert keine Klicks

Gezeichnet wird er als bewegliches Skelett (Kopf, Rumpf, Schwanzglieder, vier Beine); der Gang folgt dem echten Vorbild: diagonale Beinpaare im Wechsel, der Rumpf knickt im Takt abwechselnd zur Seite ein.

<br clear="right">

---

## Datenquellen und Rechtliches

| Daten | Quelle |
|---|---|
| BauGB | Bundesministerium der Justiz / juris – [gesetze-im-internet.de](https://www.gesetze-im-internet.de/bbaug/) (XML) |
| NDSchG | Niedersächsisches Vorschrifteninformationssystem (NI-VORIS) |
| Bebauungspläne | Stadt Oldenburg – Open Data „Umringe rechtsverbindlicher Bebauungspläne“ und Kartenportal „Bauen & Wohnen“ (Plan-Dokumente, Pläne in Aufstellung, Veränderungssperren) |
| Kulturdenkmale | [Denkmalatlas Niedersachsen](https://denkmalatlas.niedersachsen.de) – Niedersächsisches Landesamt für Denkmalpflege |
| Adresssuche | OpenStreetMap / Nominatim |
| Hintergrundkarte der Lageskizze | © [OpenStreetMap-Mitwirkende](https://www.openstreetmap.org/copyright) (ODbL), Kacheln von tile.openstreetmap.org |
| Schriften | Fraunces, Figtree, DM Mono, Source Serif 4 – Google Fonts (SIL Open Font License), beim Bauen eingebunden |

- Amtliche Gesetzestexte sind gemeinfrei (§ 5 UrhG).
- NI-VORIS behält sich automatisiertes Text- und Data-Mining vor. Gespeichert und veröffentlicht wird deshalb nur der gemeinfreie Gesetzestext, nicht die Roh-HTML-Seiten des Anbieters. Für eine kommerzielle Nutzung ist das erneut zu prüfen.
- DIN-Normen sind – anders als Gesetze – urheberrechtlich geschützt; vor einer Aufnahme ist die Lizenzfrage zu klären (siehe `TODO.md`).
- Die Erläuterungen sind Orientierungshilfen (Status „Entwurf“) und keine Rechtsberatung. Maßgeblich ist der amtliche Wortlaut.
- In der Online-Version fragt der Browser die Geodienste direkt ab; dabei wird nur die eingegebene Adresse bzw. der Standort übermittelt. Die Kartenkacheln lädt der Browser – in beiden Fassungen – direkt bei OpenStreetMap; für eine Nutzung mit vielen Zugriffen wäre ein eigener Kachelserver oder Anbieter nötig (Nutzungsrichtlinie von OpenStreetMap).

---

## Weiterführende Dokumente

- [TODO.md](TODO.md) – Plan, erledigte Punkte, nächste Schritte (u. a. Erläuterungen für BauGB §§ 39–250, weitere Landes-Denkmalschutzgesetze, Normen)
- [data/erlaeuterungen/LEITFADEN.md](data/erlaeuterungen/LEITFADEN.md) – Regeln für das Schreiben von Erläuterungen
- [data/erlaeuterungen/PRUEFHINWEISE.md](data/erlaeuterungen/PRUEFHINWEISE.md) – Stellen, die eine Fachperson prüfen sollte
- [obsidian/Projekt/Architektur.md](obsidian/Projekt/Architektur.md) – Zusammenspiel der Bausteine
