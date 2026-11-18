# ParaGecko (bis 18.11.2026: Bau-Normen-KI): Plan und ToDo

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
- [x] Obsidian-Vault nicht mehr versioniert (`obsidian/` in `.gitignore`, lokal mit `npm run obsidian` erzeugen) – bewusst keine Graph-Ansicht in der Website; falls später eine Verlinkung, dann ein Ländervergleich über `data/gegenstuecke` (z. B. § 6 MBO ↔ Art. 6 BayBO ↔ § 6 BauO NRW)
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
- [x] Darstellungsmenü lag hinter dem Hauptteil – Kopf liegt jetzt darüber
- [x] Musterbauordnung (DIBt-PDF, Stand 26./27.09.2024) im Wortlaut, Satznummern hochgestellt, Gegenprüfung mit zweiter PDF-Auslesung (`npm run import:mbo`)
- [x] VOB/A aus dem Bundesanzeiger (Abschnitt 1 Ausgabe 2019 mit den § 3a-Änderungen von 2025, Abschnitte 2 und 3 Ausgabe 2026) und VOB/B (Ausgabe 2016, Lesefassung der Fachinformation Bundesbau) im Wortlaut, Gegenprüfung mit zwei PDF-Auslesungen (`npm run import:vob`)
- [x] VOB/C als Verzeichnis der 68 ATV (DIN-Normen, Wortlaut geschützt) (`npm run vobc`)
- [x] Hinweis zur Verbindlichkeit in jeder Karte (MBO: Muster, VOB/A: Vergaberegeln, VOB/B: AGB, VOB/C: DIN-Normen)
- [x] Lotse versteht „§ 6 MBO“, „§ 3a EU VOB/A“, „§ 3 VOB/A-EU“, „§ 13 VOB/B“, „§ 4 VOB“ (Rückfrage), „DIN 18353“; „NBauO“ wird als noch fehlend erkannt
- [x] Stichwortverzeichnis um 58 Begriffsgruppen zu MBO und VOB erweitert; Testkatalog 47 Fragen
- [ ] Erläuterungen für MBO und VOB
- [x] NBauO (Fassung ab 01.07.2025) aus NI-VORIS im Wortlaut, Satznummern hochgestellt, Stichproben gegen die Druckansicht (`npm run import:nbauo`)
- [x] Ortsauskunft Deutschland: Adressen bundesweit, mit Postleitzahl und Ort; bei mehrdeutiger Straße Rückfrage; B-Pläne (Oldenburg) und Denkmale (Niedersachsen) nur dort, sonst offen „keine Aussage“
- [x] Dunkelmodus klarer: neutraler Graphit-Grund, frische Akzente, lesbare deaktivierte Knöpfe
- [x] Schneller bei vielen Regelwerken: Online-Version lädt Index, Wortlaut, Erläuterungen und Suchtexte in Stufen; Server bereitet Ableitungen einmal vor
- [x] README zeigt die Website gleich oben (Vorschaugrafik hell, dunkel, Smartphone)
- [ ] Stichwortverzeichnis erweitern, mehr Testfälle
- [ ] BauNVO importieren (wird in B-Plänen zitiert; Hinweis: ältere B-Pläne gelten mit älteren BauNVO-Fassungen)

## Bundesweite Erweiterung – ÜBERGABE für den nächsten Chat (Stand 17.11.2026 abends)

**Arbeitsstand (17.11.2026, spät):** Schritte 1–4 unten erledigt und online (Commits `26e1574`, `9964c65`, `a11949f`). Das Repository heißt seit 17.11. abends **`Bau-Normen`** – die Online-Version liegt jetzt unter https://jade-hs-vibecoding-wpk.github.io/Bau-Normen/ (die alte Adresse …/Bau-Normen-KI/ liefert 404; GitHub leitet Pages-Adressen nicht um). Danach: Robustheit, Adresserkennung, Mobil/Barrierefreiheit, Demo-Ablauf – siehe „Tag 3“.

**Start-Text für den neuen Chat:**
> Lies TODO.md, Abschnitt „Bundesweite Erweiterung – ÜBERGABE“, und mach dort weiter. Frag vor jedem Commit/Push.

