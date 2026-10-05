// SPDX-License-Identifier: AGPL-3.0-or-later
import { test } from "node:test";
import assert from "node:assert/strict";
import { baueLaender, reviewCsv, serialisiere } from "../tools/lib/laender.mjs";
import { auswahl, TEXTE } from "../js/resolve.js";

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
        ars: "091780124124", gen: "Freising", name: "Stadt Freising", land: "BY", tkz: [67], ew: 50000,
        kreis: kreis("09178", "Freising", "Landkreis", "ja"),
      },
      "092740128128": {
        ars: "092740128128", gen: "Essenbach", name: "Gemeinde Essenbach", land: "BY", tkz: [60], ew: 11970,
        kreis: kreis("09274", "Landshut", "Landkreis", "ja"),
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
  assert.deepEqual(index.laender.map((l) => [l.lkz, l.gemeinden]), [["BY", 3], ["RP", 1]]);
  assert.deepEqual(index.laender[0].sicherheit, { belegt: 3, vermutlich: 0, "nur Ebene": 0 }, "Landesregel Bayern");
  assert.deepEqual(index.laender[1].sicherheit, { belegt: 0, vermutlich: 1, "nur Ebene": 0 }, "Landesregel Rheinland-Pfalz");
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
  assert.equal(new Set(Object.values(by.gemeinden["091780124124"].z)).size, 1, "Große Kreisstadt: alle Klassen gleich");
  const z = by.gemeinden["092740128128"].z;
  assert.notEqual(z.G, z.K, "Gemeindestraße bei der Gemeinde, der Rest beim Landratsamt");
  assert.equal(z.K, z.B);
  assert.equal(Object.keys(by.ergebnisse).length, 4);
  assert.equal(auswahl(by, "091780124124", ["B"]).zustaendig.name, "Stadt Freising – Straßenverkehrsbehörde");
  assert.equal(auswahl(by, "092740128128", ["G"]).zustaendig.name, "Gemeinde Essenbach – Straßenverkehrsbehörde");
  const r = auswahl(by, "092740128128", ["K", "G"]);
  assert.equal(r.zustaendig.name, "Landratsamt Landshut – Straßenverkehrsbehörde");
  assert.equal(r.alternative.stelle.name, "Gemeinde Essenbach – Straßenverkehrsbehörde");
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
  assert.equal(review.length, 4 * 4);
  const csv = reviewCsv(review);
  assert.ok(csv.startsWith("﻿land;ars;gemeinde"));
  assert.ok(csv.includes("BY;092740128128;Essenbach;Landkreis Landshut;G;Gemeinde Essenbach"));
  assert.ok(csv.includes("BY;092740128128;Essenbach;Landkreis Landshut;K;Landratsamt Landshut"));
});

function kontakte() {
  const region = "https://verwaltung.bund.de/leistungsverzeichnis/de/leistung/99108014042000/herausgeber/BY-1806/region/{ars}";
  const stelle = (name, email) => ({ name, adresse: null, telefon: ["+49 8161 600-0"], email: [email], web: [] });
  return {
    schema: 1,
    meta: {
      quelle: { id: "bundesportal", label: "Bundesportal", lizenz: "–", vermerk: "Kontakt laut Bundesportal" },
      leistung: "99108014042000",
      laender: { BY: { herausgeber: "1806", abgerufen: "2026-10-02", region_url: region } },
    },
    gemeinden: {
      "091780124124": {
        wahl: "passt", stellen: 2,
        kreis: stelle("Landratsamt Freising", "poststelle@kreis-fs.de"),
        gemeinde: stelle("Große Kreisstadt Freising", "stadtverwaltung@freising.de"),
      },
      "092740128128": {
        wahl: "passt", stellen: 2,
        kreis: stelle("Landratsamt Landshut - Verkehrswesen", "verkehr@landkreis-landshut.de"),
        gemeinde: stelle("Markt Essenbach", "poststelle@essenbach.de"),
      },
      "091620000000": {
        wahl: "passt", stellen: 1,
        kreis: stelle("Landeshauptstadt München - Kreisverwaltungsreferat", "kvr@muenchen.de"),
        gemeinde: null,
      },
    },
  };
}

