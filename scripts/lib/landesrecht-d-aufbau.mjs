// Aufbau der Vorschriften aus den Zeilen eines PDF (scripts/import-landesrecht-d.mjs).
//
// Grundregel: Der Wortlaut wird NICHT verändert. Jede Zeichenkette im Ergebnis stammt aus einer PDF-Zeile; wir
// speichern nur zusätzlich die Struktur (Absätze, Nummern, Buchstaben, hochgestellte Satznummern). Erlaubt sind allein
// diese dokumentierten Entscheidungen an Zeilenumbrüchen und Zeichen – jede wird gezählt und im Prüfprotokoll gelistet:
//   Z1 Zeilenumbruch: Endet eine Zeile mit einem Leerzeichen-Zeichen, ist das die Wortgrenze. Endet sie ohne
//      Leerzeichen und ohne Bindestrich (z. B. letzte Zeile einer Seite), wird ein Leerzeichen gesetzt.
//   Z2 Bindestrich am Zeilenende: bleibt stehen („öffentlich-⏎rechtlich“, „Zu- ⏎oder“). Nur bei Vorlagen mit
//      Silbentrennung (Lesefassung) entfällt er, wenn es eine Worttrennung ist – entschieden am Wortschatz (siehe
//      Trenner unten); jeder Fall steht mit Begründung im Protokoll.
//   Z3 Satznummer als Zeichen „¹“/„²“/„³“ statt hochgestellter Ziffer (wie R2 in import-mbo.mjs): als {t:"sup"} gespeichert.
// Hochgestelltes bleibt im Inhalt ({t:"sup"}); Satznummern und Fußnotenzeichen fehlen im Feld "text".

import fs from "node:fs";
import path from "node:path";
import { satznummer } from "./landesrecht-c-gemeinsam.mjs";

export const RE_GLIEDERUNG =
  /^(Erster|Zweiter|Dritter|Vierter|Fünfter|Sechster|Siebenter|Siebter|Achter|Neunter|Zehnter|Elfter|Zwölfter) (Teil|Abschnitt|Unterabschnitt)$/iu;
const RE_PARAGRAPH = /^§\s*(\d+[a-z]?)$/;
const RE_ABSATZ = /^\((\d+)([a-z]?)\)(?=\s|$)/;
const RE_ZAHL = /^(\d+)([a-z]?)\.(?=\s)/;
const RE_DOPPEL = /^([a-z])\1\)(?=\s)/;
const RE_BUCHST = /^([a-z])\)(?=\s)/;
const RE_STRICH = /^([–-])(?=\s)/;

export const gliederungsRang = (t) => (/\bteil\b/i.test(t) ? 2 : /unterabschnitt/i.test(t) ? 4 : /abschnitt/i.test(t) ? 3 : 5);

export function neuesProtokoll() {
  return {
    trennstriche: [],
    silbentrennungen: 0,
    zeilenenden: [],
    satznummerZeichen: [],
    hochgestellt: { satz: 0, fussnote: 0, einheit: 0 },
    fussnoten: [],
    listen: [],
    absatzfolgen: [],
    satzfolgen: [],
    auffaelligkeiten: [],
  };
}

// ---------- Silbentrennung: Wortschatz ----------

const WORT = /[\p{L}\p{N}][\p{L}\p{N}-]*[\p{L}\p{N}]|[\p{L}\p{N}]/gu;

/**
 * Wortschatz für die Entscheidung „Worttrennung oder Bindestrich?“: alle Wörter aus dem Wortlaut der bereits
 * importierten Gesetze (data/gesetze/*.json, Feld "text") und aus dem Inneren der Zeilen der Vorlage selbst (ohne das
 * erste und letzte Wort einer Zeile, die getrennt sein können). Kleinbuchstaben.
 */
