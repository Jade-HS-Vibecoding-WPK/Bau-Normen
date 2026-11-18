# Quellen-Recherche: fehlendes Landesrecht, Bebauungspläne, Denkmale (18.11.2026)

Ergebnis einer Recherche mit Stichproben-Gegenprüfung (Erreichbarkeit, CORS, Lizenztext). **Keine Rechtsberatung.** Vor
einer kommerziellen Nutzung rechtlich prüfen lassen und bei „unklar“ schriftlich beim Anbieter nachfragen.

Einordnung: **Produkt** = offene Lizenz bzw. amtliches Werk, auch kommerziell nutzbar (Namensnennung beachten) ·
**Forschung** = nur nicht-kommerziell / wissenschaftlich · **Erlaubnis** = nur mit Zustimmung des Anbieters ·
**unklar** = keine oder widersprüchliche Angaben.

## Rechtsrahmen (Kurzfassung)

- **Gesetzestext** ist gemeinfrei (§ 5 Abs. 1 UrhG). Lesefassungen und Synopsen der Ministerien sind amtliche Werke nach
  § 5 Abs. 2 UrhG: nutzbar mit Quellenangabe, ohne Änderungen am Text.
- **juris-Portale** der 10 Länder: robots.txt `Disallow: /` und HTTP-Kopf `tdm-reservation: 1` (geprüft) = wirksamer
  maschinenlesbarer Vorbehalt nach § 44b UrhG; dazu Datenbankherstellerrecht (§§ 87a ff. UrhG) und Nutzungsbedingungen
  („Jegliche Nutzung für kommerzielle Zwecke bedarf der vorherigen Zustimmung“). Ob § 5 auch das Datenbankrecht verdrängt,
  ist höchstrichterlich offen.
- **§ 60d UrhG** (Text- und Data-Mining für wissenschaftliche Forschung) gilt trotz Vorbehalt, aber nur nicht-kommerziell und
  nur für einen abgegrenzten Personenkreis; **eine öffentliche Website oder ein öffentliches Repository deckt er nicht**.
- **Geodaten:** dl-de/by-2.0, dl-de/zero-2.0, CC BY 4.0, CC0 → Produkt (mit Quellenvermerk). CC BY-SA → Weitergabe
  abgeleiteter Daten unter gleicher Lizenz. CC BY-ND → keine veränderten Fassungen weitergeben. NC → nicht kommerziell.
  Keine Lizenzangabe → kein Nutzungsrecht eingeräumt, nachfragen.
- NRW: Denkmallisten-Verordnung (GV. NRW. 2015 S. 430, § 5 Abs. 1) erlaubt die Nutzung nur mit Zustimmung der Behörde; eine offene
  Lizenz der Stadt gilt als diese Zustimmung.

## Landesrecht der 10 juris-Länder

