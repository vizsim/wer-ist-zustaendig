// SPDX-License-Identifier: AGPL-3.0-or-later
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  auswahl, BAU_KLASSEN, ergebnisId, FESTE_STELLEN, NI_GEMEINDESTRASSEN, NI_SELBSTAENDIG, NI_WIE_KREISFREI,
  resolveGemeinde, schwaecher, SICHERHEIT, TEXTE, TH_STAEDTE_AUF_ANTRAG,
} from "../js/resolve.js";

const kreis = (ars, gen, bez, nbd, kreisfrei = false) => ({ ars, gen, bez, nbd, kreisfrei, name: gen });

// Echte Gemeinden (VG25, GV-ISys 31.12.2025). Baden-Württemberg steht für die Länder ohne
// Landesregel (Rückfall Phase 1), Bayern und Thüringen haben eine.
const G = {
  stuttgart: {
    ars: "081110000000", gen: "Stuttgart", land: "BW", tkz: [62],
    kreis: kreis("08111", "Stuttgart", "Stadtkreis", "ja", true),
  },
  aichwald: {
    ars: "081160076076", gen: "Aichwald", land: "BW", tkz: [64],
    kreis: kreis("08116", "Esslingen", "Landkreis", "ja"),
  },
  esslingen: {
    ars: "081160019019", gen: "Esslingen am Neckar", land: "BW", tkz: [67],
    kreis: kreis("08116", "Esslingen", "Landkreis", "ja"),
  },
  muenchen: {
    ars: "091620000000", gen: "München", land: "BY", tkz: [61],
    kreis: kreis("09162", "München", "Kreisfreie Stadt", "nein", true),
  },
  essenbach: {
    ars: "092740128128", gen: "Essenbach", name: "Gemeinde Essenbach", land: "BY", tkz: [60], ew: 11970,
    kreis: kreis("09274", "Landshut", "Landkreis", "ja"),
  },
  freising: {
    ars: "091780124124", gen: "Freising", land: "BY", tkz: [67], ew: 48953,
    kreis: kreis("09178", "Freising", "Landkreis", "ja"),
  },
  apfeldorf: {
    ars: "091815142111", gen: "Apfeldorf", name: "Gemeinde Apfeldorf", land: "BY", tkz: [64], ew: 1200,
    kreis: kreis("09181", "Landsberg am Lech", "Landkreis", "ja"),
    verband: { ars: "091815142", gen: "Reichling", name: "Verwaltungsgemeinschaft Reichling" },
  },
  heinersreuth: {
    ars: "094729458458", gen: "Heinersreuther Forst", land: "BY", tkz: [66], ew: 0, gemeindefrei: true,
    kreis: kreis("09472", "Bayreuth", "Landkreis", "ja"),
  },
  weimar: {
    ars: "160550000000", gen: "Weimar", land: "TH", tkz: [61], ew: 65566,
    kreis: kreis("16055", "Weimar", "Kreisfreie Stadt", "ja", true),
  },
  gotha: {
    ars: "160670029029", gen: "Gotha", land: "TH", tkz: [63], ew: 45904,
    kreis: kreis("16067", "Gotha", "Landkreis", "ja"),
  },
  eisenach: {
    ars: "160630105105", gen: "Eisenach", land: "TH", tkz: [63], ew: 40505,
    kreis: kreis("16063", "Wartburgkreis", "Landkreis", "nein"),
  },
  apolda: {
    ars: "160710001001", gen: "Apolda", land: "TH", tkz: [63], ew: 22572,
    kreis: kreis("16071", "Weimarer Land", "Landkreis", "ja"),
  },
  grammetal: {
    ars: "160710103103", gen: "Grammetal", name: "Gemeinde Grammetal", land: "TH", tkz: [64], ew: 6358,
    kreis: kreis("16071", "Weimarer Land", "Landkreis", "ja"),
  },
  arnstadt: {
    ars: "160700004004", gen: "Arnstadt", land: "TH", tkz: [63], ew: 28509,
    kreis: kreis("16070", "Ilm-Kreis", "Landkreis", "nein"),
  },
  bremen: { ars: "040110000000", gen: "Bremen", land: "HB", kreis: kreis("04011", "Bremen", "Kreisfreie Stadt", "nein", true) },
  bremerhaven: {
    ars: "040120000000", gen: "Bremerhaven", land: "HB",
    kreis: kreis("04012", "Bremerhaven", "Kreisfreie Stadt", "nein", true),
  },
  berlin: { ars: "110000000000", gen: "Berlin", land: "BE", kreis: kreis("11000", "Berlin", "Kreisfreie Stadt", "nein", true) },
  hamburg: { ars: "020000000000", gen: "Hamburg", land: "HH", kreis: kreis("02000", "Hamburg", "Kreisfreie Stadt", "nein", true) },
  reinhardswald: {
    ars: "066339200200", gen: "Gutsbezirk Reinhardswald", land: "HE", tkz: [66], ew: 0, gemeindefrei: true,
    kreis: kreis("06633", "Kassel", "Landkreis", "ja"),
  },
  kiel: {
    ars: "010020000000", gen: "Kiel", land: "SH", tkz: [61], ew: 251842,
    kreis: kreis("01002", "Kiel", "Kreisfreie Stadt", "ja", true),
  },
  norderstedt: {
    ars: "010600063063", gen: "Norderstedt", land: "SH", tkz: [63], ew: 83196,
    kreis: kreis("01060", "Segeberg", "Kreis", "ja"),
  },
  henstedtUlzburg: {
    ars: "010600039039", gen: "Henstedt-Ulzburg", name: "Gemeinde Henstedt-Ulzburg", land: "SH", tkz: [64], ew: 28345,
    kreis: kreis("01060", "Segeberg", "Kreis", "ja"),
  },
  glinde: {
    ars: "010620018018", gen: "Glinde", land: "SH", tkz: [63], ew: 18856,
    kreis: kreis("01062", "Stormarn", "Kreis", "ja"),
  },
  ascheffel: {
    ars: "010585890008", gen: "Ascheffel", name: "Gemeinde Ascheffel", land: "SH", tkz: [64], ew: 977,
    kreis: kreis("01058", "Rendsburg-Eckernförde", "Kreis", "ja"),
    verband: { ars: "010585890", gen: "Hüttener Berge", name: "Amt Hüttener Berge" },
  },
  altenholz: {
    ars: "010580005005", gen: "Altenholz", name: "Gemeinde Altenholz", land: "SH", tkz: [64], ew: 9781,
    kreis: kreis("01058", "Rendsburg-Eckernförde", "Kreis", "ja"),
  },
  badSchwartau: {
    ars: "010550004004", gen: "Bad Schwartau", land: "SH", tkz: [63], ew: 19918,
    kreis: kreis("01055", "Ostholstein", "Kreis", "ja"),
  },
  braunschweig: {
    ars: "031010000000", gen: "Braunschweig", land: "NI", tkz: [61], ew: 252811,
    kreis: kreis("03101", "Braunschweig", "Kreisfreie Stadt", "ja", true),
  },
  harz: {
    ars: "031539504504", gen: "Harz (Landkreis Goslar)", land: "NI", tkz: [66], ew: 0, gemeindefrei: true,
    kreis: kreis("03153", "Goslar", "Landkreis", "ja"),
  },
  hannover: {
    ars: "032410001001", gen: "Hannover", land: "NI", tkz: [63], ew: 522803,
    kreis: { ...kreis("03241", "Region Hannover", "Landkreis", "nein"), name: "Region Hannover" },
  },
  goettingen: {
    ars: "031590016016", gen: "Göttingen", land: "NI", tkz: [63], ew: 130521,
    kreis: kreis("03159", "Göttingen", "Landkreis", "ja"),
  },
  burgdorf: {
    ars: "032410003003", gen: "Burgdorf", land: "NI", tkz: [63], ew: 31059,
    kreis: { ...kreis("03241", "Region Hannover", "Landkreis", "nein"), name: "Region Hannover" },
  },
  celle: {
    ars: "033510006006", gen: "Celle", land: "NI", tkz: [63], ew: 66930,
    kreis: kreis("03351", "Celle", "Landkreis", "ja"),
  },
  seevetal: {
    ars: "033530031031", gen: "Seevetal", name: "Gemeinde Seevetal", land: "NI", tkz: [64], ew: 44091,
    kreis: kreis("03353", "Harburg", "Landkreis", "ja"),
  },
  alfeld: {
    ars: "032540002002", gen: "Alfeld (Leine)", land: "NI", tkz: [63], ew: 17991,
    kreis: kreis("03254", "Hildesheim", "Landkreis", "ja"),
  },
  quakenbrueck: {
    ars: "034595401030", gen: "Quakenbrück", land: "NI", tkz: [63], ew: 14088,
    kreis: kreis("03459", "Osnabrück", "Landkreis", "ja"),
    verband: { ars: "034595401", gen: "Artland", name: "Samtgemeinde Artland" },
  },
  oyten: {
    ars: "033610009009", gen: "Oyten", name: "Gemeinde Oyten", land: "NI", tkz: [64], ew: 16509,
    kreis: kreis("03361", "Verden", "Landkreis", "ja"),
  },
  badNenndorf: {
    ars: "032575403006", gen: "Bad Nenndorf", land: "NI", tkz: [63], ew: 11530,
    kreis: kreis("03257", "Schaumburg", "Landkreis", "ja"),
    verband: { ars: "032575403", gen: "Nenndorf", name: "Samtgemeinde Nenndorf" },
  },
  lohne: {
    ars: "034600006006", gen: "Lohne (Oldenburg)", land: "NI", tkz: [63], ew: 28114,
    kreis: kreis("03460", "Vechta", "Landkreis", "ja"),
  },
  doetlingen: {
    ars: "034580003003", gen: "Dötlingen", name: "Gemeinde Dötlingen", land: "NI", tkz: [64], ew: 6203,
    kreis: kreis("03458", "Oldenburg", "Landkreis", "ja"),
  },
  winkelsett: {
    ars: "034585401015", gen: "Winkelsett", name: "Gemeinde Winkelsett", land: "NI", tkz: [64], ew: 500,
    kreis: kreis("03458", "Oldenburg", "Landkreis", "ja"),
    verband: { ars: "034585401", gen: "Harpstedt", name: "Samtgemeinde Harpstedt" },
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
  const { zust, stellen } = resolveGemeinde(G.stuttgart);
  assert.equal(zust.G.stelle, "k08111");
  assert.equal(zust.G.sicherheit, SICHERHEIT.VERMUTLICH);
  assert.equal(zust.G.grund, TEXTE.grund.kreisfrei);
  assert.equal(stellen.k08111.name, "Stadt Stuttgart – Straßenverkehrsbehörde");
  assert.equal(stellen.k08111.art, "stadt");
});

