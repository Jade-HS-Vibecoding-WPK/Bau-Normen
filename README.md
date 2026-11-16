# Bau-Normen-KI

Baurecht im Wortlaut – für die Baubranche.

- **Paragraphen abrufen:** BauGB und Niedersächsisches Denkmalschutzgesetz (NDSchG) im amtlichen Wortlaut, mit Erläuterung und Zusammenhängen (Verweise, gleicher Abschnitt).
- **Stichwortsuche:** kuratiertes Stichwortverzeichnis plus Volltextsuche.
- **Ortsauskunft Oldenburg:** Adresse → Bebauungsplan (Stadt Oldenburg) und Kulturdenkmale im Umkreis (Denkmalatlas Niedersachsen) → einschlägige Paragraphen.
- **Obsidian:** Gesetze, Gliederung und Projektdateien als Vault (`obsidian/`).

Die App arbeitet **ohne KI**: Gesetzestexte kommen unverändert aus den amtlichen Quellen, Auskünfte entstehen nach festen, nachvollziehbaren Regeln. Plan und ToDo-Liste: [TODO.md](TODO.md).

## Starten

Voraussetzung: Node.js 20 oder neuer.

```bash
npm install
npm run dev
```

Dann im Browser http://localhost:3000 öffnen.

## Nützliche Befehle

| Befehl | Zweck |
|---|---|
| `npm run import:all` | Gesetze neu aus den amtlichen Quellen laden (BauGB: gesetze-im-internet.de, NDSchG: NI-VORIS) |
| `npm run obsidian` | Obsidian-Vault neu erzeugen (mit Wortlaut-Selbsttest) |
| `node tests/testkatalog.mjs` | Testkatalog gegen die laufende App (fragt teils echte Dienste ab) |

## Datenquellen

- BauGB: Bundesministerium der Justiz / juris – [gesetze-im-internet.de](https://www.gesetze-im-internet.de/bbaug/)
- NDSchG: Niedersächsisches Vorschrifteninformationssystem (NI-VORIS)
- Bebauungspläne: Stadt Oldenburg, Open Data „Umringe rechtsverbindlicher Bebauungspläne“
- Kulturdenkmale: Denkmalatlas Niedersachsen (Niedersächsisches Landesamt für Denkmalpflege)
- Adresssuche: OpenStreetMap / Nominatim

Amtliche Gesetzestexte sind gemeinfrei (§ 5 UrhG). Die Auskünfte ersetzen keine Rechtsberatung und keine Auskunft der Bauaufsicht oder Denkmalschutzbehörde.
