// laender.mjs — Landesdateien aus der Gemeindetabelle bauen (Logik, ohne Dateizugriff).
// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Eingabe: gemeinden_attr.json der Pipeline (docs/VERTRAG.md, „Zwischenprodukt"), optional
// kontakte.json (`zust kontakte`: Bundesportal, in Sachsen die Anschriften der Verwaltungen).
// Ausgabe: je Land eine Datei (Stellen, Ergebnisse und Kontakte entdoppelt, Gemeinden mit
// Verweisen), dazu index.json und Zeilen für die Review-CSV. Deterministisch: gleiche Eingabe,
// gleiche Bytes.

import { LAENDER, landAusKuerzel, landesdatei } from "../../js/laender.js";
import {
  BAU_KLASSEN, BUNDESPORTAL, ergebnisId, FESTE_STELLEN, HINWEIS, REGELN, resolveGemeinde,
} from "../../js/resolve.js";

export const SCHEMA = 1;

const MAP_KEYS = new Set(["stellen", "ergebnisse", "kontakte", "kreise", "gemeinden"]);

/**
 * Kontakt mit fester Schlüsselfolge und stabiler Id („c" + FNV-1a wie bei den Ergebnissen).
 * `allgemein`: nur die allgemeine Anschrift der Verwaltung (Rathaus, Landratsamt).
 */
function kontaktEintrag(k) {
  const kontakt = {
    name: k.name, adresse: k.adresse ?? null, telefon: k.telefon ?? [], email: k.email ?? [], web: k.web ?? [],
    ...(k.quelle ? { quelle: k.quelle } : {}),
    ...(k.allgemein ? { allgemein: true } : {}),
  };
  return { id: `c${ergebnisId(kontakt).slice(1)}`, kontakt };
}

/** „2026-10-02" → „02.10.2026". */
const datumDe = (iso) => iso.split("-").reverse().join(".");

/** JSON mit fester Schlüsselfolge; große Maps eine Zeile je Eintrag, sortiert (lesbare Diffs). */
export function serialisiere(obj) {
  const keys = Object.keys(obj);
  const zeilen = ["{"];
  keys.forEach((k, i) => {
    const v = obj[k];
    const komma = i < keys.length - 1 ? "," : "";
    if (MAP_KEYS.has(k) && v && typeof v === "object" && !Array.isArray(v)) {
      const eintraege = Object.keys(v).sort();
      if (!eintraege.length) {
        zeilen.push(`  ${JSON.stringify(k)}: {}${komma}`);
        return;
      }
      zeilen.push(`  ${JSON.stringify(k)}: {`);
      zeilen.push(eintraege.map((sk) => `    ${JSON.stringify(sk)}: ${JSON.stringify(v[sk])}`).join(",\n"));
      zeilen.push(`  }${komma}`);
    } else {
      zeilen.push(`  ${JSON.stringify(k)}: ${JSON.stringify(v)}${komma}`);
    }
  });
  zeilen.push("}");
  return `${zeilen.join("\n")}\n`;
}

function pruefeAttr(attr) {
  if (!attr || attr.schema !== SCHEMA) throw new Error(`gemeinden_attr.json: schema ${attr?.schema}, erwartet ${SCHEMA}`);
  if (!attr.gemeinden || typeof attr.gemeinden !== "object") throw new Error("gemeinden_attr.json: gemeinden fehlen");
  for (const [ars, g] of Object.entries(attr.gemeinden)) {
    if (g.ars !== ars) throw new Error(`gemeinden_attr.json: Schlüssel ${ars} ≠ ars ${g.ars}`);
    if (!landAusKuerzel(g.land)) throw new Error(`gemeinden_attr.json: ${ars} mit unbekanntem Land ${g.land}`);
    if (LAENDER[ars.slice(0, 2)]?.lkz !== g.land) throw new Error(`gemeinden_attr.json: ${ars} passt nicht zu Land ${g.land}`);
  }
}