### Fertig (im Arbeitsverzeichnis)
- **Länderverzeichnis** `lib/laender.ts` (16 Länder, Bauordnung/DSchG, Kürzel); Metadaten der Landesgesetze automatisch in `lib/regelwerke.ts`
- **Land-Bezug:** Einstellung `land` (Standard Niedersachsen), Auswahl „Bundesland“ in der Bibliothek, Wechsel nach Ortsauskunft auf das Land der Adresse; Anfrage trägt `land`
- **Lotse:** Kürzel/Titel aller Landesgesetze, „Bauordnung/LBO/DSchG“ = Gesetz des gewählten Landes, „Art.“ (Bayern); Rückfragen, Stichworte, Suche nur Bund + Land + MBO + VOB; fehlendes Landesgesetz wird offen gemeldet; Landesrecht vor MBO sortiert
- **Landesgesetze importiert (10):** BayBO, BayDSchG, BauO NRW, DSchG NRW, SächsBO, SächsDSchG, BbgBO, BbgDSchG, BremLBO, BremDSchG – `scripts/import-landesrecht-c.mjs` (`--offline --pruefen`), Prüfprotokolle in `data/quellen/landesrecht/<id>/pruefung.txt` (git-ignoriert). Abweichungen Portal ↔ Gesetzblatt (Bremen 8, Brandenburg 1) als sichtbarer Hinweis an der Vorschrift.
- **Landesgesetze aus PDF-Einzeldokumenten (3, 18.11.):** LBO BW (Gesetzblatt 2026 Nr. 44, amtlich), HBO (Lesefassung des Wirtschaftsministeriums, Stand Oktober 2025) und HBauO (Gesamtsynopse, rechte Spalte, Stand 26.09.2026) – `scripts/import-landesrecht-d.mjs` (`--offline`, `--nur=<id>`), zwei Auslesungen (pypdf, pdftotext) mit Gegenprüfung; HBO und HBauO tragen in jeder Karte den Hinweis „nichtamtliche Lesefassung“. Übersprungen: HDSchG (Synopse mit Streichungen und Platzhalter), BauO Bln (Spalten kaum trennbar, „unverbindliche Arbeitshilfe“), ThürBO (Neuerlass 2024 nicht als Gesetzblatt gefunden; Änderung vom 06.07.2026). PDFs für HDSchG und BauO Bln liegen in `data/quellen/landesrecht/` (git-ignoriert).
- **Gegenstücke** `data/gegenstuecke/*.json` für alle 15 Landesgesetze (Thema → Vorschriften, `schutzOhneEintragung` mit wörtlichem Beleg); Stichworte mit Platzhaltern `@bauordnung:<thema>` / `@denkmalschutz:<thema>`
- **Datenlagerung Online-Version:** `katalog.json` + je Gesetz `details/`, `wortlaut/`, `suche/` (nur bei Bedarf geladen)
- **Geodienste:** `lib/ort/dienste/` – 44 B-Plan- und 23 Denkmaldienste (Stand 18.11.: dazu Kreis- und Stadtdienste in Niedersachsen, Hessen, Freiburg, Münster, Duisburg sowie Denkmale in MV, Thüringen und Frankfurt (Oder); Recherche in `docs/quellen-recherche.md`) (amtlich, getestet, CORS ok); nur Hamburg und Bremerhaven sind `vollstaendig`; Oldenburg jetzt bewusst `vollstaendig: false`
- **Ortsauskunft:** fragt alle passenden Dienste parallel ab und fasst zusammen (`zusammenfassen` in `lib/ort/index.ts`); B-Plan-Texte allgemein; „kein Plan“ nur bei vollständigem Dienst, sonst „nicht verzeichnet – Dienst nicht vollständig“; Bauordnungsrecht nach dem Land der Adresse