test("Phase 1: kreisangehörige Gemeinde → Landratsamt, nur Ebene", () => {
  const { zust, stellen } = resolveGemeinde(G.aichwald);
  assert.equal(zust.K.stelle, "k08116");
  assert.equal(zust.K.sicherheit, SICHERHEIT.NUR_EBENE);
  assert.equal(zust.K.alternative, null);
  assert.equal(stellen.k08116.name, "Landratsamt Esslingen – Straßenverkehrsbehörde");
  assert.equal(stellen.k08116.art, "kreis");
});

test("Phase 1: Große Kreisstadt (Tkz 67) als Alternative", () => {
  const { zust, stellen } = resolveGemeinde(G.esslingen);
  assert.equal(zust.G.stelle, "k08116");
  assert.deepEqual(zust.G.alternative, { stelle: "g081160019019", bedingung: TEXTE.bedingung.gks });
  assert.equal(stellen.g081160019019.name, "Stadt Esslingen am Neckar – Straßenverkehrsbehörde");
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
  const { zust, stellen } = resolveGemeinde(G.reinhardswald);
  assert.equal(zust.G.stelle, "k06633");
  assert.equal(zust.G.grund, TEXTE.grund.gemeindefrei);
  assert.equal(stellen.k06633.name, "Landkreis Kassel – Straßenverkehrsbehörde");
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
  const bestaetigt = resolveGemeinde({ ...G.aichwald, bundesportal: "passt" }).zust;
  assert.equal(bestaetigt.G.stelle, "k08116");
  assert.equal(bestaetigt.G.sicherheit, SICHERHEIT.VERMUTLICH);
  assert.equal(bestaetigt.K.sicherheit, SICHERHEIT.VERMUTLICH);
  assert.equal(bestaetigt.G.grund, TEXTE.grund.bundesportal);
  assert.equal(bestaetigt.G.quelle, TEXTE.quelle.bundesportal);
  const gks = resolveGemeinde({ ...G.esslingen, bundesportal: "passt" }).zust.G;
  assert.equal(gks.alternative.stelle, "g081160019019", "Alternative bleibt");
  const stvb = resolveGemeinde({ ...G.aichwald, bundesportal: "stvb" });
  assert.equal(stvb.zust.G.sicherheit, SICHERHEIT.NUR_EBENE);
  assert.deepEqual(stvb.zust.G.alternative, { stelle: "g081160076076", bedingung: TEXTE.bedingung.portalStvb });
  assert.equal(stvb.stellen.g081160076076.name, "Aichwald – Straßenverkehrsbehörde", "ohne Stadtrecht kein „Stadt\"");
  assert.equal(resolveGemeinde({ ...G.kondominium, bundesportal: "passt" }).zust.G.sicherheit, SICHERHEIT.NUR_EBENE);
  const frei = resolveGemeinde({ ...G.stuttgart, bundesportal: "passt" }).zust.G;
  assert.equal(frei.grund, TEXTE.grund.kreisfrei, "schon vermutlich: Regel bleibt maßgeblich");
  assert.equal(resolveGemeinde(G.aichwald).zust.G.sicherheit, SICHERHEIT.NUR_EBENE, "ohne Portal");
});