export function wortschatz(gesetzeDir, zeilen, nur) {
  const w = new Map();
  const add = (s, quelle) => {
    for (const x of s.toLowerCase().match(WORT) ?? []) if (!w.has(x)) w.set(x, quelle);
  };
  for (const f of fs.readdirSync(gesetzeDir)) {
    // feste Liste, damit das Ergebnis nicht davon abhängt, welche Gesetze später dazukommen
    if (!f.endsWith(".json") || !nur.includes(f.replace(/\.json$/, ""))) continue;
    const g = JSON.parse(fs.readFileSync(path.join(gesetzeDir, f), "utf8"));
    for (const n of g.normen) if (n.text) add(n.text, g.kurz);
  }
  for (const z of zeilen) {
    const woerter = z.teile.filter((t) => !t.hoch).map((t) => t.t).join("").match(WORT) ?? [];
    add(woerter.slice(1, -1).join(" "), "Vorlage");
  }
  return w;
}

/**
 * Entscheidet über einen Bindestrich am Zeilenende. modus "pdf": immer stehen lassen (amtliche Vorlage ohne
 * Silbentrennung). modus "woerterbuch": Worttrennung, wenn das zusammengeschriebene Wort im Wortschatz steht und die
 * Schreibung mit Bindestrich nicht; Bindestrich, wenn es umgekehrt ist, das Folgewort groß beginnt oder „und“/„oder“ …
 * folgt (Ergänzungsstrich); feste Listen BEHALTEN/TRENNEN für Fälle, die von Hand am PDF geprüft sind; sonst
 * (kein Beleg) Worttrennung – diese Fälle stehen gesondert im Protokoll.
 */
export function trenner({ modus, wortschatz: ws = new Map(), behalten = [], trennen = [] }) {
  const B = new Set(behalten), T = new Set(trennen);
  const benutzt = new Set();
  return {
    benutzt,
    modus,
    entscheide(wort1, wort2, mitLeer) {
      if (modus === "pdf") return { trennen: false, grund: mitLeer ? "Bindestrich + Leerzeichen wie im PDF (Ergänzungsstrich)" : "Bindestrich wie im PDF" };
      const paar = `${wort1}-${wort2}`;
      if (B.has(paar)) return benutzt.add(paar), { trennen: false, wort: true, grund: "Bindestrich (von Hand am PDF geprüft)" };
      if (T.has(paar)) return benutzt.add(paar), { trennen: true, grund: "Worttrennung (von Hand am PDF geprüft)" };
      if (!wort2) return { trennen: false, grund: "Bindestrich (kein Wort folgt)" };
      if (!/^\p{Ll}/u.test(wort2)) return { trennen: false, wort: true, grund: "Bindestrich (Folgewort beginnt nicht mit Kleinbuchstaben)" };
      if (/^(und|oder|bzw|sowie|als|noch|bis|wie)$/.test(wort2)) return { trennen: false, grund: "Ergänzungsstrich (es folgt „" + wort2 + "“)" };
      const zusammen = (wort1 + wort2).toLowerCase();
      const mitStrich = paar.toLowerCase();
      const a = ws.get(zusammen), b = ws.get(mitStrich);
      if (b && !a) return { trennen: false, wort: true, grund: `Bindestrich: „${paar}“ belegt (${b})` };
      if (a && !b) return { trennen: true, grund: `Worttrennung: „${wort1 + wort2}“ belegt (${a})` };
      if (a && b) return { trennen: true, grund: `Worttrennung, beide Schreibungen belegt (${a} / ${b}) – PRÜFEN`, pruefen: true };
      return { trennen: true, grund: "Worttrennung ohne Beleg im Wortschatz – PRÜFEN", pruefen: true };
    },
  };
}

// ---------- Gliederung: Überschriften, Vorschriften, Anlagen ----------

/**
 * Ordnet die Zeilen zu. zeilen: Zeilen der Seiten der Vorlage (mit z.rel = Abstand vom linken Rand der Seite/Spalte).
 * def: Angaben des Gesetzes (start, anlage, ueberspringen, fussnote …). Liefert { normen, zuordnung, fussnoten }.
 */
