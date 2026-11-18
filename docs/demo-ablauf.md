# Demo-Ablauf ParaGecko (19.11.2026)

**Dauer:** ca. 12 bis 15 Minuten · **Adresse:** https://jade-hs-vibecoding-wpk.github.io/ParaGecko/
**Rückfallebene:** lokal `npm run dev` → http://localhost:3000 (gleicher Funktionsumfang, dazu der Obsidian-Knopf)

> Alle Eingaben unten sind am 17.11.2026 abends live geprüft, am 18.11.2026 abends erneut auf der neuen Adresse (Zeiten: lokaler Server, frisch gestartet, ohne
> Zwischenspeicher; sind Dienste langsam, kann eine Ortsauskunft bis zu ~15 Sekunden dauern). Die Ortsauskunft
> fragt echte Dienste ab. Fällt einer aus, sagt die App „keine Aussage möglich“. Das ist kein Fehler, sondern genau
> das Verhalten, das wir zeigen wollen (Punkt 4 der Grundsätze).

## Vorbereitung (5 Minuten vorher)

- [ ] Online-Version öffnen, einmal „§ 34 BauGB“ abrufen (lädt die Daten vor)
- [ ] Darstellung: Hell, Gecko „Läuft“, Sprache DE
- [ ] Bibliothek: Bundesland **Niedersachsen** (die Auswahl bleibt im Browser gespeichert und wechselt nach jeder Ortsauskunft auf deren Land)
- [ ] Live-Adresse: https://jade-hs-vibecoding-wpk.github.io/ParaGecko/ (die alte Adresse …/Bau-Normen/ gibt es nicht mehr)
- [ ] Zweiten Tab mit der lokalen Fassung bereithalten (falls das WLAN hakt)
- [ ] Browser-Zoom so, dass Formulare links und Antwortbereich rechts nebeneinander stehen

## Ablauf

| # | Was eingeben / klicken | Was man sieht / worauf hinweisen | Zeit |
|---|---|---|---|
| 1 | Startseite zeigen | Drei Wege: Ortsauskunft, Paragraph abrufen, Bibliothek. **Grundsatz:** Gesetzestext immer 1:1 aus der amtlichen Quelle, zur Laufzeit keine KI | keine |
| 2 | Beispielkarte **„§ 34 BauGB“** | Wortlaut mit Stand und Quelle, „kopieren“, Erläuterung (Status „Entwurf“), Zusammenhang zum Weiterklicken | sofort |
| 3 | `Paragraph 5` | Rückfrage: § 5 gibt es in mehreren Regelwerken; die App rät nicht | sofort |
| 4 | `Vorkaufsrecht der Gemeinde` | Stichwortsuche: kuratiertes Verzeichnis + Volltext | sofort |
| 5 | `Gartenstraße 5, Oldenburg` | Ortsauskunft Oldenburg: Baudenkmal am Standort, B-Plan „nicht verzeichnet“ (Dienst nicht nachweislich vollständig), Lageskizze: **der Gecko läuft hin und steckt die Fähnchen**; Einordnung mit NDSchG-Paragraphen; Gebietsleiste oben | 0,4 s |
| 6 | `Kärntner Straße 10, Oldenburg` | Bebauungsplan gefunden, Planzeichnung und Begründung als PDF | 0,5 s |
| 7 | Bibliothek: Bundesland **Bayern**, dann `§ 6 Bauordnung` | „Bauordnung“ meint jetzt die BayBO, und Bayern zitiert mit **Art.** | sofort |
| 8 | `Frauenplatz 1, 80331 München` | Frauenkirche am Standort, Ensemble, Bodendenkmäler; Paragraphen aus BayDSchG und BayBO; Quellen mit Lizenz in der Fußzeile | 0,4 s |
| 9 | `Markt 1, 52062 Aachen, dort steht ein Denkmal` | NRW: B-Plan „Sanierungsgebiet I“ mit „Plan öffnen“, Denkmale in der Umgebung (12 und 17 m). Unter „Ihre Angabe“ das **andere Landesrecht**: In NRW entsteht der Denkmalschutz grundsätzlich erst mit der Eintragung, wörtlich zitiert aus § 5 DSchG NRW (in Niedersachsen genau umgekehrt, § 5 NDSchG). Ursprünglich Köln (`Roncalliplatz 2, 50667 Köln, …`); der Kölner Denkmaldienst hat seit 18.11. einen Zertifikatsfehler, die Kachel zeigt dort „nicht erreichbar“ | 0,6 s |
| 10 | `Alter Markt 1, 14467 Potsdam` | **Ehrlichkeit:** Das Landesamt in Brandenburg veröffentlicht seine Denkmaldaten nicht frei (angebunden ist nur Frankfurt (Oder)) → „keine Aussage möglich“ für Potsdam, trotzdem die Paragraphen des BbgDSchG | 0,9 s |
| 11 | `Ich plane einen Anbau an der Gartenstraße 5 in Oldenburg` | Adresse mitten im Satz wird erkannt. Ohne „in Oldenburg“ bittet die App freundlich um den Ort, statt irgendwo zu suchen | 0,1 s |
| 12 | `§ 13 VOB/B`, dann `DIN 18353` | VOB/B im Wortlaut mit Hinweis „Vertragsbedingungen, kein Gesetz“; VOB/C nur Verzeichnis (DIN-Normen geschützt) | sofort |
| 13 | Oben **EN**, dann **Darstellung → Dunkel** | Oberfläche und Ortsauskunft auf Englisch, Gesetzestext bleibt deutsch; Dunkelmodus | sofort |
| 14 | (nur lokal) Knopf **Obsidian-Ansicht** | Gesetze und Projektdateien als Graph; Vault vorher mit `npm run obsidian` erzeugen | keine |

