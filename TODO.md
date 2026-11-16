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
- [ ] Dauerhaftes Prüfprogramm: jeden gespeicherten Paragraphen gegen die amtliche Einzelseite vergleichen (BauGB + NDSchG)
- [ ] Erläuterungen für alle Paragraphen (fest gespeichert, zur Laufzeit keine KI) – *wartet auf Entscheidung, siehe unten*
- [ ] Kartenausschnitt in der Ortsauskunft: Standort, B-Plan-Umring, Denkmalflächen
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
- Erläuterungen: Dürfen sie während der Entwicklung (mit KI) geschrieben und dann **fest gespeichert** werden – die App selbst braucht dafür keine KI? Oder sollen sie komplett auf „nach den 4 Tagen“?
- Rohdaten NI-VORIS: Der Anbieter behält sich Text- und Data-Mining vor. Der Gesetzestext selbst ist gemeinfrei (§ 5 UrhG); die Roh-HTML-Seiten werden deshalb nicht ins Repo übernommen. Für eine kommerzielle Nutzung erneut prüfen.