| Land | Bauordnung | Denkmalschutzgesetz | Einordnung |
|---|---|---|---|
| BW | Neubekanntmachung GBl. 2026 Nr. 44 vom 16.03.2026 (https://www.baden-wuerttemberg.de/de/service/gesetze-und-verordnungen/gesetzblatt/detail/2026-44) | selbst konsolidieren aus den Gesetzblättern (Landtagsarchiv, Scans) | Produkt |
| BE | Synopse der Senatsverwaltung, vollständig (https://www.berlin.de/sen/stadt/_assets/service/rechtsvorschriften/bereich-bauen/synopseaendbauobln_durchgeb.pdf); Art. 5 erst ab 20.01.2027 | Stammfassung 1995 online nicht gefunden | BauO: Produkt · DSchG: nur über juris → Erlaubnis |
| HH | Gesamtsynopse der Stadtentwicklungsbehörde, Stand 26.09.2026 (dokumente.hamburg.de) | aus dem HmbGVBl konsolidieren | Produkt (HmbGVBl unter dl-de/by-2.0) |
| HE | Lesefassung Wirtschaftsministerium Okt. 2025 („Nachdruck nur mit Quellenangabe“) | Synopse Wissenschaftsministerium, Stand 31.08.2026 | Produkt |
| MV | aus GVOBl. M-V konsolidieren (Landesseiten derzeit umgestellt; Landtags-ParlDok) | wie Bauordnung | Produkt (Quelle instabil) |
| RP | Gesetzblatt online erst ab 2004, Stammfassung 1998 fehlt | Stammfassung 1978 fehlt | Teile Produkt; vollständig nur juris → Erlaubnis |
| SL | Amtsblatt läuft bei juris (Datenbankschutz, TDM-Vorbehalt; „nicht gewerbliche Vervielfältigung zum … wissenschaftlichen Gebrauch“ ausgenommen) | wie Bauordnung | Forschung; Produkt mit Erlaubnis der Staatskanzlei |
| ST | nur juris („privater und sonstiger nicht-kommerzieller Gebrauch“; kommerziell mit Zustimmung der juris GmbH) | wie Bauordnung | Forschung (manuell); Produkt mit Erlaubnis |
| SH | Verkündungsportal (amtlich seit 2025) + Archiv, konsolidieren | wie Bauordnung | Produkt |
| TH | Neuerlass ThürBO 2024 im GVBl (Landtags-ParlDok) | konsolidieren | Produkt |

Ansprechpartner für Erlaubnisse: juris (service@juris.de) bzw. die im Impressum genannte Behörde (z. B. Saarland:
Staatskanzlei, amtsblatt@staatskanzlei.saarland.de). NeuRIS (Bund) enthält derzeit kein Landesrecht.

**Umgesetzt (18.11.2026, `scripts/import-landesrecht-d.mjs`):**

- **LBO BW:** Gesetzblatt 2026 Nr. 44, amtlich. 99 Vorschriften, gegen die zweite PDF-Auslesung ohne Reparatur identisch.
- **HBO:** Lesefassung, nichtamtlich, Quelle wird genannt. 97 Vorschriften. Auffälligkeiten der Vorlage stehen als Hinweis an der Vorschrift, z. B. die falsche Listennummer in § 33 Abs. 2.
- **HBauO:** Gesamtsynopse, nur die rechte Spalte, nichtamtlich. 97 Einträge. Die Satznummern hat die Behörde ergänzt; die App weist darauf hin.

**Übersprungen:**

- **HDSchG:** Die rechte Spalte der Synopse enthält noch Streichungen, Einfügungen und den Platzhalter „Änderungsgesetz … vom (….)“.
- **BauO Bln:** Die Spalten liegen nur 1 bis 4 pt auseinander. Zudem wären zwei Blöcke mit der Fassung ab 20.01.2027 auszuschneiden, und die Synopse nennt sich „unverbindliche Arbeitshilfe“.
- **ThürBO:** Das GVBl-Heft 2024 wurde in ParlDok nicht gefunden. Laut umwelt-online kam eine Änderung vom 06.07.2026 hinzu.

## Bebauungspläne: neue Dienste (Stichproben geprüft: HTTP 200, CORS, Treffer)

| Gebiet | Dienst | Pläne | Lizenz | Einordnung |
|---|---|---|---|---|
| NI LK Osterholz | https://gis.landkreis-osterholz.de/arcgis/rest/services/www/BPlanWWW/MapServer/0 | 1.182 | dl-de/by-2.0 | Produkt |
| NI LK Rotenburg (Wümme) | https://gis.lk-row.de/server/rest/services/Geoportal_BPlaene_LKROW_WFS/MapServer/8 (ohne Geometrie!) | 2.334 | dl-de/zero-2.0 | Produkt |
| NI LK Stade (ohne Hansestadt Stade, Buxtehude) | https://services1.arcgis.com/gj4UKoDigJC9AuBF/arcgis/rest/services/Bebauungsplaene/FeatureServer/0 | 1.999 | dl-de/by-2.0 | Produkt |
| NI LK Nienburg | https://geoportal.lk-ni.de/server/rest/services/opengov/BPlaene_sonstigePlaene/MapServer/68 | 1.163 | dl-de/zero-2.0 | Produkt |
| NI LK Diepholz | https://geo.diepholz.de/arcgis/rest/services/Download/Planauskunft_Download_AGO/MapServer/1 | 2.186 | dl-de/by-2.0 | Produkt |
| NI LK Harburg | https://gis.itk-harburg.de/arcgis/rest/services/WMS/LKHarburg_Bebauungsplan/MapServer/0 (CORS-Kopf falsch geschrieben → nur über den Server) | 2.321 | dl-de/zero-2.0 | Produkt |
| NI LK Hameln-Pyrmont (ohne Stadt Hameln) | https://gis.hameln-pyrmont.de/arcgis/rest/services/public/Planauskunft2021/MapServer/2 | 1.218 | CC BY-SA 4.0 | Produkt (Share-Alike) |
| NI Stadt Göttingen | https://geoportal.goettingen.de/arcgis/rest/services/Inspire/Inspire_Internet/MapServer/0 | 640 | dl-de/by-2.0 | Produkt |
| NI Stadt Hildesheim | https://services.gdi.stadt-hildesheim.de/ows/services/org.2.75925358-79cc-4fa7-81de-bc9f0adcda9f_wfs | 562 | dl-de/by-2.0 | Produkt |
| NI Langenhagen (+ weitere KDO-Gemeinden über inspire.govconnect.de) | https://inspire.govconnect.de/ows/services/org.52.b60f142d-fffa-4f86-9270-9e83e35ee1f5_wfs | 375 | CC BY 4.0 | Produkt |
| NI Stadt Osnabrück | https://geo.osnabrueck.de/arcgis/rest/services/Bebauungsplaene/MapServer/0 | 503 | dl-de/by-2.0, Metadaten zugleich „Lesen für Infozwecke“ | Produkt, Widerspruch klären |
| NI Stadt Hameln | https://inspire.hameln.de/map/lu_bebauungsplan | 545 | „keine Bedingungen“ / „conditions unknown“ | unklar |
| NI LK Cuxhaven | https://cuxland-gis.landkreis-cuxhaven.de/wms/extern/bebauungsplaene (kein CORS) | ~2.620 | „copyright“, keine Lizenz | unklar |
| HE Südhessen-Plattform (Hochtaunus, Wetterau, Bergstraße, Groß-Gerau, Rheingau-Taunus, Limburg-Weilburg, Odenwald, Hanau, Rüsselsheim u. a.) | https://www.gdi-inspireumsetzer.de/ows/services/<org-id>_wfs, Typ ft1:Planung | je 87 bis 1.607 | dl-de/by-2.0 | Produkt |
| HE LK Fulda | https://www.geoportal.hessen.de/spatial-objects/932/collections/BPLKFD:BP_LKFD/items | 2.872 | CC0 | Produkt |
| HE Regionalverband FrankfurtRheinMain (13 Kommunen) | WMS mapservice.region-frankfurt.de | keine Angabe | „nur für nicht kommerzielle Zwecke“ | Forschung |
| BW Stadt Freiburg | https://geoportal.freiburg.de/wfs/stpla_bplan/wfs_mapfile/geltungsbereiche | 667 | dl-de/by-2.0 | Produkt |
| NRW Stadt Münster | https://geo.stadt-muenster.de/mapserv/bplan_serv (ms:bplan2, BBOX in EPSG:25832) | 686 | dl-de/by-2.0 (Open.NRW) | Produkt |
| NRW Stadt Duisburg | https://geoportal.duisburg.de/arcgisserver/rest/services/OpenData/OpenData/MapServer/146 | 667 | CC BY 3.0 DE | Produkt |
| SH Kreis Nordfriesland | https://gis.nordfriesland.de/arcgis/rest/services/WMS_NF/Bauleitplanung_NF/MapServer/2 | 3.211 | „© Kreis Nordfriesland“ | unklar |
| SL INSPIRE je Gemeinde (ohne Saarbrücken) | geoportal.saarland.de/spatial-objects/… | keine Angabe | „unterliegen dem Urheberrecht“ | Erlaubnis |

Nichts Offenes gefunden: Hannover, Wolfsburg, Wiesbaden, Kassel, Darmstadt, Offenbach, Bonn (Dienst nicht erreichbar),
Düsseldorf, Mainz, Ludwigshafen, Kaiserslautern, Saarbrücken, Kiel, Lübeck sowie viele NI-Landkreise (u. a. Emsland,
Lüneburg, Verden, Wesermarsch, LK Oldenburg). Hinweis zum Einbau: Viele Dienste enthalten auch Pläne in Aufstellung,
Satzungen oder F-Pläne, deshalb nach Status/Art filtern; keiner erklärt sich ausdrücklich für vollständig.

## Denkmale: neue Dienste (Stichproben geprüft)

| Gebiet | Dienst | Lizenz | Einordnung |
|---|---|---|---|
| MV LK Ludwigslust-Parchim | https://geoportal.kreis-lup.de/ows/masterportal/denkmalpflege-lup (WFS) | dl-de/by-2.0 | Produkt |
| MV Mecklenburgische Seenplatte (ohne Neubrandenburg) | https://geoport-lk-mse.de/webservices/wfs/mp_baudenkmale (BBOX nur EPSG:25833; enthält Kontaktdaten der Sachbearbeitung, diese nicht anzeigen) | CC BY 4.0 | Produkt |
| MV Vorpommern-Rügen (ohne Stralsund, ohne Adressen) | https://geodienste.lk-vr.de/ows/denkmale/baudenkmale (BBOX nur EPSG:25833) | dl-de/by-2.0 (Metadaten) | Produkt |
| MV LK Rostock | https://geoportal.lkros.de/dienste/baudenkmale | dl-de/by-2.0, aber Zusatz „dienen ausschließlich Informationszwecken“ | Produkt, Zusatz klären |
| TH landesweit (aus ALKIS abgeleitet, Namen oft leer) | https://www.geoproxy.geoportal-th.de/geoproxy/services/INSPIREps (PS.ProtectedSite) | CC BY 4.0 | Produkt (fachlich dünn) |
| BB Frankfurt (Oder) | https://geoportal.frankfurt-oder.de/wss/service/WMS_Denkmaeler/guest | dl-de/by-2.0 | Produkt |
| HB Grabungsschutzgebiete | https://geodienste.bremen.de/wms_grabungsschutzgebiete | CC BY | Produkt |
| BB BLDAM Bodendenkmale | https://gis-bldam-brandenburg.de/ows/bodendenkmale (kein CORS) | Metadaten dl-de/by-2.0, Nutzungshinweise: Veröffentlichung nur mit schriftlicher Zustimmung | unklar → schriftlich klären |
| BB BLDAM Baudenkmale | https://gis-bldam-brandenburg.de/ows/baudenkmale | Namensnennung, Nutzungshinweise wie oben | Erlaubnis |
| BB Denkmalliste (PDF, mit Adressen) | bldam-brandenburg.de, 18 Teillisten Stand 1.1.2026 | Impressum: „nur für den privaten Gebrauch“; Liste auch nachrichtlich im Amtsblatt | unklar |
| TH Erfurt Denkmalliste (PDF) | erfurt.de | keine Angabe | unklar |
| SH archäologische Interessengebiete, HB Bodendenkmäler, SN archäologische Denkmale | keine Angabe | schriftliche Einwilligung / Rücksprache / „restricted“ | Erlaubnis |

Nichts gefunden: Landesamt Thüringen (TLDA), Weimar, Gera, Jena (nur Gedenkstätten); MV: Nordwestmecklenburg,
Vorpommern-Greifswald, Stralsund, Wismar, Neubrandenburg; Potsdam, Cottbus. Hessen (DenkXweb) weiterhin nicht
landesweit erfasst (Stand 10/2026).

## Bereits angebundene Dienste mit Klärungsbedarf

Keine Lizenzangabe: München, Stuttgart („otherRestrictions“), Nürnberg („© Stadt Nürnberg“), Landkreise Leer und Aurich,
Sachsen-Anhalt (XPlanung-Plattform, LDA-Denkmale), Sachsen LfD-Denkmalkarte. Alle übrigen angebundenen Dienste sind offen
lizenziert (u. a. Oldenburg dl-de/zero, Denkmalatlas Niedersachsen CC BY-SA 4.0, Schwerin dl-de/by-2.0).
Für ein Produkt außerdem: Adresssuche (Nominatim) und Kartenkacheln von OpenStreetMap haben Nutzungsrichtlinien gegen
starke Nutzung; eigener Dienst oder Anbieter nötig.
