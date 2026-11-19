# Prüfhinweise für die fachliche Durchsicht der Erläuterungen

Alle Erläuterungen sind **Entwürfe** (`"status": "entwurf"`). Sie wurden Satz für Satz gegen den Gesetzestext gelesen und automatisch geprüft (`node scripts/erlaeuterungen-pruefen.mjs`: 301 Erläuterungen, 0 Fehler, 1 Warnung; die Warnung zu MBO § 62 ist ein Fehlalarm, weil das Skript Paragraphen in Verweisketten wie „§§ 68 Abs. 2 Satz 1, …, 69 Abs. 3, 72 Abs. 6“ nur teilweise erkennt). Die folgenden Stellen enthalten **Auslegungen oder Fachwissen, das nicht wörtlich im Paragraphen steht**, und sollten von einer Fachperson bestätigt werden. Nach der Prüfung den Status auf `"geprueft"` setzen.

## BauGB

| § | Stelle | Worum es geht |
|---|---|---|
| 5 Abs. 2b | Inhalt der Verweise | kurz erklärt anhand von § 35 Abs. 3 Satz 3, §§ 249, 249c |
| 6 Abs. 1 | „höhere Verwaltungsbehörde“ | allgemein umschrieben (landesrechtlich bestimmt) |
| 6 Abs. 4 | „in der Regel jedoch nur bis zu drei Monaten“ | Wortlaut ohne Deutung übernommen (mehrdeutig) |
| 7 Satz 6 | Kostenersatz | aus § 37 Abs. 3 abgeleitet („entsprechend anzuwenden“) |
| 9 Abs. 2d | befristete Regelung | gilt nur für bis 31.12.2024 eingeleitete Verfahren, Satzungsbeschluss bis 31.12.2026; **nach dem Jahreswechsel prüfen** |
| 9a, 34 | „Baunutzungsverordnung“ | als die auf § 9a beruhende Verordnung benannt (allgemein bekannt, steht nicht im Text) |
| 13a Abs. 1 | „zulässige Grundfläche“ | Begriff aus § 19 Abs. 2 BauNVO erklärt |
| 16 Abs. 2 | verkürzte Bekanntmachung | als Alternative zur vollständigen gelesen |
| 17 | „höchstens vier Jahre“ | aus Abs. 1 und 2 errechnet (2 + 1 + 1), erneuter Beschluss nach Abs. 3 erwähnt |
| 18 Abs. 3 | Frist und Beispiele | aus § 44 Abs. 4, §§ 40, 41 übernommen |
| 31 Abs. 1 | „Ermessen“ | aus dem Wort „können“ abgeleitet |
| 35 Abs. 1 | „weniger strenger Maßstab“ | aus „entgegenstehen“ (Abs. 1) vs. „beeinträchtigen“ (Abs. 2) abgeleitet |
| 35 Abs. 3 | Windenergie | Hinweis, dass Satz 3 nach § 249 Abs. 1 nicht gilt |
| 36 Abs. 1 | Vorhaben nach § 30 Abs. 1 | „kein Einvernehmen vorgesehen“ aus dem Fehlen in Satz 1 abgeleitet |
| 37a Abs. 1 | Verweis auf § 35 Abs. 5 | Anwendung der Rückbauverpflichtung nicht ausgelegt |
| div. | Fachbegriffe | „Ziele der Raumordnung“, „nachrichtliche Übernahme“, „Grundzüge der Planung“, „Benehmen/Einvernehmen“, „raumbedeutsam“, „Splittersiedlung“, „Negativattest“, „Vormerkung“, „Gesamtschuldnerin“, „Koppelungsverbot“, „Klarstellungs-/Entwicklungs-/Ergänzungssatzung“ |

## NDSchG