test("Bayern: Gemeindestraße → die Gemeinde, sonst das Landratsamt (belegt)", () => {
  const { zust, stellen } = resolveGemeinde(G.essenbach);
  assert.equal(zust.G.stelle, "g092740128128");
  assert.equal(zust.G.sicherheit, SICHERHEIT.BELEGT);
  assert.equal(zust.G.grund, TEXTE.grund.byGemeinde);
  assert.equal(zust.G.quelle, TEXTE.quelle.byOertlich);
  assert.equal(stellen.g092740128128.name, "Gemeinde Essenbach – Straßenverkehrsbehörde");
  assert.equal(stellen.g092740128128.art, "gemeinde");
  for (const k of ["K", "L", "B"]) {
    assert.equal(zust[k].stelle, "k09274", k);
    assert.equal(zust[k].sicherheit, SICHERHEIT.BELEGT);
    assert.equal(zust[k].grund, TEXTE.grund.byLandratsamt);
    assert.equal(zust[k].alternative, null);
  }
  assert.equal(stellen.k09274.name, "Landratsamt Landshut – Straßenverkehrsbehörde");
  const mitPortal = resolveGemeinde({ ...G.essenbach, bundesportal: "stvb" }).zust;
  assert.deepEqual(mitPortal, zust, "Landesregel geht dem Portal vor");
});

