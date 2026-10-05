#!/usr/bin/env node
// check-kontakte.mjs — Hat die zuständige Stelle je Gemeinde und Straßenklasse einen Kontakt?
// SPDX-License-Identifier: AGPL-3.0-or-later
//
//   node tools/check-kontakte.mjs [LKZ …] [--daten <ordner>] [--alle]
//
// Liest die Landesdateien (Default pipeline/data/zustaendigkeit, ohne LKZ alle Länder mit
// Kontakten) und schlägt jede Gemeinde mit `auswahl()` nach – für G, K, L, B und „unklar"
// (kein Straßentreffer). Zählt, wo der zuständigen Stelle oder der Alternative der Kontakt fehlt,
// und nennt die ersten Lücken (mit --alle jede). Ziel beim Einbau eines Landes: keine Lücke bei
// der zuständigen Stelle (docs/LAND-EINBAUEN.md).

import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { landesdatei } from "../js/laender.js";
import { auswahl } from "../js/resolve.js";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const iDaten = args.indexOf("--daten");
const ordner = iDaten >= 0 ? resolve(args.splice(iDaten, 2)[1]) : join(ROOT, "pipeline/data/zustaendigkeit");
const alle = args.includes("--alle");
const lies = (datei) => JSON.parse(readFileSync(join(ordner, datei), "utf8"));

const index = lies("index.json");
const gewaehlt = args.filter((a) => !a.startsWith("--")).map((a) => a.toUpperCase());
const laender = index.laender.filter((l) => (gewaehlt.length ? gewaehlt.includes(l.lkz) : l.kontakte));
if (!laender.length) {
  console.error(gewaehlt.length ? `Keine Landesdatei für ${gewaehlt.join(", ")}.` : "Kein Land mit Kontakten.");
  process.exit(2);
}

const KLASSEN = [["G"], ["K"], ["L"], ["B"], []];
let fehlerGesamt = 0;
for (const l of laender) {
  const daten = lies(landesdatei(l.lkz));
  const zahl = Object.fromEntries(KLASSEN.map((k) => [k.join("") || "unklar", { ohne: 0, altOhne: 0 }]));
  const luecken = new Map();
  const allgemein = new Set(); // Kontakt ist nur die allgemeine Anschrift der Verwaltung
  for (const ars of Object.keys(daten.gemeinden)) {
    for (const klassen of KLASSEN) {
      const r = auswahl(daten, ars, klassen);
      const z = zahl[klassen.join("") || "unklar"];
      if (!r.kontakt) {
        z.ohne += 1;
        luecken.set(ars, `${ars} ${r.gemeinde} → ${r.zustaendig.name}`);
      } else if (r.kontakt.allgemein) {
        allgemein.add(ars);
      }
      if (r.alternative && !r.alternative.kontakt) z.altOhne += 1;
    }
  }
  const n = Object.keys(daten.gemeinden).length;
  const nAllgemein = [...allgemein].filter((ars) => !luecken.has(ars)).length;
  console.log(`${l.lkz} ${l.name}: ${n} Gemeinden, ${n - luecken.size} mit Kontakt der zuständigen Stelle in jeder Klasse` +
    (nAllgemein ? ` (bei ${nAllgemein} davon die allgemeine Anschrift der Verwaltung)` : ""));
  for (const [k, z] of Object.entries(zahl)) {
    console.log(`  ${k.padEnd(6)} ohne Kontakt ${String(z.ohne).padStart(5)} · Alternative ohne Kontakt ${String(z.altOhne).padStart(5)}`);
  }
  const liste = [...luecken.values()];
  for (const zeile of alle ? liste : liste.slice(0, 15)) console.log(`  – ${zeile}`);
  if (!alle && liste.length > 15) console.log(`  … und ${liste.length - 15} weitere (--alle)`);
  fehlerGesamt += luecken.size;
}
process.exit(fehlerGesamt ? 1 : 0);
