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
- [x] Lageskizze in der Ortsauskunft: OpenStreetMap als Hintergrund, Standort, Umkreis 50 m, B-Plan-Umring, Denkmalflächen – der Gecko der Seite läuft hin und steckt die Fähnchen (Zusatzauftrag, sein übriges Verhalten bleibt unverändert)
- [x] Gecko als Gimmick: bewegliche Wirbelkette mit fest geknickten Beinen (Drehpunkt am Körper), diagonale Beinpaare, Rumpf knickt im Takt ein; läuft quer über den Bildschirm von Kasten zu Kasten und bleibt jeweils am rechten Rand stehen (Körpermitte auf der Kante), wendet auf der Stelle statt rückwärts zu laufen; im Stehen ruhig mit eingerolltem Schwanz, schaut sich um; setzt sich an neue Antworten; rollt sich beim Darüberfahren ein; bei Fehlern rot, bei Hinweisen orange mit Meldungsliste; abschaltbar
- [x] Neues Design „Gelände & Linie“ (Organic Shapes & Line Art), hell-pastellig: Minze, Aqua, Flieder auf hellem Grund, heller Kopf mit Pastellverlauf, Tannengrün für Schrift; Höhenlinien, weiche Flächen, Linienzeichnung auf der Startseite; Schriften Fraunces, Figtree, DM Mono, Source Serif 4
- [x] Online-Version auf GitHub Pages: statischer Bau (`npm run build:pages`), Lotse und Ortsauskunft laufen im Browser mit demselben Code; Workflow `.github/workflows/pages.yml`
- [x] README mit Banner, Screenshots (Desktop, Mobil, Gecko) und Gestaltungsübersicht
- [x] Kartenhintergrund unter der Lageskizze (OpenStreetMap)
- [ ] Bei vielen Zugriffen: eigener Kachelserver oder Kartenanbieter statt tile.openstreetmap.org
- [x] Karte der Lageskizze zoom- und verschiebbar (Mausrad, Knöpfe, Ziehen, zwei Finger, Tastatur)
- [x] Gebietsleiste: Hauptinformationen zum Gebiet fest über dem Verlauf
- [x] Hell-/Dunkelmodus (auch automatisch nach Betriebssystem)
- [x] Sprache Deutsch/Englisch für Oberfläche, Ortsauskunft und Hinweise (Gesetzestext bleibt deutsch)
- [x] Gecko über Text durchsichtig; „Sitzt still“ als Signalanzeige; Animationen abschaltbar
- [ ] Erläuterungen auf Englisch (bisher nur Deutsch; der Gesetzestext bleibt ohnehin im deutschen Original)
- [ ] Englische Stichworte im Stichwortverzeichnis (z. B. „pre-emption right“ → § 24 BauGB)
- [ ] Stichwortverzeichnis erweitern, mehr Testfälle (Ziel: 50)
- [ ] BauNVO importieren (wird in B-Plänen zitiert; Hinweis: ältere B-Pläne gelten mit älteren BauNVO-Fassungen)

## Tag 3 – 18.11. (final)
- [ ] Robustheit: Zeitlimits, Ausfall einzelner Dienste, verständliche Fehlermeldungen
- [ ] Mobilansicht und Barrierefreiheit prüfen
- [x] README mit Startanleitung
- [ ] Demo-Ablauf für die Präsentation
- [x] Online stellen (GitHub Pages) – einmalig „Settings → Pages → Source: GitHub Actions“ aktivieren

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
