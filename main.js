// main.js — Karte „Wer ist zuständig?" (MapLibre, ohne Build-Schritt).
// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Daten: zustaendigkeit/gemeinden.pmtiles (Layer gemeinden, kreise) und <land>.json, local-first
// aus pipeline/data/zustaendigkeit/ (nur auf localhost), sonst aus dem Bucket. Straßen aus den
// Kacheln der Unfallkarte (Layer highways/highways_minor mit highway, ref, name).
// Die Logik steckt in js/*.js (rein, getestet); hier nur Karte, Seite und Netz.

import { landAusArs, landAusKuerzel, landesdatei } from "./js/laender.js";
import { auswahl, LANDESREGELN } from "./js/resolve.js";
import {
  antwortHtml, ARTEN, aufzaehlung, datenBasisAusParam, esc, FARBE, farbAusdruck, flaechenDeckkraft, flaechenFarbe,
  klassenAusdruck, klassenListe, KONTAKT_STIL, kontaktDeckkraft, kontaktFarbe, SICHERHEIT_STIL, STRASSEN_LEGENDE,
  strassenAmPunkt, willkommenHtml,
} from "./js/ansicht.js";
import { klassenName } from "./js/strassenklasse.js";

const { maplibregl, pmtiles } = globalThis;

const LOKAL = "./pipeline/data/zustaendigkeit/";
const ENTFERNT = "https://tiles.vizsim.de/file/unfallkarte-data-v2/zustaendigkeit/";
const UNFALLKARTE = "https://tiles.vizsim.de/file/unfallkarte-data-v2/osm/";
const PHOTON = "https://photon.komoot.io/api/";
const MELDEN = "https://github.com/vizsim/wer-ist-zustaendig/issues/new?template=zustaendigkeit-falsch.yml";
// Willkommensfenster: beim ersten Besuch, danach über „Beta" im Kopf. Gemerkt im Browser; eine
// neue Version des Textes zeigt es wieder.
const WILLKOMMEN = Object.freeze({ schluessel: "wer-ist-zustaendig.willkommen", version: "1" });
const STIL = "https://tiles.openfreemap.org/styles/positron";
const ARTEN_LEGENDE = ["kreis", "stadt", "gemeinde", "verband", "stadtstaat"];
const STRASSEN_LAYER = ["strassen-neben", "strassen-haupt"];
// Hauptstraßen der Unfallkarte erst ab z10: Darunter sind ihre Kacheln riesig (z7 im Mittel
// 1,3 MB, z6 bis 7,9 MB), und die Hintergrundkarte zeigt die großen Straßen ohnehin.
const STRASSEN_AB = 10;
const nurWenigBewegung = matchMedia("(prefers-reduced-motion: reduce)").matches;

const $ = (sel) => document.querySelector(sel);

// ---------------------------------------------------------------------------- Daten
async function ladeJson(url) {
  const r = await fetch(url, { cache: "no-cache" });
  if (!r.ok) throw new Error(`${url}: HTTP ${r.status}`);
  return r.json();
}

async function datenBasis() {
  const param = new URLSearchParams(location.search).get("daten");
  const eigene = param ? datenBasisAusParam(param, location.href, [new URL(ENTFERNT).origin]) : null;
  if (param && !eigene) meldung("Die Datenquelle im Link ist nicht erlaubt – die Karte nutzt die üblichen Daten.");
  const kandidaten = eigene ? [eigene] : [];
  if (!eigene && ["localhost", "127.0.0.1"].includes(location.hostname)) kandidaten.push(LOKAL);
  if (!eigene) kandidaten.push(ENTFERNT);
  for (const basis of kandidaten) {
    try {
      return { basis, index: await ladeJson(`${basis}index.json`) };
    } catch {
      // nächste Quelle
    }
  }
  return { basis: null, index: null };
}

