// Erkennt Verweise auf andere Paragraphen DESSELBEN Gesetzes im Gesetzestext.
//
// Beispiele, die erkannt werden:
//   "§ 31 Absatz 1"               -> 31
//   "§§ 31, 33 bis 35"            -> 31, 33, 34, 35 (inkl. z. B. 35a, falls vorhanden)
//   "§ 9 Absatz 1 Nummer 2 und 3" -> 9   (2 und 3 sind Nummern, keine Paragraphen)
// Nicht übernommen werden Verweise auf andere Gesetze:
//   "§ 1 des Bundesnaturschutzgesetzes", "§ 4 der Baunutzungsverordnung"

// Kein \b am Ende: hinter "Abs." oder "Nr." greift \b nicht (Punkt + Leerzeichen sind beide keine Wortzeichen).
const UNTER = /^(Absatz|Absätze|Absätzen|Abs\.|Satz|Sätze|Sätzen|Nummer|Nummern|Nr\.|Buchstabe|Buchstaben|Buchst\.|Halbsatz|Unterabsatz|Alternative)(?=[\s,;)]|$)/;
// Gesetzeskürzel wie "NEG", "NBauO", "BauNVO" (mind. zwei Großbuchstaben) -> Verweis auf ein anderes Gesetz
const KUERZEL = /^([A-ZÄÖÜ][A-Za-zÄÖÜäöü]*[A-Z][A-Za-z]*)\b/;
const VERBINDER = /^(,|und|oder|bis|sowie|und\/oder)(?=\s|$|,)/;
const NUMMER = /^(\d+[a-z]?)(?![\d.])\b/;
const BUCHSTABE = /^([a-z])\b/;

export function extrahiereVerweise(text, vorhanden, reihenfolge, eigenesKuerzel = "") {
  const gefunden = [];
  const re = /§§?/g;
  let m;
  while ((m = re.exec(text))) {
    let pos = m.index + m[0].length;
    const kandidaten = [];
    let modus = "paragraph"; // "paragraph" | "unter"
    let bereichVon = null;
    let letzteWarBis = false;
    let ende = pos; // Position nach dem letzten erkannten Paragraphen-/Absatz-Token

    for (;;) {
      const rest = text.slice(pos);
      const ws = rest.match(/^\s+/);
      if (ws) { pos += ws[0].length; continue; }

      const unter = rest.match(UNTER);
      if (unter) { modus = "unter"; pos += unter[0].length; letzteWarBis = false; ende = pos; continue; }

      const verb = rest.match(VERBINDER);
      if (verb) { letzteWarBis = verb[1] === "bis"; pos += verb[0].length; continue; }

      const num = rest.match(NUMMER);
      if (num) {
        if (modus === "paragraph") {
          if (letzteWarBis && bereichVon) kandidaten.push(...bereich(bereichVon, num[1], reihenfolge));
          else kandidaten.push(num[1]);
          bereichVon = num[1];
        }
        letzteWarBis = false;
        pos += num[0].length;
        ende = pos;
        continue;
      }
      if (modus === "unter" && rest.match(BUCHSTABE)) { pos += 1; ende = pos; continue; }
      break;
    }

    // Folgt "des …"/"der …" mit Großbuchstaben, ist meist ein anderes Gesetz gemeint.
    const danach = text.slice(ende, ende + 80).trimStart();
    const extern = /^(des|der)\s+(?!Verordnung nach)[A-ZÄÖÜ]/.test(danach) && !/^(des|der)\s+(Absatzes|Satzes|Nummer)/.test(danach);
    const diesesGesetz = /^(dieses|des\s+Baugesetzbuchs)/.test(danach);
    if (extern && !diesesGesetz) continue;
    const kuerzel = danach.match(KUERZEL);
    if (kuerzel && kuerzel[1].toLowerCase() !== eigenesKuerzel.toLowerCase()) continue;

    for (const k of kandidaten) if (vorhanden.has(k) && !gefunden.includes(k)) gefunden.push(k);
  }
  return gefunden;
}

function bereich(von, bis, reihenfolge) {
  const a = reihenfolge.indexOf(von);
  const b = reihenfolge.indexOf(bis);
  if (a === -1 || b === -1 || b < a) return [bis];
  return reihenfolge.slice(a, b + 1);
}