/**
 * @param {object} attr Inhalt von gemeinden_attr.json
 * @param {{erzeugt?: string, kontakte?: object|null}} opts erzeugt = Datum für die Kopfzeilen
 *   (Default: meta.erzeugt); kontakte = Inhalt von kontakte.json (optional)
 * @returns {{dateien: Record<string, object>, index: object, review: string[][]}}
 */
export function baueLaender(attr, opts = {}) {
  pruefeAttr(attr);
  const meta = attr.meta ?? {};
  const erzeugt = opts.erzeugt ?? meta.erzeugt ?? null;
  const kontakte = opts.kontakte ?? null;
  const proLand = new Map();
  const review = [];

  for (const ars of Object.keys(attr.gemeinden).sort()) {
    const g = attr.gemeinden[ars];
    const portal = kontakte?.gemeinden?.[ars]?.wahl;
    const { zust, stellen } = resolveGemeinde(portal ? { ...g, bundesportal: portal } : g);
    let land = proLand.get(g.land);
    if (!land) {
      land = { stellen: { fba: FESTE_STELLEN.fba }, ergebnisse: {}, kontakte: {}, kreise: {}, gemeinden: {} };
      proLand.set(g.land, land);
    }
    Object.assign(land.stellen, stellen);
    const z = {};
    for (const k of BAU_KLASSEN) {
      const e = zust[k];
      const id = ergebnisId(e);
      const vorhanden = land.ergebnisse[id];
      if (vorhanden && JSON.stringify(vorhanden) !== JSON.stringify(e)) {
        throw new Error(`Ergebnis-Id ${id} doppelt vergeben (${ars}, Klasse ${k})`);
      }
      land.ergebnisse[id] = e;
      z[k] = id;
      const alt = e.alternative;
      review.push([
        g.land, ars, g.gen, g.kreis.name ?? g.kreis.gen, k, land.stellen[e.stelle].name, e.sicherheit,
        alt ? land.stellen[alt.stelle].name : "", alt ? alt.bedingung : "", e.grund, e.quelle,
      ]);
    }
    land.kreise[g.kreis.ars] = g.kreis.name ?? g.kreis.gen;
    const eintrag = { name: g.name ?? g.gen, kreis: g.kreis.ars };
    if (g.verband?.name) eintrag.verband = g.verband.name;
    if (Number.isFinite(g.ew)) eintrag.ew = g.ew;
    eintrag.z = z;
    // Kontakte der Stellen, die in den Ergebnissen dieser Gemeinde vorkommen: Kreisebene bzw.
    // kreisfreie Stadt (`k…` → kontakt) und die Gemeinde selbst bzw. ihr Amt (`g…`, `v…` →
    // kontakt_gemeinde).
    const ids = [...new Set(BAU_KLASSEN.flatMap((kl) => [zust[kl].stelle, zust[kl].alternative?.stelle]).filter(Boolean))];
    for (const [rolle, feld, noetig] of [
      ["kreis", "kontakt", ids.some((id) => id.startsWith("k"))],
      ["gemeinde", "kontakt_gemeinde", ids.some((id) => id === `g${ars}` || id.startsWith("v"))],
    ]) {
      const k = kontakte?.gemeinden?.[ars]?.[rolle];
      if (k && noetig) {
        const { id, kontakt } = kontaktEintrag(k);
        land.kontakte[id] = kontakt;
        eintrag[feld] = id;
      }
    }
    if (g.kondominium?.nachbar) eintrag.nachbar = g.kondominium.nachbar;
    if (g.gebietsaenderung) eintrag.aenderung = g.gebietsaenderung;
    land.gemeinden[ars] = eintrag;
  }

  const dateien = {};
  const laender = [];
  const lkzs = [...proLand.keys()].sort();
  // Quelle der Kontakte eines Landes: das Bundesportal oder ein Verzeichnis (`quelle`, `kurz`,
  // `stand` statt des Abrufdatums, wenn es einen hat), etwa das der Landesdirektion Sachsen.
  const kontaktQuelle = (bp) => bp.quelle ?? kontakte.meta.quelle;
  for (const lkz of lkzs) {
    const l = landAusKuerzel(lkz);
    const d = proLand.get(lkz);
    const sicherheit = { belegt: 0, vermutlich: 0, "nur Ebene": 0 };
    for (const e of Object.values(d.gemeinden)) sicherheit[d.ergebnisse[e.z.G].sicherheit] += 1;
    const datei = landesdatei(lkz);
    // Kontakte nur in Ländern, für die es welche gibt. Den Link auf die Seite der Gemeinde im
    // Bundesportal bekommt jedes Land, das die Leistung dort führt (`meta.portal`).
    const bp = kontakte?.meta?.laender?.[lkz];
    const region = kontakte?.meta?.portal?.[lkz] ?? bp?.region_url;
    const mitKontakt = Object.values(d.gemeinden).filter((e) => e.kontakt || e.kontakt_gemeinde).length;
    // Gemeinden, für die es nur die allgemeine Anschrift der Verwaltung gibt.
    const nurAllgemein = Object.values(d.gemeinden).filter((e) => {
      const ks = [e.kontakt, e.kontakt_gemeinde].filter(Boolean).map((id) => d.kontakte[id]);
      return ks.length > 0 && ks.every((k) => k.allgemein);
    }).length;
    dateien[datei] = {
      schema: SCHEMA,
      land: lkz,
      name: l.name,
      regeln: REGELN,
      daten: bp ? { ...meta.stand, kontakte: `${bp.kurz ?? "Bundesportal"} ${datumDe(bp.stand ?? bp.abgerufen)}` } : meta.stand ?? null,
      erzeugt,
      hinweis: HINWEIS,
      bundesportal: BUNDESPORTAL,
      ...(region ? { bundesportal_region: region } : {}),
      quellen: bp ? [...(meta.quellen ?? []), kontaktQuelle(bp)] : meta.quellen ?? [],
      stellen: d.stellen,
      ergebnisse: d.ergebnisse,
      ...(bp ? { kontakte: d.kontakte } : {}),
      kreise: d.kreise,
      gemeinden: d.gemeinden,
    };
    laender.push({
      lkz, name: l.name, datei, gemeinden: Object.keys(d.gemeinden).length, sicherheit,
      ...(bp ? { kontakte: mitKontakt } : {}),
      ...(nurAllgemein ? { allgemein: nurAllgemein } : {}),
    });
  }
  // Jede Quelle von Kontakten einmal, in der Reihenfolge der Länder.
  const kontaktQuellen = [];
  for (const lkz of Object.keys(kontakte?.meta?.laender ?? {}).sort()) {
    const q = kontaktQuelle(kontakte.meta.laender[lkz]);
    if (!kontaktQuellen.some((x) => x.id === q.id)) kontaktQuellen.push(q);
  }
  const index = {
    schema: SCHEMA,
    regeln: REGELN,
    daten: meta.stand ?? null,
    erzeugt,
    hinweis: HINWEIS,
    bundesportal: BUNDESPORTAL,
    quellen: [...(meta.quellen ?? []), ...kontaktQuellen],
    laender,
  };
  return { dateien, index, review };
}

export const REVIEW_KOPF = [
  "land", "ars", "gemeinde", "kreis", "klasse", "stelle", "sicherheit", "alternative", "bedingung",
  "grund", "quelle",
];

/** Review-CSV mit Semikolon und BOM (öffnet in Tabellenprogrammen mit Umlauten). */
export function reviewCsv(zeilen) {
  const zelle = (v) => {
    const s = String(v ?? "");
    return /[;"\n]/.test(s) ? `"${s.replaceAll('"', '""')}"` : s;
  };
  return `﻿${[REVIEW_KOPF, ...zeilen].map((z) => z.map(zelle).join(";")).join("\n")}\n`;
}