test("baueLaender + auswahl: Kontakt der Stelle, die für die Klasse zuständig ist", () => {
  const by = baueLaender(attr(), { kontakte: kontakte() }).dateien["by.json"];
  const name = (ars, klassen) => auswahl(by, ars, klassen).kontakt?.name ?? null;
  assert.equal(name("092740128128", ["G"]), "Markt Essenbach");
  assert.equal(name("092740128128", ["K"]), "Landratsamt Landshut - Verkehrswesen");
  const beide = auswahl(by, "092740128128", ["K", "G"]);
  assert.equal(beide.kontakt.name, "Landratsamt Landshut - Verkehrswesen");
  assert.equal(beide.alternative.kontakt.name, "Markt Essenbach");
  assert.equal(auswahl(by, "092740128128", []).alternative.kontakt.name, "Markt Essenbach", "Klasse unklar");
  assert.equal(name("092740128128", ["A"]), null, "Autobahn");
  assert.equal(name("091780124124", ["B"]), "Große Kreisstadt Freising");
  assert.equal(name("091620000000", ["G"]), "Landeshauptstadt München - Kreisverwaltungsreferat");

  // Nur Kontakte von Stellen, die in den Ergebnissen der Gemeinde vorkommen.
  const freising = by.gemeinden["091780124124"];
  assert.match(freising.kontakt_gemeinde, /^c[0-9a-f]{8}$/);
  assert.equal(freising.kontakt, undefined, "Landratsamt ist in Freising für keine Klasse zuständig");
  assert.equal(by.gemeinden["091620000000"].kontakt_gemeinde, undefined);
  assert.equal(Object.keys(by.kontakte).length, 4);
});

/** Baden-Württemberg, Landkreis Göppingen (erfundene Gemeinden): ein Verband und eine Gemeinde ohne Verband. */
function attrBw() {
  const a = attr();
  const goeppingen = kreis("08117", "Göppingen", "Landkreis", "ja");
  const verband = { ars: "081175001", gen: "Musterheide", name: "Gemeindeverwaltungsverband Musterheide", sitz: "081175001002" };
  const g = (ars, gen, ew, mitVerband = true) => ({
    ars, gen, name: `Gemeinde ${gen}`, land: "BW", tkz: [64], ew, kreis: goeppingen, ...(mitVerband ? { verband } : {}),
  });
  a.gemeinden["081175001001"] = g("081175001001", "Musterort", 3000);
  a.gemeinden["081175001002"] = g("081175001002", "Mustersitz", 2000);
  a.gemeinden["081175001003"] = g("081175001003", "Mustertal", 6000);
  a.gemeinden["081170099099"] = g("081170099099", "Kleinweiler", 1200, false);
  return a;
}

/** Kontakte wie aus dem Anschriftenverzeichnis: die Gemeinde selbst und, im Verband, die Verwaltung am Sitz. */
function kontakteBw(a) {
  const k = kontakte();
  const quelle = { id: "anschriften", label: "Anschriftenverzeichnis", lizenz: "–", vermerk: "Statistische Ämter" };
  k.meta.laender.BW = { abgerufen: "2026-10-05", stand: "2026-01-31", kurz: "Anschriftenverzeichnis", quelle };
  const allgemein = (name) => ({ name, adresse: `Rathausplatz 1, 73000 ${name}`, telefon: [], email: [], web: [], allgemein: true });
  for (const [ars, g] of Object.entries(a.gemeinden)) {
    if (g.land !== "BW") continue;
    k.gemeinden[ars] = {
      wahl: null, stellen: 0, kreis: allgemein("Landkreis Göppingen"), gemeinde: allgemein(g.name),
      ...(g.verband && g.verband.sitz !== ars ? { verband: allgemein("Gemeinde Mustersitz") } : {}),
    };
  }
  return k;
}

