// SPDX-License-Identifier: AGPL-3.0-or-later
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  auswahl, BAU_KLASSEN, BB_AUF_ANTRAG, BB_AUF_ANTRAG_TEILWEISE, BB_GROSSE_KREISANGEHOERIGE_STAEDTE, BW_OERTLICH,
  BW_OERTLICH_VG, BW_SCHWELLEN, BW_VG_UNTERE, BW_VOLLSTAENDIG, ergebnisId,
  FESTE_STELLEN, HE_SCHWELLEN, HE_SONDERSTATUS, kontaktRolle, LANDESREGELN, MV_GROSSE_KREISANGEHOERIGE_STAEDTE,
  MV_STAEDTE_UEBERGANG,
  NI_GEMEINDESTRASSEN, NI_SELBSTAENDIG, NI_WIE_KREISFREI, NW_GROSSE_KREISANGEHOERIGE_STAEDTE,
  NW_MITTLERE_KREISANGEHOERIGE_STAEDTE, pruefeListen, resolveGemeinde, RP_ANLAGE_1, RP_GROSSE_KREISANGEHOERIGE_STAEDTE,
  schwaecher, stelleEintragen,
  SICHERHEIT, SN_GROSSE_KREISSTAEDTE, TEXTE, TH_GROSSE_KREISANGEHOERIGE_STAEDTE, TH_STAEDTE_AUF_ANTRAG,
} from "../js/resolve.js";
import { LAENDER } from "../js/laender.js";

const kreis = (ars, gen, bez, nbd, kreisfrei = false) => ({ ars, gen, bez, nbd, kreisfrei, name: gen });

