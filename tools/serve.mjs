#!/usr/bin/env node
// serve.mjs — Repo-Root lokal ausliefern, mit Range-Requests (PMTiles braucht 206).
// SPDX-License-Identifier: AGPL-3.0-or-later
//
//   node tools/serve.mjs [port]      → http://127.0.0.1:8080/
//
// `python -m http.server` beantwortet keine Range-Requests; dann lädt die Karte keine Kacheln.

import { createReadStream, statSync } from "node:fs";
import { createServer } from "node:http";
import { dirname, extname, join, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const PORT = Number(process.argv[2] ?? process.env.PORT ?? 8080);
const TYPEN = {
  ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8", ".pmtiles": "application/octet-stream",
  ".woff2": "font/woff2", ".svg": "image/svg+xml", ".png": "image/png", ".csv": "text/csv; charset=utf-8",
};

createServer((req, res) => {
  if (req.method !== "GET" && req.method !== "HEAD") {
    res.statusCode = 405;
    return res.end();
  }
  let pfad = decodeURIComponent(new URL(req.url, "http://x").pathname);
  if (pfad.endsWith("/")) pfad += "index.html";
  const datei = resolve(ROOT, `.${pfad}`);
  if (datei !== ROOT && !datei.startsWith(ROOT + sep)) {
    res.statusCode = 403;
    return res.end();
  }
  let groesse;
  try {
    const st = statSync(datei);
    if (!st.isFile()) throw new Error("kein File");
    groesse = st.size;
  } catch {
    res.statusCode = 404;
    return res.end("nicht gefunden");
  }
  let start = 0;
  let ende = groesse - 1;
  const range = /^bytes=(\d*)-(\d*)$/.exec(req.headers.range ?? "");
  if (range) {
    if (range[1] === "") start = Math.max(0, groesse - Number(range[2]));
    else {
      start = Number(range[1]);
      if (range[2] !== "") ende = Math.min(ende, Number(range[2]));
    }
    if (start > ende) {
      res.statusCode = 416;
      res.setHeader("Content-Range", `bytes */${groesse}`);
      return res.end();
    }
    res.statusCode = 206;
    res.setHeader("Content-Range", `bytes ${start}-${ende}/${groesse}`);
  }
  res.setHeader("Content-Type", TYPEN[extname(datei)] ?? "application/octet-stream");
  res.setHeader("Content-Length", ende - start + 1);
  res.setHeader("Accept-Ranges", "bytes");
  res.setHeader("Cache-Control", "no-cache");
  if (req.method === "HEAD") return res.end();
  createReadStream(datei, { start, end: ende }).pipe(res);
}).listen(PORT, "127.0.0.1", () => {
  console.log(`http://127.0.0.1:${PORT}/  (Wurzel ${join(ROOT, "")})`);
});
