// Die Gesetze für scripts/import-landesrecht-d.mjs: Quelle, Ausschnitt der Seiten, Erkennen von Beginn, Anlagen und
// Fußnoten, Kopfangaben. Alle Kopfangaben (Titel, Stand) werden gegen den Vorspann des PDF geprüft – steht der Satz
// dort nicht (mehr), bricht der Import ab, statt einen veralteten Stand anzuzeigen.

const ersterTeil = (z) => z.teile.find((t) => t.t.trim());
const ws = (s) => s.replace(/\s+/g, " ").trim();

/** Prüft, dass der Vorspann jeden der Sätze enthält (Leerraum vereinheitlicht). */
function vorspannMuss(vorspann, ...saetze) {
  const v = ws(vorspann);
  for (const s of saetze) if (!v.includes(ws(s))) throw new Error(`Vorspann des PDF enthält nicht (mehr): „${s}“ – Stand prüfen.`);
}

// Auffälligkeiten einer Lesefassung (nur Protokoll): Bindestrich + Leerzeichen mitten in der Zeile vor einem
// kleingeschriebenen Wort, das kein Bindewort ist („Brutto- Grundflächen“, „brenn- baren“) – Reste einer früheren
// Silbentrennung in der Vorlage. Übernommen wird der Text so, wie er gedruckt ist.
function bindestrichLuecken(zeilen) {
  const out = [];
  for (const z of zeilen) {
    const t = z.teile.filter((x) => !x.hoch).map((x) => x.t).join("");
    for (const m of t.matchAll(/(\S*\p{L})- (\p{L}\S*)/gu)) {
      if (/^(und|oder|bzw\.?|sowie|als|noch|bis|wie)$/.test(m[2].replace(/[,.;:]$/, ""))) continue;
      if (m.index + m[0].length >= t.trimEnd().length) continue; // Zeilenende: siehe Abschnitt D
      out.push(`S. ${z.seite}: „${m[0]}“`);
    }
  }
  return out;
}

