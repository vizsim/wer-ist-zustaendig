// resolve.js — Zuständige Straßenverkehrsbehörde je Gemeinde und Straßenklasse. REIN.
// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Zwei Teile:
//  1. Build: `resolveGemeinde(gemeinde)` → Ergebnis je Straßenklasse (G, K, L, B) samt Stellen.
//     tools/build-laender.mjs schreibt daraus die Landesdateien (docs/VERTRAG.md).
//  2. Laufzeit: `auswahl(landesdatei, ars, klassen)` → eine zuständige Stelle für die Straßen
//     einer Auswahl (höchste Klasse gewinnt; Gemeindestraße ggf. als Alternative).
//
// Phase 1 (Plan § 7): Rückfall auf die Kreisebene mit amtlichem Namen; Stadtstaaten nach Konzept
// § 6.1. Landesregeln folgen je Land in Phase 2 – dann unterscheiden sich die Klassen.
// Kein Rechtsrat: Jede Aussage trägt Sicherheit und Quelle.

import { kreisBehoerde, mitZusatz, stadtName } from "./namen.js";
import { hoechsteKlasse } from "./strassenklasse.js";

export const REGELN = Object.freeze({ version: "0.3.0", phase: 1, stand: "2026-10-03" });

export const SICHERHEIT = Object.freeze({
  BELEGT: "belegt",
  VERMUTLICH: "vermutlich",
  NUR_EBENE: "nur Ebene",
});
const SICHER_RANG = Object.freeze({ "nur Ebene": 0, vermutlich: 1, belegt: 2 });

/** Klassen, für die der Build je Gemeinde ein Ergebnis erzeugt (A ist überall gleich). */
export const BAU_KLASSEN = Object.freeze(["G", "K", "L", "B"]);

export const BUNDESPORTAL =
  "https://verwaltung.bund.de/leistungsverzeichnis/de/leistung/99108014042000";

export const HINWEIS = "Vermutlich zuständig – kein Rechtsrat. Bitte vor dem Absenden prüfen.";

export const TEXTE = Object.freeze({
  grund: Object.freeze({
    kreisfrei: "Kreisfreie Städte sind für ihr Gebiet untere Straßenverkehrsbehörde.",
    kreis:
      "Für kreisangehörige Gemeinden ist meist die Kreisverwaltung zuständig. Größere Städte, " +
      "in manchen Ländern auch Gemeinden, können selbst zuständig sein.",
    gemeindefrei: "Gemeindefreies Gebiet: zuständig ist der Kreis.",
    bremen: "In der Stadt Bremen ist das Amt für Straßen und Verkehr Straßenverkehrsbehörde.",
    bremerhaven: "In Bremerhaven ist der Magistrat als Ortspolizeibehörde Straßenverkehrsbehörde.",
    berlin:
      "In Berlin sind die Bezirksämter zuständig, für Straßen des übergeordneten Netzes die " +
      "Senatsverwaltung.",
    hamburg: "In Hamburg ist die Polizei Straßenverkehrsbehörde, örtlich das zuständige Polizeikommissariat.",
    autobahn: "Für Autobahnen ist das Fernstraßen-Bundesamt Straßenverkehrsbehörde.",
    kondominium:
      "Gemeinsames deutsch-luxemburgisches Hoheitsgebiet (Mosel, Sauer, Our). Genannt ist die " +
      "Stelle der angrenzenden deutschen Gemeinde; ob sie hier zuständig ist, ist nicht geprüft.",
    bundesportal:
      "Das Land nennt im Bundesportal für diese Gemeinde dieselbe Stelle. Die Landesregel selbst " +
      "ist noch nicht eingearbeitet.",
  }),
  bedingung: Object.freeze({
    gks: "Große Kreisstadt – sie kann selbst zuständig sein",
    gemeindestrasse: "falls nur die Gemeindestraße betroffen ist",
    unklar: "falls es eine Gemeindestraße ist",
    berlinNetz: "falls die Straße zum übergeordneten Straßennetz gehört",
  }),
  quelle: Object.freeze({
    phase1: "Rückfall Phase 1: Kreisebene (Konzept § 6.1)",
    bremen:
      "Verordnung über die Zuständigkeiten nach der Straßenverkehrs-Ordnung (Bremen) vom " +
      "19.01.2016, zuletzt geändert 02.09.2025",
    berlin: "ASOG Bln, Zuständigkeitskatalog Ordnungsaufgaben Nr. 11 Abs. 4, Nr. 22b Abs. 3 (Wortlaut nur sekundär geprüft)",
    hamburg: "Zuständigkeitsanordnung Hamburg (Titel und Fassung noch nicht geprüft)",
    autobahn: "Konzept § 6.1",
    kondominium:
      "Rückfall: angrenzende Gemeinde laut VG25 (SDV_ARS); Grenzvertrag Deutschland–Luxemburg nicht ausgewertet",
    bundesportal:
      "Bundesportal, zuständige Stelle für „Aufstellung von Verkehrszeichen anregen\" (Angabe des Landes)",
  }),
  hinweis: Object.freeze({
    autobahnDabei: "Für die Autobahn selbst ist das Fernstraßen-Bundesamt zuständig.",
    keineStrasse: "Keine Straße erkannt – bitte eine Straße anklicken, um die Klasse zu bestimmen.",
  }),
});

