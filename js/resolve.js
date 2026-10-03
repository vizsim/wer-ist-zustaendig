// resolve.js — Zuständige Straßenverkehrsbehörde je Gemeinde und Straßenklasse. REIN.
// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Zwei Teile:
//  1. Build: `resolveGemeinde(gemeinde)` → Ergebnis je Straßenklasse (G, K, L, B) samt Stellen.
//     tools/build-laender.mjs schreibt daraus die Landesdateien (docs/VERTRAG.md).
//  2. Laufzeit: `auswahl(landesdatei, ars, klassen)` → eine zuständige Stelle für die Straßen
//     einer Auswahl (höchste Klasse gewinnt; Gemeindestraße ggf. als Alternative).
//
// Ohne Landesregel (Phase 1): Rückfall auf die Kreisebene mit amtlichem Namen; Stadtstaaten mit
// eigener Regel. Phase 2: Landesregeln für Bayern, Thüringen und Schleswig-Holstein (`LANDESREGELN`).
// Kein Rechtsrat: Jede Aussage trägt Sicherheit und Quelle.

import { kreisBehoerde, mitZusatz, stadtName } from "./namen.js";
import { hoechsteKlasse } from "./strassenklasse.js";

export const REGELN = Object.freeze({ version: "0.7.1", phase: 2, stand: "2026-10-03" });

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
    byGemeinde: "In Bayern ist die Gemeinde für ihre Gemeindestraßen selbst Straßenverkehrsbehörde.",
    byGemeindeVg:
      "In Bayern ist die Gemeinde für ihre Gemeindestraßen selbst Straßenverkehrsbehörde; die " +
      "Verwaltungsarbeit dafür erledigt ihre Verwaltungsgemeinschaft.",
    byLandratsamt: "Für Kreis-, Staats- und Bundesstraßen ist in Bayern das Landratsamt Straßenverkehrsbehörde.",
    byGks: "Große Kreisstädte sind in Bayern für alle Straßen ihres Gebiets Straßenverkehrsbehörde.",
    thStadt:
      "In Thüringen sind Städte mit über 30.000 Einwohnern und große kreisangehörige Städte selbst " +
      "Straßenverkehrsbehörde – für alle Straßen außer Autobahnen.",
    thAntrag: "Diese Stadt ist in Thüringen auf Antrag Straßenverkehrsbehörde – für alle Straßen außer Bundesstraßen.",
    thBundesstrasse:
      "Für Bundesstraßen bleibt in Thüringen der Landkreis zuständig, auch wo die Stadt sonst " +
      "Straßenverkehrsbehörde ist.",
    thLandkreis: "In Thüringen ist für Gemeinden ohne eigene Straßenverkehrsbehörde der Landkreis zuständig.",
    thLandkreisPortal:
      "In Thüringen ist für Gemeinden ohne eigene Straßenverkehrsbehörde der Landkreis zuständig; " +
      "das Land nennt im Bundesportal für diese Gemeinde dieselbe Stelle.",
    shKreis:
      "In Schleswig-Holstein ist der Kreis Straßenverkehrsbehörde. Halten und Parken, Baustellen " +
      "und Veranstaltungen ordnet das Amt bzw. die amtsfreie Gemeinde an.",
    shKreisKnapp:
      "In Schleswig-Holstein ist der Kreis Straßenverkehrsbehörde, solange eine Gemeinde nicht mehr " +
      "als 20.000 Einwohner hat. Diese liegt knapp darunter; die maßgebliche Zahl kann abweichen.",
    shGemeinde: "In Schleswig-Holstein ordnen Gemeinden mit mehr als 20.000 Einwohnern Verkehrszeichen selbst an.",
    shGemeindeKnapp:
      "In Schleswig-Holstein ordnen Gemeinden mit mehr als 20.000 Einwohnern Verkehrszeichen selbst " +
      "an. Diese liegt knapp darüber; die maßgebliche Zahl kann abweichen.",
    shAntrag: "Diese Gemeinde ordnet in Schleswig-Holstein auf Antrag selbst Verkehrszeichen an.",
  }),
  bedingung: Object.freeze({
    gks: "Große Kreisstadt – sie kann selbst zuständig sein",
    gemeindestrasse: "falls nur die Gemeindestraße betroffen ist",
    unklar: "falls es eine Gemeindestraße ist",
    berlinNetz: "falls die Straße zum übergeordneten Straßennetz gehört",
    portalStvb: "laut Bundesportal ist die Gemeinde selbst Straßenverkehrsbehörde",
    thAntragMoeglich: "Gemeinde mit 10.000 bis 30.000 Einwohnern – sie kann auf Antrag selbst zuständig sein",
    shParken: "falls es nur um Halten und Parken, eine Baustelle oder eine Veranstaltung geht",
  }),
  quelle: Object.freeze({
    phase1: "Rückfall auf die Kreisebene – die Regel dieses Landes ist noch nicht eingearbeitet",
    bremen:
      "Verordnung über die Zuständigkeiten nach der Straßenverkehrs-Ordnung (Bremen) vom " +
      "19.01.2016, zuletzt geändert 02.09.2025",
    berlin: "ASOG Bln, Zuständigkeitskatalog Ordnungsaufgaben Nr. 11 Abs. 4, Nr. 22b Abs. 3 (Wortlaut nur sekundär geprüft)",
    hamburg: "Zuständigkeitsanordnung Hamburg (Titel und Fassung noch nicht geprüft)",
    autobahn: "§ 45 Abs. 11 StVO",
    kondominium:
      "Rückfall: angrenzende Gemeinde laut VG25 (SDV_ARS); Grenzvertrag Deutschland–Luxemburg nicht ausgewertet",
    bundesportal:
      "Bundesportal, zuständige Stelle für „Aufstellung von Verkehrszeichen anregen\" (Angabe des Landes)",
    byOertlich: "Art. 2 Abs. 1 Nr. 1, Art. 3 Abs. 1 und Art. 6 ZustGVerk (Bayern), Fassung vom 17.12.2024",
    byOertlichVg:
      "Art. 2 Abs. 1 Nr. 1, Art. 3 Abs. 1 und Art. 6 ZustGVerk (Bayern), Fassung vom 17.12.2024; " +
      "§ 1 Nr. 5 der Verordnung über Aufgaben der Mitgliedsgemeinden von Verwaltungsgemeinschaften, " +
      "zuletzt geändert 04.06.2024; Art. 4 Abs. 2 VGemO",
    byUnter: "Art. 2 Abs. 1 Nr. 2 ZustGVerk (Bayern), Fassung vom 17.12.2024",
    byGks: "§ 2 Nr. 2 GrKrV (Bayern), Fassung ab 01.03.2025",
    thStadt:
      "§ 2 Abs. 3 Satz 1 Nr. 2 Buchst. a–c der Thüringer Verordnung über Zuständigkeiten auf dem " +
      "Gebiet des Straßenverkehrsrechts vom 13.02.2007, zuletzt geändert 20.05.2026 [S]; " +
      "Einwohner laut GV-ISys 31.12.2025",
    thAntrag:
      "§ 2 Abs. 3 Satz 1 Nr. 2 Buchst. d und Abs. 7 der Thüringer Verordnung über Zuständigkeiten " +
      "auf dem Gebiet des Straßenverkehrsrechts [S]; Stadt als Straßenverkehrsbehörde laut " +
      "Bundesportal bzw. Webseite",
    thLandkreis:
      "§ 2 Abs. 3 Satz 1 Nr. 2 Buchst. e der Thüringer Verordnung über Zuständigkeiten auf dem " +
      "Gebiet des Straßenverkehrsrechts vom 13.02.2007, zuletzt geändert 20.05.2026 [S]; " +
      "Gemeinden auf Antrag: Abs. 7; Einwohner laut GV-ISys 31.12.2025",
    shStadt: "§ 3 Abs. 1 Nr. 1 Buchst. a StrVRZustVO (Schleswig-Holstein) vom 08.11.2004, Fassung vom 01.12.2025",
    shKreis:
      "§ 3 Abs. 1 Nr. 1 Buchst. a und § 5 Abs. 1 StrVRZustVO (Schleswig-Holstein) vom 08.11.2004, " +
      "Fassung vom 01.12.2025; Einwohner laut GV-ISys 31.12.2025",
    shGemeinde:
      "§ 4 Abs. 1 StrVRZustVO (Schleswig-Holstein) vom 08.11.2004, Fassung vom 01.12.2025; " +
      "Einwohner laut GV-ISys 31.12.2025",
    shAntrag: "§ 4 Abs. 2 und Anlage Nr. 1 StrVRZustVO (Schleswig-Holstein) vom 08.11.2004, Fassung vom 01.12.2025",
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

/** Die Gemeinde als Stelle (örtliche Straßenverkehrsbehörde bzw. Stadt als untere). */
function gemeindeStelle(g, art = "gemeinde", ebene = "oertliche") {
  const name = art === "stadt" ? stadtName(g.gen) : g.name ?? g.gen;
  return { id: `g${g.ars}`, name: mitZusatz(name), ebene, art };
}

const istGks = (g) => Array.isArray(g.tkz) && g.tkz.includes(67);
const istStadt = (g) => Array.isArray(g.tkz) && (g.tkz.includes(63) || g.tkz.includes(67));

/**
 * Bayern (belegt): kreisangehörige Gemeinden sind örtliche Straßenverkehrsbehörde für ihre
 * Gemeindestraßen (Art. 3 ZustGVerk), sonst das Landratsamt; Große Kreisstädte und kreisfreie
 * Städte für alle Straßen (§ 2 Nr. 2 GrKrV, Art. 2 ZustGVerk). In einer Verwaltungsgemeinschaft
 * bleibt die Aufgabe bei der Gemeinde (§ 1 Nr. 5 AufVGem); die Gemeinschaft führt sie als deren
 * Behörde aus (Art. 4 Abs. 2 VGemO) – ihr Amt ist dann der Kontakt.
 */
function regelBayern(g, klasse) {
  const kreis = kreisStelle(g);
  if (g.kreis.kreisfrei) return ergebnis(kreis, SICHERHEIT.BELEGT, "kreisfrei", "byUnter");
  if (g.gemeindefrei) return ergebnis(kreis, SICHERHEIT.VERMUTLICH, "gemeindefrei", "byUnter");
  if (istGks(g)) return ergebnis(gemeindeStelle(g, "stadt", "untere"), SICHERHEIT.BELEGT, "byGks", "byGks");
  if (klasse === "G") {
    const vg = Boolean(g.verband);
    return ergebnis(gemeindeStelle(g), SICHERHEIT.BELEGT, vg ? "byGemeindeVg" : "byGemeinde", vg ? "byOertlichVg" : "byOertlich");
  }
  return ergebnis(kreis, SICHERHEIT.BELEGT, "byLandratsamt", "byUnter");
}

const TH_EISENACH = "160630105105";
/**
 * Thüringer Gemeinden, die auf Antrag Straßenverkehrsbehörde sind (§ 2 Abs. 7 und 8 der
 * Zuständigkeitsverordnung), soweit nicht schon das Bundesportal sie so nennt. Die Liste der
 * Rechtsverordnung liegt nicht vor (docs/TODO.md); jeder Eintrag mit Beleg.
 */
export const TH_STAEDTE_AUF_ANTRAG = Object.freeze({
  "160700004004": "Arnstadt – Webseite der Stadt und des Landratsamts Ilm-Kreis, 03.10.2026",
});

/**
 * Thüringen (vermutlich): Städte über 30.000 Einwohner, große kreisangehörige Städte und Eisenach
 * für alle Straßen; Städte auf Antrag für alle außer Bundesstraßen; im Übrigen der Landkreis.
 * Ob eine Gemeinde mit 10.000 bis 30.000 Einwohnern auf Antrag zuständig ist, wissen wir nur aus
 * Portal und Liste – sonst steht sie als Alternative da.
 */
function regelThueringen(g, klasse) {
  const kreis = kreisStelle(g);
  if (g.kreis.kreisfrei) return ergebnis(kreis, SICHERHEIT.VERMUTLICH, "kreisfrei", "thStadt");
  if (g.gemeindefrei) return null;
  const ew = g.ew ?? 0;
  const stadt = gemeindeStelle(g, "stadt", "untere");
  if (ew > 30000 || g.ars === TH_EISENACH) return ergebnis(stadt, SICHERHEIT.VERMUTLICH, "thStadt", "thStadt");
  const antrag = TH_STAEDTE_AUF_ANTRAG[g.ars] || (g.bundesportal === "stvb" && ew > 10000);
  if (antrag && klasse === "B") return ergebnis(kreis, SICHERHEIT.VERMUTLICH, "thBundesstrasse", "thAntrag");
  if (antrag) return ergebnis(stadt, SICHERHEIT.VERMUTLICH, "thAntrag", "thAntrag");
  const selbst = gemeindeStelle(g, istStadt(g) ? "stadt" : "gemeinde", "untere");
  let alternative = null;
  if (ew > 10000 && klasse !== "B") alternative = { stelle: selbst, bedingung: "thAntragMoeglich" };
  else if (g.bundesportal === "stvb") alternative = { stelle: selbst, bedingung: "portalStvb" };
  const grund = g.bundesportal === "passt" ? "thLandkreisPortal" : "thLandkreis";
  return ergebnis(kreis, SICHERHEIT.VERMUTLICH, grund, "thLandkreis", alternative);
}

/** Ein Verband (in Schleswig-Holstein das Amt) als Stelle. */
function verbandStelle(g) {
  return { id: `v${g.verband.ars}`, name: mitZusatz(g.verband.name), ebene: "oertliche", art: "verband" };
}

/**
 * Schleswig-Holsteiner Gemeinden, die auf Antrag Straßenverkehrsbehörde nach § 45 StVO sind
 * (§ 4 Abs. 2 StrVRZustVO, Anlage Nr. 1).
 */
export const SH_AUF_ANTRAG = Object.freeze({ "010620018018": "Glinde" });

/**
 * Schleswig-Holstein (belegt, StrVRZustVO): Kreise und kreisfreie Städte sind Straßenverkehrs-
 * behörde (§ 3). Gemeinden mit mehr als 20.000 Einwohnern ordnen Verkehrszeichen selbst an
 * (§ 4 Abs. 1), auf Antrag auch kleinere (§ 4 Abs. 2, Anlage). Halten und Parken, Baustellen und
 * Veranstaltungen ordnen sonst das Amt bzw. die amtsfreie Gemeinde an (§ 5) – die Alternative.
 * Nahe an 20.000 Einwohnern hängt es von der maßgeblichen Zahl ab: dort nur „vermutlich".
 */
function regelSchleswigHolstein(g) {
  const kreis = kreisStelle(g);
  if (g.kreis.kreisfrei) return ergebnis(kreis, SICHERHEIT.BELEGT, "kreisfrei", "shStadt");
  if (g.gemeindefrei) return ergebnis(kreis, SICHERHEIT.VERMUTLICH, "gemeindefrei", "shKreis");
  const ew = g.ew ?? 0;
  const knapp = Math.abs(ew - 20000) <= 1000;
  const sicherheit = knapp ? SICHERHEIT.VERMUTLICH : SICHERHEIT.BELEGT;
  const selbst = gemeindeStelle(g, istStadt(g) ? "stadt" : "gemeinde", "oertliche");
  if (SH_AUF_ANTRAG[g.ars]) return ergebnis(selbst, SICHERHEIT.BELEGT, "shAntrag", "shAntrag");
  if (ew > 20000) return ergebnis(selbst, sicherheit, knapp ? "shGemeindeKnapp" : "shGemeinde", "shGemeinde");
  const ort = g.verband ? verbandStelle(g) : selbst;
  return ergebnis(kreis, sicherheit, knapp ? "shKreisKnapp" : "shKreis", "shKreis", { stelle: ort, bedingung: "shParken" });
}

/** Landesregeln: (Gemeinde, Klasse) → Ergebnis, oder null für den Rückfall auf Phase 1. */
export const LANDESREGELN = Object.freeze({ BY: regelBayern, SH: regelSchleswigHolstein, TH: regelThueringen });

/**
 * Regel samt Sonderfällen:
 * - Kondominium (VG25 `BEZ = Kondominium`): Der Eintrag trägt Kreis und Verband der angrenzenden
 *   Gemeinde, also deren Stelle – aber nie sicherer als „nur Ebene".
 * - Landesregel (`LANDESREGELN`), sonst Phase 1.
 * - Bundesportal (`g.bundesportal`, vom Build aus kontakte.json ergänzt): Nennt das Land dort für
 *   die Gemeinde dieselbe Stelle (`passt`), wird aus „nur Ebene" „vermutlich". Nennt es die
 *   Gemeinde selbst als Straßenverkehrsbehörde (`stvb`), steht sie als Alternative dabei.
 */
function regel(g, klasse) {
  if (g.kondominium) {
    const e = regelPhase1(g);
    return { ...e, sicherheit: SICHERHEIT.NUR_EBENE, grund: TEXTE.grund.kondominium, quelle: TEXTE.quelle.kondominium };
  }
  const landesregel = LANDESREGELN[g.land]?.(g, klasse);
  if (landesregel) return landesregel;
  const e = regelPhase1(g);
  if (g.bundesportal === "passt" && e.sicherheit === SICHERHEIT.NUR_EBENE) {
    return { ...e, sicherheit: SICHERHEIT.VERMUTLICH, grund: TEXTE.grund.bundesportal, quelle: TEXTE.quelle.bundesportal };
  }
  if (g.bundesportal === "stvb" && !e.alternative && !g.kreis.kreisfrei && e.stelle.art === "kreis") {
    const stelle = gemeindeStelle(g, istStadt(g) ? "stadt" : "gemeinde", "untere");
    return { ...e, alternative: { stelle, bedingung: TEXTE.bedingung.portalStvb } };
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
    const e = regel(g, klasse);
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
  // Kontakt einer Stelle: die Gemeinde selbst bzw. ihr Amt (`kontakt_gemeinde`) oder die
  // Kreisebene bzw. die kreisfreie Stadt (`kontakt`); Bund und Stadtstaaten haben keinen.
  const kontaktZu = (id) => {
    const s = String(id ?? "");
    const ref = s === `g${ars}` || s.startsWith("v") ? eintrag.kontakt_gemeinde : s.startsWith("k") ? eintrag.kontakt : null;
    return (ref && daten.kontakte?.[ref]) ?? null;
  };
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
  // Bundesportal: Seite der Gemeinde mit allen Stellen und Kontakten – nur in Ländern, die die
  // Leistung dort führen (`bundesportal_region`). Kondominium-Flächen kennt das Portal nicht –
  // dort die angrenzende Gemeinde.
  const portal = daten.bundesportal_region
    ? daten.bundesportal_region.replace("{ars}", eintrag.nachbar ?? ars)
    : null;
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
      bundesportal: null,
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
    alternative: a ? { stelle: stelle(a.stelle), bedingung: a.bedingung, kontakt: kontaktZu(a.stelle) } : null,
    hinweise,
    keinBrief: false,
    kontakt: kontaktZu(e.stelle),
    bundesportal: portal,
  };
}