| § | Stelle | Worum es geht |
|---|---|---|
| 5 Abs. 2 | „Absatz 1 Satz 2 gilt entsprechend“ | als Geltung der §§ 6, 10, 11 bei vorläufiger Eintragung erklärt |
| 7 Abs. 2 Nr. 3, 4 | „zwingend verlangt“ | Unterschied zu Nr. 2 aus dem Wortlaut abgeleitet |
| 8 Satz 3 | „§ 7 gilt entsprechend“ | nur „sinngemäß“ übertragen |
| 9 Abs. 2, 17 | „kann“ | als Ermessensvorschrift erklärt |
| 10 Abs. 1 Nr. 4 | „beeinflussen“ vs. „beeinträchtigen“ | Unterscheidung aus dem Wortlaut |
| 10 Abs. 4 | „Absatz 3 gilt entsprechend“ | Versagung der Baugenehmigung bei Verstoß gegen das NDSchG |
| 14 Abs. 2 | „vier Werktage“ | ob Samstag mitzählt, offen gelassen |
| 16 Abs. 2 | Kettenverweis über § 13 Abs. 2 | nur inhaltlich beschrieben |
| 19 Abs. 4 Satz 2 | wer unterrichtet | passiv formuliert (Bezug unklar) |
| 22 Abs. 3 | Verordnung | neutral als „nähere Vorschriften“ |
| 31 Abs. 2 bis 4 | Verweise auf das NEG | Inhalt nicht erklärt; „vorzeitige Besitzeinweisung“ aus Fachwissen |
| 35 Abs. 4 | „vier Werktage“ | aus § 14 Abs. 2 ergänzt |
| div. | Fachbegriffe | „Zubehör“, „dinglich Berechtigte“, „Erbbauberechtigter“, „Nießbraucher“, „unverzüglich“, „aufschiebende Wirkung“, „Verwaltungsakt“, „Benehmen/Einvernehmen“, „übertragener Wirkungskreis“, „Fachaufsicht“, „pflichtgemäßes Ermessen“, „Einziehung“, „Schatzregal“ |


## MBO (Musterbauordnung, Erläuterungen vom 18.11.2026)

Hinweis zum Wortlaut: Einige Auffälligkeiten stehen so in der amtlichen PDF des DIBt (geprüft gegen beide PDF-Auslesungen in `data/quellen/mbo/`) und sind keine Importfehler.

| § | Stelle | Worum es geht |
|---|---|---|
| 1 Abs. 2 Nr. 7 | Regale „soweit sie nicht Teil der Gebäudekonstruktion sind oder keine Erschließungsfunktion haben“ | „oder“ wirkt logisch schief (gemeint wohl „und“); Wortlaut übernommen |
| 6 Abs. 7 | „ob diese den Anforderungen der Absätze 2 bis 6 entsprechen“ | Bezug von „diese“ unklar; neutral formuliert |
| 16c Satz 2 | „§§ 17 bis 25 Abs. 1“ | offen, ob „Abs. 1“ nur zu § 25 gehört |
| 17 Abs. 2 Nr. 1 | kein Verwendbarkeitsnachweis bei Abweichung von einer allgemein anerkannten Regel der Technik | Verhältnis zu Abs. 1 wirkt widersprüchlich; nur wiedergegeben |
| 18 Abs. 7, 21 Abs. 5, 24, 30 Abs. 5 | Platzhalter „im Land …“, Stichtag „am …“ | als im Muster offengelassen beschrieben |
| 65 Abs. 1 Satz 2 | Aufzählung mit „4.“ und „5.“ statt 1. und 2. | steht so in der Quelle; Erläuterung ohne Nummern |
| 65a Abs. 3 Satz 2 Nr. 3 | Verweis „Absatz 1 Satz 1 Nummer 1“ | Abs. 1 hat nur einen Satz; Bezug unklar |
| 65d Abs. 1 und 3 | Eintragung oder schon die Meldung | beides wiedergegeben, nicht aufgelöst |
| 66 Abs. 2 | Verweise auf „§ 65 Abs. 3 Satz 2 bis 7“ und „§ 65 Abs. 4 bis 6“ | passen nicht zum jetzigen § 65 (vermutlich ältere Fassung); unverändert |
| 66 Abs. 3 | Änderung zum 14.01.2027 nach § 87 Abs. 8 | in der Erläuterung zu § 66 nicht erwähnt |
| 70 Abs. 1 Satz 4, Abs. 6 | „Frist nach Satz 2“ (steht in Satz 3), „Öffentlichkeitsbeteiligung nach Absatz 4“ (steht in Abs. 3) | Verweise wirken verrutscht; neutral bzw. unverändert übernommen |
| 76 Abs. 2 Nr. 1 | „Grundfläche bis zu 75 m“ ohne Hochzahl | steht so in der amtlichen PDF; die Erläuterung schreibt „75 m²“ (bitte bestätigen) |
| 77 Abs. 5 | „Absatz 1 Satz 3 Halbsatz 1“ | Satz 3 hat keine erkennbaren Halbsätze |
| 84 Abs. 1 Nr. 6 | „entgegen … § 72 Abs. 6 Bauarbeiten,“ ohne Verb | als „mit Bauarbeiten beginnt“ gelesen |
| Anlage 1 | „Tragwerkslehreplanung“ | vermutlich Tippfehler im Muster; wörtlich übernommen |
| 67, 71, 72, 72a | „soll“, Ersatzvornahme, Genehmigungsfiktion (§ 42a VwVfG), Klammer als Wahl zwischen Gesetz und Verwaltungsakt | Auslegungen |
| div. | Fachbegriffe | Brutto-Grundfläche, Brutto-Rauminhalt, Fliegende Bauten, Hubrettungsfahrzeuge, Rohdecke, „erklärte Leistungen“, „öffentlich-rechtlich gesichert“, BQFG, „nicht reglementiert“, „ladungsfähige Adresse“, Ablösung, Einziehung, „materiell-rechtlich“; eckige Klammern als Varianten des Mustertexts |

