# ParaGecko: Weg zum Produkt (ToDo für später)

Stand 19.11.2026. Ausgangspunkt ist die Fassung aus dem WPK „Vibecoding KI-Werkstatt“, die nur privat und nicht gewerblich genutzt werden darf (siehe [LICENSE](LICENSE)). Diese Liste sammelt, was bis zu einem verkaufbaren Produkt fehlt. Innerhalb der Abschnitte steht das Wichtigste oben. Die laufende Arbeitsliste bleibt [TODO.md](TODO.md).

**Grundregeln bleiben:** Gesetzestext immer 1:1 aus der amtlichen Quelle, Auskunft nach festen Regeln, Quelle und Stand an jeder Aussage, bei einem Ausfall „keine Aussage möglich“ statt einer falschen Sicherheit.

## 1. Gestaltung

- [ ] **Design auf Pixeldesign umstellen.** Die ganze Oberfläche bekommt einen Pixel-Art-Stil:
  - Gecko als Pixel-Figur mit Laufanimation aus Einzelbildern (Sprite Sheet) statt der gezeichneten Wirbelkette; Verhalten (Kästen, Fähnchen, Einrollen, Farben für Hinweise und Fehler) bleibt
  - Logo, Tab-Symbol, Fähnchen, Symbole, Rahmen, Knöpfe und Hintergrundflächen im Pixelstil
  - Pixelschrift nur für Überschriften und Marke; Gesetzestext und Erläuterungen bleiben in einer gut lesbaren Schrift, Lesbarkeit geht vor
  - Lageskizze: prüfen, wie Karte und Pixelstil zusammenpassen, ohne dass die Karte schlechter lesbar wird
  - Hell und Dunkel, Mobilansicht, Kontrast (mindestens 4,5:1) und „Animationen aus“ neu prüfen
  - Banner und Bildschirmfotos neu aufnehmen (`scripts/bilder-aufnehmen.mjs`)
- [ ] Gestaltungsregeln festhalten (Farbpalette, Pixelraster, Schriften, Animationen), damit Website, Preisseite und Anleitung einheitlich aussehen
- [ ] Barrierefreiheit: Nach der ersten Antwort fehlt eine `h1`; Prüfung mit Bildschirmleser

## 2. Recht und Lizenzen (vor jedem Verkauf)

- [ ] Rechte am Code mit der Jade Hochschule bzw. der Kursleitung schriftlich klären (im WPK entstanden)
- [ ] Marke „ParaGecko“ anwaltlich prüfen lassen und anmelden („Gecko“ ist in den Klassen 9 und 42 oft eingetragen); Domains sichern
- [ ] Lizenzen der Geodienste schriftlich klären: ohne Lizenzangabe (München, Stuttgart, Nürnberg, Landkreise Leer und Aurich, Sachsen-Anhalt), nicht kommerziell (Denkmalkarte Sachsen teils CC BY-NC-ND), Bedingungen bei CC BY-ND (Bayern) und CC BY-SA (Denkmalatlas Niedersachsen, Hameln-Pyrmont)
- [ ] Gesetzesquellen klären: NI-VORIS und juris-Portale (Vorbehalt gegen Text- und Data-Mining), gesetzblatt.bremen.de (Speicherverbot); Erlaubnis einholen oder lizenzierten Bezug vereinbaren
- [ ] DIN-Normen und Wortlaut der VOB/C nur mit Lizenz von DIN Media
- [ ] Impressum, Datenschutzerklärung (Adressen gehen an die Adresssuche und an die Geodienste), AGB und Haftungsausschluss von Fachleuten erstellen lassen; prüfen lassen, ob die Auskunft als Rechtsdienstleistung gilt
- [ ] Dieses Repository nach dem Kurs privat stellen; die Produktfassung in einem eigenen, privaten Repository weiterführen

## 3. Inhalte und Qualität

- [ ] Fachliche Durchsicht aller Erläuterungen durch eine Fachperson (Status „Entwurf“ → „geprüft“), offene Stellen in `data/erlaeuterungen/PRUEFHINWEISE.md`
- [ ] Erläuterungen für BauGB ab § 39, VOB/A und alle Landesgesetze; dazu Englisch
- [ ] Fehlende Landesgesetze (Länder mit juris-Portal, HDSchG, BauO Bln, ThürBO und weitere Denkmalschutzgesetze)
- [ ] BauNVO und weitere Regelwerke (PlanZV, GEG, HOAI, BGB-Bauvertragsrecht)
- [ ] Aktualität: Gesetzesänderungen automatisch erkennen (regelmäßiger Abgleich mit den Quellen), Hinweis an der betroffenen Vorschrift, Freigabe durch eine verantwortliche Person
- [ ] Testkatalog bei jedem Push automatisch laufen lassen, mit nachgebildeten Diensten statt echter Abfragen; deutlich mehr Testfälle

## 4. Technik und Betrieb