test("baueLaender: Kontakt der Gemeinde nur, wo sie zuständig sein kann – mit den Einwohnern ihres Verbands", () => {
  const a = attrBw();
  const bw = baueLaender(a, { kontakte: kontakteBw(a) }).dateien["bw.json"];
  const klein = bw.gemeinden["081170099099"];
  assert.equal(bw.kontakte[klein.kontakt].name, "Landkreis Göppingen");
  assert.equal(klein.kontakt_gemeinde, undefined, "zu klein, ohne Verband: nur das Landratsamt");

  // 3.000 Einwohner, im Verband 11.000: Der Verband könnte örtliche Straßenverkehrsbehörde sein.
  const ort = auswahl(bw, "081175001001", ["G"]);
  assert.equal(ort.zustaendig.id, "k08117");
  assert.equal(ort.alternative.stelle.id, "v081175001");
  assert.ok(ort.alternative.kontakt, "Kontakt der Gemeinde-Rolle");
  assert.equal(bw.gemeinden["081175001001"].ew, 3000, "Einwohner der Gemeinde selbst");

  // Ohne die übrigen Mitglieder hat der Verband nur 3.000 Einwohner: keine Alternative, kein Kontakt der Gemeinde.
  const allein = attrBw();
  delete allein.gemeinden["081175001002"];
  delete allein.gemeinden["081175001003"];
  const nurOrt = baueLaender(allein, { kontakte: kontakteBw(allein) }).dateien["bw.json"];
  assert.equal(auswahl(nurOrt, "081175001001", ["G"]).alternative, null);
  assert.equal(nurOrt.gemeinden["081175001001"].kontakt_gemeinde, undefined);

  // Fehlt einem Mitglied die Einwohnerzahl, ist die des Verbands unbekannt: nichts belegt.
  const luecke = attrBw();
  luecke.gemeinden["081175001003"] = { ...luecke.gemeinden["081175001003"], ew: null };
  const mitLuecke = baueLaender(luecke).dateien["bw.json"];
  assert.equal(auswahl(mitLuecke, "081175001001", ["K"]).sicherheit, "vermutlich");
  assert.equal(auswahl(baueLaender(attrBw()).dateien["bw.json"], "081175001001", ["K"]).sicherheit, "belegt");
});

test("baueLaender + auswahl: für den Verband die Verwaltung am Sitz, für die Gemeinde selbst ihr Rathaus", () => {
  const a = attrBw();
  const bw = baueLaender(a, { kontakte: kontakteBw(a) }).dateien["bw.json"];
  const ort = auswahl(bw, "081175001001", ["G"]);
  assert.equal(ort.alternative.stelle.id, "v081175001");
  assert.equal(ort.alternative.kontakt.name, "Gemeinde Mustersitz", "Verband: die Verwaltung am Sitz");
  const tal = auswahl(bw, "081175001003", ["G"]);
  assert.equal(tal.alternative.stelle.id, "g081175001003", "6.000 Einwohner: die Gemeinde selbst");
  assert.equal(tal.alternative.kontakt.name, "Gemeinde Mustertal", "ihr eigenes Rathaus, nicht das am Sitz");
  assert.equal(auswahl(bw, "081175001002", ["G"]).alternative.kontakt.name, "Gemeinde Mustersitz", "der Sitz selbst");
  assert.equal(bw.daten.kontakte, "Anschriftenverzeichnis 31.01.2026");

  // Ohne Eintrag für den Verband gilt der der Gemeinde; ist er leer (der Sitz hat keine Anschrift), keiner.
  const k = kontakteBw(a);
  delete k.gemeinden["081175001001"].verband;
  const ohne = baueLaender(a, { kontakte: k }).dateien["bw.json"];
  assert.equal(auswahl(ohne, "081175001001", ["G"]).alternative.kontakt.name, "Gemeinde Musterort");
  k.gemeinden["081175001001"].verband = null;
  const leer = baueLaender(a, { kontakte: k }).dateien["bw.json"];
  assert.equal(auswahl(leer, "081175001001", ["G"]).alternative.kontakt, null, "nicht das Rathaus der Gemeinde");
});