const landCache = new Map();
function ladeLand(basis, lkz) {
  if (!landCache.has(lkz)) {
    const p = ladeJson(`${basis}${landesdatei(lkz)}`);
    p.catch(() => landCache.delete(lkz));
    landCache.set(lkz, p);
  }
  return landCache.get(lkz);
}

// ---------------------------------------------------------------------------- Seite
function meldung(text) {
  const el = $("#meldung");
  el.textContent = text ?? "";
  el.hidden = !text;
}

function baueLegende() {
  $("#legende-arten").innerHTML = ARTEN_LEGENDE.map((art) =>
    `<li><span class="probe flaeche" style="--f:${ARTEN[art].farbe}"></span>${esc(ARTEN[art].label)}</li>`).join("");
  $("#legende-sicherheit").innerHTML = Object.entries(SICHERHEIT_STIL).map(([s, st]) =>
    `<li><span class="probe flaeche ${st.schraffur ? "schraffiert" : ""}" style="--f:${ARTEN.kreis.farbe};--d:${st.deckkraft}"></span>` +
    `<span><strong>${esc(st.label)}</strong>: ${esc(st.text)}</span></li>`).join("");
  $("#legende-strassen").innerHTML = STRASSEN_LEGENDE.map(([k, farbe]) =>
    `<li><span class="probe linie klasse-${k}" style="--f:${farbe}"></span>${esc(klassenName(k))}</li>`).join("");
  $("#legende-kontakt").innerHTML = Object.values(KONTAKT_STIL).map((st) =>
    `<li><span class="probe flaeche" style="--f:${st.farbe};--d:${st.deckkraft}"></span>${esc(st.label)}</li>`).join("");
}

// Färbung: nach Zuständigkeit (Standard) oder danach, ob es einen Kontakt gibt (#…&ansicht=kontakt).
const KONTAKT_ANSICHT = "kontakt";
const nachKontakt = () => new URLSearchParams(location.hash.slice(1)).get("ansicht") === KONTAKT_ANSICHT;

function zeigeLegende(kontakt) {
  for (const el of document.querySelectorAll("[data-ansicht]")) el.hidden = (el.dataset.ansicht === KONTAKT_ANSICHT) !== kontakt;
  $("#nach-kontakt").checked = kontakt;
}

function willkommen(index, immer = false) {
  const dlg = $("#willkommen");
  if (typeof dlg?.showModal !== "function" || dlg.open) return;
  if (!immer) {
    try {
      if (localStorage.getItem(WILLKOMMEN.schluessel) === WILLKOMMEN.version) return;
    } catch {
      // ohne Speicher (privates Fenster): eben wieder zeigen
    }
  }
  $("#willkommen-inhalt").innerHTML = willkommenHtml(index, { melden: MELDEN });
  dlg.showModal();
}

function verdrahteWillkommen(index) {
  const dlg = $("#willkommen");
  dlg.addEventListener("close", () => {
    try {
      localStorage.setItem(WILLKOMMEN.schluessel, WILLKOMMEN.version);
    } catch {
      // ohne Speicher nichts zu merken
    }
  });
  // Klick neben das Fenster schließt es auch.
  dlg.addEventListener("click", (e) => { if (e.target === dlg) dlg.close(); });
  $("#beta").addEventListener("click", () => willkommen(index, true));
  willkommen(index);
}

function zeigeStand(index) {
  if (!index) return;
  const d = index.daten ?? {};
  const laender = Object.keys(LANDESREGELN).map((l) => landAusKuerzel(l)?.name ?? l)
    .sort((a, b) => a.localeCompare(b, "de"));
  const teile = [
    d.gebiet && `Gebietsstand ${d.gebiet.replace(/^VG25 /, "")}`,
    index.regeln && `Regeln ${index.regeln.version}: Landesregeln für ${aufzaehlung(laender)}, sonst meist nur die Kreisebene`,
  ].filter(Boolean);
  $("#stand").textContent = `${teile.join(". ")}.`;
}

