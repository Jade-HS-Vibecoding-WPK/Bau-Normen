// Importiert die Vergabe- und Vertragsordnung für Bauleistungen – VOB/A (Abschnitte 1 bis 3) und
// VOB/B – aus den PDF-Bekanntmachungen und speichert sie Paragraph für Paragraph als JSON
// (data/gesetze/voba.json und data/gesetze/vobb.json) – im selben Schema wie baugb.json.
//
// Grundregel: Der Text wird NICHT verändert. Jedes Zeichen stammt aus dem PDF der Quelle; wir speichern
// nur zusätzlich die Struktur (Absätze, Nummern, Buchstaben). Weil PDFs keinen Fließtext enthalten,
// sondern einzelne Zeichen an Positionen, müssen beim Zusammensetzen dokumentierte Entscheidungen
// getroffen werden. Es sind genau diese (alle werden in data/quellen/vob/import-protokoll.txt aufgelistet):
//   1. Zeilen eines Absatzes werden mit einem Leerzeichen verbunden.
//   2. Silbentrennung am Zeilenende („Ver-⏎weisung“): Der Trennstrich entfällt, wenn die nächste Zeile
//      klein weitergeht – außer das zusammengesetzte Wort mit Bindestrich kommt in den Quellen öfter vor
//      als ohne. Er bleibt (ohne Leerzeichen), wenn die nächste Zeile groß oder mit Ziffer beginnt
//      („Lebenszyklus-⏎Stadium“), und bleibt mit Leerzeichen, wenn „und/oder/sowie/bzw.“ folgt
//      (Ergänzungsstrich: „Mehr-⏎oder Minderkosten“ -> „Mehr- oder Minderkosten“).
//   3. Kopf- und Fußzeilen der Seiten (z. B. „Seite 3 von 57“, Seitenzahlen) und das gedrehte
//      Wasserzeichen „nichtamtliche Fassung“ der VOB/B-Lesefassung werden nicht übernommen.
//   4. Fußnoten: Das hochgestellte Fußnotenzeichen (erkannt an kleinerer Schrift und angehobener
//      Grundlinie, nicht am Zeichen selbst) wird aus dem Text genommen; der Fußnotentext steht in
//      „fussnoten“ der Norm („1 Richtlinie 2014/24/EU …“). Fußnoten an einer Abschnittsüberschrift
//      erhält der erste Paragraph des Abschnitts.
//   5. Ein größerer Zeilenabstand innerhalb eines Absatzes oder Listenpunkts (neuer Unterabsatz)
//      wird als Zeilenumbruch {t:"br"} gespeichert.
//   6. § 3a (Abschnitt 1): Die Änderungsbefehle der Bekanntmachungen vom 11.03.2025 (BAnz AT 02.04.2025 B7)
//      und 24.11.2025 (BAnz AT 16.12.2025 B7) werden auf den Text von 2019 angewendet. Der neue Wortlaut
//      wird dabei aus dem PDF der Änderungsbekanntmachung gelesen, nicht von Hand eingetragen.
//
// Quellen (Stand 17.11.2026):
//   VOB/A Abschnitt 1:     BAnz AT 19.02.2019 B2 (bundesanzeiger.de), § 3a i. d. F. BAnz AT 16.12.2025 B7
//   VOB/A Abschnitte 2, 3: BAnz AT 24.08.2026 B6 (bundesanzeiger.de), Ausgabe 2026
//   VOB/B:                 nichtamtliche Lesefassung 2016 der Fachinformation Bundesbau (fib-bund.de)
//
// Ablauf:
//   1. PDFs laden -> data/quellen/vob/*.pdf (werden nicht versioniert)
//   2. Text mit Lage und Schriftgröße auslesen (kleiner eigener PDF-Leser, siehe unten)
//      -> data/quellen/vob/*.txt (versioniert; eine Zeile je Textzeile im PDF, hochgestellt als ^{…})
//   3. Aus diesen Textzeilen Paragraphen, Absätze, Nummern und Buchstaben aufbauen -> JSON
//
// Aufruf:  node scripts/import-vob.mjs            (lädt die PDFs neu herunter und liest sie aus)
//          node scripts/import-vob.mjs --offline  (nutzt die gespeicherten Textauszüge bzw. PDFs)

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import zlib from "node:zlib";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const QUELL_DIR = path.join(ROOT, "data", "quellen", "vob");
const ZIEL_DIR = path.join(ROOT, "data", "gesetze");
const PROTOKOLL = path.join(QUELL_DIR, "import-protokoll.txt");
const HEADERS = { "User-Agent": "bau-normen-ki/0.1 (Import-Skript, einzelner Abruf einer Bekanntmachung)" };
const OFFLINE = process.argv.includes("--offline");

const QUELLEN = {
  b2019: {
    datei: "banz-at-2019-02-19-b2",
    name: "Bundesanzeiger, BAnz AT 19.02.2019 B2 – Bekanntmachung der VOB/A, Ausgabe 2019, vom 31. Januar 2019",
    url: "https://www.bundesanzeiger.de/pub/publication/6rfv3CSBFBPsvWR5ErQ/content/6rfv3CSBFBPsvWR5ErQ/BAnz%20AT%2019.02.2019%20B2.pdf?inline=",
    art: "banz",
  },
  b2025a: {
    datei: "banz-at-2025-04-02-b7",
    name: "Bundesanzeiger, BAnz AT 02.04.2025 B7 – Bekanntmachung der Änderung der VOB/A vom 11. März 2025 (Kopie des Bundesamts für Soziale Sicherung)",
    url: "https://www.bundesamtsozialesicherung.de/fileadmin/user_upload/BAnz_AT_02.04.2025_B7.pdf",
    art: "banz",
  },
  b2025b: {
    datei: "banz-at-2025-12-16-b7",
    name: "Bundesanzeiger, BAnz AT 16.12.2025 B7 – Bekanntmachung der Änderung der VOB/A vom 24. November 2025 (Kopie des forum vergabe e. V.)",
    url: "https://forum-vergabe.de/wp-content/uploads/2025/12/BAnz-AT-16.12.2025-B7.pdf",
    art: "banz",
  },
  b2026: {
    datei: "banz-at-2026-08-24-b6",
    name: "Bundesanzeiger, BAnz AT 24.08.2026 B6 – Bekanntmachung der VOB/A, Abschnitt 2 und 3, Ausgabe 2026, vom 22. Juli 2026",
    url: "https://bundesanzeiger.de/pub/publication/73xO0rpP1jfX5HRt0Ja/content/73xO0rpP1jfX5HRt0Ja/BAnz%20AT%2024.08.2026%20B6.pdf?inline=",
    art: "banz",
  },
  vobb: {
    datei: "fib-vob-b-2016",
    name: "Fachinformation Bundesbau (fib-bund.de) – VOB/B 2016, nichtamtliche Fassung",
    url: "https://www.fib-bund.de/Inhalt/Vergabe/VOB/VOB-B_2016_nichtamtliche_Fassung.pdf",
    art: "fib",
  },
};

// Seitenaufbau der beiden Layouts (Maße in PDF-Punkten, Ursprung unten links)
const LAYOUT = {
  // Bundesanzeiger: Kopfzeilen oberhalb y = 770, Fließtext ab x = 56,7, Fußnoten in 7 pt
  banz: { kopfAb: 770, fussBis: null, ueberschriftAb: 95, fussnotenUnter: 8, buendigeListen: [] },
  // fib-Lesefassung VOB/B: Seitenzahl unten (y < 90), Fließtext ab x = 113,4, Überschriften mittig
  // Nummern-Listen stehen dort bündig (Folgezeilen nicht eingerückt), Buchstaben-Listen hängend.
  fib: { kopfAb: null, fussBis: 90, ueberschriftAb: 180, fussnotenUnter: 8, buendigeListen: ["num"] },
};

const protokoll = [];
const notiere = (art, text) => protokoll.push(`[${art}] ${text}`);

// =====================================================================================
// 1. PDF lesen – gerade so viel, wie für Textauszug mit Lage und Schriftgröße nötig ist
//    (Querverweistabellen und -ströme, Objektströme, Flate, Standard-Verschlüsselung ohne Passwort,
//    Type1-/TrueType-/Type0-Schriften mit Kodierung, Differences und ToUnicode).
// =====================================================================================

class Ref {
  constructor(num, gen) {
    this.num = num;
    this.gen = gen;
  }
}
const LEER = new Set([0, 9, 10, 12, 13, 32]);
const TRENNER = new Set([..."()<>[]{}/%"].map((c) => c.charCodeAt(0)));
const istDict = (o) => o && typeof o === "object" && !Array.isArray(o) && !(o instanceof Ref) && !Buffer.isBuffer(o) && !o.stream;

class Lexer {
  constructor(buf, pos = 0) {
    this.b = buf;
    this.p = pos;
  }
  ueberspringe() {
    const b = this.b;
    for (;;) {
      while (this.p < b.length && LEER.has(b[this.p])) this.p++;
      if (b[this.p] !== 37) return; // % Kommentar
      while (this.p < b.length && b[this.p] !== 10 && b[this.p] !== 13) this.p++;
    }
  }
  token() {
    this.ueberspringe();
    const b = this.b;
    if (this.p >= b.length) return null;
    const c = b[this.p];
    if (c === 91) return this.p++, { t: "[" };
    if (c === 93) return this.p++, { t: "]" };
    if (c === 60 && b[this.p + 1] === 60) return (this.p += 2), { t: "<<" };
    if (c === 62 && b[this.p + 1] === 62) return (this.p += 2), { t: ">>" };
    if (c === 47) {
      let s = "";
      this.p++;
      while (this.p < b.length && !LEER.has(b[this.p]) && !TRENNER.has(b[this.p])) {
        if (b[this.p] === 35) {
          s += String.fromCharCode(parseInt(b.toString("latin1", this.p + 1, this.p + 3), 16));
          this.p += 3;
        } else s += String.fromCharCode(b[this.p++]);
      }
      return { t: "name", v: s };
    }
    if (c === 40) return { t: "str", v: this.literal() };
    if (c === 60) return { t: "str", v: this.hex() };
    const start = this.p;
    while (this.p < b.length && !LEER.has(b[this.p]) && !TRENNER.has(b[this.p])) this.p++;
    if (this.p === start) return this.p++, { t: "kw", v: String.fromCharCode(c) };
    const s = b.toString("latin1", start, this.p);
    if (/^[+-]?(\d+\.?\d*|\.\d+)$/.test(s)) return { t: "num", v: parseFloat(s) };
    return { t: "kw", v: s };
  }
  literal() {
    const b = this.b;
    const out = [];
    let tiefe = 1;
    this.p++;
    const esc = { 110: 10, 114: 13, 116: 9, 98: 8, 102: 12, 40: 40, 41: 41, 92: 92 };
    while (this.p < b.length) {
      const c = b[this.p++];
      if (c === 92) {
        const n = b[this.p++];
        if (n in esc) out.push(esc[n]);
        else if (n >= 48 && n <= 55) {
          let v = n - 48;
          for (let i = 0; i < 2 && b[this.p] >= 48 && b[this.p] <= 55; i++) v = v * 8 + (b[this.p++] - 48);
          out.push(v & 255);
        } else if (n === 13) {
          if (b[this.p] === 10) this.p++;
        } else if (n !== 10) out.push(n);
      } else if (c === 40) tiefe++, out.push(c);
      else if (c === 41) {
        if (--tiefe === 0) break;
        out.push(c);
      } else out.push(c);
    }
    return Buffer.from(out);
  }
  hex() {
    const b = this.b;
    let s = "";
    this.p++;
    while (this.p < b.length && b[this.p] !== 62) {
      const c = b[this.p++];
      if (!LEER.has(c)) s += String.fromCharCode(c);
    }
    this.p++;
    return Buffer.from(s.length % 2 ? s + "0" : s, "hex");
  }
  objekt(tok = this.token()) {
    if (!tok) throw new Error("PDF: unerwartetes Dateiende");
    switch (tok.t) {
      case "num": {
        const merk = this.p;
        const t2 = this.token();
        if (t2?.t === "num" && Number.isInteger(tok.v) && Number.isInteger(t2.v)) {
          const t3 = this.token();
          if (t3?.t === "kw" && t3.v === "R") return new Ref(tok.v, t2.v);
        }
        this.p = merk;
        return tok.v;
      }
      case "name":
      case "str":
        return tok.v;
      case "[": {
        const arr = [];
        for (let t = this.token(); t?.t !== "]"; t = this.token()) {
          if (!t) throw new Error("PDF: Array ohne Ende");
          arr.push(this.objekt(t));
        }
        return arr;
      }
      case "<<": {
        const d = Object.create(null);
        for (let t = this.token(); t?.t !== ">>"; t = this.token()) {
          if (t?.t !== "name") throw new Error(`PDF: Schlüssel erwartet, gefunden ${JSON.stringify(t)}`);
          d[t.v] = this.objekt();
        }
        return d;
      }
      case "kw":
        if (tok.v === "true") return true;
        if (tok.v === "false") return false;
        if (tok.v === "null") return null;
        return { kw: tok.v };
      default:
        throw new Error(`PDF: unerwartetes Token ${JSON.stringify(tok)}`);
    }
  }
}

