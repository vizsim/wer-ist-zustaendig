// SPDX-License-Identifier: AGPL-3.0-or-later
import { test } from "node:test";
import assert from "node:assert/strict";
import { eintragsSchluessel, featureAmPunkt, kachelFuerPunkt, punktInRingen } from "../js/lookup.js";

test("kachelFuerPunkt: bekannte Kacheln", () => {
  // Marienplatz München in z12: Kachel 2179/1421 (Web-Mercator, von Hand nachgerechnet).
  const t = kachelFuerPunkt(11.5755, 48.1374, 12);
  assert.deepEqual([t.z, t.x, t.y], [12, 2179, 1421]);
  assert.ok(t.fx >= 0 && t.fx < 1 && t.fy >= 0 && t.fy < 1);
  // Nullmeridian/Äquator: Mitte der Welt
  const o = kachelFuerPunkt(0, 0, 1);
  assert.deepEqual([o.x, o.y], [1, 1]);
  assert.throws(() => kachelFuerPunkt(undefined, 1, 1), /fehlen/);
});

const quadrat = (x0, y0, x1, y1) => [
  { x: x0, y: y0 }, { x: x1, y: y0 }, { x: x1, y: y1 }, { x: x0, y: y1 }, { x: x0, y: y0 },
];

test("punktInRingen: Außenring mit Loch", () => {
  const ringe = [quadrat(0, 0, 100, 100), quadrat(40, 40, 60, 60)];
  assert.equal(punktInRingen(ringe, 10, 10), true);
  assert.equal(punktInRingen(ringe, 50, 50), false); // im Loch
  assert.equal(punktInRingen(ringe, 150, 50), false);
});

test("punktInRingen: Mehrfachfläche (Exklave)", () => {
  const ringe = [quadrat(0, 0, 10, 10), quadrat(20, 20, 30, 30)];
  assert.equal(punktInRingen(ringe, 25, 25), true);
  assert.equal(punktInRingen(ringe, 15, 15), false);
});

test("featureAmPunkt: erstes Polygon, das den Punkt enthält", () => {
  const feats = [
    { type: 2, properties: { ars: "linie" }, loadGeometry: () => [quadrat(0, 0, 4096, 4096)] },
    { type: 3, properties: { ars: "000000000001" }, loadGeometry: () => [quadrat(0, 0, 2048, 4096)] },
    { type: 3, properties: { ars: "000000000002" }, loadGeometry: () => [quadrat(2048, 0, 4096, 4096)] },
  ];
  const layer = { extent: 4096, length: feats.length, feature: (i) => feats[i] };
  assert.equal(featureAmPunkt(layer, 0.25, 0.5).properties.ars, "000000000001");
  assert.equal(featureAmPunkt(layer, 0.75, 0.5).properties.ars, "000000000002");
  assert.equal(featureAmPunkt(null, 0.5, 0.5), null);
});

test("eintragsSchluessel: in Berlin der Bezirk, sonst der ARS", () => {
  const berlin = { ars: "110000000000", gen: "Berlin" };
  assert.equal(eintragsSchluessel(berlin, { bezirk: "110000000007" }), "110000000007");
  assert.equal(eintragsSchluessel(berlin), "110000000000", "ohne Bezirk: ganz Berlin");
  assert.equal(eintragsSchluessel(berlin, { bezirk: "" }), "110000000000");
  assert.equal(eintragsSchluessel({ ars: "120630000001" }, { bezirk: "110000000005" }), "120630000001",
    "Bezirksfläche ragt über die Stadtgrenze: zählt nicht");
  assert.equal(eintragsSchluessel({ ars: "091620000000" }), "091620000000");
  assert.equal(eintragsSchluessel({}, { bezirk: "110000000001" }), null);
  assert.equal(eintragsSchluessel(null), null);
  const mit = { "110000000000": {}, "110000000007": {} };
  assert.equal(eintragsSchluessel(berlin, { bezirk: "110000000007" }, mit), "110000000007");
  assert.equal(eintragsSchluessel(berlin, { bezirk: "110000000007" }, { "110000000000": {} }), "110000000000",
    "ältere Landesdatei ohne Bezirke: ganz Berlin");
});
