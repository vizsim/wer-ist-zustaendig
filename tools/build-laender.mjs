#!/usr/bin/env node
// build-laender.mjs — gemeinden_attr.json → zustaendigkeit/<land>.json, index.json, Review-CSV.
// SPDX-License-Identifier: AGPL-3.0-or-later
//
//   node tools/build-laender.mjs [--attr <datei>] [--aus <ordner>] [--review <datei>]
//                                [--kontakte <datei>]
//
// Defaults: pipeline/data/interim/gemeinden_attr.json → pipeline/data/zustaendigkeit/,
// Review-CSV nach pipeline/data/review/ (nicht deployen, nicht einchecken). Kontakte
// (kontakte.json aus `zust kontakte`) nur, wenn angegeben.

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { gzipSync } from "node:zlib";
import { baueLaender, reviewCsv, serialisiere } from "./lib/laender.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

function arg(name, fallback) {
  const i = process.argv.indexOf(`--${name}`);
  return i > 0 && process.argv[i + 1] ? resolve(process.argv[i + 1]) : fallback;
}

const attrPfad = arg("attr", join(ROOT, "pipeline/data/interim/gemeinden_attr.json"));
const ausOrdner = arg("aus", join(ROOT, "pipeline/data/zustaendigkeit"));
const reviewPfad = arg("review", join(ROOT, "pipeline/data/review/zustaendigkeit-review.csv"));
const kontaktePfad = arg("kontakte", null);

const attr = JSON.parse(readFileSync(attrPfad, "utf8"));
const kontakte = kontaktePfad ? JSON.parse(readFileSync(kontaktePfad, "utf8")) : null;
const { dateien, index, review } = baueLaender(attr, { kontakte });

mkdirSync(ausOrdner, { recursive: true });
const groesse = {};
for (const [datei, inhalt] of Object.entries(dateien)) {
  const text = serialisiere(inhalt);
  writeFileSync(join(ausOrdner, datei), text);
  groesse[datei] = { roh: Buffer.byteLength(text), gzip: gzipSync(text, { level: 9 }).length };
}
writeFileSync(join(ausOrdner, "index.json"), `${JSON.stringify(index, null, 2)}\n`);
mkdirSync(dirname(reviewPfad), { recursive: true });
writeFileSync(reviewPfad, reviewCsv(review));

const kb = (b) => `${(b / 1024).toFixed(0).padStart(5)} KB`;
for (const l of index.laender) {
  const s = l.sicherheit;
  const g = groesse[l.datei];
  console.log(
    `${l.lkz}  ${String(l.gemeinden).padStart(5)} Gemeinden  ` +
    `belegt ${s.belegt} · vermutlich ${s.vermutlich} · nur Ebene ${s["nur Ebene"]}  ` +
    `→ ${l.datei} ${kb(g.roh)} (gzip ${kb(g.gzip).trim()})` +
    (l.kontakte === undefined ? "" : `  · Kontakt für ${l.kontakte}`),
  );
}
const summe = Object.values(groesse).reduce((a, g) => ({ roh: a.roh + g.roh, gzip: a.gzip + g.gzip }), { roh: 0, gzip: 0 });
console.log(
  `index.json + ${Object.keys(dateien).length} Landesdateien → ${ausOrdner} ` +
  `(zusammen ${kb(summe.roh).trim()}, gzip ${kb(summe.gzip).trim()})`,
);
console.log(`Review-CSV (${review.length} Zeilen) → ${reviewPfad}`);