function inflate(buf) {
  try {
    return zlib.inflateSync(buf);
  } catch {
    return zlib.inflateSync(buf, { finishFlush: zlib.constants.Z_SYNC_FLUSH });
  }
}
// PNG-Prädiktoren (für Querverweis-Ströme)
function praediktor(daten, parms) {
  const pred = parms?.Predictor ?? 1;
  if (pred === 1) return daten;
  if (pred < 10) throw new Error(`PDF: TIFF-Prädiktor ${pred} nicht unterstützt`);
  const bpp = Math.ceil(((parms.Colors ?? 1) * (parms.BitsPerComponent ?? 8)) / 8);
  const breite = Math.ceil(((parms.Colors ?? 1) * (parms.BitsPerComponent ?? 8) * (parms.Columns ?? 1)) / 8);
  const zeilen = Math.floor(daten.length / (breite + 1));
  const out = Buffer.alloc(zeilen * breite);
  let vorher = Buffer.alloc(breite);
  for (let r = 0; r < zeilen; r++) {
    const typ = daten[r * (breite + 1)];
    const z = Buffer.from(daten.subarray(r * (breite + 1) + 1, (r + 1) * (breite + 1)));
    for (let i = 0; i < breite; i++) {
      const a = i >= bpp ? z[i - bpp] : 0, b = vorher[i], c = i >= bpp ? vorher[i - bpp] : 0;
      if (typ === 1) z[i] = (z[i] + a) & 255;
      else if (typ === 2) z[i] = (z[i] + b) & 255;
      else if (typ === 3) z[i] = (z[i] + ((a + b) >> 1)) & 255;
      else if (typ === 4) {
        const p = a + b - c, pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c);
        z[i] = (z[i] + (pa <= pb && pa <= pc ? a : pb <= pc ? b : c)) & 255;
      } else if (typ !== 0) throw new Error(`PDF: PNG-Filter ${typ} unbekannt`);
    }
    z.copy(out, r * breite);
    vorher = z;
  }
  return out;
}

const PASSWORT_FUELLUNG = Buffer.from("28BF4E5E4E758A4164004E56FFFA01082E2E00B6D0683E802F0CA9FE6453697A", "hex");
function rc4(key, data) {
  const s = [...Array(256).keys()];
  for (let i = 0, j = 0; i < 256; i++) {
    j = (j + s[i] + key[i % key.length]) & 255;
    [s[i], s[j]] = [s[j], s[i]];
  }
  const out = Buffer.alloc(data.length);
  for (let k = 0, i = 0, j = 0; k < data.length; k++) {
    i = (i + 1) & 255;
    j = (j + s[i]) & 255;
    [s[i], s[j]] = [s[j], s[i]];
    out[k] = data[k] ^ s[(s[i] + s[j]) & 255];
  }
  return out;
}

class PdfDatei {
  constructor(buf) {
    this.b = buf;
    this.eintraege = new Map();
    this.cache = new Map();
    this.objStroeme = new Map();
    this.trailer = null;
    this.schluessel = null;
    const ende = buf.toString("latin1", Math.max(0, buf.length - 1024));
    const m = [...ende.matchAll(/startxref\s+(\d+)/g)].pop();
    if (!m) throw new Error("PDF: startxref nicht gefunden");
    const gesehen = new Set();
    for (let off = Number(m[1]); off != null && !gesehen.has(off); ) {
      gesehen.add(off);
      const t = this.leseXref(off);
      this.trailer ??= t;
      if (t.XRefStm != null) this.leseXref(t.XRefStm);
      off = t.Prev ?? null;
    }
    if (this.trailer.Encrypt) this.verschluesselung();
  }
  leseXref(off) {
    const lx = new Lexer(this.b, off);
    const t = lx.token();
    if (t.t === "kw" && t.v === "xref") {
      for (;;) {
        const a = lx.token();
        if (a.t === "kw" && a.v === "trailer") return lx.objekt();
        const anzahl = lx.token().v;
        for (let i = 0; i < anzahl; i++) {
          const o = lx.token().v, g = lx.token().v, art = lx.token().v;
          if (!this.eintraege.has(a.v + i)) this.eintraege.set(a.v + i, art === "n" ? { typ: 1, off: o } : { typ: 0 });
        }
      }
    }
    const s = this.leseObjekt(off, null);
    if (s.dict?.Type !== "XRef") throw new Error(`PDF: kein Querverweis an Offset ${off}`);
    const daten = this.dekodiere(s, false);
    const [w1, w2, w3] = s.dict.W;
    const index = s.dict.Index ?? [0, s.dict.Size];
    let p = 0;
    const feld = (n, standard) => {
      if (!n) return standard;
      let v = 0;
      for (let i = 0; i < n; i++) v = v * 256 + daten[p++];
      return v;
    };
    for (let k = 0; k < index.length; k += 2)
      for (let i = 0; i < index[k + 1]; i++) {
        const typ = feld(w1, 1), f2 = feld(w2, 0), f3 = feld(w3, 0);
        if (this.eintraege.has(index[k] + i)) continue;
        this.eintraege.set(index[k] + i, typ === 1 ? { typ: 1, off: f2 } : typ === 2 ? { typ: 2, strom: f2, idx: f3 } : { typ: 0 });
      }
    return s.dict;
  }
  leseObjekt(off, erwartet) {
    const lx = new Lexer(this.b, off);
    const n = lx.token(), g = lx.token(), kw = lx.token();
    if (n?.t !== "num" || g?.t !== "num" || kw?.v !== "obj") throw new Error(`PDF: kein Objekt an Offset ${off}`);
    if (erwartet != null && n.v !== erwartet) throw new Error(`PDF: Objekt ${erwartet} erwartet, ${n.v} gefunden`);
    const wert = lx.objekt();
    const merk = lx.p;
    const t = lx.token();
    if (istDict(wert) && t?.t === "kw" && t.v === "stream") {
      let p = lx.p;
      if (this.b[p] === 13) p++;
      if (this.b[p] === 10) p++;
      let ende = p + this.hole(wert.Length);
      if (!/^\s*endstream/.test(this.b.toString("latin1", ende, ende + 20))) {
        ende = this.b.indexOf("endstream", p, "latin1");
        while (ende > p && (this.b[ende - 1] === 10 || this.b[ende - 1] === 13)) ende--;
      }
      return { stream: true, dict: wert, roh: this.b.subarray(p, ende), num: n.v, gen: g.v };
    }
    lx.p = merk;
    return wert;
  }
  hole(x) {
    if (!(x instanceof Ref)) return x;
    if (this.cache.has(x.num)) return this.cache.get(x.num);
    const e = this.eintraege.get(x.num);
    let wert = null;
    if (e?.typ === 1) wert = this.leseObjekt(e.off, x.num);
    else if (e?.typ === 2) {
      let os = this.objStroeme.get(e.strom);
      if (!os) {
        const s = this.hole(new Ref(e.strom, 0));
        const daten = this.dekodiere(s);
        const lx = new Lexer(daten, 0);
        const paare = [];
        for (let i = 0; i < s.dict.N; i++) paare.push([lx.token().v, lx.token().v]);
        os = { daten, paare, first: s.dict.First };
        this.objStroeme.set(e.strom, os);
      }
      const [num, off] = os.paare[e.idx];
      if (num !== x.num) throw new Error(`PDF: Objektstrom ${e.strom}: ${x.num} erwartet, ${num} gefunden`);
      wert = new Lexer(os.daten, os.first + off).objekt();
    }
    this.cache.set(x.num, wert);
    return wert;
  }
  // Standard-Sicherheitshandler (R2–R4, RC4/AES-128) mit leerem Benutzerpasswort:
  // Solche PDFs sind frei lesbar, nur Rechte wie Bearbeiten sind eingeschränkt.
  verschluesselung() {
    const enc = this.hole(this.trailer.Encrypt);
    if (enc.Filter !== "Standard" || enc.R > 4) throw new Error(`PDF: Verschlüsselung ${enc.Filter} R${enc.R} nicht unterstützt`);
    const laenge = (enc.V === 1 ? 40 : enc.Length ?? 128) / 8;
    const id0 = this.hole(this.trailer.ID)[0];
    const p = Buffer.alloc(4);
    p.writeInt32LE(enc.P);
    const h = crypto.createHash("md5").update(PASSWORT_FUELLUNG).update(enc.O).update(p).update(id0);
    if (enc.R >= 4 && enc.EncryptMetadata === false) h.update(Buffer.from([255, 255, 255, 255]));
    let key = h.digest().subarray(0, laenge);
    if (enc.R >= 3) for (let i = 0; i < 50; i++) key = crypto.createHash("md5").update(key).digest().subarray(0, laenge);
    if (enc.R >= 3) {
      let u = rc4(key, crypto.createHash("md5").update(PASSWORT_FUELLUNG).update(id0).digest());
      for (let i = 1; i <= 19; i++) u = rc4(key.map((k) => k ^ i), u);
      if (!u.equals(enc.U.subarray(0, 16))) throw new Error("PDF ist mit einem Benutzerpasswort geschützt");
    }
    const cfm = enc.V === 4 ? enc.CF?.[enc.StmF]?.CFM : "V2";
    if (!["V2", "AESV2"].includes(cfm)) throw new Error(`PDF: Kryptfilter ${cfm} nicht unterstützt`);
    this.schluessel = { key, aes: cfm === "AESV2", encNum: this.trailer.Encrypt instanceof Ref ? this.trailer.Encrypt.num : -1 };
  }
  dekodiere(strom, entschluesseln = true) {
    let daten = strom.roh;
    if (entschluesseln && this.schluessel && strom.dict.Type !== "XRef" && strom.num !== this.schluessel.encNum) {
      const z = Buffer.alloc(5);
      z.writeUIntLE(strom.num, 0, 3);
      z.writeUIntLE(strom.gen, 3, 2);
      const h = crypto.createHash("md5").update(this.schluessel.key).update(z);
      if (this.schluessel.aes) h.update("sAlT");
      const k = h.digest().subarray(0, Math.min(this.schluessel.key.length + 5, 16));
      if (!this.schluessel.aes) daten = rc4(k, daten);
      else {
        const d = crypto.createDecipheriv("aes-128-cbc", k, daten.subarray(0, 16));
        daten = Buffer.concat([d.update(daten.subarray(16)), d.final()]);
      }
    }
    const filter = [this.hole(strom.dict.Filter) ?? []].flat();
    const parms = [this.hole(strom.dict.DecodeParms) ?? []].flat();
    filter.forEach((f, i) => {
      if (f !== "FlateDecode" && f !== "Fl") throw new Error(`PDF: Filter ${f} nicht unterstützt`);
      daten = praediktor(inflate(daten), this.hole(parms[i]));
    });
    return daten;
  }
  seiten() {
    const out = [];
    const geh = (knoten, erbe) => {
      const k = this.hole(knoten);
      const e = { ...erbe };
      if (k.Resources !== undefined) e.Resources = k.Resources;
      if (k.Kids) for (const kid of this.hole(k.Kids)) geh(kid, e);
      else out.push({ dict: k, ressourcen: this.hole(e.Resources) });
    };
    geh(this.hole(this.trailer.Root).Pages, {});
    return out;
  }
  inhalt(seite) {
    const c = [this.hole(seite.dict.Contents) ?? []].flat();
    return Buffer.concat(c.flatMap((s) => [this.dekodiere(this.hole(s)), Buffer.from("\n")]));
  }
}

