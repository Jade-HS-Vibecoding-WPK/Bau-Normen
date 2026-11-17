# Gegenstücke: welche Vorschrift regelt welches Thema – je Landesgesetz

Für jedes Landesgesetz (Bauordnung, Denkmalschutzgesetz) gibt es eine Datei `data/gegenstuecke/<gesetz-id>.json`.
Sie ordnet festen Themen die Vorschriften dieses Gesetzes zu. Daraus entstehen das Stichwortverzeichnis
und die Einordnung der Ortsauskunft für jedes Land.

**Regel:** Jede Zuordnung ist am Titel und, wo der Titel nicht eindeutig ist, am Wortlaut der Vorschrift geprüft –
nicht geraten und nicht aus einer anderen Bauordnung übertragen. Was es im Gesetz nicht gibt, fehlt (kein leeres Array).

```json
{
  "gesetz": "baybo",
  "themen": { "abstandsflaechen": ["6"], "verfahrensfrei": ["57"] },
  "schutzOhneEintragung": null,
  "belege": { "schutzOhneEintragung": { "norm": "…", "satz": "wörtlicher Satz aus dem Gesetz" } },
  "hinweise": ["optional: Besonderheiten, z. B. 'verfahrensfreie Vorhaben stehen in Art. 57 selbst, kein Anhang'"]
}
```

## Themen der Bauordnungen

| Thema | Inhalt (Gegenstück in der Musterbauordnung) |
|---|---|
| `begriffe` | Begriffe, Gebäudeklassen (MBO § 2) |
| `abstandsflaechen` | Abstandsflächen / Grenzabstände (MBO § 6) |
| `nicht-ueberbaute-flaechen` | nicht überbaute Flächen, Kinderspielplätze (MBO § 8) |
| `werbeanlagen` | Werbeanlagen (MBO § 10) |
| `brandwaende` | Brandwände (MBO § 30) |
| `rettungswege` | Rettungswege (MBO § 33) |
| `stellplaetze` | Stellplätze, Garagen, Fahrradabstellplätze (MBO § 49) |
| `barrierefrei` | barrierefreies Bauen (MBO § 50) |
| `sonderbauten` | Sonderbauten (MBO § 51) |
| `bauherr` | Bauherr (MBO § 53) |
| `entwurfsverfasser` | Entwurfsverfasser (MBO § 54) |
| `bauvorlageberechtigung` | Bauvorlageberechtigung (MBO § 65) |
| `genehmigungspflicht` | Grundsatz der Genehmigungspflicht / Genehmigungsvorbehalt (MBO § 59) |
| `verfahrensfrei` | verfahrensfreie Bauvorhaben (MBO § 61) – auch ein Anhang/eine Anlage mit der Liste |
| `genehmigungsfreistellung` | Genehmigungsfreistellung / genehmigungsfreie Vorhaben (MBO § 62) |
| `vereinfachtes-verfahren` | vereinfachtes Baugenehmigungsverfahren (MBO § 63) |
| `baugenehmigungsverfahren` | Baugenehmigungsverfahren (MBO § 64) |
| `abweichungen` | Abweichungen (MBO § 67) |
| `bauantrag` | Bauantrag, Bauvorlagen (MBO § 68) |
| `baugenehmigung` | Baugenehmigung, Baubeginn (MBO § 72) |
| `vorbescheid` | Vorbescheid / Bauvoranfrage (MBO § 75) |
| `baulasten` | Baulasten, Baulastenverzeichnis (MBO § 83) |
| `oertliche-bauvorschriften` | örtliche Bauvorschriften (MBO § 86) |

## Themen der Denkmalschutzgesetze

| Thema | Inhalt |
|---|---|
| `begriffe` | Begriff des Kulturdenkmals / Begriffsbestimmungen (Baudenkmal, Bodendenkmal, Gruppe/Ensemble) |
| `eintragung` | Denkmalliste / Denkmalverzeichnis / Eintragung |
| `erhaltungspflicht` | Erhaltungs- und Instandhaltungspflicht |
| `genehmigungspflicht` | Genehmigung/Erlaubnis für Maßnahmen an Kulturdenkmalen |
| `umgebungsschutz` | Maßnahmen in der Umgebung eines Denkmals |
| `erdarbeiten` | Nachforschungen, Grabungen, Erdarbeiten (Genehmigungspflicht) |
| `bodenfunde` | Funde, Anzeigepflicht |
| `behoerden` | Denkmalschutzbehörden, Zuständigkeit |

`schutzOhneEintragung`: `true`, wenn das Gesetz ausdrücklich sagt, dass der Schutz nicht von der Eintragung abhängt
(nachrichtliches System); `false`, wenn der Schutz erst mit der Eintragung entsteht (konstitutives System); sonst `null`.
Immer mit wörtlichem Beleg (Vorschrift und Satz) in `belege`.
