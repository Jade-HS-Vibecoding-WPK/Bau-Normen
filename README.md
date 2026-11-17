<p align="center">
  <img src="docs/bilder/vorschau.png" alt="So sieht die Website aus: Ortsauskunft mit Gebietsleiste und Karte (hell), Paragraph im Wortlaut (dunkel) und die Startseite auf dem Smartphone" width="100%">
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
  <img src="https://img.shields.io/badge/Testkatalog-55%2F55-a7bb57" alt="Testkatalog 55/55">
  <img src="https://img.shields.io/badge/Lizenz-MIT-345a43" alt="Lizenz MIT">
</p>

# Bau-Normen-KI – Baurecht im Wortlaut

Ein Nachschlage- und Auskunftswerkzeug für die Baubranche:

- **Gesetze und Regelwerke im Wortlaut** – Baugesetzbuch (BauGB), Niedersächsische Bauordnung (NBauO), Niedersächsisches Denkmalschutzgesetz (NDSchG), Musterbauordnung (MBO), VOB Teil A und Teil B, Paragraph für Paragraph, unverändert aus den Quellen; dazu das Verzeichnis der VOB Teil C (ATV)
- **verständlich erklärt** – zu jedem Paragraphen eine Erläuterung und die zusammenhängenden Vorschriften
- **Ortsauskunft für Adressen in Deutschland** – mit Postleitzahl: gilt ein Bebauungsplan (angebunden: Stadt Oldenburg), gibt es Kulturdenkmale (angebunden: Niedersachsen), welche Paragraphen sind zu beachten – wo kein Dienst angebunden ist, sagt die App das offen

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
| **Paragraph abrufen** | „§ 34 BauGB“, „§§ 30, 34 und 35 BauGB“, „35 BauGB“, „Paragraph 13a“, „§ 6 MBO“, „§ 3a EU VOB/A“, „§ 13 VOB/B“, „DIN 18353“ – die Vorschrift erscheint im Wortlaut mit Stand, Quelle und Kopier-Knopf. Gibt es eine Nummer in mehreren Regelwerken („Paragraph 5“, „§ 4 VOB“), fragt die App nach. Gibt es sie nicht („§ 300 BauGB“), sagt sie das – statt zu raten. |
| **Musterbauordnung und VOB** | Die **MBO** (Muster der Bauministerkonferenz, Stand 26./27.09.2024), die **VOB/A** (Abschnitt 1 sowie die Abschnitte 2 „EU“ und 3 „VS“ in der Ausgabe 2026) und die **VOB/B** (Ausgabe 2016) im Wortlaut. Von der **VOB/C** gibt es nur das Verzeichnis der 68 ATV mit Nummer und Titel – ihr Text ist als DIN-Norm geschützt. Weil keines davon ein Gesetz ist, sagt jede Karte oben, wie verbindlich es ist (z. B. „Muster, kein geltendes Recht – in Niedersachsen gilt die NBauO“). |
| **Erläuterung** | Unter dem Wortlaut steht eine leicht verständliche, aber detaillierte Erläuterung: Kurzfassung, jeder Absatz einzeln, Hinweis für die Praxis. Vorhanden für BauGB §§ 1–38 und das komplette NDSchG (88 Paragraphen, Status „Entwurf“). |
| **Zusammenhang** | „Verweist auf“, „Wird erwähnt in“ und „Gleicher Abschnitt“ – automatisch aus den Verweisen im Gesetzestext ermittelt, jeweils anklickbar. |
| **Stichwortsuche** | „Vorkaufsrecht“, „Innenbereich“, „Bauen neben einem Denkmal“, „Abstandsflächen“, „Abnahme“, „Estricharbeiten“ – ein von Hand gepflegtes Stichwortverzeichnis (rund 120 Begriffsgruppen) plus Volltextsuche. |
| **Ortsauskunft Deutschland** | Adresse (mit Postleitzahl und Ort, beides optional) → Standort in ganz Deutschland; liegt eine Straße ohne Postleitzahl in mehreren Orten, fragt die App nach → in Oldenburg: **Bebauungsplan** der Stadt Oldenburg (mit Planzeichnung und Begründung als PDF, falls online verfügbar), **Pläne in Aufstellung**, **Veränderungssperren** → **Kulturdenkmale** im Umkreis von 50 m (Denkmalatlas Niedersachsen, landesweit) → **Einordnung** nach festen Regeln mit den einschlägigen Paragraphen, in Niedersachsen auch zur NBauO. Wo B-Plan- oder Denkmaldienste nicht angebunden sind, steht „keine Aussage“ mit den bundesweit geltenden Regeln (§§ 30, 34, 35 BauGB) – nie „kein B-Plan“. |
| **Gebietsleiste** | Die Hauptinformationen zum zuletzt geprüften Gebiet – Adresse, Bebauungsplan (mit Link zur Planzeichnung) und Denkmalschutz – stehen fest über dem Verlauf. Sie bewegen sich nur mit der Seite; die Details darunter scrollen wie im Chat. |
| **Lageskizze** | Skizze des Standorts auf einer **OpenStreetMap-Karte**: Umkreis 50 m, B-Plan-Grenze, Denkmalflächen. Die Karte lässt sich **zoomen** (Mausrad, +/−, Doppelklick, zwei Finger) und **verschieben** (Ziehen, Pfeiltasten). Der Gecko der Seite läuft hin und steckt an Standort und Denkmalen die Fähnchen. |
| **Obsidian-Ansicht** | Alle Paragraphen, die Gliederung und die Dateien der App als vernetzte Notizen für [Obsidian](https://obsidian.md) – mit Graph-Ansicht. |
| **Gecko** | Ein kleines Maskottchen, das auf der Seite unterwegs ist und bei Fehlern oder Hinweisen die Farbe wechselt. Über Text wird er durchsichtig; auf Wunsch sitzt er still und dient nur als Signal. |
| **Hell & Dunkel** | Helles und dunkles Farbschema, oder automatisch wie im Betriebssystem eingestellt (Menü **Darstellung**). |
| **Deutsch & Englisch** | Die gesamte Oberfläche, die Ortsauskunft und alle Hinweise gibt es auf Deutsch und Englisch (Umschalter **DE/EN**). Der Text der Vorschriften bleibt im deutschen Wortlaut. |
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
    <td width="50%" valign="top"><img src="docs/bilder/mbo.png" alt="§ 6 Musterbauordnung mit Hinweis: Muster, kein geltendes Recht" width="100%"><br><sub><b>Musterbauordnung</b> – mit hochgestellten Satznummern und dem Hinweis, dass in Niedersachsen die NBauO gilt</sub></td>
    <td width="50%" valign="top"><img src="docs/bilder/vob.png" alt="§ 13 VOB/B mit Hinweis: Vertragsbedingungen, kein Gesetz" width="100%"><br><sub><b>VOB/B</b> – jede Karte sagt, wie verbindlich das Regelwerk ist</sub></td>
  </tr>
</table>

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
7. **Nur, was frei verwendet werden darf:** Gesetze, Musterbauordnung und die im Bundesanzeiger bekannt gemachte VOB/A und VOB/B stehen im Wortlaut in der App. Die ATV der VOB/C sind DIN-Normen und urheberrechtlich geschützt (§ 5 Abs. 3 UrhG) – die App nennt nur Nummer und Titel und verweist auf DIN Media.
8. **Englisch ohne Übersetzungsdienst:** Alle englischen Texte stehen im Code direkt neben dem deutschen Original (`t("…", "…")`). Gesetzestext und Erläuterungen werden nicht übersetzt – verbindlich ist allein der deutsche Wortlaut, und die App sagt das auch auf Englisch.

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
| Woher kommen Gesetze und Erläuterungen? | `data/` vom Dateisystem (`lib/daten-server.ts`) | `/daten/`, in Stufen geladen (`lib/daten-browser.ts`, siehe unten) |
| Ortsauskunft | Server fragt OpenStreetMap, Stadt Oldenburg und Denkmalatlas ab | Browser fragt dieselben Dienste direkt ab (alle erlauben das) |
| Obsidian-Knopf | ja | nein – der Vault liegt nur auf dem eigenen Rechner |

Lotse, Bibliothek und Ortsauskunft (`lib/`) sind in beiden Fällen identisch – es gibt keine zweite, abweichende Fassung der Regeln.

**Schnell, auch mit vielen Regelwerken:** Die Online-Version lädt nicht mehr alle Gesetzestexte auf einmal (zuletzt 3,4 MB), sondern in Stufen:

| Datei | Größe (gepackt) | Wann geladen |
|---|---|---|
| `daten/index.json` – alle Regelwerke mit Titel, Gliederung, Verweisen | ca. 26 KB | gleich nach dem Seitenaufbau im Leerlauf |
| `daten/wortlaut/<gesetz>/<id>.json` – Wortlaut einer Vorschrift | wenige KB | wenn die Vorschrift angezeigt wird |
| `daten/erlaeuterungen/<gesetz>.json` | 20–40 KB | bei der ersten Vorschrift dieses Gesetzes |
| `daten/suche.json` – Suchtexte | ca. 320 KB | erst bei einer Freitextsuche |

Auf dem Server werden Verweise, Abschnitte und Suchtexte einmal je Datenstand vorbereitet statt bei jeder Anfrage; ob sich Daten geändert haben, prüft er höchstens alle 2 Sekunden. Neue Regelwerke machen die Seite dadurch kaum langsamer.

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
| **A · Ortsauskunft Deutschland** | Straße und Hausnummer eintragen, dazu Postleitzahl und/oder Ort (ohne beides wird zuerst in Oldenburg gesucht) → „Standort prüfen“ |
| **B · Paragraph abrufen** | Regelwerk wählen, Nummer eintragen (z. B. `34`, `13a`, bei der VOB/A auch `3a EU`; bei der VOB/C die DIN-Nummer, z. B. `18353`) → „Wortlaut anzeigen“ |
| **C · Bibliothek** | Welche Regelwerke in welchem Stand enthalten sind – gruppiert nach Gesetzen, Muster und VOB –, mit Link zur Quelle |
| **Eingabefeld unten** | Freie Eingabe: Paragraph, Stichwort oder Adresse, z. B. „Ich brauche § 35 BauGB“, „section 35 BauGB“, „§ 13 VOB/B“, „DIN 18353“, „Vorkaufsrecht“, „Gartenstraße 5“ |
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
| `lib/` | Logik: `anfrage.ts` (eine Anfrage bearbeiten), `verstehen.ts` (Lotse), `gesetze.ts` (Bibliothek, Suche), `daten-server.ts` / `daten-browser.ts` (Datenquelle lokal bzw. online), `ort/` (Ortsauskunft: Standort, B-Plan, Plan-Dokumente, Denkmale, Geometrie), `gecko.ts` (Regeln für den Gecko), `regelwerke.ts` (Reihenfolge, Art und Verbindlichkeitshinweis je Regelwerk), `sprache.ts` (Deutsch/Englisch), `vorab.ts` (Einstellungen vor dem ersten Zeichnen), `typen.ts`, `text.ts` |
| `data/gesetze/` | Gesetze und Regelwerke als JSON (`baugb`, `ndschg`, `mbo`, `voba`, `vobb`, `vobc`) – Paragraph für Paragraph mit Struktur, Wortlaut und erkannten Verweisen |
| `data/erlaeuterungen/` | Erläuterungen je Gesetz, dazu `LEITFADEN.md` (Regeln zum Schreiben) und `PRUEFHINWEISE.md` (Stellen für die fachliche Prüfung) |
| `data/stichworte.json` | Stichwortverzeichnis (Begriff → Paragraphen) |
| `data/quellen/` | Rohdaten: BauGB-XML, der aus den PDFs gelesene Text von MBO und VOB samt Prüfprotokoll (die PDFs selbst lädt das Importskript); NI-VORIS-Rohdaten werden bewusst nicht versioniert |
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
| `npm run import:all` | Alle Regelwerke neu aus den Quellen laden (einzeln: `import:baugb`, `import:ndschg`, `import:nbauo`, `import:mbo`, `import:vob`, `vobc`). MBO und VOB werden aus PDFs gelesen – dafür sind `pdftotext` (Poppler) und Python mit `pypdf` nötig; mit `-- --offline` genügt der gespeicherte Text |
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
| Wortlaut NBauO gegen die Druckansicht von NI-VORIS (zweiter, unabhängiger Abrufweg) | 15/15 Stichproben identisch (66 831 Zeichen, darunter §§ 5, 60–64, 67, 70 und der ganze Anhang); alle 98 Einträge gegen die Gesamtansicht geprüft |
| Wortlaut MBO gegen zweite PDF-Auslesung (pdftotext und pypdf, ohne Leerraum) | 83/83 Seiten und 97/97 Vorschriften identisch, 4 dokumentierte Reparaturen (Protokoll in `data/quellen/mbo/`) |
| Wortlaut VOB/A und VOB/B gegen zweite PDF-Auslesung | 149/149 Seiten, VOB/A 152/153 und VOB/B 18/18 Vorschriften identisch; § 3a weicht genau um die 2025 bekannt gemachten Änderungen ab (Protokoll in `data/quellen/vob/`) |
| Erläuterungen (automatische Prüfung) | 88 Erläuterungen, 0 Fehler, 0 Warnungen |
| Obsidian-Export (Wortlaut-Selbsttest) | 705/705 Vorschriften identisch (dazu 68 VOB/C-Verzeichniseinträge ohne Wortlaut) |
| Testkatalog | 55/55 Fragen – Paragraphen, NBauO, MBO, VOB, DIN-Nummern, Rückfragen, Stichworte, Ortsauskunft Oldenburg, Hannover, München und Rückfrage bei mehrdeutiger Straße (live) |
| Online-Version (statischer Bau) | Paragraph, Rückfrage, Stichwort, Volltext und Ortsauskunft direkt im Browser geprüft, Daten werden in Stufen nachgeladen, keine Fehler |
| Antwortzeiten (lokal) | Server 10–25 ms je Anfrage; im Browser keine Ruckler, der Gecko kostet im Leerlauf unter 2 % Rechenzeit |

---

## Gestaltung

<p align="center">
  <img src="docs/bilder/banner.png" alt="Banner: Baurecht im Wortlaut, Ortsauskunft Oldenburg – Linienzeichnung mit Haus, Pflanze, Baum und Gecko" width="100%">
</p>

<p align="center">
  <img src="docs/bilder/gestaltung.png" alt="Farbpalette Tanne, Moos, Minze, Aqua, Flieder, Papier und die Schriften Fraunces, Figtree, DM Mono, Source Serif 4" width="100%">
</p>

**„Gelände & Linie“** – Organic Shapes & Line Art, hell und pastellig, abgeleitet aus dem Fachgebiet:

- **Weiche Flächen** in Minze, Aqua und Flieder – wie Grünflächen im Lageplan. Sie liegen im Hintergrund, in den Kennungen A/B/C und hinter der Paragraphennummer.
- **Heller Kopf** mit Pastellverlauf (Minze → Aqua → Flieder) und weicher, gewellter Unterkante; Tannengrün nur für Schrift und Knöpfe, damit alles gut lesbar bleibt.
- **Höhenlinien** – feine, konzentrische Linien wie auf einer Geländekarte, als ruhige Linienkunst im Kopf der Karten und im Hintergrund.
- **Linienzeichnung** auf der Startseite: Gelände, Haus, Pflanze, Baum – mit einem durchgehenden Strich.
- **Hell und Dunkel:** Beide Farbschemata nutzen dieselben Formen. Der Dunkelmodus arbeitet mit einem tiefen, neutralen Graphit-Grund, auf dem sich frische Minz- und Pastelltöne klar abheben; auch die Kartenkacheln werden kontrastreich abgedunkelt. Alle Farben sind als CSS-Variablen festgelegt.
- **Lesbarkeit zuerst:** Der Gesetzestext steht auf ruhigem, fast weißem Grund in einer Buchschrift; die Dekoration bleibt im Hintergrund und ist für Screenreader ausgeblendet.

Farben und Formen sind zentral als CSS-Variablen in [`app/globals.css`](app/globals.css) festgelegt, die Formen in [`components/Organisch.tsx`](components/Organisch.tsx).

---

## Obsidian-Ansicht

Der Ordner `obsidian/` ist ein [Obsidian](https://obsidian.md)-Vault:

- je Paragraph eine Notiz mit Wortlaut, Erläuterung, Verweisen und Quelle
- die Gliederung (Kapitel → Teil → Abschnitt) als Baum
- jede Datei der App mit Kurzbeschreibung und Verbindungen zu anderen Dateien
- Farben im Graph: BauGB grün · NDSchG ocker · MBO blau · VOB/A violett · VOB/B rot · VOB/C braun · Gliederung grau-blau · Projektdateien grau

**Öffnen:** einmalig in Obsidian „Ordner als Vault öffnen“ → Ordner `obsidian` wählen. Danach öffnet der Knopf **„Obsidian-Ansicht“** oben rechts in der App den Vault direkt, und jede Paragraph-Karte hat einen Link „Notiz öffnen“. Graph-Ansicht: `Strg + G`. (Nur in der lokalen Fassung – die Online-Version hat keinen Zugriff auf den eigenen Rechner.)

Nach Änderungen an Gesetzen oder Code: `npm run obsidian`.

---

## Der Gecko

<img src="docs/bilder/gecko.png" alt="Roter, eingerollter Gecko mit der Meldung: Fantasiestraße 999 wurde nicht gefunden" width="470" align="right">

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
| NDSchG, NBauO | Niedersächsisches Vorschrifteninformationssystem (NI-VORIS) – NBauO in der Fassung ab 01.07.2025 |
| Musterbauordnung | Deutsches Institut für Bautechnik (DIBt) – [MBO, Fassung 2002, zuletzt geändert 26./27.09.2024](https://www.dibt.de/fileadmin/dibt-website/Dokumente/Rechtsgrundlagen/MBO.pdf) (PDF) |
| VOB/A | Bundesanzeiger: Abschnitte 2 und 3 Ausgabe 2026 (BAnz AT 24.08.2026 B6); Abschnitt 1 Ausgabe 2019 (BAnz AT 19.02.2019 B2), in § 3a mit den Änderungen vom 11.03.2025 (BAnz AT 02.04.2025 B7) und 24.11.2025 (BAnz AT 16.12.2025 B7) – die Bekanntmachung von 2025 enthält nur Änderungsbefehle, die App sagt bei § 3a, dass der Text zusammengeführt ist |
| VOB/B | Ausgabe 2016, konsolidierte Fassung der [Fachinformation Bundesbau](https://www.fib-bund.de/Inhalt/Vergabe/VOB/) |
| VOB/C | nur Verzeichnis: Einführungserlass des BMWSB vom 20.09.2023 (Ergänzungsband 2023) und DIN Media |
| Bebauungspläne | Stadt Oldenburg – Open Data „Umringe rechtsverbindlicher Bebauungspläne“ und Kartenportal „Bauen & Wohnen“ (Plan-Dokumente, Pläne in Aufstellung, Veränderungssperren) |
| Kulturdenkmale | [Denkmalatlas Niedersachsen](https://denkmalatlas.niedersachsen.de) – Niedersächsisches Landesamt für Denkmalpflege |
| Adresssuche | OpenStreetMap / Nominatim (ganz Deutschland, höchstens eine Anfrage pro Sekunde) |
| Hintergrundkarte der Lageskizze | © [OpenStreetMap-Mitwirkende](https://www.openstreetmap.org/copyright) (ODbL), Kacheln von tile.openstreetmap.org |
| Schriften | Fraunces, Figtree, DM Mono, Source Serif 4 – Google Fonts (SIL Open Font License), beim Bauen eingebunden |

- Amtliche Gesetzestexte sind gemeinfrei (§ 5 UrhG).
- NI-VORIS behält sich automatisiertes Text- und Data-Mining vor. Gespeichert und veröffentlicht wird deshalb nur der gemeinfreie Gesetzestext, nicht die Roh-HTML-Seiten des Anbieters. Für eine kommerzielle Nutzung ist das erneut zu prüfen.
- DIN-Normen sind – anders als Gesetze – urheberrechtlich geschützt (§ 5 Abs. 3 UrhG). Deshalb enthält die App von der VOB/C nur Nummer und Titel der ATV; für weitere Normen ist die Lizenzfrage zu klären (siehe `TODO.md`).
- Die Musterbauordnung ist ein Muster der Bauministerkonferenz und kein geltendes Recht; die VOB ist kein Gesetz (VOB/A: Vergaberegeln, auf die das Haushalts- und Vergaberecht verweist; VOB/B und VOB/C: Vertragsbedingungen). Die App sagt das in jeder Karte.
- Die Erläuterungen sind Orientierungshilfen (Status „Entwurf“) und keine Rechtsberatung. Maßgeblich ist der amtliche Wortlaut.
- In der Online-Version fragt der Browser die Geodienste direkt ab; dabei wird nur die eingegebene Adresse bzw. der Standort übermittelt. Die Kartenkacheln lädt der Browser – in beiden Fassungen – direkt bei OpenStreetMap; für eine Nutzung mit vielen Zugriffen wäre ein eigener Kachelserver oder Anbieter nötig (Nutzungsrichtlinie von OpenStreetMap).

---

## Weiterführende Dokumente

- [TODO.md](TODO.md) – Plan, erledigte Punkte, nächste Schritte (u. a. Erläuterungen für BauGB §§ 39–250, weitere Landes-Denkmalschutzgesetze, Normen)
- [data/erlaeuterungen/LEITFADEN.md](data/erlaeuterungen/LEITFADEN.md) – Regeln für das Schreiben von Erläuterungen
- [data/erlaeuterungen/PRUEFHINWEISE.md](data/erlaeuterungen/PRUEFHINWEISE.md) – Stellen, die eine Fachperson prüfen sollte
- [obsidian/Projekt/Architektur.md](obsidian/Projekt/Architektur.md) – Zusammenspiel der Bausteine
