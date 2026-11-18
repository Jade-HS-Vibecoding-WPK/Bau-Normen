// PDF-Bausteine für scripts/import-landesrecht-d.mjs (Landesrecht aus PDF: Gesetzblatt, Lesefassung, Synopse).
//
// Zwei unabhängige Auslesungen derselben PDF-Datei:
//   1. pypdf (Python): Textoperatoren des Inhaltsstroms mit Position, Schriftgröße und Schrift – daraus bauen wir
//      Zeilen (Grundlinie), erkennen Hochgestelltes (kleinere Schrift UND angehobene Grundlinie) und lesen bei
//      Synopsen nur die gewählte Spalte (Anfangsposition jedes Textstücks innerhalb der Spaltengrenzen).
//      Wie in scripts/import-mbo.mjs nutzen wir die Hilfsfunktionen des pypdf-Layout-Modus, die den Textzustand
//      korrekt mitführen, aber selbst keine Leerzeichen erfinden.
//   2. pdftotext (xpdf/poppler) im Modus -raw (Reihenfolge des Inhaltsstroms) mit denselben Rändern
//      (-marginl/-marginr/-margint/-marginb) – also derselben Spalte und ohne Kopf- und Fußzeilen.
// Verglichen wird Seite für Seite: alle Zeichen ohne Leerraum müssen gleich sein.
//
// Voraussetzungen: Python 3 mit pypdf (entwickelt mit 6.16.2) und pdftotext im PATH (anpassbar über die
// Umgebungsvariablen PYTHON und PDFTOTEXT).

import fs from "node:fs";
import crypto from "node:crypto";
import { execFileSync } from "node:child_process";

export const PYTHON = process.env.PYTHON || "python";
export const PDFTOTEXT = process.env.PDFTOTEXT || "pdftotext";

// Liest je Seite alle Textstücke (Tj/TJ) mit Position, Schriftgröße und Schrift. Ausgabe als JSON (nur ASCII,
// damit die Kodierung der Konsole keine Rolle spielt).
const PYTHON_STUECKE = String.raw`
import sys, json
import pypdf
from pypdf.generic import ContentStream
from pypdf._text_extraction._layout_mode import _fixed_width_page as fw
from pypdf._text_extraction._layout_mode._text_state_manager import TextStateManager

leser = pypdf.PdfReader(sys.argv[1])
schriften = []
seiten = []

def mal(m, n):
    a, b, c, d, e, f = m
    A, B, C, D, E, F = n
    return [a * A + b * C, a * B + b * D, c * A + d * C, c * B + d * D, e * A + f * C + E, e * B + f * D + F]

# Gefüllte, sehr flache Rechtecke (Höhe < 1,5 pt, Breite 1–300 pt): so zeichnet Word Durchstreichungen (und kurze
# Linien). Eigener Durchlauf durch den Inhaltsstrom mit Grafikzustand (q/Q/cm), Koordinaten wie bei den Textstücken.
def striche(seite):
    ctm = [1, 0, 0, 1, 0, 0]
    stapel, offen, aus = [], [], []
    for o, op in ContentStream(seite["/Contents"].get_object(), leser, "bytes").operations:
        if op == b"q":
            stapel.append(ctm[:])
        elif op == b"Q":
            ctm = stapel.pop() if stapel else [1, 0, 0, 1, 0, 0]
        elif op == b"cm":
            ctm = mal([float(x) for x in o], ctm)
        elif op == b"re":
            offen.append([float(x) for x in o])
        elif op in (b"f", b"F", b"f*", b"B", b"B*", b"b", b"b*"):
            for x, y, w, h in offen:
                p1 = (ctm[0] * x + ctm[2] * y + ctm[4], ctm[1] * x + ctm[3] * y + ctm[5])
                p2 = (ctm[0] * (x + w) + ctm[2] * (y + h) + ctm[4], ctm[1] * (x + w) + ctm[3] * (y + h) + ctm[5])
                x0, x1, y0, y1 = min(p1[0], p2[0]), max(p1[0], p2[0]), min(p1[1], p2[1]), max(p1[1], p2[1])
                if y1 - y0 < 1.5 and 1 < x1 - x0 < 300:
                    aus.append([round(x0, 2), round(y0, 2), round(x1 - x0, 2), round(y1 - y0, 2)])
            offen = []
        elif op in (b"n", b"S", b"s"):
            offen = []
    return aus

for seite in leser.pages:
    fonts = seite._layout_mode_fonts()
    ops = iter(ContentStream(seite["/Contents"].get_object(), leser, "bytes").operations)
    zustand = TextStateManager()
    stuecke = []
    for operanden, op in ops:
        if op in (b"BT", b"q"):
            _, tjs = fw.recurse_to_target_op(ops, zustand, b"ET" if op == b"BT" else b"Q", fonts, True)
            stuecke.extend(tjs)
        elif op == b"Tf":
            zustand.set_font(fw.resolve_font(fonts, operanden[0]), operanden[1])
        else:
            zustand.set_state_param(op, operanden)
    aus = []
    for t in stuecke:
        if not t.text:
            continue
        name = t.font.name
        if name not in schriften:
            schriften.append(name)
        aus.append([round(t.tx, 2), round(t.ty, 2), round(t.font_height, 2), schriften.index(name), t.text])
    box = seite.mediabox
    seiten.append({"b": float(box.width), "h": float(box.height), "s": aus, "r": striche(seite)})
meta = leser.metadata or {}
json.dump({"pypdf": pypdf.__version__, "erstellt": str(meta.get("/CreationDate", "")), "erzeuger": str(meta.get("/Producer", "")),
           "schriften": schriften, "seiten": seiten}, sys.stdout, ensure_ascii=True)
`;