// Echte Gemeinden (VG25, GV-ISys 31.12.2025). Die Gemeinden aus Baden-Württemberg dienen unter einem
// erfundenen Länderkürzel auch für den Rückfall auf Phase 1 (`ohneRegel`).
const G = {
  stuttgart: {
    ars: "081110000000", gen: "Stuttgart", land: "BW", tkz: [62],
    kreis: kreis("08111", "Stuttgart", "Stadtkreis", "ja", true),
  },
  aichwald: {
    ars: "081160076076", gen: "Aichwald", land: "BW", tkz: [64], ew: 7600,
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
  // Thüringen: ARS laut VG25 (BKG-Dienst), Einwohner laut Gemeindeverzeichnis (statistikportal.de). Eisenberg ist
  // erfüllende Gemeinde – sein ARS trägt den Verband, die Liste den AGS.
  eisenberg: {
    ars: "160745052018", gen: "Eisenberg", land: "TH", tkz: [63], ew: 10585,
    kreis: kreis("16074", "Saale-Holzland-Kreis", "Landkreis", "nein"),
    verband: { ars: "160745052", gen: "Eisenberg", name: "Erfüllende Gemeinde Eisenberg", sitz: "160745052018" },
  },
  leinefeldeWorbis: {
    ars: "160610115115", gen: "Leinefelde-Worbis", land: "TH", tkz: [63], ew: 19812,
    kreis: kreis("16061", "Eichsfeld", "Landkreis", "ja"),
  },
  greiz: {
    ars: "160760022022", gen: "Greiz", land: "TH", tkz: [63], ew: 19136,
    kreis: kreis("16076", "Greiz", "Landkreis", "ja"),
  },
  altenburg: {
    ars: "160770001001", gen: "Altenburg", land: "TH", tkz: [63], ew: 30867,
    kreis: kreis("16077", "Altenburger Land", "Landkreis", "nein"),
  },
  bremen: { ars: "040110000000", gen: "Bremen", land: "HB", kreis: kreis("04011", "Bremen", "Kreisfreie Stadt", "nein", true) },
  bremerhaven: {
    ars: "040120000000", gen: "Bremerhaven", land: "HB",
    kreis: kreis("04012", "Bremerhaven", "Kreisfreie Stadt", "nein", true),
  },
  berlin: { ars: "110000000000", gen: "Berlin", land: "BE", kreis: kreis("11000", "Berlin", "Kreisfreie Stadt", "nein", true) },
  // Berliner Bezirke: Einträge der Pipeline (pipeline/config/berlin.yaml), keine Gemeinden in VG25.
  berlinMitte: {
    ars: "110000000001", gen: "Mitte", name: "Bezirk Mitte", land: "BE", bezirk: { nr: "01", name: "Mitte" },
    kreis: kreis("11000", "Berlin", "Kreisfreie Stadt", "nein", true),
  },
  berlinTreptowKoepenick: {
    ars: "110000000009", gen: "Treptow-Köpenick", name: "Bezirk Treptow-Köpenick", land: "BE",
    bezirk: { nr: "09", name: "Treptow-Köpenick" }, kreis: kreis("11000", "Berlin", "Kreisfreie Stadt", "nein", true),
  },
  hamburg: { ars: "020000000000", gen: "Hamburg", land: "HH", kreis: kreis("02000", "Hamburg", "Kreisfreie Stadt", "nein", true) },
  muensingen: {
    ars: "084159971971", gen: "Gutsbezirk Münsingen", land: "BW", tkz: [66], ew: 0, gemeindefrei: true,
    kreis: kreis("08415", "Reutlingen", "Landkreis", "ja"),
  },
  // Baden-Württemberg: ARS aus dem Gemeindeverzeichnis des Statistischen Landesamts. Einwohner gerundet – sie
  // entscheiden nur, ob eine Schwelle erreicht ist, und liegen weit genug davon weg; `verband.ew` ist die Summe
  // der Mitglieder, wie sie der Build bildet.
  dettingenTeck: {
    ars: "081165001016", gen: "Dettingen unter Teck", name: "Gemeinde Dettingen unter Teck", land: "BW", tkz: [64],
    ew: 6000, kreis: kreis("08116", "Esslingen", "Landkreis", "ja"),
    verband: {
      ars: "081165001", gen: "Kirchheim unter Teck", name: "Vereinbarte Verwaltungsgemeinschaft Kirchheim unter Teck",
      ew: 51000,
    },
  },
  badFriedrichshall: {
    ars: "081255001005", gen: "Bad Friedrichshall", name: "Stadt Bad Friedrichshall", land: "BW", tkz: [63], ew: 20500,
    kreis: kreis("08125", "Heilbronn", "Landkreis", "ja"),
    verband: {
      ars: "081255001", gen: "Bad Friedrichshall", name: "Vereinbarte Verwaltungsgemeinschaft Bad Friedrichshall",
      ew: 30000,
    },
  },
  lichtenwald: {
    ars: "081165007037", gen: "Lichtenwald", name: "Gemeinde Lichtenwald", land: "BW", tkz: [64], ew: 2600,
    kreis: kreis("08116", "Esslingen", "Landkreis", "ja"),
    verband: {
      ars: "081165007", gen: "Reichenbach an der Fils", name: "Gemeindeverwaltungsverband Reichenbach an der Fils",
      ew: 21000,
    },
  },
  hermaringen: {
    ars: "081355001021", gen: "Hermaringen", name: "Gemeinde Hermaringen", land: "BW", tkz: [64], ew: 2300,
    kreis: kreis("08135", "Heidenheim", "Landkreis", "ja"),
    verband: {
      ars: "081355001", gen: "Giengen an der Brenz", name: "Vereinbarte Verwaltungsgemeinschaft Giengen an der Brenz",
      ew: 22000,
    },
  },
  aichtal: {
    ars: "081160081081", gen: "Aichtal", name: "Stadt Aichtal", land: "BW", tkz: [63], ew: 10000,
    kreis: kreis("08116", "Esslingen", "Landkreis", "ja"),
  },
  altdorfBB: {
    ars: "081155004002", gen: "Altdorf", name: "Gemeinde Altdorf", land: "BW", tkz: [64], ew: 4700,
    kreis: kreis("08115", "Böblingen", "Landkreis", "ja"),
    verband: { ars: "081155004", gen: "Holzgerlingen", name: "Gemeindeverwaltungsverband Holzgerlingen", ew: 21500 },
  },
  gerstetten: {
    ars: "081350015015", gen: "Gerstetten", name: "Gemeinde Gerstetten", land: "BW", tkz: [64], ew: 11500,
    kreis: kreis("08135", "Heidenheim", "Landkreis", "ja"),
  },
  // Künzelsau: Mitglieder der Gemeinschaft angenommen (nur Ingelfingen dazu), Einwohner gerundet.
  kuenzelsau: {
    ars: "081265003046", gen: "Künzelsau", name: "Stadt Künzelsau", land: "BW", tkz: [63], ew: 16000,
    kreis: kreis("08126", "Hohenlohekreis", "Landkreis", "nein"),
    verband: {
      ars: "081265003", gen: "Künzelsau", name: "Vereinbarte Verwaltungsgemeinschaft Künzelsau", ew: 22000,
      mitglieder: ["Ingelfingen", "Künzelsau"],
    },
  },
  doerzbach: {
    ars: "081265002020", gen: "Dörzbach", name: "Gemeinde Dörzbach", land: "BW", tkz: [64], ew: 2500,
    kreis: kreis("08126", "Hohenlohekreis", "Landkreis", "nein"),
    verband: { ars: "081265002", gen: "Krautheim", name: "Gemeindeverwaltungsverband Krautheim", ew: 11000 },
  },
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
  koeln: {
    ars: "053150000000", gen: "Köln", land: "NW", tkz: [61],
    kreis: kreis("05315", "Köln", "Kreisfreie Stadt", "ja", true),
  },
  aachen: {
    ars: "053340002002", gen: "Aachen", land: "NW", tkz: [63],
    kreis: kreis("05334", "Städteregion Aachen", "Kreis", "nein"),
  },
  simmerath: {
    ars: "053340028028", gen: "Simmerath", name: "Gemeinde Simmerath", land: "NW", tkz: [64],
    kreis: kreis("05334", "Städteregion Aachen", "Kreis", "nein"),
  },
  stolberg: {
    ars: "053340032032", gen: "Stolberg (Rhld.)", land: "NW", tkz: [63],
    kreis: kreis("05334", "Städteregion Aachen", "Kreis", "nein"),
  },
  neuss: {
    ars: "051620024024", gen: "Neuss", land: "NW", tkz: [63],
    kreis: kreis("05162", "Rhein-Kreis Neuss", "Kreis", "nein"),
  },
  monheim: {
    ars: "051580026026", gen: "Monheim am Rhein", land: "NW", tkz: [63],
    kreis: kreis("05158", "Mettmann", "Kreis", "ja"),
  },
  borken: {
    ars: "055540012012", gen: "Borken", land: "NW", tkz: [63],
    kreis: kreis("05554", "Borken", "Kreis", "ja"),
  },
  heiden: {
    ars: "055540028028", gen: "Heiden", name: "Gemeinde Heiden", land: "NW", tkz: [64],
    kreis: kreis("05554", "Borken", "Kreis", "ja"),
  },
  salzkotten: {
    ars: "057740036036", gen: "Salzkotten", land: "NW", tkz: [63],
    kreis: kreis("05774", "Paderborn", "Kreis", "ja"),
  },
  altena: {
    ars: "059620004004", gen: "Altena", land: "NW", tkz: [63],
    kreis: kreis("05962", "Märkischer Kreis", "Kreis", "nein"),
  },
  luedinghausen: {
    ars: "055580024024", gen: "Lüdinghausen", land: "NW", tkz: [63],
    kreis: kreis("05558", "Coesfeld", "Kreis", "ja"),
  },
  potsdam: {
    ars: "120540000000", gen: "Potsdam", land: "BB", tkz: [61],
    kreis: kreis("12054", "Potsdam", "Kreisfreie Stadt", "ja", true),
  },
  eberswalde: {
    ars: "120600052052", gen: "Eberswalde", land: "BB", tkz: [63],
    kreis: kreis("12060", "Barnim", "Landkreis", "ja"),
  },
  bernau: {
    ars: "120600020020", gen: "Bernau bei Berlin", land: "BB", tkz: [63],
    kreis: kreis("12060", "Barnim", "Landkreis", "ja"),
  },
  schwedt: {
    ars: "120735051532", gen: "Schwedt/Oder", land: "BB", tkz: [63],
    kreis: kreis("12073", "Uckermark", "Landkreis", "ja"),
    verband: { ars: "120735051" }, // Mitverwaltung: Schwedt/Oder verwaltet Pinnow mit
  },
  pinnow: {
    ars: "120735051440", gen: "Pinnow", name: "Gemeinde Pinnow", land: "BB", tkz: [64],
    kreis: kreis("12073", "Uckermark", "Landkreis", "ja"),
    verband: { ars: "120735051" },
  },
  teltow: {
    ars: "120690616616", gen: "Teltow", land: "BB", tkz: [63],
    kreis: kreis("12069", "Potsdam-Mittelmark", "Landkreis", "ja"),
  },
  kleinmachnow: {
    ars: "120690304304", gen: "Kleinmachnow", name: "Gemeinde Kleinmachnow", land: "BB", tkz: [64],
    kreis: kreis("12069", "Potsdam-Mittelmark", "Landkreis", "ja"),
  },
  kyritz: {
    ars: "120680264264", gen: "Kyritz", land: "BB", tkz: [63],
    kreis: kreis("12068", "Ostprignitz-Ruppin", "Landkreis", "ja"),
  },
  lebusa: {
    ars: "120625209289", gen: "Lebusa", name: "Gemeinde Lebusa", land: "BB", tkz: [64],
    kreis: kreis("12062", "Elbe-Elster", "Landkreis", "ja"),
    verband: { ars: "120625209", gen: "Schlieben", name: "Amt Schlieben" },
  },
  schlieben: {
    ars: "120625209445", gen: "Schlieben", land: "BB", tkz: [63],
    kreis: kreis("12062", "Elbe-Elster", "Landkreis", "ja"),
    verband: { ars: "120625209", gen: "Schlieben", name: "Amt Schlieben" },
  },
  rostock: {
    ars: "130030000000", gen: "Rostock", land: "MV", tkz: [61],
    kreis: kreis("13003", "Rostock", "Kreisfreie Stadt", "ja", true),
  },
  greifswald: {
    ars: "130750039039", gen: "Greifswald", land: "MV", tkz: [63],
    kreis: kreis("13075", "Vorpommern-Greifswald", "Landkreis", "ja"),
  },
  guestrow: {
    ars: "130720043043", gen: "Güstrow", land: "MV", tkz: [63],
    kreis: kreis("13072", "Rostock", "Landkreis", "ja"),
  },
  waren: {
    ars: "130710156156", gen: "Waren (Müritz)", land: "MV", tkz: [63],
    kreis: kreis("13071", "Mecklenburgische Seenplatte", "Landkreis", "ja"),
  },
  parchim: {
    ars: "130760108108", gen: "Parchim", land: "MV", tkz: [63],
    kreis: kreis("13076", "Ludwigslust-Parchim", "Landkreis", "ja"),
  },
  ribnitz: {
    ars: "130735361075", gen: "Ribnitz-Damgarten", land: "MV", tkz: [63],
    kreis: kreis("13073", "Vorpommern-Rügen", "Landkreis", "ja"),
    verband: { ars: "130735361", gen: "Ribnitz-Damgarten", name: "Amt Ribnitz-Damgarten" },
  },
  mainz: {
    ars: "073150000000", gen: "Mainz", land: "RP", tkz: [61],
    kreis: kreis("07315", "Mainz", "Kreisfreie Stadt", "ja", true),
  },
  neuwied: {
    ars: "071380045045", gen: "Neuwied", land: "RP", tkz: [63],
    kreis: kreis("07138", "Neuwied", "Landkreis", "ja"),
  },
  bodenheim: {
    ars: "073395002006", gen: "Bodenheim", land: "RP", tkz: [64],
    kreis: kreis("07339", "Mainz-Bingen", "Landkreis", "ja"),
    verband: { ars: "073395002", gen: "Bodenheim", name: "Verbandsgemeinde Bodenheim" },
  },
  hassloch: {
    ars: "073320025025", gen: "Haßloch", name: "Gemeinde Haßloch", land: "RP", tkz: [64],
    kreis: kreis("07332", "Bad Dürkheim", "Landkreis", "ja"),
  },
  bendorf: {
    ars: "071370203203", gen: "Bendorf", land: "RP", tkz: [63],
    kreis: kreis("07137", "Mayen-Koblenz", "Landkreis", "ja"),
  },
  dresden: {
    ars: "146120000000", gen: "Dresden", land: "SN", tkz: [61],
    kreis: kreis("14612", "Dresden", "Kreisfreie Stadt", "ja", true),
  },
  plauen: {
    ars: "145230320320", gen: "Plauen", land: "SN", tkz: [63],
    kreis: kreis("14523", "Vogtlandkreis", "Landkreis", "nein"),
  },
  zschopau: {
    ars: "145215138690", gen: "Zschopau", land: "SN", tkz: [63],
    kreis: kreis("14521", "Erzgebirgskreis", "Landkreis", "nein"),
    verband: {
      ars: "145215138", gen: "Zschopau", bez: "Verwaltungsgemeinschaft", name: "Verwaltungsgemeinschaft Zschopau",
      sitz: "145215138690",
    },
  },
  gornau: {
    ars: "145215138220", gen: "Gornau/Erzgeb.", name: "Gemeinde Gornau/Erzgeb.", land: "SN", tkz: [64],
    kreis: kreis("14521", "Erzgebirgskreis", "Landkreis", "nein"),
    verband: {
      ars: "145215138", gen: "Zschopau", bez: "Verwaltungsgemeinschaft", name: "Verwaltungsgemeinschaft Zschopau",
      sitz: "145215138690",
    },
  },
  amtsberg: {
    ars: "145210010010", gen: "Amtsberg", name: "Gemeinde Amtsberg", land: "SN", tkz: [64],
    kreis: kreis("14521", "Erzgebirgskreis", "Landkreis", "nein"),
  },
  rodewisch: {
    ars: "145230360360", gen: "Rodewisch", land: "SN", tkz: [63],
    kreis: kreis("14523", "Vogtlandkreis", "Landkreis", "nein"),
  },
  treuen: {
    ars: "145235134430", gen: "Treuen", land: "SN", tkz: [63],
    kreis: kreis("14523", "Vogtlandkreis", "Landkreis", "nein"),
    verband: {
      ars: "145235134", gen: "Treuen/Neuensalz", bez: "Verwaltungsgemeinschaft",
      name: "Verwaltungsgemeinschaft Treuen/Neuensalz",
      sitz: "145235134430",
    },
  },
  neuensalz: {
    ars: "145235134270", gen: "Neuensalz", name: "Gemeinde Neuensalz", land: "SN", tkz: [64],
    kreis: kreis("14523", "Vogtlandkreis", "Landkreis", "nein"),
    verband: {
      ars: "145235134", gen: "Treuen/Neuensalz", bez: "Verwaltungsgemeinschaft",
      name: "Verwaltungsgemeinschaft Treuen/Neuensalz",
      sitz: "145235134430",
    },
  },
  bergen: {
    ars: "145235402050", gen: "Bergen", name: "Gemeinde Bergen", land: "SN", tkz: [64],
    kreis: kreis("14523", "Vogtlandkreis", "Landkreis", "nein"),
    verband: { ars: "145235402", gen: "Jägerswald", bez: "Verwaltungsverband", name: "Verwaltungsverband Jägerswald" },
  },
  magdeburg: {
    ars: "150030000000", gen: "Magdeburg", land: "ST", tkz: [61],
    kreis: kreis("15003", "Magdeburg", "Kreisfreie Stadt", "ja", true),
  },
  halberstadt: {
    ars: "150850135135", gen: "Halberstadt", land: "ST", tkz: [63],
    kreis: kreis("15085", "Harz", "Landkreis", "ja"),
  },
  ditfurt: {
    ars: "150855051090", gen: "Ditfurt", name: "Gemeinde Ditfurt", land: "ST", tkz: [64],
    kreis: kreis("15085", "Harz", "Landkreis", "ja"),
    verband: { ars: "150855051", gen: "Vorharz", bez: "Verbandsgemeinde", name: "Verbandsgemeinde Vorharz" },
  },
  wegeleben: {
    ars: "150855051365", gen: "Wegeleben", land: "ST", tkz: [63],
    kreis: kreis("15085", "Harz", "Landkreis", "ja"),
    verband: { ars: "150855051", gen: "Vorharz", bez: "Verbandsgemeinde", name: "Verbandsgemeinde Vorharz" },
  },
  // Hessen: Einwohner laut GV-ISys 31.12.2025.
  frankfurt: {
    ars: "064120000000", gen: "Frankfurt am Main", land: "HE", tkz: [61], ew: 760656,
    kreis: kreis("06412", "Frankfurt am Main", "Kreisfreie Stadt", "ja", true),
  },
  hanau: {
    ars: "064350014014", gen: "Hanau", land: "HE", tkz: [63], ew: 98582,
    kreis: kreis("06435", "Main-Kinzig-Kreis", "Landkreis", "nein"),
  },
  badVilbel: {
    ars: "064400003003", gen: "Bad Vilbel", land: "HE", tkz: [63], ew: 35886,
    kreis: kreis("06440", "Wetteraukreis", "Landkreis", "nein"),
  },
  breitenbach: {
    ars: "066320004004", gen: "Breitenbach a.Herzberg", name: "Gemeinde Breitenbach a.Herzberg", land: "HE",
    tkz: [64], ew: 1651, kreis: kreis("06632", "Hersfeld-Rotenburg", "Landkreis", "ja"),
  },
  fernwald: {
    ars: "065310004004", gen: "Fernwald", name: "Gemeinde Fernwald", land: "HE", tkz: [64], ew: 7160,
    kreis: kreis("06531", "Gießen", "Landkreis", "ja"),
  },
  erzhausen: {
    ars: "064320006006", gen: "Erzhausen", name: "Gemeinde Erzhausen", land: "HE", tkz: [64], ew: 7732,
    kreis: kreis("06432", "Darmstadt-Dieburg", "Landkreis", "ja"),
  },
  // Saarland: Einwohner laut GV-ISys 31.12.2025.
  saarbruecken: {
    ars: "100410100100", gen: "Saarbrücken", land: "SL", tkz: [63], ew: 182859,
    kreis: kreis("10041", "Regionalverband Saarbrücken", "Landkreis", "nein"),
  },
  voelklingen: {
    ars: "100410519519", gen: "Völklingen", land: "SL", tkz: [63], ew: 40565,
    kreis: kreis("10041", "Regionalverband Saarbrücken", "Landkreis", "nein"),
  },
  saarlouis: {
    ars: "100440115115", gen: "Saarlouis", land: "SL", tkz: [63], ew: 37675,
    kreis: kreis("10044", "Saarlouis", "Landkreis", "ja"),
  },
  nohfelden: {
    ars: "100460114114", gen: "Nohfelden", name: "Gemeinde Nohfelden", land: "SL", tkz: [64], ew: 9874,
    kreis: kreis("10046", "St. Wendel", "Landkreis", "ja"),
  },
  kondominium: {
    ars: "079355003095", gen: "Deutsch-Luxemburgisches Hoheitsgebiet [Nittel]", land: "RP", tkz: [],
    kreis: kreis("07235", "Trier-Saarburg", "Landkreis", "ja"),
    kondominium: { nachbar: "072355003095" },
  },
};

// Seit Bremen und Hamburg hat jedes Land eine Regel. Den allgemeinen Rückfall prüfen die Tests deshalb
// mit Gemeinden unter einem erfundenen Länderkürzel ohne Regel – sonst dieselben Daten.
const ohneRegel = (g) => ({ ...g, land: "XX" });

test("Landesregeln: jedes Land hat eine", () => {
  assert.deepEqual(Object.keys(LANDESREGELN).sort(), Object.values(LAENDER).map((l) => l.lkz).sort());
  const ohne = resolveGemeinde(ohneRegel(G.bremen));
  assert.equal(ohne.zust.G.stelle, "k04011", "unter erfundenem Kürzel: Rückfall, keine Bremer Stelle");
  assert.equal(ohne.zust.G.quelle, TEXTE.quelle.phase1);
  assert.equal(resolveGemeinde(ohneRegel(G.hamburg)).zust.B.stelle, "k02000");
});

test("Phase 1: kreisfreie Stadt → die Stadt, vermutlich", () => {
  const { zust, stellen } = resolveGemeinde(ohneRegel(G.stuttgart));
  assert.equal(zust.G.stelle, "k08111");
  assert.equal(zust.G.sicherheit, SICHERHEIT.VERMUTLICH);
  assert.equal(zust.G.grund, TEXTE.grund.kreisfrei);
  assert.equal(stellen.k08111.name, "Stadt Stuttgart – Straßenverkehrsbehörde");
  assert.equal(stellen.k08111.art, "stadt");
});

test("Phase 1: kreisangehörige Gemeinde → Kreis, nur Ebene", () => {
  const { zust, stellen } = resolveGemeinde(ohneRegel(G.aichwald));
  assert.equal(zust.K.stelle, "k08116");
  assert.equal(zust.K.sicherheit, SICHERHEIT.NUR_EBENE);
  assert.equal(zust.K.alternative, null);
  assert.equal(stellen.k08116.name, "Landkreis Esslingen – Straßenverkehrsbehörde", "ohne Land: voller Name des Kreises");
  assert.equal(stellen.k08116.art, "kreis");
});

test("Phase 1: Große Kreisstadt (Tkz 67) als Alternative", () => {
  const { zust, stellen } = resolveGemeinde(ohneRegel(G.esslingen));
  assert.equal(zust.G.stelle, "k08116");
  assert.deepEqual(zust.G.alternative, { stelle: "g081160019019", bedingung: TEXTE.bedingung.gks });
  assert.equal(stellen.g081160019019.name, "Stadt Esslingen am Neckar – Straßenverkehrsbehörde");
});

test("Bremen: Amt für Straßen und Verkehr, belegt – die Polizei als Alternative (Baustellen, Veranstaltungen, Umzüge)", () => {
  const { zust, stellen } = resolveGemeinde(G.bremen);
  for (const k of BAU_KLASSEN) {
    assert.equal(zust[k].stelle, "hb-asv", k);
    assert.equal(zust[k].sicherheit, SICHERHEIT.BELEGT, k);
    assert.deepEqual(zust[k].alternative, { stelle: "hb-pol", bedingung: TEXTE.bedingung.hbPolizei }, k);
  }
  assert.equal(new Set(BAU_KLASSEN.map((k) => ergebnisId(zust[k]))).size, 1, "alle Klassen gleich");
  assert.equal(zust.G.grund, TEXTE.grund.bremen);
  assert.match(zust.G.quelle, /^§ 1 Abs\. 3 Nr\. 1 und Abs\. 4 .*19\.01\.2016 \(Brem\.GBl\. S\. 6\).*02\.09\.2025/);
  assert.equal(stellen["hb-asv"].name, "Amt für Straßen und Verkehr Bremen – Straßenverkehrsbehörde");
  assert.equal(stellen["hb-pol"].name, "Polizei Bremen – Straßenverkehrsbehörde");
  assert.deepEqual(Object.keys(stellen).sort(), ["hb-asv", "hb-pol"]);
  assert.match(TEXTE.bedingung.hbPolizei, /Überseehafengebiet Bremerhaven/, "dort ordnet das Amt auch das an");
});

test("Bremen: Bremerhaven – der Magistrat, belegt, ohne Alternative", () => {
  const { zust, stellen } = resolveGemeinde(G.bremerhaven);
  for (const k of BAU_KLASSEN) {
    assert.equal(zust[k].stelle, "hb-bhv", k);
    assert.equal(zust[k].sicherheit, SICHERHEIT.BELEGT, k);
    assert.equal(zust[k].alternative, null, k);
    assert.equal(zust[k].quelle, TEXTE.quelle.bremerhaven, k);
  }
  assert.equal(zust.G.grund, TEXTE.grund.bremerhaven);
  assert.equal(stellen["hb-bhv"].name, "Magistrat der Stadt Bremerhaven – Straßenverkehrsbehörde");
});

test("Hamburg: Polizeikommissariat, nur Ebene – die Verkehrsdirektion als Alternative", () => {
  const { zust, stellen } = resolveGemeinde(G.hamburg);
  for (const k of BAU_KLASSEN) {
    assert.equal(zust[k].stelle, "hh-pk", k);
    assert.equal(zust[k].sicherheit, SICHERHEIT.NUR_EBENE, k);
    assert.deepEqual(zust[k].alternative, { stelle: "hh-vd", bedingung: TEXTE.bedingung.hhZentral }, k);
  }
  assert.equal(zust.B.grund, TEXTE.grund.hamburg);
  assert.match(zust.B.quelle, /vom 05\.01\.1999 \(Amtl\. Anz\. S\. 345\).*nicht an der Primärquelle geprüft/);
  assert.equal(stellen["hh-pk"].name, "Polizei Hamburg, zuständiges Polizeikommissariat – Straßenverkehrsbehörde");
  assert.equal(stellen["hh-vd"].name, "Polizei Hamburg, Verkehrsdirektion – Straßenverkehrsbehörde");
  assert.equal(stellen["hh-vd"].art, "stadtstaat");
});

test("Phase 1: gemeindefreies Gebiet → Kreis", () => {
  const { zust } = resolveGemeinde(ohneRegel(G.muensingen));
  assert.equal(zust.G.stelle, "k08415");
  assert.equal(zust.G.grund, TEXTE.grund.gemeindefrei);
  assert.equal(zust.G.quelle, TEXTE.quelle.phase1);
});

test("Phase 1: alle Klassen gleich", () => {
  const { zust } = resolveGemeinde(ohneRegel(G.aichwald));
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
  const bestaetigt = resolveGemeinde({ ...ohneRegel(G.aichwald), bundesportal: "passt" }).zust;
  assert.equal(bestaetigt.G.stelle, "k08116");
  assert.equal(bestaetigt.G.sicherheit, SICHERHEIT.VERMUTLICH);
  assert.equal(bestaetigt.K.sicherheit, SICHERHEIT.VERMUTLICH);
  assert.equal(bestaetigt.G.grund, TEXTE.grund.bundesportal);
  assert.equal(bestaetigt.G.quelle, TEXTE.quelle.bundesportal);
  const gks = resolveGemeinde({ ...ohneRegel(G.esslingen), bundesportal: "passt" }).zust.G;
  assert.equal(gks.alternative.stelle, "g081160019019", "Alternative bleibt");
  const stvb = resolveGemeinde({ ...ohneRegel(G.aichwald), bundesportal: "stvb" });
  assert.equal(stvb.zust.G.sicherheit, SICHERHEIT.NUR_EBENE);
  assert.deepEqual(stvb.zust.G.alternative, { stelle: "g081160076076", bedingung: TEXTE.bedingung.portalStvb });
  assert.equal(stvb.stellen.g081160076076.name, "Aichwald – Straßenverkehrsbehörde", "ohne Stadtrecht kein „Stadt\"");
  assert.equal(resolveGemeinde({ ...G.kondominium, bundesportal: "passt" }).zust.G.sicherheit, SICHERHEIT.NUR_EBENE);
  const frei = resolveGemeinde({ ...ohneRegel(G.stuttgart), bundesportal: "passt" }).zust.G;
  assert.equal(frei.grund, TEXTE.grund.kreisfrei, "schon vermutlich: Regel bleibt maßgeblich");
  assert.equal(resolveGemeinde(ohneRegel(G.aichwald)).zust.G.sicherheit, SICHERHEIT.NUR_EBENE, "ohne Portal");
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

test("Thüringen: große kreisangehörige Städte und Eisenach für alle Straßen (belegt), über 30.000 Einwohner vermutlich", () => {
  const gotha = resolveGemeinde(G.gotha);
  for (const k of BAU_KLASSEN) assert.equal(gotha.zust[k].stelle, "g160670029029", k);
  assert.equal(gotha.zust.B.sicherheit, SICHERHEIT.BELEGT);
  assert.equal(gotha.zust.B.grund, TEXTE.grund.thStadt);
  assert.equal(gotha.zust.B.quelle, TEXTE.quelle.thGks);
  assert.equal(gotha.stellen.g160670029029.name, "Stadt Gotha – Straßenverkehrsbehörde");
  assert.equal(gotha.stellen.g160670029029.art, "stadt");
  // Altenburg liegt knapp über 30.000 – als große kreisangehörige Stadt zählt das nicht.
  const altenburg = resolveGemeinde({ ...G.altenburg, ew: 29000 }).zust.B;
  assert.equal(altenburg.stelle, "g160770001001");
  assert.equal(altenburg.sicherheit, SICHERHEIT.BELEGT);
  assert.deepEqual(Object.keys(TH_GROSSE_KREISANGEHOERIGE_STAEDTE).sort(),
    ["16062041", "16064046", "16067029", "16070029", "16077001"]);

  const eisenach = resolveGemeinde({ ...G.eisenach, ew: 29000 }).zust.B;
  assert.equal(eisenach.stelle, "g160630105105", "Eisenach auch darunter");
  assert.equal(eisenach.sicherheit, SICHERHEIT.BELEGT);
  assert.equal(eisenach.grund, TEXTE.grund.thEisenach);
  assert.equal(eisenach.quelle, TEXTE.quelle.thEisenach);

  // Über 30.000 Einwohner ohne Status (heute keine solche Stadt): alle Straßen, nur vermutlich.
  const gross = resolveGemeinde({ ...G.arnstadt, ew: 31000 }).zust.B;
  assert.equal(gross.stelle, "g160700004004");
  assert.equal(gross.sicherheit, SICHERHEIT.VERMUTLICH);
  assert.equal(gross.grund, TEXTE.grund.thStadt);
  assert.equal(gross.quelle, TEXTE.quelle.thStadt);

  const weimar = resolveGemeinde(G.weimar).zust.G;
  assert.equal(weimar.stelle, "k16055");
  assert.equal(weimar.sicherheit, SICHERHEIT.VERMUTLICH);
});

test("Thüringen: die 20 Städte der Verordnung für alle Straßen außer Bundesstraßen (belegt)", () => {
  assert.equal(Object.keys(TH_STAEDTE_AUF_ANTRAG).length, 20);
  assert.ok(Object.keys(TH_STAEDTE_AUF_ANTRAG).every((ags) => /^16\d{6}$/.test(ags)), "AGS, nicht ARS");
  const apolda = resolveGemeinde(G.apolda).zust; // ohne Portal-Urteil: die Liste genügt
  for (const k of ["G", "K", "L"]) {
    assert.equal(apolda[k].stelle, "g160710001001", k);
    assert.equal(apolda[k].sicherheit, SICHERHEIT.BELEGT, k);
    assert.equal(apolda[k].alternative, null, k);
  }
  assert.equal(apolda.G.grund, TEXTE.grund.thAntrag);
  assert.equal(apolda.G.quelle, TEXTE.quelle.thAntrag);
  assert.equal(apolda.B.stelle, "k16071");
  assert.equal(apolda.B.sicherheit, SICHERHEIT.VERMUTLICH, "der Landkreis hängt an der Zuständigkeitsverordnung");
  assert.equal(apolda.B.grund, TEXTE.grund.thBundesstrasse);
  assert.deepEqual(resolveGemeinde({ ...G.apolda, bundesportal: "stvb" }).zust, apolda, "das Portal ändert nichts");

  const arnstadt = resolveGemeinde(G.arnstadt).zust;
  assert.equal(arnstadt.G.stelle, "g160700004004");
  assert.equal(arnstadt.B.stelle, "k16070");
  // Erfüllende Gemeinde: Verband im ARS, die Liste greift über den AGS.
  const eisenberg = resolveGemeinde(G.eisenberg);
  assert.equal(eisenberg.zust.L.stelle, "g160745052018");
  assert.equal(eisenberg.zust.L.sicherheit, SICHERHEIT.BELEGT);
  assert.equal(eisenberg.stellen.g160745052018.name, "Stadt Eisenberg – Straßenverkehrsbehörde");
  assert.equal(resolveGemeinde(G.leinefeldeWorbis).zust.K.stelle, "g160610115115", "seit 01.01.2023");
});

test("Thüringen: sonst der Landkreis; nennt das Portal die Gemeinde, steht sie als Alternative da", () => {
  const greiz = resolveGemeinde(G.greiz).zust; // 10.000–30.000 Einwohner, aber nicht in der Verordnung
  for (const k of BAU_KLASSEN) {
    assert.equal(greiz[k].stelle, "k16076", k);
    assert.equal(greiz[k].sicherheit, SICHERHEIT.VERMUTLICH, k);
    assert.equal(greiz[k].alternative, null, k);
  }
  assert.equal(greiz.G.grund, TEXTE.grund.thLandkreis);
  assert.equal(greiz.G.quelle, TEXTE.quelle.thLandkreis);
  const bestaetigt = resolveGemeinde({ ...G.greiz, bundesportal: "passt" }).zust.G;
  assert.equal(bestaetigt.grund, TEXTE.grund.thLandkreisPortal);
  assert.equal(bestaetigt.sicherheit, SICHERHEIT.VERMUTLICH);
  const widerspruch = resolveGemeinde({ ...G.greiz, bundesportal: "stvb" }).zust;
  assert.equal(widerspruch.B.stelle, "k16076");
  assert.deepEqual(widerspruch.B.alternative, { stelle: "g160760022022", bedingung: TEXTE.bedingung.portalStvb });

  const dorf = resolveGemeinde(G.grammetal).zust.G;
  assert.equal(dorf.stelle, "k16071");
  assert.equal(dorf.sicherheit, SICHERHEIT.VERMUTLICH);
  assert.equal(dorf.alternative, null);
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

test("Nordrhein-Westfalen: kreisfreie Städte selbst (belegt), Aachen selbst (vermutlich), sonst der Kreis", () => {
  const koeln = resolveGemeinde(G.koeln).zust;
  for (const k of BAU_KLASSEN) assert.equal(koeln[k].stelle, "k05315", k);
  assert.equal(koeln.B.sicherheit, SICHERHEIT.BELEGT);
  assert.equal(koeln.B.grund, TEXTE.grund.kreisfrei);
  assert.equal(koeln.B.quelle, TEXTE.quelle.nwKreis);

  const aachen = resolveGemeinde(G.aachen);
  for (const k of BAU_KLASSEN) assert.equal(aachen.zust[k].stelle, "g053340002002", k);
  assert.equal(aachen.zust.B.sicherheit, SICHERHEIT.VERMUTLICH, "Anlage 2 Nr. 25 Aachen-Gesetz nicht geklärt");
  assert.equal(aachen.zust.B.alternative, null);
  assert.equal(aachen.zust.B.grund, TEXTE.grund.nwAachen);
  assert.equal(aachen.zust.B.quelle, TEXTE.quelle.nwAachen);
  assert.deepEqual(aachen.stellen.g053340002002, {
    id: "g053340002002", name: "Stadt Aachen – Straßenverkehrsbehörde", ebene: "untere", art: "stadt",
  });

  const simmerath = resolveGemeinde(G.simmerath);
  for (const k of BAU_KLASSEN) {
    assert.equal(simmerath.zust[k].stelle, "k05334", k);
    assert.equal(simmerath.zust[k].alternative, null);
  }
  assert.equal(simmerath.zust.G.sicherheit, SICHERHEIT.BELEGT);
  assert.equal(simmerath.zust.G.grund, TEXTE.grund.nwKreis);
  assert.equal(simmerath.zust.G.quelle, TEXTE.quelle.nwKreis);
  assert.equal(simmerath.stellen.k05334.name, "Städteregion Aachen – Straßenverkehrsbehörde");
  assert.equal(simmerath.stellen.k05334.art, "kreis");
});

test("Nordrhein-Westfalen: Große und Mittlere kreisangehörige Städte für alle Straßen (belegt)", () => {
  const neuss = resolveGemeinde(G.neuss);
  for (const k of BAU_KLASSEN) assert.equal(neuss.zust[k].stelle, "g051620024024", k);
  assert.equal(neuss.zust.B.sicherheit, SICHERHEIT.BELEGT);
  assert.equal(neuss.zust.B.grund, TEXTE.grund.nwGrosse);
  assert.equal(neuss.zust.B.quelle, TEXTE.quelle.nwGrosse);
  assert.equal(neuss.zust.B.alternative, null);
  assert.deepEqual(neuss.stellen.g051620024024, {
    id: "g051620024024", name: "Stadt Neuss – Straßenverkehrsbehörde", ebene: "oertliche", art: "stadt",
  });

  const stolberg = resolveGemeinde(G.stolberg).zust;
  for (const k of BAU_KLASSEN) assert.equal(stolberg[k].stelle, "g053340032032", `${k}: in der Städteregion`);
  assert.equal(stolberg.L.grund, TEXTE.grund.nwMittlere);
  assert.equal(stolberg.L.quelle, TEXTE.quelle.nwMittlere);
  assert.equal(resolveGemeinde(G.salzkotten).zust.K.stelle, "g057740036036", "seit 01.01.2025 Mittlere kreisangehörige Stadt");
  assert.equal(resolveGemeinde(G.monheim).zust.G.stelle, "g051580026026", "in der Verordnung „Monheim“");
  const borken = resolveGemeinde(G.borken).zust.G;
  assert.equal(borken.stelle, "g055540012012", "die Stadt, nicht der gleichnamige Kreis");
  // Es zählt die Liste der Verordnung nach § 4 GO NRW, nicht die Einwohnerzahl.
  assert.equal(resolveGemeinde({ ...G.altena, ew: 16000 }).zust.G.stelle, "g059620004004");
  assert.equal(resolveGemeinde({ ...G.luedinghausen, ew: 26000 }).zust.G.stelle, "k05558");
});

test("Nordrhein-Westfalen: übrige Gemeinden beim Kreis; die Landesregel geht dem Portal vor", () => {
  const heiden = resolveGemeinde(G.heiden);
  for (const k of BAU_KLASSEN) {
    assert.equal(heiden.zust[k].stelle, "k05554", k);
    assert.equal(heiden.zust[k].sicherheit, SICHERHEIT.BELEGT);
    assert.equal(heiden.zust[k].alternative, null);
  }
  assert.equal(heiden.stellen.k05554.name, "Kreis Borken – Straßenverkehrsbehörde");
  assert.deepEqual(resolveGemeinde({ ...G.heiden, bundesportal: "stvb" }).zust, heiden.zust);
  assert.deepEqual(resolveGemeinde({ ...G.heiden, bundesportal: "passt" }).zust, heiden.zust);
});

test("Nordrhein-Westfalen: Listen nach § 4 GO NRW – 35 Große, 132 Mittlere, gültige Schlüssel", () => {
  const grosse = Object.keys(NW_GROSSE_KREISANGEHOERIGE_STAEDTE);
  const mittlere = Object.keys(NW_MITTLERE_KREISANGEHOERIGE_STAEDTE);
  assert.equal(grosse.length, 35);
  assert.equal(mittlere.length, 132);
  for (const ars of [...grosse, ...mittlere]) {
    // NRW kennt keine Gemeindeverbände: Kreis + „0" + Gemeinde + Gemeinde; kreisfreie Städte fehlen.
    assert.match(ars, /^05\d{3}0(?!000)(\d{3})\1$/, ars);
  }
  assert.equal(new Set([...grosse, ...mittlere]).size, 167, "keine Stadt in beiden Listen");
  assert.ok(!NW_GROSSE_KREISANGEHOERIGE_STAEDTE[G.aachen.ars] && !NW_MITTLERE_KREISANGEHOERIGE_STAEDTE[G.aachen.ars]);
});

test("Brandenburg: Landkreis bzw. kreisfreie Stadt; Große kreisangehörige Städte selbst (belegt)", () => {
  const potsdam = resolveGemeinde(G.potsdam).zust;
  for (const k of BAU_KLASSEN) assert.equal(potsdam[k].stelle, "k12054", k);
  assert.equal(potsdam.G.sicherheit, SICHERHEIT.BELEGT);
  assert.equal(potsdam.G.quelle, TEXTE.quelle.bbKreis);

  const eberswalde = resolveGemeinde(G.eberswalde);
  for (const k of BAU_KLASSEN) assert.equal(eberswalde.zust[k].stelle, "g120600052052", k);
  assert.equal(eberswalde.zust.B.grund, TEXTE.grund.bbGks);
  assert.equal(eberswalde.zust.B.quelle, TEXTE.quelle.bbGks);
  assert.equal(eberswalde.zust.B.sicherheit, SICHERHEIT.BELEGT);
  assert.deepEqual(eberswalde.stellen.g120600052052, {
    id: "g120600052052", name: "Stadt Eberswalde – Straßenverkehrsbehörde", ebene: "untere", art: "stadt",
  });

  // Schwedt/Oder verwaltet Pinnow mit: Die Stadt ist selbst zuständig, Pinnow bleibt beim Landkreis.
  const schwedt = resolveGemeinde(G.schwedt).zust;
  for (const k of BAU_KLASSEN) assert.equal(schwedt[k].stelle, "g120735051532", k);
  const pinnow = resolveGemeinde(G.pinnow).zust;
  for (const k of BAU_KLASSEN) {
    assert.equal(pinnow[k].stelle, "k12073", k);
    assert.equal(pinnow[k].alternative, null);
  }
  assert.equal(pinnow.G.grund, TEXTE.grund.bbKreis);

  const bernau = resolveGemeinde(G.bernau);
  assert.equal(bernau.zust.G.stelle, "k12060", "Große kreisangehörige Stadt, aber nicht in der StGÜZV");
  assert.equal(bernau.zust.G.sicherheit, SICHERHEIT.BELEGT);
  assert.equal(bernau.zust.G.alternative, null);
  assert.equal(bernau.stellen.k12060.name, "Landkreis Barnim – Straßenverkehrsbehörde");
});

test("Brandenburg: Städte auf Antrag für alle Straßen (§ 4a Abs. 1)", () => {
  const teltow = resolveGemeinde(G.teltow).zust;
  for (const k of BAU_KLASSEN) assert.equal(teltow[k].stelle, "g120690616616", k);
  assert.equal(teltow.B.grund, TEXTE.grund.bbAntrag);
  assert.equal(teltow.B.quelle, TEXTE.quelle.bbAntrag);
  assert.equal(teltow.B.sicherheit, SICHERHEIT.BELEGT);
  assert.equal(teltow.B.alternative, null);
});

test("Brandenburg: auf Antrag nur Halten und Parken, Baustellen, Veranstaltungen (§ 4a Abs. 2) – als Alternative", () => {
  const kyritz = resolveGemeinde(G.kyritz);
  for (const k of BAU_KLASSEN) {
    assert.equal(kyritz.zust[k].stelle, "k12068", k);
    assert.equal(kyritz.zust[k].sicherheit, SICHERHEIT.BELEGT);
    assert.equal(kyritz.zust[k].grund, TEXTE.grund.bbTeil);
    assert.equal(kyritz.zust[k].quelle, TEXTE.quelle.bbTeil);
    assert.equal(kyritz.zust[k].alternative.stelle, "g120680264264", k);
  }
  assert.equal(kyritz.zust.K.alternative.bedingung, TEXTE.bedingung.bbTeil);
  assert.equal(kyritz.zust.G.alternative.bedingung, TEXTE.bedingung.bbTeilG, "Schutz der Gemeindestraße nur bei G");
  assert.deepEqual(kyritz.stellen.g120680264264, {
    id: "g120680264264", name: "Stadt Kyritz – Straßenverkehrsbehörde", ebene: "untere", art: "stadt",
  });
  const kleinmachnow = resolveGemeinde(G.kleinmachnow);
  assert.equal(kleinmachnow.zust.L.stelle, "k12069");
  assert.equal(kleinmachnow.zust.L.alternative.stelle, "g120690304304");
  assert.equal(kleinmachnow.stellen.g120690304304.name, "Gemeinde Kleinmachnow – Straßenverkehrsbehörde");
  assert.equal(kleinmachnow.stellen.g120690304304.art, "gemeinde");

  // Amt Schlieben: Alternative ist das Amt – auch für die Stadt Schlieben selbst.
  for (const g of [G.lebusa, G.schlieben]) {
    const { zust, stellen } = resolveGemeinde(g);
    assert.equal(zust.K.stelle, "k12062", g.gen);
    assert.deepEqual(zust.K.alternative, { stelle: "v120625209", bedingung: TEXTE.bedingung.bbTeil }, g.gen);
    assert.deepEqual(stellen.v120625209, {
      id: "v120625209", name: "Amt Schlieben – Straßenverkehrsbehörde", ebene: "untere", art: "verband",
    });
  }
});

test("Brandenburg: die 13 Kommunen der StGÜZV", () => {
  assert.deepEqual(Object.values(BB_GROSSE_KREISANGEHOERIGE_STAEDTE), ["Eberswalde", "Eisenhüttenstadt", "Schwedt"]);
  assert.equal(Object.keys(BB_AUF_ANTRAG).length, 4);
  assert.equal(Object.keys(BB_AUF_ANTRAG_TEILWEISE).length, 6);
  const alle = [BB_GROSSE_KREISANGEHOERIGE_STAEDTE, BB_AUF_ANTRAG, BB_AUF_ANTRAG_TEILWEISE].flatMap(Object.keys);
  assert.equal(new Set(alle).size, 13);
  for (const ars of alle) assert.match(ars, /^120\d{2}(\d{4}(\d{3})?)$/, ars);
  assert.deepEqual(alle.filter((a) => a.length === 9), ["120625209"], "nur das Amt Schlieben als Verband");
});

test("Mecklenburg-Vorpommern: kreisfreie und große kreisangehörige Städte selbst (belegt)", () => {
  const rostock = resolveGemeinde(G.rostock).zust;
  for (const k of BAU_KLASSEN) assert.equal(rostock[k].stelle, "k13003", k);
  assert.equal(rostock.B.sicherheit, SICHERHEIT.BELEGT);
  assert.equal(rostock.B.quelle, TEXTE.quelle.mvKreis);

  const greifswald = resolveGemeinde(G.greifswald);
  for (const k of BAU_KLASSEN) assert.equal(greifswald.zust[k].stelle, "g130750039039", k);
  assert.equal(greifswald.zust.B.sicherheit, SICHERHEIT.BELEGT);
  assert.equal(greifswald.zust.B.grund, TEXTE.grund.mvGks);
  assert.equal(greifswald.zust.B.quelle, TEXTE.quelle.mvGks);
  assert.deepEqual(greifswald.stellen.g130750039039, {
    id: "g130750039039", name: "Stadt Greifswald – Straßenverkehrsbehörde", ebene: "untere", art: "stadt",
  });
  assert.equal(resolveGemeinde({ ...G.greifswald, ew: 1000 }).zust.G.stelle, "g130750039039", "Status, nicht Einwohner");
});

test("Mecklenburg-Vorpommern: Städte über 20.000 Einwohner ordnen selbst an, knapp darüber vermutlich", () => {
  const guestrow = resolveGemeinde({ ...G.guestrow, ew: 28500 });
  for (const k of BAU_KLASSEN) assert.equal(guestrow.zust[k].stelle, "g130720043043", k);
  assert.equal(guestrow.zust.B.sicherheit, SICHERHEIT.BELEGT);
  assert.equal(guestrow.zust.B.grund, TEXTE.grund.mvStadt);
  assert.equal(guestrow.zust.B.quelle, TEXTE.quelle.mvStadt);
  assert.equal(guestrow.zust.B.alternative, null);
  assert.deepEqual(guestrow.stellen.g130720043043, {
    id: "g130720043043", name: "Stadt Güstrow – Straßenverkehrsbehörde", ebene: "oertliche", art: "stadt",
  });
  const knapp = resolveGemeinde({ ...G.ribnitz, ew: 20500 }).zust.K;
  assert.equal(knapp.stelle, "g130735361075", "Stadt in einem Amt – zählt trotzdem");
  assert.equal(knapp.sicherheit, SICHERHEIT.VERMUTLICH);
  assert.equal(knapp.grund, TEXTE.grund.mvStadtKnapp);
});

test("Mecklenburg-Vorpommern: Übergangsregel – Liste belegt, andere Städte mit 17.000 bis 20.000 je nach Portal", () => {
  const parchim = resolveGemeinde({ ...G.parchim, ew: 16900 }).zust;
  for (const k of BAU_KLASSEN) assert.equal(parchim[k].stelle, "g130760108108", `${k}: Stichtag 2021, nicht heute`);
  assert.equal(parchim.G.sicherheit, SICHERHEIT.BELEGT);
  assert.equal(parchim.G.grund, TEXTE.grund.mvBestand);
  assert.equal(parchim.G.quelle, TEXTE.quelle.mvBestand);
  const waren = resolveGemeinde({ ...G.waren, ew: 19500 }).zust.B;
  assert.equal(waren.stelle, "g130710156156", "Waren fällt unter 20.000 – bleibt nach Satz 2 zuständig");
  assert.equal(waren.sicherheit, SICHERHEIT.BELEGT);
  assert.deepEqual(Object.values(MV_STAEDTE_UEBERGANG).map((t) => t.split(" – ")[0]), ["Neustrelitz", "Waren (Müritz)", "Parchim"]);

  const ohnePortal = resolveGemeinde({ ...G.ribnitz, ew: 18500 }).zust;
  for (const k of BAU_KLASSEN) {
    assert.equal(ohnePortal[k].stelle, "k13073", k);
    assert.deepEqual(ohnePortal[k].alternative, { stelle: "g130735361075", bedingung: TEXTE.bedingung.mvBestandMoeglich });
  }
  assert.equal(ohnePortal.G.sicherheit, SICHERHEIT.VERMUTLICH);
  assert.equal(ohnePortal.G.grund, TEXTE.grund.mvKreisBestand);
  const mitPortal = resolveGemeinde({ ...G.ribnitz, ew: 18500, bundesportal: "stvb" }).zust.L;
  assert.equal(mitPortal.stelle, "g130735361075");
  assert.equal(mitPortal.sicherheit, SICHERHEIT.VERMUTLICH);
  assert.equal(mitPortal.grund, TEXTE.grund.mvBestand);
  assert.equal(mitPortal.quelle, TEXTE.quelle.mvBestandPortal);
});

test("Mecklenburg-Vorpommern: sonst der Landkreis (belegt)", () => {
  const ribnitz = resolveGemeinde({ ...G.ribnitz, ew: 15200 });
  for (const k of BAU_KLASSEN) {
    assert.equal(ribnitz.zust[k].stelle, "k13073", k);
    assert.equal(ribnitz.zust[k].sicherheit, SICHERHEIT.BELEGT);
    assert.equal(ribnitz.zust[k].alternative, null);
  }
  assert.equal(ribnitz.zust.G.grund, TEXTE.grund.mvKreis);
  assert.equal(ribnitz.stellen.k13073.name, "Landkreis Vorpommern-Rügen – Straßenverkehrsbehörde");
  const gemeinde = resolveGemeinde({ ...G.ribnitz, tkz: [64], ew: 25000, bundesportal: "stvb" }).zust.G;
  assert.equal(gemeinde.stelle, "k13073", "§ 4 Abs. 2 gilt nur für Städte");
  assert.deepEqual(Object.values(MV_GROSSE_KREISANGEHOERIGE_STAEDTE), ["Neubrandenburg", "Stralsund", "Wismar", "Greifswald"]);
});

test("Rheinland-Pfalz: Gemeindestraßen bei der Verbandsgemeinde, sonst innerorts – außerorts die Kreisverwaltung", () => {
  const { zust, stellen } = resolveGemeinde(G.bodenheim);
  assert.equal(zust.G.stelle, "v073395002");
  assert.equal(zust.G.alternative, null, "Gemeindestraßen auch außerorts");
  assert.equal(zust.G.sicherheit, SICHERHEIT.VERMUTLICH, "Wortlaut nur aus der Sekundärquelle");
  assert.equal(zust.G.grund, TEXTE.grund.rpOrt);
  assert.equal(zust.G.quelle, TEXTE.quelle.rpOrt);
  for (const k of ["K", "L", "B"]) {
    assert.equal(zust[k].stelle, "v073395002", k);
    assert.deepEqual(zust[k].alternative, { stelle: "k07339", bedingung: TEXTE.bedingung.rpAusserorts }, k);
  }
  assert.deepEqual(stellen.v073395002, {
    id: "v073395002", name: "Verbandsgemeinde Bodenheim – Straßenverkehrsbehörde", ebene: "oertliche", art: "verband",
  });
  assert.equal(stellen.k07339.name, "Kreisverwaltung Mainz-Bingen – Straßenverkehrsbehörde");

  const hassloch = resolveGemeinde(G.hassloch);
  assert.equal(hassloch.zust.G.stelle, "g073320025025");
  assert.equal(hassloch.zust.L.alternative.stelle, "k07332");
  assert.deepEqual(hassloch.stellen.g073320025025, {
    id: "g073320025025", name: "Gemeinde Haßloch – Straßenverkehrsbehörde", ebene: "oertliche", art: "gemeinde",
  });
  assert.equal(resolveGemeinde(G.bendorf).stellen.g071370203203.name, "Stadt Bendorf – Straßenverkehrsbehörde");
});

test("Rheinland-Pfalz: kreisfreie und große kreisangehörige Städte für alle Straßen", () => {
  const mainz = resolveGemeinde(G.mainz).zust;
  for (const k of BAU_KLASSEN) assert.equal(mainz[k].stelle, "k07315", k);
  assert.equal(mainz.B.quelle, TEXTE.quelle.rpKreis);
  const neuwied = resolveGemeinde(G.neuwied);
  for (const k of BAU_KLASSEN) {
    assert.equal(neuwied.zust[k].stelle, "g071380045045", k);
    assert.equal(neuwied.zust[k].alternative, null, k);
  }
  assert.equal(neuwied.zust.B.grund, TEXTE.grund.rpGks);
  assert.equal(neuwied.zust.B.sicherheit, SICHERHEIT.VERMUTLICH);
  assert.deepEqual(neuwied.stellen.g071380045045, {
    id: "g071380045045", name: "Stadt Neuwied – Straßenverkehrsbehörde", ebene: "untere", art: "stadt",
  });
  assert.equal(Object.keys(RP_GROSSE_KREISANGEHOERIGE_STAEDTE).length, 8);
  for (const ars of Object.keys(RP_GROSSE_KREISANGEHOERIGE_STAEDTE)) assert.match(ars, /^07\d{3}0(\d{3})\1$/, ars);
  for (const ars of Object.keys(RP_ANLAGE_1)) assert.match(ars, /^07\d{7}(\d{3})?$/, ars);
  assert.deepEqual(RP_ANLAGE_1, {}, "Anlage 1 ist seit 2010 ohne Eintrag");
});

test("Sachsen: Kreisfreie Städte und Große Kreisstädte für alle Straßen (belegt)", () => {
  const dresden = resolveGemeinde(G.dresden).zust;
  for (const k of BAU_KLASSEN) assert.equal(dresden[k].stelle, "k14612", k);
  assert.equal(dresden.G.sicherheit, SICHERHEIT.BELEGT);
  assert.equal(dresden.G.quelle, TEXTE.quelle.snUnter);
  const plauen = resolveGemeinde(G.plauen);
  for (const k of BAU_KLASSEN) {
    assert.equal(plauen.zust[k].stelle, "g145230320320", k);
    assert.equal(plauen.zust[k].sicherheit, SICHERHEIT.BELEGT, k);
    assert.equal(plauen.zust[k].alternative, null, k);
  }
  assert.equal(plauen.zust.B.grund, TEXTE.grund.snGks);
  assert.deepEqual(plauen.stellen.g145230320320, {
    id: "g145230320320", name: "Stadt Plauen – Straßenverkehrsbehörde", ebene: "untere", art: "stadt",
  });
  const zschopau = resolveGemeinde(G.zschopau).zust;
  for (const k of BAU_KLASSEN) assert.equal(zschopau[k].stelle, "g145215138690", `${k}: Schlüssel ist der AGS`);
  // Liste: 53 Große Kreisstädte, je Landkreis wie beim Staatsministerium des Innern (01.01.2026).
  const je = {};
  for (const ags of Object.keys(SN_GROSSE_KREISSTAEDTE)) {
    assert.match(ags, /^14\d{6}$/, ags);
    je[ags.slice(0, 5)] = (je[ags.slice(0, 5)] ?? 0) + 1;
  }
  assert.deepEqual(je, {
    14521: 6, 14522: 7, 14523: 5, 14524: 6, 14625: 5, 14626: 5, 14627: 5, 14628: 4, 14729: 5, 14730: 5,
  });
});

test("Sachsen: Große Kreisstadt als erfüllende Gemeinde – zuständig für die ganze Verwaltungsgemeinschaft", () => {
  const { zust, stellen } = resolveGemeinde(G.gornau);
  for (const k of BAU_KLASSEN) {
    assert.equal(zust[k].stelle, "v145215138", k);
    assert.equal(zust[k].sicherheit, SICHERHEIT.BELEGT, k);
    assert.equal(zust[k].grund, TEXTE.grund.snGksVg, k);
    assert.equal(zust[k].quelle, TEXTE.quelle.snGksVg, k);
  }
  assert.deepEqual(stellen.v145215138, {
    id: "v145215138", name: "Verwaltungsgemeinschaft Zschopau – Straßenverkehrsbehörde", ebene: "untere", art: "verband",
  });
  // Nur in der Verwaltungsgemeinschaft (§ 3 Abs. 2 Satz 3 SächsGemO), nicht im Verwaltungsverband.
  const vv = resolveGemeinde({ ...G.bergen, verband: { ...G.bergen.verband, sitz: "145230320320" } }).zust;
  assert.equal(vv.K.stelle, "k14523");
  assert.equal(vv.G.stelle, "v145235402");
});

test("Sachsen: Gemeindestraßen bei der Gemeinde bzw. ihrem Verband, sonst das Landratsamt (belegt)", () => {
  const amtsberg = resolveGemeinde(G.amtsberg);
  assert.equal(amtsberg.zust.G.stelle, "g145210010010");
  assert.equal(amtsberg.zust.G.grund, TEXTE.grund.snGemeinde);
  assert.equal(amtsberg.zust.G.quelle, TEXTE.quelle.snOertlich);
  assert.equal(amtsberg.zust.G.sicherheit, SICHERHEIT.BELEGT);
  assert.deepEqual(amtsberg.stellen.g145210010010, {
    id: "g145210010010", name: "Gemeinde Amtsberg – Straßenverkehrsbehörde", ebene: "oertliche", art: "gemeinde",
  });
  for (const k of ["K", "L", "B"]) {
    assert.equal(amtsberg.zust[k].stelle, "k14521", k);
    assert.equal(amtsberg.zust[k].grund, TEXTE.grund.snLandratsamt, k);
    assert.equal(amtsberg.zust[k].sicherheit, SICHERHEIT.BELEGT, k);
    assert.equal(amtsberg.zust[k].alternative, null, k);
  }
  assert.equal(amtsberg.stellen.k14521.name, "Landratsamt Erzgebirgskreis – Straßenverkehrsbehörde");
  const rodewisch = resolveGemeinde(G.rodewisch);
  assert.equal(rodewisch.stellen.g145230360360.name, "Stadt Rodewisch – Straßenverkehrsbehörde");
  assert.equal(rodewisch.zust.B.stelle, "k14523", "Stadt, aber keine Große Kreisstadt");

  for (const g of [G.neuensalz, G.treuen]) {
    const { zust, stellen } = resolveGemeinde(g);
    assert.equal(zust.G.stelle, "v145235134", g.gen);
    assert.equal(zust.G.grund, TEXTE.grund.snVerwaltungsgemeinschaft, g.gen);
    assert.equal(zust.G.quelle, TEXTE.quelle.snOertlichVerband, g.gen);
    assert.equal(stellen.v145235134.ebene, "oertliche", g.gen);
    assert.equal(zust.K.stelle, "k14523", `${g.gen}: Treuen ist keine Große Kreisstadt`);
  }
  const bergen = resolveGemeinde(G.bergen);
  assert.equal(bergen.zust.G.stelle, "v145235402");
  assert.equal(bergen.zust.G.grund, TEXTE.grund.snVerwaltungsverband);
  assert.equal(bergen.stellen.v145235402.name, "Verwaltungsverband Jägerswald – Straßenverkehrsbehörde");
  assert.equal(bergen.zust.L.stelle, "k14523");
});

test("Sachsen-Anhalt: Landkreis bzw. kreisfreie Stadt; Gemeindestraßen innerorts bei Gemeinde oder Verbandsgemeinde (vermutlich)", () => {
  const magdeburg = resolveGemeinde(G.magdeburg).zust;
  for (const k of BAU_KLASSEN) {
    assert.equal(magdeburg[k].stelle, "k15003", k);
    assert.equal(magdeburg[k].sicherheit, SICHERHEIT.VERMUTLICH, k);
  }
  assert.equal(magdeburg.G.quelle, TEXTE.quelle.stUnter);
  const halberstadt = resolveGemeinde(G.halberstadt);
  assert.equal(halberstadt.zust.G.stelle, "g150850135135");
  assert.equal(halberstadt.zust.G.grund, TEXTE.grund.stGemeinde);
  assert.equal(halberstadt.zust.G.quelle, TEXTE.quelle.stOertlich);
  assert.equal(halberstadt.zust.G.sicherheit, SICHERHEIT.VERMUTLICH, "Wortlaut nicht an der Primärquelle gelesen");
  assert.deepEqual(halberstadt.zust.G.alternative, { stelle: "k15085", bedingung: TEXTE.bedingung.stAusserorts });
  assert.deepEqual(halberstadt.stellen.g150850135135, {
    id: "g150850135135", name: "Stadt Halberstadt – Straßenverkehrsbehörde", ebene: "oertliche", art: "stadt",
  });
  for (const k of ["K", "L", "B"]) {
    assert.equal(halberstadt.zust[k].stelle, "k15085", k);
    assert.equal(halberstadt.zust[k].grund, TEXTE.grund.stLandkreis, k);
    assert.equal(halberstadt.zust[k].alternative, null, k);
  }
  assert.equal(halberstadt.stellen.k15085.name, "Landkreis Harz – Straßenverkehrsbehörde");
  for (const g of [G.ditfurt, G.wegeleben]) {
    const { zust, stellen } = resolveGemeinde(g);
    assert.equal(zust.G.stelle, "v150855051", g.gen);
    assert.equal(zust.G.grund, TEXTE.grund.stVerbandsgemeinde, g.gen);
    assert.equal(zust.G.quelle, TEXTE.quelle.stOertlichVerband, g.gen);
    assert.deepEqual(zust.G.alternative, { stelle: "k15085", bedingung: TEXTE.bedingung.stAusserorts }, g.gen);
    assert.deepEqual(stellen.v150855051, {
      id: "v150855051", name: "Verbandsgemeinde Vorharz – Straßenverkehrsbehörde", ebene: "oertliche", art: "verband",
    });
    assert.equal(zust.K.stelle, "k15085", g.gen);
    assert.equal(zust.K.alternative, null, g.gen);
  }
});

test("Hessen: kreisfreie Städte und Sonderstatus-Städte für alle Straßen, gemeindefreie Gebiete beim Landkreis", () => {
  const frankfurt = resolveGemeinde(G.frankfurt).zust;
  for (const k of BAU_KLASSEN) {
    assert.equal(frankfurt[k].stelle, "k06412", k);
    assert.equal(frankfurt[k].sicherheit, SICHERHEIT.BELEGT, k);
    assert.equal(frankfurt[k].alternative, null, k);
  }
  assert.equal(frankfurt.B.grund, TEXTE.grund.heKreisfrei);
  assert.equal(frankfurt.B.quelle, TEXTE.quelle.heStadt);
  assert.equal(Object.keys(HE_SONDERSTATUS).length, 7);
  const hanau = resolveGemeinde(G.hanau);
  for (const k of BAU_KLASSEN) {
    assert.equal(hanau.zust[k].stelle, "g064350014014", k);
    assert.equal(hanau.zust[k].sicherheit, SICHERHEIT.BELEGT, k);
    assert.equal(hanau.zust[k].alternative, null, `${k}: auch Kreisstraßen außerorts`);
  }
  assert.equal(hanau.zust.B.grund, TEXTE.grund.heSonderstatus);
  assert.deepEqual(hanau.stellen.g064350014014, {
    id: "g064350014014", name: "Stadt Hanau – Straßenverkehrsbehörde", ebene: "untere", art: "stadt",
  });
  const wald = resolveGemeinde(G.reinhardswald);
  for (const k of BAU_KLASSEN) assert.equal(wald.zust[k].stelle, "k06633", k);
  assert.equal(wald.zust.G.grund, TEXTE.grund.gemeindefrei);
  assert.equal(wald.zust.G.sicherheit, SICHERHEIT.VERMUTLICH);
  assert.equal(wald.stellen.k06633.name, "Landkreis Kassel – Straßenverkehrsbehörde");
});

test("Hessen: Gemeinde- und Kreisstraßen bei der Gemeinde, auch außerorts; Bundesstraßen beim Landkreis", () => {
  const { zust, stellen } = resolveGemeinde(G.breitenbach);
  assert.equal(zust.G.stelle, "g066320004004");
  assert.equal(zust.G.grund, TEXTE.grund.heGemeindestrasse);
  assert.equal(zust.G.quelle, TEXTE.quelle.heGemeinde);
  assert.equal(zust.G.sicherheit, SICHERHEIT.BELEGT);
  assert.equal(zust.G.alternative, null);
  assert.equal(zust.K.stelle, "g066320004004");
  assert.equal(zust.K.grund, TEXTE.grund.heKreisstrasse);
  assert.deepEqual(zust.K.alternative, { stelle: "k06632", bedingung: TEXTE.bedingung.heUeberoertlich });
  assert.equal(zust.L.stelle, "k06632", "bis 7.500 Einwohner");
  assert.equal(zust.L.grund, TEXTE.grund.heLandesstrasseKreis);
  assert.equal(zust.L.alternative, null, "mehr als 10 % unter der Schwelle");
  assert.equal(zust.B.stelle, "k06632");
  assert.equal(zust.B.grund, TEXTE.grund.heBundesstrasse);
  assert.equal(zust.B.quelle, TEXTE.quelle.heLandkreis);
  assert.deepEqual(stellen.g066320004004, {
    id: "g066320004004", name: "Gemeinde Breitenbach a.Herzberg – Straßenverkehrsbehörde", ebene: "oertliche",
    art: "gemeinde",
  });
  assert.equal(stellen.k06632.name, "Landkreis Hersfeld-Rotenburg – Straßenverkehrsbehörde");
  assert.equal(resolveGemeinde(G.badVilbel).zust.B.stelle, "k06440", "keine Sonderstatus-Stadt");
});

test("Hessen: Landesstraßen bei der Gemeinde ab mehr als 7.500 Einwohnern, Ampeln und Fußgängerüberwege beim Landkreis", () => {
  assert.deepEqual({ ...HE_SCHWELLEN }, { L: 7500, ortsdurchfahrt: 30000, bestand: 6750 });
  const erzhausen = resolveGemeinde(G.erzhausen).zust.L;
  assert.equal(erzhausen.stelle, "g064320006006");
  assert.equal(erzhausen.sicherheit, SICHERHEIT.BELEGT);
  assert.equal(erzhausen.grund, TEXTE.grund.heLandesstrasse);
  assert.deepEqual(erzhausen.alternative, { stelle: "k06432", bedingung: TEXTE.bedingung.heAmpel });
  const vilbel = resolveGemeinde(G.badVilbel);
  assert.equal(vilbel.zust.L.stelle, "g064400003003");
  assert.equal(vilbel.zust.L.alternative.bedingung, TEXTE.bedingung.heAmpelAusserhalb, "über 30.000 Einwohner");
  assert.equal(vilbel.stellen.g064400003003.ebene, "oertliche");
  // § 10a: bis 10 % unter der Schwelle kann die Gemeinde noch zuständig sein.
  const fernwald = resolveGemeinde(G.fernwald).zust.L;
  assert.equal(fernwald.stelle, "k06531");
  assert.equal(fernwald.sicherheit, SICHERHEIT.VERMUTLICH);
  assert.deepEqual(fernwald.alternative, { stelle: "g065310004004", bedingung: TEXTE.bedingung.heBestand });
  assert.equal(resolveGemeinde({ ...G.fernwald, ew: 6750 }).zust.L.alternative.stelle, "g065310004004");
  assert.equal(resolveGemeinde({ ...G.fernwald, ew: 6749 }).zust.L.alternative, null);
  assert.equal(resolveGemeinde({ ...G.fernwald, ew: 7500 }).zust.L.stelle, "k06531", "7.500 noch beim Landkreis");
  assert.equal(resolveGemeinde({ ...G.fernwald, ew: 7501 }).zust.L.stelle, "g065310004004");
});

test("Saarland: Gemeindestraßen bei der Gemeinde, sonst Landkreis bzw. Regionalverband; Saarbrücken für alle Straßen", () => {
  const sb = resolveGemeinde(G.saarbruecken);
  for (const k of BAU_KLASSEN) {
    assert.equal(sb.zust[k].stelle, "g100410100100", k);
    assert.equal(sb.zust[k].sicherheit, SICHERHEIT.BELEGT, k);
    assert.equal(sb.zust[k].alternative, null, k);
  }
  assert.equal(sb.zust.L.grund, TEXTE.grund.slSaarbruecken);
  assert.deepEqual(sb.stellen.g100410100100, {
    id: "g100410100100", name: "Stadt Saarbrücken – Straßenverkehrsbehörde", ebene: "untere", art: "stadt",
  });
  const vk = resolveGemeinde(G.voelklingen);
  assert.equal(vk.zust.G.stelle, "g100410519519");
  assert.equal(vk.zust.G.grund, TEXTE.grund.slGemeinde);
  assert.equal(vk.zust.G.quelle, TEXTE.quelle.slOertlich);
  for (const k of ["K", "L", "B"]) {
    assert.equal(vk.zust[k].stelle, "k10041", k);
    assert.equal(vk.zust[k].quelle, TEXTE.quelle.slUnter, k);
  }
  assert.equal(vk.stellen.k10041.name, "Regionalverband Saarbrücken – Straßenverkehrsbehörde");
  const saarlouis = resolveGemeinde(G.saarlouis);
  assert.equal(saarlouis.zust.G.stelle, "g100440115115");
  assert.equal(saarlouis.zust.L.stelle, "k10044");
  assert.equal(saarlouis.stellen.k10044.name, "Landkreis Saarlouis – Straßenverkehrsbehörde");
  const nohfelden = resolveGemeinde(G.nohfelden);
  assert.deepEqual(nohfelden.stellen.g100460114114, {
    id: "g100460114114", name: "Gemeinde Nohfelden – Straßenverkehrsbehörde", ebene: "oertliche", art: "gemeinde",
  });
  assert.equal(nohfelden.zust.B.stelle, "k10046");
  for (const k of BAU_KLASSEN) assert.equal(nohfelden.zust[k].alternative, null, k);
});

test("Berlin: Gemeindestraßen beim Bezirksamt, sonst die Senatsverwaltung – je mit der anderen als Alternative", () => {
  const { zust, stellen } = resolveGemeinde(G.berlinMitte);
  assert.equal(zust.G.stelle, "g110000000001");
  assert.equal(zust.G.sicherheit, SICHERHEIT.VERMUTLICH);
  assert.equal(zust.G.grund, TEXTE.grund.beBezirk);
  assert.equal(zust.G.quelle, TEXTE.quelle.berlin);
  assert.deepEqual(zust.G.alternative, { stelle: "be-senat", bedingung: TEXTE.bedingung.berlinNetz });
  for (const k of ["K", "L", "B"]) {
    assert.equal(zust[k].stelle, "be-senat", k);
    assert.equal(zust[k].sicherheit, SICHERHEIT.VERMUTLICH, k);
    assert.equal(zust[k].grund, TEXTE.grund.beSenat, k);
    assert.deepEqual(zust[k].alternative, { stelle: "g110000000001", bedingung: TEXTE.bedingung.berlinNebenstrasse }, k);
  }
  assert.deepEqual(stellen.g110000000001, {
    id: "g110000000001", name: "Bezirksamt Mitte – Straßenverkehrsbehörde", ebene: "untere", art: "stadtstaat",
  });
  assert.equal(stellen["be-senat"], FESTE_STELLEN["be-senat"], "der Senat behält seine Id");
  const tk = resolveGemeinde(G.berlinTreptowKoepenick);
  assert.equal(tk.stellen.g110000000009.name, "Bezirksamt Treptow-Köpenick – Straßenverkehrsbehörde");
  assert.notEqual(ergebnisId(tk.zust.K), ergebnisId(zust.K), "jeder Bezirk mit sich selbst als Alternative");
});

test("Berlin gesamt (VG25, ohne Bezirk): Bezirksamt nur als Ebene, Senatsverwaltung vermutlich", () => {
  const { zust, stellen } = resolveGemeinde(G.berlin);
  assert.equal(zust.G.stelle, "be-bezirk");
  assert.equal(zust.G.sicherheit, SICHERHEIT.NUR_EBENE);
  assert.equal(zust.G.grund, TEXTE.grund.berlin);
  assert.equal(zust.G.alternative.stelle, "be-senat");
  assert.equal(zust.B.stelle, "be-senat");
  assert.equal(zust.B.sicherheit, SICHERHEIT.VERMUTLICH);
  assert.deepEqual(zust.B.alternative, { stelle: "be-bezirk", bedingung: TEXTE.bedingung.berlinNebenstrasse });
  assert.equal(stellen["be-bezirk"].art, "stadtstaat");
  assert.equal(stellen["be-senat"].art, "stadtstaat");
});

test("Baden-Württemberg: Stadtkreise und Große Kreisstädte für alle Straßen (belegt), gemeindefreie Gebiete beim Landratsamt", () => {
  const stuttgart = resolveGemeinde(G.stuttgart);
  for (const k of BAU_KLASSEN) {
    assert.equal(stuttgart.zust[k].stelle, "k08111", k);
    assert.equal(stuttgart.zust[k].sicherheit, SICHERHEIT.BELEGT, k);
    assert.equal(stuttgart.zust[k].alternative, null, k);
  }
  assert.equal(stuttgart.zust.G.grund, TEXTE.grund.bwStadtkreis);
  assert.equal(stuttgart.zust.G.quelle, TEXTE.quelle.bwUnter);
  assert.equal(stuttgart.stellen.k08111.name, "Stadt Stuttgart – Straßenverkehrsbehörde");
  const esslingen = resolveGemeinde(G.esslingen);
  for (const k of BAU_KLASSEN) {
    assert.equal(esslingen.zust[k].stelle, "g081160019019", k);
    assert.equal(esslingen.zust[k].sicherheit, SICHERHEIT.BELEGT, k);
    assert.equal(esslingen.zust[k].grund, TEXTE.grund.bwGks, k);
    assert.equal(esslingen.zust[k].alternative, null, k);
  }
  assert.deepEqual(esslingen.stellen.g081160019019, {
    id: "g081160019019", name: "Stadt Esslingen am Neckar – Straßenverkehrsbehörde", ebene: "untere", art: "stadt",
  });
  const gutsbezirk = resolveGemeinde(G.muensingen);
  for (const k of BAU_KLASSEN) assert.equal(gutsbezirk.zust[k].stelle, "k08415", k);
  assert.equal(gutsbezirk.zust.G.sicherheit, SICHERHEIT.VERMUTLICH);
  assert.equal(gutsbezirk.zust.G.grund, TEXTE.grund.gemeindefrei);
  assert.equal(gutsbezirk.zust.G.quelle, TEXTE.quelle.bwUnter);
  assert.equal(gutsbezirk.stellen.k08415.name, "Landratsamt Reutlingen – Straßenverkehrsbehörde");
});

test("Baden-Württemberg: Verwaltungsgemeinschaft als untere Verwaltungsbehörde für alle Straßen ihrer Gemeinden (vermutlich)", () => {
  const dettingen = resolveGemeinde(G.dettingenTeck);
  for (const k of BAU_KLASSEN) {
    assert.equal(dettingen.zust[k].stelle, "v081165001", k);
    assert.equal(dettingen.zust[k].sicherheit, SICHERHEIT.VERMUTLICH, k);
    assert.equal(dettingen.zust[k].grund, TEXTE.grund.bwVgUntere, k);
    assert.equal(dettingen.zust[k].quelle, TEXTE.quelle.bwListe, k);
    assert.equal(dettingen.zust[k].alternative, null, k);
  }
  assert.deepEqual(dettingen.stellen.v081165001, {
    id: "v081165001", name: "Vereinbarte Verwaltungsgemeinschaft Kirchheim unter Teck – Straßenverkehrsbehörde",
    ebene: "untere", art: "verband",
  });
  const notzingen = { ...G.dettingenTeck, ars: "081165001048", gen: "Notzingen", name: "Gemeinde Notzingen", ew: 3700 };
  assert.equal(resolveGemeinde(notzingen).zust.B.stelle, "v081165001", "dieselbe Gemeinschaft");
  const bfh = resolveGemeinde(G.badFriedrichshall);
  for (const k of BAU_KLASSEN) assert.equal(bfh.zust[k].stelle, "v081255001", `${k}: Sitz ohne Große Kreisstadt`);
  // Die Erklärung gilt für die ganze Gemeinschaft: Ein Mitglied, das die Quelle nicht nennt (erfunden), gehört
  // dazu – erkannt an den Mitgliedern, die der Build ergänzt.
  const mitglieder = ["Dettingen unter Teck", "Kirchheim unter Teck", "Musterdorf", "Notzingen"];
  const musterdorf = { ...G.dettingenTeck, gen: "Musterdorf", verband: { ...G.dettingenTeck.verband, mitglieder } };
  assert.equal(resolveGemeinde(musterdorf).zust.K.stelle, "v081165001");
  const ohneMitglieder = resolveGemeinde({ ...G.dettingenTeck, gen: "Musterdorf" }).zust.K;
  assert.equal(ohneMitglieder.stelle, "k08116", "ohne Mitglieder nur der eigene Name");
  assert.equal(ohneMitglieder.quelle, TEXTE.quelle.bwListe, "das Landratsamt nennt im Landkreis Esslingen alle");
  assert.equal(ohneMitglieder.alternative, null);
  // Nennt die Liste die Gemeinde, kennt die Tabelle aber keinen Verband: das Landratsamt, nie belegt.
  const ohneVerband = resolveGemeinde({ ...G.dettingenTeck, verband: null }).zust.K;
  assert.equal(ohneVerband.stelle, "k08116");
  assert.equal(ohneVerband.sicherheit, SICHERHEIT.VERMUTLICH);
  assert.equal(ohneVerband.quelle, TEXTE.quelle.bwListe, "die Liste ist der Grund");
});

test("Baden-Württemberg: Kreis-, Landes- und Bundesstraßen beim Landratsamt – mit der Verwaltungsgemeinschaft als Alternative, wo sie es sein könnte", () => {
  const gerstetten = resolveGemeinde(G.gerstetten);
  for (const k of ["K", "L", "B"]) {
    assert.equal(gerstetten.zust[k].stelle, "k08135", k);
    assert.equal(gerstetten.zust[k].sicherheit, SICHERHEIT.BELEGT, `${k}: ohne Verband`);
    assert.equal(gerstetten.zust[k].grund, TEXTE.grund.bwLandratsamt, k);
    assert.equal(gerstetten.zust[k].quelle, TEXTE.quelle.bwSchwelle, k);
    assert.equal(gerstetten.zust[k].alternative, null, k);
  }
  assert.equal(gerstetten.stellen.k08135.name, "Landratsamt Heidenheim – Straßenverkehrsbehörde");
  // Mehr als 18.000 Einwohner in der Gemeinschaft, das Landratsamt nennt nicht, wer außer ihm zuständig ist.
  const hermaringen = resolveGemeinde(G.hermaringen);
  for (const k of BAU_KLASSEN) {
    assert.equal(hermaringen.zust[k].stelle, "k08135", k);
    assert.equal(hermaringen.zust[k].sicherheit, SICHERHEIT.VERMUTLICH, k);
    assert.equal(hermaringen.zust[k].quelle, TEXTE.quelle.bwSchwelle, k);
    assert.deepEqual(hermaringen.zust[k].alternative, { stelle: "v081355001", bedingung: TEXTE.bedingung.bwVgUntere }, k);
  }
  assert.equal(hermaringen.zust.K.grund, TEXTE.grund.bwLandratsamt);
  assert.equal(hermaringen.zust.G.grund, TEXTE.grund.bwLandratsamtG);
  assert.equal(hermaringen.stellen.v081355001.ebene, "untere");
  // Im Landkreis Esslingen nennt das Landratsamt alle: dort das Landratsamt ohne Alternative, aber nur vermutlich.
  const lichtenwald = resolveGemeinde(G.lichtenwald).zust;
  for (const k of BAU_KLASSEN) {
    assert.equal(lichtenwald[k].stelle, "k08116", k);
    assert.equal(lichtenwald[k].sicherheit, SICHERHEIT.VERMUTLICH, k);
    assert.equal(lichtenwald[k].quelle, TEXTE.quelle.bwListe, k);
    assert.equal(lichtenwald[k].alternative, null, k);
  }
  // Schwelle: mehr als 20.000 Einwohner, ab 90 % davon möglich.
  const mitVerband = (ew) => resolveGemeinde({ ...G.hermaringen, verband: { ...G.hermaringen.verband, ew } }).zust;
  assert.equal(mitVerband(18000).K.sicherheit, SICHERHEIT.BELEGT);
  assert.equal(mitVerband(18000).K.alternative, null);
  assert.equal(mitVerband(18001).K.alternative.stelle, "v081355001");
  // Fehlen die Einwohner der Gemeinschaft oder der Gemeinde, ist nichts belegt.
  const ohneEw = resolveGemeinde({ ...G.hermaringen, verband: { ...G.hermaringen.verband, ew: null } }).zust.K;
  assert.equal(ohneEw.sicherheit, SICHERHEIT.VERMUTLICH);
  assert.equal(ohneEw.alternative, null);
  const ohneEwGemeinde = resolveGemeinde({ ...G.gerstetten, ew: null }).zust;
  assert.equal(ohneEwGemeinde.K.sicherheit, SICHERHEIT.VERMUTLICH);
  assert.equal(ohneEwGemeinde.G.sicherheit, SICHERHEIT.VERMUTLICH);
  assert.equal(ohneEwGemeinde.G.alternative, null);
});

test("Baden-Württemberg: Gemeindestraßen bei der örtlichen Straßenverkehrsbehörde, wenn sie nicht auf höhere Straßen wirken", () => {
  const aichtal = resolveGemeinde(G.aichtal);
  assert.equal(aichtal.zust.G.stelle, "g081160081081");
  assert.equal(aichtal.zust.G.sicherheit, SICHERHEIT.VERMUTLICH);
  assert.equal(aichtal.zust.G.grund, TEXTE.grund.bwOertlich);
  assert.equal(aichtal.zust.G.quelle, TEXTE.quelle.bwOertlich);
  assert.deepEqual(aichtal.zust.G.alternative, { stelle: "k08116", bedingung: TEXTE.bedingung.bwHoehereStrasse });
  assert.deepEqual(aichtal.stellen.g081160081081, {
    id: "g081160081081", name: "Stadt Aichtal – Straßenverkehrsbehörde", ebene: "oertliche", art: "stadt",
  });
  for (const k of ["K", "L", "B"]) {
    assert.equal(aichtal.zust[k].stelle, "k08116", k);
    assert.equal(aichtal.zust[k].sicherheit, SICHERHEIT.BELEGT, k);
  }
  const altdorf = resolveGemeinde(G.altdorfBB);
  assert.equal(altdorf.zust.G.stelle, "v081155004");
  assert.equal(altdorf.zust.G.grund, TEXTE.grund.bwOertlichVg);
  assert.equal(altdorf.zust.G.quelle, TEXTE.quelle.bwOertlich);
  assert.deepEqual(altdorf.zust.G.alternative, { stelle: "k08115", bedingung: TEXTE.bedingung.bwHoehereStrasse });
  assert.deepEqual(altdorf.stellen.v081155004, {
    id: "v081155004", name: "Gemeindeverwaltungsverband Holzgerlingen – Straßenverkehrsbehörde", ebene: "oertliche",
    art: "verband",
  });
  assert.equal(altdorf.zust.K.stelle, "k08115");
  assert.equal(altdorf.zust.K.sicherheit, SICHERHEIT.VERMUTLICH, "Verband über 18.000, Liste des Landratsamts vollständig");
  assert.equal(altdorf.zust.K.quelle, TEXTE.quelle.bwListe);
  assert.equal(altdorf.zust.K.alternative, null);
  // Lörrach nennt das Landratsamt nicht vollständig, die Gemeinschaft Schopfheim hat mehr als 18.000 Einwohner:
  // Als örtliche Straßenverkehrsbehörde ist sie nicht zugleich untere Verwaltungsbehörde – keine Alternative, und
  // die Stelle bleibt in allen Klassen dieselbe (Schlüssel erfunden).
  // Ein Mitglied ist örtliche Straßenverkehrsbehörde: Dann ist die Gemeinschaft für keines ihrer Mitglieder
  // als untere Verwaltungsbehörde möglich (Hohenlohekreis, Liste unvollständig; Ingelfingen mit erfundenem Schlüssel).
  const kuenzelsau = resolveGemeinde(G.kuenzelsau);
  assert.equal(kuenzelsau.zust.G.stelle, "g081265003046");
  assert.deepEqual(kuenzelsau.zust.G.alternative, { stelle: "k08126", bedingung: TEXTE.bedingung.bwHoehereStrasse });
  const ingelfingen = resolveGemeinde({ ...G.kuenzelsau, ars: "081265003099", gen: "Ingelfingen", ew: 5600 }).zust;
  for (const z of [kuenzelsau.zust, ingelfingen]) {
    for (const k of ["K", "L", "B"]) {
      assert.equal(z[k].stelle, "k08126", k);
      assert.equal(z[k].alternative, null, k);
      assert.equal(z[k].quelle, TEXTE.quelle.bwListe, k);
    }
  }
  assert.deepEqual(ingelfingen.G.alternative, { stelle: "g081265003099", bedingung: TEXTE.bedingung.bwOertlich });
  const ohneOertliche = { ...G.kuenzelsau.verband, mitglieder: ["Ingelfingen", "Muster"] };
  const anders = resolveGemeinde({ ...G.kuenzelsau, ars: "081265003099", gen: "Ingelfingen", verband: ohneOertliche });
  assert.equal(anders.zust.K.alternative.stelle, "v081265003", "ohne örtliches Mitglied: die Gemeinschaft möglich");
  const maulburg = resolveGemeinde({
    ars: "083365000003", gen: "Maulburg", name: "Gemeinde Maulburg", land: "BW", tkz: [64], ew: 4200,
    kreis: kreis("08336", "Lörrach", "Landkreis", "ja"),
    verband: {
      ars: "083365000", gen: "Schopfheim", name: "Vereinbarte Verwaltungsgemeinschaft Schopfheim", ew: 27700,
      mitglieder: ["Hasel", "Hausen im Wiesental", "Maulburg", "Schopfheim"],
    },
  });
  assert.equal(maulburg.zust.G.stelle, "v083365000");
  assert.equal(maulburg.stellen.v083365000.ebene, "oertliche");
  for (const k of ["K", "L", "B"]) {
    assert.equal(maulburg.zust[k].stelle, "k08336", k);
    assert.equal(maulburg.zust[k].alternative, null, k);
    assert.equal(maulburg.zust[k].quelle, TEXTE.quelle.bwListe, k);
  }
});

test("Baden-Württemberg: Gemeindestraßen – die Gemeinde oder ihr Verband als Alternative, wo sie es sein könnte", () => {
  const gerstetten = resolveGemeinde(G.gerstetten);
  assert.equal(gerstetten.zust.G.stelle, "k08135");
  assert.equal(gerstetten.zust.G.sicherheit, SICHERHEIT.VERMUTLICH);
  assert.equal(gerstetten.zust.G.grund, TEXTE.grund.bwLandratsamtG);
  assert.equal(gerstetten.zust.G.quelle, TEXTE.quelle.bwSchwelle);
  assert.deepEqual(gerstetten.zust.G.alternative, { stelle: "g081350015015", bedingung: TEXTE.bedingung.bwOertlich });
  assert.deepEqual(gerstetten.stellen.g081350015015, {
    id: "g081350015015", name: "Gemeinde Gerstetten – Straßenverkehrsbehörde", ebene: "oertliche", art: "gemeinde",
  });
  const doerzbach = resolveGemeinde(G.doerzbach);
  assert.deepEqual(doerzbach.zust.G.alternative, { stelle: "v081265002", bedingung: TEXTE.bedingung.bwOertlichVg });
  assert.equal(doerzbach.stellen.v081265002.ebene, "oertliche");
  assert.equal(doerzbach.stellen.k08126.name, "Landratsamt Hohenlohekreis – Straßenverkehrsbehörde");
  assert.equal(doerzbach.zust.K.sicherheit, SICHERHEIT.BELEGT, "Verband unter 18.000");
  // Im Landkreis Esslingen nennt das Landratsamt alle örtlichen Straßenverkehrsbehörden.
  const aichwald = resolveGemeinde(G.aichwald).zust.G;
  assert.equal(aichwald.stelle, "k08116");
  assert.equal(aichwald.sicherheit, SICHERHEIT.VERMUTLICH);
  assert.equal(aichwald.quelle, TEXTE.quelle.bwListe);
  assert.equal(aichwald.alternative, null);
  // Schwelle: mehr als 5.000 Einwohner, ab 90 % davon möglich – darunter belegt.
  const mitEw = (ew) => resolveGemeinde({ ...G.gerstetten, ew }).zust.G;
  assert.equal(mitEw(4500).sicherheit, SICHERHEIT.BELEGT);
  assert.equal(mitEw(4500).quelle, TEXTE.quelle.bwSchwelle);
  assert.equal(mitEw(4500).alternative, null);
  assert.equal(mitEw(4501).alternative.stelle, "g081350015015");
  const kleinerVerband = { ...G.doerzbach, verband: { ...G.doerzbach.verband, ew: 4500 } };
  assert.equal(resolveGemeinde(kleinerVerband).zust.G.sicherheit, SICHERHEIT.BELEGT);
  // Ravensburg nennt alle, auch für Wolfegg: Es steht in keiner Liste, sein Verbandspartner Vogt schon, und eine
  // Erklärung gälte für die ganze Gemeinschaft (Verbände erfunden).
  const ravensburg = (gen, mitglieder) => resolveGemeinde({
    ars: "084365000001", gen, name: `Gemeinde ${gen}`, land: "BW", tkz: [64], ew: 3800,
    kreis: kreis("08436", "Ravensburg", "Landkreis", "ja"),
    verband: { ars: "084365000", gen: "Muster", name: "Gemeindeverwaltungsverband Muster", ew: 9000, mitglieder },
  }).zust.G;
  for (const [gen, mitglieder] of [["Wolfegg", ["Vogt", "Wolfegg"]], ["Baindt", ["Baindt"]]]) {
    assert.equal(ravensburg(gen, mitglieder).alternative, null, gen);
    assert.equal(ravensburg(gen, mitglieder).quelle, TEXTE.quelle.bwListe, gen);
  }
});

test("Baden-Württemberg: Listen – Kreise als Schlüssel, Namen sortiert und eindeutig, keine Gemeinde doppelt", () => {
  assert.deepEqual({ ...BW_SCHWELLEN }, { oertlich: 5000, vgUntere: 20000, rand: 0.9 });
  const stadtkreise = new Set(["08111", "08121", "08211", "08212", "08221", "08222", "08231", "08311", "08421"]);
  const sortiert = (namen) => [...namen].sort((a, b) => a.localeCompare(b, "de"));
  const gesehen = new Map();
  const listen = { BW_VG_UNTERE, BW_OERTLICH_VG, BW_OERTLICH };
  for (const [name, liste] of Object.entries(listen)) {
    assert.ok(Object.isFrozen(liste), name);
    const kreise = Object.keys(liste);
    assert.deepEqual(kreise, [...kreise].sort(), `${name}: Kreise sortiert`);
    const gruppenweise = name === "BW_VG_UNTERE" || name === "BW_OERTLICH_VG";
    for (const [k, eintraege] of Object.entries(liste)) {
      assert.match(k, /^08\d{3}$/, `${name}: ${k}`);
      assert.ok(!stadtkreise.has(k), `${name}: ${k} ist ein Stadtkreis`);
      assert.ok(eintraege.length > 0, `${name}: ${k} leer`);
      const gruppen = gruppenweise ? eintraege : [eintraege];
      if (gruppenweise) {
        const erste = gruppen.map((gruppe) => gruppe[0]);
        assert.deepEqual(erste, sortiert(erste), `${name}: ${k} Gemeinschaften sortiert`);
      }
      for (const gruppe of gruppen) {
        assert.ok(gruppe.length > 0 && gruppe.every((gen) => typeof gen === "string"), `${name}: ${k}`);
        assert.deepEqual(gruppe, sortiert(gruppe), `${name}: ${k} sortiert`);
        for (const gen of gruppe) {
          const schluessel = `${k} ${gen}`;
          assert.ok(!gesehen.has(schluessel), `${gen} (${k}) in ${name} und ${gesehen.get(schluessel)}`);
          gesehen.set(schluessel, name);
        }
      }
    }
  }
  for (const [art, kreise] of Object.entries(BW_VOLLSTAENDIG)) {
    assert.deepEqual(kreise, [...new Set(kreise)].sort(), `BW_VOLLSTAENDIG.${art}: sortiert, eindeutig`);
    for (const k of kreise) assert.ok(/^08\d{3}$/.test(k) && !stadtkreise.has(k), `BW_VOLLSTAENDIG.${art}: ${k}`);
  }
});

test("Baden-Württemberg: pruefeListen – Namen, Verbände und Widersprüche gegen die Gemeindetabelle", () => {
  const esslingen = kreis("08116", "Esslingen", "Landkreis", "ja");
  // Gemeinden des Landkreises Esslingen, Schlüssel der Verbände erfunden.
  const g = (gen, verband = null) => ({ land: "BW", gen, kreis: esslingen, verband: verband && { ars: verband } });
  const tabelle = [
    g("Dettingen unter Teck", "081165001"), g("Kirchheim unter Teck", "081165001"), g("Notzingen", "081165001"),
    g("Aichtal"), g("Neuhausen auf den Fildern"), g("Plochingen", "081165006"), g("Wendlingen am Neckar"),
    g("Wernau (Neckar)"),
  ];
  assert.deepEqual(pruefeListen(tabelle), [], "passt");
  const zwei = tabelle.map((x) => (x.gen === "Notzingen" ? g("Notzingen", "081165002") : x));
  assert.deepEqual(pruefeListen(zwei), [
    "BW_VG_UNTERE: Dettingen unter Teck, Kirchheim unter Teck, Notzingen (08116) in 2 Verbänden",
  ]);
  const ohne = tabelle.filter((x) => x.gen !== "Plochingen").map((x) => (x.gen === "Notzingen" ? g("Notzingen") : x));
  assert.deepEqual(pruefeListen(ohne), [
    "BW_VG_UNTERE: Notzingen (08116) ohne Verband in der Tabelle",
    "BW_OERTLICH: Plochingen (08116) gibt es im Kreis nicht",
  ]);
  const imVerband = tabelle.map((x) => (x.gen === "Aichtal" ? g("Aichtal", "081165001") : x));
  assert.deepEqual(pruefeListen(imVerband), ["BW_OERTLICH: Aichtal (08116) – ihr Verband steht in BW_VG_UNTERE"]);
  // Ein Verband in zwei Listen (Rhein-Neckar-Kreis); fehlende Namen dort hier nicht betrachtet.
  const rnk = kreis("08226", "Rhein-Neckar-Kreis", "Landkreis", "nein");
  const beide = [{ land: "BW", gen: "Hockenheim", kreis: rnk, verband: { ars: "082265001" } },
    { land: "BW", gen: "Eberbach", kreis: rnk, verband: { ars: "082265001" } }];
  assert.ok(pruefeListen(beide).includes("Verband 082265001 steht in BW_VG_UNTERE und BW_OERTLICH_VG"));
  assert.deepEqual(pruefeListen([{ ...tabelle[0], land: "BY" }, { ...tabelle[0], kondominium: { nachbar: "x" } }]), [],
    "nur Baden-Württemberg, ohne Kondominium");
  // Zwei Gruppen derselben Liste in einem Verband (Heilbronn).
  const hn = kreis("08125", "Heilbronn", "Landkreis", "ja");
  const zweiGruppen = [{ land: "BW", gen: "Bad Friedrichshall", kreis: hn, verband: { ars: "081255001" } },
    { land: "BW", gen: "Eppingen", kreis: hn, verband: { ars: "081255001" } }];
  assert.ok(pruefeListen(zweiGruppen).includes("Verband 081255001 steht in zwei Gruppen von BW_VG_UNTERE"));
});

test("stelleEintragen: dieselbe Id nur mit demselben Inhalt", () => {
  const stellen = {};
  const vg = { id: "v081265003", name: "Gemeinschaft – Straßenverkehrsbehörde", ebene: "oertliche", art: "verband" };
  stelleEintragen(stellen, vg, "081265003046");
  stelleEintragen(stellen, { ...vg }, "081265003099");
  assert.deepEqual(Object.keys(stellen), ["v081265003"]);
  assert.throws(() => stelleEintragen(stellen, { ...vg, ebene: "untere" }, "081265003099"),
    /Stelle v081265003 mit zwei Inhalten \(081265003099\)/);
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
  const d = landesdatei("XX", [ohneRegel(G.esslingen)]);
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

test("auswahl: Brandenburg, Teilzuständigkeit der Stadt als Alternative mit Kontakt", () => {
  const d = landesdatei("BB", [G.kyritz]);
  d.kontakte = { c1: { name: "Landkreis Ostprignitz-Ruppin - Straßenverkehrsamt" }, c2: { name: "Stadt Kyritz - Ordnungsamt" } };
  Object.assign(d.gemeinden[G.kyritz.ars], { kontakt: "c1", kontakt_gemeinde: "c2" });
  const r = auswahl(d, G.kyritz.ars, ["G", "K"]);
  assert.equal(r.zustaendig.id, "k12068");
  assert.equal(r.kontakt.name, "Landkreis Ostprignitz-Ruppin - Straßenverkehrsamt");
  assert.equal(r.alternative.stelle.id, "g120680264264");
  assert.equal(r.alternative.bedingung, TEXTE.bedingung.bbTeil);
  assert.equal(r.alternative.kontakt.name, "Stadt Kyritz - Ordnungsamt");
});

test("auswahl: Rheinland-Pfalz, Klasse unklar – Verbandsgemeinde, außerorts die Kreisverwaltung", () => {
  const d = landesdatei("RP", [G.bodenheim]);
  const r = auswahl(d, G.bodenheim.ars, []);
  assert.equal(r.zustaendig.id, "v073395002");
  assert.equal(r.sicherheit, SICHERHEIT.VERMUTLICH);
  assert.equal(r.alternative.stelle.id, "k07339");
  assert.equal(r.alternative.bedingung, TEXTE.bedingung.rpAusserorts);
  const beide = auswahl(d, G.bodenheim.ars, ["G", "L"]);
  assert.equal(beide.zustaendig.id, "v073395002");
  assert.equal(beide.alternative.stelle.id, "k07339", "die Alternative der Landesstraße");
});

test("auswahl: Sachsen, Klasse unklar – Landratsamt, die Gemeinde als Alternative; Große Kreisstadt für alles", () => {
  const d = landesdatei("SN", [G.amtsberg, G.gornau]);
  const r = auswahl(d, G.amtsberg.ars, []);
  assert.equal(r.zustaendig.id, "k14521");
  assert.equal(r.alternative.stelle.id, "g145210010010");
  assert.equal(r.alternative.bedingung, TEXTE.bedingung.unklar);
  const gornau = auswahl(d, G.gornau.ars, ["G", "B"]);
  assert.equal(gornau.zustaendig.id, "v145215138");
  assert.equal(gornau.alternative, null);
});

test("auswahl: Sachsen-Anhalt, Gemeindestraße – die Verbandsgemeinde, außerorts der Landkreis", () => {
  const d = landesdatei("ST", [G.ditfurt]);
  const g = auswahl(d, G.ditfurt.ars, ["G"]);
  assert.equal(g.zustaendig.id, "v150855051");
  assert.equal(g.sicherheit, SICHERHEIT.VERMUTLICH);
  assert.equal(g.alternative.stelle.id, "k15085");
  assert.equal(g.alternative.bedingung, TEXTE.bedingung.stAusserorts);
  const unklar = auswahl(d, G.ditfurt.ars, []);
  assert.equal(unklar.zustaendig.id, "k15085");
  assert.equal(unklar.alternative.stelle.id, "v150855051");
  assert.equal(unklar.alternative.bedingung, TEXTE.bedingung.unklar);
});

test("auswahl: Saarland – Landstraße beim Regionalverband, die Gemeinde für die Gemeindestraße", () => {
  const d = landesdatei("SL", [G.voelklingen]);
  const lg = auswahl(d, G.voelklingen.ars, ["L", "G"]);
  assert.equal(lg.zustaendig.id, "k10041");
  assert.equal(lg.alternative.stelle.id, "g100410519519");
  assert.equal(lg.alternative.bedingung, TEXTE.bedingung.gemeindestrasse);
  assert.equal(auswahl(d, G.voelklingen.ars, ["G"]).zustaendig.id, "g100410519519");
});

test("auswahl: Hessen – Kreisstraße bei der Gemeinde, der Landkreis bei überörtlicher Wirkung; Landesstraße beim Landkreis", () => {
  const d = landesdatei("HE", [G.breitenbach]);
  const k = auswahl(d, G.breitenbach.ars, ["K"]);
  assert.equal(k.zustaendig.id, "g066320004004");
  assert.equal(k.alternative.stelle.id, "k06632");
  assert.equal(k.alternative.bedingung, TEXTE.bedingung.heUeberoertlich);
  const lg = auswahl(d, G.breitenbach.ars, ["L", "G"]);
  assert.equal(lg.zustaendig.id, "k06632");
  assert.equal(lg.alternative.stelle.id, "g066320004004");
  assert.equal(lg.alternative.bedingung, TEXTE.bedingung.gemeindestrasse);
});

test("auswahl: Berlin – Nebenstraße beim Bezirk, unklare Straße beim Senat; je mit dem Kontakt ihrer Rolle", () => {
  const d = landesdatei("BE", [G.berlin, G.berlinMitte]);
  d.kontakte = { c1: { name: "Senatsverwaltung – Verkehrsmanagement" }, c2: { name: "Bezirksamt Mitte - Straßenverkehrsbehörde" } };
  Object.assign(d.gemeinden[G.berlinMitte.ars], { kontakt: "c1", kontakt_gemeinde: "c2" });
  Object.assign(d.gemeinden[G.berlin.ars], { kontakt: "c1" });

  const g = auswahl(d, G.berlinMitte.ars, ["G"]);
  assert.equal(g.zustaendig.name, "Bezirksamt Mitte – Straßenverkehrsbehörde");
  assert.equal(g.kontakt.name, "Bezirksamt Mitte - Straßenverkehrsbehörde");
  assert.equal(g.alternative.stelle.id, "be-senat");
  assert.equal(g.alternative.kontakt.name, "Senatsverwaltung – Verkehrsmanagement");

  const unklar = auswahl(d, G.berlinMitte.ars, ["unklar"]);
  assert.equal(unklar.zustaendig.id, "be-senat");
  assert.equal(unklar.kontakt.name, "Senatsverwaltung – Verkehrsmanagement");
  assert.equal(unklar.alternative.stelle.id, "g110000000001");
  assert.equal(unklar.alternative.bedingung, TEXTE.bedingung.berlinNebenstrasse, "die Bedingung der Regel, nicht „falls es eine Gemeindestraße ist“");
  assert.equal(unklar.alternative.kontakt.name, "Bezirksamt Mitte - Straßenverkehrsbehörde");

  const gesamt = auswahl(d, G.berlin.ars, ["G"]);
  assert.equal(gesamt.zustaendig.id, "be-bezirk");
  assert.equal(gesamt.kontakt, null, "welches Bezirksamt, ist ohne Bezirk unbekannt");
  assert.equal(gesamt.alternative.kontakt.name, "Senatsverwaltung – Verkehrsmanagement");
});

test("auswahl: Bremen – das Amt mit seinem Kontakt, die Polizei als Alternative ohne; Bremerhaven", () => {
  const d = landesdatei("HB", [G.bremen, G.bremerhaven]);
  d.kontakte = {
    c1: { name: "Amt für Straßen und Verkehr Bremen" }, c2: { name: "Rathaus" },
    c3: { name: "Magistrat der Stadt Bremerhaven - Bürger- und Ordnungsamt, Straßenverkehrsbehörde" },
  };
  // Ein Kontakt der Gemeinde-Rolle gehört nie zur Polizei.
  Object.assign(d.gemeinden[G.bremen.ars], { kontakt: "c1", kontakt_gemeinde: "c2" });
  Object.assign(d.gemeinden[G.bremerhaven.ars], { kontakt: "c3" });

  const b = auswahl(d, G.bremen.ars, ["B", "G"]);
  assert.equal(b.zustaendig.id, "hb-asv");
  assert.equal(b.sicherheit, SICHERHEIT.BELEGT);
  assert.equal(b.kontakt.name, "Amt für Straßen und Verkehr Bremen");
  assert.equal(b.alternative.stelle.id, "hb-pol", "die Alternative der Regel – die Gemeindestraße hat dieselbe Stelle");
  assert.equal(b.alternative.bedingung, TEXTE.bedingung.hbPolizei);
  assert.equal(b.alternative.kontakt, null);
  const unklar = auswahl(d, G.bremen.ars, ["unklar"]);
  assert.equal(unklar.sicherheit, SICHERHEIT.VERMUTLICH, "unklare Klasse: höchstens vermutlich");
  assert.equal(unklar.alternative.stelle.id, "hb-pol");

  const bhv = auswahl(d, G.bremerhaven.ars, ["G"]);
  assert.equal(bhv.zustaendig.name, "Magistrat der Stadt Bremerhaven – Straßenverkehrsbehörde");
  assert.equal(bhv.kontakt.name, d.kontakte.c3.name);
  assert.equal(bhv.alternative, null);
});

test("auswahl: Hamburg – das Kommissariat ohne Kontakt, die Verkehrsdirektion als Alternative", () => {
  const d = landesdatei("HH", [G.hamburg]);
  const r = auswahl(d, G.hamburg.ars, ["B", "G"]);
  assert.equal(r.zustaendig.id, "hh-pk");
  assert.equal(r.sicherheit, SICHERHEIT.NUR_EBENE);
  assert.equal(r.kontakt, null, "welches Kommissariat, ist unbekannt");
  assert.equal(r.alternative.stelle.name, "Polizei Hamburg, Verkehrsdirektion – Straßenverkehrsbehörde");
  assert.equal(r.alternative.bedingung, TEXTE.bedingung.hhZentral);
  assert.equal(r.alternative.kontakt, null, "noch kein Kontakt der Verkehrsdirektion");
  d.kontakte = { c1: { name: "Polizei Hamburg, Verkehrsdirektion" } };
  d.gemeinden[G.hamburg.ars].kontakt = "c1";
  const mit = auswahl(d, G.hamburg.ars, ["B"]);
  assert.equal(mit.alternative.kontakt.name, "Polizei Hamburg, Verkehrsdirektion", "Rolle der Kreisebene");
  assert.equal(mit.kontakt, null, "nie für das Kommissariat");
});

test("kontaktRolle: Gemeinde bzw. Verband, Kreisebene, in Berlin Bezirk und Senat, in Bremen und Hamburg", () => {
  assert.equal(kontaktRolle("g092740128128", "092740128128"), "gemeinde");
  assert.equal(kontaktRolle("g092740128128", "091780124124"), null, "nie die Gemeinde eines anderen Eintrags");
  assert.equal(kontaktRolle("v073395001", "073395001001"), "gemeinde");
  assert.equal(kontaktRolle("k09274", "092740128128"), "kreis");
  assert.equal(kontaktRolle("g110000000001", "110000000001"), "gemeinde");
  assert.equal(kontaktRolle("be-senat", "110000000001"), "kreis");
  for (const id of ["hb-asv", "hb-bhv", "hh-vd"]) assert.equal(kontaktRolle(id, "040110000000"), "kreis", id);
  for (const id of ["be-bezirk", "fba", "hb-pol", "hh-pk", null]) {
    assert.equal(kontaktRolle(id, "110000000001"), null, String(id));
  }
  // Jede feste Stelle hat eine Rolle oder steht hier ausdrücklich ohne – neue nicht vergessen.
  const ohne = ["fba", "be-bezirk", "hb-pol", "hh-pk"];
  for (const id of Object.keys(FESTE_STELLEN)) {
    assert.equal(kontaktRolle(id, "040110000000") === null, ohne.includes(id), id);
  }
});
