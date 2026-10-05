// SPDX-License-Identifier: AGPL-3.0-or-later
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  ALLGEMEIN_HINWEIS, antwortHtml, ARTEN, aufzaehlung, datenBasisAusParam, esc, farbAusdruck, flaechenDeckkraft, flaechenFarbe,
  klassenAusdruck, klassenListe, KONTAKT_STIL, kontaktDeckkraft, kontaktFarbe, SICHERHEIT_STIL, stelleOhneBehoerde,
  strassenAmPunkt, strassenName, teileName, telHref, wegeHtml, willkommenHtml,
} from "../js/ansicht.js";
import { TEXTE } from "../js/resolve.js";

// Mini-Auswerter für die genutzten MapLibre-Ausdrücke – prüft, dass die Darstellung dieselben
// Klassen ergibt wie strassenklasse.js in den eindeutigen Fällen.
function werte(expr, props) {
  if (!Array.isArray(expr)) return expr;
  const [op, ...a] = expr;
  switch (op) {
    case "get": return props[a[0]] ?? null;
    case "coalesce": for (const x of a) { const v = werte(x, props); if (v != null) return v; } return null;
    case "slice": return String(werte(a[0], props)).slice(a[1], a[2]);
    case "==": return werte(a[0], props) === werte(a[1], props);
    case "case": {
      for (let i = 0; i < a.length - 1; i += 2) if (werte(a[i], props)) return werte(a[i + 1], props);
      return werte(a[a.length - 1], props);
    }
    case "match": {
      const v = werte(a[0], props);
      for (let i = 1; i < a.length - 1; i += 2) {
        const labels = Array.isArray(a[i]) ? a[i] : [a[i]];
        if (labels.includes(v)) return werte(a[i + 1], props);
      }
      return werte(a[a.length - 1], props);
    }
    default: throw new Error(`nicht unterstützt: ${op}`);
  }
}

test("klassenAusdruck: Darstellung stimmt in den eindeutigen Fällen mit strassenklasse.js", () => {
  const faelle = [
    [{ highway: "motorway", ref: "A 8" }, "A"],
    [{ highway: "primary", ref: "B 2" }, "B"],
    [{ highway: "primary", ref: "B2" }, "B"],
    [{ highway: "secondary", ref: "L 123" }, "L"],
    [{ highway: "secondary", ref: "St 2345" }, "L"],
    [{ highway: "secondary", ref: "S 177" }, "L"],
    [{ highway: "tertiary", ref: "K 12" }, "K"],
    [{ highway: "tertiary", ref: "DAH 3" }, "K"],
    [{ highway: "residential" }, "G"],
    [{ highway: "tertiary" }, "unklar"],
    [{ highway: "primary", ref: "B 2;St 2068" }, "B"],
  ];
  for (const [props, erwartet] of faelle) assert.equal(werte(klassenAusdruck(), props), erwartet, JSON.stringify(props));
});

test("Farb- und Deckkraft-Ausdrücke decken alle Arten und Sicherheiten ab", () => {
  assert.equal(werte(farbAusdruck(), { highway: "motorway" }), "#005387");
  for (const [art, a] of Object.entries(ARTEN)) assert.equal(werte(flaechenFarbe(), { eg: art }), a.farbe);
  assert.equal(werte(flaechenFarbe(), {}), "#9aa3a8");
  const kreis = flaechenFarbe(["coalesce", ["get", "eg"], ["get", "art"]]);
  assert.equal(werte(kreis, { eg: "gemeinde", art: "kreis" }), ARTEN.gemeinde.farbe, "Kreis nach seinen Gemeinden");
  assert.equal(werte(kreis, { art: "stadt" }), ARTEN.stadt.farbe, "alte Kacheln: Art des Kreises");
  for (const [s, st] of Object.entries(SICHERHEIT_STIL)) assert.equal(werte(flaechenDeckkraft(), { sg: s }), st.deckkraft);
});

test("teileName", () => {
  assert.deepEqual(teileName("Landratsamt Freising – Straßenverkehrsbehörde"),
    { behoerde: "Landratsamt Freising", zusatz: "Straßenverkehrsbehörde" });
  assert.deepEqual(teileName("Stadt X"), { behoerde: "Stadt X", zusatz: "" });
});

