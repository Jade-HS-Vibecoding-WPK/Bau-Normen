---
dateien: 43
zeilen: 10232
tags:
  - "projekt"
  - "uebersicht"
---

# Architektur der Bau-Normen-KI

> [!info] Automatisch erzeugt
> Diagramme und Dateilisten entstehen bei jedem Lauf von `npm run obsidian` aus den Importen im Quellcode. Nach Codeänderungen einfach neu ausführen.

## Kurz erklärt

Die App beantwortet Fragen zum Bau- und Denkmalrecht. Den Gesetzestext erfindet sie nie selbst: Er kommt immer wortwörtlich aus den amtlichen Quellen. So greifen die Teile ineinander:

1. **Importskripte** holen die Gesetze von den amtlichen Seiten (gesetze-im-internet.de, NI-VORIS) und speichern den Wortlaut unverändert als JSON in `data/gesetze/`. Sie laufen nur bei Bedarf von Hand (`npm run import:all`).  
   Dateien: [[Projekt/scripts › erlaeuterungen-pruefen.mjs.md|scripts/erlaeuterungen-pruefen.mjs]], [[Projekt/scripts › import-baugb.mjs.md|scripts/import-baugb.mjs]], [[Projekt/scripts › import-mbo.mjs.md|scripts/import-mbo.mjs]], [[Projekt/scripts › import-ndschg.mjs.md|scripts/import-ndschg.mjs]], [[Projekt/scripts › import-vob.mjs.md|scripts/import-vob.mjs]], [[Projekt/scripts › lib › verweise.mjs.md|scripts/lib/verweise.mjs]], [[Projekt/scripts › pages-bauen.mjs.md|scripts/pages-bauen.mjs]], [[Projekt/scripts › pages-vorschau.mjs.md|scripts/pages-vorschau.mjs]], [[Projekt/scripts › vobc-verzeichnis.mjs.md|scripts/vobc-verzeichnis.mjs]], [[Projekt/scripts › wortlaut-pruefen.mjs.md|scripts/wortlaut-pruefen.mjs]]
2. **Bibliothek** lädt diese JSON-Dateien und liefert Paragraphen, Verweise und Suchtreffer. Sie erzeugt keinen eigenen Gesetzestext – alles kommt 1:1 aus den Daten.  
   Dateien: [[Projekt/lib › gesetze.ts.md|lib/gesetze.ts]]
3. **Lotse** versteht die Frage (z. B. „§ 34 BauGB“ oder eine Adresse) und stellt die Antwort aus Bausteinen der Bibliothek zusammen.  
   Dateien: [[Projekt/lib › verstehen.ts.md|lib/verstehen.ts]]
4. **Ortsauskunft** (Ordner `lib/ort/`): Adresse -\> Standort -\> B-Plan (Stadt Oldenburg) + Denkmale (Denkmalatlas Niedersachsen) -\> feste, nachvollziehbare Regeln, welche Paragraphen zu beachten sind. Keine KI beteiligt.  
   Dateien: [[Projekt/lib › ort › abruf.ts.md|lib/ort/abruf.ts]], [[Projekt/lib › ort › bplan-dokumente.ts.md|lib/ort/bplan-dokumente.ts]], [[Projekt/lib › ort › bplan.ts.md|lib/ort/bplan.ts]], [[Projekt/lib › ort › denkmal.ts.md|lib/ort/denkmal.ts]], [[Projekt/lib › ort › geo.ts.md|lib/ort/geo.ts]], [[Projekt/lib › ort › index.ts.md|lib/ort/index.ts]], [[Projekt/lib › ort › standort.ts.md|lib/ort/standort.ts]]
5. **Schnittstelle** nimmt die Frage aus dem Browser per HTTP entgegen und reicht sie an den Lotsen weiter.  
   Dateien: [[Projekt/app › api › frage › route.ts.md|app/api/frage/route.ts]]
6. **Oberfläche** zeigt im Browser den Chat und die Paragraphen-Karten. Der Gesetzestext wird dort nur dargestellt, nicht verändert.  
   Dateien: [[Projekt/app › globals.css.md|app/globals.css]], [[Projekt/app › layout.tsx.md|app/layout.tsx]], [[Projekt/app › page.tsx.md|app/page.tsx]], [[Projekt/components › ChatApp.tsx.md|components/ChatApp.tsx]], [[Projekt/components › Einstellungen.tsx.md|components/Einstellungen.tsx]], [[Projekt/components › Gecko.tsx.md|components/Gecko.tsx]], [[Projekt/components › Karten.tsx.md|components/Karten.tsx]], [[Projekt/components › Lageskizze.tsx.md|components/Lageskizze.tsx]], [[Projekt/components › Normtext.tsx.md|components/Normtext.tsx]], [[Projekt/components › Obsidian.tsx.md|components/Obsidian.tsx]], [[Projekt/components › Organisch.tsx.md|components/Organisch.tsx]], [[Projekt/components › Symbole.tsx.md|components/Symbole.tsx]]
