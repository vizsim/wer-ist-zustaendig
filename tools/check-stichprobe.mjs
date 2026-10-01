#!/usr/bin/env node
// check-stichprobe.mjs — Stichprobe gegen die Grenzschicht (Abnahme A6).
// SPDX-License-Identifier: AGPL-3.0-or-later
//
//   node tools/check-stichprobe.mjs [--archiv <pmtiles>] [--n 200] [--grenze 20] [--abstand 5]
//                                   [--saat 1] [--bbox minLon,minLat,maxLon,maxLat] [--csv <datei>]
//
// 1. Zufallspunkte: n Punkte in den Grenzen des Archivs (oder --bbox). Jeder Punkt auf einer
//    Gemeinde muss in GENAU EINER Fläche liegen. Punkte ohne Fläche (Ausland, offene See) werden
//    verworfen und neu gezogen. Gemessen wird auch die Zeit je Nachschlagen.
// 2. Grenzpunkte: an Kanten der getroffenen Gemeinden je ein Punktpaar, --abstand Meter
//    beiderseits der Grenze. Innen genau die Gemeinde selbst, außen höchstens eine andere
//    (Nachbar) oder keine (Außengrenze, Küste – mitten im Land wäre es eine Lücke).
// 3. Die ersten --grenze Punkte mit Nachbar gehen mit Link zum BKG-Dienst (WMS VG25) in eine
//    CSV, zum Gegenprüfen von Hand: Der Dienst muss dort die erwartete Gemeinde nennen.
//
// Exit-Code 1 bei Überlappungen, bei Fehlern oder wenn zu wenige Punkte zustande kommen.
// Saat fest → gleiche Punkte bei gleichem Archiv; für eine neue Stichprobe --saat ändern.

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { VectorTile } from "@mapbox/vector-tile";
import { PbfReader } from "pbf";
import { kachelFuerPunkt } from "../js/lookup.js";
import { oeffneArchiv } from "./lib/pmtiles-node.mjs";
import {
  alleAmPunkt, grenzPaar, kachelZuLonLat, meterJeEinheit, ordnePaar, wmsLink, zufall,
} from "./lib/stichprobe.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const arg = (name, fallback) => {
  const i = process.argv.indexOf(`--${name}`);
  return i > 0 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
};
const archivPfad = arg("archiv", join(ROOT, "pipeline/data/zustaendigkeit/gemeinden.pmtiles"));
const N = Number(arg("n", 200));
const GRENZE = Number(arg("grenze", 20));
const ABSTAND_M = Number(arg("abstand", 5));
const rnd = zufall(Number(arg("saat", 1)));
const csvPfad = resolve(arg("csv", join(ROOT, "pipeline/data/review/grenzpunkte.csv")));
const LAYER = "gemeinden";

const { archiv, schliessen } = oeffneArchiv(archivPfad);
const kacheln = new Map();

async function kachel(t) {
  const key = `${t.z}/${t.x}/${t.y}`;
  if (!kacheln.has(key)) {
    const k = await archiv.getZxy(t.z, t.x, t.y);
    const layer = k?.data ? new VectorTile(new PbfReader(new Uint8Array(k.data))).layers[LAYER] : null;
    kacheln.set(key, layer ?? null);
  }
  return kacheln.get(key);
}

const arsVon = (features) => features.map((f) => String(f.properties.ars));

