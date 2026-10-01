// strassenklasse.js — Straßenklasse aus OSM `ref` + `highway` (+ Land). REIN: kein DOM, kein Netz.
// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Klassen: A Autobahn · B Bundesstraße · L Landes-/Staatsstraße · K Kreisstraße · G Gemeindestraße
// · „unklar". Die Rangfolge entscheidet bei mehreren Straßen bzw. mehreren Nummern („B 2;St 2068").
//
// Länderbesonderheiten (Plan § 5):
//  - BY: Staatsstraßen „St" + Nummer; Kreisstraßen mit Kfz-Kürzel des Kreises („DAH 3"), in
//    kreisfreien Städten ggf. mit angehängtem „s" („ROs 1"). „A 8" ist in BY ohne Autobahn-Tag
//    eine Kreisstraße des Landkreises Augsburg.
//  - MV: Kreisstraßen seit 2011 mit Kürzel des Kreises, Altkreises oder der Stadt („VG 12").
//  - SN: Staatsstraßen „S" + Nummer.
//  - SL: keine Kreisstraßen; Landesstraßen II. Ordnung tragen „L" und zählen als L.

export const RANG = Object.freeze({ A: 5, B: 4, L: 3, K: 2, G: 1, unklar: 0 });

export const KLASSEN = Object.freeze(["A", "B", "L", "K", "G", "unklar"]);

const AUTOBAHN = new Set(["motorway", "motorway_link"]);
const KRAFTFAHRSTRASSE = new Set(["trunk", "trunk_link"]);
const GEMEINDESTRASSE = new Set(["residential", "living_street", "unclassified", "service"]);
const KFZ_KUERZEL = new Set(["BY", "MV"]);

const RE_A = /^A ?\d{1,3}[a-z]?$/;
const RE_B = /^B ?\d{1,3}[a-zA-Z]{0,2}$/;
const RE_L = /^L ?\d{1,4}[a-zA-Z]?$/;
const RE_K = /^K ?\d{1,4}[a-zA-Z]?$/;
const RE_ST_BY = /^St ?\d{3,4}[a-zA-Z]?$/;
const RE_S_SN = /^S ?\d{1,3}[a-zA-Z]?$/;
// Kfz-Kürzel: zwei oder drei Buchstaben; einbuchstabig gibt es in Bayern nur A, M, N, R
// (Augsburg, München, Nürnberg, Regensburg), in MV gar nicht. So bleiben „E 45" oder „S 177"
// in Bayern unklar statt fälschlich Kreisstraße.
const RE_KFZ_2_3 = /^[A-ZÄÖÜ]{2,3}s? ?\d{1,3}[a-zA-Z]?$/;
const RE_KFZ_1_BY = /^[AMNR]s? ?\d{1,3}[a-zA-Z]?$/;

function normLand(land) {
  return land ? String(land).toUpperCase() : null;
}

/** Klasse einer einzelnen Straßennummer (ohne „;"). */
export function klasseAusNummer(nummer, land = null, highway = "") {
  const t = String(nummer ?? "").trim().replace(/\s+/g, " ");
  const l = normLand(land);
  if (!t) return "unklar";
  if (RE_A.test(t)) {
    if (AUTOBAHN.has(highway) || KRAFTFAHRSTRASSE.has(highway)) return "A";
    return l === "BY" ? "K" : "A";
  }
  if (RE_B.test(t)) return "B";
  if (RE_L.test(t)) return "L";
  if (l === "BY" && RE_ST_BY.test(t)) return "L";
  if (l === "SN" && RE_S_SN.test(t)) return "L";
  if (RE_K.test(t)) return "K";
  if (KFZ_KUERZEL.has(l) && RE_KFZ_2_3.test(t)) return "K";
  if (l === "BY" && RE_KFZ_1_BY.test(t)) return "K";
  return "unklar";
}

/** Höchste Klasse einer Liste nach RANG; leere Liste → „unklar". */
export function hoechsteKlasse(klassen) {
  let beste = "unklar";
  for (const k of klassen) if ((RANG[k] ?? 0) > RANG[beste]) beste = k;
  return beste;
}

/**
 * Klasse einer OSM-Straße.
 * @param {{ref?: string|null, highway?: string|null}} strasse
 * @param {string|null} land Länderkürzel („BY"); ohne Land gelten nur die bundesweiten Muster.
 * @returns {"A"|"B"|"L"|"K"|"G"|"unklar"}
 */
export function klasse({ ref = null, highway = null } = {}, land = null) {
  const hw = String(highway ?? "").trim();
  if (AUTOBAHN.has(hw)) return "A";
  const nummern = String(ref ?? "")
    .split(";")
    .map((t) => t.trim())
    .filter(Boolean);
  if (nummern.length) return hoechsteKlasse(nummern.map((n) => klasseAusNummer(n, land, hw)));
  if (GEMEINDESTRASSE.has(hw)) return "G";
  return "unklar";
}

/** Anzeigename einer Klasse, mit Landesbezeichnung für L (Staatsstraße in BY und SN). */
export function klassenName(k, land = null) {
  const l = normLand(land);
  switch (k) {
    case "A": return "Autobahn";
    case "B": return "Bundesstraße";
    case "L": return l === "BY" || l === "SN" ? "Staatsstraße" : "Landesstraße";
    case "K": return "Kreisstraße";
    case "G": return "Gemeindestraße";
    default: return "Straßenklasse unklar";
  }
}