function zeigeAntwort(html) {
  $("#antwort-inhalt").innerHTML = html;
  const el = $("#antwort");
  el.hidden = false;
  el.scrollTop = 0;
  document.body.classList.add("mit-antwort");
}

function schliesseAntwort(map, marker) {
  $("#antwort").hidden = true;
  document.body.classList.remove("mit-antwort");
  marker.remove();
  if (map.getLayer("gemeinde-auswahl")) map.setFilter("gemeinde-auswahl", ["==", ["get", "ars"], ""]);
  setzePunkt(null);
}

// Schmale Bildschirme: Tafel oben, Antwort unten – den Punkt in den freien Streifen dazwischen
// schieben, damit Markierung und Straße sichtbar bleiben.
function punktFreistellen(map, lngLat) {
  if (!matchMedia("(max-width: 760px)").matches) return;
  const oben = $("#tafel").getBoundingClientRect().bottom;
  const unten = $("#antwort").getBoundingClientRect().top;
  const mitte = map.getContainer().clientHeight / 2;
  const ziel = unten > oben ? (oben + unten) / 2 : oben + 24;
  map.easeTo({ center: [lngLat.lng, lngLat.lat], offset: [0, ziel - mitte], duration: nurWenigBewegung ? 0 : 400 });
}

// Zustand im Hash (#karte=z/lat/lon&p=lat,lon&ansicht=kontakt) – teilbar wie ein Permalink.
function setzeHashParam(name, wert) {
  const h = new URLSearchParams(location.hash.slice(1));
  if (wert) h.set(name, wert);
  else h.delete(name);
  history.replaceState(null, "", `#${h.toString().replaceAll("%2F", "/").replaceAll("%2C", ",")}`);
}

function setzePunkt(lngLat) {
  setzeHashParam("p", lngLat ? `${lngLat.lat.toFixed(5)},${lngLat.lng.toFixed(5)}` : null);
}

function punktAusHash() {
  const p = new URLSearchParams(location.hash.slice(1)).get("p");
  const m = /^(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)$/.exec(p ?? "");
  return m ? { lat: Number(m[1]), lng: Number(m[2]) } : null;
}

// ---------------------------------------------------------------------------- Karte
function schraffur(farbe) {
  const n = 14;
  const c = document.createElement("canvas");
  c.width = c.height = n;
  const g = c.getContext("2d");
  g.strokeStyle = farbe;
  g.globalAlpha = 0.65;
  g.lineWidth = 1.2;
  g.beginPath();
  for (const o of [-n, 0, n]) {
    g.moveTo(o, n);
    g.lineTo(o + n, 0);
  }
  g.stroke();
  return g.getImageData(0, 0, n, n);
}

/** Farbe und Deckkraft der Flächen – nach Zuständigkeit oder nach Kontakt. */
function flaechenStil(kontakt) {
  // Unter Zoom 7 gibt es nur die Kreise: Sie tragen, was für die meisten ihrer Gemeinden gilt
  // (`eg`, `sg`, `ko`); ältere Kacheln ohne diese Felder färben nach der Art des Kreises.
  const kreisEg = ["coalesce", ["get", "eg"], ["get", "art"], "kreis"];
  const deckkraft = kontakt ? kontaktDeckkraft() : flaechenDeckkraft();
  return {
    kreisFarbe: kontakt ? kontaktFarbe() : flaechenFarbe(kreisEg),
    kreisDeckkraft: deckkraft,
    gemeindeFarbe: kontakt ? kontaktFarbe() : flaechenFarbe(),
    // Auf Straßenebene zurücknehmen, damit die Straßen vorne stehen.
    gemeindeDeckkraft: ["interpolate", ["linear"], ["zoom"], 7, deckkraft, 14, ["*", deckkraft, 0.45]],
    schraffur: kontakt ? "none" : "visible",
  };
}