export function pdfInfo(pdfDatei) {
  const buf = fs.readFileSync(pdfDatei);
  if (buf.subarray(0, 5).toString("latin1") !== "%PDF-") throw new Error(`${pdfDatei} ist kein PDF.`);
  return { sha256: crypto.createHash("sha256").update(buf).digest("hex"), bytes: buf.length };
}

/** Auslesung 1: Textstücke je Seite (pypdf). */
export function stueckeLesen(pdfDatei) {
  let roh;
  try {
    roh = execFileSync(PYTHON, ["-I", "-", pdfDatei], { input: PYTHON_STUECKE, maxBuffer: 1024 * 1024 * 1024 });
  } catch (e) {
    throw new Error(`pypdf-Auslesung fehlgeschlagen (Python mit pypdf nötig): ${e.message}`);
  }
  const daten = JSON.parse(roh.toString("utf8"));
  if (daten.pypdf !== "6.16.2") console.warn(`Hinweis: entwickelt mit pypdf 6.16.2, gefunden ${daten.pypdf} – Ergebnis bitte prüfen.`);
  daten.seiten = daten.seiten.map((s, i) => ({
    nr: i + 1,
    breite: s.b,
    hoehe: s.h,
    stuecke: s.s.map(([x, y, g, f, t]) => ({ x, y, g, schrift: daten.schriften[f], fett: /Bold/i.test(daten.schriften[f]), t })),
    striche: s.r.map(([x, y, b, h]) => ({ x, y, b, h })),
  }));
  return daten;
}

/**
 * Zeilen einer Seite aus den Textstücken. Ausschnitt: { links, rechts, oben, unten } in pt (Ursprung unten links);
 * ein Stück zählt, wenn sein Anfang (x, Grundlinie y) im Ausschnitt liegt. Alles, was bis `band` pt über der
 * tiefsten Grundlinie liegt, gehört zur selben Zeile (hochgestellte Satznummern liegen ~3–4 pt höher, Zeilen ≥ 12 pt
 * auseinander). Innerhalb einer Zeile bleibt die Reihenfolge des Inhaltsstroms erhalten (wie in import-mbo.mjs).
 * Hochgestellt = kleinere Schrift (< 80 % der Zeilenschrift) UND Grundlinie mehr als 1 pt höher.
 *
 * Durchgestrichen (Synopsen markieren so Streichungen): Ein flacher gefüllter Strich liegt 15–40 % der Schriftgröße
 * über der Grundlinie und überdeckt das Textstück vollständig (Anfang bis Beginn des nächsten Stücks). Solche Stücke
 * stehen in z.text (für den Seitenvergleich mit pdftotext), aber nicht in z.teile (Wortlaut); z.gestrichen nennt sie
 * mit dem Wort, in dem sie stehen. Ein nur teilweise überdecktes Stück bricht ab (von Hand prüfen).
 */