## NBauO (Niedersächsische Bauordnung, Erläuterungen vom 18.11.2026)

| § | Stelle | Worum es geht |
|---|---|---|
| 1 Abs. 2 Nr. 6 | Regale „… oder keine Erschließungsfunktion haben“ | wie MBO: „oder“ wirkt schief; Wortlaut übernommen |
| 2 Abs. 5 Nr. 10 c, Nr. 20 | Reichweite der Ausnahme „familiäre Gemeinschaft“; Bezug von „erhöhter Strahlen- oder Brandgefahr“ | Zuordnung offen |
| 5 Abs. 3 Nr. 2 | „höchstens jedoch um ein Drittel“ | Bezugsgröße offen (vermutlich der Abstand) |
| 5 Abs. 8 Satz 7 | Bezug auf Satz 1 Nr. 2 statt Nr. 1 | wirkt ungewöhnlich |
| 17 Abs. 2 Nr. 1 | wie MBO § 17 | Verhältnis zu Abs. 1 wirkt widersprüchlich |
| 26 Abs. 3 Satz 3 | Reichweite von „in Gebäuden der Gebäudeklasse 5“ | Satzstellung beibehalten |
| 32a Abs. 3 Satz 2 | Schwelle „mehr als 25 Einstellplätze“ bei wesentlicher Änderung | offen |
| 39 Abs. 3 | Verweis auf „§ 35 Abs. 3 Satz 3“ | § 35 Abs. 3 hat auch in NI-VORIS nur zwei Sätze (geprüft); Ungereimtheit im Gesetz |
| 47 Abs. 6 Nr. 3 | Reichweite von „die den Bedarf an Einstellplätzen verringern“ | offen |
| 49 Abs. 1 Satz 7 und 8, Abs. 3 Satz 2 | Rundung „jede achte Wohnung“; logisch verdrehter Satz zu Baudenkmalen | nah am Wortlaut |
| 52 Abs. 2, 53 Abs. 3 bis 6 | Reichweite der Pflichten; „nicht verfahrensfrei“ und „genehmigungsbedürftig“; „ein Jahr“ und „mindestens ein Jahr“ | wörtlich übernommen |
| 60 Abs. 2 Nr. 4 b | Umschreibung der Nutzungsänderung bei Versammlungsräumen | bitte fachlich bestätigen |
| 69 Abs. 2 Satz 3 | Verlängerung um bis zu drei Wochen | Bezug auf die Frist zur Mängelbehebung offen |
| 70a | „Genehmigungsfiktion“ | Begriff nach § 42a VwVfG erklärt (steht nicht in der NBauO); Abs. 1 Satz 5 verweist auf „§ 69 Abs. 2 a Nr. 2 und Satz 3“, § 69 Abs. 2a hat keinen Satz 3 |
| 62, 68 | „Betriebsbereich“, „Achtungsabstand“ | bewusst nicht erklärt (Begriffe aus dem BImSchG) |
| 74 Abs. 4 Satz 2 | Reichweite von „soweit sie auch dem Schutz von Nachbarn dienen“ | offen |
| 81 Abs. 3 | „ein öffentliches und privates Interesse … nicht mehr besteht“ | als „weder … noch“ gelesen |
| 82 Abs. 2 Nr. 7 | „entsprechend Nummer 3“ (passend wäre Nr. 4) | vermutlich Redaktionsversehen; wörtlich übernommen |
| 85a Abs. 5 Satz 1 | doppelter Ausschluss für Abs. 2 Nr. 4 | so übernommen |
| Anhang 2.5, 4.6 a, 13.4, 14.11 | Reichweite einzelner Einschränkungen | Reihenfolge des Gesetzes beibehalten; „verfahrensfrei“ nach § 60, Praxishinweis aus § 59 Abs. 3 |
| 86 Abs. 6 bis 8 | Übergangsregeln mit vergangenen Stichtagen | in der Vergangenheit formuliert |
| div. | Inhalt verwiesener Vorschriften | z. B. § 71 Abs. 1, § 76 Abs. 2, § 3 Abs. 1, § 47 Abs. 3 kurz übertragen |
| div. | Fachbegriffe | Nutzungseinheit, Brutto-Grundfläche, Aufenthaltsraum, Sonderbau, Baulast, Grunddienstbarkeit, Überbau, Außenbereich, gewachsene Geländeoberfläche, Staffelgeschoss, fliegende Bauten, barrierefrei, Erbbaurecht, übertragener Wirkungskreis, Ersatzvornahme, Gesamtschuldner, öffentliche Last, EU-Bauproduktenverordnung |