function setzeAnsicht(map, kontakt) {
  const s = flaechenStil(kontakt);
  map.setPaintProperty("kreise-flaeche", "fill-color", s.kreisFarbe);
  map.setPaintProperty("kreise-flaeche", "fill-opacity", s.kreisDeckkraft);
  map.setPaintProperty("gemeinden-flaeche", "fill-color", s.gemeindeFarbe);
  map.setPaintProperty("gemeinden-flaeche", "fill-opacity", s.gemeindeDeckkraft);
  for (const id of ["kreise-schraffur", "gemeinden-schraffur"]) map.setLayoutProperty(id, "visibility", s.schraffur);
  zeigeLegende(kontakt);
  setzeHashParam("ansicht", kontakt ? KONTAKT_ANSICHT : null);
}

function baueLayer(map, basis, kontakt) {
  const vor = map.getStyle().layers.find((l) => l.type === "symbol")?.id;
  for (const [art, a] of Object.entries(ARTEN)) map.addImage(`schraffur-${art}`, schraffur(a.farbe));

  map.addSource("zust", {
    type: "vector",
    url: `pmtiles://${new URL(`${basis}gemeinden.pmtiles`, location.href)}`,
    attribution: "© BKG (2026) CC BY 4.0 · Statistisches Bundesamt (Destatis), GV-ISys",
  });
  map.addSource("strassen-haupt", {
    type: "vector", url: `pmtiles://${UNFALLKARTE}maxspeed_major.pmtiles`,
    attribution: "© OpenStreetMap-Mitwirkende (ODbL)",
  });
  map.addSource("strassen-neben", { type: "vector", url: `pmtiles://${UNFALLKARTE}maxspeed_minor.pmtiles` });

  const s = flaechenStil(kontakt);
  const layers = [
    { id: "kreise-flaeche", type: "fill", source: "zust", "source-layer": "kreise", maxzoom: 7,
      paint: { "fill-color": s.kreisFarbe, "fill-opacity": s.kreisDeckkraft } },
    { id: "kreise-schraffur", type: "fill", source: "zust", "source-layer": "kreise", maxzoom: 7,
      filter: ["==", ["get", "sg"], "nur Ebene"], layout: { visibility: s.schraffur },
      paint: { "fill-pattern": ["concat", "schraffur-", ["coalesce", ["get", "eg"], ["get", "art"], "kreis"]],
        "fill-opacity": 0.4 } },
    { id: "gemeinden-flaeche", type: "fill", source: "zust", "source-layer": "gemeinden", minzoom: 7,
      paint: { "fill-color": s.gemeindeFarbe, "fill-opacity": s.gemeindeDeckkraft } },
    { id: "gemeinden-schraffur", type: "fill", source: "zust", "source-layer": "gemeinden", minzoom: 7,
      filter: ["==", ["get", "sg"], "nur Ebene"], layout: { visibility: s.schraffur },
      paint: { "fill-pattern": ["concat", "schraffur-", ["coalesce", ["get", "eg"], "kreis"]],
        "fill-opacity": ["interpolate", ["linear"], ["zoom"], 7, 0.4, 12, 0.24, 15, 0.1] } },
    { id: "gemeinden-linie", type: "line", source: "zust", "source-layer": "gemeinden", minzoom: 9,
      paint: { "line-color": "#8a9399", "line-width": ["interpolate", ["linear"], ["zoom"], 9, 0.3, 14, 1] } },
    { id: "kreise-linie", type: "line", source: "zust", "source-layer": "kreise",
      paint: { "line-color": FARBE.grau, "line-width": ["interpolate", ["linear"], ["zoom"], 5, 0.4, 12, 1.8] } },
    { id: "strassen-neben", type: "line", source: "strassen-neben", "source-layer": "highways_minor", minzoom: 13,
      layout: { "line-cap": "round", "line-join": "round" },
      paint: { "line-color": farbAusdruck(), "line-width": ["interpolate", ["linear"], ["zoom"], 13, 1, 17, 5] } },
    { id: "strassen-haupt-rand", type: "line", source: "strassen-haupt", "source-layer": "highways",
      minzoom: STRASSEN_AB, filter: ["==", klassenAusdruck(), "B"], layout: { "line-join": "round" },
      paint: { "line-color": FARBE.gelbRand, "line-width": ["interpolate", ["linear"], ["zoom"], 10, 3.2, 12, 4, 17, 11] } },
    { id: "strassen-haupt", type: "line", source: "strassen-haupt", "source-layer": "highways", minzoom: STRASSEN_AB,
      layout: { "line-cap": "round", "line-join": "round" },
      paint: { "line-color": farbAusdruck(),
        "line-width": ["interpolate", ["linear"], ["zoom"], 10, ["match", klassenAusdruck(), ["A", "B"], 2.2, 1.1],
          12, ["match", klassenAusdruck(), ["A", "B"], 2.8, 1.6], 17, ["match", klassenAusdruck(), ["A", "B"], 8, 6]] } },
    { id: "gemeinde-auswahl", type: "line", source: "zust", "source-layer": "gemeinden",
      filter: ["==", ["get", "ars"], ""], paint: { "line-color": FARBE.tinte, "line-width": 2.5 } },
  ];
  for (const l of layers) map.addLayer(l, vor);
}