export function zeilenBilden(seite, ausschnitt, { band = 6.5 } = {}) {
  const { links = -Infinity, rechts = Infinity, oben = Infinity, unten = -Infinity } = ausschnitt;
  const stuecke = seite.stuecke.filter((s) => s.x >= links && s.x < rechts && s.y <= oben && s.y >= unten);
  const ys = [...new Set(stuecke.map((s) => s.y))].sort((a, b) => a - b);
  const basis = new Map();
  let aktuell = null;
  for (const y of ys) {
    if (aktuell === null || y > aktuell + band) aktuell = y;
    basis.set(y, aktuell);
  }
  const gruppen = new Map();
  for (const s of stuecke) {
    const b = basis.get(s.y);
    if (!gruppen.has(b)) gruppen.set(b, []);
    gruppen.get(b).push(s);
  }
  const zeilen = [];
  for (const [y, ss] of [...gruppen.entries()].sort((a, b) => b[0] - a[0])) {
    const jeGroesse = new Map();
    for (const s of ss) if (s.t.trim()) jeGroesse.set(s.g, (jeGroesse.get(s.g) ?? 0) + s.t.trim().length);
    if (!jeGroesse.size) continue; // nur Leerzeichen
    const groesse = [...jeGroesse.entries()].sort((a, b) => b[1] - a[1])[0][0];
    const teile = [];
    const gestrichen = [];
    const nachX = [...ss].sort((a, b) => a.x - b.x);
    const gestrichenesStueck = (s) => {
      const strich = (seite.striche ?? []).find((r) => r.y - s.y > s.g * 0.15 && r.y - s.y < s.g * 0.4 && s.x >= r.x - 0.5 && s.x < r.x + r.b - 0.5);
      if (!strich) return false;
      // Lange Striche auf Texthöhe sind eher Tabellenlinien als Streichungen – nicht raten, sondern abbrechen
      if (strich.b > 120) throw new Error(`S. ${seite.nr}: ${strich.b.toFixed(0)} pt langer Strich auf Höhe des Textstücks „${s.t}“ – Streichung oder Linie? Von Hand prüfen`);
      const naechstes = nachX.find((t) => Math.abs(t.y - s.y) < 0.5 && t.x > s.x + 0.1);
      const ende = naechstes ? naechstes.x : Infinity;
      if (ende > strich.x + strich.b + 0.6) throw new Error(`S. ${seite.nr}: Textstück „${s.t}“ nur teilweise durchgestrichen – von Hand prüfen`);
      return true;
    };
    const voll = [];
    for (const s of ss) {
      if (gestrichenesStueck(s)) {
        voll.push(`⟦${s.t}⟧`);
        if (s.t.trim()) {
          gestrichen.push(s.t);
          continue;
        }
      } else voll.push(s.t);
      const hoch = s.t.trim() !== "" && s.g < groesse * 0.8 && s.y > y + 1;
      if (!hoch) {
        anfuegen(teile, s.t, false);
        continue;
      }
      const [, vorn, kern, hinten] = s.t.match(/^(\s*)([\s\S]*?)(\s*)$/);
      if (vorn) anfuegen(teile, vorn, false);
      anfuegen(teile, kern, true);
      if (hinten) anfuegen(teile, hinten, false);
    }
    // Leerzeichen vor dem ersten sichtbaren Zeichen der Zeile sind Satzspiegel, kein Text
    while (teile.length && !teile[0].hoch && !teile[0].t.trim()) teile.shift();
    if (teile.length && !teile[0].hoch) teile[0].t = teile[0].t.trimStart();
    const sichtbar = ss.filter((s) => s.t.trim());
    const normal = sichtbar.filter((s) => s.g === groesse);
    const volltext = voll.join("");
    zeilen.push({
      seite: seite.nr,
      y,
      x: sichtbar[0].x + (sichtbar[0].t.length - sichtbar[0].t.trimStart().length) * groesse * 0.25,
      groesse,
      fett: normal.every((s) => s.fett),
      teile,
      text: volltext.replace(/[⟦⟧]/g, ""), // alle Zeichen der Zeile, auch durchgestrichene (Seitenvergleich)
      ...(gestrichen.length || volltext.includes("⟦")
        ? { gestrichen: [...volltext.matchAll(/\S*⟦[^⟧]*⟧\S*/g)].map((m) => ({ zeichen: m[0].match(/⟦([^⟧]*)⟧/g).map((x) => x.slice(1, -1)).join(""), wort: m[0] })) }
        : {}),
    });
  }
  return zeilen;
}