test("strassenAmPunkt: entdoppelt, sortiert nach Klasse, mit Land", () => {
  const f = (p) => ({ properties: p });
  const s = strassenAmPunkt([
    f({ name: "Bahnhofstraße", highway: "residential" }),
    f({ name: "Hauptstraße", ref: "B 2", highway: "primary" }),
    f({ name: "Hauptstraße", ref: "B 2", highway: "primary" }),
    f({ ref: "DAH 3", highway: "tertiary" }),
  ], "BY");
  assert.deepEqual(s.map((x) => x.klasse), ["B", "K", "G"]);
  assert.deepEqual(klassenListe(s), ["B", "K", "G"]);
  assert.equal(strassenName(s[0], "BY"), "Hauptstraße (B 2)");
  assert.equal(strassenName(s[1], "BY"), "DAH 3");
  assert.equal(strassenName({ klasse: "G" }, "BY"), "Gemeindestraße ohne Namen");
  assert.deepEqual(strassenAmPunkt(undefined, "BY"), []);
});

test("antwortHtml: escapet Text aus OSM und Daten", () => {
  const r = {
    zustaendig: { name: "Landratsamt <Freising> – Straßenverkehrsbehörde" },
    gemeinde: "Musterdorf", verband: "Verwaltungsgemeinschaft Musterberg", kreis: "Landkreis Freising",
    land: "BY", sicherheit: "nur Ebene", grund: "Grund & mehr", quelle: "Q",
    alternative: { stelle: { name: "Stadt Freising – Straßenverkehrsbehörde" }, bedingung: "falls x" },
    hinweise: ["<script>"], stand: { gebiet: "VG25 31.12.2025" },
    aenderung: { art: "umbenannt", name_neu: "Neu\"dorf" },
  };
  const html = antwortHtml(r, [{ name: "<b>Weg</b>", klasse: "G" }], {
    landName: "Bayern", bundesportal: "https://example.org/?a=1&b=2", hinweis: "Kein Rechtsrat.",
  });
  assert.ok(html.includes("Landratsamt &lt;Freising&gt;"));
  assert.ok(html.includes("&lt;b&gt;Weg&lt;/b&gt;"));
  assert.ok(html.includes("&lt;script&gt;"));
  assert.ok(html.includes("Grund &amp; mehr"));
  assert.ok(html.includes("Neu&quot;dorf"));
  assert.ok(html.includes("marke-nur-ebene"));
  assert.ok(html.includes('<p class="alternative-name"><span>Oder</span>Stadt Freising</p>'));
  assert.ok(html.includes('<p class="alternative-bedingung">Falls x.</p>'));
  assert.ok(html.includes("Musterdorf, Verwaltungsgemeinschaft Musterberg, Landkreis Freising, Bayern"));
  assert.ok(html.includes("Gebietsstand 31.12.2025"));
  assert.ok(html.includes('href="https://example.org/?a=1&amp;b=2"'));
  assert.ok(!html.includes("<script>"));
  assert.equal(esc(null), "");
});

test("antwortHtml: Bundesportal-Link nur mit https", () => {
  const r = { zustaendig: { name: "X" }, gemeinde: "G", sicherheit: "vermutlich", grund: "g", quelle: "q", hinweise: [] };
  assert.ok(!antwortHtml(r, [], { bundesportal: "javascript:alert(1)" }).includes("href"));
  assert.ok(!antwortHtml(r, [], { bundesportal: " https://x" }).includes("href"));
  assert.ok(antwortHtml(r, [], { bundesportal: "https://verwaltung.bund.de/x" }).includes('href="https://verwaltung.bund.de/x"'));
});

test("datenBasisAusParam: nur eigene Quellen, auf localhost jede http(s)-Quelle", () => {
  const seite = "https://vizsim.github.io/wer-ist-zustaendig/#karte=8/50/10";
  const bucket = ["https://tiles.vizsim.de"];
  assert.equal(datenBasisAusParam("./test-daten", seite, bucket), "https://vizsim.github.io/wer-ist-zustaendig/test-daten/");
  assert.equal(datenBasisAusParam("https://tiles.vizsim.de/file/x/zust?a=1", seite, bucket), "https://tiles.vizsim.de/file/x/zust/");
  assert.equal(datenBasisAusParam("https://evil.example/", seite, bucket), null);
  assert.equal(datenBasisAusParam("javascript:alert(1)", seite, bucket), null);
  assert.equal(datenBasisAusParam("http://tiles.vizsim.de/", seite, bucket), null);
  assert.equal(datenBasisAusParam("http://127.0.0.1:9000/daten", "http://localhost:8080/", bucket), "http://127.0.0.1:9000/daten/");
  assert.equal(datenBasisAusParam("data:text/plain,x", "http://localhost:8080/", bucket), null);
});

