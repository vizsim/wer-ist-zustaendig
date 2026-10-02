// SPDX-License-Identifier: AGPL-3.0-or-later
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  auswahl, BAU_KLASSEN, ergebnisId, FESTE_STELLEN, resolveGemeinde, schwaecher, SICHERHEIT, TEXTE,
} from "../js/resolve.js";

const kreis = (ars, gen, bez, nbd, kreisfrei = false) => ({ ars, gen, bez, nbd, kreisfrei, name: gen });

const G = {
  muenchen: {
    ars: "091620000000", gen: "München", land: "BY", tkz: [61],
    kreis: kreis("09162", "München", "Kreisfreie Stadt", "nein", true),
  },
  unterhaching: {
    ars: "091840148148", gen: "Unterhaching", land: "BY", tkz: [64],
    kreis: kreis("09184", "München", "Landkreis", "ja"),
  },
  freising: {
    ars: "091780124124", gen: "Freising", land: "BY", tkz: [67],
    kreis: kreis("09178", "Freising", "Landkreis", "ja"),
  },
  bremen: { ars: "040110000000", gen: "Bremen", land: "HB", kreis: kreis("04011", "Bremen", "Kreisfreie Stadt", "nein", true) },
  bremerhaven: {
    ars: "040120000000", gen: "Bremerhaven", land: "HB",
    kreis: kreis("04012", "Bremerhaven", "Kreisfreie Stadt", "nein", true),
  },
  berlin: { ars: "110000000000", gen: "Berlin", land: "BE", kreis: kreis("11000", "Berlin", "Kreisfreie Stadt", "nein", true) },
  hamburg: { ars: "020000000000", gen: "Hamburg", land: "HH", kreis: kreis("02000", "Hamburg", "Kreisfreie Stadt", "nein", true) },
  sachsenwald: {
    ars: "010539105105", gen: "Sachsenwald", land: "SH", gemeindefrei: true,
    kreis: kreis("01053", "Herzogtum Lauenburg", "Kreis", "ja"),
  },
  mainz_bingen: {
    ars: "073395001001", gen: "Musterdorf", land: "RP",
    kreis: kreis("07339", "Mainz-Bingen", "Landkreis", "ja"),
    verband: { ars: "073395001", name: "Verbandsgemeinde Musterland" },
  },
  kondominium: {
    ars: "079355003095", gen: "Deutsch-Luxemburgisches Hoheitsgebiet [Nittel]", land: "RP", tkz: [],
    kreis: kreis("07235", "Trier-Saarburg", "Landkreis", "ja"),
    kondominium: { nachbar: "072355003095" },
  },
};

test("Phase 1: kreisfreie Stadt → die Stadt, vermutlich", () => {
  const { zust, stellen } = resolveGemeinde(G.muenchen);
  assert.equal(zust.G.stelle, "k09162");
  assert.equal(zust.G.sicherheit, SICHERHEIT.VERMUTLICH);
  assert.equal(zust.G.grund, TEXTE.grund.kreisfrei);
  assert.equal(stellen.k09162.name, "Stadt München – Straßenverkehrsbehörde");
  assert.equal(stellen.k09162.art, "stadt");
});

test("Phase 1: kreisangehörige Gemeinde → Landratsamt, nur Ebene", () => {
  const { zust, stellen } = resolveGemeinde(G.unterhaching);
  assert.equal(zust.K.stelle, "k09184");
  assert.equal(zust.K.sicherheit, SICHERHEIT.NUR_EBENE);
  assert.equal(zust.K.alternative, null);
  assert.equal(stellen.k09184.name, "Landratsamt München – Straßenverkehrsbehörde");
  assert.equal(stellen.k09184.art, "kreis");
});

test("Phase 1: Große Kreisstadt (Tkz 67) als Alternative", () => {
  const { zust, stellen } = resolveGemeinde(G.freising);
  assert.equal(zust.G.stelle, "k09178");
  assert.deepEqual(zust.G.alternative, { stelle: "g091780124124", bedingung: TEXTE.bedingung.gks });
  assert.equal(stellen.g091780124124.name, "Stadt Freising – Straßenverkehrsbehörde");
});

test("Phase 1: Bremen und Bremerhaven belegt", () => {
  assert.equal(resolveGemeinde(G.bremen).zust.B.stelle, "hb-asv");
  assert.equal(resolveGemeinde(G.bremen).zust.B.sicherheit, SICHERHEIT.BELEGT);
  assert.equal(resolveGemeinde(G.bremerhaven).zust.G.stelle, "hb-bhv");
});