// --- Schriften: Zeichencode -> Unicode und Breite ---
// Glyphennamen -> Unicode (Teilmenge der Adobe Glyph List; ein unbekannter Name führt zu einem Fehler)
const GLYPHEN = (() => {
  const g = {
    space: " ", exclam: "!", quotedbl: '"', numbersign: "#", dollar: "$", percent: "%", ampersand: "&", quotesingle: "'",
    parenleft: "(", parenright: ")", asterisk: "*", plus: "+", comma: ",", hyphen: "-", period: ".", slash: "/",
    zero: "0", one: "1", two: "2", three: "3", four: "4", five: "5", six: "6", seven: "7", eight: "8", nine: "9",
    colon: ":", semicolon: ";", less: "<", equal: "=", greater: ">", question: "?", at: "@", bracketleft: "[",
    backslash: "\\", bracketright: "]", asciicircum: "^", underscore: "_", grave: "`", braceleft: "{", bar: "|",
    braceright: "}", asciitilde: "~", quoteleft: "‘", quoteright: "’", quotesinglbase: "‚",
    quotedblleft: "“", quotedblright: "”", quotedblbase: "„", guillemotleft: "«", guillemotright: "»",
    guilsinglleft: "‹", guilsinglright: "›", endash: "–", emdash: "—", bullet: "•", ellipsis: "…",
    dagger: "†", daggerdbl: "‡", perthousand: "‰", Euro: "€", florin: "ƒ", trademark: "™",
    minus: "−", section: "§", paragraph: "¶", degree: "°", copyright: "©", registered: "®",
    cent: "¢", sterling: "£", yen: "¥", currency: "¤", brokenbar: "¦", dieresis: "¨",
    ordfeminine: "ª", ordmasculine: "º", logicalnot: "¬", macron: "¯", plusminus: "±",
    twosuperior: "²", threesuperior: "³", onesuperior: "¹", acute: "´", mu: "µ",
    periodcentered: "·", cedilla: "¸", onequarter: "¼", onehalf: "½", threequarters: "¾",
    exclamdown: "¡", questiondown: "¿", multiply: "×", divide: "÷", germandbls: "ß",
    dotlessi: "ı", circumflex: "ˆ", tilde: "˜", breve: "˘", dotaccent: "˙", ring: "˚",
    ogonek: "˛", caron: "ˇ", hungarumlaut: "˝", AE: "Æ", ae: "æ", OE: "Œ", oe: "œ",
    Oslash: "Ø", oslash: "ø", Eth: "Ð", eth: "ð", Thorn: "Þ", thorn: "þ", Scaron: "Š",
    scaron: "š", Zcaron: "Ž", zcaron: "ž", Ydieresis: "Ÿ",
  };
  for (let c = 65; c <= 90; c++) g[String.fromCharCode(c)] = String.fromCharCode(c);
  for (let c = 97; c <= 122; c++) g[String.fromCharCode(c)] = String.fromCharCode(c);
  const akzente = { acute: "́", grave: "̀", circumflex: "̂", dieresis: "̈", tilde: "̃", ring: "̊", cedilla: "̧" };
  for (const b of "AEIOUYCNaeiouycn")
    for (const [name, komb] of Object.entries(akzente)) {
      const z = (b + komb).normalize("NFC");
      if (z.length === 1) g[b + name] = z;
    }
  return g;
})();
function glyphUnicode(name) {
  if (name in GLYPHEN) return GLYPHEN[name];
  let m = name.match(/^uni((?:[0-9A-F]{4})+)$/);
  if (m) return m[1].match(/.{4}/g).map((h) => String.fromCharCode(parseInt(h, 16))).join("");
  m = name.match(/^u([0-9A-F]{4,6})$/);
  return m ? String.fromCodePoint(parseInt(m[1], 16)) : null;
}
const WIN_ANSI = (() => {
  const d = new TextDecoder("windows-1252");
  return Array.from({ length: 256 }, (_, i) => (i < 32 ? undefined : d.decode(Uint8Array.of(i))));
})();
function leseCMap(daten) {
  const s = daten.toString("latin1");
  const map = new Map();
  const utf16 = (hex) => Buffer.from(hex, "hex").swap16().toString("utf16le");
  for (const blk of s.matchAll(/beginbfchar([\s\S]*?)endbfchar/g))
    for (const m of blk[1].matchAll(/<([0-9A-Fa-f]+)>\s*<([0-9A-Fa-f]*)>/g)) map.set(parseInt(m[1], 16), utf16(m[2]));
  for (const blk of s.matchAll(/beginbfrange([\s\S]*?)endbfrange/g))
    for (const m of blk[1].matchAll(/<([0-9A-Fa-f]+)>\s*<([0-9A-Fa-f]+)>\s*(?:<([0-9A-Fa-f]+)>|\[([^\]]*)\])/g)) {
      const lo = parseInt(m[1], 16), hi = parseInt(m[2], 16);
      const ziele = m[4] !== undefined ? [...m[4].matchAll(/<([0-9A-Fa-f]*)>/g)].map((x) => utf16(x[1])) : null;
      for (let c = lo; c <= hi; c++) {
        if (ziele) map.set(c, ziele[c - lo]);
        else {
          const z = Buffer.from(m[3], "hex");
          z.writeUInt16BE((z.readUInt16BE(z.length - 2) + (c - lo)) & 0xffff, z.length - 2);
          map.set(c, z.swap16().toString("utf16le"));
        }
      }
    }
  return map;
}
function ladeSchrift(pdf, ref) {
  const f = pdf.hole(ref);
  const name = String(f.BaseFont ?? "").replace(/^[A-Z]{6}\+/, "");
  const fett = /bold|-bd|black|heavy/i.test(name);
  const tu = f.ToUnicode ? leseCMap(pdf.dekodiere(pdf.hole(f.ToUnicode))) : null;
  if (f.Subtype === "Type0") {
    if (pdf.hole(f.Encoding) !== "Identity-H" || !tu) throw new Error(`Schrift ${name}: nur Identity-H mit ToUnicode unterstützt`);
    const nach = pdf.hole(pdf.hole(f.DescendantFonts)[0]);
    const breiten = new Map();
    const w = pdf.hole(nach.W) ?? [];
    for (let i = 0; i < w.length; ) {
      const n = pdf.hole(w[i + 1]);
      if (Array.isArray(n)) n.forEach((b, k) => breiten.set(w[i] + k, pdf.hole(b))), (i += 2);
      else {
        for (let k = w[i]; k <= n; k++) breiten.set(k, pdf.hole(w[i + 2]));
        i += 3;
      }
    }
    return {
      name, fett, bytes: 2,
      unicode: (code) => {
        if (!tu.has(code)) throw new Error(`Schrift ${name}: Zeichen ${code} ohne Unicode-Zuordnung`);
        return tu.get(code);
      },
      breite: (code) => breiten.get(code) ?? nach.DW ?? 1000,
    };
  }
  if (!["Type1", "TrueType", "MMType1"].includes(f.Subtype)) throw new Error(`Schrifttyp ${f.Subtype} (${name}) nicht unterstützt`);
  const enc = pdf.hole(f.Encoding);
  const basis = typeof enc === "string" ? enc : enc?.BaseEncoding;
  const tabelle = basis === "WinAnsiEncoding" || (!basis && f.Subtype === "TrueType") ? WIN_ANSI : [];
  if (basis && basis !== "WinAnsiEncoding" && basis !== "StandardEncoding") throw new Error(`Kodierung ${basis} nicht unterstützt`);
  const glyphNamen = new Map();
  let code = 0;
  for (const d of (enc && typeof enc === "object" && enc.Differences) || []) {
    if (typeof d === "number") code = d;
    else glyphNamen.set(code++, d);
  }
  const widths = pdf.hole(f.Widths);
  if (!widths) throw new Error(`Schrift ${name} ohne Breitenangaben`);
  const missing = pdf.hole(f.FontDescriptor)?.MissingWidth ?? 0;
  return {
    name, fett, bytes: 1,
    unicode: (c) => {
      if (tu?.has(c)) return tu.get(c);
      if (glyphNamen.has(c)) {
        const u = glyphUnicode(glyphNamen.get(c));
        if (u === null) throw new Error(`Schrift ${name}: Glyphenname /${glyphNamen.get(c)} (Code ${c}) unbekannt`);
        return u;
      }
      if (tabelle[c] === undefined) throw new Error(`Schrift ${name}: Code ${c} ohne Zuordnung`);
      return tabelle[c];
    },
    breite: (c) => pdf.hole(widths[c - (f.FirstChar ?? 0)]) ?? missing,
  };
}