export function gliedern(zeilen, def, prot) {
  const zuordnung = new Map();
  const zuordnen = (z, was) => {
    if (zuordnung.has(z)) throw new Error(`Zeile doppelt zugeordnet (S. ${z.seite}): ${z.text}`);
    zuordnung.set(z, was);
  };
  const start = zeilen.findIndex((z, i) => def.start(z, i, zeilen));
  if (start < 0) throw new Error(`${def.kurz}: Beginn des Gesetzestexts nicht gefunden.`);
  zeilen.slice(0, start).forEach((z) => zuordnen(z, "vorspann"));

  // Fußnotenbereiche: ab der ersten Fußnotenzeile einer Seite bis zum Seitenende
  const fussnotenSeiten = new Map(); // seite -> [{ zeichen, zeilen }]
  let fussSeite = null;
  for (const z of zeilen.slice(start)) {
    if (fussSeite !== z.seite) fussSeite = def.fussnote?.(z) ? z.seite : null;
    if (fussSeite === null) continue;
    if (!fussnotenSeiten.has(z.seite)) fussnotenSeiten.set(z.seite, []);
    const liste = fussnotenSeiten.get(z.seite);
    const erstes = z.teile.find((t) => t.t.trim());
    if (erstes?.hoch) liste.push({ zeichen: erstes.t, zeilen: [z] });
    else if (liste.length) liste[liste.length - 1].zeilen.push(z);
    else throw new Error(`Fußnotenzeile ohne Zeichen (S. ${z.seite}): ${z.text}`);
    z.fussnote = true;
  }
  const fussnoten = new Map(); // seite -> Map(zeichen -> text)
  for (const [seite, liste] of fussnotenSeiten) {
    const m = new Map();
    for (const f of liste) {
      f.zeilen.forEach((z) => zuordnen(z, "fussnote"));
      const text = zeilenVerbinden(f.zeilen, prot, `S. ${seite} Fußnote`, def.trenner);
      m.set(f.zeichen, text);
    }
    fussnoten.set(seite, m);
  }

  // Überschrift einer Vorschrift: Standard „§ 5“ allein und eingerückt (mittig), Titel in den folgenden Zeilen;
  // def.paragraphKopf erlaubt andere Formen (z. B. „§ 5 Abstandsflächen“ fett in einer Zeile).
  const paragraphKopf = def.paragraphKopf ?? ((z) => {
    const m = z.text.trim().match(RE_PARAGRAPH);
    return m && z.rel > (def.kopfAbstand ?? 60) ? { nr: m[1] } : null;
  });
  const titelZeile = def.titelZeile ?? ((z) => z.rel > 20);
  const istKopf = (z) => !z.fussnote && !!paragraphKopf(z);
  const istGliederung = (z) => !z.fussnote && RE_GLIEDERUNG.test(z.text.trim()) && z.rel > 20;
  // Titelzeilen nach einer Überschrift (übersprungene Wiederholungen des Tabellenkopfs dazwischen werden zugeordnet)
  const titelSammeln = (j) => {
    const titel = [];
    for (; j < zeilen.length; j++) {
      const x = zeilen[j];
      if (x.fussnote || istKopf(x) || istGliederung(x)) break;
      if (def.ueberspringen?.(x, j, zeilen)) {
        zuordnen(x, "uebersprungen");
        continue;
      }
      if (!titelZeile(x)) break;
      titel.push(x);
    }
    return { titel, j };
  };
  const normen = [];
  let gliederung = [];
  let ausstehend = []; // Gliederungszeilen vor der nächsten Vorschrift (für die Gegenprüfung)
  let norm = null;
  const anmerkungen = [];
  for (let i = start; i < zeilen.length; i++) {
    const z = zeilen[i];
    if (z.fussnote) continue;
    if (def.ueberspringen?.(z, i, zeilen)) {
      zuordnen(z, "uebersprungen");
      continue;
    }
    // Anmerkung der Vorlage, kein Gesetzestext (Synopse: „[jetzt in § 43 Absatz 1]“) – nur im Protokoll
    if (def.anmerkung?.(z)) {
      zuordnen(z, "anmerkung");
      anmerkungen.push({ z, norm });
      continue;
    }
    if (istGliederung(z)) {
      const { titel, j } = titelSammeln(i + 1);
      if (!titel.length) throw new Error(`Gliederungsüberschrift ohne Titel (S. ${z.seite}): ${z.text}`);
      [z, ...titel].forEach((x) => zuordnen(x, "gliederung"));
      const text = `${z.text.trim()} – ${zeilenVerbinden(titel, prot, `S. ${z.seite} Gliederung`, def.trenner)}`;
      const rang = gliederungsRang(z.text);
      gliederung = [...gliederung.filter((g) => gliederungsRang(g) < rang), text];
      ausstehend.push(z, ...titel);
      norm = null;
      i = j - 1;
      continue;
    }
    if (istKopf(z)) {
      const { nr } = paragraphKopf(z);
      const { titel, j } = titelSammeln(i + 1);
      [z, ...titel].forEach((x) => zuordnen(x, "ueberschrift"));
      // Titel in derselben Zeile wie „§ 5“ (z. B. „§ 5 Abstandsflächen“): Rest der Zeile als erste Titelzeile
      const rest = z.teile.map((t) => t.t).join("").replace(/^\s*§\s*\d+[a-z]?\s*/, "");
      const titelZeilen = rest.trim() ? [{ ...z, teile: [{ t: rest, hoch: false }] }, ...titel] : titel;
      norm = {
        id: nr,
        bez: `§ ${nr}`,
        titel: zeilenVerbinden(titelZeilen, prot, `§ ${nr} Überschrift`, def.trenner),
        gliederung: [...gliederung],
        seite: z.seite,
        kopf: [...ausstehend, z, ...titel],
        zeilen: [],
        anlage: false,
      };
      ausstehend = [];
      normen.push(norm);
      i = j - 1;
      continue;
    }
    const a = def.anlage?.(zeilen, i);
    if (a) {
      const kopf = zeilen.slice(i, i + a.zeilen);
      kopf.forEach((x) => zuordnen(x, "ueberschrift"));
      // Anlagen gehören zu keinem Teil; die laufende Gliederung bleibt für die folgenden Vorschriften erhalten
      // (in einer Synopse kann die Anlage mitten im Gesetz stehen, direkt nach ihrer Vorschrift)
      norm = { id: a.id, bez: a.bez, titel: a.titel(kopf, prot), gliederung: [], seite: z.seite, kopf: [...ausstehend, ...kopf], zeilen: [], anlage: true };
      ausstehend = [];
      normen.push(norm);
      i += a.zeilen - 1;
      continue;
    }
    if (!norm) throw new Error(`Text außerhalb einer Vorschrift (S. ${z.seite}): ${z.text}`);
    zuordnen(z, "normtext");
    norm.zeilen.push(z);
  }
  if (ausstehend.length) throw new Error("Gliederungsüberschrift am Ende ohne Vorschrift.");
  return { normen, zuordnung, fussnoten, anmerkungen };
}

