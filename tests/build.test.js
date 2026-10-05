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

test("baueLaender: Kontakt der Gemeinde nur, wo sie zuständig sein kann", () => {
  // Baden-Württemberg hat (noch) keine Landesregel: Rückfall auf die Kreisebene. Im Bundesportal
  // führt es die Leistung nicht – die Portaldaten sind hier erfunden, um den Rückfall zu prüfen.
  const a = attr();
  a.gemeinden["081155001001"] = {
    ars: "081155001001", gen: "Musterort", name: "Gemeinde Musterort", land: "BW",
    kreis: kreis("08115", "Böblingen", "Landkreis", "ja"),
    verband: { ars: "081155001", name: "Gemeindeverwaltungsverband Musterheide" },
  };
  const k = kontakte();
  k.meta.laender = { BW: { ...k.meta.laender.BY, herausgeber: "8958612" } };
  k.gemeinden = { "081155001001": { ...k.gemeinden["092740128128"] } };
  const bw = baueLaender(a, { kontakte: k }).dateien["bw.json"];
  const eintrag = bw.gemeinden["081155001001"];
  assert.equal(bw.kontakte[eintrag.kontakt].name, "Landratsamt Landshut - Verkehrswesen");
  assert.equal(eintrag.kontakt_gemeinde, undefined, "Rückfall Phase 1: nur die Kreisebene");

  k.gemeinden["081155001001"].wahl = "stvb";
  const stvb = baueLaender(a, { kontakte: k }).dateien["bw.json"];
  const r = auswahl(stvb, "081155001001", ["G"]);
  assert.equal(r.kontakt.name, "Landratsamt Landshut - Verkehrswesen");
  assert.equal(r.alternative.stelle.id, "g081155001001", "Portal nennt die Gemeinde");
  assert.equal(r.alternative.kontakt.name, "Markt Essenbach");
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

test("baueLaender: prüft Schema, Schlüssel und Land", () => {
  assert.throws(() => baueLaender({ ...attr(), schema: 2 }), /schema/);
  const a = attr();
  a.gemeinden["091620000000"].land = "BW";
  assert.throws(() => baueLaender(a), /passt nicht zu Land/);
  const b = attr();
  b.gemeinden["091620000001"] = b.gemeinden["091620000000"];
  assert.throws(() => baueLaender(b), /Schlüssel/);
});