test("Phase 1: Berlin mit Senatsverwaltung als Alternative, Hamburg Polizei", () => {
  const be = resolveGemeinde(G.berlin);
  assert.equal(be.zust.L.stelle, "be-bezirk");
  assert.equal(be.zust.L.alternative.stelle, "be-senat");
  assert.equal(be.stellen["be-senat"].art, "stadtstaat");
  assert.equal(resolveGemeinde(G.hamburg).zust.G.stelle, "hh-pk");
});

test("Phase 1: gemeindefreies Gebiet → Kreis", () => {
  const { zust, stellen } = resolveGemeinde(G.sachsenwald);
  assert.equal(zust.G.stelle, "k01053");
  assert.equal(zust.G.grund, TEXTE.grund.gemeindefrei);
  assert.equal(stellen.k01053.name, "Kreis Herzogtum Lauenburg – Straßenverkehrsbehörde");
});

test("Phase 1: RP-Kreisverwaltung, alle Klassen gleich", () => {
  const { zust, stellen } = resolveGemeinde(G.mainz_bingen);
  assert.equal(stellen.k07339.name, "Kreisverwaltung Mainz-Bingen – Straßenverkehrsbehörde");
  const ids = BAU_KLASSEN.map((k) => ergebnisId(zust[k]));
  assert.equal(new Set(ids).size, 1);
});

test("Kondominium: Stelle der angrenzenden Gemeinde, nie sicherer als nur Ebene", () => {
  const { zust, stellen } = resolveGemeinde(G.kondominium);
  assert.equal(zust.G.stelle, "k07235");
  assert.equal(zust.G.sicherheit, SICHERHEIT.NUR_EBENE);
  assert.equal(zust.G.grund, TEXTE.grund.kondominium);
  assert.equal(zust.G.quelle, TEXTE.quelle.kondominium);
  assert.equal(stellen.k07235.name, "Kreisverwaltung Trier-Saarburg – Straßenverkehrsbehörde");
  const neben = resolveGemeinde({ ...G.kondominium, kreis: kreis("07211", "Trier", "Kreisfreie Stadt", "nein", true) });
  assert.equal(neben.zust.G.stelle, "k07211");
  assert.equal(neben.zust.G.sicherheit, SICHERHEIT.NUR_EBENE, "auch neben einer kreisfreien Stadt");
  assert.deepEqual(Object.keys(zust.G), ["stelle", "sicherheit", "grund", "quelle", "alternative"]);
});

test("Bundesportal: dieselbe Stelle → vermutlich, andere Stelle oder Kondominium → nur Ebene", () => {
  const bestaetigt = resolveGemeinde({ ...G.unterhaching, bundesportal: "passt" }).zust;
  assert.equal(bestaetigt.G.stelle, "k09184");
  assert.equal(bestaetigt.G.sicherheit, SICHERHEIT.VERMUTLICH);
  assert.equal(bestaetigt.K.sicherheit, SICHERHEIT.VERMUTLICH);
  assert.equal(bestaetigt.G.grund, TEXTE.grund.bundesportal);
  assert.equal(bestaetigt.G.quelle, TEXTE.quelle.bundesportal);
  const gks = resolveGemeinde({ ...G.freising, bundesportal: "passt" }).zust.G;
  assert.equal(gks.alternative.stelle, "g091780124124", "Alternative bleibt");
  assert.equal(resolveGemeinde({ ...G.unterhaching, bundesportal: "stvb" }).zust.G.sicherheit, SICHERHEIT.NUR_EBENE);
  assert.equal(resolveGemeinde({ ...G.kondominium, bundesportal: "passt" }).zust.G.sicherheit, SICHERHEIT.NUR_EBENE);
  const frei = resolveGemeinde({ ...G.muenchen, bundesportal: "passt" }).zust.G;
  assert.equal(frei.grund, TEXTE.grund.kreisfrei, "schon vermutlich: Regel bleibt maßgeblich");
  assert.equal(resolveGemeinde(G.unterhaching).zust.G.sicherheit, SICHERHEIT.NUR_EBENE, "ohne Portal");
});

test("resolveGemeinde: prüft die Eingabe", () => {
  assert.throws(() => resolveGemeinde({ ...G.muenchen, ars: "09162000" }), /ungültiger ARS/);
  assert.throws(() => resolveGemeinde({ ...G.muenchen, kreis: null }), /ohne Kreis/);
  assert.throws(() => resolveGemeinde({ ...G.muenchen, land: "" }), /ohne Land/);
});

