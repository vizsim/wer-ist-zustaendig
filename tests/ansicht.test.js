// SPDX-License-Identifier: AGPL-3.0-or-later
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  antwortHtml, ARTEN, datenBasisAusParam, esc, farbAusdruck, flaechenDeckkraft, flaechenFarbe, klassenAusdruck,
  klassenListe, SICHERHEIT_STIL, strassenAmPunkt, strassenName, teileName,
} from "../js/ansicht.js";

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

test("antwortHtml: Autobahn und kreisfreie Stadt ohne doppelten Ortsnamen", () => {
  const html = antwortHtml({
    zustaendig: { name: "Fernstraßen-Bundesamt – Straßenverkehrsbehörde" }, keinBrief: true,
    gemeinde: "München", kreis: "München", land: "BY", sicherheit: "vermutlich", grund: "g", quelle: "q", hinweise: [],
  }, [], { landName: "Bayern" });
  assert.ok(html.includes("Auf der Autobahn zuständig"));
  assert.ok(html.includes('<p class="ort">München, Bayern</p>'));
});
