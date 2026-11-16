---
dateien: 31
zeilen: 5664
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
   Dateien: [[Projekt/scripts › erlaeuterungen-pruefen.mjs.md|scripts/erlaeuterungen-pruefen.mjs]], [[Projekt/scripts › import-baugb.mjs.md|scripts/import-baugb.mjs]], [[Projekt/scripts › import-ndschg.mjs.md|scripts/import-ndschg.mjs]], [[Projekt/scripts › lib › verweise.mjs.md|scripts/lib/verweise.mjs]], [[Projekt/scripts › wortlaut-pruefen.mjs.md|scripts/wortlaut-pruefen.mjs]]
2. **Bibliothek** lädt diese JSON-Dateien und liefert Paragraphen, Verweise und Suchtreffer. Sie erzeugt keinen eigenen Gesetzestext – alles kommt 1:1 aus den Daten.  
   Dateien: [[Projekt/lib › gesetze.ts.md|lib/gesetze.ts]]
3. **Lotse** versteht die Frage (z. B. „§ 34 BauGB“ oder eine Adresse) und stellt die Antwort aus Bausteinen der Bibliothek zusammen.  
   Dateien: [[Projekt/lib › verstehen.ts.md|lib/verstehen.ts]]
4. **Ortsauskunft** (Ordner `lib/ort/`): Adresse -\> Standort -\> B-Plan (Stadt Oldenburg) + Denkmale (Denkmalatlas Niedersachsen) -\> feste, nachvollziehbare Regeln, welche Paragraphen zu beachten sind. Keine KI beteiligt.  
   Dateien: [[Projekt/lib › ort › abruf.ts.md|lib/ort/abruf.ts]], [[Projekt/lib › ort › bplan-dokumente.ts.md|lib/ort/bplan-dokumente.ts]], [[Projekt/lib › ort › bplan.ts.md|lib/ort/bplan.ts]], [[Projekt/lib › ort › denkmal.ts.md|lib/ort/denkmal.ts]], [[Projekt/lib › ort › geo.ts.md|lib/ort/geo.ts]], [[Projekt/lib › ort › index.ts.md|lib/ort/index.ts]], [[Projekt/lib › ort › standort.ts.md|lib/ort/standort.ts]]
5. **Schnittstelle** nimmt die Frage aus dem Browser per HTTP entgegen und reicht sie an den Lotsen weiter.  
   Dateien: [[Projekt/app › api › frage › route.ts.md|app/api/frage/route.ts]]
6. **Oberfläche** zeigt im Browser den Chat und die Paragraphen-Karten. Der Gesetzestext wird dort nur dargestellt, nicht verändert.  
   Dateien: [[Projekt/app › globals.css.md|app/globals.css]], [[Projekt/app › layout.tsx.md|app/layout.tsx]], [[Projekt/app › page.tsx.md|app/page.tsx]], [[Projekt/components › ChatApp.tsx.md|components/ChatApp.tsx]], [[Projekt/components › Gecko.tsx.md|components/Gecko.tsx]], [[Projekt/components › GeckoFigur.tsx.md|components/GeckoFigur.tsx]], [[Projekt/components › Karten.tsx.md|components/Karten.tsx]], [[Projekt/components › Lageskizze.tsx.md|components/Lageskizze.tsx]], [[Projekt/components › Normtext.tsx.md|components/Normtext.tsx]], [[Projekt/components › Obsidian.tsx.md|components/Obsidian.tsx]], [[Projekt/components › Symbole.tsx.md|components/Symbole.tsx]]
7. **Helfer** sind gemeinsame Bausteine im Ordner `lib/`, z. B. Datentypen und Textfunktionen, die mehrere Teile nutzen.  
   Dateien: [[Projekt/lib › gecko.ts.md|lib/gecko.ts]], [[Projekt/lib › text.ts.md|lib/text.ts]], [[Projekt/lib › typen.ts.md|lib/typen.ts]]
8. **Tests** schicken typische Fragen an die laufende App und prüfen die Antworten.  
   Dateien: [[Projekt/tests › testkatalog.mjs.md|tests/testkatalog.mjs]]
9. **Export (Obsidian)** erzeugt diesen Obsidian-Vault aus den Gesetzesdaten und dem Quellcode.  
   Dateien: [[Projekt/scripts › export-obsidian.mjs.md|scripts/export-obsidian.mjs]]

**Ablauf einer Frage:** Chat in der Oberfläche → Schnittstelle (HTTP) → Lotse erkennt, was gemeint ist → Bibliothek liefert den Wortlaut aus `data/gesetze/` → Antwort erscheint als Karte im Chat.

**Gesetze in den Daten:** [[BauGB]], [[NDSchG]]

## Zusammenspiel der Bereiche

Pfeile zeigen, wer wen nutzt (aus den Importen zusammengefasst) und wer welche Daten liest oder schreibt.