// --- Inhaltsstrom einer Seite auswerten: jede Glyphe mit Position, Breite, Größe, Drehung ---
const mul = (m, n) => [
  m[0] * n[0] + m[1] * n[2], m[0] * n[1] + m[1] * n[3],
  m[2] * n[0] + m[3] * n[2], m[2] * n[1] + m[3] * n[3],
  m[4] * n[0] + m[5] * n[2] + n[4], m[4] * n[1] + m[5] * n[3] + n[5],
];
function seitenGlyphen(pdf, seite) {
  const glyphen = [];
  const schriften = new Map();
  const lauf = (daten, ressourcen, ctm0, tiefe) => {
    if (tiefe > 8) throw new Error("PDF: zu tief verschachtelte Formulare");
    const lx = new Lexer(daten, 0);
    let gs = { ctm: ctm0, font: null, size: 0, Tc: 0, Tw: 0, Th: 1, TL: 0, Ts: 0 };
    const stapel = [];
    let Tm = [1, 0, 0, 1, 0, 0], Tlm = Tm, ops = [];
    const schrift = (name) => {
      const ref = pdf.hole(ressourcen?.Font)?.[name];
      if (!ref) throw new Error(`PDF: Schrift ${name} fehlt in den Ressourcen`);
      const key = ref instanceof Ref ? ref.num : name;
      if (!schriften.has(key)) schriften.set(key, ladeSchrift(pdf, ref));
      return schriften.get(key);
    };
    const zeige = (bytes) => {
      const f = gs.font;
      for (let i = 0; i + f.bytes <= bytes.length; i += f.bytes) {
        const code = f.bytes === 2 ? bytes.readUInt16BE(i) : bytes[i];
        const w0 = f.breite(code) / 1000;
        const trm = mul([gs.size * gs.Th, 0, 0, gs.size, 0, gs.Ts], mul(Tm, gs.ctm));
        glyphen.push({
          u: f.unicode(code), x0: trm[4], x1: trm[4] + w0 * trm[0], y: trm[5],
          groesse: Math.hypot(trm[2], trm[3]), fett: f.fett,
          drehung: Math.abs(trm[1]) > 1e-6 || Math.abs(trm[2]) > 1e-6 || trm[0] < 0 || trm[3] < 0,
        });
        Tm = mul([1, 0, 0, 1, (w0 * gs.size + gs.Tc + (f.bytes === 1 && code === 32 ? gs.Tw : 0)) * gs.Th, 0], Tm);
      }
    };
    const naechsteZeile = () => (Tm = Tlm = mul([1, 0, 0, 1, 0, -gs.TL], Tlm));
    for (let tok = lx.token(); tok; tok = lx.token()) {
      if (tok.t !== "kw") {
        ops.push(lx.objekt(tok));
        continue;
      }
      const a = ops;
      ops = [];
      switch (tok.v) {
        case "q": stapel.push({ ...gs }); break;
        case "Q": gs = stapel.pop() ?? gs; break;
        case "cm": gs.ctm = mul(a, gs.ctm); break;
        case "BT": Tm = Tlm = [1, 0, 0, 1, 0, 0]; break;
        case "Tf": gs.font = schrift(a[0]); gs.size = a[1]; break;
        case "Tc": gs.Tc = a[0]; break;
        case "Tw": gs.Tw = a[0]; break;
        case "Tz": gs.Th = a[0] / 100; break;
        case "TL": gs.TL = a[0]; break;
        case "Ts": gs.Ts = a[0]; break;
        case "Td": Tm = Tlm = mul([1, 0, 0, 1, a[0], a[1]], Tlm); break;
        case "TD": gs.TL = -a[1]; Tm = Tlm = mul([1, 0, 0, 1, a[0], a[1]], Tlm); break;
        case "Tm": Tm = Tlm = a.slice(0, 6); break;
        case "T*": naechsteZeile(); break;
        case "Tj": zeige(a[0]); break;
        case "'": naechsteZeile(); zeige(a[0]); break;
        case '"': gs.Tw = a[0]; gs.Tc = a[1]; naechsteZeile(); zeige(a[2]); break;
        case "TJ":
          for (const e of a[0]) {
            if (typeof e === "number") Tm = mul([1, 0, 0, 1, (-e / 1000) * gs.size * gs.Th, 0], Tm);
            else zeige(e);
          }
          break;
        case "Do": {
          const xo = pdf.hole(pdf.hole(ressourcen?.XObject)?.[a[0]]);
          if (xo?.dict?.Subtype === "Form") {
            stapel.push({ ...gs });
            lauf(pdf.dekodiere(xo), pdf.hole(xo.dict.Resources) ?? ressourcen, mul(pdf.hole(xo.dict.Matrix) ?? [1, 0, 0, 1, 0, 0], gs.ctm), tiefe + 1);
            gs = stapel.pop();
          }
          break;
        }
        case "BI": { // eingebettetes Bild überspringen
          let e = daten.indexOf("ID", lx.p, "latin1");
          do e = daten.indexOf("EI", e + 2, "latin1");
          while (e > 0 && !(LEER.has(daten[e - 1]) && (e + 2 >= daten.length || LEER.has(daten[e + 2]))));
          if (e < 0) throw new Error("PDF: Inline-Bild ohne Ende");
          lx.p = e + 2;
          break;
        }
        default: // Grafikoperatoren u. Ä. spielen für den Text keine Rolle
      }
    }
  };
  lauf(pdf.inhalt(seite), seite.ressourcen, [1, 0, 0, 1, 0, 0], 0);
  return glyphen;
}

// --- Glyphen zu Zeilen zusammensetzen ---
// Zeilen = gleiche Grundlinie. Kleinere, angehobene Glyphen (Fußnotenzeichen) gehören zur Zeile darunter
// und werden als ^{…} markiert. Leerzeichen: echte Leerzeichen-Glyphen oder eine Lücke von mehr als
// 0,15 Schriftgrößen (Wortabstände liegen in diesen PDFs bei 0,18–0,5, Abstände im Wort bei höchstens 0,02).
function bildeZeilen(glyphen) {
  const gedreht = glyphen.filter((g) => g.drehung).map((g) => g.u).join("");
  const sortiert = glyphen.filter((g) => !g.drehung).map((g, i) => ({ ...g, i })).sort((a, b) => b.y - a.y || a.i - b.i);
  const gruppen = [];
  for (const g of sortiert) {
    const letzte = gruppen[gruppen.length - 1];
    if (letzte && letzte.y - g.y < 0.8) letzte.g.push(g);
    else gruppen.push({ y: g.y, g: [g] });
  }
  const groesse = (gl) => {
    const z = new Map();
    for (const g of gl) if (g.u.trim()) z.set(Math.round(g.groesse * 10) / 10, (z.get(Math.round(g.groesse * 10) / 10) ?? 0) + 1);
    return [...z.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? 0;
  };
  for (const gr of gruppen) gr.groesse = groesse(gr.g);
  gruppen.forEach((gr, k) => {
    const unten = gruppen.slice(k + 1).find((h) => h.y < gr.y - 0.8);
    if (!unten || !gr.g.length) return;
    const xs = gr.g.map((g) => g.x0), xe = gr.g.map((g) => g.x1), us = unten.g.map((g) => g.x0), ue = unten.g.map((g) => g.x1);
    if (
      gr.groesse < unten.groesse * 0.85 && gr.y - unten.y < unten.groesse * 0.6 &&
      Math.min(...xs) >= Math.min(...us) - unten.groesse * 3 && Math.max(...xe) <= Math.max(...ue) + unten.groesse * 2
    ) {
      for (const g of gr.g) unten.g.push({ ...g, hoch: true });
      gr.g = [];
    }
  });
  const zeilen = [];
  for (const gr of gruppen) {
    if (!gr.g.length) continue;
    const gl = gr.g.sort((a, b) => a.x0 - b.x0 || a.i - b.i);
    let text = "", rechts = -Infinity, leer = false, hoch = false;
    const sichtbar = [];
    for (const g of gl) {
      if (/^\s$/.test(g.u) && g.u !== " ") {
        leer = true;
        rechts = Math.max(rechts, g.x1);
        continue;
      }
      if (text && (leer || g.x0 - rechts > 0.15 * Math.min(g.groesse, gr.groesse))) {
        if (hoch) (text += "}"), (hoch = false);
        text += " ";
      }
      leer = false;
      if (!!g.hoch !== hoch) (text += g.hoch ? "^{" : "}"), (hoch = !!g.hoch);
      text += g.u;
      rechts = Math.max(rechts, g.x1);
      sichtbar.push(g);
    }
    if (hoch) text += "}";
    if (!sichtbar.length) continue;
    const normal = sichtbar.filter((g) => !g.hoch);
    const fett = normal.filter((g) => g.fett).length / Math.max(1, normal.length);
    zeilen.push({
      y: gr.y, x0: sichtbar[0].x0, x1: Math.max(...sichtbar.map((g) => g.x1)), groesse: gr.groesse,
      fett: fett > 0.999 ? "f" : fett > 0 ? "t" : "", text,
    });
  }
  return { zeilen, gedreht };
}

// =====================================================================================
// 2. Quellen laden und Textauszüge (data/quellen/vob/*.txt) schreiben bzw. lesen
// =====================================================================================

const pdfPfad = (q) => path.join(QUELL_DIR, q.datei + ".pdf");
const txtPfad = (q) => path.join(QUELL_DIR, q.datei + ".txt");
const z1 = (n) => n.toFixed(1).padStart(6);

async function ladeQuelle(q) {
  fs.mkdirSync(QUELL_DIR, { recursive: true });
  if (!OFFLINE) {
    const res = await fetch(q.url, { headers: HEADERS });
    if (!res.ok) throw new Error(`Download fehlgeschlagen (${q.url}): HTTP ${res.status}`);
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.subarray(0, 5).toString("latin1") !== "%PDF-") throw new Error(`Keine PDF-Datei: ${q.url}`);
    fs.writeFileSync(pdfPfad(q), buf);
  }
  if (!OFFLINE || !fs.existsSync(txtPfad(q))) {
    if (!fs.existsSync(pdfPfad(q))) throw new Error(`Weder Textauszug noch PDF vorhanden: ${q.datei} (erst ohne --offline ausführen)`);
    const buf = fs.readFileSync(pdfPfad(q));
    const pdf = new PdfDatei(buf);
    const zeilen = [
      `# ${q.name}`,
      `# Quelle: ${q.url}`,
      `# PDF: ${q.datei}.pdf, ${buf.length} Bytes, SHA-256 ${crypto.createHash("sha256").update(buf).digest("hex")}`,
      `# Abgerufen: ${new Date(fs.statSync(pdfPfad(q)).mtime).toISOString().slice(0, 10)}`,
      `# Textauszug von scripts/import-vob.mjs – bitte nicht von Hand ändern. Je Textzeile im PDF:`,
      `#   Grundlinie y | linker Rand x0 | rechter Rand x1 | Schriftgröße (f = fett, t = teilweise fett) | Text`,
      `#   (PDF-Punkte, Ursprung unten links). Hochgestellte Zeichen stehen als ^{…}.`,
      `#   „gedreht:“ = Text, der nicht waagerecht steht (z. B. ein Wasserzeichen), wird nicht übernommen.`,
    ];
    pdf.seiten().forEach((seite, i) => {
      const { zeilen: zz, gedreht } = bildeZeilen(seitenGlyphen(pdf, seite));
      zeilen.push(`=== Seite ${i + 1} ===`);
      if (gedreht) zeilen.push(`gedreht: ${gedreht}`);
      for (const z of zz) {
        if (/\^\{|\}/.test(z.text.replace(/\^\{[^{}]*\}/g, ""))) throw new Error(`${q.datei} S. ${i + 1}: Text enthält Steuerzeichen ^{ }: ${z.text}`);
        zeilen.push(`${z1(z.y)} ${z1(z.x0)} ${z1(z.x1)} ${z.groesse.toFixed(1)}${z.fett.padEnd(1)} | ${z.text}`);
      }
    });
    fs.writeFileSync(txtPfad(q), zeilen.join("\n") + "\n");
  }
  return leseRohtext(q);
}