function anfuegen(teile, t, hoch) {
  const letztes = teile[teile.length - 1];
  if (letztes && letztes.hoch === hoch) letztes.t += t;
  else teile.push({ t, hoch });
}

/**
 * Auslesung 2: pdftotext -raw für einen Ausschnitt. Liefert den Text je Seite (Index = Seitennummer - 1).
 * Die Ränder werden in pt angegeben (wie bei pdftotext): Abstand vom jeweiligen Seitenrand.
 */
export function pdftotextSeiten(pdfDatei, zielDatei, { von, bis, links = 0, rechts = 0, oben = 0, unten = 0 }) {
  execFileSync(
    PDFTOTEXT,
    ["-raw", "-enc", "UTF-8", "-eol", "unix", "-f", String(von), "-l", String(bis),
      "-marginl", String(links), "-marginr", String(rechts), "-margint", String(oben), "-marginb", String(unten), pdfDatei, zielDatei],
    { stdio: "ignore" },
  );
  const seiten = fs.readFileSync(zielDatei, "utf8").split("\f");
  const out = [];
  for (let s = von; s <= bis; s++) out[s - 1] = seiten[s - von] ?? "";
  return out;
}

// ---------- Vergleich ----------

export const ohneLeerraum = (s) => s.replace(/[\s    ​ ﻿]+/g, "");

// Myers-Differenz zweier Zeichenfolgen (wie in import-mbo.mjs): Liste von Abweichungen { weg, neu, bei }.
export function differenz(a, b) {
  const n = a.length, m = b.length, max = n + m, off = max + 1;
  if (a === b) return [];
  const v = new Int32Array(2 * max + 3);
  const spur = [];
  for (let d = 0; d <= max; d++) {
    spur.push(v.slice());
    for (let k = -d; k <= d; k += 2) {
      let x = k === -d || (k !== d && v[off + k - 1] < v[off + k + 1]) ? v[off + k + 1] : v[off + k - 1] + 1;
      let y = x - k;
      while (x < n && y < m && a[x] === b[y]) x++, y++;
      v[off + k] = x;
      if (x >= n && y >= m) return gruppieren(zurueck(spur, n, m, d, off), a, b);
    }
    if (d > 400) return [{ weg: a.slice(0, 60), neu: b.slice(0, 60), bei: 0, abbruch: true }];
  }
  return [];
}
function zurueck(spur, n, m, dMax, off) {
  let x = n, y = m;
  const ops = [];
  for (let d = dMax; d > 0; d--) {
    const v = spur[d];
    const k = x - y;
    const vk = k === -d || (k !== d && v[off + k - 1] < v[off + k + 1]) ? k + 1 : k - 1;
    const vx = v[off + vk], vy = vx - vk;
    while (x > vx && y > vy) ops.push(["=", --x, --y]);
    if (x === vx) ops.push(["+", --y]);
    else ops.push(["-", --x]);
  }
  while (x > 0 && y > 0) ops.push(["=", --x, --y]);
  return ops.reverse();
}
function gruppieren(ops, a, b) {
  const out = [];
  let g = null;
  for (const op of ops) {
    if (op[0] === "=") {
      g = null;
      continue;
    }
    if (!g) out.push((g = { weg: "", neu: "", bei: op[0] === "-" ? op[1] : -1 }));
    if (op[0] === "-") {
      g.weg += a[op[1]];
      if (g.bei < 0) g.bei = op[1];
    } else g.neu += b[op[2] ?? op[1]];
  }
  return out;
}