/** Zeilen einer Überschrift oder Fußnote zu einem Text verbinden (Zeilenumbrüche wie im Fließtext, Z1/Z2). */
export function zeilenVerbinden(zs, prot, kontext, trenner) {
  let out = "";
  zs.forEach((z, k) => {
    let teil = z.teile.map((t) => t.t).join("");
    if (k > 0) out = zeilenende(out, teil, z, prot, kontext, trenner).davor;
    out += teil;
  });
  return out.replace(/\s+/g, " ").trim();
}

// Zeilenende behandeln: liefert den Text vor dem Umbruch (ggf. ohne Trennstrich bzw. mit ergänztem Leerzeichen).
function zeilenende(davor, naechste, z, prot, kontext, trenner) {
  if (/\s$/.test(davor) && !/-\s+$/.test(davor)) return { davor };
  if (/^\s/.test(naechste) && !/-\s*$/.test(davor)) return { davor };
  const m = davor.match(/(\S*?)-(\s*)$/);
  if (m) {
    const wort1 = m[1].match(/[\p{L}\p{N}-]*$/u)[0];
    const wort2 = (naechste.trimStart().match(/^[\p{L}\p{N}-]*/u) ?? [""])[0].replace(/-+$/, "");
    const e = trenner.entscheide(wort1, wort2, !!m[2]);
    prot.trennstriche.push(`S. ${z.seite}, ${kontext}: „${wort1}-${m[2] ? "␣" : ""}⏎${wort2}“ – ${e.trennen ? "entfällt" : "bleibt"}: ${e.grund}`);
    if (e.trennen) {
      prot.silbentrennungen++;
      return { davor: davor.replace(/-\s*$/, ""), getrennt: true };
    }
    // Bindestrichwort in einer Vorlage mit Silbentrennung (Lesefassung): Das Leerzeichen-Zeichen nach dem Bindestrich
    // am Zeilenende ist unsichtbar und gehört nicht zum Wort – gedruckt steht „öffentlich-⏎rechtlich“.
    // Ergänzungsstriche („Lager- ⏎und“) behalten es.
    if (e.wort && m[2] && trenner.modus === "woerterbuch") {
      prot.trennstriche[prot.trennstriche.length - 1] += " (Leerzeichen-Zeichen nach dem Bindestrich am Zeilenende entfällt)";
      return { davor: davor.replace(/-\s+$/, "-") };
    }
    return { davor };
  }
  prot.zeilenenden.push(`S. ${z.seite}, ${kontext}: „…${davor.slice(-25)}⏎${naechste.trimStart().slice(0, 20)}…“ – Zeile endet ohne Leerzeichen-Zeichen, Leerzeichen gesetzt (Z1)`);
  return { davor: davor + " " };
}