test("telHref: Ländervorwahl, sonst null", () => {
  assert.equal(telHref("03606 650-3610"), "tel:+4936066503610");
  assert.equal(telHref("+49 3641 49-5360"), "tel:+493641495360");
  assert.equal(telHref("0049 361 655"), "tel:+49361655");
  assert.equal(telHref("(0361) 655-4330"), "tel:+493616554330");
  assert.equal(telHref("Zentrale"), null);
  assert.equal(telHref("123"), null);
  assert.equal(telHref(undefined), null);
});

test("wegeHtml: Anrufen, E-Mail und Webseite als Buttons, nur sichere", () => {
  const html = wegeHtml({
    telefon: ["03606 650-3610"], email: ["strassenverkehrsamt@kreis-eic.de"], web: ["https://www.kreis-eic.de/verkehr"],
  });
  assert.ok(html.includes('href="tel:+4936066503610"><span>Anrufen</span> 03606 650-3610</a>'));
  assert.ok(html.includes('href="mailto:strassenverkehrsamt@kreis-eic.de"><span>E-Mail</span>'));
  assert.ok(html.includes('href="https://www.kreis-eic.de/verkehr" target="_blank" rel="noopener"><span>Webseite</span> kreis-eic.de</a>'));
  const boese = wegeHtml({
    telefon: ["javascript:alert(1)"], email: ["a@b.de?bcc=c@d.de", "x\"onclick@y.de"], web: ["javascript:alert(1)", "data:text/html,x"],
  });
  assert.equal(boese, "", "kein sicherer Weg → nichts");
  assert.equal(wegeHtml(null), "");
});

test("stelleOhneBehoerde", () => {
  assert.equal(stelleOhneBehoerde("Landratsamt Eichsfeld - Amt für Ordnung", "Landratsamt Eichsfeld"), "Amt für Ordnung");
  assert.equal(stelleOhneBehoerde("Gewerbe und Verkehr", "Landratsamt Weimarer Land"), "Gewerbe und Verkehr");
  assert.equal(stelleOhneBehoerde("Landratsamt Landshut", "Landratsamt Landshut"), "");
});

const BASIS = {
  gemeinde: "Leinefelde-Worbis", land: "TH", sicherheit: "vermutlich", grund: "g", quelle: "q", hinweise: [],
  stand: { kontakte: "Bundesportal 02.10.2026" },
};

test("antwortHtml: vorn Behörde, Stelle, Anschrift und Wege; Sicherheit und Quellen eingeklappt", () => {
  const html = antwortHtml({
    ...BASIS, zustaendig: { name: "Landratsamt Eichsfeld – Straßenverkehrsbehörde" },
    kontakt: {
      name: "Landratsamt Eichsfeld - Amt für Öffentliche Sicherheit und Ordnung",
      adresse: "Aegidienstraße 24, 37308 <Heilbad> Heiligenstadt", telefon: ["03606 650-3610"],
    },
  }, [], { landName: "Thüringen" });
  assert.ok(html.includes('<h2 class="schild-behoerde">Landratsamt Eichsfeld</h2>'));
  assert.ok(html.includes('<p class="schild-zusatz">Amt für Öffentliche Sicherheit und Ordnung</p>'));
  assert.ok(html.includes("37308 &lt;Heilbad&gt; Heiligenstadt"));
  assert.ok(html.indexOf('class="wege"') < html.indexOf("</div>"), "Wege im Kopf");
  assert.ok(html.indexOf('<details class="details">') > html.indexOf('class="ort"'));
  assert.ok(html.indexOf("Kontaktdaten: Bundesportal 02.10.2026") > html.indexOf("<details"));
});

