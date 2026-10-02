// ansicht.js — reine Helfer für die Karte: Farben, Stil-Ausdrücke, Text und HTML der Antwort.
// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Kein DOM, kein `window`: alles hier ist in Node testbar (tests/ansicht.test.js). main.js
// verdrahtet nur Karte und Seite.

import { klasse, klassenName, RANG } from "./strassenklasse.js";

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
  stadt: { label: "Kreisfreie Stadt", farbe: "#e0a100" },
  stadtstaat: { label: "Stadtstaat", farbe: "#7e6ba8" },
  gemeinde: { label: "Gemeinde selbst", farbe: "#3f8f5a" },
  verband: { label: "Gemeindeverband", farbe: "#2e8a8a" },
});

/** Sicherheit (Feld `sg`) → Deckkraft der Fläche; „nur Ebene" zusätzlich schraffiert. */
export const SICHERHEIT_STIL = Object.freeze({
  belegt: { deckkraft: 0.42, schraffur: false, label: "belegt", text: "Regel an der Primärquelle geprüft" },
  vermutlich: { deckkraft: 0.26, schraffur: false, label: "vermutlich", text: "Regel belegt, Eingabe unsicher" },
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

/** MapLibre-Ausdruck → Flächenfarbe je Art der Stelle. */
export function flaechenFarbe() {
  const paare = Object.entries(ARTEN).flatMap(([art, a]) => [art, a.farbe]);
  return ["match", ["coalesce", ["get", "eg"], ""], ...paare, "#9aa3a8"];
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
 * Kontakt der zuständigen Stelle (Bundesportal): Name, Telefon, E-Mail, Webseite. Nur Wege, die
 * sich sicher verlinken lassen; ohne einen davon kein Block. `abweichend`: Das Portal nennt eine
 * andere Stelle als unsere Auskunft, die sich selbst Straßenverkehrsbehörde nennt.
 * @param {{name: string, telefon?: string[], email?: string[], web?: string[], abweichend?: boolean}|null} k
 * @param {{kontakte?: string}|null} stand Kopf `daten` der Landesdatei („Bundesportal 02.10.2026")
 */
export function kontaktHtml(k, stand) {
  if (!k) return "";
  const tel = (k.telefon ?? []).map((t) => [t, telHref(t)]).find(([, h]) => h);
  const mail = (k.email ?? []).find((m) => EMAIL_RE.test(m));
  const web = (k.web ?? []).map(webUrl).find(Boolean);
  const wege = [
    tel && `<li><span>Telefon</span> <a href="${esc(tel[1])}">${esc(tel[0])}</a></li>`,
    mail && `<li><span>E-Mail</span> <a href="mailto:${esc(mail)}">${esc(mail)}</a></li>`,
    web && `<li><span>Web</span> <a href="${esc(web.href)}" target="_blank" rel="noopener">` +
      `${esc(web.hostname.replace(/^www\./, ""))}</a></li>`,
  ].filter(Boolean);
  if (!wege.length) return "";
  return `
    <div class="kontakt">
      <p class="kontakt-name">${esc(k.name)}</p>
      ${k.abweichend ? `<p class="kontakt-hinweis">Das Bundesportal nennt diese Stelle; sie kann statt der oben genannten zuständig sein.</p>` : ""}
      <ul class="kontakt-wege">${wege.join("")}</ul>
      ${stand?.kontakte ? `<p class="kontakt-quelle">Kontaktdaten: ${esc(stand.kontakte)}</p>` : ""}
    </div>`;
}

/**
 * HTML der Antwortkarte.
 * @param {object} r Ergebnis von resolve.auswahl()
 * @param {object[]} strassen Ergebnis von strassenAmPunkt()
 * @param {{landName: string, bundesportal?: string, hinweis?: string}} opts
 */
export function antwortHtml(r, strassen, { landName, bundesportal, hinweis } = {}) {
  const { behoerde, zusatz } = teileName(r.zustaendig?.name);
  const ort = [r.gemeinde, r.verband, r.kreis && r.kreis !== r.gemeinde ? r.kreis : null, landName]
    .filter(Boolean).map(esc).join(", ");
  const strassenText = strassen.length
    ? strassen.slice(0, 3).map((s) => `${esc(strassenName(s, r.land))}, <span class="klasse">${esc(klassenName(s.klasse, r.land))}</span>`).join("<br>")
    : "";
  const sStil = SICHERHEIT_STIL[r.sicherheit] ?? SICHERHEIT_STIL["nur Ebene"];
  const alt = r.alternative
    ? `<p class="alternative"><span>Oder:</span> ${esc(teileName(r.alternative.stelle?.name).behoerde)}, ${esc(r.alternative.bedingung)}.</p>`
    : "";
  const hinweise = (r.hinweise ?? []).map((h) => `<li>${esc(h)}</li>`).join("");
  const aenderung = r.aenderung
    ? `<p class="aenderung">Gebietsänderung seit dem Datenstand: ${esc(r.aenderung.art)}${r.aenderung.name_neu ? ` (${esc(r.aenderung.name_neu)})` : ""}.</p>`
    : "";
  const stand = r.stand?.gebiet ? `Gebietsstand ${esc(r.stand.gebiet.replace(/^VG25 /, ""))}` : "";
  // Escapen allein hält „javascript:" nicht auf: nur https-Links.
  const portal = /^https:\/\//i.test(String(bundesportal ?? "")) ? bundesportal : null;
  return `
    <div class="schild">
      <p class="schild-frage">${r.keinBrief ? "Auf der Autobahn zuständig" : "Zuständig für Schilder und Tempolimits"}</p>
      <h2 class="schild-behoerde">${esc(behoerde)}</h2>
      ${zusatz ? `<p class="schild-zusatz">${esc(zusatz)}</p>` : ""}
    </div>
    ${kontaktHtml(r.kontakt, r.stand)}
    <p class="ort">${ort}</p>
    ${strassenText ? `<p class="strassen">${strassenText}</p>` : ""}
    <p class="sicherheit"><span class="marke marke-${esc(String(r.sicherheit).toLowerCase().replace(" ", "-"))}">${esc(sStil.label)}</span> ${esc(r.grund)}</p>
    ${alt}
    ${hinweise ? `<ul class="hinweise">${hinweise}</ul>` : ""}
    ${aenderung}
    <p class="quelle">Quelle: ${esc(r.quelle)}${stand ? `. ${stand}` : ""}.</p>
    <p class="weiter">
      ${portal ? `<a href="${esc(portal)}" target="_blank" rel="noopener">Im Bundesportal nachsehen</a>` : ""}
    </p>
    <p class="rechtsrat">${esc(hinweis ?? "Kein Rechtsrat.")}</p>`;
}