test("ergebnisId: stabil und inhaltsabhängig", () => {
  const a = resolveGemeinde(G.unterhaching).zust.G;
  const b = resolveGemeinde(G.unterhaching).zust.G;
  const c = resolveGemeinde(G.freising).zust.G;
  assert.equal(ergebnisId(a), ergebnisId(b));
  assert.notEqual(ergebnisId(a), ergebnisId(c));
  assert.match(ergebnisId(a), /^e[0-9a-f]{8}$/);
});

test("schwaecher", () => {
  assert.equal(schwaecher("belegt", "vermutlich"), "vermutlich");
  assert.equal(schwaecher("nur Ebene", "vermutlich"), "nur Ebene");
});

// --- Laufzeit ------------------------------------------------------------------------------

function landesdatei(land, gemeinden) {
  const daten = { land, stellen: { fba: FESTE_STELLEN.fba }, ergebnisse: {}, kreise: {}, gemeinden: {} };
  for (const g of gemeinden) {
    const { zust, stellen } = resolveGemeinde(g);
    Object.assign(daten.stellen, stellen);
    const z = {};
    for (const k of BAU_KLASSEN) {
      const id = ergebnisId(zust[k]);
      daten.ergebnisse[id] = zust[k];
      z[k] = id;
    }
    daten.kreise[g.kreis.ars] = g.kreis.name;
    daten.gemeinden[g.ars] = { name: g.gen, kreis: g.kreis.ars, z };
  }
  return daten;
}

test("auswahl: nur Autobahn → Fernstraßen-Bundesamt, kein Brief", () => {
  const d = landesdatei("BY", [G.unterhaching]);
  const r = auswahl(d, G.unterhaching.ars, ["A"]);
  assert.equal(r.zustaendig.id, "fba");
  assert.equal(r.keinBrief, true);
});

test("auswahl: Autobahn und Gemeindestraße → Kreis mit Hinweis", () => {
  const d = landesdatei("BY", [G.unterhaching]);
  const r = auswahl(d, G.unterhaching.ars, ["A", "G"]);
  assert.equal(r.zustaendig.id, "k09184");
  assert.ok(r.hinweise.includes(TEXTE.hinweis.autobahnDabei));
  assert.equal(r.kreis, "München");
  assert.equal(r.gemeinde, "Unterhaching");
});

test("auswahl: keine Straße → Hinweis, schwächere Sicherheit", () => {
  const d = landesdatei("BY", [G.muenchen]);
  const r = auswahl(d, G.muenchen.ars, []);
  assert.equal(r.klasse, "unklar");
  assert.equal(r.sicherheit, SICHERHEIT.VERMUTLICH);
  assert.ok(r.hinweise.includes(TEXTE.hinweis.keineStrasse));
});

test("auswahl: Alternative aus dem Ergebnis (Große Kreisstadt)", () => {
  const d = landesdatei("BY", [G.freising]);
  const r = auswahl(d, G.freising.ars, ["B"]);
  assert.equal(r.zustaendig.id, "k09178");
  assert.equal(r.alternative.stelle.id, "g091780124124");
});

test("auswahl: unbekannte Gemeinde → null", () => {
  assert.equal(auswahl(landesdatei("BY", [G.freising]), "099999999999", ["G"]), null);
});

test("auswahl: unterschiedliche Stellen je Klasse → Gemeindestraße als Alternative", () => {
  // Wie ab Phase 2 in BY: Gemeinde für Gemeindestraßen, Landratsamt für den Rest.
  const d = landesdatei("BY", [G.unterhaching]);
  const eintrag = d.gemeinden[G.unterhaching.ars];
  const gem = { id: "g091840148148", name: "Gemeinde Unterhaching – Straßenverkehrsbehörde", ebene: "örtliche", art: "gemeinde" };
  d.stellen[gem.id] = gem;
  const eG = { ...d.ergebnisse[eintrag.z.G], stelle: gem.id, alternative: null };
  d.ergebnisse[ergebnisId(eG)] = eG;
  eintrag.z.G = ergebnisId(eG);

  const r = auswahl(d, G.unterhaching.ars, ["G", "K"]);
  assert.equal(r.zustaendig.id, "k09184");
  assert.equal(r.alternative.stelle.id, gem.id);
  assert.equal(r.alternative.bedingung, TEXTE.bedingung.gemeindestrasse);

  const nurG = auswahl(d, G.unterhaching.ars, ["G"]);
  assert.equal(nurG.zustaendig.id, gem.id);
  assert.equal(nurG.alternative, null);

  const unklar = auswahl(d, G.unterhaching.ars, ["unklar"]);
  assert.equal(unklar.zustaendig.id, "k09184");
  assert.equal(unklar.alternative.bedingung, TEXTE.bedingung.unklar);
});
