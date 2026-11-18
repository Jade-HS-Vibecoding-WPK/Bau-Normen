// Nimmt die Bildschirmfotos für die README neu auf (docs/bilder/*.png).
// Aufruf: zuerst die Online-Fassung bauen und lokal zeigen (npm run build:pages, dann npm run pages:vorschau o. Ä.),
// danach:  node scripts/bilder-aufnehmen.mjs [http://localhost:3101/Bau-Normen/]
// Steuert Microsoft Edge (oder Chrome) ohne Fenster über das DevTools-Protokoll; keine zusätzlichen Pakete nötig.
// Die Ortsauskunft fragt echte Dienste ab: Fällt einer aus, sieht man das auch auf dem Foto.
import { spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const URL_APP = process.argv[2] ?? "http://localhost:3101/Bau-Normen/";
const ZIEL = path.resolve("docs/bilder");
const PORT = 9333;
const BROWSER = [
  "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
  "C:/Program Files/Microsoft/Edge/Application/msedge.exe",
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "/usr/bin/chromium",
  "/usr/bin/google-chrome",
].find((p) => fs.existsSync(p));
if (!BROWSER) throw new Error("Kein Edge/Chrome gefunden");

const profil = fs.mkdtempSync(path.join(os.tmpdir(), "bilder-"));
const browser = spawn(BROWSER, [`--headless=new`, `--remote-debugging-port=${PORT}`, `--user-data-dir=${profil}`, "--hide-scrollbars", "--disable-gpu", "about:blank"], { stdio: "ignore" });
const warte = (ms) => new Promise((r) => setTimeout(r, ms));

let seite;
for (let i = 0; i < 50 && !seite; i++) {
  try {
    const liste = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json();
    seite = liste.find((x) => x.type === "page");
  } catch {
    await warte(200);
  }
}
const ws = new WebSocket(seite.webSocketDebuggerUrl);
await new Promise((ok) => ws.addEventListener("open", ok, { once: true }));
let nr = 0;
const offen = new Map();
ws.addEventListener("message", (ev) => {
  const m = JSON.parse(ev.data);
  if (m.id && offen.has(m.id)) {
    offen.get(m.id)(m);
    offen.delete(m.id);
  }
});
const cdp = (method, params = {}) =>
  new Promise((ok, fehler) => {
    const id = ++nr;
    offen.set(id, (m) => (m.error ? fehler(new Error(`${method}: ${m.error.message}`)) : ok(m.result)));
    ws.send(JSON.stringify({ id, method, params }));
  });
const js = async (code) => {
  const r = await cdp("Runtime.evaluate", { expression: `(async () => { ${code} })()`, awaitPromise: true, returnByValue: true });
  if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description ?? "Fehler im Seitenskript");
  return r.result.value;
};

// Hilfsfunktionen in der Seite: Frage absenden, Formular füllen, auf die Antwort warten
const HILFEN = `
  window.__w = (ms) => new Promise((r) => setTimeout(r, ms));
  window.__antworten = () => document.querySelectorAll('.verlauf > .antworten').length;
  window.__fertig = async (n) => { for (let i = 0; i < 600 && window.__antworten() < n; i++) await window.__w(50); };
  window.__setze = (el, w) => { const p = el.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype; Object.getOwnPropertyDescriptor(p, 'value').set.call(el, w); el.dispatchEvent(new Event('input', { bubbles: true })); };
  window.__frage = async (text) => { const f = document.querySelector('form.eingabe textarea'); const n = window.__antworten(); window.__setze(f, text); await window.__w(50); f.closest('form').requestSubmit(); await window.__fertig(n + 1); await window.__w(600); };
`;

async function szene({ name, breite, hoehe, faktor = 2, mobil = false, dunkel = false, ablauf = "" }) {
  await cdp("Emulation.setDeviceMetricsOverride", { width: breite, height: hoehe, deviceScaleFactor: faktor, mobile: mobil });
  await cdp("Emulation.setEmulatedMedia", { features: [{ name: "prefers-color-scheme", value: dunkel ? "dark" : "light" }] });
  await cdp("Page.navigate", { url: URL_APP });
  await warte(1500);
  await js("localStorage.clear(); sessionStorage.clear();");
  await cdp("Page.reload", { ignoreCache: true });
  for (let i = 0; i < 100; i++) {
    if (await js("return !!document.querySelector('form.eingabe textarea')")) break;
    await warte(100);
  }
  await warte(1800); // Schriften, Vorladen der Daten, Gecko setzt sich
  await js(HILFEN + ablauf + "\nwindow.scrollTo(0, 0);");
  await warte(900);
  const { data } = await cdp("Page.captureScreenshot", { format: "png" });
  fs.writeFileSync(path.join(ZIEL, `${name}.png`), Buffer.from(data, "base64"));
  console.log(`${name}.png  ${breite * faktor} × ${hoehe * faktor}`);
}

await cdp("Page.enable");
await cdp("Runtime.enable");

const ADRESSE = `
  window.__setze(document.getElementById('strasse'), 'Gartenstraße');
  window.__setze(document.getElementById('hnr'), '5');
  window.__setze(document.getElementById('ortname'), 'Oldenburg');
  await window.__w(100);
  const n = window.__antworten(); document.getElementById('strasse').closest('form').requestSubmit(); await window.__fertig(n + 1);
`;
// nur den Antwortbereich scrollen (der Kopf der Seite soll im Bild bleiben)
const ZUR_SKIZZE = `await window.__w(500);
  const v = document.querySelector('.verlauf'); const s = document.querySelector('[id^="skizze"]');
  if (v && s) v.scrollTop += s.getBoundingClientRect().top - v.getBoundingClientRect().top - 60;
  window.scrollTo(0, 0); await window.__w(7000);`;
const EN = `[...document.querySelectorAll('button')].find((b) => b.textContent.trim() === 'EN')?.click(); await window.__w(400);`;

await szene({ name: "vorschau-hell", breite: 1080, hoehe: 675, ablauf: ADRESSE + ZUR_SKIZZE });
await szene({ name: "vorschau-dunkel", breite: 1080, hoehe: 675, dunkel: true, ablauf: "await window.__frage('§ 34 BauGB');" });
await szene({ name: "vorschau-mobil", breite: 390, hoehe: 844, faktor: 3, mobil: true });
await szene({ name: "startseite", breite: 1080, hoehe: 675 });
await szene({ name: "paragraph", breite: 1080, hoehe: 675, ablauf: "await window.__frage('§ 34 BauGB');" });
await szene({ name: "ortsauskunft", breite: 1080, hoehe: 675, ablauf: ADRESSE + "await window.__w(1500);" });
await szene({ name: "dunkel-englisch", breite: 1080, hoehe: 675, dunkel: true, ablauf: EN + "await window.__frage('Damm 30, Oldenburg'); await window.__w(1500);" });
await szene({ name: "mobil", breite: 390, hoehe: 844, faktor: 3, mobil: true });
await szene({ name: "mobil-paragraph", breite: 390, hoehe: 844, faktor: 3, mobil: true, ablauf: "await window.__frage('§ 8 NDSchG'); await window.__w(800);" });

ws.close();
browser.kill();
await warte(500);
try {
  fs.rmSync(profil, { recursive: true, force: true });
} catch {
  /* Profilordner ist noch gesperrt: bleibt im Temp-Ordner liegen */
}