### Als Nächstes (in dieser Reihenfolge)
1. [x] **Denkmal-Einordnung in `lib/ort/index.ts` verallgemeinern** – erledigt: Texte landesneutral, Paragraphen aus `data/gegenstuecke`, Satz zur Eintragung mit wörtlichem Beleg (true: NI, BY, SN, BB; false/konstitutiv: NRW, HB), ohne Gesetz (z. B. HH, TH) Text ohne Paragraphen; „Bei Erdarbeiten“ für jedes Land; Ausfall einzelner Dienste wird genannt. Neues Prüfprogramm `node scripts/gegenstuecke-pruefen.mjs`. Ursprüngliche Aufgabe: (Abschnitt „// --- Denkmalrecht ---“): Die Texte nennen noch NDSchG-Paragraphen und den Denkmalatlas Niedersachsen – für andere Länder FALSCH. Stattdessen: Gesetz über `landesgesetz(standort.land, "denkmalschutz")`, Vorschriften über `gegenstuecke(id).themen` (begriffe, genehmigungspflicht, erhaltungspflicht, umgebungsschutz, erdarbeiten, bodenfunde, behoerden), Aussage zum Schutz ohne Eintragung nur nach `schutzOhneEintragung` (true/false/null) mit Beleg; ohne importiertes Gesetz allgemeiner Text ohne Paragraphen. Denkmal-Ergebnis um `vollstaendig`/`abdeckung` ergänzen (wie B-Plan), Quelle = `dm.quelle`. Abschnitt „Bei Erdarbeiten“ ebenso (nicht mehr nur `inNds`).
2. [x] **Oberfläche:** „nicht verzeichnet“ bei unvollständigem Dienst (Kachel und Gebietsleiste, B-Plan und Denkmal), Abdeckung klein unter der Quelle, Plan-Link („Plan öffnen“), leere Plannummer; Status-Etikett bricht um statt in die Nachbarkachel zu ragen; veraltete Texte „nur Oldenburg/Niedersachsen“ ersetzt (Karte, Gebietsleiste, Fußzeile mit Quellen und Lizenz, Lageskizze, Formularhinweise, Startseite). Nebenbei behoben: Gecko meldete außerhalb Oldenburgs fälschlich „Plan-Dokumente/Laufende Verfahren nicht abrufbar“.
3. [x] Testkatalog 80/80 (15 neue Orts-Fälle, je Land eine Adresse), `npx next build` und `npm run build:pages` fehlerfrei, Online-Fassung im Browser geprüft (Köln: DSchG-NRW-Paragraphen, Chip öffnet § 5 DSchG NRW), Obsidian 1745 Notizen, Selbsttest 1344/1344 – dafür im Selbsttest weiche Trennzeichen (U+00AD, § 83 BauO NRW) wie im Suchtext ausgenommen.
4. [x] README: Länder, Landesrecht, Dienste-Tabelle mit Lizenzen und Abdeckung, Qualitätssicherung, Befehle. **Nicht** gemacht: neue Bilder (die vorhandenen zeigen Oldenburg und stimmen weiterhin). → **Nutzerin fragen, ob committet/gepusht werden soll.**

### Beobachtungen beim Testen
- [x] Adresserkennung: „Ich plane einen Anbau an der Beethovenstraße 20 …“ wurde zu Straße „Anbau an der Beethovenstraße“ – behoben (`lib/verstehen.ts`: ab dem letzten kleingeschriebenen Wort abschneiden, „am“ bleibt Teil des Namens; zwei neue Testfälle). Bekannt, unverändert: „Auf dem Wall 3“ wird zu „Wall“ (Füllwörter am Satzanfang).
- [x] Straßen ohne typische Endung („Zeil 1“, „Tal 1“, „Lung Wai 1“) werden im Eingabefeld erkannt, wenn eine Postleitzahl folgt („Zeil 1, 60313 Frankfurt“); ohne Postleitzahl weiterhin nur über das Formular „Ortsauskunft“.
- Denkmal-Dienst Rostock (geo.sv.rostock.de) antwortete am 17.11. abends nicht (Zeitüberschreitung) – App sagt korrekt „keine Aussage“; im Testkatalog ist der Denkmalstatus für Rostock deshalb offen („*“).

### Entscheidungen der Nutzerin (offen)
- **juris-Portale (BW, BE, HH, HE, MV, RP, SL, ST, SH, TH):** robots.txt `Disallow: /` + TDM-Vorbehalt → nichts abgerufen. Bauordnungen BW, HE, HH stattdessen aus frei veröffentlichten PDFs (s. o.); für die übrigen Gesetze ebenso nach Gesetzblatt-PDFs oder Lesefassungen der Ministerien suchen. Wege: Erlaubnis/Export anfragen (juris service@juris.de bzw. Länder) oder Gesetze von Hand speichern und offline einlesen (rechtlich prüfen).
- **Lizenzen der Geodienste:** Bayern CC BY-ND (Namensnennung zeigen), Sachsen-Denkmal teils CC BY-NC-ND (nicht kommerziell), Nürnberg nur „©“, München ohne Angabe, Schwerin „Zugriff beschränkt“ – vor kommerzieller Nutzung klären.
- **gesetzblatt.bremen.de** verbietet Speicherung – die beiden PDFs wurden nur lokal zum Abgleich geladen (git-ignoriert).
- **Stand-Datum** von BremLBO/BbgBO nennt Änderungen, die noch nicht gelten (Portalangabe).

### Testadressen der Geodienste (alle am 17.11.2026 geprüft)
Karlsruhe Am Storrenacker (BW-B-Plan) · Stuttgart Schlossplatz · Ulmer Münster (BW-Denkmal) · München Messestadt Riem / Frauenplatz 1 · Nürnberg Johannisstraße · Berlin Pariser Platz / Brandenburger Tor · Potsdam Alter Markt 1 · Bremen Konsul-Smidt-Str. 10 / Am Markt · Bremerhaven Hans-Scharoun-Platz 1 · Hamburg Rathausmarkt 1 · Frankfurt Messe / Dom · Rostock Am Schilde / Neuer Markt 1 · Schwerin Alexandrinenstr. 3 · Köln Roncalliplatz / Dom · Bonn Beethovenhalle · Dortmund U-Turm · Koblenz Löhrstraße · Mainzer Dom · Saarbrücken Ludwigskirche · Leipzig Messe-Allee 1 · Dresden Frauenkirche · Magdeburg Willy-Brandt-Platz / Dom · Kiel Holstein-Stadion / Schloss · Erfurt Landtag

## Tag 3 – 18.11. (final)
- [x] Robustheit: jeder Dienst höchstens 15 s (danach „nicht rechtzeitig geantwortet“, die übrigen Dienste zählen weiter), Oldenburger Plan-Dokumente ebenso; Adresssuche versucht es nach einem Aussetzer einmal neu (1,5 s Pause wegen der Nominatim-Regel); unerwartete Fehler im Server kommen als verständliche Meldung statt „Verbindung fehlgeschlagen“; nach 4 s Ladezeit Hinweis, dass mehrere Dienste abgefragt werden
- [x] Mobilansicht und Barrierefreiheit geprüft (375 px: kein seitliches Scrollen, Karten und Ortsauskunft passen; Abdeckungs-Hinweis jetzt aufklappbar; alle Felder beschriftet, Bilder mit Alternativtext, Kontrast der kleinen Hinweistexte ≥ 4,5:1 in Hell und Dunkel; Ladeanzeige als `role="status"`). Offen, klein: Nach der ersten Antwort gibt es keine `h1` mehr (die Startüberschrift verschwindet).
- [x] README mit Startanleitung
- [x] Demo-Ablauf für die Präsentation: `docs/demo-ablauf.md` (14 Schritte, live geprüft, mit Rückfallebene)
- [x] Testkatalog 82/82, `next build` und `build:pages` fehlerfrei
- [x] Nachmittags: Testkatalog 107/107 mit den neuen Diensten und LBO BW, HBO, HBauO (Hamburger B-Plan-Dienst einmal kurz ausgefallen, bei Wiederholung bestanden); Bibliothek nennt jetzt auch ein einzeln fehlendes Denkmalschutzgesetz (z. B. „Für Hessen ist das Denkmalschutzgesetz (HDSchG) noch nicht in der Bibliothek“)
- [x] Abends (Rückmeldung der Nutzerin): Prototyp-Schild entfernt; Logo als eigene Linie gezeichnet (Paragraph geometrisch mittig, keine Schrift, auch als Tab-Symbol `app/icon.svg`); Adresse nur noch mit Ort oder PLZ (keine Suche zuerst in Oldenburg; ohne Ort freundliche Bitte statt Fehler; Ortsname filtert Nachbarorte wie Lindern (Oldenburg) aus, gleichnamige Orte → Rückfrage); Bibliothek eingeklappt, nur Regelwerke des gewählten Landes, „Weitere Länder“ entfernt, Kürzelspalte so breit wie das längste Kürzel; dieselbe Auswahl gilt für „Paragraph abrufen“; Gedankenstriche aus Oberfläche, Erläuterungen (533), README und docs entfernt (Gesetzeswortlaut unverändert); Stresstest: Server 400 Anfragen mit 25 gleichzeitig (114/s, Median 194 ms), 24 kaputte Eingaben, Browser 40 Fragen am Stück, schnelle Wechsel, Überlappungsprüfung bei 1440/1024/768/375 px hell/dunkel/EN. Dabei behoben: Frage während einer laufenden Antwort ging verloren; nur Leerzeichen gab eine leere Antwort; Teilausfall eines Dienstes wurde in Kachel und Gebietsleiste verschwiegen; lange Nummern („DIN 18353“) ragten auf dem Handy in den Titel; „Anlage HBO“/„Anhang NBauO“ (auch als Chip der Ortsauskunft) starteten eine Volltextsuche statt die Anlage zu zeigen
- [ ] Kölner Denkmaldienst (geoportal.stadt-koeln.de) liefert seit 18.11. ein Zertifikat, dem weder Node noch Chrome vertrauen (UNABLE_TO_GET_ISSUER_CERT_LOCALLY / ERR_CERT_AUTHORITY_INVALID); vor der Demo erneut prüfen
- [x] Neuer Name **ParaGecko** mit Unterzeile „Findet die Paragraphen zu jedem Grundstück“ (EN: „Finds the sections for every plot“): in App, Seitentitel, README, Banner, Bildschirmfotos (neu aufgenommen mit `scripts/bilder-aufnehmen.mjs`) und Demo-Ablauf. Markenrecherche (TMview, Domains): .de und .com frei, keine gleiche Marke; „Gecko“ ist in den Klassen 9/42 aber oft eingetragen, vor einem Verkauf anwaltlich prüfen lassen
- [ ] Nach der Demo: Repository in „ParaGecko“ umbenennen (Pages-Adresse wird dann …/ParaGecko/, alte Adresse leitet nicht weiter; README-Links und Demo-Ablauf anpassen), Beschreibung im „About“-Feld setzen, interne Kennungen (`package.json`, `.claude/launch.json`, User-Agent der Importskripte) nachziehen
- [x] Online stellen (GitHub Pages) – einmalig „Settings → Pages → Source: GitHub Actions“ aktivieren

## Tag 4 – 19.11. (Puffer)
- [ ] Weitere Landes-Denkmalschutzgesetze – jedes Land einzeln mit Treueprüfung
- [x] NBauO (Niedersächsische Bauordnung)
- [ ] B-Plan-Dienste weiterer Städte (z. B. über XPlanung/Geoportale der Länder) und Denkmal-Dienste weiterer Länder anbinden
- [x] Niedersachsen: Kreisdienste Landkreis Leer und Landkreis Aurich (alle Gemeinden, auch die Inseln Borkum, Juist, Norderney, Baltrum) – Dienste für einen ganzen Landkreis (`gebiet.kreis`), Veränderungssperren aus Diensten werden getrennt angezeigt
- [ ] Niedersachsen: Landkreise Wittmund und Friesland (auch Langeoog, Spiekeroog, Wangerooge) haben keinen offenen Dienst – beim Landkreis anfragen
- [ ] Satzungen nach §§ 34, 35 BauGB (Innen-/Außenbereichs-, Abrundungs-, Splittersiedlungssatzungen) und örtliche Bauvorschriften stehen in den Kreisdiensten Leer/Aurich mit drin – bisher bewusst nicht angezeigt (keine Bebauungspläne); als eigene Ebene ergänzen
- [x] Landkreis Osterholz hat eine öffentliche ArcGIS-Karte „Raumordnung & Bauleitplanung“ (dl-de/by-2.0) – angebunden (18.11.)
- [x] Landesbauordnungen und Denkmalschutzgesetze von Bayern, NRW, Sachsen, Brandenburg, Bremen; Bauordnungen von Baden-Württemberg, Hessen, Hamburg (18.11.)
- [ ] HDSchG, sobald eine saubere geltende Fassung veröffentlicht ist; BauO Bln aus der Synopse (Spaltengrenze je Seite bestimmen, Blöcke „Fassung, die am 20.01.2027 in Kraft tritt“ ausschneiden); ThürBO nach Gesetzblatt 2024 Nr. 9 suchen (samt Änderung vom 06.07.2026); DSchG BW, DSchG HH und die Gesetze von MV, RP, SL, ST, SH (siehe „Entscheidungen der Nutzerin“ oben)
- [ ] LBO BW: Änderungen nach dem 16.03.2026 ohne juris nicht ausgeschlossen – vor einem Verkauf gegenprüfen
- [ ] Weitere frei verfügbare Regelwerke: BauNVO, PlanZV, GEG, HOAI, BGB-Bauvertragsrecht (§§ 650a ff.), NTVergG, DVO-NBauO
- [ ] § 3a VOB/A: zusammengeführten Text fachlich gegenlesen lassen (die Bekanntmachung 2025 enthält nur Änderungsbefehle)
- [ ] VOB/B: auf die Bundesanzeiger-Fassungen (2009/2012/2016) umstellen, sobald abrufbar (bisher konsolidierte Lesefassung der Fachinformation Bundesbau)

---

## Nach den 4 Tagen

**Grundstücksanalyse mit eigenen Grundstücksgrenzen (nach der Demo – Wunsch aus dem Kreis der Testenden, 17.11.)**

Ziel: Wer die Grenzen seines Flurstücks als Datei hat, bekommt eine genauere Ortsauskunft für die **Fläche** statt für den Adresspunkt – als Grundstücks-Steckbrief mit Fakten und offenen Punkten, **keine Kaufempfehlung** („lohnt sich der Kauf?“ beantwortet die App nicht: Kaufpreis, Bauzustand, Baulasten, Altlasten, Grundbuch fehlen, und ein Urteil widerspräche dem Grundsatz „feste Regeln, keine Beratung“).

**Getrennt von der Hauptfunktion:** Gesetzestexte und Normen abrufen bleibt die Hauptfunktion und darf davon nicht berührt werden.
- eigener Einstieg (z. B. Knopf „Grundstück analysieren“ bzw. eigenes Formular „D · Grundstück“), die Grundstücksanzeige erscheint **nur**, wenn Grenzen hochgeladen wurden
- eigener Code-Bereich (z. B. `lib/grundstueck/`, `components/Grundstueck*.tsx`); Lotse, Bibliothek und Paragraphen-Abruf bleiben unverändert, die vorhandene Ortsauskunft wird nur mitbenutzt (Dienste, Gegenstücke), nicht umgebaut
- Datei wird **nur im Browser** gelesen (nichts verlässt das Gerät, läuft auch auf GitHub Pages)

Stufen:
- [ ] **Stufe 1** (ca. 1,5–2 Tage): Upload GeoJSON, KML, Shapefile (ZIP); Koordinatensysteme UTM 32/33 (EPSG 25832/25833), ältere Gauß-Krüger-Daten über eine Bibliothek; Grundstück in der Lageskizze; B-Pläne mit Anteil an der Fläche, Denkmale auf dem Grundstück und bis 50 m um die **Grenze**; Grundstücksgröße. Vorher klären: welche Dateien (Format, Koordinatensystem) die Testenden tatsächlich haben.
- [ ] **Stufe 2** (ca. 3–5 Tage): Festsetzungen (GRZ, GFZ, Geschosse, Bauweise) aus XPlanung-Diensten, wo vorhanden → z. B. zulässige Grundfläche = GRZ × Grundstücksfläche; setzt den BauNVO-Import voraus (§ 19). Heute liefern alle angebundenen Dienste nur Planumringe.
- [ ] **Stufe 3** (Wochen): weitere Ebenen, soweit offen – Bodenrichtwerte (BORIS), Hochwassergefahr, Altlasten; je Land eigene Dienste wie bei B-Plänen und Denkmalen
- [ ] Alternative für Käuferinnen/Käufer ohne GIS-Datei: Flurstück zur Adresse aus offenen ALKIS-Daten holen, wo ein Land sie anbietet (je Land prüfen)
- [ ] DXF aus dem CAD erst später (enthält kein Koordinatensystem – muss abgefragt werden)

**Funktionen, die eine KI brauchen** (API-Key nötig):
- [ ] Freie Fragen verstehen („Was muss ich beachten, wenn ich neben einem Denkmal anbaue?“) – die KI wählt nur die Werkzeuge, der Gesetzestext kommt weiter aus der Bibliothek
- [ ] Thematisch verwandte Paragraphen vorschlagen (als KI-Vorschlag gekennzeichnet)
- [ ] Erläuterungen pflegen/aktualisieren, wenn sich Gesetze ändern

**Weitere Ausbaustufen:**
- [ ] Normen (DIN), auch der Wortlaut der VOB/C-ATV – nur mit Lizenz von DIN Media: DIN-Normen sind urheberrechtlich geschützt (anders als Gesetze)
- [ ] Weitere Städte / B-Plan-Portale
- [ ] Flächennutzungsplan, Erhaltungs-, Sanierungs- und Innenbereichssatzungen der Stadt Oldenburg als zusätzliche Ebenen
- [ ] Historische BauNVO-Fassungen (1962, 1968, 1977, 1990)
- [ ] NDSchG-Novelle (liegt beim Landtag) einpflegen, sobald verkündet

## Offene Fragen
- Rohdaten NI-VORIS: Der Anbieter behält sich Text- und Data-Mining vor. Der Gesetzestext selbst ist gemeinfrei (§ 5 UrhG); die Roh-HTML-Seiten werden deshalb nicht ins Repo übernommen. Für eine kommerzielle Nutzung erneut prüfen.