/** Stellen, die nicht aus den Verwaltungsgebieten folgen. Ids sind Vertrag (docs/VERTRAG.md). */
export const FESTE_STELLEN = Object.freeze({
  fba: Object.freeze({ id: "fba", name: mitZusatz("Fernstraßen-Bundesamt"), ebene: "bund", art: "bund" }),
  "hb-asv": Object.freeze({
    id: "hb-asv", name: mitZusatz("Amt für Straßen und Verkehr Bremen"), ebene: "untere", art: "stadtstaat",
  }),
  "hb-bhv": Object.freeze({
    id: "hb-bhv", name: mitZusatz("Magistrat der Stadt Bremerhaven (Ortspolizeibehörde)"),
    ebene: "untere", art: "stadtstaat",
  }),
  "be-bezirk": Object.freeze({
    id: "be-bezirk", name: mitZusatz("Bezirksamt (Berlin)"), ebene: "untere", art: "stadtstaat",
  }),
  "be-senat": Object.freeze({
    id: "be-senat", name: mitZusatz("Senatsverwaltung Berlin, Abteilung Verkehrsmanagement"),
    ebene: "untere", art: "stadtstaat",
  }),
  "hh-pk": Object.freeze({
    id: "hh-pk", name: mitZusatz("Polizei Hamburg, zuständiges Polizeikommissariat"),
    ebene: "untere", art: "stadtstaat",
  }),
});

const ARS_RE = /^\d{12}$/;

function pruefeGemeinde(g) {
  if (!g || !ARS_RE.test(String(g.ars ?? ""))) throw new Error(`resolve: ungültiger ARS ${g?.ars}`);
  if (!g.land) throw new Error(`resolve: ${g.ars} ohne Land`);
  if (!g.kreis?.ars || !g.kreis?.gen) throw new Error(`resolve: ${g.ars} ohne Kreis`);
  if (!g.gen) throw new Error(`resolve: ${g.ars} ohne Namen (GEN)`);
}

function kreisStelle(g) {
  const k = g.kreis;
  return {
    id: `k${k.ars}`,
    name: mitZusatz(kreisBehoerde(k, g.land)),
    ebene: "untere",
    art: k.kreisfrei ? "stadt" : "kreis",
  };
}

function ergebnis(stelle, sicherheit, grund, quelle, alternative = null) {
  // Feste Schlüsselreihenfolge: Grundlage für stabile Ids (ergebnisId).
  return {
    stelle,
    sicherheit,
    grund: TEXTE.grund[grund],
    quelle: TEXTE.quelle[quelle],
    alternative: alternative
      ? { stelle: alternative.stelle, bedingung: TEXTE.bedingung[alternative.bedingung] }
      : null,
  };
}