test("Bayern: in einer Verwaltungsgemeinschaft bleibt die Gemeinde zuständig", () => {
  const { zust, stellen } = resolveGemeinde(G.apfeldorf);
  assert.equal(zust.G.stelle, "g091815142111");
  assert.equal(stellen.g091815142111.name, "Gemeinde Apfeldorf – Straßenverkehrsbehörde");
  assert.equal(zust.G.sicherheit, SICHERHEIT.BELEGT);
  assert.equal(zust.G.grund, TEXTE.grund.byGemeindeVg);
  assert.equal(zust.G.quelle, TEXTE.quelle.byOertlichVg);
  assert.equal(zust.K.stelle, "k09181");
});

test("Bayern: Große Kreisstadt und kreisfreie Stadt für alle Straßen, gemeindefreies Gebiet beim Kreis", () => {
  const gks = resolveGemeinde(G.freising);
  for (const k of BAU_KLASSEN) assert.equal(gks.zust[k].stelle, "g091780124124", k);
  assert.equal(gks.zust.B.sicherheit, SICHERHEIT.BELEGT);
  assert.equal(gks.zust.B.quelle, TEXTE.quelle.byGks);
  assert.equal(gks.zust.B.alternative, null);
  assert.equal(gks.stellen.g091780124124.name, "Stadt Freising – Straßenverkehrsbehörde");
  const muenchen = resolveGemeinde(G.muenchen).zust.G;
  assert.equal(muenchen.stelle, "k09162");
  assert.equal(muenchen.sicherheit, SICHERHEIT.BELEGT);
  assert.equal(muenchen.quelle, TEXTE.quelle.byUnter);
  const forst = resolveGemeinde(G.heinersreuth).zust.G;
  assert.equal(forst.stelle, "k09472");
  assert.equal(forst.sicherheit, SICHERHEIT.VERMUTLICH);
  assert.equal(forst.grund, TEXTE.grund.gemeindefrei);
});

test("Thüringen: Städte über 30.000 Einwohner und Eisenach für alle Straßen (vermutlich)", () => {
  const gotha = resolveGemeinde(G.gotha);
  for (const k of BAU_KLASSEN) assert.equal(gotha.zust[k].stelle, "g160670029029", k);
  assert.equal(gotha.zust.B.sicherheit, SICHERHEIT.VERMUTLICH);
  assert.equal(gotha.zust.B.grund, TEXTE.grund.thStadt);
  assert.equal(gotha.zust.B.quelle, TEXTE.quelle.thStadt);
  assert.equal(gotha.stellen.g160670029029.name, "Stadt Gotha – Straßenverkehrsbehörde");
  assert.equal(gotha.stellen.g160670029029.art, "stadt");
  assert.equal(resolveGemeinde({ ...G.eisenach, ew: 29000 }).zust.B.stelle, "g160630105105", "Eisenach auch darunter");
  const weimar = resolveGemeinde(G.weimar).zust.G;
  assert.equal(weimar.stelle, "k16055");
  assert.equal(weimar.sicherheit, SICHERHEIT.VERMUTLICH);
});

