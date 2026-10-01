// lookup.js — Gemeinde (ARS) an einem Punkt aus einer Vektorkachel. REIN: rechnet nur.
// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Für Konsumenten ohne Karte im Rücken (Report, Werkzeuge): Kachel zum Punkt bestimmen, Kachel
// dekodieren (z. B. @mapbox/vector-tile), dann hier Punkt-in-Polygon in Kachelkoordinaten.
// Die Grenzschicht ist in z12 abgelegt; größere Zoomstufen sind nicht nötig (Auflösung ~1–2 m).

/** Web-Mercator-Kachel zu einem Punkt: {z, x, y} und die Lage darin als Anteil (0 ≤ fx, fy < 1). */
export function kachelFuerPunkt(lon, lat, z) {
  if (!Number.isFinite(lon) || !Number.isFinite(lat)) throw new Error("kachelFuerPunkt: lon/lat fehlen");
  const n = 2 ** z;
  const xf = ((lon + 180) / 360) * n;
  const phi = (lat * Math.PI) / 180;
  const yf = ((1 - Math.log(Math.tan(phi) + 1 / Math.cos(phi)) / Math.PI) / 2) * n;
  const x = Math.min(n - 1, Math.max(0, Math.floor(xf)));
  const y = Math.min(n - 1, Math.max(0, Math.floor(yf)));
  return { z, x, y, fx: xf - x, fy: yf - y };
}

/**
 * Punkt in Polygon nach der Gerade-Ungerade-Regel über ALLE Ringe eines Features. So zählen
 * Löcher (Innenringe) und Mehrfachflächen (Exklaven) richtig, ohne Ringe zu klassifizieren.
 * @param {Array<Array<{x:number,y:number}>>} ringe
 */
export function punktInRingen(ringe, px, py) {
  let innen = false;
  for (const ring of ringe) {
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      const a = ring[i];
      const b = ring[j];
      if (a.y > py !== b.y > py && px < ((b.x - a.x) * (py - a.y)) / (b.y - a.y) + a.x) innen = !innen;
    }
  }
  return innen;
}

/**
 * Erstes Polygon-Feature eines Kachel-Layers, das den Punkt enthält.
 * @param {{length:number, extent:number, feature:(i:number)=>{type:number, properties:object, loadGeometry:()=>any}}} layer
 *   Layer im Format von @mapbox/vector-tile (VectorTileLayer)
 * @param {number} fx Lage in der Kachel (Anteil, aus kachelFuerPunkt)
 * @param {number} fy
 * @returns {{properties: object}|null}
 */
export function featureAmPunkt(layer, fx, fy) {
  if (!layer) return null;
  const px = fx * layer.extent;
  const py = fy * layer.extent;
  for (let i = 0; i < layer.length; i++) {
    const f = layer.feature(i);
    if (f.type !== 3) continue; // nur Polygone
    if (punktInRingen(f.loadGeometry(), px, py)) return f;
  }
  return null;
}
