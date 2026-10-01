// SPDX-License-Identifier: AGPL-3.0-or-later
import assert from "node:assert/strict";
import { test } from "node:test";
import { kachelFuerPunkt, punktInRingen } from "../js/lookup.js";
import {
  alleAmPunkt, grenzPaar, kachelZuLonLat, meterJeEinheit, ordnePaar, wmsLink, zufall,
} from "../tools/lib/stichprobe.mjs";

const quadrat = (x0, y0, x1, y1) => [[
  { x: x0, y: y0 }, { x: x1, y: y0 }, { x: x1, y: y1 }, { x: x0, y: y1 }, { x: x0, y: y0 },
]];
const layer = (...flaechen) => ({
  length: flaechen.length,
  extent: 4096,
  feature: (i) => ({ type: 3, properties: { ars: flaechen[i].ars }, loadGeometry: () => flaechen[i].ringe }),
});

test("zufall: gleiche Saat, gleiche Folge, Werte in [0, 1)", () => {
  const a = zufall(7);
  const b = zufall(7);
  const folge = Array.from({ length: 50 }, () => a());
  assert.deepEqual(folge, Array.from({ length: 50 }, () => b()));
  assert.ok(folge.every((v) => v >= 0 && v < 1));
  assert.notDeepEqual(folge.slice(0, 5), Array.from({ length: 5 }, zufall(8)));
});

test("alleAmPunkt: findet jede Fläche am Punkt, auch überlappende", () => {
  const l = layer(
    { ars: "a", ringe: quadrat(0, 0, 2000, 2000) },
    { ars: "b", ringe: quadrat(1000, 1000, 3000, 3000) },
  );
  assert.deepEqual(alleAmPunkt(l, 500, 500).map((f) => f.properties.ars), ["a"]);
  assert.deepEqual(alleAmPunkt(l, 1500, 1500).map((f) => f.properties.ars), ["a", "b"]);
  assert.deepEqual(alleAmPunkt(l, 3500, 3500), []);
  assert.deepEqual(alleAmPunkt(null, 1, 1), []);
});

test("grenzPaar: ein Punkt innen, einer außen, im Abstand beiderseits der Kante", () => {
  const ringe = quadrat(1000, 1000, 3000, 3000);
  const rnd = zufall(1);
  for (let i = 0; i < 20; i++) {
    const p = grenzPaar(ringe, 4096, rnd, { abstand: 4 });
    assert.ok(p);
    assert.equal(punktInRingen(ringe, p.innen.x, p.innen.y), true);
    assert.equal(punktInRingen(ringe, p.aussen.x, p.aussen.y), false);
    assert.ok(Math.abs(Math.hypot(p.innen.x - p.aussen.x, p.innen.y - p.aussen.y) - 8) < 1e-9);
  }
});

test("grenzPaar: keine Paare an Schnittkanten am Kachelrand oder an zu kurzen Kanten", () => {
  // Fläche über die ganze Kachel (von tippecanoe am Puffer abgeschnitten): keine echte Grenze.
  assert.equal(grenzPaar(quadrat(-80, -80, 4176, 4176), 4096, zufall(1)), null);
  // Winzige Fläche: alle Kanten kürzer als 2 × Abstand.
  assert.equal(grenzPaar(quadrat(100, 100, 105, 105), 4096, zufall(1), { abstand: 4 }), null);
});

test("kachelZuLonLat kehrt kachelFuerPunkt um", () => {
  for (const [lon, lat] of [[11.5755, 48.1374], [6.9583, 50.9413], [13.3777, 52.5163]]) {
    const t = kachelFuerPunkt(lon, lat, 12);
    const r = kachelZuLonLat(t.z, t.x, t.y, t.fx * 4096, t.fy * 4096, 4096);
    assert.ok(Math.abs(r.lon - lon) < 1e-9 && Math.abs(r.lat - lat) < 1e-9);
  }
});

test("meterJeEinheit: z12, Ausdehnung 4096", () => {
  assert.ok(Math.abs(meterJeEinheit(0, 12, 4096) - 2.3887) < 1e-3);
  assert.ok(Math.abs(meterJeEinheit(60, 12, 4096) - 2.3887 / 2) < 1e-3);
});

test("wmsLink: GetFeatureInfo mit CRS:84 (Länge, Breite) und Punkt in der Mitte", () => {
  const u = new URL(wmsLink(11.5755, 48.1374));
  assert.equal(u.origin + u.pathname, "https://sgx.geodatenzentrum.de/wms_vg25");
  const p = u.searchParams;
  assert.equal(p.get("REQUEST"), "GetFeatureInfo");
  assert.equal(p.get("QUERY_LAYERS"), "vg25_gem");
  assert.equal(p.get("CRS"), "CRS:84");
  assert.equal(p.get("BBOX"), "11.575000,48.136900,11.576000,48.137900");
  assert.equal(p.get("I"), "50");
  assert.equal(p.get("J"), "50");
});

test("ordnePaar", () => {
  assert.equal(ordnePaar("a", ["a"], ["b"]), "nachbar");
  assert.equal(ordnePaar("a", ["a"], []), "leer");
  assert.equal(ordnePaar("a", ["a"], ["a"]), "eigene");
  assert.equal(ordnePaar("a", ["a", "b"], ["b"]), "ueberlappung");
  assert.equal(ordnePaar("a", ["a"], ["b", "c"]), "ueberlappung");
  assert.equal(ordnePaar("a", ["b"], []), "fehler");
});