test("antwortHtml: ohne Kontakt ist der Bundesportal-Link der Weg", () => {
  const html = antwortHtml({
    ...BASIS, zustaendig: { name: "Kreisverwaltung Mainz-Bingen – Straßenverkehrsbehörde" }, kontakt: null,
  }, [], { bundesportal: "https://verwaltung.bund.de/x" });
  assert.ok(html.includes("<span>Kontakt</span> im Bundesportal ansehen"));
  assert.ok(html.includes('<p class="schild-zusatz">Straßenverkehrsbehörde</p>'));
  assert.ok(!html.includes("Kontaktdaten:"));
});

test("antwortHtml: Land nicht im Bundesportal – Hinweis statt Link ins Leere", () => {
  const html = antwortHtml({
    ...BASIS, land: "BE", zustaendig: { name: "Bezirksamt (Berlin) – Straßenverkehrsbehörde" }, kontakt: null,
  }, [], { landName: "Berlin" });
  assert.ok(html.includes('<p class="schild-hinweis">Kontaktdaten für Berlin haben wir noch nicht.</p>'));
  assert.ok(!html.includes("Bundesportal"));
  const saar = antwortHtml({ ...BASIS, land: "SL", zustaendig: { name: "Landkreis Saarlouis – Straßenverkehrsbehörde" }, kontakt: null }, [], { landName: "Saarland" });
  assert.ok(saar.includes("Kontaktdaten für das Saarland haben wir noch nicht."));
  const autobahn = antwortHtml({ ...BASIS, keinBrief: true, zustaendig: { name: "Fernstraßen-Bundesamt – Straßenverkehrsbehörde" } }, []);
  assert.ok(!autobahn.includes("schild-hinweis"), "Autobahn: kein Hinweis");
});

test("antwortHtml: Alternative mit Bedingung und eigenem Kontakt; Herkunft je Quelle einmal", () => {
  const html = antwortHtml({
    ...BASIS, land: "BY", zustaendig: { name: "Landratsamt Altötting – Straßenverkehrsbehörde" },
    kontakt: { name: "Landratsamt Altötting - Verkehrswesen", telefon: ["+49 8671 502-0"], quelle: "Webseite der Behörde, Stand 03.10.2026" },
    alternative: {
      stelle: { name: "Gemeinde Marktl – Straßenverkehrsbehörde" },
      bedingung: TEXTE.bedingung.gemeindestrasse,
      kontakt: { name: "Markt Marktl - Ordnungsamt", telefon: ["08678 9888-0"] },
    },
  }, [{ name: "Marktler Straße", klasse: "K" }], { landName: "Bayern" });
  assert.ok(html.includes('<p class="schild-zusatz">Verkehrswesen</p>'));
  assert.ok(html.indexOf('class="alternative"') > html.indexOf('class="schild-behoerde"'));
  assert.ok(html.includes('<span>Oder</span>Gemeinde Marktl</p>'));
  assert.ok(html.includes("Falls nur die Gemeindestraße betroffen ist."));
  assert.ok(html.includes('<p class="alternative-stelle">Markt Marktl - Ordnungsamt</p>'));
  assert.ok(html.includes('href="tel:+49867898880"'), "Wege der Alternative");
  assert.ok(html.includes("Marktler Straße (Kreisstraße) · "));
  assert.ok(html.includes("Kontaktdaten: Webseite der Behörde, Stand 03.10.2026."));
  assert.equal(html.split("Kontaktdaten: Bundesportal 02.10.2026").length - 1, 1);
});

