// SPDX-License-Identifier: AGPL-3.0-or-later
import { test } from "node:test";
import assert from "node:assert/strict";
import { baueLaender } from "../tools/lib/laender.mjs";
import { ergaenzungsSchluessel, kontaktLuecken, PRUEF_KLASSEN, stellenListe } from "../tools/lib/kontaktluecken.mjs";

const kreis = (ars, gen, bez, nbd, kreisfrei = false) => ({
  ars, gen, bez, nbd, kreisfrei, name: nbd === "ja" ? `${bez} ${gen}` : gen,
});

// Drei Gemeinden im Landkreis Landshut (zwei mit Verwaltungsgemeinschaft), eine Große Kreisstadt.
function attr() {
  const landshut = kreis("09274", "Landshut", "Landkreis", "ja");
  const vg = { ars: "092745401", gen: "Gerzen", name: "Verwaltungsgemeinschaft Gerzen" };
  return {
    schema: 1,
    meta: { erzeugt: "2026-10-01", stand: { gebiet: "VG25 31.12.2025" }, quellen: [] },
    gemeinden: {
      "092740128128": {
        ars: "092740128128", gen: "Essenbach", name: "Gemeinde Essenbach", land: "BY", tkz: [60], ew: 11970,
        kreis: landshut,
      },
      "092745401131": {
        ars: "092745401131", gen: "Gerzen", name: "Gemeinde Gerzen", land: "BY", tkz: [60], ew: 1900,
        kreis: landshut, verband: vg,
      },
      "092745401144": {
        ars: "092745401144", gen: "Kröning", name: "Gemeinde Kröning", land: "BY", tkz: [60], ew: 2100,
        kreis: landshut, verband: vg,
      },
      "091780124124": {
        ars: "091780124124", gen: "Freising", name: "Stadt Freising", land: "BY", tkz: [67], ew: 50000,
        kreis: kreis("09178", "Freising", "Landkreis", "ja"),
      },
    },
  };
}

// Kontakte: Freising vollständig, Essenbach nur die Gemeinde, in der Verwaltungsgemeinschaft nichts.
function kontakte() {
  const stelle = (name) => ({ name, adresse: null, telefon: ["+49 871 0000-0"], email: [], web: [] });
  return {
    schema: 1,
    meta: {
      quelle: { id: "bundesportal", label: "Bundesportal", lizenz: "–", vermerk: "Kontakt laut Bundesportal" },
      laender: { BY: { herausgeber: "1806", abgerufen: "2026-10-02", region_url: "https://…/region/{ars}" } },
    },
    gemeinden: {
      "091780124124": { wahl: "passt", stellen: 1, kreis: null, gemeinde: stelle("Große Kreisstadt Freising") },
      "092740128128": { wahl: "passt", stellen: 1, kreis: null, gemeinde: stelle("Gemeinde Essenbach - Ordnungsamt") },
      "092745401131": { wahl: "keine", stellen: 0, kreis: null, gemeinde: null },
      "092745401144": { wahl: "keine", stellen: 0, kreis: null, gemeinde: null },
    },
  };
}

test("kontaktLuecken: je Klasse, je Gemeinde und je Stelle", () => {
  const by = baueLaender(attr(), { kontakte: kontakte() }).dateien["by.json"];
  const { zahl, luecken, allgemein, stellen } = kontaktLuecken(by);
  assert.deepEqual(Object.keys(zahl), PRUEF_KLASSEN.map((k) => k.join("") || "unklar"));
  // Gemeindestraßen: Gerzen und Kröning (Gemeinde ohne Kontakt); sonst das Landratsamt in allen drei.
  assert.deepEqual(zahl.G, { ohne: 2, altOhne: 0 });
  assert.deepEqual(zahl.K, { ohne: 3, altOhne: 0 });
  assert.equal(zahl.unklar.ohne, 3, "unklar: klassifiziert angenommen, also das Landratsamt");
  assert.equal(zahl.unklar.altOhne, 2, "die Gemeinde als Alternative, in Gerzen und Kröning ohne Kontakt");
  assert.deepEqual([...luecken.keys()].sort(), ["092740128128", "092745401131", "092745401144"]);
  assert.equal(allgemein.size, 0);

  const liste = stellenListe(stellen);
  assert.deepEqual(liste.map((s) => s.id), ["k09274", "g092745401131", "g092745401144"]);
  const lra = liste[0];
  assert.equal(lra.name, "Landratsamt Landshut – Straßenverkehrsbehörde");
  assert.equal(lra.gemeinden.size, 3);
  assert.deepEqual([...lra.klassen].sort(), ["B", "K", "L", "unklar"]);
  assert.equal(liste[1].gemeinden.size, 1);
  assert.equal(liste[1].alternative.size, 1);
  assert.ok(!stellen.has("g091780124124"), "Freising hat Kontakte");
});

test("ergaenzungsSchluessel: Kreis-ARS, ARS mit Rolle, Verband, ohne Platz für einen Kontakt", () => {
  assert.equal(ergaenzungsSchluessel("k09274", "092740128128"), '"09274"');
  assert.equal(ergaenzungsSchluessel("g092740128128", "092740128128"), '"092740128128", rolle: gemeinde');
  assert.equal(ergaenzungsSchluessel("v092745401", "092745401131"), "ARS jeder Gemeinde des Verbands, rolle: gemeinde");
  assert.equal(ergaenzungsSchluessel("be-senat", "110000000001"), '"11000"');
  assert.equal(ergaenzungsSchluessel("g110000000001", "110000000001"), '"110000000001", rolle: gemeinde', "Bezirk");
  assert.equal(ergaenzungsSchluessel("fba", "092740128128"), null);
  assert.equal(ergaenzungsSchluessel("be-bezirk", "110000000000"), null);
});