test("baueLaender: Gemeinschaften aus den Listen – ein genanntes Mitglied genügt; Warnungen zu den Listen", () => {
  // Esslingen: Die Verwaltungsgemeinschaft Kirchheim unter Teck nennt das Landratsamt mit Dettingen und Notzingen.
  // Ein Mitglied, das die Liste nicht nennt (erfunden), gehört trotzdem dazu.
  const a = attr();
  const esslingen = kreis("08116", "Esslingen", "Landkreis", "ja");
  const verband = {
    ars: "081165001", gen: "Kirchheim unter Teck", name: "Vereinbarte Verwaltungsgemeinschaft Kirchheim unter Teck",
    sitz: "081165001033",
  };
  const g = (ars, gen, ew) => ({ ars, gen, name: `Gemeinde ${gen}`, land: "BW", tkz: [64], ew, kreis: esslingen, verband });
  a.gemeinden["081165001016"] = g("081165001016", "Dettingen unter Teck", 6000);
  a.gemeinden["081165001099"] = g("081165001099", "Musterdorf", 1000);
  const { dateien, warnungen } = baueLaender(a);
  const bw = dateien["bw.json"];
  assert.equal(auswahl(bw, "081165001099", ["B"]).zustaendig.id, "v081165001");
  assert.equal(bw.stellen.v081165001.ebene, "untere");
  assert.ok(warnungen.includes("BW_VG_UNTERE: Kirchheim unter Teck (08116) gibt es im Kreis nicht"));
  assert.ok(warnungen.includes("BW_OERTLICH: Aichtal (08116) gibt es im Kreis nicht"));
  assert.ok(!warnungen.some((w) => w.includes("Dettingen unter Teck")));
  assert.ok(!warnungen.some((w) => w.includes("(08115)")), "nur Kreise aus der Tabelle");
  assert.deepEqual(baueLaender(attrBw()).warnungen, [], "Göppingen steht in keiner Liste");
});

test("baueLaender: eine Stelle hat in allen Gemeinden denselben Inhalt", () => {
  const a = attrBw();
  const sitz = a.gemeinden["081175001002"];
  sitz.verband = { ...sitz.verband, name: "Gemeindeverwaltungsverband Anders" };
  assert.throws(() => baueLaender(a), /Stelle v081175001 mit zwei Inhalten/);
});

test("baueLaender: das Urteil des Bundesportals geht in die Regel ein (Thüringen, Stadt auf Antrag)", () => {
  const a = attr();
  a.gemeinden["160705001001"] = {
    ars: "160705001001", gen: "Musterstadt", name: "Stadt Musterstadt", land: "TH", tkz: [63], ew: 15000,
    kreis: kreis("16070", "Ilm-Kreis", "Landkreis", "nein"),
  };
  const k = kontakte();
  k.meta.laender.TH = { herausgeber: "8958614", abgerufen: "2026-10-02", region_url: "https://…/region/{ars}" };
  const st = (name) => ({ name, adresse: null, telefon: ["03628 0000-0"], email: [], web: [] });
  k.gemeinden["160705001001"] = {
    wahl: "stvb", stellen: 2, kreis: st("Landratsamt Ilm-Kreis"), gemeinde: st("Stadt Musterstadt - Ordnungsamt"),
  };
  const mit = baueLaender(a, { kontakte: k }).dateien["th.json"];
  assert.equal(auswahl(mit, "160705001001", ["G"]).zustaendig.id, "g160705001001", "das Portal nennt die Stadt");
  const ohne = baueLaender(a).dateien["th.json"];
  assert.equal(auswahl(ohne, "160705001001", ["G"]).zustaendig.id, "k16070", "ohne Portal: der Landkreis");
});