// ---------- Inhalt einer Vorschrift: Absätze und Listen ----------

/**
 * Absätze beginnen mit „(1)“ am linken Rand, Listenpunkte mit „1.“, „a)“, „aa)“ oder „–“. Ob eine Folgezeile zu einem
 * Listenpunkt gehört oder der Absatz nach der Liste weitergeht, entscheidet der Einzug (wie in import-mbo.mjs).
 * Listennummern müssen lückenlos aufeinander folgen – „14. Juni 2023“ am Zeilenanfang ist so kein neuer Listenpunkt.
 * Ein größerer Abstand zur vorigen Zeile im selben Punkt bzw. Absatz wird als Zeilenumbruch ({t:"br"}) übernommen;
 * in Anlagen beginnt dort ein neuer Absatz.
 */
export function baueInhalt(norm, def, prot) {
  const EIN = def.einrueckung ?? 10;
  const inhalt = [];
  let absatz = null;
  let stapel = [];
  let erwarteterAbsatz = 1;
  let vorige = null;
  let voriges = null;
  const neuerAbsatz = () => {
    absatz = { t: "p", c: [] };
    inhalt.push(absatz);
    stapel = [];
  };
  const punktAnlegen = (marke, x, eltern) => {
    let e;
    if (eltern !== undefined) {
      stapel = eltern ? stapel.slice(0, stapel.indexOf(eltern) + 1) : [];
      const liste = { t: "dl", items: [] };
      (eltern ? eltern.punkt.c : absatz.c).push(liste);
      stapel.push((e = { art: marke.art, liste, punkt: null, nr: null, x }));
    } else e = stapel[stapel.length - 1];
    e.punkt = { dt: marke.dt, c: [] };
    e.liste.items.push(e.punkt);
    e.nr = marke;
    e.x = x;
    return e.punkt.c;
  };

  norm.zeilen.forEach((z, zi) => {
    const erster = z.teile[0];
    let anfang = erster && !erster.hoch ? erster.t.trimStart() : "";
    let ziel = null;
    let teile = z.teile;
    const abschneiden = (marke) => {
      anfang = anfang.slice(marke.length).replace(/^\s+/, "");
      teile = [{ t: anfang, hoch: false }, ...teile.slice(1)];
    };
    const abstand = vorige && vorige.seite === z.seite ? vorige.y - z.y : 0;
    const luecke = abstand > (def.zeilenabstand ?? 18) * 1.5;

    // „(4)“ am linken Rand; ohne Leerzeichen dahinter („(4)¹Die …“) nur, wenn es die erwartete Nummer ist
    let ma = anfang.match(RE_ABSATZ);
    if (!ma) {
      const ohne = anfang.match(/^\((\d+)([a-z]?)\)/);
      if (ohne && !ohne[2] && Number(ohne[1]) === erwarteterAbsatz) ma = ohne;
    }
    if (ma && z.rel < 8 && !norm.anlage) {
      const nr = Number(ma[1]);
      if (ma[2] ? nr !== erwarteterAbsatz - 1 : nr !== erwarteterAbsatz)
        prot.absatzfolgen.push(`${norm.bez} (S. ${z.seite}): Absatz „(${ma[1]}${ma[2]})“, erwartet (${erwarteterAbsatz})`);
      erwarteterAbsatz = nr + 1;
      neuerAbsatz();
      ziel = absatz.c;
    }
    const nachFett = vorige && vorige.fett && !z.fett;
    const anlageNeu = norm.anlage && (def.anlageAbsatz?.(z, anfang, norm.zeilen[zi + 1], vorige) || (z.rel < 8 && (nachFett || (luecke && !listenmarke(anfang)))));
    // neuer Absatz in einer Anlage – die Zeile kann zugleich eine Liste beginnen („1. Gebäude“)
    if (!ziel && anlageNeu) neuerAbsatz();
    if (!absatz) neuerAbsatz();

    if (!ziel) {
      const marke = listenmarke(anfang);
      if (marke) {
        const ebene = stapel.findIndex((e) => e.art === marke.art);
        const naechste = norm.zeilen[zi + 1];
        const haengend = naechste && naechste.seite === z.seite && naechste.rel > z.rel + EIN && !listenmarke(naechste.text.trimStart());
        if (ebene >= 0 && folgt(stapel[ebene], marke) && Math.abs(stapel[ebene].x - z.rel) < EIN) {
          stapel = stapel.slice(0, ebene + 1);
          ziel = punktAnlegen(marke, z.rel);
        } else if (ebene < 0 && (marke.erster || haengend)) {
          const eltern = [...stapel].reverse().find((e) => e.x + EIN / 2 < z.rel && rang(e.art) < rang(marke.art)) ?? null;
          if (!marke.erster) prot.listen.push(`${norm.bez} (S. ${z.seite}): Liste beginnt mit „${marke.dt}“ (so im PDF)`);
          ziel = punktAnlegen(marke, z.rel, eltern);
        } else if (stapel.some((e) => Math.abs(e.x - z.rel) < 3))
          prot.listen.push(`${norm.bez} (S. ${z.seite}): „${anfang.slice(0, 30)}…“ sieht aus wie ein Listenpunkt, passt aber nicht in die Folge – als Fortsetzungszeile behandelt`);
        if (ziel) {
          abschneiden(marke.dt);
          const unter = listenmarke(anfang);
          if (unter && unter.erster && rang(unter.art) > rang(marke.art)) {
            prot.listen.push(`${norm.bez} (S. ${z.seite}): „${marke.dt} ${unter.dt}“ – Unterliste beginnt in derselben Zeile`);
            ziel = punktAnlegen(unter, z.rel, stapel[stapel.length - 1]);
            abschneiden(unter.dt);
          }
        }
      }
    }
    // Fortsetzungszeile: zum tiefsten offenen Listenpunkt, zu dem die Zeile gehört – bei hängendem Einzug (Gesetzblatt,
    // Lesefassung) steht sie weiter rechts als die Listenmarke, ohne hängenden Einzug (Hamburger Synopse) bündig mit ihr
    if (!ziel) {
      const k = def.haengenderEinzug === false ? stapel.findLastIndex((e) => e.x <= z.rel + 2) : stapel.findLastIndex((e) => e.x + EIN / 2 < z.rel);
      stapel = stapel.slice(0, k + 1);
      ziel = k >= 0 ? stapel[k].punkt.c : absatz.c;
    }

    // Zeilenumbruch (Z1/Z2)
    if (vorige && ziel !== voriges) {
      const letzter = voriges[voriges.length - 1];
      if (typeof letzter === "string" && /-\s*$/.test(letzter))
        prot.trennstriche.push(`S. ${vorige.seite}, ${norm.bez}: „${letzter.trimEnd().match(/(\S*)$/)[1]}“ am Zeilenende vor neuem Absatz/Listenpunkt – bleibt`);
    }
    if (vorige && ziel === voriges) {
      const letzter = ziel[ziel.length - 1];
      const naechste = teile[0] && !teile[0].hoch ? teile[0].t : "";
      if (typeof letzter === "string") ziel[ziel.length - 1] = zeilenende(letzter, naechste, z, prot, norm.bez, def.trenner).davor;
      else if (!/^\s/.test(naechste)) {
        prot.zeilenenden.push(`S. ${z.seite}, ${norm.bez}: Zeile endet mit Hochgestelltem ohne Leerzeichen-Zeichen, Leerzeichen gesetzt (Z1)`);
        ziel.push(" ");
      }
      if (luecke && !(norm.anlage && z.rel < 8)) ziel.push({ t: "br" });
    }

    for (const t of teile) {
      if (t.hoch) ziel.push({ t: "sup", c: [t.t], seite: z.seite });
      else if (t.t) ziel.push(t.t);
    }
    vorige = z;
    voriges = ziel;
  });
  return inhalt.map((p) => ({ t: "p", c: listenFortsetzen(aufraeumen(satznummerZeichen(p.c, norm, prot)), norm, prot) }));
}

