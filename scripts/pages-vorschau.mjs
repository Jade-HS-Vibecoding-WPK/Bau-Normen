// Zeigt die statische Online-Version (out/) lokal so an, wie GitHub Pages sie ausliefert: unter /<Name des Repositorys>/
// (Standard /ParaGecko; auf GitHub setzt der Workflow den Namen automatisch).
// Aufruf: npm run build:pages && npm run preview:pages   →  http://localhost:3100/ParaGecko/
import { createReadStream, existsSync, statSync } from "node:fs";
import { createServer } from "node:http";
import path from "node:path";

const BASIS = process.env.NEXT_PUBLIC_BASIS ?? "/ParaGecko";
const PORT = Number(process.env.PORT ?? 3100);
const WURZEL = path.resolve("out");
const TYPEN = {
  ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".css": "text/css", ".json": "application/json",
  ".svg": "image/svg+xml", ".png": "image/png", ".ico": "image/x-icon", ".woff2": "font/woff2", ".txt": "text/plain",
};

createServer((req, res) => {
  const url = decodeURIComponent((req.url ?? "/").split("?")[0]);
  if (!url.startsWith(`${BASIS}/`)) {
    res.writeHead(302, { Location: `${BASIS}/` }).end();
    return;
  }
  let datei = path.join(WURZEL, url.slice(BASIS.length));
  if (!datei.startsWith(WURZEL)) return res.writeHead(403).end();
  if (existsSync(datei) && statSync(datei).isDirectory()) datei = path.join(datei, "index.html");
  if (!existsSync(datei)) return res.writeHead(404, { "Content-Type": "text/plain" }).end("404");
  res.writeHead(200, { "Content-Type": TYPEN[path.extname(datei)] ?? "application/octet-stream" });
  createReadStream(datei).pipe(res);
}).listen(PORT, () => console.log(`Online-Version: http://localhost:${PORT}${BASIS}/`));