test("Thüringen: Stadt auf Antrag für alle Straßen außer Bundesstraßen", () => {
  const apolda = resolveGemeinde({ ...G.apolda, bundesportal: "stvb" }).zust;
  for (const k of ["G", "K", "L"]) assert.equal(apolda[k].stelle, "g160710001001", k);
  assert.equal(apolda.G.grund, TEXTE.grund.thAntrag);
  assert.equal(apolda.G.sicherheit, SICHERHEIT.VERMUTLICH);
  assert.equal(apolda.B.stelle, "k16071");
  assert.equal(apolda.B.grund, TEXTE.grund.thBundesstrasse);
  assert.ok(TH_STAEDTE_AUF_ANTRAG[G.arnstadt.ars], "Arnstadt steht in der Liste");
  const arnstadt = resolveGemeinde(G.arnstadt).zust;
  assert.equal(arnstadt.G.stelle, "g160700004004");
  assert.equal(arnstadt.B.stelle, "k16070");
});

test("Thüringen: sonst der Landkreis; Gemeinden bis 30.000 Einwohner als Alternative", () => {
  const apolda = resolveGemeinde(G.apolda).zust; // weder im Portal noch in der Liste
  assert.equal(apolda.G.stelle, "k16071");
  assert.equal(apolda.G.sicherheit, SICHERHEIT.VERMUTLICH);
  assert.equal(apolda.G.grund, TEXTE.grund.thLandkreis);
  assert.equal(apolda.G.quelle, TEXTE.quelle.thLandkreis);
  assert.deepEqual(apolda.K.alternative, { stelle: "g160710001001", bedingung: TEXTE.bedingung.thAntragMoeglich });
  assert.equal(apolda.B.alternative, null, "Bundesstraßen nie auf Antrag");
  const bestaetigt = resolveGemeinde({ ...G.apolda, bundesportal: "passt" }).zust.G;
  assert.equal(bestaetigt.grund, TEXTE.grund.thLandkreisPortal);
  assert.equal(bestaetigt.sicherheit, SICHERHEIT.VERMUTLICH);

  const dorf = resolveGemeinde(G.grammetal).zust.G;
  assert.equal(dorf.stelle, "k16071");
  assert.equal(dorf.sicherheit, SICHERHEIT.VERMUTLICH);
  assert.equal(dorf.alternative, null, "unter 10.000 Einwohnern gilt § 2 Abs. 7 nicht");

  // Nennt das Portal eine kleine Gemeinde als Straßenverkehrsbehörde, steht sie als Alternative da.
  const klein = resolveGemeinde({ ...G.grammetal, bundesportal: "stvb" });
  assert.equal(klein.zust.G.stelle, "k16071");
  assert.deepEqual(klein.zust.G.alternative, { stelle: "g160710103103", bedingung: TEXTE.bedingung.portalStvb });
  assert.equal(klein.stellen.g160710103103.name, "Gemeinde Grammetal – Straßenverkehrsbehörde");
});

test("Schleswig-Holstein: Kreis, für Halten und Parken das Amt bzw. die amtsfreie Gemeinde (belegt)", () => {
  const { zust, stellen } = resolveGemeinde(G.ascheffel);
  for (const k of BAU_KLASSEN) {
    assert.equal(zust[k].stelle, "k01058", k);
    assert.deepEqual(zust[k].alternative, { stelle: "v010585890", bedingung: TEXTE.bedingung.shParken });
  }
  assert.equal(zust.G.sicherheit, SICHERHEIT.BELEGT);
  assert.equal(zust.G.grund, TEXTE.grund.shKreis);
  assert.equal(zust.G.quelle, TEXTE.quelle.shKreis);
  assert.equal(stellen.k01058.name, "Kreis Rendsburg-Eckernförde – Straßenverkehrsbehörde");
  assert.deepEqual(stellen.v010585890, {
    id: "v010585890", name: "Amt Hüttener Berge – Straßenverkehrsbehörde", ebene: "oertliche", art: "verband",
  });
  const amtsfrei = resolveGemeinde(G.altenholz);
  assert.equal(amtsfrei.zust.K.alternative.stelle, "g010580005005");
  assert.equal(amtsfrei.stellen.g010580005005.name, "Gemeinde Altenholz – Straßenverkehrsbehörde");
  const kiel = resolveGemeinde(G.kiel).zust.B;
  assert.equal(kiel.stelle, "k01002");
  assert.equal(kiel.sicherheit, SICHERHEIT.BELEGT);
  assert.equal(kiel.alternative, null);
});