// Text am linken Rand zwischen zwei Teilen derselben Liste („6. … zur a) … c) …; ⏎die Gemeindeteile sind … ⏎7. …“)
// gehört zum letzten Punkt davor: Er wird dort angehängt und die Liste fortgesetzt. Reihenfolge und Wortlaut bleiben.
function listenFortsetzen(c, norm, prot) {
  const nr = (dt) => dt.match(/^(\d+)\.$/)?.[1] ?? null;
  for (let i = 0; i + 2 < c.length; i++) {
    const a = c[i], b = c[i + 2];
    if (a?.t !== "dl" || typeof c[i + 1] !== "string" || b?.t !== "dl") continue;
    const letzter = nr(a.items[a.items.length - 1].dt), erster = nr(b.items[0].dt);
    if (letzter === null || erster === null || Number(erster) !== Number(letzter) + 1) continue;
    const punkt = a.items[a.items.length - 1];
    punkt.c.push(" " + c[i + 1]);
    punkt.c = aufraeumen(punkt.c);
    a.items.push(...b.items);
    c.splice(i + 1, 2);
    prot.listen.push(`${norm.bez}: Text nach „${letzter}.“ am linken Rand („${punkt.c[punkt.c.length - 1].slice(0, 30)}…“) zum Punkt ${letzter}. genommen, Liste mit „${erster}.“ fortgesetzt`);
    i--;
  }
  return c;
}