/** Regel der Phase 1 → { ergebnis (mit Stellen-Objekten) }. */
function regelPhase1(g) {
  const { ars } = g;
  if (ars.startsWith("04011")) {
    return ergebnis(FESTE_STELLEN["hb-asv"], SICHERHEIT.BELEGT, "bremen", "bremen");
  }
  if (ars.startsWith("04012")) {
    return ergebnis(FESTE_STELLEN["hb-bhv"], SICHERHEIT.BELEGT, "bremerhaven", "bremen");
  }
  if (ars.startsWith("11")) {
    return ergebnis(FESTE_STELLEN["be-bezirk"], SICHERHEIT.NUR_EBENE, "berlin", "berlin", {
      stelle: FESTE_STELLEN["be-senat"], bedingung: "berlinNetz",
    });
  }
  if (ars.startsWith("02")) {
    return ergebnis(FESTE_STELLEN["hh-pk"], SICHERHEIT.NUR_EBENE, "hamburg", "hamburg");
  }
  const kreis = kreisStelle(g);
  if (g.kreis.kreisfrei) return ergebnis(kreis, SICHERHEIT.VERMUTLICH, "kreisfrei", "phase1");
  if (g.gemeindefrei) return ergebnis(kreis, SICHERHEIT.VERMUTLICH, "gemeindefrei", "phase1");
  const gks = Array.isArray(g.tkz) && g.tkz.includes(67);
  const alternative = gks
    ? {
      stelle: { id: `g${ars}`, name: mitZusatz(stadtName(g.gen)), ebene: "untere", art: "stadt" },
      bedingung: "gks",
    }
    : null;
  return ergebnis(kreis, SICHERHEIT.NUR_EBENE, "kreis", "phase1", alternative);
}

/**
 * Regel samt Sonderfällen:
 * - Kondominium (VG25 `BEZ = Kondominium`): Der Eintrag trägt Kreis und Verband der angrenzenden
 *   Gemeinde, also deren Stelle – aber nie sicherer als „nur Ebene".
 * - Bundesportal (`g.bundesportal`, vom Build aus kontakte.json ergänzt): Nennt das Land dort für
 *   die Gemeinde dieselbe Stelle (`passt`), wird aus „nur Ebene" „vermutlich". Nennt es eine
 *   andere (`stvb`), bleibt es bei „nur Ebene"; die Karte zeigt deren Kontakt mit Hinweis.
 */
function regel(g) {
  const e = regelPhase1(g);
  if (g.kondominium) {
    return { ...e, sicherheit: SICHERHEIT.NUR_EBENE, grund: TEXTE.grund.kondominium, quelle: TEXTE.quelle.kondominium };
  }
  if (g.bundesportal === "passt" && e.sicherheit === SICHERHEIT.NUR_EBENE) {
    return { ...e, sicherheit: SICHERHEIT.VERMUTLICH, grund: TEXTE.grund.bundesportal, quelle: TEXTE.quelle.bundesportal };
  }
  return e;
}

/**
 * Zuständigkeit einer Gemeinde je Straßenklasse (Build).
 * @param {object} g Eintrag aus gemeinden_attr.json (docs/VERTRAG.md, Abschnitt Zwischenprodukt)
 * @returns {{zust: Record<"G"|"K"|"L"|"B", object>, stellen: Record<string, object>}}
 *   zust[klasse] = { stelle: <id>, sicherheit, grund, quelle, alternative: {stelle: <id>, bedingung}|null }
 */
export function resolveGemeinde(g) {
  pruefeGemeinde(g);
  const stellen = {};
  const zust = {};
  for (const klasse of BAU_KLASSEN) {
    const e = regel(g); // Phase 1: für alle Klassen gleich
    stellen[e.stelle.id] = e.stelle;
    if (e.alternative) stellen[e.alternative.stelle.id] = e.alternative.stelle;
    zust[klasse] = {
      stelle: e.stelle.id,
      sicherheit: e.sicherheit,
      grund: e.grund,
      quelle: e.quelle,
      alternative: e.alternative ? { stelle: e.alternative.stelle.id, bedingung: e.alternative.bedingung } : null,
    };
  }
  return { zust, stellen };
}

/** Stabile Kurz-Id eines Ergebnisses (FNV-1a, 32 bit) – gleiche Inhalte, gleiche Id. */
export function ergebnisId(erg) {
  const s = JSON.stringify(erg);
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return `e${h.toString(16).padStart(8, "0")}`;
}