- [ ] **Daten selbst vorhalten, statt sie nur live abzurufen.** Anlass: Am 19.11.2026 abends war der Denkmalatlas Niedersachsen wegen Wartungsarbeiten abgeschaltet, alle Denkmal-Abfragen in Niedersachsen liefen ins Leere. Die Gesetzestexte liegen schon im Projekt (`data/gesetze/`); live abgerufen werden Geodaten (Bebauungspläne, Denkmale), Adresssuche und Kartenkacheln.
  - **Ziel:** Kopie der Geodaten auf dem eigenen Server, regelmäßig abgeglichen (z. B. nachts), mit „Stand vom …“ in jeder Auskunft. Am besten beides: zuerst live fragen, bei Ausfall die gespeicherte Kopie mit Hinweis auf ihren Stand zeigen. Maßgeblich bleibt der aktuelle Stand beim Amt, das muss die App sagen. Gilt für alle angezeigten Texte: Fällt eine fremde Seite aus, bleibt der Inhalt sichtbar, und nur der Link darauf bekommt den Hinweis „Seite des Anbieters derzeit nicht erreichbar (geprüft am …)“ (Einzelheiten in [TODO.md](TODO.md), Punkt „Alle Texte einbetten“).
  - **Darf man das? Für die meisten Dienste ja** (Stand der Lizenzprüfung 18./19.11.2026, keine Rechtsberatung):
    - Datenlizenz Deutschland (dl-de/by-2.0, dl-de/zero-2.0), CC BY (3.0 DE, 4.0) und CC0: Speichern, Umwandeln und Weitergeben ist erlaubt, auch kommerziell. Bedingung bei „by“: Quelle, Lizenz mit Link und Verweis auf den Datensatz nennen, Änderungen kennzeichnen. Das sind die meisten angebundenen Dienste.
    - CC BY-SA 4.0 (Denkmalatlas Niedersachsen, Landkreis Hameln-Pyrmont): erlaubt, aber eine bearbeitete Kopie (umgewandelt, gefiltert) muss wieder unter CC BY-SA 4.0 stehen. Der eigene Programmcode ist davon nicht betroffen.
    - CC BY-ND 4.0 (Bauleitpläne Bayern, Bayerisches Landesamt für Denkmalpflege): unveränderte Kopie erlaubt, reine Formatumwandlung auch; Zuschneiden oder Zusammenführen kann als Bearbeitung gelten. Vorher beim Anbieter nachfragen oder weiter live abfragen.
    - **Ohne Lizenzangabe, also nicht ohne schriftliche Zustimmung:** München, Stuttgart, Nürnberg („© Stadt Nürnberg“), Landkreise Leer und Aurich, Sachsen-Anhalt (B-Pläne und Denkmale), Denkmalkarte Sachsen (laut Website teils CC BY-NC-ND). Bis zur Zustimmung nur live abfragen.
    - Nicht angebunden und ebenfalls nur mit Zustimmung: Landesamt Brandenburg, GeoPortal Saarland.
  - **Wie:** möglichst über die offiziellen Download-Angebote (Open-Data-Portale, INSPIRE-Downloaddienste, ATOM-Feeds) statt die Abfragedienste massenhaft abzufragen; Nutzungsbedingungen der Dienste prüfen. Personenbezogene Felder nicht übernehmen (z. B. Kontaktdaten der Sachbearbeitung im Dienst der Mecklenburgischen Seenplatte).
  - **Adresssuche und Karte:** Nominatim und tile.openstreetmap.org verbieten Massenabrufe. Stattdessen eigene Adresssuche und eigene Kacheln aus einem OpenStreetMap-Auszug (ODbL: Namensnennung, eine veröffentlichte bearbeitete Datenbank wieder unter ODbL) oder ein Vertragsanbieter.
  - **Umfang:** Speicherbedarf und Abgleich je Dienst schätzen; für ganz Deutschland eher Datenbank mit räumlichem Index (z. B. PostGIS) als statische Dateien.
- [ ] Eigenes Hosting mit Vertrag (GitHub Pages ist laut GitHub nicht für kommerzielle Angebote gedacht), Server in der EU
- [ ] Eigene Adresssuche und eigener Kartendienst oder ein kommerzieller Anbieter statt Nominatim und tile.openstreetmap.org
- [ ] Geodienste überwachen und zwischenspeichern; Ausfälle früh erkennen (wie der Zertifikatsfehler in Köln am 18.11.), Statusseite
- [ ] Sicherheit: Abhängigkeiten aktuell halten, Schlüssel und Passwörter nur über Umgebungsvariablen (die `.gitignore` schließt `.env*`, Zertifikate und lokale Einstellungen bereits aus), Begrenzung der Anfragen je Nutzer
- [ ] Fehler- und Nutzungsstatistik ohne personenbezogene Daten; Lasttest mit realistischer Nutzerzahl

## 5. Funktionen für zahlende Kundschaft

- [ ] Konten, Anmeldung, Abo oder Lizenzmodell, Rechnungen
- [ ] Grundstücksanalyse mit eigenen Grundstücksgrenzen (Stufen 1 bis 3, beschrieben in [TODO.md](TODO.md) unter „Nach den 4 Tagen“)
- [ ] Auskunft als PDF exportieren (mit Quelle und Stand), Projekte und Adressen speichern
- [ ] Mehr B-Plan- und Denkmaldienste, Satzungen, Flächennutzungspläne
- [ ] Optional KI-Funktionen (freie Fragen verstehen, verwandte Paragraphen vorschlagen), klar gekennzeichnet; der Gesetzestext kommt weiter nur aus der Bibliothek

## 6. Markt

- [ ] Zielgruppen befragen (Architektur- und Ingenieurbüros, Bauämter, Bauträger, private Bauherren) und Preise testen
- [ ] Testkundschaft gewinnen, Rückmeldungen sammeln
- [ ] Vergleichbare Angebote ansehen und den Unterschied klar benennen (amtlicher Wortlaut, Ortsauskunft, feste Regeln statt KI-Antworten)
