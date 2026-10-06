// kontaktluecken.mjs — Wo fehlt der zuständigen Stelle (oder der Alternative) der Kontakt?
// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Für tools/check-kontakte.mjs: schlägt jede Gemeinde einer Landesdatei mit `auswahl()` nach und
// zählt die Lücken je Straßenklasse, je Gemeinde und je Stelle. Die Sicht je Stelle ist die
// Arbeitsliste für config/kontakte_ergaenzt.yaml: Ein Eintrag für eine Stelle schließt oft die
// Lücken vieler Gemeinden.

import { auswahl, kontaktRolle } from "../../js/resolve.js";

/** Straßenklassen der Prüfung; `[]` steht für „unklar" (kein Straßentreffer). */
export const PRUEF_KLASSEN = Object.freeze([["G"], ["K"], ["L"], ["B"], []]);

const klassenName = (klassen) => klassen.join("") || "unklar";

/**
 * Lücken einer Landesdatei.
 * @param {object} daten Landesdatei (zustaendigkeit/<land>.json)
 * @returns {{
 *   zahl: Record<string, {ohne: number, altOhne: number}>,
 *   luecken: Map<string, string>,
 *   allgemein: Set<string>,
 *   stellen: Map<string, {id: string, name: string, gemeinden: Set<string>, klassen: Set<string>,
 *     alternative: Set<string>}>,
 * }}
 *   `zahl` je Klasse, wie oft der zuständigen Stelle bzw. der Alternative der Kontakt fehlt;
 *   `luecken` ARS → „ARS Gemeinde → Stelle" (zuletzt geprüfte Klasse); `allgemein` ARS, deren
 *   Kontakt nur die allgemeine Anschrift der Verwaltung ist; `stellen` je Stelle ohne Kontakt die
 *   Gemeinden, in denen sie zuständig ist, und die, in denen sie als Alternative steht.
 */
export function kontaktLuecken(daten) {
  const zahl = Object.fromEntries(PRUEF_KLASSEN.map((k) => [klassenName(k), { ohne: 0, altOhne: 0 }]));
  const luecken = new Map();
  const allgemein = new Set();
  const stellen = new Map();
  const stelle = (s) => {
    if (!stellen.has(s.id)) {
      stellen.set(s.id, { id: s.id, name: s.name, gemeinden: new Set(), klassen: new Set(), alternative: new Set() });
    }
    return stellen.get(s.id);
  };
  for (const ars of Object.keys(daten.gemeinden)) {
    for (const klassen of PRUEF_KLASSEN) {
      const r = auswahl(daten, ars, klassen);
      const z = zahl[klassenName(klassen)];
      if (!r.kontakt) {
        z.ohne += 1;
        luecken.set(ars, `${ars} ${r.gemeinde} → ${r.zustaendig.name}`);
        const s = stelle(r.zustaendig);
        s.gemeinden.add(ars);
        s.klassen.add(klassenName(klassen));
      } else if (r.kontakt.allgemein) {
        allgemein.add(ars);
      }
      if (r.alternative && !r.alternative.kontakt) {
        z.altOhne += 1;
        stelle(r.alternative.stelle).alternative.add(ars);
      }
    }
  }
  return { zahl, luecken, allgemein, stellen };
}

/**
 * Stellen ohne Kontakt als Arbeitsliste: zuerst nach der Zahl der Gemeinden, in denen sie zuständig
 * sind, dann nach der Zahl, in denen sie als Alternative stehen, dann nach Id.
 */
export function stellenListe(stellen) {
  return [...stellen.values()].sort((a, b) =>
    b.gemeinden.size - a.gemeinden.size || b.alternative.size - a.alternative.size || a.id.localeCompare(b.id));
}

/**
 * Welcher Schlüssel in config/kontakte_ergaenzt.yaml schließt die Lücke einer Stelle? Nach der Rolle
 * ihres Kontakts (`kontaktRolle`): Kreisebene – der Kreis-ARS (auch für den Berliner Senat und die
 * Stellen der Stadtstaaten); die Gemeinde – ihr ARS mit `rolle: gemeinde`; ein Verband – der ARS jeder
 * seiner Gemeinden mit `rolle: gemeinde` (gilt auch für den Verband). `null`: Die Stelle hat keinen
 * Platz für einen Kontakt (Bund, Polizei, Bezirksamt ohne bekannten Bezirk).
 * @param {string} id Id der Stelle
 * @param {string} ars eine Gemeinde, in der die Stelle vorkommt
 */
export function ergaenzungsSchluessel(id, ars) {
  const rolle = kontaktRolle(id, ars);
  if (rolle === "kreis") return `"${String(ars).slice(0, 5)}"`;
  if (rolle === "gemeinde" && id === `g${ars}`) return `"${ars}", rolle: gemeinde`;
  if (rolle === "gemeinde") return "ARS jeder Gemeinde des Verbands, rolle: gemeinde";
  return null;
}
