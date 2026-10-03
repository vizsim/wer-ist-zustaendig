// SPDX-License-Identifier: AGPL-3.0-or-later
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  antwortHtml, ARTEN, datenBasisAusParam, esc, farbAusdruck, flaechenDeckkraft, flaechenFarbe, klassenAusdruck,
  klassenListe, SICHERHEIT_STIL, stelleOhneBehoerde, strassenAmPunkt, strassenName, teileName, telHref, wegeHtml,
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
  assert.ok(html.includes("Oder:</span> Stadt Freising, falls x."));
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
  assert.ok(html.includes("<span>Kontakt</span> im Bundesportal suchen"));
  assert.ok(html.includes('<p class="schild-zusatz">Straßenverkehrsbehörde</p>'));
  assert.ok(!html.includes("Kontaktdaten:"));
});

test("antwortHtml: abweichende Stelle aus dem Portal steht vorn, mit Hinweis auf unsere Regel", () => {
  const html = antwortHtml({
    ...BASIS, zustaendig: { name: "Landratsamt Weimarer Land – Straßenverkehrsbehörde" },
    kontakt: { name: "Stadtverwaltung Apolda - Straßenverkehrsbehörde", telefon: ["03644 65036"], abweichend: true },
  }, []);
  assert.ok(html.includes('<h2 class="schild-behoerde">Stadtverwaltung Apolda</h2>'));
  assert.ok(html.includes("Nach unserer Regel wäre sonst Landratsamt Weimarer Land zuständig."));
});

test("antwortHtml: Gemeinde für Gemeindestraßen unter dem Kopf; Herkunft je Quelle einmal", () => {
  const html = antwortHtml({
    ...BASIS, land: "BY", zustaendig: { name: "Landratsamt Altötting – Straßenverkehrsbehörde" },
    kontakt: { name: "Landratsamt Altötting - Verkehrswesen", telefon: ["+49 8671 502-0"], quelle: "Webseite der Behörde, Stand 03.10.2026" },
    kontaktGemeinde: { name: "Stadt Burghausen", telefon: ["08677 887-0"] },
  }, [{ name: "Marktler Straße", klasse: "G" }], { landName: "Bayern" });
  assert.ok(html.includes('<p class="schild-zusatz">Verkehrswesen</p>'));
  assert.ok(html.includes("Geht es nur um eine Gemeindestraße, ist oft die Gemeinde selbst zuständig:"));
  assert.ok(html.indexOf("Stadt Burghausen</p>") > html.indexOf('class="schild-behoerde"'));
  assert.ok(html.includes("Marktler Straße (Gemeindestraße) · "));
  assert.ok(html.includes("Kontaktdaten: Webseite der Behörde, Stand 03.10.2026."));
  assert.equal(html.split("Kontaktdaten: Bundesportal 02.10.2026").length - 1, 1);
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