test("Schleswig-Holstein: Gemeinden über 20.000 Einwohner und Glinde selbst; knapp darunter vermutlich", () => {
  const norderstedt = resolveGemeinde(G.norderstedt);
  for (const k of BAU_KLASSEN) assert.equal(norderstedt.zust[k].stelle, "g010600063063", k);
  assert.equal(norderstedt.zust.B.sicherheit, SICHERHEIT.BELEGT);
  assert.equal(norderstedt.zust.B.grund, TEXTE.grund.shGemeinde);
  assert.equal(norderstedt.zust.B.alternative, null);
  assert.equal(norderstedt.stellen.g010600063063.name, "Stadt Norderstedt – Straßenverkehrsbehörde");
  const hu = resolveGemeinde(G.henstedtUlzburg);
  assert.equal(hu.stellen.g010600039039.name, "Gemeinde Henstedt-Ulzburg – Straßenverkehrsbehörde");
  assert.equal(hu.stellen.g010600039039.art, "gemeinde");

  const glinde = resolveGemeinde(G.glinde).zust.K;
  assert.equal(glinde.stelle, "g010620018018", "auf Antrag (Anlage Nr. 1)");
  assert.equal(glinde.grund, TEXTE.grund.shAntrag);
  assert.equal(glinde.sicherheit, SICHERHEIT.BELEGT);

  const knapp = resolveGemeinde(G.badSchwartau).zust.G;
  assert.equal(knapp.stelle, "k01055");
  assert.equal(knapp.sicherheit, SICHERHEIT.VERMUTLICH, "19.918 Einwohner");
  assert.equal(knapp.grund, TEXTE.grund.shKreisKnapp);
  assert.equal(resolveGemeinde({ ...G.badSchwartau, ew: 20500 }).zust.G.grund, TEXTE.grund.shGemeindeKnapp);
});

test("Niedersachsen: kreisfreie Städte, Hannover und Göttingen für alle Straßen (belegt)", () => {
  const bs = resolveGemeinde(G.braunschweig).zust;
  for (const k of BAU_KLASSEN) assert.equal(bs[k].stelle, "k03101", k);
  assert.equal(bs.G.sicherheit, SICHERHEIT.BELEGT);
  assert.equal(bs.G.quelle, TEXTE.quelle.niStadt);
  const h = resolveGemeinde(G.hannover);
  for (const k of BAU_KLASSEN) assert.equal(h.zust[k].stelle, "g032410001001", k);
  assert.equal(h.zust.B.grund, TEXTE.grund.niWieKreisfrei);
  assert.equal(h.zust.B.sicherheit, SICHERHEIT.BELEGT);
  assert.deepEqual(h.stellen.g032410001001, {
    id: "g032410001001", name: "Stadt Hannover – Straßenverkehrsbehörde", ebene: "untere", art: "stadt",
  });
  assert.equal(resolveGemeinde(G.goettingen).zust.K.stelle, "g031590016016");
  assert.deepEqual(Object.keys(NI_WIE_KREISFREI).sort(), ["031590016016", "032410001001"]);
});

test("Niedersachsen: große selbständige Städte und selbständige Gemeinden für alle Straßen, auch Samtgemeinden", () => {
  const celle = resolveGemeinde(G.celle);
  for (const k of BAU_KLASSEN) {
    assert.equal(celle.zust[k].stelle, "g033510006006", k);
    assert.equal(celle.zust[k].sicherheit, SICHERHEIT.BELEGT, k);
    assert.equal(celle.zust[k].alternative, null, k);
  }
  assert.equal(celle.zust.G.grund, TEXTE.grund.niSelbstaendig);
  assert.equal(celle.stellen.g033510006006.name, "Stadt Celle – Straßenverkehrsbehörde");
  const seevetal = resolveGemeinde(G.seevetal).stellen.g033530031031;
  assert.equal(seevetal.name, "Gemeinde Seevetal – Straßenverkehrsbehörde");
  assert.equal(seevetal.ebene, "untere");
  const alfeld = resolveGemeinde(G.alfeld).zust.B;
  assert.equal(alfeld.stelle, "g032540002002", "der Status zählt, nicht die Einwohnerzahl (17.991)");
  const artland = resolveGemeinde(G.quakenbrueck);
  for (const k of BAU_KLASSEN) assert.equal(artland.zust[k].stelle, "v034595401", k);
  assert.deepEqual(artland.stellen.v034595401, {
    id: "v034595401", name: "Samtgemeinde Artland – Straßenverkehrsbehörde", ebene: "untere", art: "verband",
  });
  const eintraege = Object.keys(NI_SELBSTAENDIG);
  assert.equal(eintraege.length, 71, "7 große selbständige Städte und 64 selbständige Gemeinden");
  assert.equal(eintraege.filter((a) => a.length === 9).length, 3, "drei Samtgemeinden");
});