test("antwortHtml: allgemeine Anschrift der Verwaltung mit Hinweis, auch bei der Alternative", () => {
  const rathaus = {
    name: "Gemeinde Amtsberg", adresse: "Poststr. 30, 09439 Amtsberg", telefon: ["037209 6790"],
    email: ["info@amtsberg.eu"], web: [], allgemein: true,
  };
  const html = antwortHtml({
    ...BASIS, gemeinde: "Amtsberg", land: "SN", stand: { kontakte: "Landesdirektion Sachsen 05.10.2026" },
    zustaendig: { name: "Gemeinde Amtsberg – Straßenverkehrsbehörde" }, kontakt: rathaus,
  }, [], { landName: "Sachsen" });
  assert.ok(html.includes('<p class="schild-zusatz">Straßenverkehrsbehörde</p>'), "die Stelle, nach der man fragt");
  assert.ok(html.includes(`<p class="schild-hinweis">${ALLGEMEIN_HINWEIS}</p>`));
  assert.ok(html.indexOf(ALLGEMEIN_HINWEIS) > html.indexOf('class="wege"'), "unter den Wegen");
  assert.ok(html.includes("Kontaktdaten: Landesdirektion Sachsen 05.10.2026."));

  const alt = antwortHtml({
    ...BASIS, land: "SN", zustaendig: { name: "Landratsamt Erzgebirgskreis – Straßenverkehrsbehörde" },
    kontakt: { name: "Landratsamt Erzgebirgskreis - Straßenverkehrsamt", telefon: ["03733 831-0"] },
    alternative: {
      stelle: { name: "Gemeinde Amtsberg – Straßenverkehrsbehörde" }, bedingung: TEXTE.bedingung.gemeindestrasse,
      kontakt: rathaus,
    },
  }, []);
  assert.equal(alt.split(ALLGEMEIN_HINWEIS).length - 1, 1, "nur bei der Alternative");
  assert.ok(alt.indexOf(ALLGEMEIN_HINWEIS) > alt.indexOf('class="alternative"'));
  const eigen = antwortHtml({ ...BASIS, zustaendig: { name: "X – Straßenverkehrsbehörde" }, kontakt: { ...rathaus, allgemein: undefined } }, []);
  assert.ok(!eigen.includes(ALLGEMEIN_HINWEIS), "Kontakt der Stelle selbst: kein Hinweis");
});

test("antwortHtml: Alternative ohne Kontakt nur mit Name und Bedingung", () => {
  const html = antwortHtml({
    ...BASIS, zustaendig: { name: "Landratsamt Esslingen – Straßenverkehrsbehörde" },
    alternative: { stelle: { name: "Stadt Esslingen am Neckar – Straßenverkehrsbehörde" }, bedingung: TEXTE.bedingung.gks, kontakt: null },
  }, []);
  assert.ok(html.includes('<span>Oder</span>Stadt Esslingen am Neckar</p>'));
  assert.ok(html.includes("Große Kreisstadt – sie kann selbst zuständig sein."));
  assert.ok(!html.includes("alternative-stelle"));
  assert.equal(html.split('class="wege"').length - 1, 0, "keine Wege ohne Kontakt");
});

test("antwortHtml: ohne Bedienhinweis „Keine Straße erkannt\"", () => {
  const html = antwortHtml({
    ...BASIS, zustaendig: { name: "X – Straßenverkehrsbehörde" },
    hinweise: [TEXTE.hinweis.keineStrasse, TEXTE.hinweis.autobahnDabei],
  }, []);
  assert.ok(!html.includes("Keine Straße erkannt"));
  assert.ok(html.includes(TEXTE.hinweis.autobahnDabei));
});

test("antwortHtml: Autobahn und kreisfreie Stadt ohne doppelten Ortsnamen", () => {
  const html = antwortHtml({
    zustaendig: { name: "Fernstraßen-Bundesamt – Straßenverkehrsbehörde" }, keinBrief: true,
    gemeinde: "München", kreis: "München", land: "BY", sicherheit: "vermutlich", grund: "g", quelle: "q", hinweise: [],
  }, [], { landName: "Bayern" });
  assert.ok(html.includes("Auf der Autobahn zuständig"));
  assert.ok(html.includes('<p class="ort">München, Bayern</p>'));
});

