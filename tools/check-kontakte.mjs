#!/usr/bin/env node
// check-kontakte.mjs — Hat die zuständige Stelle je Gemeinde und Straßenklasse einen Kontakt?
// SPDX-License-Identifier: AGPL-3.0-or-later
//
//   node tools/check-kontakte.mjs [LKZ …] [--daten <ordner>] [--alle] [--stellen]
//
// Liest die Landesdateien (Default pipeline/data/zustaendigkeit, ohne LKZ alle Länder mit
// Kontakten) und schlägt jede Gemeinde mit `auswahl()` nach – für G, K, L, B und „unklar"
// (kein Straßentreffer). Zählt, wo der zuständigen Stelle oder der Alternative der Kontakt fehlt,
// und nennt die ersten Lücken (mit --alle jede). Ziel beim Einbau eines Landes: keine Lücke bei
// der zuständigen Stelle (docs/LAND-EINBAUEN.md).
//
// --stellen: statt der Gemeinden die Stellen ohne Kontakt, nach der Zahl der Gemeinden, in denen sie
// zuständig sind (dann als Alternative) – mit dem Schlüssel, der die Lücke in
// pipeline/config/kontakte_ergaenzt.yaml schließt.

import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { landesdatei } from "../js/laender.js";
import { ergaenzungsSchluessel, kontaktLuecken, stellenListe } from "./lib/kontaktluecken.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const iDaten = args.indexOf("--daten");
const ordner = iDaten >= 0 ? resolve(args.splice(iDaten, 2)[1]) : join(ROOT, "pipeline/data/zustaendigkeit");
const alle = args.includes("--alle");
const jeStelle = args.includes("--stellen");
const lies = (datei) => JSON.parse(readFileSync(join(ordner, datei), "utf8"));

const index = lies("index.json");
const gewaehlt = args.filter((a) => !a.startsWith("--")).map((a) => a.toUpperCase());
const laender = index.laender.filter((l) => (gewaehlt.length ? gewaehlt.includes(l.lkz) : l.kontakte));
if (!laender.length) {
  console.error(gewaehlt.length ? `Keine Landesdatei für ${gewaehlt.join(", ")}.` : "Kein Land mit Kontakten.");
  process.exit(2);
}

/** Erste 15 Zeilen, mit --alle jede. */
function zeige(liste) {
  for (const zeile of alle ? liste : liste.slice(0, 15)) console.log(`  – ${zeile}`);
  if (!alle && liste.length > 15) console.log(`  … und ${liste.length - 15} weitere (--alle)`);
}

let fehlerGesamt = 0;
for (const l of laender) {
  const daten = lies(landesdatei(l.lkz));
  const { zahl, luecken, allgemein, stellen } = kontaktLuecken(daten);
  const n = Object.keys(daten.gemeinden).length;
  const nAllgemein = [...allgemein].filter((ars) => !luecken.has(ars)).length;
  console.log(`${l.lkz} ${l.name}: ${n} Gemeinden, ${n - luecken.size} mit Kontakt der zuständigen Stelle in jeder Klasse` +
    (nAllgemein ? ` (bei ${nAllgemein} davon die allgemeine Anschrift der Verwaltung)` : ""));
  for (const [k, z] of Object.entries(zahl)) {
    console.log(`  ${k.padEnd(6)} ohne Kontakt ${String(z.ohne).padStart(5)} · Alternative ohne Kontakt ${String(z.altOhne).padStart(5)}`);
  }
  if (jeStelle) {
    const liste = stellenListe(stellen);
    if (liste.length) console.log(`  ${liste.length} Stellen ohne Kontakt:`);
    zeige(liste.map((s) => {
      const beispiel = [...s.gemeinden, ...s.alternative][0];
      const schluessel = ergaenzungsSchluessel(s.id, beispiel);
      const gemeinden = (n) => `${n} ${n === 1 ? "Gemeinde" : "Gemeinden"}`;
      const teile = [
        s.gemeinden.size && `zuständig in ${gemeinden(s.gemeinden.size)} (${[...s.klassen].join(", ")})`,
        s.alternative.size && `als Alternative in ${gemeinden(s.alternative.size)}`,
      ].filter(Boolean).join(", ");
      return `${s.id} ${s.name}: ${teile}${schluessel ? ` → kontakte_ergaenzt.yaml: ${schluessel}` : ""}`;
    }));
  } else {
    zeige([...luecken.values()]);
  }
  fehlerGesamt += luecken.size;
}
process.exit(fehlerGesamt ? 1 : 0);