test("baueLaender + auswahl: in Rheinland-Pfalz die Verbandsgemeinde, außerorts die Kreisverwaltung", () => {
  const k = kontakte();
  k.meta.laender = { RP: { ...k.meta.laender.BY, herausgeber: "8958611" } };
  const st = (name) => ({ name, adresse: null, telefon: ["+49 6131 1"], email: [], web: [] });
  k.gemeinden = {
    "073395001001": {
      wahl: "stvb", stellen: 2,
      kreis: st("Kreisverwaltung Mainz-Bingen - Straßenverkehr"),
      gemeinde: st("Verbandsgemeindeverwaltung Musterland - Ordnungsamt"),
    },
  };
  const rp = baueLaender(attr(), { kontakte: k }).dateien["rp.json"];
  const g = auswahl(rp, "073395001001", ["G"]);
  assert.equal(g.zustaendig.name, "Verbandsgemeinde Musterland – Straßenverkehrsbehörde");
  assert.equal(g.kontakt.name, "Verbandsgemeindeverwaltung Musterland - Ordnungsamt");
  assert.equal(g.alternative, null);
  const l = auswahl(rp, "073395001001", ["L"]);
  assert.equal(l.zustaendig.id, "v073395001");
  assert.equal(l.kontakt.name, "Verbandsgemeindeverwaltung Musterland - Ordnungsamt");
  assert.equal(l.alternative.stelle.name, "Kreisverwaltung Mainz-Bingen – Straßenverkehrsbehörde");
  assert.equal(l.alternative.bedingung, TEXTE.bedingung.rpAusserorts);
  assert.equal(l.alternative.kontakt.name, "Kreisverwaltung Mainz-Bingen - Straßenverkehr");
});

test("baueLaender + auswahl: in Schleswig-Holstein das Amt mit dem Kontakt der Gemeinde-Rolle", () => {
  const a = attr();
  a.gemeinden["010585890008"] = {
    ars: "010585890008", gen: "Ascheffel", name: "Gemeinde Ascheffel", land: "SH", tkz: [64], ew: 977,
    kreis: kreis("01058", "Rendsburg-Eckernförde", "Kreis", "ja"),
    verband: { ars: "010585890", gen: "Hüttener Berge", name: "Amt Hüttener Berge" },
  };
  const k = kontakte();
  k.meta.laender.SH = { herausgeber: "8958611", abgerufen: "2026-10-03", region_url: "https://…/region/{ars}" };
  k.gemeinden["010585890008"] = {
    wahl: "passt", stellen: 2,
    kreis: { name: "Kreis Rendsburg-Eckernförde - Der Landrat", adresse: null, telefon: ["+49 4331 202-0"], email: [], web: [] },
    gemeinde: { name: "Amt Hüttener Berge - FD III Ordnungsamt", adresse: null, telefon: ["+49 4356 9949-0"], email: [], web: [] },
  };
  const sh = baueLaender(a, { kontakte: k }).dateien["sh.json"];
  const r = auswahl(sh, "010585890008", ["K"]);
  assert.equal(r.zustaendig.name, "Kreis Rendsburg-Eckernförde – Straßenverkehrsbehörde");
  assert.equal(r.kontakt.name, "Kreis Rendsburg-Eckernförde - Der Landrat");
  assert.equal(r.alternative.stelle.name, "Amt Hüttener Berge – Straßenverkehrsbehörde");
  assert.equal(r.alternative.kontakt.name, "Amt Hüttener Berge - FD III Ordnungsamt");
});

test("baueLaender + auswahl: in Niedersachsen die selbständige Samtgemeinde mit dem Kontakt der Gemeinde-Rolle", () => {
  const a = attr();
  a.gemeinden["034595401030"] = {
    ars: "034595401030", gen: "Quakenbrück", name: "Stadt Quakenbrück", land: "NI", tkz: [63], ew: 14088,
    kreis: kreis("03459", "Osnabrück", "Landkreis", "ja"),
    verband: { ars: "034595401", gen: "Artland", name: "Samtgemeinde Artland" },
  };
  const k = kontakte();
  k.meta.laender.NI = { herausgeber: "8669225", abgerufen: "2026-10-03", region_url: "https://…/region/{ars}" };
  k.gemeinden["034595401030"] = {
    wahl: "fremd", stellen: 2,
    kreis: { name: "Landkreis Osnabrück - Verkehrslenkung", adresse: null, telefon: ["0541 0000-0"], email: [], web: [] },
    gemeinde: { name: "Samtgemeinde Artland - Ordnungsamt", adresse: null, telefon: ["05431 0000-0"], email: [], web: [] },
  };
  const ni = baueLaender(a, { kontakte: k }).dateien["ni.json"];
  const r = auswahl(ni, "034595401030", ["B"]);
  assert.equal(r.zustaendig.name, "Samtgemeinde Artland – Straßenverkehrsbehörde");
  assert.equal(r.kontakt.name, "Samtgemeinde Artland - Ordnungsamt");
  assert.equal(r.alternative, null);
  assert.equal(ni.gemeinden["034595401030"].kontakt, undefined, "der Kreis kommt in keinem Ergebnis vor");
});

