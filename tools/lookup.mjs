#!/usr/bin/env node
// lookup.mjs — Gemeinde und vermutlich zuständige Stelle an einem Punkt (Kommandozeile).
// SPDX-License-Identifier: AGPL-3.0-or-later
//
//   node tools/lookup.mjs <lat> <lon> [klasse …] [--daten <ordner oder URL>]
//
// Beispiel: node tools/lookup.mjs 48.1374 11.5755 G K
// --daten: Ordner bzw. Basis-URL mit gemeinden.pmtiles und <land>.json
// (Default pipeline/data/zustaendigkeit). Klassen: A B L K G unklar (strassenklasse.js).

import { readFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { landAusArs, landesdatei } from "../js/laender.js";
import { eintragsSchluessel } from "../js/lookup.js";
import { auswahl } from "../js/resolve.js";
import { flaecheAmPunkt, oeffneArchiv } from "./lib/pmtiles-node.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const iDaten = args.indexOf("--daten");
const basis = iDaten >= 0 ? args.splice(iDaten, 2)[1] : join(ROOT, "pipeline/data/zustaendigkeit");
const [lat, lon, ...klassen] = args;
if (!lat || !lon) {
  console.error("Aufruf: node tools/lookup.mjs <lat> <lon> [klasse …] [--daten <ordner|url>]");
  process.exit(2);
}

const istUrl = /^https?:\/\//.test(basis);
const pfad = (datei) => (istUrl ? `${basis.replace(/\/$/, "")}/${datei}` : join(basis, datei));
const lies = async (datei) =>
  JSON.parse(istUrl ? await (await fetch(pfad(datei))).text() : await readFile(pfad(datei), "utf8"));

/** Kontakt in einer Zeile: Name, erste Nummer, erste E-Mail, erste Webseite. */
const kontakt = (k) =>
  [k.name, k.telefon?.[0], k.email?.[0], k.web?.[0]].filter(Boolean).join(" · ");

const { archiv, schliessen } = oeffneArchiv(pfad("gemeinden.pmtiles"));
try {
  const props = await flaecheAmPunkt(archiv, Number(lon), Number(lat));
  if (!props?.ars) {
    console.log("Keine Gemeinde an diesem Punkt (außerhalb Deutschlands oder auf See).");
    process.exit(1);
  }
  const land = landAusArs(props.ars);
  const daten = await lies(landesdatei(land.lkz));
  // In Berlin der Bezirk aus dem Layer `bezirke`, sonst der ARS.
  const bezirk = await flaecheAmPunkt(archiv, Number(lon), Number(lat), "bezirke");
  const schluessel = eintragsSchluessel(props, bezirk, daten.gemeinden);
  const r = auswahl(daten, schluessel, klassen);
  console.log(`${r.gemeinde} (${schluessel}), ${r.kreis}, ${land.name}`);
  console.log(`Klasse ${r.klasse}: ${r.zustaendig.name}`);
  if (r.kontakt) console.log(`Kontakt: ${kontakt(r.kontakt)}`);
  console.log(`Sicherheit: ${r.sicherheit} – ${r.grund}`);
  if (r.alternative) {
    console.log(`Alternative: ${r.alternative.stelle.name} (${r.alternative.bedingung})`);
    if (r.alternative.kontakt) console.log(`  Kontakt: ${kontakt(r.alternative.kontakt)}`);
  }
  for (const h of r.hinweise) console.log(`Hinweis: ${h}`);
  console.log(`Quelle: ${r.quelle}`);
} finally {
  await schliessen();
}