function listenmarke(anfang) {
  let m;
  if ((m = anfang.match(RE_ZAHL))) return { art: "zahl", dt: m[0], wert: Number(m[1]), zusatz: m[2], erster: m[1] === "1" && !m[2] };
  if ((m = anfang.match(RE_DOPPEL))) return { art: "doppel", dt: m[0], wert: m[1].charCodeAt(0), zusatz: "", erster: m[1] === "a" };
  if ((m = anfang.match(RE_BUCHST))) return { art: "buchst", dt: m[0], wert: m[1].charCodeAt(0), zusatz: "", erster: m[1] === "a" };
  if ((m = anfang.match(RE_STRICH))) return { art: "strich", dt: m[0], wert: 0, zusatz: "", erster: true };
  return null;
}
const rang = (art) => ({ zahl: 1, buchst: 2, doppel: 3, strich: 4 })[art];
function folgt(ebene, marke) {
  if (marke.art === "strich") return true;
  const vorher = ebene.nr;
  if (marke.zusatz) return marke.wert === vorher.wert && marke.zusatz.charCodeAt(0) === (vorher.zusatz ? vorher.zusatz.charCodeAt(0) + 1 : 97);
  return marke.wert === vorher.wert + 1;
}

// Z3: Satznummer als Zeichen „²“/„³“ nach Satzende („… zulässig. ²Sind …“) -> hochgestellte Ziffer
function satznummerZeichen(nodes, norm, prot) {
  const out = [];
  for (const n of nodes) {
    if (typeof n !== "string") {
      if (n.t === "dl") for (const it of n.items) it.c = satznummerZeichen(it.c, norm, prot);
      out.push(n);
      continue;
    }
    const teile = n.split(/(?<=(?:^|[.;:;]\s+|\s))([¹²³])(?=[A-ZÄÖÜ§])/);
    for (let i = 0; i < teile.length; i++) {
      if (i % 2 === 1) {
        const ziffer = { "¹": "1", "²": "2", "³": "3" }[teile[i]];
        out.push({ t: "sup", c: [ziffer], seite: norm.seite, zeichen: teile[i] });
        prot.satznummerZeichen.push(`${norm.bez}: „…${teile[i - 1].slice(-25)}${teile[i]}${teile[i + 1].slice(0, 15)}…“ – Zeichen „${teile[i]}“ als Satznummer ${ziffer} gespeichert (Z3)`);
      } else if (teile[i]) out.push(teile[i]);
    }
  }
  return out;
}