/** Die schwächere zweier Sicherheiten. */
export function schwaecher(a, b) {
  return (SICHER_RANG[a] ?? 0) <= (SICHER_RANG[b] ?? 0) ? a : b;
}

/**
 * Laufzeit: zuständige Stelle für die Straßen einer Auswahl.
 * @param {object} daten Landesdatei (zustaendigkeit/<land>.json)
 * @param {string} ars 12-stelliger Regionalschlüssel der Gemeinde am Anker
 * @param {string[]} klassen Klassen der Straßen in der Auswahl (strassenklasse.js); leer = unbekannt
 * @returns {object|null} null, wenn die Gemeinde fehlt
 */
export function auswahl(daten, ars, klassen = []) {
  const eintrag = daten?.gemeinden?.[ars];
  if (!eintrag) return null;
  const stelle = (id) => daten.stellen[id] ?? FESTE_STELLEN[id] ?? null;
  const erg = (k) => {
    const e = daten.ergebnisse[eintrag.z[k]];
    if (!e) throw new Error(`auswahl: ${ars} ohne Ergebnis für Klasse ${k}`);
    return e;
  };
  const basis = {
    ars,
    gemeinde: eintrag.name,
    verband: eintrag.verband ?? null,
    kreis: daten.kreise?.[eintrag.kreis] ?? null,
    land: daten.land,
    stand: daten.daten ?? null,
    regeln: daten.regeln ?? null,
    aenderung: eintrag.aenderung ?? null,
  };
  // Bundesportal: Seite der Gemeinde (mit allen Stellen und Kontakten), sonst die allgemeine.
  // Kondominium-Flächen kennt das Portal nicht – dort die angrenzende Gemeinde.
  const portal = daten.bundesportal_region
    ? daten.bundesportal_region.replace("{ars}", eintrag.nachbar ?? ars)
    : daten.bundesportal ?? null;
  const hinweise = [];
  const liste = klassen.length ? klassen : ["unklar"];
  if (!klassen.length) hinweise.push(TEXTE.hinweis.keineStrasse);
  const ohneA = liste.filter((k) => k !== "A");

  if (!ohneA.length) {
    return {
      ...basis,
      klasse: "A",
      zustaendig: FESTE_STELLEN.fba,
      sicherheit: SICHERHEIT.VERMUTLICH,
      grund: TEXTE.grund.autobahn,
      quelle: TEXTE.quelle.autobahn,
      alternative: null,
      hinweise,
      keinBrief: true,
      kontakt: null,
      bundesportal: daten.bundesportal ?? null,
    };
  }
  if (liste.includes("A")) hinweise.push(TEXTE.hinweis.autobahnDabei);

  const top = hoechsteKlasse(ohneA);
  let e;
  let sicherheit;
  let alt = null;
  if (top === "unklar") {
    // Unbekannt, ob Gemeindestraße oder klassifizierte Straße: klassifiziert annehmen,
    // die Stelle für Gemeindestraßen als Alternative nennen.
    e = erg("K");
    sicherheit = schwaecher(e.sicherheit, SICHERHEIT.VERMUTLICH);
    const g = erg("G");
    if (g.stelle !== e.stelle) alt = { stelle: g.stelle, bedingung: TEXTE.bedingung.unklar };
  } else {
    e = erg(top);
    sicherheit = e.sicherheit;
    if (top !== "G" && ohneA.includes("G")) {
      const g = erg("G");
      if (g.stelle !== e.stelle) alt = { stelle: g.stelle, bedingung: TEXTE.bedingung.gemeindestrasse };
    }
  }
  const a = e.alternative ?? alt;
  return {
    ...basis,
    klasse: top,
    zustaendig: stelle(e.stelle),
    sicherheit,
    grund: e.grund,
    quelle: e.quelle,
    alternative: a ? { stelle: stelle(a.stelle), bedingung: a.bedingung } : null,
    hinweise,
    keinBrief: false,
    kontakt: (eintrag.kontakt && daten.kontakte?.[eintrag.kontakt]) ?? null,
    bundesportal: portal,
  };
}