test("baueLaender: Kontakte nur im Land mit Abruf, entdoppelt und über Ids verknüpft", () => {
  const ohne = baueLaender(attr());
  const { dateien, index } = baueLaender(attr(), { kontakte: kontakte() });
  const by = dateien["by.json"];
  const id = by.gemeinden["092740128128"].kontakt;
  assert.match(id, /^c[0-9a-f]{8}$/);
  assert.equal(by.kontakte[id].email[0], "verkehr@landkreis-landshut.de");
  assert.equal(by.daten.kontakte, "Bundesportal 02.10.2026");
  assert.ok(by.bundesportal_region.endsWith("/region/{ars}"));
  assert.ok(by.quellen.some((q) => q.id === "bundesportal"));
  assert.deepEqual(index.laender.map((l) => l.kontakte), [3, undefined]);
  assert.ok(index.quellen.some((q) => q.id === "bundesportal"));
  assert.equal(serialisiere(dateien["rp.json"]), serialisiere(ohne.dateien["rp.json"]), "andere Länder unverändert");

  const r = auswahl(by, "092740128128", ["G"]);
  assert.ok(r.bundesportal.endsWith("/herausgeber/BY-1806/region/092740128128"));
  assert.equal(auswahl(ohne.dateien["by.json"], "092740128128", ["G"]).kontakt, null);
  assert.equal(auswahl(ohne.dateien["by.json"], "092740128128", ["G"]).bundesportal, null, "Land nicht im Portal bekannt");
});

test("baueLaender + auswahl: Kontakte aus einer eigenen Quelle des Landes, nur allgemeine Anschrift (Sachsen)", () => {
  const a = attr();
  a.gemeinden["145210010010"] = {
    ars: "145210010010", gen: "Amtsberg", name: "Gemeinde Amtsberg", land: "SN", tkz: [60],
    kreis: kreis("14521", "Erzgebirgskreis", "Landkreis", "nein"),
  };
  const k = kontakte();
  const lds = { id: "lds_sachsen", label: "Gemeindeverzeichnis", lizenz: "dl-de/by-2-0", vermerk: "Landesdirektion Sachsen" };
  k.meta.laender.SN = { abgerufen: "2026-10-05", kurz: "Landesdirektion Sachsen", quelle: lds };
  const rathaus = (name, adresse) => ({ name, adresse, telefon: ["037209 6790"], email: [], web: [], allgemein: true });
  k.gemeinden["145210010010"] = {
    wahl: null, stellen: 0,
    kreis: rathaus("Landratsamt Erzgebirgskreis", "Paulus-Jenisius-Str. 24, 09456 Annaberg-Buchholz"),
    gemeinde: rathaus("Gemeinde Amtsberg", "Poststr. 30, 09439 Amtsberg"),
  };
  const { dateien, index } = baueLaender(a, { kontakte: k });
  const sn = dateien["sn.json"];
  assert.equal(sn.daten.kontakte, "Landesdirektion Sachsen 05.10.2026");
  assert.deepEqual(sn.quellen.at(-1), lds, "Quellenvermerk des Landes");
  assert.equal(sn.bundesportal_region, undefined, "nicht im Bundesportal");
  const r = auswahl(sn, "145210010010", ["G"]);
  assert.equal(r.kontakt.name, "Gemeinde Amtsberg");
  assert.deepEqual(Object.keys(r.kontakt), ["name", "adresse", "telefon", "email", "web", "allgemein"]);
  assert.equal(auswahl(sn, "145210010010", ["K"]).kontakt.name, "Landratsamt Erzgebirgskreis");
  assert.ok(Object.values(dateien["by.json"].kontakte).every((x) => !("allgemein" in x)), "sonst ohne Feld");
  assert.equal(dateien["by.json"].daten.kontakte, "Bundesportal 02.10.2026");
  assert.deepEqual(index.quellen.map((q) => q.id), ["vg25", "bundesportal", "lds_sachsen"], "jede Quelle einmal");
  const land = Object.fromEntries(index.laender.map((l) => [l.lkz, l]));
  assert.deepEqual([land.SN.kontakte, land.SN.allgemein], [1, 1]);
  assert.equal(land.BY.allgemein, undefined);

  // Ein Verzeichnis mit eigenem Stand: der Stand statt des Abrufdatums.
  k.meta.laender.SN = { ...k.meta.laender.SN, stand: "2026-01-31", kurz: "Anschriftenverzeichnis der Statistischen Ämter" };
  const mitStand = baueLaender(a, { kontakte: k }).dateien["sn.json"];
  assert.equal(mitStand.daten.kontakte, "Anschriftenverzeichnis der Statistischen Ämter 31.01.2026");
});