// Strings zusammenfassen, Leerraum zu einem Leerzeichen, an Blockgrenzen trimmen (wie import-mbo.mjs)
function aufraeumen(nodes) {
  const out = [];
  for (const n of nodes) {
    if (typeof n === "string") {
      if (typeof out[out.length - 1] === "string") out[out.length - 1] += n;
      else out.push(n);
    } else {
      if (n.t === "dl") for (const it of n.items) it.c = aufraeumen(it.c);
      out.push(n);
    }
  }
  for (let i = 0; i < out.length; i++) {
    if (typeof out[i] !== "string") continue;
    out[i] = out[i].replace(/\s+/g, " ");
    if (i === 0 || out[i - 1].t === "dl" || out[i - 1].t === "br") out[i] = out[i].trimStart();
    if (i === out.length - 1 || out[i + 1].t === "dl" || out[i + 1].t === "br") out[i] = out[i].trimEnd();
  }
  // kein Zeilenumbruch am Anfang/Ende oder direkt vor/nach einer Liste
  return out.filter((n, i) => n !== "" && !(n.t === "br" && (i === 0 || i === out.length - 1 || out[i - 1].t === "dl" || out[i + 1]?.t === "dl")));
}

/**
 * Hochgestelltes einordnen und Satznummern als solche kennzeichnen (Feld "text" lässt sie weg):
 *   einheit  – „2“/„3“ direkt nach „m“ (m², m³)
 *   satz     – Ziffern, davor Leerraum/Blockbeginn, danach direkt Text („werden. ²Bauliche“)
 *   fussnote – alles andere („…nachgewiesen ist.*“)
 */
export function hochgestelltEinordnen(nodes, prot) {
  for (let i = 0; i < nodes.length; i++) {
    const n = nodes[i];
    if (typeof n === "string") continue;
    if (n.t === "dl") {
      for (const it of n.items) it.c = hochgestelltEinordnen(it.c, prot);
      continue;
    }
    if (n.t !== "sup") continue;
    const vor = nodes[i - 1];
    const nach = typeof nodes[i + 1] === "string" ? nodes[i + 1] : "";
    const wert = n.c[0];
    const vorBeginn = i === 0 || typeof vor !== "string" || /[\s[]$/.test(vor);
    if (/^[23]$/.test(wert) && typeof vor === "string" && /\bm$/.test(vor) && !n.zeichen) n.art = "einheit";
    // Satznummer: Ziffern am Satzanfang – davor Leerraum/Blockbeginn oder direkt ein Satzzeichen („haben.²Fahr-“)
    // (auch direkt nach „(4)“ und – wie in der Hamburger Synopse – mit Leerzeichen dahinter: „³ Schotterungen …“)
    else if (/^\d+$/.test(wert) && (vorBeginn || /([.;:]|\(\d+[a-z]?\))$/.test(vor)) && /^\s*[^\s,.;:)\]]/.test(nach)) n.art = "satz";
    else n.art = "fussnote";
    prot.hochgestellt[n.art]++;
    if (n.art === "satz") {
      const k = satznummer(n.c);
      k.seite = n.seite;
      k.art = "satz";
      if (n.zeichen) k.zeichen = n.zeichen;
      nodes[i] = k;
    }
  }
  return nodes;
}

export function besuche(nodes, f) {
  for (const n of nodes) {
    if (typeof n === "string") continue;
    f(n);
    if (n.c) besuche(n.c, f);
    if (n.items) for (const it of n.items) besuche(it.c, f);
  }
}

/** Satznummern je Absatz: 1, 2, 3, … (nur Protokoll) */
export function pruefeSatzfolgen(norm, prot) {
  norm.inhalt.forEach((p, i) => {
    const nummern = [];
    besuche(p.c, (k) => {
      if (k.t === "sup" && k.art === "satz") nummern.push(Number(k.c[0]));
    });
    if (nummern.some((n, j) => n !== j + 1)) prot.satzfolgen.push(`${norm.bez}, ${i + 1}. Absatz: Satznummern ${nummern.join(", ")}`);
  });
}
