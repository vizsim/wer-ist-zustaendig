// SPDX-License-Identifier: AGPL-3.0-or-later
import { test } from "node:test";
import assert from "node:assert/strict";
import { baueLaender, reviewCsv, serialisiere } from "../tools/lib/laender.mjs";
import { auswahl } from "../js/resolve.js";

const kreis = (ars, gen, bez, nbd, kreisfrei = false) => ({
  ars, gen, bez, nbd, kreisfrei, name: nbd === "ja" ? `${bez} ${gen}` : gen,
});

function attr() {
  return {
    schema: 1,
    meta: {
      erzeugt: "2026-10-01",
      stand: { gebiet: "VG25 31.12.2025", status: "GV-ISys 31.12.2025" },
      quellen: [{ id: "vg25", vermerk: "© BKG (2026) CC BY 4.0" }],
    },
    gemeinden: {
      "091780124124": {
        ars: "091780124124", gen: "Freising", name: "Freising", land: "BY", tkz: [67], ew: 50000,
        kreis: kreis("09178", "Freising", "Landkreis", "ja"),
      },
      "091620000000": {
        ars: "091620000000", gen: "München", name: "München", land: "BY", tkz: [61], ew: 1500000,
        kreis: kreis("09162", "München", "Kreisfreie Stadt", "nein", true),
      },
      "073395001001": {
        ars: "073395001001", gen: "Musterdorf", name: "Musterdorf", land: "RP",
        kreis: kreis("07339", "Mainz-Bingen", "Landkreis", "ja"),
        verband: { ars: "073395001", name: "Verbandsgemeinde Musterland" },
        gebietsaenderung: { art: "nicht mehr im aktuellen Gemeindeverzeichnis", stand: "2026-10-31" },
      },
    },
  };
}

test("baueLaender: eine Datei je Land, Index mit Zählern", () => {
  const { dateien, index } = baueLaender(attr());
  assert.deepEqual(Object.keys(dateien).sort(), ["by.json", "rp.json"]);
  assert.deepEqual(index.laender.map((l) => [l.lkz, l.gemeinden]), [["BY", 2], ["RP", 1]]);
  assert.deepEqual(index.laender[0].sicherheit, { belegt: 0, vermutlich: 1, "nur Ebene": 1 });
  const by = dateien["by.json"];
  assert.equal(by.land, "BY");
  assert.ok(by.stellen.fba, "Fernstraßen-Bundesamt ist in jeder Landesdatei");
  assert.equal(by.kreise["09178"], "Landkreis Freising");
  assert.equal(by.gemeinden["091780124124"].ew, 50000);
  assert.equal(dateien["rp.json"].gemeinden["073395001001"].verband, "Verbandsgemeinde Musterland");
  assert.equal(dateien["rp.json"].gemeinden["073395001001"].aenderung.stand, "2026-10-31");
});

test("baueLaender: Ergebnisse sind entdoppelt und über Ids verknüpft", () => {
  const by = baueLaender(attr()).dateien["by.json"];
  const z = by.gemeinden["091780124124"].z;
  assert.equal(new Set(Object.values(z)).size, 1, "Phase 1: gleiches Ergebnis für alle Klassen");
  assert.equal(Object.keys(by.ergebnisse).length, 2);
  const r = auswahl(by, "091780124124", ["G"]);
  assert.equal(r.zustaendig.name, "Landratsamt Freising – Straßenverkehrsbehörde");
  assert.equal(r.alternative.stelle.name, "Stadt Freising – Straßenverkehrsbehörde");
});

test("baueLaender + serialisiere: deterministisch, gültiges JSON, eine Zeile je Gemeinde", () => {
  const a = serialisiere(baueLaender(attr()).dateien["by.json"]);
  // Umgekehrte Reihenfolge der Eingabe ändert nichts an den Bytes.
  const umgekehrt = attr();
  umgekehrt.gemeinden = Object.fromEntries(Object.entries(umgekehrt.gemeinden).reverse());
  const b = serialisiere(baueLaender(umgekehrt).dateien["by.json"]);
  assert.equal(a, b);
  const json = JSON.parse(a);
  assert.equal(json.schema, 1);
  const zeile = a.split("\n").find((z) => z.includes('"091620000000"'));
  assert.ok(zeile.endsWith("}") || zeile.endsWith("},"), "ein Eintrag je Zeile");
  assert.equal(serialisiere({ stellen: {} }), '{\n  "stellen": {}\n}\n');
});

test("baueLaender: Review-Zeilen je Gemeinde und Klasse", () => {
  const { review } = baueLaender(attr());
  assert.equal(review.length, 3 * 4);
  const csv = reviewCsv(review);
  assert.ok(csv.startsWith("﻿land;ars;gemeinde"));
  assert.ok(csv.includes("BY;091780124124;Freising;Landkreis Freising;G;Landratsamt Freising"));
});

test("baueLaender: prüft Schema, Schlüssel und Land", () => {
  assert.throws(() => baueLaender({ ...attr(), schema: 2 }), /schema/);
  const a = attr();
  a.gemeinden["091620000000"].land = "BW";
  assert.throws(() => baueLaender(a), /passt nicht zu Land/);
  const b = attr();
  b.gemeinden["091620000001"] = b.gemeinden["091620000000"];
  assert.throws(() => baueLaender(b), /Schlüssel/);
});