function punktMarker() {
  const el = document.createElement("div");
  el.className = "marker";
  el.setAttribute("aria-hidden", "true");
  return new maplibregl.Marker({ element: el });
}

// ---------------------------------------------------------------------------- Auskunft
async function bestimme(map, basis, marker, lngLat) {
  const punkt = map.project(lngLat);
  const gem = map.queryRenderedFeatures(punkt, { layers: ["gemeinden-flaeche"] })[0];
  marker.setLngLat(lngLat).addTo(map);
  setzePunkt(lngLat);
  if (!gem?.properties?.ars) {
    zeigeAntwort(`<p class="leer">${map.getZoom() < 7
      ? "Bitte näher heranzoomen, um eine Gemeinde auszuwählen."
      : "Hier liegt keine Gemeinde – außerhalb Deutschlands oder auf dem Wasser."}</p>`);
    return;
  }
  const ars = String(gem.properties.ars);
  const land = landAusArs(ars);
  const box = [[punkt.x - 8, punkt.y - 8], [punkt.x + 8, punkt.y + 8]];
  const strassen = strassenAmPunkt(map.queryRenderedFeatures(box, { layers: STRASSEN_LAYER }), land?.lkz);
  map.setFilter("gemeinde-auswahl", ["==", ["get", "ars"], ars]);
  try {
    const daten = await ladeLand(basis, land.lkz);
    const r = auswahl(daten, ars, klassenListe(strassen));
    if (!r) throw new Error(`Gemeinde ${ars} fehlt in ${landesdatei(land.lkz)}`);
    zeigeAntwort(antwortHtml(r, strassen, {
      landName: land.name, bundesportal: r.bundesportal, hinweis: daten.hinweis,
    }));
    punktFreistellen(map, lngLat);
  } catch (e) {
    console.error(e);
    zeigeAntwort(`<p class="leer">Für ${esc(land?.name ?? "dieses Land")} liegen gerade keine Daten vor. Später erneut versuchen oder den Fehler melden.</p>`);
  }
}

