#!/usr/bin/env node
// check-golden.mjs — feste Punkte gegen die gebaute Grenzschicht prüfen (Abnahme A6).
// SPDX-License-Identifier: AGPL-3.0-or-later
//
//   node tools/check-golden.mjs [--archiv <pmtiles>] [--punkte <json>]
//
// Defaults: pipeline/data/zustaendigkeit/gemeinden.pmtiles, tests/golden-punkte.json.
// Ausgabe je Punkt; Exit-Code 1, sobald ein ARS nicht stimmt.

import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { flaecheAmPunkt, oeffneArchiv } from "./lib/pmtiles-node.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const arg = (name, fallback) => {
  const i = process.argv.indexOf(`--${name}`);
  return i > 0 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
};
const archivPfad = arg("archiv", join(ROOT, "pipeline/data/zustaendigkeit/gemeinden.pmtiles"));
const punkte = JSON.parse(readFileSync(arg("punkte", join(ROOT, "tests/golden-punkte.json")), "utf8"));

const { archiv, schliessen } = oeffneArchiv(archivPfad);
let fehler = 0;
const t0 = performance.now();
try {
  for (const p of punkte) {
    const props = await flaecheAmPunkt(archiv, p.lon, p.lat);
    const ist = props?.ars ?? "–";
    const ok = ist === p.ars;
    if (!ok) fehler += 1;
    console.log(`${ok ? "✓" : "✗"} ${p.name.padEnd(26)} ${p.ars}  ${ok ? "" : `gefunden: ${ist}`}`);
  }
} finally {
  await schliessen();
}
const ms = (performance.now() - t0) / punkte.length;
console.log(`${punkte.length - fehler}/${punkte.length} richtig · ${ms.toFixed(1)} ms je Punkt (Datei lokal)`);
process.exit(fehler ? 1 : 0);
