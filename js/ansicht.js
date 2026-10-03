// ansicht.js — reine Helfer für die Karte: Farben, Stil-Ausdrücke, Text und HTML der Antwort.
// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Kein DOM, kein `window`: alles hier ist in Node testbar (tests/ansicht.test.js). main.js
// verdrahtet nur Karte und Seite.

import { klasse, klassenName, RANG } from "./strassenklasse.js";
import { LANDESREGELN, SICHERHEIT, TEXTE } from "./resolve.js";

// Farben nach den RAL-Verkehrsfarben: Verkehrsblau (Autobahn-Schilder), Verkehrsgelb
// (Bundesstraßen-Schilder), Verkehrsschwarz für Schrift. Die Flächenfarben sind gedämpft,
// damit die Straßen lesbar bleiben.
export const FARBE = Object.freeze({
  tinte: "#26282b",
  grau: "#5b6166",
  blau: "#005387",
  gelb: "#f2b300",
  gelbRand: "#7a5c00",
  landesstrasse: "#3d4a52",
  kreisstrasse: "#6f7b83",
  gemeindestrasse: "#a7b0b6",
});

/** Art der Stelle für Gemeindestraßen (Feld `eg` in den Kacheln) → Legende und Flächenfarbe. */
export const ARTEN = Object.freeze({
  kreis: { label: "Kreis (Landratsamt, Kreisverwaltung)", farbe: "#5b8db8" },
  stadt: { label: "Stadt (kreisfrei oder selbst zuständig)", farbe: "#e0a100" },
  stadtstaat: { label: "Stadtstaat", farbe: "#7e6ba8" },
  gemeinde: { label: "Gemeinde selbst", farbe: "#3f8f5a" },
  verband: { label: "Gemeindeverband", farbe: "#2e8a8a" },
});

/** Sicherheit (Feld `sg`) → Deckkraft der Fläche; „nur Ebene" zusätzlich schraffiert. */
export const SICHERHEIT_STIL = Object.freeze({
  belegt: { deckkraft: 0.42, schraffur: false, label: "belegt", text: "Regel an der Primärquelle geprüft" },
  vermutlich: {
    deckkraft: 0.26, schraffur: false, label: "vermutlich",
    text: "Regel belegt oder vom Land im Bundesportal bestätigt",
  },
  "nur Ebene": {
    deckkraft: 0.12, schraffur: true, label: "nur Ebene",
    text: "Landesregel noch nicht eingearbeitet",
  },
});

export const STRASSEN_LEGENDE = Object.freeze([
  ["A", FARBE.blau],
  ["B", FARBE.gelb],
  ["L", FARBE.landesstrasse],
  ["K", FARBE.kreisstrasse],
  ["G", FARBE.gemeindestrasse],
]);

const ZIFFERN = [..."0123456789"];

/**
 * MapLibre-Ausdruck → Klasse („A" … „G", „unklar") aus `highway` und `ref`.
 * Näherung für die Darstellung (ohne Land): Kfz-Kürzel zählen als Kreisstraße. Die Auskunft per
 * Klick rechnet genau mit strassenklasse.js.
 */
export function klassenAusdruck() {
  const ref = ["coalesce", ["get", "ref"], ""];
  const anfang = ["slice", ref, 0, 2];
  return [
    "case",
    ["match", ["get", "highway"], ["motorway", "motorway_link"], true, false], "A",
    ["==", ref, ""],
    ["match", ["get", "highway"], ["residential", "living_street", "unclassified", "service"], "G", "unklar"],
    [
      "match", anfang,
      ["B ", ...ZIFFERN.map((z) => `B${z}`)], "B",
      ["L ", ...ZIFFERN.map((z) => `L${z}`), "St", "S "], "L",
      "K",
    ],
  ];
}

/** MapLibre-Ausdruck → Linienfarbe je Klasse. */
export function farbAusdruck() {
  return [
    "match", klassenAusdruck(),
    "A", FARBE.blau,
    "B", FARBE.gelb,
    "L", FARBE.landesstrasse,
    "K", FARBE.kreisstrasse,
    FARBE.gemeindestrasse,
  ];
}