```mermaid
flowchart LR
  B0["Importskripte (5)"]
  B1["Bibliothek (1)"]
  B2["Lotse (1)"]
  B3["Ortsauskunft (7)"]
  B4["Schnittstelle (1)"]
  B5["Oberfläche (11)"]
  B6["Helfer (3)"]
  B7["Tests (1)"]
  B8["Export (Obsidian) (1)"]
  D0[("data/erlaeuterungen")]
  D1[("data/gesetze")]
  D2[("data/stichworte.json")]
  D3[("data/quellen")]
  B4 -->|"nutzt"| B3
  B4 -->|"nutzt"| B2
  B5 -->|"nutzt"| B1
  B5 -->|"nutzt"| B6
  B5 -->|"ruft auf (HTTP)"| B4
  B1 -->|"nutzt"| B6
  D0 -->|"gelesen von"| B1
  D1 -->|"gelesen von"| B1
  D2 -->|"gelesen von"| B1
  B3 -->|"nutzt"| B1
  B3 -->|"nutzt"| B6
  B2 -->|"nutzt"| B1
  B2 -->|"nutzt"| B3
  B2 -->|"nutzt"| B6
  D0 -->|"gelesen von"| B0
  B0 -->|"schreibt"| D0
  D1 -->|"gelesen von"| B0
  D0 -->|"gelesen von"| B8
  D1 -->|"gelesen von"| B8
  B0 -->|"schreibt"| D1
  B0 -->|"schreibt"| D3
  D3 -->|"gelesen von"| B0
  B7 -->|"ruft auf (HTTP)"| B4
```

## Alle Dateien und ihre Importe

Durchgezogene Pfeile: Import · gestrichelt: nur Typen bzw. Datenzugriff · dick: Aufruf per HTTP.

```mermaid
flowchart LR
  subgraph SB0["Importskripte"]
    F24["scripts/erlaeuterungen-pruefen.mjs"]
    F26["scripts/import-baugb.mjs"]
    F27["scripts/import-ndschg.mjs"]
    F28["scripts/lib/verweise.mjs"]
    F29["scripts/wortlaut-pruefen.mjs"]
  end
  subgraph SB1["Bibliothek"]
    F13["lib/gesetze.ts"]
  end
  subgraph SB2["Lotse"]
    F23["lib/verstehen.ts"]
  end
  subgraph SB3["Ortsauskunft"]
    F14["lib/ort/abruf.ts"]
    F15["lib/ort/bplan-dokumente.ts"]
    F16["lib/ort/bplan.ts"]
    F17["lib/ort/denkmal.ts"]
    F18["lib/ort/geo.ts"]
    F19["lib/ort/index.ts"]
    F20["lib/ort/standort.ts"]
  end
  subgraph SB4["Schnittstelle"]
    F0["app/api/frage/route.ts"]
  end
  subgraph SB5["Oberfläche"]
    F1["app/globals.css"]
    F2["app/layout.tsx"]
    F3["app/page.tsx"]
    F4["components/ChatApp.tsx"]
    F5["components/Gecko.tsx"]
    F6["components/GeckoFigur.tsx"]
    F7["components/Karten.tsx"]
    F8["components/Lageskizze.tsx"]
    F9["components/Normtext.tsx"]
    F10["components/Obsidian.tsx"]
    F11["components/Symbole.tsx"]
  end
  subgraph SB6["Helfer"]
    F12["lib/gecko.ts"]
    F21["lib/text.ts"]
    F22["lib/typen.ts"]
  end
  subgraph SB7["Tests"]
    F30["tests/testkatalog.mjs"]
  end
  subgraph SB8["Export (Obsidian)"]
    F25["scripts/export-obsidian.mjs"]
  end
  subgraph SD["Daten"]
    D0[("data/erlaeuterungen")]
    D1[("data/gesetze")]
    D2[("data/stichworte.json")]
    D3[("data/quellen")]
  end
  F0 --> F19
  F0 --> F23
  F2 --> F1
  F3 --> F4
  F3 --> F13
  F4 --> F12
  F4 --> F21
  F4 -.-> F22
  F4 --> F7
  F4 --> F5
  F4 --> F10
  F4 --> F11
  F4 ==>|HTTP| F0
  F5 -.-> F12
  F5 --> F6
  F7 --> F21
  F7 -.-> F22
  F7 --> F9
  F7 --> F8
  F7 --> F10
  F7 --> F11
  F8 -.-> F22
  F8 --> F6
  F9 -.-> F22
  F12 --> F21
  F12 -.-> F22
  F13 -.-> F22
  F13 -.->|liest| D0
  F13 -.->|liest| D1
  F13 -.->|liest| D2
  F15 --> F14
  F16 --> F14
  F16 --> F18
  F17 --> F14
  F17 --> F18
  F19 --> F13
  F19 -.-> F22
  F19 --> F16
  F19 --> F15
  F19 --> F17
  F19 --> F20
  F20 --> F14
  F21 -.-> F22
  F23 --> F13
  F23 --> F19
  F23 -.-> F22
  F24 -.->|liest und schreibt| D0
  F24 -.->|liest| D1
  F25 -.->|liest| D0
  F25 -.->|liest| D1
  F26 --> F28
  F26 -.->|schreibt| D1
  F26 -.->|liest und schreibt| D3
  F27 --> F28
  F27 -.->|liest und schreibt| D3
  F27 -.->|schreibt| D1
  F29 -.->|liest| D1
  F30 ==>|HTTP| F0
```

## Zahlen

- 31 Quelldateien mit zusammen 5664 Zeilen
- 44 lokale Importe
- Erfasst werden die Ordner `app/`, `components/`, `lib/`, `scripts/`, `tests/` (ohne node_modules, .next, data/quellen)
