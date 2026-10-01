// pmtiles-node.mjs — PMTiles in Node lesen (Datei oder URL) und den ARS an einem Punkt finden.
// SPDX-License-Identifier: AGPL-3.0-or-later

import { open } from "node:fs/promises";
import { gunzipSync } from "node:zlib";
import { VectorTile } from "@mapbox/vector-tile";
import { PbfReader } from "pbf";
import { Compression, FetchSource, PMTiles } from "pmtiles";
import { featureAmPunkt, kachelFuerPunkt } from "../../js/lookup.js";

/** Quelle für pmtiles, die Byte-Bereiche aus einer lokalen Datei liest. */
class DateiQuelle {
  constructor(pfad) {
    this.pfad = pfad;
    this.fh = null;
  }

  getKey() {
    return this.pfad;
  }

  async getBytes(offset, length) {
    this.fh ??= await open(this.pfad, "r");
    const buf = Buffer.alloc(length);
    const { bytesRead } = await this.fh.read(buf, 0, length, offset);
    return { data: buf.buffer.slice(buf.byteOffset, buf.byteOffset + bytesRead) };
  }

  async schliessen() {
    await this.fh?.close();
    this.fh = null;
  }
}

async function entpacken(buf, compression) {
  if (compression === Compression.Gzip) {
    const out = gunzipSync(Buffer.from(buf));
    return out.buffer.slice(out.byteOffset, out.byteOffset + out.byteLength);
  }
  if (compression === Compression.None || compression === Compression.Unknown) return buf;
  throw new Error(`Kompression ${compression} wird nicht unterstützt`);
}

/** Archiv öffnen: Pfad oder http(s)-URL. */
export function oeffneArchiv(pfadOderUrl) {
  const quelle = /^https?:\/\//.test(pfadOderUrl) ? new FetchSource(pfadOderUrl) : new DateiQuelle(pfadOderUrl);
  const archiv = new PMTiles(quelle, undefined, entpacken);
  return { archiv, schliessen: () => quelle.schliessen?.() };
}

/**
 * Feature-Eigenschaften der Fläche am Punkt (Layer `gemeinden`, höchste Zoomstufe des Archivs).
 * @returns {Promise<object|null>}
 */
export async function flaecheAmPunkt(archiv, lon, lat, layerName = "gemeinden") {
  const header = await archiv.getHeader();
  const t = kachelFuerPunkt(lon, lat, header.maxZoom);
  const kachel = await archiv.getZxy(t.z, t.x, t.y);
  if (!kachel?.data) return null;
  const vt = new VectorTile(new PbfReader(new Uint8Array(kachel.data)));
  const f = featureAmPunkt(vt.layers[layerName], t.fx, t.fy);
  return f ? { ...f.properties } : null;
}
