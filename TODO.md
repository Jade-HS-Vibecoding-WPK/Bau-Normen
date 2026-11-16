# Bau-Normen-KI – Plan & ToDo

**Ziel:** Gesetze für die Baubranche im amtlichen Wortlaut abrufen (BauGB, Denkmalschutzgesetze), verständlich erläutert, mit Zusammenhängen – plus Ortsauskunft zu Bebauungsplan und Denkmalschutz.

**Grundregeln**
- Gesetzestext kommt **immer 1:1 aus der amtlichen Quelle** (`data/gesetze/*.json`) – nie von einer KI formuliert.
- Die App funktioniert **ohne KI**: Paragraphen, Stichworte und Ortsauskunft laufen über feste, nachvollziehbare Regeln.
- Fällt ein Datendienst aus, heißt es „keine Aussage möglich“ – nie „kein B-Plan“ oder „kein Denkmal“.
- Jede Auskunft nennt Quelle und Stand.

**Termine:** Start 16.11.2026 · finale, lauffähige Version **Tag 3 (18.11.)** · Tag 4 (19.11.) Puffer.

---

## Erledigt (Tag 1 – 16.11.)
- [x] Projekt aufgesetzt (Next.js, TypeScript)
- [x] BauGB aus gesetze-im-internet.de importiert (297 Einträge, Stand 23.07.2026)
- [x] NDSchG aus NI-VORIS importiert (42 Paragraphen, Stand 12.12.2023), Stichprobe Zeichen für Zeichen geprüft
- [x] Verweise zwischen Paragraphen automatisch erkannt („verweist auf“, „wird erwähnt in“, „gleicher Abschnitt“)
- [x] Abruf ohne KI: „§ 34 BauGB“, „§§ 30, 34 und 35“, „Paragraph 5“ (Rückfrage BauGB/NDSchG), „35 BauGB“
- [x] Kuratiertes Stichwortverzeichnis (`data/stichworte.json`) + Volltextsuche
- [x] Live-Ortsauskunft Oldenburg: Adresse → B-Plan (Stadt Oldenburg) + Denkmale im Umkreis 50 m (Denkmalatlas) → Einordnung mit Paragraphen
- [x] Professionelles Design (Schriftfeld-Stil, Tannengrün, Serif für Gesetzestext)
- [x] Testkatalog mit 29 Fällen (`node tests/testkatalog.mjs`)
- [x] Obsidian-Export (`npm run obsidian`): 428 Notizen – Paragraphen (Wortlaut per Selbsttest geprüft), Gliederung als Baum, Projektdateien mit Abhängigkeiten; Ordner `obsidian/` als Vault öffnen

## Tag 2 – 17.11.
- [x] Dauerhaftes Prüfprogramm `node scripts/wortlaut-pruefen.mjs`: BauGB 297/297 Zeichen für Zeichen identisch mit den amtlichen Einzelseiten (16.11.2026); NDSchG beim Import gegen NI-VORIS geprüft
- [x] B-Plan-Dokumente (Planzeichnung, Begründung als PDF) in der Ortsauskunft verlinkt, dazu Pläne in Aufstellung, Veränderungssperren, unwirksame Pläne
- [x] Obsidian-Button im Kopf + „Notiz öffnen“ je Paragraph
- [x] Erläuterungen fest gespeichert (zur Laufzeit keine KI): BauGB §§ 1–38 (47) und NDSchG komplett (41), Status „Entwurf“, automatisch geprüft (`node scripts/erlaeuterungen-pruefen.mjs`)
- [ ] Erläuterungen für die übrigen BauGB-Paragraphen (§§ 39–250)
- [ ] Fachliche Prüfung der Erläuterungen anhand von `data/erlaeuterungen/PRUEFHINWEISE.md`, danach Status „geprüft“
- [x] Lageskizze in der Ortsauskunft: Standort, Umkreis 50 m, B-Plan-Umring, Denkmalflächen – der Gecko krabbelt darüber und steckt Fähnchen
- [x] Gecko als kleines Gimmick: minimalistische Silhouette, streift wie ein echter Gecko über die Seite (Stop-and-go, bevorzugt an Kanten, flüchtet vor dem Mauszeiger), läuft zu neuen Antworten bzw. zur Erläuterung schwieriger Paragraphen, nimmt bei Denkmalen Tarnfarbe an; blockiert nichts, abschaltbar
- [ ] Optional: echter Kartenhintergrund (z. B. Stadtkarte Oldenburg) unter der Lageskizze
- [ ] Stichwortverzeichnis erweitern, mehr Testfälle (Ziel: 50)
- [ ] BauNVO importieren (wird in B-Plänen zitiert; Hinweis: ältere B-Pläne gelten mit älteren BauNVO-Fassungen)

## Tag 3 – 18.11. (final)
- [ ] Robustheit: Zeitlimits, Ausfall einzelner Dienste, verständliche Fehlermeldungen
- [ ] Mobilansicht und Barrierefreiheit prüfen
- [ ] README mit Startanleitung, Demo-Ablauf
- [ ] Optional: online stellen

## Tag 4 – 19.11. (Puffer)
- [ ] Weitere Landes-Denkmalschutzgesetze – jedes Land einzeln mit Treueprüfung
- [ ] NBauO (Niedersächsische Bauordnung)

---

## Nach den 4 Tagen
**Funktionen, die eine KI brauchen** (API-Key nötig):
- [ ] Freie Fragen verstehen („Was muss ich beachten, wenn ich neben einem Denkmal anbaue?“) – die KI wählt nur die Werkzeuge, der Gesetzestext kommt weiter aus der Bibliothek
- [ ] Thematisch verwandte Paragraphen vorschlagen (als KI-Vorschlag gekennzeichnet)
- [ ] Erläuterungen pflegen/aktualisieren, wenn sich Gesetze ändern

**Weitere Ausbaustufen:**
- [ ] Normen (DIN) – vorher Lizenz klären: DIN-Normen sind urheberrechtlich geschützt (anders als Gesetze)
- [ ] Weitere Städte / B-Plan-Portale
- [ ] Flächennutzungsplan, Erhaltungs-, Sanierungs- und Innenbereichssatzungen der Stadt Oldenburg als zusätzliche Ebenen
- [ ] Historische BauNVO-Fassungen (1962, 1968, 1977, 1990)
- [ ] NDSchG-Novelle (liegt beim Landtag) einpflegen, sobald verkündet

## Offene Fragen
- Rohdaten NI-VORIS: Der Anbieter behält sich Text- und Data-Mining vor. Der Gesetzestext selbst ist gemeinfrei (§ 5 UrhG); die Roh-HTML-Seiten werden deshalb nicht ins Repo übernommen. Für eine kommerzielle Nutzung erneut prüfen.