test("Niedersachsen: Burgdorf per Vereinbarung bei der Region (vermutlich)", () => {
  const { zust, stellen } = resolveGemeinde(G.burgdorf);
  for (const k of BAU_KLASSEN) assert.equal(zust[k].stelle, "k03241", k);
  assert.equal(zust.G.sicherheit, SICHERHEIT.VERMUTLICH);
  assert.equal(zust.G.grund, TEXTE.grund.niVereinbarung);
  assert.equal(stellen.k03241.name, "Region Hannover – Straßenverkehrsbehörde");
});

test("Niedersachsen: sonst der Landkreis; Gemeindestraßen nach Übertragung bei Gemeinde bzw. Samtgemeinde", () => {
  const oyten = resolveGemeinde(G.oyten);
  assert.equal(oyten.zust.G.stelle, "g033610009009");
  assert.equal(oyten.zust.G.sicherheit, SICHERHEIT.VERMUTLICH);
  assert.equal(oyten.zust.G.grund, TEXTE.grund.niUebertragung);
  assert.equal(oyten.stellen.g033610009009.ebene, "oertliche");
  for (const k of ["K", "L", "B"]) {
    assert.equal(oyten.zust[k].stelle, "k03361", k);
    assert.equal(oyten.zust[k].sicherheit, SICHERHEIT.BELEGT, k);
    assert.equal(oyten.zust[k].grund, TEXTE.grund.niKreis, k);
  }
  const nenndorf = resolveGemeinde(G.badNenndorf);
  assert.equal(nenndorf.zust.G.stelle, "v032575403", "Übertragung an die Samtgemeinde");
  assert.equal(nenndorf.stellen.v032575403.ebene, "oertliche");
  assert.equal(nenndorf.zust.K.stelle, "k03257");
  assert.ok(NI_GEMEINDESTRASSEN["032575403"]);
});

test("Niedersachsen: ohne bekannte Übertragung der Landkreis, Samtgemeinde oder größere Gemeinde als Alternative", () => {
  const lohne = resolveGemeinde(G.lohne).zust;
  assert.equal(lohne.G.stelle, "k03460");
  assert.equal(lohne.G.sicherheit, SICHERHEIT.VERMUTLICH);
  assert.equal(lohne.G.grund, TEXTE.grund.niKreisGemeindestrasse);
  assert.deepEqual(lohne.G.alternative, { stelle: "g034600006006", bedingung: TEXTE.bedingung.niUebertragungMoeglich });
  assert.equal(lohne.K.alternative, null);
  const klein = resolveGemeinde(G.doetlingen).zust.G;
  assert.equal(klein.stelle, "k03458");
  assert.equal(klein.alternative, null, "6.203 Einwohner, keine Samtgemeinde");
  const winkelsett = resolveGemeinde(G.winkelsett);
  assert.deepEqual(winkelsett.zust.G.alternative, {
    stelle: "v034585401", bedingung: TEXTE.bedingung.niUebertragungMoeglich,
  });
  assert.equal(winkelsett.stellen.v034585401.name, "Samtgemeinde Harpstedt – Straßenverkehrsbehörde");
  assert.equal(winkelsett.stellen.k03458.name, "Landkreis Oldenburg – Straßenverkehrsbehörde");
  const harz = resolveGemeinde(G.harz).zust.G;
  assert.equal(harz.stelle, "k03153");
  assert.equal(harz.sicherheit, SICHERHEIT.VERMUTLICH);
  assert.equal(harz.grund, TEXTE.grund.gemeindefrei);
  assert.equal(harz.quelle, TEXTE.quelle.niGemeindefrei);
});

test("resolveGemeinde: prüft die Eingabe", () => {
  assert.throws(() => resolveGemeinde({ ...G.muenchen, ars: "09162000" }), /ungültiger ARS/);
  assert.throws(() => resolveGemeinde({ ...G.muenchen, kreis: null }), /ohne Kreis/);
  assert.throws(() => resolveGemeinde({ ...G.muenchen, land: "" }), /ohne Land/);
});