function leseRohtext(q) {
  const seiten = [];
  const kopf = {};
  for (const l of fs.readFileSync(txtPfad(q), "utf8").split("\n")) {
    if (!l) continue;
    let m;
    if ((m = l.match(/^# Abgerufen: (\S+)/))) kopf.abgerufen = m[1];
    else if ((m = l.match(/^# PDF: .*SHA-256 (\w+)/))) kopf.sha256 = m[1];
    else if (l.startsWith("#")) continue;
    else if ((m = l.match(/^=== Seite (\d+) ===$/))) seiten.push({ nr: Number(m[1]), gedreht: "", zeilen: [] });
    else if ((m = l.match(/^gedreht: (.*)$/))) seiten[seiten.length - 1].gedreht = m[1];
    else if ((m = l.match(/^\s*(-?[\d.]+)\s+(-?[\d.]+)\s+(-?[\d.]+)\s+([\d.]+)([ft]?)\s+\| (.*)$/)))
      seiten[seiten.length - 1].zeilen.push({ y: +m[1], x0: +m[2], x1: +m[3], groesse: +m[4], fett: m[5], text: m[6], seite: seiten.length });
    else throw new Error(`${q.datei}.txt: Zeile nicht lesbar: ${l}`);
  }
  return { ...q, kopf, seiten };
}

// =====================================================================================
// 3. Seiten bereinigen: Kopf-/Fußzeilen weg, Fußnoten heraus, Fließtextzeilen sammeln
// =====================================================================================

const KOPFZEILE = [/^Bekanntmachung$/, /^Veröffentlicht am \S+, \d+\. \S+ \d{4}$/, /^BAnz AT \d\d\.\d\d\.\d{4} B\d+$/, /^(www\.bundesanzeiger\.de )?Seite \d+ von \d+$/];

function textzeilen(roh, von, bis) {
  const layout = LAYOUT[roh.art];
  const zeilen = [];
  const fussnoten = new Map(); // Seite -> [{nr, text-Zeilen}]
  let wasserzeichen = 0;
  for (const s of roh.seiten.slice(von - 1, bis)) {
    if (s.gedreht) {
      if (s.gedreht !== "nichtamtliche Fassung") throw new Error(`${roh.datei} S. ${s.nr}: unerwarteter gedrehter Text „${s.gedreht}“`);
      wasserzeichen++;
    }
    const fn = [];
    let fliesstextEnde = Infinity;
    for (const z of s.zeilen) {
      if (layout.kopfAb != null && z.y > layout.kopfAb) {
        if (!KOPFZEILE.some((re) => re.test(z.text))) throw new Error(`${roh.datei} S. ${s.nr}: unbekannte Kopfzeile „${z.text}“`);
        continue;
      }
      if (layout.fussBis != null && z.y < layout.fussBis) {
        if (!/^\d+$/.test(z.text) || Number(z.text) !== s.nr) throw new Error(`${roh.datei} S. ${s.nr}: unbekannte Fußzeile „${z.text}“`);
        continue;
      }
      if (z.groesse < layout.fussnotenUnter) {
        const m = z.text.match(/^\^\{(\d+)\} (.*)$/);
        if (m) fn.push({ nr: m[1], zeilen: [{ ...z, text: m[2] }] });
        else if (fn.length) fn[fn.length - 1].zeilen.push(z);
        else throw new Error(`${roh.datei} S. ${s.nr}: Kleingedrucktes ohne Fußnotenzeichen (Fortsetzung einer Fußnote?): „${z.text}“`);
        fliesstextEnde = Math.min(fliesstextEnde, z.y);
        continue;
      }
      if (z.y < fliesstextEnde && fn.length) throw new Error(`${roh.datei} S. ${s.nr}: Fließtext unterhalb der Fußnoten`);
      zeilen.push(z);
    }
    if (fn.length) fussnoten.set(s.nr, fn);
  }
  if (wasserzeichen) notiere("Wasserzeichen", `${roh.datei}: gedrehter Text „nichtamtliche Fassung“ auf ${wasserzeichen} Seiten nicht übernommen.`);
  // Zeilenabstand zur vorigen Zeile (nur innerhalb einer Seite)
  zeilen.forEach((z, i) => (z.abstand = i && zeilen[i - 1].seite === z.seite ? zeilen[i - 1].y - z.y : null));
  return { zeilen, fussnoten };
}

// =====================================================================================
// 4. Zeilen verbinden: Leerzeichen bzw. Silbentrennung (Wortbestand aus allen Quellen)
// =====================================================================================

const wortbestand = new Map();
const woerter = (s) => s.replace(/\^\{[^}]*\}/g, "").split(/\s+/).map((t) => t.replace(/^[„"(\[]+|[“",.;:)\]!?]+$/g, "")).filter(Boolean);
function baueWortbestand(alleRohtexte) {
  for (const roh of alleRohtexte)
    for (const s of roh.seiten)
      s.zeilen.forEach((z, i) => {
        const w = woerter(z.text);
        const vorher = s.zeilen[i - 1]?.text ?? "";
        w.forEach((t, k) => {
          if (k === w.length - 1 && t.endsWith("-")) return; // getrenntes Wort am Zeilenende
          if (k === 0 && /-$/.test(vorher)) return; // Rest eines getrennten Worts
          wortbestand.set(t, (wortbestand.get(t) ?? 0) + 1);
        });
      });
}
const anzahl = (w) => wortbestand.get(w) ?? 0;
const ERGAENZUNG = /^(und|oder|sowie|bzw\.)$/;

// Hängt die Zeile `rechts` an den Text `links` an. `ort` dient nur dem Protokoll.
function verbinde(links, rechts, ort) {
  if (!/[A-Za-zÄÖÜäöüß]-$/.test(links)) {
    if (/\/$/.test(links)) notiere("Zeilenende", `${ort}: Zeile endet mit „/“ – mit Leerzeichen verbunden`);
    return links + " " + rechts;
  }
  const stamm = links.split(/\s+/).pop().replace(/^[„"(\[]+/, "").slice(0, -1);
  const erstes = rechts.split(/\s+/)[0];
  const rest = woerter(erstes)[0] ?? "";
  if (ERGAENZUNG.test(erstes.replace(/,$/, ""))) {
    notiere("Ergänzungsstrich", `${ort}: „${stamm}-⏎${erstes}“ -> „${stamm}- ${erstes}“`);
    return links + " " + rechts;
  }
  const mit = anzahl(`${stamm}-${rest}`);
  const ohneWort = stamm + rest;
  const ohne = anzahl(ohneWort) + anzahl(ohneWort[0].toUpperCase() + ohneWort.slice(1)) + anzahl(ohneWort[0].toLowerCase() + ohneWort.slice(1));
  if (!/^[a-zäöüß]/.test(rest)) {
    if (ohne > 0 && mit === 0) {
      notiere("Trennung (Großbuchstabe, belegt)", `${ort}: „${stamm}-⏎${rest}“ -> „${ohneWort}“ (${ohne}× ohne Bindestrich belegt)`);
      return links.slice(0, -1) + rechts;
    }
    notiere("Bindestrich bleibt", `${ort}: „${stamm}-⏎${rest}“ -> „${stamm}-${rest}“ (nächste Zeile beginnt nicht mit Kleinbuchstaben)`);
    return links + rechts;
  }
  if (mit > ohne) {
    notiere("Bindestrich bleibt", `${ort}: „${stamm}-⏎${rest}“ -> „${stamm}-${rest}“ (${mit}× mit, ${ohne}× ohne Bindestrich belegt)`);
    return links + rechts;
  }
  notiere(ohne ? "Trennung (belegt)" : "Trennung (unbelegt)", `${ort}: „${stamm}-⏎${rest}“ -> „${ohneWort}“${ohne ? ` (${ohne}× belegt)` : ""}`);
  return links.slice(0, -1) + rechts;
}

// =====================================================================================
// 5. Gliederung: Abschnitte, Paragraphen, Anhänge
// =====================================================================================

// Gliedert die Fließtextzeilen in Überschriften und Normen.
function gliedere(roh, zeilen) {
  const layout = LAYOUT[roh.art];
  const istUeberschrift = (z) => z.x0 > layout.ueberschriftAb;
  const teile = [];
  let i = 0;
  const titelZeilen = () => {
    const t = [];
    while (i < zeilen.length && istUeberschrift(zeilen[i]) && !/^(§ \d|Abschnitt \d|Anhang )/.test(zeilen[i].text)) t.push(zeilen[i++]);
    return t;
  };
  while (i < zeilen.length) {
    const z = zeilen[i];
    let m;
    if (istUeberschrift(z) && (m = z.text.match(/^Abschnitt (\d)$/))) {
      i++;
      teile.push({ art: "abschnitt", nr: m[1], titel: titelZeilen(), seite: z.seite });
    } else if (istUeberschrift(z) && (m = z.text.match(/^§ (\d+[a-z]?)(?: (EU|VS))?$/))) {
      i++;
      teile.push({ art: "norm", nr: m[1], zusatz: m[2] ?? "", titel: titelZeilen(), zeilen: [], seite: z.seite });
    } else if (istUeberschrift(z) && (m = z.text.match(/^Anhang (TS)$/))) {
      i++;
      teile.push({ art: "anhang", nr: m[1], titel: titelZeilen(), zeilen: [], seite: z.seite });
    } else if (istUeberschrift(z)) {
      if (teile.length && teile[teile.length - 1].zeilen) throw new Error(`${roh.datei} S. ${z.seite}: unerwartete Überschrift „${z.text}“`);
      teile.push({ art: "vorspann", text: z.text, seite: z.seite });
      i++;
    } else {
      const letzte = teile[teile.length - 1];
      if (!letzte?.zeilen) throw new Error(`${roh.datei} S. ${z.seite}: Text vor der ersten Norm: „${z.text}“`);
      letzte.zeilen.push(z);
      i++;
    }
  }
  return teile;
}

// =====================================================================================
// 6. Absätze, Nummern, Buchstaben – Aufbau wie baugb.json
// =====================================================================================

const MONATE = /^(Januar|Februar|März|April|Mai|Juni|Juli|August|September|Oktober|November|Dezember)\b/;
// Nachfolger in einer Zählung: 1 -> 2, 2 -> 2a/3, 2a -> 2b/3, a -> b, aa -> bb
function istNachfolger(vorher, jetzt, art) {
  if (art === "num") {
    const v = vorher.match(/^(\d+)([a-z]?)$/), j = jetzt.match(/^(\d+)([a-z]?)$/);
    if (Number(j[1]) === Number(v[1]) + 1 && !j[2]) return true;
    return Number(j[1]) === Number(v[1]) && j[2] && (v[2] ? j[2].charCodeAt(0) === v[2].charCodeAt(0) + 1 : j[2] === "a");
  }
  if (art === "buch" || art === "doppel") return jetzt.length === vorher.length && jetzt.charCodeAt(0) === vorher.charCodeAt(0) + 1 && new Set(jetzt).size === 1;
  return art === "strich";
}
const artVon = (dt) => (dt === "–" ? "strich" : /^\d/.test(dt) ? "num" : /^([a-z])\1\)$/.test(dt) ? "doppel" : "buch");
const istAnfang = (nr, art) => (art === "num" ? nr === "1" : art === "buch" ? nr === "a" : art === "doppel" ? nr === "aa" : true);

function baueInhalt(roh, norm, ctx) {
  const layout = LAYOUT[roh.art];
  const inhalt = [];
  let stapel = []; // Rahmen: {typ:"p"|"liste"|"punkt", c?, dl?, art?, nr?, x}
  let absatzNr = null;
  const container = () => stapel[stapel.length - 1].c;
  const neuerAbsatz = () => {
    const p = { t: "p", c: [] };
    inhalt.push(p);
    stapel = [{ typ: "p", c: p.c, x: -Infinity }];
  };
  const text = (z, s) => {
    if (!stapel.length) neuerAbsatz();
    const c = container();
    const letzte = c[c.length - 1];
    if (typeof letzte === "string") {
      if (z.abstand != null && z.abstand > ctx.zeilenabstand * 1.25) {
        notiere("Unterabsatz", `${ctx.ort(z)}: größerer Zeilenabstand vor „${s.slice(0, 40)}…“ -> Zeilenumbruch`);
        c.push({ t: "br" }, s);
      } else c[c.length - 1] = verbinde(letzte, s, ctx.ort(z));
    } else c.push(s); // erste Zeile oder Text nach einer Liste
  };
  for (const z of norm.zeilen) {
    let s = z.text;
    let m;
    if ((m = s.match(/^\((\d+[a-z]?)\)(?: |$)(.*)$/))) {
      const erwartet = absatzNr == null ? m[1] === "1" : istNachfolger(absatzNr, m[1], "num");
      if (!erwartet) throw new Error(`${ctx.ort(z)}: Absatz (${m[1]}) passt nicht zur Zählung (vorher ${absatzNr})`);
      absatzNr = m[1];
      neuerAbsatz();
      container().push(`(${m[1]})`);
      s = m[2];
      if (!s) continue;
      if (!/^(\d+[a-z]?\.|[a-z]{1,2}\)|–) /.test(s)) {
        container()[0] += " " + s;
        continue;
      }
    }
    // Listenpunkte (auch mehrere am Zeilenanfang, z. B. „1. a) …“)
    let marke;
    while ((marke = s.match(/^(?:(\d+[a-z]?)\.|([a-z])\)|([a-z])\3\)|(–)) (.*)$/))) {
      const art = marke[1] ? "num" : marke[2] ? "buch" : marke[3] ? "doppel" : "strich";
      const nr = marke[1] ?? marke[2] ?? (marke[3] ? marke[3] + marke[3] : "–");
      if (art === "num" && MONATE.test(marke[5])) break;
      if (!stapel.length) neuerAbsatz();
      // passende offene Liste suchen (von innen nach außen)
      let k = stapel.length - 1;
      while (k >= 0 && !(stapel[k].typ === "liste" && stapel[k].art === art && istNachfolger(stapel[k].nr, nr, art))) k--;
      // Zählung, die nach einem Zwischentext weitergeht (z. B. § 6a: „4. …, ⏎sowie Angaben, ⏎5. …“)
      const vorige = [...container()].reverse().find((n) => n.t === "dl");
      const vorigeNr = vorige?.items[vorige.items.length - 1].dt.replace(/[.)]$/, "");
      const fortsetzung = k < 0 && vorige && artVon(vorige.items[0].dt) === art && istNachfolger(vorigeNr, nr, art);
      if (k >= 0) {
        stapel = stapel.slice(0, k + 1);
        stapel[k].nr = nr;
      } else if (istAnfang(nr, art) || fortsetzung) {
        if (fortsetzung) notiere("Liste fortgesetzt", `${ctx.ort(z)}: „${nr}${art === "num" ? "." : ")"}“ setzt die Zählung nach dem Zwischentext „${String(container()[container().length - 1]).slice(0, 40)}“ fort (neue Liste im selben Absatz)`);
        const dl = { t: "dl", items: [] };
        container().push(dl);
        stapel.push({ typ: "liste", dl, art, nr, x: z.x0 });
        k = stapel.length - 1;
      } else {
        notiere("Kein Listenpunkt", `${ctx.ort(z)}: „${nr}${art === "num" ? "." : ")"}“ am Zeilenanfang passt zu keiner Zählung – als Text behandelt`);
        break;
      }
      const punkt = { dt: art === "num" ? nr + "." : art === "strich" ? "–" : nr + ")", c: [] };
      stapel[k].dl.items.push(punkt);
      stapel.push({ typ: "punkt", c: punkt.c, art, x: z.x0 });
      s = marke[5];
    }
    if (stapel.length && stapel[stapel.length - 1].typ === "punkt" && !container().length) {
      container().push(s);
      continue;
    }
    // Folgezeile: gehört zum innersten Listenpunkt, solange sie eingerückt ist (hängender Einzug);
    // sonst endet die Liste und der Text gehört zur übergeordneten Ebene.
    while (stapel.length > 1 && stapel[stapel.length - 1].typ === "punkt") {
      const p = stapel[stapel.length - 1];
      const bleibt = layout.buendigeListen.includes(p.art) ? z.x0 > p.x - 3 : z.x0 > p.x + 3;
      if (bleibt) break;
      stapel = stapel.slice(0, -2);
    }
    text(z, s);
  }
  return inhalt;
}