7. **Helfer** sind gemeinsame Bausteine im Ordner `lib/`, z. B. Datentypen und Textfunktionen, die mehrere Teile nutzen.  
   Dateien: [[Projekt/lib › anfrage.ts.md|lib/anfrage.ts]], [[Projekt/lib › daten-browser.ts.md|lib/daten-browser.ts]], [[Projekt/lib › daten-server.ts.md|lib/daten-server.ts]], [[Projekt/lib › gecko.ts.md|lib/gecko.ts]], [[Projekt/lib › regelwerke.ts.md|lib/regelwerke.ts]], [[Projekt/lib › sprache.ts.md|lib/sprache.ts]], [[Projekt/lib › text.ts.md|lib/text.ts]], [[Projekt/lib › typen.ts.md|lib/typen.ts]], [[Projekt/lib › vorab.ts.md|lib/vorab.ts]]
8. **Tests** schicken typische Fragen an die laufende App und prüfen die Antworten.  
   Dateien: [[Projekt/tests › testkatalog.mjs.md|tests/testkatalog.mjs]]
9. **Export (Obsidian)** erzeugt diesen Obsidian-Vault aus den Gesetzesdaten und dem Quellcode.  
   Dateien: [[Projekt/scripts › export-obsidian.mjs.md|scripts/export-obsidian.mjs]]

**Ablauf einer Frage:** Chat in der Oberfläche → Schnittstelle (HTTP) → Lotse erkennt, was gemeint ist → Bibliothek liefert den Wortlaut aus `data/gesetze/` → Antwort erscheint als Karte im Chat.

**Gesetze in den Daten:** [[BauGB]], [[MBO]], [[NDSchG]], [[VOB-A]], [[VOB-B]], [[VOB-C]]

## Zusammenspiel der Bereiche

Pfeile zeigen, wer wen nutzt (aus den Importen zusammengefasst) und wer welche Daten liest oder schreibt.

```mermaid
flowchart LR
  B0["Importskripte (10)"]
  B1["Bibliothek (1)"]
  B2["Lotse (1)"]
  B3["Ortsauskunft (7)"]
  B4["Schnittstelle (1)"]
  B5["Oberfläche (12)"]
  B6["Helfer (9)"]
  B7["Tests (1)"]
  B8["Export (Obsidian) (1)"]
  D0[("data/stichworte.json")]
  D1[("data/gesetze")]
  D2[("data/erlaeuterungen")]
  D3[("data/quellen")]
  B4 -->|"nutzt"| B6
  B5 -->|"nutzt"| B6
  B5 -->|"nutzt"| B1
  B5 -->|"ruft auf (HTTP)"| B4
  B6 -->|"nutzt"| B3
  B6 -->|"nutzt"| B2
  B6 -->|"nutzt"| B1
  D0 -->|"gelesen von"| B6
  D1 -->|"gelesen von"| B6
  B1 -->|"nutzt"| B6
  B3 -->|"nutzt"| B6
  B3 -->|"nutzt"| B1
  B2 -->|"nutzt"| B1
  B2 -->|"nutzt"| B3
  B2 -->|"nutzt"| B6
  D2 -->|"gelesen von"| B0
  B0 -->|"schreibt"| D2
  D1 -->|"gelesen von"| B0
  D2 -->|"gelesen von"| B8
  D1 -->|"gelesen von"| B8
  B0 -->|"schreibt"| D1
  B0 -->|"schreibt"| D3
  D3 -->|"gelesen von"| B0
  B0 -->|"schreibt"| D0
  B7 -->|"ruft auf (HTTP)"| B4
```

## Alle Dateien und ihre Importe

Durchgezogene Pfeile: Import · gestrichelt: nur Typen bzw. Datenzugriff · dick: Aufruf per HTTP.

