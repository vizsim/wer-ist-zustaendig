// stichprobe.mjs — Stichproben gegen die Grenzschicht: liegt jeder Punkt in genau einer Gemeinde?
// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Rein (rechnet nur, in Kachelkoordinaten); tools/check-stichprobe.mjs liest die Kacheln.

import { punktInRingen } from "../../js/lookup.js";

/** Deterministischer Zufall (mulberry32): gleiche Saat, gleiche Stichprobe. */
export function zufall(saat) {
  let a = saat >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Alle Polygon-Features eines Kachel-Layers, die den Punkt (Kachelkoordinaten) enthalten. */
export function alleAmPunkt(layer, px, py) {
  const treffer = [];
  if (!layer) return treffer;
  for (let i = 0; i < layer.length; i++) {
    const f = layer.feature(i);
    if (f.type === 3 && punktInRingen(f.loadGeometry(), px, py)) treffer.push(f);
  }
  return treffer;
}

/**
 * Ein Punktpaar beiderseits einer zufälligen Kante der Fläche, je `abstand` Kacheleinheiten von
 * der Kante entfernt: `innen` liegt in der Fläche, `aussen` nicht. Nur Paare, die mit `rand`
 * Abstand im Kachelinneren liegen – Schnittkanten am Kachelrand sind keine Grenzen.
 * @param {Array<Array<{x:number,y:number}>>} ringe Geometrie der Fläche (loadGeometry)
 * @returns {{innen:{x:number,y:number}, aussen:{x:number,y:number}}|null}
 */
export function grenzPaar(ringe, extent, rnd, { abstand = 4, rand = 16, versuche = 20 } = {}) {
  const kanten = [];
  for (const ring of ringe) {
    for (let i = 1; i < ring.length; i++) {
      const a = ring[i - 1];
      const b = ring[i];
      const laenge = Math.hypot(b.x - a.x, b.y - a.y);
      if (laenge >= 2 * abstand) kanten.push({ a, b, laenge });
    }
  }
  if (!kanten.length) return null;
  const imInneren = (p) => p.x >= rand && p.y >= rand && p.x <= extent - rand && p.y <= extent - rand;
  for (let v = 0; v < versuche; v++) {
    const { a, b, laenge } = kanten[Math.floor(rnd() * kanten.length)];
    const t = 0.25 + rnd() * 0.5; // nicht an den Eckpunkten
    const mx = a.x + (b.x - a.x) * t;
    const my = a.y + (b.y - a.y) * t;
    const nx = -(b.y - a.y) / laenge;
    const ny = (b.x - a.x) / laenge;
    const p = { x: mx + nx * abstand, y: my + ny * abstand };
    const q = { x: mx - nx * abstand, y: my - ny * abstand };
    if (!imInneren(p) || !imInneren(q)) continue;
    const pDrin = punktInRingen(ringe, p.x, p.y);
    if (pDrin === punktInRingen(ringe, q.x, q.y)) continue; // schmale Stelle oder Ecke
    return pDrin ? { innen: p, aussen: q } : { innen: q, aussen: p };
  }
  return null;
}

/** Kachelkoordinaten → Länge/Breite (WGS 84). */
export function kachelZuLonLat(z, x, y, px, py, extent) {
  const n = 2 ** z;
  const gx = x + px / extent;
  const gy = y + py / extent;
  return {
    lon: (gx / n) * 360 - 180,
    lat: (Math.atan(Math.sinh(Math.PI * (1 - (2 * gy) / n))) * 180) / Math.PI,
  };
}

/** Meter je Kacheleinheit in Zoomstufe z bei Breite lat (Web-Mercator, Äquatorumfang WGS 84). */
export function meterJeEinheit(lat, z, extent) {
  return (40075016.686 * Math.cos((lat * Math.PI) / 180)) / 2 ** z / extent;
}

/**
 * Link zum BKG-Dienst (WMS VG25, GetFeatureInfo) für einen Punkt: zeigt die amtliche Gemeinde
 * dort. WMS 1.3.0 mit CRS:84 (Achsen Länge, Breite); 101 × 101 Pixel um den Punkt, Mitte = Punkt.
 */
export function wmsLink(lon, lat, { layer = "vg25_gem", format = "text/html" } = {}) {
  const d = 0.0005;
  const bbox = [lon - d, lat - d, lon + d, lat + d].map((v) => v.toFixed(6)).join(",");
  const p = new URLSearchParams({
    SERVICE: "WMS", VERSION: "1.3.0", REQUEST: "GetFeatureInfo", LAYERS: layer, QUERY_LAYERS: layer,
    STYLES: "", CRS: "CRS:84", BBOX: bbox, WIDTH: "101", HEIGHT: "101", I: "50", J: "50",
    INFO_FORMAT: format, FEATURE_COUNT: "1",
  });
  return `https://sgx.geodatenzentrum.de/wms_vg25?${p}`;
}

/**
 * Grenzpaar einordnen. `innen` muss genau die eigene Fläche treffen, `aussen` höchstens eine
 * andere. Ergebnis: "nachbar" | "leer" (Außengrenze, Küste – oder Lücke) | "eigene" (andere
 * Teilfläche derselben Gemeinde) | "ueberlappung" | "fehler" (innen nicht die eigene Fläche).
 */
export function ordnePaar(eigeneArs, innenArs, aussenArs) {
  if (innenArs.length > 1 || aussenArs.length > 1) return "ueberlappung";
  if (innenArs[0] !== eigeneArs) return "fehler";
  if (!aussenArs.length) return "leer";
  return aussenArs[0] === eigeneArs ? "eigene" : "nachbar";
}