export const GESETZE = [
  {
    id: "lbo-bw",
    kurz: "LBO BW",
    land: "Baden-Württemberg",
    typ: "bauordnung",
    pdfUrl: "https://www.landtag-bw.de/files/live/sites/LTBW/files/dokumente/gesetzblaetter/2026/GBl2026044.pdf",
    datei: "GBl2026044.pdf",
    quelleName: "Gesetzblatt für Baden-Württemberg 2026 Nr. 44 vom 15. April 2026 (amtlich; PDF über den Landtag von Baden-Württemberg, Verzeichnis: www.baden-wuerttemberg.de/de/service/gesetze-und-verordnungen/gesetzblatt/detail/2026-44)",
    amtlich: true,
    seiten: [1, 125],
    // Kopfzeile „Gesetzblatt für Baden-Württemberg, Jahrgang 2026 …“ (y 794) und Seitenzahl „Seite n von 125“ (y 55) fallen weg
    zone: { oben: 780, unten: 65 },
    rand: 70.8, // linker Rand des Satzspiegels auf allen Seiten (Absätze, Listennummern)
    textGroesse: 12,
    zeilenabstand: 18,
    // Das Gesetzblatt ist ohne Silbentrennung gesetzt: jeder Bindestrich am Zeilenende ist ein echter Bindestrich
    trennung: "pdf",
    start: (z) => z.seite >= 7 && ws(z.text) === "ERSTER TEIL",
    // „Anhang 1“ (rechtsbündig), „(zu § 50 Absatz 1)“, Überschrift – Titel wie in mbo.json: Bezugsangabe + Überschrift
    anlage: (zeilen, i) => {
      const z = zeilen[i];
      const m = ws(z.text).match(/^Anhang (\d+)$/);
      if (!m || z.rel < 150 || !/^\(zu §/.test(ws(zeilen[i + 1]?.text ?? ""))) return null;
      return { id: `anhang-${m[1]}`, bez: `Anhang ${m[1]}`, zeilen: 3, titel: (kopf) => ws(kopf.slice(1).map((k) => k.text).join(" ")) };
    },
    kopf(vorspann) {
      vorspannMuss(
        vorspann,
        "2026 Ausgegeben Stuttgart, Mittwoch, 15. April 2026 Nr. 44",
        "Bekanntmachung der Neufassung der Landesbauordnung für Baden-Württemberg",
        "Vom 16. März 2026",
        "15. Artikel 5 des Gesetzes vom 10. Februar 2026 (GBl. 2026 Nr. 15) ergebenden Fassung bekannt gemacht.",
        "Landesbauordnung für Baden-Württemberg (LBO)",
        "In der Fassung vom 16. März 2026",
      );
      return {
        titel: "Landesbauordnung für Baden-Württemberg",
        stand: "Neufassung vom 16. März 2026 (GBl. 2026 Nr. 44); eingearbeitet bis Artikel 5 des Gesetzes vom 10. Februar 2026 (GBl. 2026 Nr. 15)",
        ausfertigung: "In der Fassung vom 16. März 2026",
        fassung: "Bekanntmachung der Neufassung vom 16. März 2026, Gesetzblatt 2026 Nr. 44 vom 15. April 2026",
      };
    },
  },
  {
    id: "hbo",
    kurz: "HBO",
    land: "Hessen",
    typ: "bauordnung",
    pdfUrl: "https://wirtschaft.hessen.de/sites/wirtschaft.hessen.de/files/2025-11/hbo_broschuere_stand_oktober_2025-baupaket_i_2.pdf",
    datei: "hbo.pdf",
    quelleName: "Hessisches Ministerium für Wirtschaft, Energie, Verkehr, Wohnen und ländlichen Raum – Lesefassung „Hessische Bauordnung (HBO) 2018 mit Änderung vom Oktober 2025“ (nichtamtlich)",
    quelleHinweis:
      "Nichtamtliche Lesefassung des Ministeriums (Nachdruck nur mit Quellenangabe). Verbindlich ist allein der im Gesetz- und Verordnungsblatt für das Land Hessen verkündete Wortlaut.",
    amtlich: false,
    seiten: [1, 106], // S. 107: Impressum
    // Kopfzeile „HESSISCHE BAUORDNUNG (HBO)“ (y 821) und Seitenzahl (y 25) fallen weg; Fußnoten (y ≥ 38) bleiben
    zone: { oben: 810, unten: 32 },
    rand: 70.8, // linker Rand des Satzspiegels auf allen Seiten (gleich auf geraden und ungeraden Seiten)
    textGroesse: 10.56,
    zeilenabstand: 17,
    // Die Lesefassung ist mit Silbentrennung gesetzt – Entscheidung am Wortschatz, Grenzfälle von Hand am PDF geprüft
    trennung: "woerterbuch",
    // Wortschatz: amtlicher Wortlaut dieser bereits importierten Gesetze (feste Liste) + Zeileninneres der Lesefassung
    wortschatzAus: ["baugb", "mbo", "nbauo", "ndschg", "bauo-nrw", "baybo", "saechsbo", "bbgbo", "bremlbo", "lbo-bw"],
    bindestrichBehalten: [],
    // Ohne Beleg im Wortschatz – von Hand am PDF geprüft: gewöhnliche Silbentrennung (S. 9–105). „nicht-⏎brenn- baren“
    // (§ 44, S. 48) ergibt „nichtbrenn- baren“: der zweite Bindestrich mit Leerzeichen steht so mitten in der Zeile.
    bindestrichTrennen: [
      "Ausführungsbestim-mung", "Wind-energieanlagenteile", "Sonderge-biete", "Grundwasserver-hältnisse", "Mehrge-schossige", "nicht-brenn",
      "Gaststätten-gesetzes", "Nutzungsbe-dingte", "Ge-meinschaftsräume", "Hes-sisches", "Verwendungs-maßnahmen", "Dach-begrünungen",
      "Roll-stuhlfahrer", "Sitz-plätze", "stellvertre-tend", "Fachent-würfe", "Vor-bereitungsdienst", "Begründungs-pflicht",
      "baugenehmi-gungspflichtige", "Be-rufspraxis", "Schwie-rigkeitsgrad", "Be-schäftigung", "bin-dend", "Ty-pengenehmigungsverfahren",
      "bezoge-nen", "Gaststättenge-werbe", "Wärmedämmverbundsys-teme", "Bodenver-besserung", "Ein-griffsgenehmigungsverfahren",
      "be-zogene", "ge-trennte", "antrag-stellende", "oblie-gende",
    ],
    satznummerZeichen: 8, // „¹“, „²“, „³“ als Zeichen statt hochgestellt (§§ 50–52, 64, 83, Anlage)
    start: (z) => z.seite >= 9 && ws(z.text) === "ERSTER TEIL",
    // Fußnoten der Lesefassung: Zeile beginnt mit hochgestelltem Zeichen („*“, „1“) und danach einem Leerzeichen
    // („* (gültig bis 19.01.2027)“, „1 Hebt auf FFN-Nr. 361-108“); Satznummern stehen dagegen direkt vor dem Wort.
    fussnote: (z) => {
      const e = ersterTeil(z);
      return !!e?.hoch && /^(\*|\d+)$/.test(e.t) && /^\s/.test(z.teile[z.teile.indexOf(e) + 1]?.t ?? "");
    },
    anlage: (zeilen, i) => {
      const z = zeilen[i];
      if (ws(z.text) !== "Anlage zu § 63" || z.rel > 8 || !z.fett) return null;
      return { id: "anlage", bez: "Anlage", zeilen: 2, titel: (kopf) => ws(`${kopf[0].text.replace(/^\s*Anlage\s+/, "")} ${kopf[1].text}`) };
    },
    // In der Anlage beginnt ein neuer Absatz mit „I“, „1“, „1.1“, „1.10.1“ am linken Rand (Eintrag mit hängendem Einzug)
    anlageAbsatz: (z, anfang, naechste) => {
      const RE = /^(?:[IVX]+|\d+(?:\.\d+)*)\s/;
      if (z.rel > 8 || !RE.test(anfang)) return false;
      return z.fett || !naechste || naechste.seite !== z.seite || naechste.rel > 20 || RE.test(ws(naechste.text));
    },
    auffaelligkeiten: bindestrichLuecken,
    // Von Hand am PDF geprüfte Besonderheiten der Lesefassung. Der Wortlaut bleibt unverändert; die App sagt es dazu.
    hinweise: {
      33: `Hinweis der App: In dieser Lesefassung steht in Absatz 2 zu Beginn von Seite 34 die Nummer „2.“ vor „wände an oder mit einem Abstand …“, also mitten im Wort „Abschlusswände“ der Nummer 1 (Seitenwechsel). Die folgenden Punkte tragen deshalb die Nummern 3. bis 5.; nach dem Aufbau (vgl. „Abs. 2 Nr. 1 bis 3“ in Absatz 3 und § 30 Abs. 2 MBO) dürften es die Nummern 2 bis 4 sein. Angezeigt wird unverändert die Lesefassung; maßgeblich ist der im GVBl. verkündete Wortlaut.`,
      15: "Hinweis der App: Im Inhaltsverzeichnis der Lesefassung lautet die Überschrift „Wärmeschutz, Schall-, Erschütterungsschutz“; angezeigt wird die Überschrift im Text.",
      46: "Hinweis der App: Im Inhaltsverzeichnis der Lesefassung lautet die Überschrift „Sanitäre Anlagen, Gästetoilettenanlagen in Gaststätten“; angezeigt wird die Überschrift im Text.",
      47: "Hinweis der App: Im Inhaltsverzeichnis der Lesefassung lautet die Überschrift „Kleinkläranlagen, Gruben“; angezeigt wird die Überschrift im Text.",
      "64a": "Hinweis der App: Die Überschrift lautet in der Lesefassung so („Erweitere …“); im Inhaltsverzeichnis steht „Erweiterte Genehmigungsfreistellung für die Errichtung von Wohngebäuden“.",
    },
    kopf(vorspann) {
      vorspannMuss(
        vorspann,
        "HESSISCHE BAUORDNUNG (HBO) 2018 mit Änderung vom Oktober 2025",
        "Nachdruck – auch auszugsweise – ist nur mit Quellenangabe gestattet.",
        "Hessische Bauordnung vom 28. Mai 2018 (GVBl. S. 198), zuletzt geändert durch Gesetz vom 14. Mai 2025 (GVBl. 2025 Nr. 29)",
        "Die vorliegende Lesefassung der HBO enthält die Änderungen durch das Dritte Gesetz zur Änderung der Hessischen Bauordnung (GVBl. 2025 Nr. 66), die am 14. Oktober 2025 in Kraft getreten sind.",
      );
      return {
        titel: "Hessische Bauordnung",
        stand:
          // ohne „vom <Tag>. <Monat> <Jahr>“, damit standDatum() (lib/text.ts) den 14.10.2025 anzeigt und nicht das im Kopf genannte Mai-Gesetz
          "Nichtamtliche Lesefassung, Stand Oktober 2025, mit den Änderungen durch das Dritte Gesetz zur Änderung der Hessischen Bauordnung (GVBl. 2025 Nr. 66, in Kraft seit 14.10.2025); der Kopf der Lesefassung nennt als letzte Änderung noch das Gesetz aus GVBl. 2025 Nr. 29 (Mai 2025)",
        gueltigAb: "2025-10-14",
        ausfertigung: "vom 28. Mai 2018 (GVBl. S. 198)",
        fassung: "Lesefassung „HBO 2018 mit Änderung vom Oktober 2025“ (PDF vom 6. November 2025)",
      };
    },
  },
  {
    id: "hbauo",
    kurz: "HBauO",
    land: "Hamburg",
    typ: "bauordnung",
    pdfUrl: "https://dokumente.hamburg.de/resource/blob/1231192/f72fd5750a37f10791dd5c89bd239fc3/2026-09-09-gesamtsynopse-hbauo-2005-hbauo-2025-mit-bauturbo-farbig-data.pdf",
    datei: "synopse.pdf",
    quelleName:
      "Freie und Hansestadt Hamburg, Behörde für Stadtentwicklung und Wohnen – Gesamtsynopse HBauO 2005 – HBauO 2025, rechte Spalte „HBauO neu (ab 01.01.2026)“ (nichtamtliche Lesefassung)",
    quelleHinweis:
      "Nichtamtliche Lesefassung: rechte Spalte der Gesamtsynopse (Stand 26.09.2026, mit Bauturbo-Änderung, Stand 09.09.2026). Die hochgestellten Satznummern hat die Behörde zur Orientierung ergänzt; sie sind nicht Bestandteil der amtlichen Fassung. Verbindlich ist allein der im Hamburgischen Gesetz- und Verordnungsblatt verkündete Wortlaut.",
    amtlich: false,
    seiten: [12, 179], // S. 1–11: Erläuterung, Inhaltsverzeichnis, synoptische Übersicht
    // Querformat 842 × 595 pt. Rechte Spalte: Textstücke ab x = 410 (die linke Spalte „HBauO aktuell“ endet davor);
    // Kopfzeilen „Gesamtsynopse …“/„Nichtamtliche Lesefassung“ (y ≥ 536) und Seitenzahl (y 38) fallen weg
    zone: { links: 410, oben: 525, unten: 45 },
    spalteText: "rechte Spalte „HBauO neu (ab 01.01.2026)“: Textstücke mit Anfang ab x = 410 pt",
    rand: 417.3, // linker Rand der rechten Spalte
    textGroesse: 11.04,
    zeilenabstand: 13.4,
    // Listen ohne hängenden Einzug: Folgezeilen eines Punkts stehen bündig mit der Listenmarke
    haengenderEinzug: false,
    // Die Synopse ist ohne Silbentrennung gesetzt
    trennung: "pdf",
    satznummerZeichen: 1, // „²Dies gilt …“ (§ 46a) als Zeichen statt hochgestellt
    inhaltsverzeichnis: false,
    kopfSeiten: [1, 1],
    start: (z) => z.fett && ws(z.text) === "Erster Teil",
    // Tabellenkopf, der auf jeder Seite und vor jeder Vorschrift wiederholt wird
    ueberspringen: (z) => ws(z.text) === "HBauO neu (ab 01.01.2026)",
    // „§ 2 Begriffe“ in einer Zeile, fett – oder (geänderte Vorschriften, z. B. § 30, § 60, § 62) normal gesetzt, aber
    // mittig (mehr als 40 pt eingerückt; Fließtext und Listen beginnen höchstens 31 pt vom Spaltenrand).
    // Weitere fette Zeilen gehören zur Überschrift.
    paragraphKopf: (z) => {
      const m = ws(z.text).match(/^§\s*(\d+[a-z]?)\s+\S/);
      return m && (z.fett || z.rel > 40) ? { nr: m[1] } : null;
    },
    // Anmerkungen der Synopse in eckigen Klammern („[jetzt in § 43 Absatz 1]“, „[siehe Satz 2]“) sind kein Gesetzestext
    anmerkung: (z) => /^\[.*\]$/.test(ws(z.text)),
    titelZeile: (z) => z.fett,
    // „Anlage“ (fett, rechtsbündig), darunter „Verfahrensfreie Vorhaben nach § 61“ – in der Synopse direkt nach § 61
    anlage: (zeilen, i) => {
      const z = zeilen[i];
      if (!z.fett || ws(z.text) !== "Anlage" || !zeilen[i + 1]?.fett) return null;
      return { id: "anlage", bez: "Anlage", zeilen: 2, titel: (kopf) => ws(kopf[1].text) };
    },
    // In der Anlage: mittig gesetzte Zeilen („Inhaltsübersicht“, „I“, „Errichtung und Änderungen von Anlagen“) und die
    // Zeile danach beginnen je einen eigenen Absatz
    anlageAbsatz: (z, anfang, naechste, vorige) => z.rel > 60 || (!!vorige && vorige.rel > 60),
    kopf(vorspann) {
      vorspannMuss(
        vorspann,
        "Nichtamtliche Lesefassung",
        "Stand: 26.09.2026",
        "Gesamtsynopse HBauO 2005 – HBauO 2025 neu (ab 01.01.2026)",
        "(Stand 09.09.2026 incl. Bauturbo-Änderung)",
        "denen der ab 01.01.2026 gültigen Fassung der HBauO (rechte Spalte)",
        "Die Nummerierung der Sätze durch hochgestellte Zahlen wurde zur besseren Übersicht und Orientierung hinzugefügt und ist nicht Bestandteil der",
      );
      return {
        // Die Synopse nennt nur das Kürzel HBauO; der Titel des Gesetzes ist „Hamburgische Bauordnung“
        titel: "Hamburgische Bauordnung",
        stand: "Nichtamtliche Lesefassung (Gesamtsynopse der Behörde für Stadtentwicklung und Wohnen, rechte Spalte), Stand 26.09.2026: HBauO 2025 in der ab 01.01.2026 gültigen Fassung einschließlich Bauturbo-Änderung (Stand 09.09.2026)",
        gueltigAb: "2026-01-01",
        fassung: "Gesamtsynopse HBauO 2005 – HBauO 2025, Stand 26.09.2026 (PDF vom 13. Oktober 2026), rechte Spalte",
      };
    },
  },
];