/**
 * MapLibre-Ausdruck → Flächenfarbe je Art der Stelle.
 * @param {Array} art Ausdruck für die Art; Default das Feld `eg`
 */
export function flaechenFarbe(art = ["get", "eg"]) {
  const paare = Object.entries(ARTEN).flatMap(([a, x]) => [a, x.farbe]);
  return ["match", ["coalesce", art, ""], ...paare, "#9aa3a8"];
}

/** MapLibre-Ausdruck → Deckkraft je Sicherheit. */
export function flaechenDeckkraft() {
  const paare = Object.entries(SICHERHEIT_STIL).flatMap(([s, st]) => [s, st.deckkraft]);
  return ["match", ["coalesce", ["get", "sg"], ""], ...paare, 0.08];
}

/** „Landratsamt Freising – Straßenverkehrsbehörde" → { behoerde, zusatz }. */
export function teileName(name) {
  const s = String(name ?? "");
  const i = s.lastIndexOf(" – ");
  return i < 0 ? { behoerde: s, zusatz: "" } : { behoerde: s.slice(0, i), zusatz: s.slice(i + 3) };
}

/**
 * Straßen aus Kachel-Features am Klickpunkt: einmalig je Name/Nummer/Typ, höchste Klasse zuerst.
 * @param {Array<{properties: object}>} features
 * @param {string|null} land Länderkürzel für die genaue Klasse
 */
export function strassenAmPunkt(features, land) {
  const gesehen = new Map();
  for (const f of features ?? []) {
    const p = f?.properties ?? {};
    const ref = p.ref ? String(p.ref) : null;
    const highway = p.highway ? String(p.highway) : null;
    const name = p.name ? String(p.name) : null;
    const schluessel = `${name}|${ref}|${highway}`;
    if (!gesehen.has(schluessel)) gesehen.set(schluessel, { name, ref, highway, klasse: klasse({ ref, highway }, land) });
  }
  return [...gesehen.values()].sort(
    (a, b) => RANG[b.klasse] - RANG[a.klasse] || String(a.name ?? a.ref).localeCompare(String(b.name ?? b.ref), "de"),
  );
}

/** Klassen einer Straßenliste, ohne Doppelte. */
export function klassenListe(strassen) {
  return [...new Set((strassen ?? []).map((s) => s.klasse))];
}

/** „Hauptstraße (B 2)" bzw. „B 2" bzw. „Gemeindestraße ohne Namen". */
export function strassenName(s, land) {
  if (s.name && s.ref) return `${s.name} (${s.ref})`;
  if (s.name) return s.name;
  if (s.ref) return s.ref;
  return `${klassenName(s.klasse, land)} ohne Namen`;
}

const ESC = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };

/** Für Text aus OSM und Daten: immer escapen, bevor es in HTML landet. */
export function esc(s) {
  return String(s ?? "").replace(/[&<>"']/g, (c) => ESC[c]);
}

/**
 * Basis aus `?daten=<url>` – nur für eigene Quellen, sonst null. Ein geteilter Link soll keine
 * fremden Auskünfte unter der Adresse der Karte zeigen können.
 * @param {string} param Wert von `?daten=`
 * @param {string} seite Adresse der Karte (location.href)
 * @param {string[]} erlaubt weitere erlaubte Ursprünge (Bucket); auf localhost gilt jede http(s)-Quelle
 * @returns {string|null} absolute Basis mit „/" am Ende
 */
export function datenBasisAusParam(param, seite, erlaubt = []) {
  let u;
  try {
    u = new URL(param, seite);
  } catch {
    return null;
  }
  if (u.protocol !== "https:" && u.protocol !== "http:") return null;
  const s = new URL(seite);
  const lokal = ["localhost", "127.0.0.1"].includes(s.hostname);
  if (!lokal && u.origin !== s.origin && !erlaubt.includes(u.origin)) return null;
  return `${u.origin}${u.pathname.replace(/\/?$/, "/")}`;
}

/** Telefonnummer → `tel:`-Link mit Ländervorwahl, oder null, wenn sie nicht nach einer aussieht. */
export function telHref(nummer) {
  const z = String(nummer ?? "").replace(/[^\d+]/g, "");
  if (/^\+\d{6,}$/.test(z)) return `tel:${z}`;
  if (/^00\d{6,}$/.test(z)) return `tel:+${z.slice(2)}`;
  if (/^0\d{5,}$/.test(z)) return `tel:+49${z.slice(1)}`;
  return null;
}

// Keine Zeichen, mit denen sich einem mailto: Betreff oder Empfänger anhängen ließen.
const EMAIL_RE = /^[^\s@<>"'?&]+@[^\s@<>"'?&]+\.[A-Za-z]{2,}$/;

function webUrl(adresse) {
  try {
    const u = new URL(adresse);
    return u.protocol === "https:" || u.protocol === "http:" ? u : null;
  } catch {
    return null;
  }
}

/**
 * Kontaktwege als Buttons: Anrufen, E-Mail, Webseite – nur, was sich sicher verlinken lässt.
 * @param {{telefon?: string[], email?: string[], web?: string[]}|null} k
 * @returns {string} Liste oder "", wenn es keinen Weg gibt
 */
export function wegeHtml(k) {
  if (!k) return "";
  const tel = (k.telefon ?? []).map((t) => [t, telHref(t)]).find(([, h]) => h);
  const mail = (k.email ?? []).find((m) => EMAIL_RE.test(m));
  const web = (k.web ?? []).map(webUrl).find(Boolean);
  const wege = [
    tel && `<li><a class="weg" href="${esc(tel[1])}"><span>Anrufen</span> ${esc(tel[0])}</a></li>`,
    mail && `<li><a class="weg" href="mailto:${esc(mail)}"><span>E-Mail</span> ${esc(mail)}</a></li>`,
    web && `<li><a class="weg" href="${esc(web.href)}" target="_blank" rel="noopener"><span>Webseite</span> ` +
      `${esc(web.hostname.replace(/^www\./, ""))}</a></li>`,
  ].filter(Boolean);
  return wege.length ? `<ul class="wege">${wege.join("")}</ul>` : "";
}

/** „Landratsamt Eichsfeld - Amt für Ordnung" ohne die Behörde davor → „Amt für Ordnung". */
export function stelleOhneBehoerde(name, behoerde) {
  const n = String(name ?? "").trim();
  const b = String(behoerde ?? "").trim();
  if (b && n.toLowerCase().startsWith(b.toLowerCase())) return n.slice(b.length).replace(/^[\s:,–-]+/, "");
  return n;
}

/** „falls es eine Gemeindestraße ist" → „Falls es eine Gemeindestraße ist." */
function satz(s) {
  const t = String(s ?? "").trim();
  return t ? `${t[0].toUpperCase()}${t.slice(1)}${/[.!?]$/.test(t) ? "" : "."}` : "";
}

/** Herkunft eines Kontakts: eigene (von Hand ergänzt) oder der Datenstand des Portals. */
function herkunft(k, stand) {
  return k ? k.quelle ?? stand?.kontakte ?? null : null;
}

/**
 * HTML der Antwortkarte. Vorn steht, wen man anspricht: Behörde, Stelle, Anschrift und die
 * Kontaktwege; darunter, falls es eine gibt, die Alternative mit Bedingung und eigenem Kontakt
 * (in Bayern etwa die Gemeinde für Gemeindestraßen). Wie sicher die Auskunft ist, warum und
 * woher, steht eingeklappt unter „Wie sicher ist das?".
 * @param {object} r Ergebnis von resolve.auswahl()
 * @param {object[]} strassen Ergebnis von strassenAmPunkt()
 * @param {{landName: string, bundesportal?: string, hinweis?: string}} opts
 */
export function antwortHtml(r, strassen, { landName, bundesportal, hinweis } = {}) {
  const schild = teileName(r.zustaendig?.name);
  const k = r.kontakt;
  // Escapen allein hält „javascript:" nicht auf: nur https-Links.
  const portal = /^https:\/\//i.test(String(bundesportal ?? "")) ? bundesportal : null;

  const stelleZeile = (k && stelleOhneBehoerde(k.name, schild.behoerde)) || schild.zusatz;
  // Ohne eigenen Kontakt: die Seite der Gemeinde im Bundesportal, wo das Land die Leistung dort
  // führt – sonst ehrlich ein Hinweis statt eines Links ins Leere.
  let wege = wegeHtml(k);
  if (!wege && !r.keinBrief) {
    wege = portal
      ? `<ul class="wege"><li><a class="weg" href="${esc(portal)}" target="_blank" rel="noopener">` +
        "<span>Kontakt</span> im Bundesportal ansehen</a></li></ul>"
      : `<p class="schild-hinweis">Kontaktdaten${landName ? ` für ${esc(landName)}` : ""} haben wir noch nicht.</p>`;
  }

  const a = r.alternative;
  const altBehoerde = teileName(a?.stelle?.name).behoerde;
  const altStelle = a?.kontakt ? stelleOhneBehoerde(a.kontakt.name, altBehoerde) : "";
  const alternative = a ? `
    <div class="alternative">
      <p class="alternative-name"><span>Oder</span>${esc(altBehoerde)}</p>
      <p class="alternative-bedingung">${esc(satz(a.bedingung))}</p>
      ${altStelle ? `<p class="alternative-stelle">${esc(altStelle)}</p>` : ""}
      ${wegeHtml(a.kontakt)}
    </div>` : "";

  const s = strassen?.[0];
  const strasse = s ? `${esc(strassenName(s, r.land))} (${esc(klassenName(s.klasse, r.land))}) · ` : "";
  const ort = [r.gemeinde, r.verband, r.kreis && r.kreis !== r.gemeinde ? r.kreis : null, landName]
    .filter(Boolean).map(esc).join(", ");
  // Bedienhinweise wie „Keine Straße erkannt" braucht die Karte nicht mehr: Sie antwortet auch ohne Straße.
  const hinweise = (r.hinweise ?? []).filter((h) => h !== TEXTE.hinweis.keineStrasse)
    .map((h) => `<li>${esc(h)}</li>`).join("");
  const aenderung = r.aenderung
    ? `<p class="aenderung">Gebietsänderung seit dem Datenstand: ${esc(r.aenderung.art)}${r.aenderung.name_neu ? ` (${esc(r.aenderung.name_neu)})` : ""}.</p>`
    : "";

  const sStil = SICHERHEIT_STIL[r.sicherheit] ?? SICHERHEIT_STIL["nur Ebene"];
  const stand = r.stand?.gebiet ? ` Gebietsstand ${esc(r.stand.gebiet.replace(/^VG25 /, ""))}.` : "";
  const kontaktdaten = [...new Set([herkunft(k, r.stand), herkunft(a?.kontakt, r.stand)].filter(Boolean))]
    .map((h) => ` Kontaktdaten: ${esc(h)}.`).join("");

  return `
    <div class="schild">
      <p class="schild-frage">${r.keinBrief ? "Auf der Autobahn zuständig" : "Ansprechpartner für Schilder und Tempolimits"}</p>
      <h2 class="schild-behoerde">${esc(schild.behoerde)}</h2>
      ${stelleZeile ? `<p class="schild-zusatz">${esc(stelleZeile)}</p>` : ""}
      ${k?.adresse ? `<p class="schild-adresse">${esc(k.adresse)}</p>` : ""}
      ${wege}
    </div>
    ${alternative}
    <p class="ort">${strasse}${ort}</p>
    ${hinweise ? `<ul class="hinweise">${hinweise}</ul>` : ""}
    ${aenderung}
    <details class="details">
      <summary>Wie sicher ist das? <span class="marke marke-${esc(String(r.sicherheit).toLowerCase().replace(" ", "-"))}">${esc(sStil.label)}</span></summary>
      <p class="sicherheit">${esc(r.grund)}</p>
      <p class="quelle">Quelle: ${esc(r.quelle)}.${stand}${kontaktdaten}</p>
      ${portal && k ? `<p class="weiter"><a href="${esc(portal)}" target="_blank" rel="noopener">Alle Stellen im Bundesportal</a></p>` : ""}
    </details>
    <p class="rechtsrat">${esc(hinweis ?? "Kein Rechtsrat.")}</p>`;
}

/** „Bayern", „Bayern und Thüringen", „Bayern, Sachsen und Thüringen". */
function aufzaehlung(namen) {
  return namen.length < 2 ? namen.join("") : `${namen.slice(0, -1).join(", ")} und ${namen.at(-1)}`;
}

/** Die Sicherheit, die in einem Land für die meisten Gemeinden gilt (`index.json`). */
function meistGilt(sicherheit) {
  return Object.entries(sicherheit ?? {}).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
}

/**
 * HTML des Willkommensfensters: Testversion, was fertig ist (aus `index.json` und den
 * Landesregeln, damit es nicht veraltet), kein Rechtsrat, Fehler melden.
 * @param {object|null} index Inhalt von index.json; null, wenn er nicht geladen werden konnte
 * @param {{melden?: string}} opts Link zum Meldeformular (nur https)
 */
export function willkommenHtml(index, { melden } = {}) {
  const laender = index?.laender ?? [];
  const mitRegel = laender.filter((l) => LANDESREGELN[l.lkz]);
  const namen = (s) => aufzaehlung(mitRegel.filter((l) => meistGilt(l.sicherheit) === s).map((l) => l.name));
  const geprueft = namen(SICHERHEIT.BELEGT);
  const vermutlich = namen(SICHERHEIT.VERMUTLICH);
  const mitKontakt = aufzaehlung(laender.filter((l) => l.kontakte > 0).map((l) => l.name));
  const offen = laender.length - mitRegel.length;
  const stand = [
    geprueft && `<li><strong>Geprüft:</strong> ${esc(geprueft)} – die Regel ist an der Rechtsgrundlage geprüft.</li>`,
    vermutlich && `<li><strong>Vermutlich:</strong> ${esc(vermutlich)} – die Regel stammt aus einer Sekundärquelle.</li>`,
    offen > 0 && `<li><strong>Noch offen:</strong> ${offen === 1 ? "das übrige Land" : `die übrigen ${offen} Länder`}. ` +
      "Dort nennt die Karte meist nur die Kreisebene, schraffiert.</li>",
  ].filter(Boolean).join("");
  const link = /^https:\/\//i.test(String(melden ?? "")) ? melden : null;
  return `
    <h2 id="willkommen-titel">Testversion</h2>
    <p>Die Karte zeigt, welche Straßenverkehrsbehörde an einer Straße über Schilder und Tempolimits entscheidet – und wie du sie erreichst.</p>
    ${stand ? `<ul class="willkommen-stand">${stand}</ul>` : "<p>Erst wenige Länder haben eine eigene Regel; sonst nennt die Karte die Kreisebene.</p>"}
    ${mitKontakt ? `<p>Telefon, E-Mail und Webseite der Stelle gibt es bisher für ${esc(mitKontakt)}.</p>` : ""}
    <p>Alle Angaben ohne Gewähr und kein Rechtsrat. Bitte prüfe vor dem Absenden, ob die Stelle wirklich zuständig ist.</p>
    <p>Darstellung und Funktionen ändern sich noch.${link
      ? ` Fehler gefunden? <a href="${esc(link)}" target="_blank" rel="noopener">Bitte melden</a>.` : ""}</p>`;
}