test("willkommenHtml: Stand aus index.json – geprüft, vermutlich, offen; Kontakte; Melden nur https", () => {
  const index = {
    laender: [
      { lkz: "BY", name: "Bayern", sicherheit: { belegt: 2056, vermutlich: 165, "nur Ebene": 0 }, kontakte: 2221 },
      { lkz: "HH", name: "Hamburg", sicherheit: { belegt: 0, vermutlich: 0, "nur Ebene": 1 } },
      { lkz: "SH", name: "Schleswig-Holstein", sicherheit: { belegt: 1101, vermutlich: 5, "nur Ebene": 0 }, kontakte: 1106 },
      { lkz: "TH", name: "Thüringen", sicherheit: { belegt: 0, vermutlich: 605, "nur Ebene": 0 }, kontakte: 605 },
      { lkz: "BW", name: "Baden-Württemberg", sicherheit: { belegt: 0, vermutlich: 11, "nur Ebene": 1092 } },
    ],
  };
  const html = willkommenHtml(index, { melden: "https://github.com/vizsim/wer-ist-zustaendig/issues/new" });
  assert.ok(html.includes('<h2 id="willkommen-titel">Testversion</h2>'));
  assert.ok(html.includes("<strong>Geprüft:</strong> Bayern und Schleswig-Holstein"));
  assert.ok(html.includes("<strong>Vermutlich:</strong> Thüringen – die Regel ist nicht für jede Gemeinde gesichert."));
  assert.ok(html.includes("die übrigen 2 Länder"));
  assert.ok(html.includes("gibt es bisher für Bayern, Schleswig-Holstein und Thüringen."));
  assert.ok(html.includes("kein Rechtsrat"));
  assert.ok(html.includes('href="https://github.com/vizsim/wer-ist-zustaendig/issues/new"'));

  const ohne = willkommenHtml(null, { melden: "javascript:alert(1)" });
  assert.ok(ohne.includes("Erst wenige Länder haben eine eigene Regel"));
  assert.ok(!ohne.includes("href"), "Meldelink nur mit https");
  const eins = willkommenHtml({ laender: [index.laender[0], index.laender[1]] });
  assert.ok(eins.includes("das übrige Land"));
  const bb = { lkz: "BB", name: "Brandenburg", sicherheit: { belegt: 413, vermutlich: 0, "nur Ebene": 0 }, kontakte: 19 };
  const sortiert = willkommenHtml({ laender: [bb, index.laender[0]] });
  assert.ok(sortiert.includes("<strong>Geprüft:</strong> Bayern und Brandenburg"), "nach Namen, nicht nach Kürzel");
  assert.ok(sortiert.includes("gibt es bisher für Bayern und Brandenburg."));
});

test("willkommenHtml: Länder, für die es nur die allgemeine Anschrift gibt, eigens", () => {
  const by = { lkz: "BY", name: "Bayern", sicherheit: { belegt: 2221, vermutlich: 0, "nur Ebene": 0 }, kontakte: 2221 };
  const sn = { lkz: "SN", name: "Sachsen", sicherheit: { belegt: 418, vermutlich: 0, "nur Ebene": 0 }, kontakte: 418, allgemein: 418 };
  assert.ok(willkommenHtml({ laender: [sn, by] })
    .includes("gibt es bisher für Bayern, für Sachsen die allgemeine Anschrift der Verwaltung.</p>"));
  assert.ok(willkommenHtml({ laender: [sn] }).includes("<p>Für Sachsen gibt es bisher die allgemeine Anschrift der Verwaltung.</p>"));
  const teils = { ...sn, allgemein: 100 };
  assert.ok(willkommenHtml({ laender: [by, teils] }).includes("gibt es bisher für Bayern und Sachsen.</p>"), "teils eigene Kontakte");
});

test("aufzaehlung: Komma, vor dem letzten Namen „und“", () => {
  assert.equal(aufzaehlung([]), "");
  assert.equal(aufzaehlung(["Bayern"]), "Bayern");
  assert.equal(aufzaehlung(["Bayern", "Thüringen"]), "Bayern und Thüringen");
  assert.equal(aufzaehlung(["Bayern", "Brandenburg", "Thüringen"]), "Bayern, Brandenburg und Thüringen");
});

test("kontaktFarbe, kontaktDeckkraft: je Kontaktstatus; Kacheln ohne Feld wie „noch kein Kontakt“", () => {
  assert.deepEqual(Object.keys(KONTAKT_STIL), ["k", "t", "a", "p", "n"], "Werte des Felds ko (docs/VERTRAG.md)");
  for (const [ko, st] of Object.entries(KONTAKT_STIL)) {
    assert.equal(werte(kontaktFarbe(), { ko }), st.farbe, ko);
    assert.equal(werte(kontaktDeckkraft(), { ko }), st.deckkraft, ko);
  }
  assert.equal(werte(kontaktFarbe(), {}), KONTAKT_STIL.n.farbe);
  assert.equal(werte(kontaktDeckkraft(), { ko: "x" }), KONTAKT_STIL.n.deckkraft);
  assert.equal(werte(kontaktFarbe(["get", "kk"]), { kk: "p" }), KONTAKT_STIL.p.farbe, "anderes Feld");
});
