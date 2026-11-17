// Testkatalog: typische Fragen aus der Baupraxis und was die App antworten MUSS.
// Aufruf (Server muss laufen):  node tests/testkatalog.mjs [http://localhost:3000]
//
// Erwartung je Antwort: [art, detail, gesetz]
//   norm:    detail = "§ 34", gesetz = "baugb"
//   treffer: detail = Paragraph, der unter den Treffern sein muss
//   ort:     detail = "bplan-status/denkmal-status" (z. B. "gefunden/keiner"), "*" = egal,
//            "gefunden+dok" = B-Plan gefunden UND Planzeichnung als PDF verlinkt
// Hinweis: Die Orts-Fälle fragen echte Dienste ab (Stadt Oldenburg, Denkmalatlas, OpenStreetMap).
const BASIS = process.argv[2] ?? "http://localhost:3000";

const FAELLE = [
  // Paragraphen
  { frage: "Ich brauche § 34 BauGB", erwartet: [["norm", "§ 34", "baugb"]] },
  { frage: "§ 34 Abs. 1 BauGB", erwartet: [["norm", "§ 34", "baugb"]] },
  { frage: "§§ 30, 34 und 35 BauGB", erwartet: [["norm", "§ 30", "baugb"], ["norm", "§ 34", "baugb"], ["norm", "§ 35", "baugb"]] },
  { frage: "paragraph 13a baugb", erwartet: [["norm", "§ 13a", "baugb"]] },
  { frage: "Zeig mir den § 1 Absatz 6 Nummer 5 BauGB", erwartet: [["norm", "§ 1", "baugb"]] },
  { frage: "35 BauGB", erwartet: [["norm", "§ 35", "baugb"]] },
  { frage: "§ 300 BauGB", erwartet: [["fehler"]] },
  { frage: "§ 20 BauGB", erwartet: [["norm", "§ 20", "baugb"]] }, // weggefallen -> trotzdem anzeigen, als (weggefallen)
  { frage: "Ich brauche Paragraph 5", erwartet: [["auswahl"]] }, // gibt es in BauGB und NDSchG -> Rückfrage
  { frage: "§ 5 NDSchG", erwartet: [["norm", "§ 5", "ndschg"]] },
  { frage: "§ 10 Denkmalschutzgesetz", erwartet: [["norm", "§ 10", "ndschg"]] },
  { frage: "Nds. DSchG § 8", erwartet: [["norm", "§ 8", "ndschg"]] },
  { frage: "§ 22a NDSchG", erwartet: [["norm", "§ 22a", "ndschg"]] },
  { frage: "§ 50 NDSchG", erwartet: [["fehler"]] },
  { frage: "§ 200 BauGB", erwartet: [["norm", "§ 200", "baugb"]] },
  { frage: "Paragraph 200", erwartet: [["norm", "§ 200", "baugb"]] }, // nur im BauGB vorhanden -> keine Rückfrage nötig

  // Musterbauordnung und VOB
  { frage: "§ 6 MBO", erwartet: [["norm", "§ 6", "mbo"]] },
  { frage: "Musterbauordnung § 61", erwartet: [["norm", "§ 61", "mbo"]] },
  { frage: "§ 5 NBauO", erwartet: [["norm", "§ 5", "nbauo"]] },
  { frage: "Niedersächsische Bauordnung § 60", erwartet: [["norm", "§ 60", "nbauo"]] },
  { frage: "§ 70a NBauO", erwartet: [["norm", "§ 70a", "nbauo"]] },
  { frage: "§ 89 NBauO", erwartet: [["fehler"]] },
  { frage: "§ 3a VOB/A", erwartet: [["norm", "§ 3a", "voba"]] },
  { frage: "§ 3a EU VOB/A", erwartet: [["norm", "§ 3a EU", "voba"]] },
  { frage: "§ 3 VOB/A-EU", erwartet: [["norm", "§ 3 EU", "voba"]] },
  { frage: "§ 2 VS", erwartet: [["norm", "§ 2 VS", "voba"]] }, // nur in der VOB/A Abschnitt 3 -> eindeutig
  { frage: "§ 13 VOB/B", erwartet: [["norm", "§ 13", "vobb"]] },
  { frage: "VOB Teil B § 12", erwartet: [["norm", "§ 12", "vobb"]] },
  { frage: "§ 4 VOB", erwartet: [["auswahl"]] }, // VOB ohne Teil -> VOB/A oder VOB/B
  { frage: "DIN 18353", erwartet: [["norm", "DIN 18353", "vobc"]] },

  // Landesrecht anderer Länder (Land der Frage: Feld "land", sonst Niedersachsen)
  { frage: "Art. 6 BayBO", erwartet: [["norm", "Art. 6", "baybo"]] },
  { frage: "Artikel 57 Bayerische Bauordnung", erwartet: [["norm", "Art. 57", "baybo"]] },
  { frage: "§ 6 Bauordnung", land: "Bayern", erwartet: [["norm", "Art. 6", "baybo"]] },
  { frage: "§ 6 Bauordnung", erwartet: [["norm", "§ 6", "nbauo"]] },
  { frage: "§ 6 BauO NRW", erwartet: [["norm", "§ 6", "bauo-nrw"]] },
  { frage: "§ 10 SächsDSchG", erwartet: [["norm", "§ 10", "saechsdschg"]] },
  { frage: "§ 3 BremDSchG", erwartet: [["norm", "§ 3", "bremdschg"]] },
  { frage: "§ 6 Bauordnung", land: "Hessen", erwartet: [["fehler"]] }, // HBO noch nicht in der Bibliothek – offen sagen
  { frage: "Abstandsflächen", land: "Nordrhein-Westfalen", erwartet: [["treffer", "§ 6"]] },
  { frage: "Baugenehmigung", land: "Brandenburg", erwartet: [["treffer", "§ 64"]] },
  { frage: "ATV DIN 18300", erwartet: [["norm", "DIN 18300", "vobc"]] },
  { frage: "DIN 18310", erwartet: [["fehler"]] }, // zurückgezogen, keine ATV mehr
  { frage: "§ 1 VOB/C", erwartet: [["fehler"]] }, // VOB/C hat keine Paragraphen

  // Stichworte (kuratiertes Verzeichnis + Volltext)
  { frage: "Was gilt beim Bauen im Außenbereich?", erwartet: [["treffer", "§ 35"]] },
  { frage: "Vorkaufsrecht der Gemeinde", erwartet: [["treffer", "§ 24"]] },
  { frage: "Innenbereich", erwartet: [["treffer", "§ 34"]] },
  { frage: "Veränderungssperre", erwartet: [["treffer", "§ 14"]] },
  { frage: "Bauen neben einem Denkmal", erwartet: [["treffer", "§ 8"]] },
  { frage: "Genehmigung für Arbeiten an einem Baudenkmal", erwartet: [["treffer", "§ 10"]] },
  { frage: "Erdarbeiten", erwartet: [["treffer", "§ 13"]] },
  { frage: "Milieuschutz", erwartet: [["treffer", "§ 172"]] },
  { frage: "Abstandsflächen", erwartet: [["treffer", "§ 6"]] },
  { frage: "Abnahme der Bauleistung", erwartet: [["treffer", "§ 12"]] },
  { frage: "Mängelansprüche", erwartet: [["treffer", "§ 13"]] },
  { frage: "Estricharbeiten", erwartet: [["treffer", "DIN 18353"]] },
  { frage: "Bauvoranfrage", erwartet: [["treffer", "§ 73"]] },
  { frage: "xyzqv", erwartet: [["fehler"]] },

  // Ortsauskunft (live)
  { frage: "Kärntner Straße 10", erwartet: [["ort", "gefunden+dok/*"]] }, // B-Plan 117 II mit Planzeichnung als PDF
  { frage: "Gartenstraße 5", erwartet: [["ort", "keiner/am-standort"]] },
  { frage: "Ich habe ein Grundstück an der Gartenstraße 5, dort steht ein Denkmal", erwartet: [["ort", "keiner/am-standort"]] },
  { frage: "Fantasiestraße 999", erwartet: [["ort", "standort-fehlt"]] },
  // Adresse mitten im Satz: Satzteile vor dem Straßennamen gehören nicht zur Straße, "am" schon ("Am Markt")
  { frage: "Ich plane einen Anbau an der Gartenstraße 5 in Oldenburg", erwartet: [["ort", "keiner/am-standort"]] },
  { frage: "Lohnt sich ein Umbau im Haus am Markt 1, 28195 Bremen?", erwartet: [["ort", "gefunden/am-standort"]] },
  // Ortsauskunft Deutschland: Dienste je Land/Stadt (lib/ort/dienste); "keiner" bei unvollständigen Diensten = "nicht verzeichnet"
  { frage: "Gartenstraße 5, 26122 Oldenburg", erwartet: [["ort", "keiner/am-standort"]] },
  { frage: "Bahnhofstraße 1, 30159 Hannover", erwartet: [["ort", "fehler/*"]] },
  { frage: "Marienplatz 1, 80331 München", erwartet: [["ort", "keiner/am-standort"]] }, // Stadt München + BLfD; B-Plan-Dienst unvollständig -> "nicht verzeichnet"
  { frage: "Königsallee 1", erwartet: [["auswahl"]] }, // gibt es in vielen Orten -> Rückfrage mit Postleitzahl
  // je Land eine Adresse (Dienste am 17.11.2026 geprüft); "*" wo ein Dienst zeitweise ausfällt oder sich der Bestand ändern kann
  { frage: "Schlossplatz 4, 70173 Stuttgart", erwartet: [["ort", "gefunden/am-standort"]] }, // BW: Raumordnungskataster + Stuttgart, LAD
  { frage: "Pariser Platz 1, 10117 Berlin", erwartet: [["ort", "gefunden/am-standort"]] },
  { frage: "Alter Markt 1, 14467 Potsdam", erwartet: [["ort", "gefunden/fehler"]] }, // Brandenburg: kein Denkmal-Dienst angebunden
  { frage: "Am Markt 1, 28195 Bremen", erwartet: [["ort", "gefunden/am-standort"]] },
  { frage: "Hans-Scharoun-Platz 1, 27568 Bremerhaven", erwartet: [["ort", "gefunden/am-standort"]] }, // B-Plan-Dienst vollständig
  { frage: "Rathausmarkt 1, 20095 Hamburg", erwartet: [["ort", "gefunden/am-standort"]] }, // B-Plan-Dienst vollständig, DSchG HH fehlt
  { frage: "Domplatz 1, 60311 Frankfurt am Main", erwartet: [["ort", "gefunden/am-standort"]] },
  { frage: "Neuer Markt 1, 18055 Rostock", erwartet: [["ort", "keiner/*"]] }, // Denkmal-Dienst Rostock fiel am 17.11. zeitweise aus
  { frage: "Roncalliplatz 2, 50667 Köln", erwartet: [["ort", "gefunden/umgebung"]] }, // NRW: konstitutives System (§ 5 DSchG NRW)
  { frage: "Markt 10, 55116 Mainz", erwartet: [["ort", "keiner/am-standort"]] },
  { frage: "Neumarkt 1, 01067 Dresden", erwartet: [["ort", "keiner/umgebung"]] },
  { frage: "Domplatz 4, 39104 Magdeburg", erwartet: [["ort", "keiner/am-standort"]] },
  { frage: "Ludwigsplatz 1, 66117 Saarbrücken", erwartet: [["ort", "fehler/umgebung"]] }, // Saarland: B-Pläne bewusst nicht angebunden
  { frage: "Dänische Straße 44, 24103 Kiel", erwartet: [["ort", "keiner/am-standort"]] },
  { frage: "Jürgen-Fuchs-Straße 1, 99096 Erfurt", erwartet: [["ort", "gefunden/fehler"]] }, // Thüringen: Plan ohne Nummer, kein Denkmal-Dienst
];