## Zahlen für die Folien

- 20 Regelwerke: BauGB, Bauordnung und Denkmalschutzgesetz von 6 Ländern, Bauordnungen von Baden-Württemberg, Hessen und Hamburg, MBO, VOB/A, VOB/B, VOB/C-Verzeichnis
- Wortlaut geprüft: BauGB 297/297 gegen die amtlichen Einzelseiten; Landesrecht gegen eine zweite amtliche Darstellung bzw. eine zweite, unabhängige PDF-Auslesung
- Ortsauskunft für ganz Deutschland: 44 Bebauungsplan- und 23 Denkmaldienste der Länder, Landkreise und Städte
- Testkatalog: 113 Fragen, alle bestanden (Paragraphen, Rückfragen, Stichworte, Landesrecht, Ortsauskunft in allen 16 Ländern)

## Ausblick (letzte Folie)

- **Grundstücksanalyse:** eigene Grundstücksgrenzen hochladen (GeoJSON, KML, Shapefile) → Auskunft für die Fläche statt für den Adresspunkt; eigene Funktion, getrennt vom Paragraphen-Abruf
- **Übriges Landesrecht:** die Rechtsportale von zehn Ländern (juris) verbieten den automatischen Abruf. Drei Bauordnungen kommen schon aus frei veröffentlichten PDFs; für den Rest weitere solche Quellen suchen oder Erlaubnis anfragen
- **KI erst danach und nur als Wegweiser:** freie Fragen verstehen, verwandte Vorschriften vorschlagen; der Gesetzestext kommt weiter aus der Bibliothek

## Wenn etwas hakt

| Problem | Was tun |
|---|---|
| Ortsauskunft dauert | Nach 4 Sekunden erscheint der Hinweis, dass mehrere Dienste abgefragt werden; nach spätestens ~20 Sekunden kommt die Antwort, ausgefallene Dienste werden genannt |
| „Adresssuche nicht möglich“ | Kurz warten und erneut senden (die Adresssuche versucht es intern schon einmal neu) oder auf die lokale Fassung wechseln |
| Ein Dienst „nicht erreichbar“ | Zeigen statt verstecken: Die App sagt „keine Aussage möglich“ statt „kein Denkmal“ |
| Kein Internet | Lokale Fassung: Paragraphen, Stichworte und Erläuterungen funktionieren ohne Netz, die Ortsauskunft nicht |
