// SPDX-License-Identifier: AGPL-3.0-or-later
import { test } from "node:test";
import assert from "node:assert/strict";
import { kreisBehoerde, mitZusatz, stadtName, vollerName } from "../js/namen.js";
import { landAusArs, landAusKuerzel, landesdatei, istArs } from "../js/laender.js";

test("vollerName: die vier Beispiele der VG25-Dokumentation", () => {
  assert.equal(vollerName({ gen: "Oberbergischer Kreis", bez: "Kreis", nbd: "nein" }), "Oberbergischer Kreis");
  assert.equal(vollerName({ gen: "Salzlandkreis", bez: "Landkreis", nbd: "nein" }), "Salzlandkreis");
  assert.equal(vollerName({ gen: "Dithmarschen", bez: "Kreis", nbd: "ja" }), "Kreis Dithmarschen");
  assert.equal(vollerName({ gen: "Prignitz", bez: "Landkreis", nbd: "ja" }), "Landkreis Prignitz");
});

test("vollerName: NBD groß geschrieben, fehlende Bezeichnung, fehlender Name", () => {
  assert.equal(vollerName({ gen: "Hannover", bez: "Region", nbd: "JA" }), "Region Hannover");
  assert.equal(vollerName({ gen: "Hannover", bez: "", nbd: "ja" }), "Hannover");
  assert.throws(() => vollerName({ gen: " " }), /GEN fehlt/);
});

test("kreisBehoerde: Landratsamt in BW, BY, SN, TH", () => {
  const kreis = { gen: "München", bez: "Landkreis", nbd: "ja", kreisfrei: false };
  for (const lkz of ["BW", "BY", "SN", "TH", "by"]) {
    assert.equal(kreisBehoerde(kreis, lkz), "Landratsamt München");
  }
});

test("kreisBehoerde: Kreisverwaltung in RP", () => {
  assert.equal(
    kreisBehoerde({ gen: "Mainz-Bingen", bez: "Landkreis", nbd: "ja", kreisfrei: false }, "RP"),
    "Kreisverwaltung Mainz-Bingen",
  );
});

test("kreisBehoerde: sonst der volle Name", () => {
  assert.equal(kreisBehoerde({ gen: "Prignitz", bez: "Landkreis", nbd: "ja" }, "BB"), "Landkreis Prignitz");
  assert.equal(kreisBehoerde({ gen: "Dithmarschen", bez: "Kreis", nbd: "ja" }, "SH"), "Kreis Dithmarschen");
  assert.equal(
    kreisBehoerde({ gen: "Oberbergischer Kreis", bez: "Kreis", nbd: "nein" }, "NW"),
    "Oberbergischer Kreis",
  );
  assert.equal(kreisBehoerde({ gen: "Hannover", bez: "Region", nbd: "ja" }, "NI"), "Region Hannover");
});

test("kreisBehoerde: kreisfreie Stadt und Stadtkreis", () => {
  assert.equal(kreisBehoerde({ gen: "Köln", bez: "Kreisfreie Stadt", kreisfrei: true }, "NW"), "Stadt Köln");
  assert.equal(kreisBehoerde({ gen: "Stuttgart", bez: "Stadtkreis", kreisfrei: true }, "BW"), "Stadt Stuttgart");
});

test("mitZusatz und stadtName", () => {
  assert.equal(mitZusatz(stadtName("Freising")), "Stadt Freising – Straßenverkehrsbehörde");
});

test("laender: ARS → Land, Kürzel → Datei", () => {
  assert.deepEqual(landAusArs("091620000000"), { lkz: "BY", name: "Bayern", schluessel: "09" });
  assert.equal(landAusArs("99"), null);
  assert.equal(landAusKuerzel("nw").name, "Nordrhein-Westfalen");
  assert.equal(landesdatei("BY"), "by.json");
  assert.throws(() => landesdatei("XX"), /unbekannt/);
  assert.equal(istArs("091620000000"), true);
  assert.equal(istArs("09162000"), false);
  assert.equal(istArs(91620000000), false);
});