function sucheEinrichten(map, beiTreffer) {
  const liste = $("#treffer");
  $("#suche").addEventListener("submit", async (ev) => {
    ev.preventDefault();
    const q = $("#suche-feld").value.trim();
    if (!q) return;
    liste.hidden = false;
    liste.innerHTML = `<li class="leer">Suche läuft …</li>`;
    try {
      const url = `${PHOTON}?q=${encodeURIComponent(q)}&lang=de&limit=6&bbox=5.8,47.2,15.1,55.1`;
      const fc = await ladeJson(url);
      const treffer = (fc.features ?? []).filter((f) => f.properties?.countrycode === "DE");
      if (!treffer.length) {
        liste.innerHTML = `<li class="leer">Nichts gefunden. Ort und Straße anders schreiben?</li>`;
        return;
      }
      liste.innerHTML = treffer.map((f, i) => {
        const p = f.properties;
        const zeile = [p.name, [p.postcode, p.city].filter(Boolean).join(" "), p.state].filter(Boolean);
        return `<li><button type="button" data-i="${i}">${esc(zeile.join(", "))}</button></li>`;
      }).join("");
      liste.querySelectorAll("button").forEach((b) => b.addEventListener("click", () => {
        const [lng, lat] = treffer[Number(b.dataset.i)].geometry.coordinates;
        liste.hidden = true;
        beiTreffer({ lng, lat });
      }));
    } catch {
      liste.innerHTML = `<li class="leer">Die Suche ist gerade nicht erreichbar.</li>`;
    }
  });
}

// ---------------------------------------------------------------------------- Start
baueLegende();
zeigeLegende(nachKontakt());
if (matchMedia("(max-width: 760px)").matches) $("#legende").open = false;
const { basis, index } = await datenBasis();
zeigeStand(index);
verdrahteWillkommen(index);
if (!basis) {
  meldung("Die Zuständigkeitsdaten sind nicht erreichbar. Lokal: erst die Pipeline bauen (`uv run zust alles`), dann `npm run serve`.");
}

const protocol = new pmtiles.Protocol();
maplibregl.addProtocol("pmtiles", protocol.tile);
const map = new maplibregl.Map({
  container: "karte",
  style: STIL,
  center: [10.45, 51.16],
  zoom: 5.3,
  minZoom: 4,
  hash: "karte",
  attributionControl: { compact: true },
});
map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "bottom-right");
const marker = punktMarker();

const fliegeUndBestimme = (lngLat, zoom = 16) => {
  const ziel = { center: [lngLat.lng, lngLat.lat], zoom: Math.max(map.getZoom(), zoom) };
  if (nurWenigBewegung) map.jumpTo(ziel);
  else map.flyTo({ ...ziel, speed: 1.6 });
  map.once("idle", () => bestimme(map, basis, marker, lngLat));
};

map.on("load", () => {
  if (!basis) return;
  baueLayer(map, basis, nachKontakt());
  $("#nach-kontakt").addEventListener("change", (e) => setzeAnsicht(map, e.target.checked));
  map.on("click", (e) => bestimme(map, basis, marker, e.lngLat));
  for (const id of ["gemeinden-flaeche", "kreise-flaeche"]) {
    map.on("mouseenter", id, () => { map.getCanvas().style.cursor = "pointer"; });
    map.on("mouseleave", id, () => { map.getCanvas().style.cursor = ""; });
  }
  const p = punktAusHash();
  if (p) {
    // Geteilter Link: Nach dem Verschieben oder auf einem kleineren Bildschirm liegt der Punkt
    // womöglich außerhalb des Ausschnitts – dann fände queryRenderedFeatures keine Gemeinde.
    if (map.getZoom() < 7 || !map.getBounds().contains(p)) {
      map.jumpTo({ center: [p.lng, p.lat], zoom: Math.max(map.getZoom(), 7) });
    }
    map.once("idle", () => bestimme(map, basis, marker, p));
  }
});

$("#antwort-zu").addEventListener("click", () => schliesseAntwort(map, marker));
document.addEventListener("keydown", (ev) => {
  if (ev.key === "Escape" && !$("#antwort").hidden) schliesseAntwort(map, marker);
});
sucheEinrichten(map, (lngLat) => fliegeUndBestimme(lngLat));

// Test-Haken (Screenshots, Browser-Tests): die Karte, sonst nichts.
globalThis.__karte = map;