let fehlerhaft = false;
try {
  const header = await archiv.getHeader();
  const z = header.maxZoom;
  const [minLon, minLat, maxLon, maxLat] = arg("bbox", "")
    ? arg("bbox").split(",").map(Number)
    : [header.minLon, header.minLat, header.maxLon, header.maxLat];

  // 1. Zufallspunkte
  const punkte = [];
  let versuche = 0;
  let ueberlappt = 0;
  const t0 = performance.now();
  while (punkte.length < N && versuche < N * 50) {
    versuche += 1;
    const lon = minLon + rnd() * (maxLon - minLon);
    const lat = minLat + rnd() * (maxLat - minLat);
    const t = kachelFuerPunkt(lon, lat, z);
    const layer = await kachel(t);
    if (!layer) continue;
    const treffer = alleAmPunkt(layer, t.fx * layer.extent, t.fy * layer.extent);
    if (!treffer.length) continue;
    if (treffer.length > 1) {
      ueberlappt += 1;
      console.log(`✗ Überlappung bei ${lat.toFixed(6)}, ${lon.toFixed(6)}: ${arsVon(treffer).join(", ")}`);
    }
    punkte.push({ lon, lat, t, layer, f: treffer[0] });
  }
  const msJePunkt = (performance.now() - t0) / Math.max(1, versuche);
  console.log(
    `Zufallspunkte: ${punkte.length} auf Gemeinden (${versuche - punkte.length} außerhalb verworfen), ` +
    `${punkte.length - ueberlappt} mit genau einem ARS, ${ueberlappt} mit mehreren · ` +
    `${msJePunkt.toFixed(2)} ms je Nachschlagen (${kacheln.size} Kacheln, Datei lokal)`,
  );
  if (ueberlappt || punkte.length < N) fehlerhaft = true;
  if (punkte.length < N) console.log(`✗ nur ${punkte.length} von ${N} Punkten gefunden – --bbox prüfen`);

  // 2. Grenzpunkte
  const zaehler = { nachbar: 0, leer: 0, eigene: 0, ueberlappung: 0, fehler: 0 };
  const liste = [];
  const leere = [];
  for (const p of punkte) {
    const { layer, t, f } = p;
    const abstand = ABSTAND_M / meterJeEinheit(p.lat, z, layer.extent);
    const paar = grenzPaar(f.loadGeometry(), layer.extent, rnd, { abstand });
    if (!paar) continue;
    const eigene = String(f.properties.ars);
    const innen = alleAmPunkt(layer, paar.innen.x, paar.innen.y);
    const aussen = alleAmPunkt(layer, paar.aussen.x, paar.aussen.y);
    const art = ordnePaar(eigene, arsVon(innen), arsVon(aussen));
    zaehler[art] += 1;
    const ort = kachelZuLonLat(t.z, t.x, t.y, paar.aussen.x, paar.aussen.y, layer.extent);
    if (art === "ueberlappung" || art === "fehler") {
      console.log(`✗ ${art} an der Grenze von ${eigene} bei ${ort.lat.toFixed(6)}, ${ort.lon.toFixed(6)}`);
    } else if (art === "leer" && leere.length < 5) {
      leere.push(ort);
    } else if (art === "nachbar" && liste.length < GRENZE) {
      const n = aussen[0].properties;
      liste.push({
        lat: ort.lat.toFixed(6), lon: ort.lon.toFixed(6), erwartet: String(n.ars), gemeinde: n.gen ?? "",
        andere_seite: eigene, andere_gemeinde: f.properties.gen ?? "", abstand_m: ABSTAND_M,
        wms: wmsLink(ort.lon, ort.lat),
      });
    }
  }
  const geprueft = Object.values(zaehler).reduce((a, b) => a + b, 0);
  console.log(
    `Grenzpunkte (${ABSTAND_M} m beiderseits): ${geprueft} Paare · Nachbar ${zaehler.nachbar} · ` +
    `außen leer ${zaehler.leer} · eigene Teilfläche ${zaehler.eigene} · ` +
    `Überlappung ${zaehler.ueberlappung} · Fehler ${zaehler.fehler}`,
  );
  if (zaehler.ueberlappung || zaehler.fehler) fehlerhaft = true;
  for (const o of leere) {
    console.log(`  außen leer (Außengrenze, Küste – oder Lücke?): ${o.lat.toFixed(6)}, ${o.lon.toFixed(6)}`);
  }

  // 3. Liste zum Gegenprüfen
  if (liste.length) {
    const kopf = Object.keys(liste[0]);
    const zelle = (v) => (/[;"\n]/.test(String(v)) ? `"${String(v).replaceAll('"', '""')}"` : String(v));
    const csv = [kopf.join(";"), ...liste.map((r) => kopf.map((k) => zelle(r[k])).join(";"))].join("\n");
    mkdirSync(dirname(csvPfad), { recursive: true });
    writeFileSync(csvPfad, `﻿${csv}\n`);
    console.log(`${liste.length} Grenzpunkte zum Gegenprüfen am BKG-Dienst → ${csvPfad}`);
    for (const r of liste.slice(0, 3)) console.log(`  ${r.lat}, ${r.lon}  erwartet ${r.erwartet} ${r.gemeinde}`);
  }
} finally {
  await schliessen();
}
process.exit(fehlerhaft ? 1 : 0);
