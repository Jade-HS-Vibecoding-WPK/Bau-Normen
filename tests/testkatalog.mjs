// Testkatalog: typische Fragen aus der Baupraxis und was die App antworten MUSS.
// Aufruf (Server muss laufen):  node tests/testkatalog.mjs [http://localhost:3000]
//
// Erwartung je Antwort: [art, detail, gesetz]
//   norm:    detail = "§ 34", gesetz = "baugb"
//   treffer: detail = Paragraph, der unter den Treffern sein muss
//   ort:     detail = "bplan-status/denkmal-status" (z. B. "gefunden/keiner"), "*" = egal
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

  // Stichworte (kuratiertes Verzeichnis + Volltext)
  { frage: "Was gilt beim Bauen im Außenbereich?", erwartet: [["treffer", "§ 35"]] },
  { frage: "Vorkaufsrecht der Gemeinde", erwartet: [["treffer", "§ 24"]] },
  { frage: "Innenbereich", erwartet: [["treffer", "§ 34"]] },
  { frage: "Veränderungssperre", erwartet: [["treffer", "§ 14"]] },
  { frage: "Bauen neben einem Denkmal", erwartet: [["treffer", "§ 8"]] },
  { frage: "Genehmigung für Arbeiten an einem Baudenkmal", erwartet: [["treffer", "§ 10"]] },
  { frage: "Erdarbeiten", erwartet: [["treffer", "§ 13"]] },
  { frage: "Milieuschutz", erwartet: [["treffer", "§ 172"]] },
  { frage: "xyzqv", erwartet: [["fehler"]] },

  // Ortsauskunft (live)
  { frage: "Kärntner Straße 10", erwartet: [["ort", "gefunden/*"]] },
  { frage: "Gartenstraße 5", erwartet: [["ort", "keiner/am-standort"]] },
  { frage: "Ich habe ein Grundstück an der Gartenstraße 5, dort steht ein Denkmal", erwartet: [["ort", "keiner/am-standort"]] },
  { frage: "Fantasiestraße 999", erwartet: [["ort", "standort-fehlt"]] },
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
    const [b, d] = detail.split("/");
    if (a.ort.standort.status !== "ok") return false;
    if (b !== "*" && a.ort.bplan.status !== b) return false;
    if (d !== "*" && a.ort.denkmal.status !== d) return false;
  }
  return true;
}

let ok = 0;
for (const f of FAELLE) {
  const res = await fetch(`${BASIS}/api/frage`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text: f.frage }) });
  const { antworten } = await res.json();
  const bestanden = antworten.length === f.erwartet.length && f.erwartet.every((e, i) => passt(antworten[i], e));
  if (bestanden) ok++;
  console.log(`${bestanden ? "OK  " : "FAIL"} ${f.frage}\n      -> ${antworten.map(kurzform).join(" | ")}`);
}
console.log(`\n${ok}/${FAELLE.length} bestanden`);
process.exit(ok === FAELLE.length ? 0 : 1);