```mermaid
flowchart LR
  subgraph SB0["Importskripte"]
    F31["scripts/erlaeuterungen-pruefen.mjs"]
    F33["scripts/import-baugb.mjs"]
    F34["scripts/import-mbo.mjs"]
    F35["scripts/import-ndschg.mjs"]
    F36["scripts/import-vob.mjs"]
    F37["scripts/lib/verweise.mjs"]
    F38["scripts/pages-bauen.mjs"]
    F39["scripts/pages-vorschau.mjs"]
    F40["scripts/vobc-verzeichnis.mjs"]
    F41["scripts/wortlaut-pruefen.mjs"]
  end
  subgraph SB1["Bibliothek"]
    F17["lib/gesetze.ts"]
  end
  subgraph SB2["Lotse"]
    F29["lib/verstehen.ts"]
  end
  subgraph SB3["Ortsauskunft"]
    F18["lib/ort/abruf.ts"]
    F19["lib/ort/bplan-dokumente.ts"]
    F20["lib/ort/bplan.ts"]
    F21["lib/ort/denkmal.ts"]
    F22["lib/ort/geo.ts"]
    F23["lib/ort/index.ts"]
    F24["lib/ort/standort.ts"]
  end
  subgraph SB4["Schnittstelle"]
    F0["app/api/frage/route.ts"]
  end
  subgraph SB5["Oberfläche"]
    F1["app/globals.css"]
    F2["app/layout.tsx"]
    F3["app/page.tsx"]
    F4["components/ChatApp.tsx"]
    F5["components/Einstellungen.tsx"]
    F6["components/Gecko.tsx"]
    F7["components/Karten.tsx"]
    F8["components/Lageskizze.tsx"]
    F9["components/Normtext.tsx"]
    F10["components/Obsidian.tsx"]
    F11["components/Organisch.tsx"]
    F12["components/Symbole.tsx"]
  end
  subgraph SB6["Helfer"]
    F13["lib/anfrage.ts"]
    F14["lib/daten-browser.ts"]
    F15["lib/daten-server.ts"]
    F16["lib/gecko.ts"]
    F25["lib/regelwerke.ts"]
    F26["lib/sprache.ts"]
    F27["lib/text.ts"]
    F28["lib/typen.ts"]
    F30["lib/vorab.ts"]
  end
  subgraph SB7["Tests"]
    F42["tests/testkatalog.mjs"]
  end
  subgraph SB8["Export (Obsidian)"]
    F32["scripts/export-obsidian.mjs"]
  end
  subgraph SD["Daten"]
    D0[("data/stichworte.json")]
    D1[("data/gesetze")]
    D2[("data/erlaeuterungen")]
    D3[("data/quellen")]
  end
  F0 --> F13
  F0 --> F15
  F2 --> F30
  F2 --> F1
  F3 --> F4
  F3 --> F5
  F3 --> F17
  F3 --> F15
  F4 --> F16
  F4 --> F27
  F4 -.-> F28
  F4 --> F5
  F4 --> F7
  F4 --> F6
  F4 --> F10
  F4 --> F11
  F4 --> F12
  F4 --> F14
  F4 ==>|HTTP| F0
  F5 -.-> F26
  F5 --> F30
  F6 -.-> F16
  F6 --> F5
  F7 --> F27
  F7 -.-> F28
  F7 --> F5
  F7 --> F9
  F7 --> F8
  F7 --> F10
  F7 --> F12
  F8 -.-> F16
  F8 -.-> F28
  F8 --> F5
  F9 -.-> F28
  F10 --> F5
  F13 --> F23
  F13 --> F26
  F13 -.-> F28
  F13 --> F29
  F14 --> F13
  F14 --> F17
  F14 -.-> F28
  F15 --> F17
  F15 -.-> F28
  F15 -.->|liest| D0
  F15 -.->|liest| D1
  F16 --> F27
  F16 -.-> F28
  F16 --> F26
  F17 --> F25
  F17 -.-> F28
  F19 --> F18
  F19 --> F26
  F20 --> F18
  F20 --> F26
  F20 --> F22
  F21 --> F18
  F21 --> F26
  F21 --> F22
  F23 --> F17
  F23 --> F26
  F23 -.-> F28
  F23 --> F20
  F23 --> F19
  F23 --> F21
  F23 --> F24
  F24 --> F18
  F24 --> F26
  F27 -.-> F28
  F29 --> F17
  F29 --> F23
  F29 -.-> F28
  F29 --> F26
  F29 --> F25
  F31 -.->|liest und schreibt| D2
  F31 -.->|liest| D1
  F32 -.->|liest| D2
  F32 -.->|liest| D1
  F33 --> F37
  F33 -.->|schreibt| D1
  F33 -.->|liest und schreibt| D3
  F34 --> F37
  F34 -.->|liest und schreibt| D3
  F34 -.->|schreibt| D1
  F35 --> F37
  F35 -.->|liest und schreibt| D3
  F35 -.->|schreibt| D1
  F36 -.->|schreibt| D3
  F36 -.->|schreibt| D1
  F38 -.->|schreibt| D1
  F38 -.->|schreibt| D2
  F38 -.->|schreibt| D0
  F40 -.->|schreibt| D1
  F41 -.->|liest| D1
  F42 ==>|HTTP| F0
```

## Zahlen

- 43 Quelldateien mit zusammen 10232 Zeilen
- 74 lokale Importe
- Erfasst werden die Ordner `app/`, `components/`, `lib/`, `scripts/`, `tests/` (ohne node_modules, .next, data/quellen)