## VOB/B (Erläuterungen vom 18.11.2026)

| § | Stelle | Worum es geht |
|---|---|---|
| 1 Abs. 2 | „gelten nacheinander“ | als Vorrang der weiter vorn genannten Vertragsbestandteile erklärt |
| 2 Abs. 3 Nr. 2 und 3 | „Auf Verlangen“ | wessen Verlangen, bleibt offen |
| 8 Abs. 1 Nr. 2 | Verweis auf § 649 BGB | Nummerierung vor der BGB-Reform 2018 (heute § 648 BGB); Wortlaut übernommen |
| 8 Abs. 4 | Schlusssatz „innerhalb von 12 Werktagen“ | offen, ob er auch für Nr. 1 gilt |
| 13 Abs. 7 Nr. 3 Satz 2 | Voraussetzungen für den „darüber hinausgehenden Schaden“ | dem Wortlaut gefolgt |
| 16 Abs. 2 Nr. 1 | „3 v. H. über dem Basiszinssatz“ | nicht in „Prozentpunkte“ umgedeutet |
| 17 Abs. 8 Nr. 2 | Beginn der Frist „nach Ablauf von 2 Jahren“ | Text sagt es nicht |
| div. | Inhalt verwiesener VOB/B-Vorschriften kurz umschrieben | § 2 Abs. 4, § 7 Abs. 1, § 8 Abs. 3 Nr. 1, § 13 Abs. 3 |
| div. | Fachbegriffe | Abnahme, Gefahr, Verjährung und Hemmung, Einrede der Vorausklage, Bürgschaft auf erstes Anfordern, „unerlaubte Handlungen“ (§§ 823 ff. BGB) |