test("baueLaender + auswahl: Berlin – Senat und Bezirksämter mit Kontakten von Hand, ohne Bundesportal", () => {
  const berlin = kreis("11000", "Berlin", "Kreisfreie Stadt", "nein", true);
  const a = attr();
  a.gemeinden["110000000000"] = {
    ars: "110000000000", gen: "Berlin", name: "Berlin", land: "BE", tkz: [61], ew: 3685265, kreis: berlin, bezirk: null,
  };
  a.gemeinden["110000000001"] = {
    ars: "110000000001", gen: "Mitte", name: "Bezirk Mitte", land: "BE", tkz: [], ew: null, kreis: berlin,
    bezirk: { nr: "01", name: "Mitte" },
  };
  const hand = (name, mehr = {}) => ({
    name, adresse: null, telefon: ["(030) 1234-0"], email: [], web: [], quelle: "Webseite der Behörde, Stand 05.10.2026",
    ...mehr,
  });
  const senat = hand("Senatsverwaltung für Mobilität, Verkehr, Klimaschutz und Umwelt", { allgemein: true });
  const vonHand = { id: "von_hand", label: "Kontakte von Hand", lizenz: "–", vermerk: "Kontakt laut Webseite der Behörde" };
  const k = kontakte();
  k.meta.laender.BE = { abgerufen: "2026-10-05", kurz: "Webseiten der Behörden", quelle: vonHand };
  k.gemeinden["110000000000"] = { wahl: null, stellen: 0, kreis: senat, gemeinde: null };
  k.gemeinden["110000000001"] = {
    wahl: null, stellen: 0, kreis: senat, gemeinde: hand("Bezirksamt Mitte - Straßen- und Grünflächenamt"),
  };
  const { dateien, index } = baueLaender(a, { kontakte: k });
  const be = dateien["be.json"];
  assert.equal(be.daten.kontakte, "Webseiten der Behörden 05.10.2026");
  assert.deepEqual(be.quellen.at(-1), vonHand);
  assert.ok(!be.quellen.some((q) => q.id === "bundesportal"), "keine Kontakte aus dem Portal");
  assert.equal(be.bundesportal_region, undefined);
  assert.equal(Object.keys(be.kontakte).length, 2, "der Senat einmal für alle Einträge");
  const land = index.laender.find((l) => l.lkz === "BE");
  assert.deepEqual([land.kontakte, land.allgemein], [2, 1], "ganz Berlin: nur die Zentrale des Senats");
  assert.equal(be.gemeinden["110000000001"].name, "Bezirk Mitte");
  assert.equal(be.gemeinden["110000000001"].ew, undefined);

  const g = auswahl(be, "110000000001", ["G"]);
  assert.equal(g.zustaendig.name, "Bezirksamt Mitte – Straßenverkehrsbehörde");
  assert.equal(g.kontakt.name, "Bezirksamt Mitte - Straßen- und Grünflächenamt");
  assert.equal(g.kontakt.allgemein, undefined);
  assert.equal(g.alternative.kontakt.name, senat.name);
  assert.equal(g.bundesportal, null);
  const b = auswahl(be, "110000000001", ["B"]);
  assert.equal(b.zustaendig.id, "be-senat");
  assert.equal(b.kontakt.allgemein, true);
  const gesamt = be.gemeinden["110000000000"];
  assert.ok(gesamt.kontakt, "Senat auch für ganz Berlin");
  assert.equal(gesamt.kontakt_gemeinde, undefined);
});

