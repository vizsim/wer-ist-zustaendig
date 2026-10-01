// laender.js — Länderschlüssel (ARS-Stellen 1–2) → Kürzel, Name, Dateiname. Reine Daten.
// SPDX-License-Identifier: AGPL-3.0-or-later

/** Schlüssel des Landes (2 Stellen) → Kürzel nach ISO 3166-2:DE und Name. */
export const LAENDER = Object.freeze({
  "01": { lkz: "SH", name: "Schleswig-Holstein" },
  "02": { lkz: "HH", name: "Hamburg" },
  "03": { lkz: "NI", name: "Niedersachsen" },
  "04": { lkz: "HB", name: "Bremen" },
  "05": { lkz: "NW", name: "Nordrhein-Westfalen" },
  "06": { lkz: "HE", name: "Hessen" },
  "07": { lkz: "RP", name: "Rheinland-Pfalz" },
  "08": { lkz: "BW", name: "Baden-Württemberg" },
  "09": { lkz: "BY", name: "Bayern" },
  "10": { lkz: "SL", name: "Saarland" },
  "11": { lkz: "BE", name: "Berlin" },
  "12": { lkz: "BB", name: "Brandenburg" },
  "13": { lkz: "MV", name: "Mecklenburg-Vorpommern" },
  "14": { lkz: "SN", name: "Sachsen" },
  "15": { lkz: "ST", name: "Sachsen-Anhalt" },
  "16": { lkz: "TH", name: "Thüringen" },
});

const NACH_KUERZEL = Object.freeze(
  Object.fromEntries(Object.entries(LAENDER).map(([schluessel, l]) => [l.lkz, { ...l, schluessel }])),
);

/** Prüft einen 12-stelligen Amtlichen Regionalschlüssel (nur Ziffern, als String). */
export function istArs(ars) {
  return typeof ars === "string" && /^\d{12}$/.test(ars);
}

/** Land zu einem ARS (oder AGS): { lkz, name, schluessel } oder null. */
export function landAusArs(ars) {
  if (typeof ars !== "string" || ars.length < 2) return null;
  const l = LAENDER[ars.slice(0, 2)];
  return l ? { ...l, schluessel: ars.slice(0, 2) } : null;
}

/** Land zu einem Kürzel („BY", auch klein geschrieben) oder null. */
export function landAusKuerzel(lkz) {
  return NACH_KUERZEL[String(lkz ?? "").toUpperCase()] ?? null;
}

/** Dateiname der Landesdatei, z. B. „by.json". Kürzel sind Vertrag (docs/VERTRAG.md). */
export function landesdatei(lkz) {
  const l = landAusKuerzel(lkz);
  if (!l) throw new Error(`unbekanntes Länderkürzel: ${lkz}`);
  return `${l.lkz.toLowerCase()}.json`;
}
