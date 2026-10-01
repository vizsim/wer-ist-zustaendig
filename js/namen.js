// namen.js — Namen der Stellen aus den Attributen der Verwaltungsgebiete. REIN.
// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Grundlage: VG25-Dokumentation (BKG), Attribut NBD = „Namensbildung": bei NBD = ja gehört die
// Bezeichnung (BEZ) zum Namen („Kreis Dithmarschen"), sonst nicht („Oberbergischer Kreis").

export const ZUSATZ = "Straßenverkehrsbehörde";

// Länder, in denen die Behörde des Landkreises „Landratsamt" heißt; in RP „Kreisverwaltung".
const LANDRATSAMT = new Set(["BW", "BY", "SN", "TH"]);

/** Vollständiger Name nach NBD: „Landkreis Prignitz" (NBD ja) bzw. „Salzlandkreis" (NBD nein). */
export function vollerName({ gen, bez = "", nbd = "nein" } = {}) {
  const g = String(gen ?? "").trim();
  if (!g) throw new Error("vollerName: GEN fehlt");
  const b = String(bez ?? "").trim();
  return String(nbd ?? "").trim().toLowerCase() === "ja" && b ? `${b} ${g}` : g;
}

/** „<Name> – Straßenverkehrsbehörde". */
export function mitZusatz(name) {
  return `${name} – ${ZUSATZ}`;
}

/** Name einer Stadt als Behörde: „Stadt Freising". */
export function stadtName(gen) {
  const g = String(gen ?? "").trim();
  if (!g) throw new Error("stadtName: GEN fehlt");
  return `Stadt ${g}`;
}

/**
 * Behörde der Kreisebene (ohne Zusatz).
 * @param {{gen: string, bez?: string, nbd?: string, kreisfrei?: boolean}} kreis
 * @param {string} lkz Länderkürzel
 */
export function kreisBehoerde(kreis, lkz) {
  if (!kreis) throw new Error("kreisBehoerde: Kreis fehlt");
  if (kreis.kreisfrei) return stadtName(kreis.gen);
  const l = String(lkz ?? "").toUpperCase();
  if (LANDRATSAMT.has(l)) return `Landratsamt ${String(kreis.gen).trim()}`;
  if (l === "RP") return `Kreisverwaltung ${String(kreis.gen).trim()}`;
  return vollerName(kreis);
}