test("ergebnisId: stabil und inhaltsabhängig", () => {
  const a = resolveGemeinde(G.aichwald).zust.G;
  const b = resolveGemeinde(G.aichwald).zust.G;
  const c = resolveGemeinde(G.esslingen).zust.G;
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
  const daten = { land, stellen: { fba: FESTE_STELLEN.fba }, ergebnisse: {}, kontakte: {}, kreise: {}, gemeinden: {} };
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
  const d = landesdatei("BW", [G.aichwald]);
  const r = auswahl(d, G.aichwald.ars, ["A"]);
  assert.equal(r.zustaendig.id, "fba");
  assert.equal(r.keinBrief, true);
});

test("auswahl: Autobahn und Gemeindestraße → Kreis mit Hinweis", () => {
  const d = landesdatei("BW", [G.aichwald]);
  const r = auswahl(d, G.aichwald.ars, ["A", "G"]);
  assert.equal(r.zustaendig.id, "k08116");
  assert.ok(r.hinweise.includes(TEXTE.hinweis.autobahnDabei));
  assert.equal(r.kreis, "Esslingen");
  assert.equal(r.gemeinde, "Aichwald");
});

test("auswahl: keine Straße → Hinweis, schwächere Sicherheit", () => {
  const d = landesdatei("BY", [G.muenchen]);
  const r = auswahl(d, G.muenchen.ars, []);
  assert.equal(r.klasse, "unklar");
  assert.equal(r.sicherheit, SICHERHEIT.VERMUTLICH, "belegt, aber Klasse unbekannt");
  assert.ok(r.hinweise.includes(TEXTE.hinweis.keineStrasse));
});

test("auswahl: Alternative aus dem Ergebnis (Große Kreisstadt)", () => {
  const d = landesdatei("BW", [G.esslingen]);
  const r = auswahl(d, G.esslingen.ars, ["B"]);
  assert.equal(r.zustaendig.id, "k08116");
  assert.equal(r.alternative.stelle.id, "g081160019019");
  assert.equal(r.alternative.kontakt, null);
});

test("auswahl: unbekannte Gemeinde → null", () => {
  assert.equal(auswahl(landesdatei("BY", [G.freising]), "099999999999", ["G"]), null);
});

test("auswahl: unterschiedliche Stellen je Klasse → Gemeindestraße als Alternative", () => {
  const d = landesdatei("BY", [G.essenbach]);
  const r = auswahl(d, G.essenbach.ars, ["G", "K"]);
  assert.equal(r.zustaendig.id, "k09274");
  assert.equal(r.alternative.stelle.id, "g092740128128");
  assert.equal(r.alternative.bedingung, TEXTE.bedingung.gemeindestrasse);

  const nurG = auswahl(d, G.essenbach.ars, ["G"]);
  assert.equal(nurG.zustaendig.id, "g092740128128");
  assert.equal(nurG.sicherheit, SICHERHEIT.BELEGT);
  assert.equal(nurG.alternative, null);

  const unklar = auswahl(d, G.essenbach.ars, ["unklar"]);
  assert.equal(unklar.zustaendig.id, "k09274");
  assert.equal(unklar.sicherheit, SICHERHEIT.VERMUTLICH);
  assert.equal(unklar.alternative.bedingung, TEXTE.bedingung.unklar);
});

test("auswahl: Kontakt genau der zuständigen Stelle, die Alternative mit eigenem", () => {
  const d = landesdatei("BY", [G.essenbach]);
  d.kontakte = { c1: { name: "Landratsamt Landshut - Verkehrswesen" }, c2: { name: "Markt Essenbach - Ordnungsamt" } };
  const eintrag = d.gemeinden[G.essenbach.ars];
  Object.assign(eintrag, { kontakt: "c1", kontakt_gemeinde: "c2" });

  assert.equal(auswahl(d, G.essenbach.ars, ["G"]).kontakt.name, "Markt Essenbach - Ordnungsamt");
  assert.equal(auswahl(d, G.essenbach.ars, ["K"]).kontakt.name, "Landratsamt Landshut - Verkehrswesen");
  const beide = auswahl(d, G.essenbach.ars, ["K", "G"]);
  assert.equal(beide.kontakt.name, "Landratsamt Landshut - Verkehrswesen");
  assert.equal(beide.alternative.kontakt.name, "Markt Essenbach - Ordnungsamt");
  assert.equal(auswahl(d, G.essenbach.ars, ["A"]).kontakt, null, "Autobahn: keiner");

  delete eintrag.kontakt_gemeinde;
  assert.equal(auswahl(d, G.essenbach.ars, ["G"]).kontakt, null, "nie der Kontakt einer anderen Stelle");
  assert.equal(auswahl(d, G.essenbach.ars, ["K", "G"]).alternative.kontakt, null);
});