// Fußnotenzeichen ^{n} aus einer Zeile nehmen; andere Hochstellungen bleiben (als Platzhalter)
const HOCH_AUF = "", HOCH_ZU = "";
function fussnotenzeichen(z, fussnoten, gefunden, ort) {
  return z.text.replace(/\^\{([^}]*)\}/g, (_, inhalt) => {
    const fn = (fussnoten.get(z.seite) ?? []).find((f) => f.nr === inhalt);
    if (fn) {
      gefunden.push(fn);
      fn.verwendet = true;
      notiere("Fußnotenzeichen", `${ort}: hochgestellte „${inhalt}“ aus dem Text genommen, Fußnote ${inhalt} -> fussnoten`);
      return "";
    }
    notiere("Hochgestellt", `${ort}: „${inhalt}“ hochgestellt übernommen`);
    return HOCH_AUF + inhalt + HOCH_ZU;
  });
}
function hochstellungen(knoten) {
  return knoten.flatMap((n) => {
    if (typeof n === "string") {
      if (!n.includes(HOCH_AUF)) return [n];
      return n.split(new RegExp(`(${HOCH_AUF}[^${HOCH_ZU}]*${HOCH_ZU})`)).filter(Boolean)
        .map((t) => (t.startsWith(HOCH_AUF) ? { t: "sup", c: [t.slice(1, -1)] } : t));
    }
    if (n.c) n.c = hochstellungen(n.c);
    if (n.items) for (const it of n.items) it.c = hochstellungen(it.c);
    return [n];
  });
}
function fussnotenText(fn, ctx) {
  let t = "";
  fn.zeilen.forEach((z, i) => (t = i ? verbinde(t, z.text, ctx.ort(z)) : z.text));
  return `${fn.nr} ${t}`;
}

// Reiner Text wie in lib/text.ts (alsText)
function alsText(nodes) {
  let out = "";
  for (const n of nodes) {
    if (typeof n === "string") out += n;
    else if (n.t === "p") out += (out && !out.endsWith("\n") ? "\n" : "") + alsText(n.c) + "\n";
    else if (n.t === "br") out += "\n";
    else if (n.t === "dl") {
      for (const it of n.items) out += "\n" + it.dt + " " + alsText(it.c);
      out += "\n";
    } else if (n.t === "table") out += n.rows.map((r) => r.join(" | ")).join("\n") + "\n";
    else if (n.t === "pre" || n.t === "hinweis") out += n.v + "\n";
    else if (n.c) out += alsText(n.c);
  }
  return out.replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
}

