// SPDX-License-Identifier: AGPL-3.0-or-later
import { test } from "node:test";
import assert from "node:assert/strict";
import { hoechsteKlasse, klasse, klasseAusNummer, klassenName } from "../js/strassenklasse.js";

const faelle = [
  // [ref, highway, land, erwartet, Beschreibung]
  ["B 2", "primary", "BY", "B", "Bundesstraße"],
  ["B2", "primary", null, "B", "Bundesstraße ohne Leerzeichen"],
  ["B 96a", "primary", "MV", "B", "Bundesstraße mit Buchstabe"],
  ["B 2R", "trunk", "BY", "B", "Mittlerer Ring München"],
  ["L 123", "secondary", "NW", "L", "Landesstraße"],
  ["L 141", "secondary", "SL", "L", "Saarland: L II. Ordnung statt Kreisstraße"],
  ["St 2345", "secondary", "BY", "L", "Staatsstraße Bayern"],
  ["St 2345", "secondary", "BW", "unklar", "„St\" gibt es nur in Bayern"],
  ["S 177", "secondary", "SN", "L", "Staatsstraße Sachsen"],
  ["S 177", "secondary", "BY", "unklar", "„S\" + Nummer nur in Sachsen"],
  ["K 1234", "tertiary", "BW", "K", "Kreisstraße"],
  ["K 22", "tertiary", null, "K", "Kreisstraße ohne Land"],
  ["DAH 3", "tertiary", "BY", "K", "Kreisstraße Landkreis Dachau"],
  ["ROs 1", "tertiary", "BY", "K", "Kreisstraße der kreisfreien Stadt Rosenheim"],
  ["STA 12", "tertiary", "BY", "K", "Starnberg – nicht mit „St\" verwechseln"],
  ["M 3", "secondary", "BY", "K", "Landkreis München"],
  ["N 4", "tertiary", "BY", "K", "Nürnberg – einbuchstabiges bayerisches Kürzel"],
  ["E 3", "tertiary", "BY", "unklar", "„E\" ist kein bayerisches Kürzel"],
  ["DAH 3", "tertiary", "BW", "unklar", "Kfz-Kürzel zählen nur in BY und MV"],
  ["VG 12", "tertiary", "MV", "K", "Kreisstraße Vorpommern-Greifswald"],
  ["GÜ 5", "tertiary", "MV", "K", "Altkreis Güstrow"],
  ["SN 4", "tertiary", "MV", "K", "Schwerin – in MV kein Staatsstraßen-Muster"],
  ["M 3", "tertiary", "MV", "unklar", "MV kennt keine einbuchstabigen Kürzel"],
  ["LUP 3", "tertiary", "MV", "K", "Ludwigslust-Parchim – nicht mit „L\" verwechseln"],
  ["A 8", "motorway", "BY", "A", "Autobahn"],
  ["A 8", "secondary", "BY", "K", "Kreisstraße Landkreis Augsburg"],
  ["A 99", "trunk", "BY", "A", "Autobahnabschnitt als Kraftfahrstraße"],
  ["A 1", "primary", "NI", "A", "Autobahn-Nummer außerhalb Bayerns"],
  ["B 2;St 2068", "primary", "BY", "B", "mehrere Nummern: die höchste gewinnt"],
  ["K 5; B 9", "primary", "RP", "B", "mehrere Nummern mit Leerzeichen"],
  [null, "residential", "BE", "G", "Gemeindestraße"],
  ["", "living_street", "HH", "G", "verkehrsberuhigter Bereich"],
  [null, "service", "NW", "G", "Erschließungsstraße"],
  [null, "unclassified", "BY", "G", "Gemeindeverbindungsstraße"],
  [null, "tertiary", "NW", "unklar", "tertiary ohne Nummer"],
  [null, "motorway_link", "HE", "A", "Anschlussstelle"],
  [null, "track", "BY", "unklar", "Wirtschaftsweg"],
  ["E 45", "primary", "BY", "unklar", "Europastraße allein ist keine Klasse"],
];

for (const [ref, highway, land, erwartet, was] of faelle) {
  test(`klasse: ${was} (${ref ?? "–"}, ${highway}, ${land ?? "–"}) → ${erwartet}`, () => {
    assert.equal(klasse({ ref, highway }, land), erwartet);
  });
}

test("klasse: Land in Kleinbuchstaben", () => {
  assert.equal(klasse({ ref: "DAH 3", highway: "tertiary" }, "by"), "K");
});

test("klasse: ohne Argumente", () => {
  assert.equal(klasse(), "unklar");
});

test("klasseAusNummer: mehrfache Leerzeichen", () => {
  assert.equal(klasseAusNummer("B   2", "BY", "primary"), "B");
});

test("hoechsteKlasse: Rangfolge und leere Liste", () => {
  assert.equal(hoechsteKlasse(["G", "K", "L"]), "L");
  assert.equal(hoechsteKlasse(["unklar", "G"]), "G");
  assert.equal(hoechsteKlasse([]), "unklar");
});

test("klassenName: Staatsstraße in BY und SN", () => {
  assert.equal(klassenName("L", "BY"), "Staatsstraße");
  assert.equal(klassenName("L", "SN"), "Staatsstraße");
  assert.equal(klassenName("L", "NW"), "Landesstraße");
  assert.equal(klassenName("unklar"), "Straßenklasse unklar");
});