test("baueLaender: Link ins Bundesportal für jedes Land, das die Leistung dort führt", () => {
  const k = kontakte();
  k.meta.portal = { RP: "https://verwaltung.bund.de/…/herausgeber/RP-8958611/region/{ars}" };
  const { dateien, index } = baueLaender(attr(), { kontakte: k });
  const rp = dateien["rp.json"];
  assert.equal(rp.bundesportal_region, k.meta.portal.RP, "ohne Kontakte, aber im Portal");
  assert.equal(rp.kontakte, undefined);
  assert.equal(auswahl(rp, "073395001001", ["G"]).bundesportal, "https://verwaltung.bund.de/…/herausgeber/RP-8958611/region/073395001001");
  assert.equal(index.laender.find((l) => l.lkz === "RP").kontakte, undefined);
  assert.equal(auswahl(rp, "073395001001", ["A"]).bundesportal, null, "Autobahn: kein Link");
});

test("baueLaender: Kondominium verweist auf die angrenzende Gemeinde", () => {
  const a = attr();
  a.gemeinden["079395001001"] = {
    ...a.gemeinden["073395001001"], ars: "079395001001", gebietsaenderung: null,
    kondominium: { nachbar: "073395001001" },
  };
  const rp = baueLaender(a).dateien["rp.json"];
  assert.equal(rp.gemeinden["079395001001"].nachbar, "073395001001");
  assert.equal(rp.gemeinden["073395001001"].nachbar, undefined);
  const mitRegion = { ...rp, bundesportal_region: "https://x.example/region/{ars}" };
  assert.equal(auswahl(mitRegion, "079395001001", ["G"]).bundesportal, "https://x.example/region/073395001001");
});

test("baueLaender: Berliner Bezirke als eigene Einträge mit ihrer Nummer", () => {
  const berlin = kreis("11000", "Berlin", "Kreisfreie Stadt", "nein", true);
  const a = attr();
  a.gemeinden["110000000000"] = {
    ars: "110000000000", gen: "Berlin", name: "Berlin", land: "BE", tkz: [61], ew: 3685265, kreis: berlin, bezirk: null,
  };
  a.gemeinden["110000000007"] = {
    ars: "110000000007", gen: "Tempelhof-Schöneberg", name: "Bezirk Tempelhof-Schöneberg", land: "BE", tkz: [],
    ew: null, kreis: berlin, bezirk: { nr: "07", name: "Tempelhof-Schöneberg" },
  };
  const { dateien, index } = baueLaender(a);
  const be = dateien["be.json"];
  assert.equal(be.gemeinden["110000000007"].bezirk, "07");
  assert.equal(be.gemeinden["110000000000"].bezirk, undefined, "ganz Berlin ist kein Bezirk");
  assert.equal(dateien["by.json"].gemeinden["091620000000"].bezirk, undefined);
  assert.deepEqual(index.laender.find((l) => l.lkz === "BE").sicherheit, { belegt: 0, vermutlich: 1, "nur Ebene": 1 });
  assert.equal(auswahl(be, "110000000007", ["G"]).zustaendig.name, "Bezirksamt Tempelhof-Schöneberg – Straßenverkehrsbehörde");
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