// Verarbeitet einen Quellteil (Seitenbereich) zu Normen
function normenAus(roh, von, bis, opts) {
  const { zeilen, fussnoten } = textzeilen(roh, von, bis);
  const leading = new Map();
  for (const z of zeilen) if (z.abstand != null) leading.set(z.abstand.toFixed(1), (leading.get(z.abstand.toFixed(1)) ?? 0) + 1);
  const ctx = {
    zeilenabstand: Number([...leading.entries()].sort((a, b) => b[1] - a[1])[0][0]),
    ort: (z) => `${roh.datei} S. ${z.seite}`,
  };
  const teile = gliedere(roh, zeilen);
  const normen = [];
  let gliederung = [];
  let abschnittsFussnoten = [];
  let zusatzErwartet = "";
  for (const t of teile) {
    if (t.art === "vorspann") {
      if (!opts.vorspann?.includes(t.text)) throw new Error(`${roh.datei} S. ${t.seite}: unerwartete Überschrift „${t.text}“`);
      continue;
    }
    if (t.art === "abschnitt") {
      const gef = [];
      const titel = t.titel.map((z) => fussnotenzeichen(z, fussnoten, gef, ctx.ort(z))).reduce((a, s, i) => (i ? verbinde(a, s, ctx.ort(t.titel[i])) : s), "");
      if (gef.length) notiere("Fußnote an Überschrift", `${roh.datei} S. ${t.seite}: Fußnote(n) ${gef.map((f) => f.nr).join(", ")} der Überschrift „Abschnitt ${t.nr}“ -> erster Paragraph des Abschnitts`);
      abschnittsFussnoten = gef;
      gliederung = [`Abschnitt ${t.nr} – ${titel}`];
      zusatzErwartet = { 1: "", 2: "EU", 3: "VS" }[t.nr];
      continue;
    }
    const gef = [...abschnittsFussnoten];
    abschnittsFussnoten = [];
    const titelOrt = t.titel[0] ? ctx.ort(t.titel[0]) : ctx.ort({ seite: t.seite });
    const titel = t.titel.map((z) => fussnotenzeichen(z, fussnoten, gef, ctx.ort(z))).reduce((a, s, i) => (i ? verbinde(a, s, titelOrt) : s), "");
    if (t.titel.length > 1) notiere("Überschrift zweizeilig", `${titelOrt}: „${titel}“`);
    t.zeilen = t.zeilen.map((z) => ({ ...z, text: fussnotenzeichen(z, fussnoten, gef, ctx.ort(z)) }));
    let id, bez;
    if (t.art === "anhang") {
      id = "anhang-" + t.nr.toLowerCase() + (zusatzErwartet ? "-" + zusatzErwartet.toLowerCase() : "");
      bez = "Anhang " + t.nr + (zusatzErwartet ? " " + zusatzErwartet : "");
    } else {
      if (t.zusatz !== zusatzErwartet) throw new Error(`${roh.datei} S. ${t.seite}: § ${t.nr} ${t.zusatz} im falschen Abschnitt`);
      id = t.nr + (t.zusatz ? "-" + t.zusatz.toLowerCase() : "");
      bez = `§ ${t.nr}${t.zusatz ? " " + t.zusatz : ""}`;
    }
    // „frei“ = unbesetzte Paragraphennummer (z. B. § 10a VS) – wie „(weggefallen)“ im BauGB ohne Text gespeichert
    const weggefallen = /^\(?(weggefallen|aufgehoben|frei)\)?$/i.test(titel);
    if (weggefallen && t.zeilen.length) throw new Error(`${roh.datei} S. ${t.seite}: ${bez} „${titel}“ mit Text`);
    const inhalt = weggefallen ? [{ t: "p", c: [] }] : hochstellungen(baueInhalt(roh, t, ctx));
    normen.push({
      id, bez, titel, gliederung: [...gliederung],
      weggefallen,
      inhalt,
      text: alsText(inhalt),
      fussnoten: gef.length ? gef.map((f) => fussnotenText(f, ctx)).join("\n") : undefined,
      url: `${roh.url}#page=${t.seite}`,
    });
  }
  for (const [seite, fns] of fussnoten)
    for (const f of fns) if (!f.verwendet) throw new Error(`${roh.datei} S. ${seite}: Fußnote ${f.nr} ohne Fußnotenzeichen im Text`);
  return normen;
}

// =====================================================================================
// 7. § 3a Abschnitt 1: Änderungen vom 11.03.2025 und 24.11.2025 anwenden
// =====================================================================================

// Liest die Änderungsbefehle aus dem Anlagenteil (S. 2) einer Änderungsbekanntmachung als Fließtext.
function aenderungsText(roh) {
  const { zeilen } = textzeilen(roh, 2, 2);
  return zeilen.reduce((a, z, i) => (i ? verbinde(a, z.text, `${roh.datei} S. 2`) : z.text), "");
}
// Prüft, dass der Text der Bekanntmachung genau dem erwarteten Wortlaut der Befehle entspricht.
// Das Muster enthält „«…»“ für jeden zitierten neuen Wortlaut; der wird aus dem PDF übernommen.
function befehle(text, muster, datei) {
  const re = new RegExp(
    "^" + muster.split("«…»").map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("„([^“]*)“") + "$",
  );
  const m = text.match(re);
  if (!m) throw new Error(`${datei}: Wortlaut der Änderungsbefehle weicht vom erwarteten ab:\n${text}`);
  return m.slice(1);
}

function aendere3a(norm, aprRoh, dezRoh) {
  // --- Bekanntmachung vom 11. März 2025 (BAnz AT 02.04.2025 B7): betrifft nur Fußnoten ---
  const apr = aenderungsText(aprRoh);
  const [fnNeu1, fnNeu2] = befehle(
    apr,
    "Anlage Vergabe- und Vertragsordnung für Bauleistungen Teil A (VOB/A) Hinweise für die Änderungen in der VOB/A – 1. Abschnitt " +
      "Der Deutsche Vergabe- und Vertragsausschuss für Bauleistungen (DVA) hat die folgenden Änderungen in der VOB/A – 1. Abschnitt beschlossen: " +
      "1. In § 3a Absatz 2 Satz 1 wird die Fußnote 1 gestrichen. " +
      "2. In § 3a Absatz 3 wird die Fußnote 2 zu Fußnote 1 und erhält folgenden Text: «…» " +
      "3. Der § 3a Absatz 4 erhält die Fußnote 2 mit folgendem Text: «…»",
    aprRoh.datei,
  );
  const fns = norm.fussnoten.split("\n");
  if (fns.length !== 2 || !fns[0].startsWith("1 ") || !fns[1].startsWith("2 ")) throw new Error("§ 3a: Fußnoten 1 und 2 erwartet");
  // Ergebnis nach 11.03.2025: Fußnote 1 (Abs. 3) = fnNeu1, Fußnote 2 (Abs. 4) = fnNeu2
  notiere("§ 3a Änderung 11.03.2025", `Befehl 1: Fußnote 1 in Abs. 2 Satz 1 gestrichen (Zeichen und Text „${fns[0]}“)`);
  notiere("§ 3a Änderung 11.03.2025", `Befehl 2: Fußnote 2 in Abs. 3 wird Fußnote 1 mit Text „${fnNeu1}“`);
  notiere("§ 3a Änderung 11.03.2025", `Befehl 3: Abs. 4 erhält Fußnote 2 „${fnNeu2}“ (Stelle des Zeichens nicht angegeben)`);

  // --- Bekanntmachung vom 24. November 2025 (BAnz AT 16.12.2025 B7) ---
  const dez = aenderungsText(dezRoh);
  const [nr1, satz1, satz2] = befehle(
    dez,
    "Vergabe- und Vertragsordnung für Bauleistungen Teil A (VOB/A) Hinweise für die Änderungen in der VOB/A – 1. Abschnitt " +
      "Der Deutsche Vergabe- und Vertragsausschuss für Bauleistungen (DVA) hat die folgenden Änderungen in der VOB/A – Abschnitt 1 beschlossen: " +
      "1. In § 3a Absatz 2 wird vor der Angabe „Beschränkte“ die Angabe „Die“ eingefügt. " +
      "2. § 3a Absatz 2 Satz 1 Nummer 1 wird durch die folgende Nummer ersetzt: «…» " +
      "3. § 3a Absatz 3 Satz 1 wird durch den folgenden Satz 1 ersetzt: «…» " +
      "4. § 3a Absatz 3 Satz 2 wird durch folgenden Satz ersetzt: «…» " +
      "5. In § 3a Absatz 3 Satz 2 wird die Angabe „Fußnote 1“ gestrichen. " +
      "6. In § 3a Absatz 4 Satz 1 wird die Angabe „3000“ durch die Angabe „50 000“ ersetzt. " +
      "7. In § 3a Absatz 4 wird die Angabe „Fußnote 2“ gestrichen.",
    dezRoh.datei,
  );
  const [abs1, abs2, abs3, abs4] = norm.inhalt;
  const ersetze = (arr, i, alt, neu, befehl) => {
    if (arr[i] !== alt) throw new Error(`§ 3a, ${befehl}: erwartet „${alt}“, gefunden „${arr[i]}“`);
    arr[i] = neu;
    notiere("§ 3a Änderung 24.11.2025", `${befehl}: „${alt}“ -> „${neu}“`);
  };
  if (norm.inhalt.length !== 4 || abs1.c.length !== 1) throw new Error("§ 3a: Aufbau (4 Absätze) nicht wie erwartet");
  // Befehl 1: „Die“ vor „Beschränkte“ am Anfang von Absatz 2 Satz 1 (nur dort steht „Beschränkte“ am Satzanfang;
  // die weiteren „eine Beschränkte“ in Nummer 2 und 3 sind offensichtlich nicht gemeint)
  ersetze(abs2.c, 0, "(2) Beschränkte Ausschreibung ohne Teilnahmewettbewerb kann erfolgen,", "(2) Die Beschränkte Ausschreibung ohne Teilnahmewettbewerb kann erfolgen,", "Befehl 1");
  // Befehl 2: Nummer 1 (mit den Buchstaben a bis c) durch die neue Nummer 1 ersetzen
  const m2 = nr1.match(/^1\. (.*)$/);
  const liste2 = abs2.c[1];
  if (!m2 || liste2?.t !== "dl" || liste2.items[0].dt !== "1.") throw new Error("§ 3a, Befehl 2: Nummer 1 nicht gefunden");
  notiere("§ 3a Änderung 24.11.2025", `Befehl 2: Nummer 1 „${alsText(liste2.items[0].c).replace(/\n/g, " ")}“ -> „${m2[1]}“ (Wortlaut ohne Satzzeichen am Ende, wie in der Bekanntmachung)`);
  liste2.items[0] = { dt: "1.", c: [m2[1]] };
  // Befehl 3: Satz 1 von Absatz 3 = Einleitung vor der Aufzählung („…, besonders,“); die Nummern 1 bis 6 bleiben,
  // denn der neue Satz 1 endet wie der alte mit „besonders,“ und leitet die Aufzählung ein.
  ersetze(abs3.c, 0, "(3) Freihändige Vergabe ist zulässig, wenn die Öffentliche Ausschreibung oder Beschränkte Ausschreibungen unzweckmäßig sind, besonders,", "(3) " + satz1, "Befehl 3");
  // Befehl 4 und 5: Satz 2 (Text nach der Aufzählung) ersetzen; die Fußnote (seit 11.03.2025 Fußnote 1) entfällt
  if (abs3.c.length !== 3 || abs3.c[1].t !== "dl") throw new Error("§ 3a, Befehl 4: Satz 2 nach der Aufzählung nicht gefunden");
  ersetze(abs3.c, 2, "Freihändige Vergabe kann außerdem bis zu einem Auftragswert von 10 000 Euro ohne Umsatzsteuer erfolgen.", satz2, "Befehl 4");
  notiere("§ 3a Änderung 24.11.2025", `Befehl 5: Fußnote 1 („${fnNeu1}“) gestrichen`);
  // Befehl 6: „3 000“ (im Text von 2019 mit Leerzeichen gesetzt) -> „50 000“
  const alt4 = abs4.c[0];
  if (typeof alt4 !== "string" || alt4.split("3 000 Euro").length !== 2) throw new Error("§ 3a, Befehl 6: „3 000“ nicht eindeutig gefunden");
  ersetze(abs4.c, 0, alt4, alt4.replace("3 000 Euro", "50 000 Euro"), "Befehl 6 (Angabe „3000“ steht im Text als „3 000“)");
  notiere("§ 3a Änderung 24.11.2025", `Befehl 7: Fußnote 2 („${fnNeu2}“) gestrichen`);
  // Offen sagen, dass dieser Text zusammengeführt ist: Die Bekanntmachung druckt den neuen § 3a nicht vollständig ab.
  norm.fussnoten =
    "Hinweis der App: Die Bekanntmachung vom 24.11.2025 (BAnz AT 16.12.2025 B7) enthält für § 3a nur Änderungsbefehle, keinen vollständigen neuen Wortlaut. " +
    "Dieser Text ist der Wortlaut von 2019 (BAnz AT 19.02.2019 B2), in den die Änderungen vom 11.03.2025 (BAnz AT 02.04.2025 B7) und vom 24.11.2025 eingearbeitet sind – in Kraft seit 01.01.2026.";
  norm.text = alsText(norm.inhalt);
}

