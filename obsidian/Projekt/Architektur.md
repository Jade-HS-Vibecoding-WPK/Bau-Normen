---
dateien: 23
zeilen: 4333
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
   Dateien: [[Projekt/scripts › import-baugb.mjs.md|scripts/import-baugb.mjs]], [[Projekt/scripts › import-ndschg.mjs.md|scripts/import-ndschg.mjs]], [[Projekt/scripts › lib › verweise.mjs.md|scripts/lib/verweise.mjs]]
2. **Bibliothek** lädt diese JSON-Dateien und liefert Paragraphen, Verweise und Suchtreffer. Sie erzeugt keinen eigenen Gesetzestext – alles kommt 1:1 aus den Daten.  
   Dateien: [[Projekt/lib › gesetze.ts.md|lib/gesetze.ts]]
3. **Lotse** versteht die Frage (z. B. „§ 34 BauGB“ oder eine Adresse) und stellt die Antwort aus Bausteinen der Bibliothek zusammen.  
   Dateien: [[Projekt/lib › verstehen.ts.md|lib/verstehen.ts]]
4. **Ortsauskunft** (Ordner `lib/ort/`): Adresse -\> Standort -\> B-Plan (Stadt Oldenburg) + Denkmale (Denkmalatlas Niedersachsen) -\> feste, nachvollziehbare Regeln, welche Paragraphen zu beachten sind. Keine KI beteiligt.  
   Dateien: [[Projekt/lib › ort › abruf.ts.md|lib/ort/abruf.ts]], [[Projekt/lib › ort › bplan.ts.md|lib/ort/bplan.ts]], [[Projekt/lib › ort › denkmal.ts.md|lib/ort/denkmal.ts]], [[Projekt/lib › ort › geo.ts.md|lib/ort/geo.ts]], [[Projekt/lib › ort › index.ts.md|lib/ort/index.ts]], [[Projekt/lib › ort › standort.ts.md|lib/ort/standort.ts]]
5. **Schnittstelle** nimmt die Frage aus dem Browser per HTTP entgegen und reicht sie an den Lotsen weiter.  
   Dateien: [[Projekt/app › api › frage › route.ts.md|app/api/frage/route.ts]]
6. **Oberfläche** zeigt im Browser den Chat und die Paragraphen-Karten. Der Gesetzestext wird dort nur dargestellt, nicht verändert.  
   Dateien: [[Projekt/app › globals.css.md|app/globals.css]], [[Projekt/app › layout.tsx.md|app/layout.tsx]], [[Projekt/app › page.tsx.md|app/page.tsx]], [[Projekt/components › ChatApp.tsx.md|components/ChatApp.tsx]], [[Projekt/components › Karten.tsx.md|components/Karten.tsx]], [[Projekt/components › Normtext.tsx.md|components/Normtext.tsx]], [[Projekt/components › Symbole.tsx.md|components/Symbole.tsx]]
7. **Helfer** sind gemeinsame Bausteine im Ordner `lib/`, z. B. Datentypen und Textfunktionen, die mehrere Teile nutzen.  
   Dateien: [[Projekt/lib › text.ts.md|lib/text.ts]], [[Projekt/lib › typen.ts.md|lib/typen.ts]]
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
  B0["Importskripte (3)"]
  B1["Bibliothek (1)"]
  B2["Lotse (1)"]
  B3["Ortsauskunft (6)"]
  B4["Schnittstelle (1)"]
  B5["Oberfläche (7)"]
  B6["Helfer (2)"]
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
    F19["scripts/import-baugb.mjs"]
    F20["scripts/import-ndschg.mjs"]
    F21["scripts/lib/verweise.mjs"]
  end
  subgraph SB1["Bibliothek"]
    F8["lib/gesetze.ts"]
  end
  subgraph SB2["Lotse"]
    F17["lib/verstehen.ts"]
  end
  subgraph SB3["Ortsauskunft"]
    F9["lib/ort/abruf.ts"]
    F10["lib/ort/bplan.ts"]
    F11["lib/ort/denkmal.ts"]
    F12["lib/ort/geo.ts"]
    F13["lib/ort/index.ts"]
    F14["lib/ort/standort.ts"]
  end
  subgraph SB4["Schnittstelle"]
    F0["app/api/frage/route.ts"]
  end
  subgraph SB5["Oberfläche"]
    F1["app/globals.css"]
    F2["app/layout.tsx"]
    F3["app/page.tsx"]
    F4["components/ChatApp.tsx"]
    F5["components/Karten.tsx"]
    F6["components/Normtext.tsx"]
    F7["components/Symbole.tsx"]
  end
  subgraph SB6["Helfer"]
    F15["lib/text.ts"]
    F16["lib/typen.ts"]
  end
  subgraph SB7["Tests"]
    F22["tests/testkatalog.mjs"]
  end
  subgraph SB8["Export (Obsidian)"]
    F18["scripts/export-obsidian.mjs"]
  end
  subgraph SD["Daten"]
    D0[("data/erlaeuterungen")]
    D1[("data/gesetze")]
    D2[("data/stichworte.json")]
    D3[("data/quellen")]
  end
  F0 --> F13
  F0 --> F17
  F2 --> F1
  F3 --> F4
  F3 --> F8
  F4 --> F15
  F4 -.-> F16
  F4 --> F5
  F4 --> F7
  F4 ==>|HTTP| F0
  F5 --> F15
  F5 -.-> F16
  F5 --> F6
  F5 --> F7
  F6 -.-> F16
  F8 -.-> F16
  F8 -.->|liest| D0
  F8 -.->|liest| D1
  F8 -.->|liest| D2
  F10 --> F9
  F11 --> F9
  F11 --> F12
  F13 --> F8
  F13 -.-> F16
  F13 --> F10
  F13 --> F11
  F13 --> F14
  F14 --> F9
  F15 -.-> F16
  F17 --> F8
  F17 --> F13
  F17 -.-> F16
  F18 -.->|liest| D0
  F18 -.->|liest| D1
  F19 --> F21
  F19 -.->|schreibt| D1
  F19 -.->|liest und schreibt| D3
  F20 --> F21
  F20 -.->|liest und schreibt| D3
  F20 -.->|schreibt| D1
  F22 ==>|HTTP| F0
```

## Zahlen

- 23 Quelldateien mit zusammen 4333 Zeilen
- 30 lokale Importe
- Erfasst werden die Ordner `app/`, `components/`, `lib/`, `scripts/`, `tests/` (ohne node_modules, .next, data/quellen)