function kurzform(a) {
  if (a.art === "norm") return `norm ${a.ansicht.norm.bez} ${a.ansicht.gesetz.id}`;
  if (a.art === "treffer") return `treffer ${a.treffer.map((t) => t.bez).join(",")}`;
  if (a.art === "ort") return a.ort.standort.status !== "ok" ? `ort standort-fehlt (${a.ort.standort.status})` : `ort ${a.ort.standort.adresse} -> ${a.ort.bplan.status}/${a.ort.denkmal.status}`;
  return a.art;
}

function passt(a, [art, detail, gesetz]) {
  if (!art.split("|").includes(a.art)) return false;
  if (a.art === "norm" && detail && (a.ansicht.norm.bez !== detail || (gesetz && a.ansicht.gesetz.id !== gesetz))) return false;
  if (a.art === "treffer" && detail && !a.treffer.some((t) => t.bez === detail)) return false;
  if (a.art === "ort" && detail) {
    if (detail === "standort-fehlt") return a.ort.standort.status !== "ok";
    const [bRoh, d] = detail.split("/");
    const [b, mitDok] = bRoh.split("+");
    if (a.ort.standort.status !== "ok") return false;
    if (b !== "*" && a.ort.bplan.status !== b) return false;
    if (mitDok && !(a.ort.bplan.plaene ?? []).some((p) => (p.dokumente ?? []).some((x) => x.art === "Planzeichnung"))) return false;
    if (d !== "*" && a.ort.denkmal.status !== d) return false;
  }
  return true;
}

let ok = 0;
for (const f of FAELLE) {
  const res = await fetch(`${BASIS}/api/frage`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text: f.frage, ...(f.land ? { land: f.land } : {}) }) });
  const { antworten } = await res.json();
  const bestanden = antworten.length === f.erwartet.length && f.erwartet.every((e, i) => passt(antworten[i], e));
  if (bestanden) ok++;
  console.log(`${bestanden ? "OK  " : "FAIL"} ${f.frage}\n      -> ${antworten.map(kurzform).join(" | ")}`);
  // Adresssuche (Nominatim): höchstens eine Anfrage pro Sekunde
  if (antworten.some((a) => a.art === "ort" || a.art === "auswahl")) await new Promise((r) => setTimeout(r, 1100));
}
console.log(`\n${ok}/${FAELLE.length} bestanden`);
process.exit(ok === FAELLE.length ? 0 : 1);