// =====================================================================================
// 8. Verweise innerhalb desselben Regelwerks
// =====================================================================================
// Wie scripts/lib/verweise.mjs, aber mit den Zusätzen der VOB/A: „§ 6e EU“ -> 6e-eu, „§ 3a VS“ -> 3a-vs.
// Ein „§ 7“ ohne Zusatz zählt nur in Abschnitt 1 der VOB/A und in der VOB/B als eigener Verweis.
// Nicht übernommen: Verweise auf andere Regelwerke („§ 3 VgV“, „§ 2 Absatz 1 VOB/B“ in der VOB/A,
// „§ 99 des Gesetzes gegen …“, „§ 313 BGB“).
const UNTER = /^(Absatz|Absätze|Absätzen|Abs\.|Satz|Sätze|Sätzen|Nummer|Nummern|Nr\.|Buchstabe|Buchstaben|Buchst\.|Halbsatz|Unterabsatz)(?=[\s,;)]|$)/;
function vobVerweise(text, eigeneId, abschnittsZusatz, vorhanden, reihenfolge) {
  const gefunden = [];
  const idFuer = (nr, zusatz) => {
    if (zusatz) return `${nr}-${zusatz.toLowerCase()}`;
    return abschnittsZusatz ? null : nr;
  };
  const re = /§§?/g;
  let m;
  while ((m = re.exec(text))) {
    let pos = m.index + m[0].length;
    const kandidaten = [];
    let modus = "paragraph", von = null, bis = false, ende = pos;
    for (;;) {
      const rest = text.slice(pos);
      let t;
      if ((t = rest.match(/^\s+/))) { pos += t[0].length; continue; }
      if ((t = rest.match(UNTER))) { modus = "unter"; pos += t[0].length; ende = pos; bis = false; continue; }
      if ((t = rest.match(/^(,|und|oder|bis|sowie)(?=\s|$|,)/))) { bis = t[1] === "bis"; pos += t[0].length; continue; }
      if ((t = rest.match(/^(\d+)( ?[a-z])?(?: (EU|VS))?(?=[\s,;.)]|$)/))) {
        if (modus === "paragraph") {
          const nr = t[1] + (t[2] ?? "").trim();
          const id = idFuer(nr, t[3]);
          if (bis && von && id) kandidaten.push(...bereich(von, id, reihenfolge));
          else kandidaten.push(id);
          von = id;
        }
        bis = false;
        pos += t[0].length;
        ende = pos;
        continue;
      }
      if (modus === "unter" && (t = rest.match(/^[a-z](?=[\s,;.)]|$)/))) { pos += 1; ende = pos; continue; }
      break;
    }
    const danach = text.slice(ende, ende + 80).trimStart();
    if (/^(des|der)\s+[A-ZÄÖÜ]/.test(danach) && !/^(des|der)\s+(Absatzes|Satzes|Nummer)/.test(danach)) continue;
    if (/^(VOB\/[ABC]|[A-ZÄÖÜ][A-Za-zÄÖÜäöü]*[A-Z][A-Za-z]*)\b/.test(danach)) continue; // VgV, GWB, BGB, VOB/B …
    for (const k of kandidaten) if (k && vorhanden.has(k) && k !== eigeneId && !gefunden.includes(k)) gefunden.push(k);
  }
  // Anhang TS des eigenen Abschnitts („Anhang TS Nummer 1“), nicht der Anhang einer Richtlinie
  for (const a of text.matchAll(/Anhangs? TS(?: Nummern?(?: \d+(?:,| und| bis)?)+)?/g)) {
    const danach = text.slice(a.index + a[0].length).trimStart();
    if (/^(der|des)\s+[A-ZÄÖÜ]/.test(danach)) continue;
    const id = "anhang-ts" + (abschnittsZusatz ? "-" + abschnittsZusatz.toLowerCase() : "");
    if (vorhanden.has(id) && id !== eigeneId && !gefunden.includes(id)) gefunden.push(id);
  }
  return gefunden;
}
function bereich(von, bis, reihenfolge) {
  const a = reihenfolge.indexOf(von), b = reihenfolge.indexOf(bis);
  return a === -1 || b === -1 || b < a ? [bis] : reihenfolge.slice(a, b + 1);
}

// =====================================================================================
// Hauptprogramm
// =====================================================================================

async function main() {
  const roh = {};
  for (const [k, q] of Object.entries(QUELLEN)) roh[k] = await ladeQuelle(q);
  baueWortbestand(Object.values(roh));

  // --- VOB/A ---
  const abschnitt1 = normenAus(roh.b2019, 3, 19, { vorspann: ["VOB Teil A 2019", "Allgemeine Bestimmungen für die Vergabe von Bauleistungen"] });
  const abschnitte23 = normenAus(roh.b2026, 3, 57, {});
  const p3a = abschnitt1.find((n) => n.id === "3a");
  aendere3a(p3a, roh.b2025a, roh.b2025b);
  const voba = [...abschnitt1, ...abschnitte23];
  // --- VOB/B ---
  const vobb = normenAus(roh.vobb, 2, 19, {});

  // Prüfungen: lückenlose, eindeutige Paragraphenfolgen
  const pruefeFolge = (normen, name) => {
    const ids = new Set();
    for (const n of normen) {
      if (ids.has(n.id)) throw new Error(`${name}: ${n.bez} doppelt`);
      ids.add(n.id);
      if (!n.text && !n.weggefallen) throw new Error(`${name}: ${n.bez} ohne Text`);
    }
  };
  pruefeFolge(voba, "VOB/A");
  pruefeFolge(vobb, "VOB/B");
  const nrVobb = vobb.map((n) => n.id).join(",");
  if (nrVobb !== Array.from({ length: 18 }, (_, i) => i + 1).join(",")) throw new Error(`VOB/B: §§ 1–18 erwartet, gefunden ${nrVobb}`);

  // Verweise
  for (const normen of [voba, vobb]) {
    const vorhanden = new Set(normen.map((n) => n.id));
    const reihenfolge = normen.map((n) => n.id);
    for (const n of normen) {
      const zusatz = n.id.match(/-(eu|vs)$/)?.[1]?.toUpperCase() ?? "";
      n.verweise = vobVerweise(n.text, n.id, zusatz, vorhanden, reihenfolge);
    }
  }

  const aufraeumen = (n) => {
    const rest = { ...n };
    if (!rest.fussnoten) delete rest.fussnoten;
    return rest;
  };
  const abgerufen = roh.b2026.kopf.abgerufen;
  const gesetzA = {
    id: "voba",
    kurz: "VOB/A",
    titel: "Vergabe- und Vertragsordnung für Bauleistungen Teil A",
    ebene: "Vergabe- und Vertragsordnung",
    stand:
      "Abschnitte 2 und 3: Ausgabe 2026, Bek. v. 22.7.2026 (BAnz AT 24.08.2026 B6); " +
      "Abschnitt 1: Ausgabe 2019, Bek. v. 31.1.2019 (BAnz AT 19.02.2019 B2), § 3a zuletzt geändert durch Bek. v. 24.11.2025 (BAnz AT 16.12.2025 B7)",
    quelle: {
      name: "Bundesanzeiger (Amtlicher Teil) – Bekanntmachungen der VOB/A durch das Bundesministerium für Wohnen, Stadtentwicklung und Bauwesen",
      url: QUELLEN.b2026.url,
      fassung: "Abschnitte 2 und 3: Ausgabe 2026 (BAnz AT 24.08.2026 B6); Abschnitt 1: Ausgabe 2019 (BAnz AT 19.02.2019 B2) mit § 3a in der Fassung ab 1.1.2026 (BAnz AT 02.04.2025 B7, BAnz AT 16.12.2025 B7)",
      abgerufen,
    },
    normen: voba.map(aufraeumen),
  };
  const gesetzB = {
    id: "vobb",
    kurz: "VOB/B",
    titel: "Vergabe- und Vertragsordnung für Bauleistungen Teil B",
    ebene: "Vergabe- und Vertragsordnung",
    stand:
      "zuletzt geändert durch Bek. v. 7.1.2016 (BAnz AT 19.01.2016 B3, ber. BAnz AT 01.04.2016 B1); " +
      "Fassung der Bek. v. 31.7.2009 (BAnz. Nr. 155a v. 15.10.2009, ber. BAnz. 2010 S. 940), geändert durch Bek. v. 26.6.2012 (BAnz AT 13.07.2012 B3)",
    quelle: {
      name: "Fachinformation Bundesbau (fib-bund.de) im Auftrag des BMWSB – VOB/B 2016, nichtamtliche Fassung",
      url: QUELLEN.vobb.url,
      fassung: "VOB/B Ausgabe 2016, bekanntgemacht im Bundesanzeiger BAnz AT 19.01.2016 B3 und BAnz AT 01.04.2016 B1 (nichtamtliche Lesefassung)",
      abgerufen: roh.vobb.kopf.abgerufen,
    },
    normen: vobb.map(aufraeumen),
  };
  fs.mkdirSync(ZIEL_DIR, { recursive: true });
  fs.writeFileSync(path.join(ZIEL_DIR, "voba.json"), JSON.stringify(gesetzA, null, 1));
  fs.writeFileSync(path.join(ZIEL_DIR, "vobb.json"), JSON.stringify(gesetzB, null, 1));

  // Protokoll aller Entscheidungen (zusammengefasst nach Art)
  const arten = new Map();
  for (const p of protokoll) {
    const art = p.match(/^\[([^\]]+)\]/)[1];
    arten.set(art, (arten.get(art) ?? 0) + 1);
  }
  fs.writeFileSync(
    PROTOKOLL,
    [
      "# Protokoll von scripts/import-vob.mjs – jede Bearbeitung beim Zusammensetzen des Textes aus den PDFs",
      `# erzeugt: ${new Date().toISOString().slice(0, 10)}`,
      "# Übersicht: " + [...arten].map(([a, n]) => `${a}: ${n}`).join("; "),
      ...protokoll,
    ].join("\n") + "\n",
  );

  const zaehle = (normen) => {
    const z = new Map();
    for (const n of normen) {
      const k = n.gliederung[0]?.split(" – ")[0] ?? "VOB/B";
      z.set(k, (z.get(k) ?? 0) + 1);
    }
    return [...z].map(([k, n]) => `${k}: ${n}`).join(", ");
  };
  console.log(`VOB/A importiert: ${voba.length} Einträge (${zaehle(voba)})`);
  console.log(`VOB/B importiert: ${vobb.length} Einträge`);
  console.log(`Protokoll: ${path.relative(ROOT, PROTOKOLL)} (${[...arten].map(([a, n]) => `${a} ${n}`).join(", ")})`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
