// laender.mjs — Landesdateien aus der Gemeindetabelle bauen (Logik, ohne Dateizugriff).
// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Eingabe: gemeinden_attr.json der Pipeline (docs/VERTRAG.md, „Zwischenprodukt"), optional
// kontakte.json (`zust kontakte`, Bundesportal).
// Ausgabe: je Land eine Datei (Stellen, Ergebnisse und Kontakte entdoppelt, Gemeinden mit
// Verweisen), dazu index.json und Zeilen für die Review-CSV. Deterministisch: gleiche Eingabe,
// gleiche Bytes.

import { LAENDER, landAusKuerzel, landesdatei } from "../../js/laender.js";
import {
  BAU_KLASSEN, BUNDESPORTAL, ergebnisId, FESTE_STELLEN, HINWEIS, REGELN, resolveGemeinde,
} from "../../js/resolve.js";

export const SCHEMA = 1;

const MAP_KEYS = new Set(["stellen", "ergebnisse", "kontakte", "kreise", "gemeinden"]);

/** Kontakt mit fester Schlüsselfolge und stabiler Id („c" + FNV-1a wie bei den Ergebnissen). */
function kontaktEintrag(k) {
  const kontakt = {
    name: k.name, adresse: k.adresse ?? null, telefon: k.telefon ?? [], email: k.email ?? [], web: k.web ?? [],
    ...(k.abweichend ? { abweichend: true } : {}),
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
    const k = kontakte?.gemeinden?.[ars]?.kontakt;
    if (k) {
      const { id, kontakt } = kontaktEintrag(k);
      land.kontakte[id] = kontakt;
      eintrag.kontakt = id;
    }
    if (g.kondominium?.nachbar) eintrag.nachbar = g.kondominium.nachbar;
    if (g.gebietsaenderung) eintrag.aenderung = g.gebietsaenderung;
    land.gemeinden[ars] = eintrag;
  }

  const dateien = {};
  const laender = [];
  const lkzs = [...proLand.keys()].sort();
  for (const lkz of lkzs) {
    const l = landAusKuerzel(lkz);
    const d = proLand.get(lkz);
    const sicherheit = { belegt: 0, vermutlich: 0, "nur Ebene": 0 };
    for (const e of Object.values(d.gemeinden)) sicherheit[d.ergebnisse[e.z.G].sicherheit] += 1;
    const datei = landesdatei(lkz);
    // Kontakte (Bundesportal) nur in Ländern, für die es welche gibt; die übrigen Dateien bleiben
    // unverändert.
    const bp = kontakte?.meta?.laender?.[lkz];
    const mitKontakt = Object.values(d.gemeinden).filter((e) => e.kontakt).length;
    dateien[datei] = {
      schema: SCHEMA,
      land: lkz,
      name: l.name,
      regeln: REGELN,
      daten: bp ? { ...meta.stand, kontakte: `Bundesportal ${datumDe(bp.abgerufen)}` } : meta.stand ?? null,
      erzeugt,
      hinweis: HINWEIS,
      bundesportal: BUNDESPORTAL,
      ...(bp ? { bundesportal_region: bp.region_url } : {}),
      quellen: bp ? [...(meta.quellen ?? []), kontakte.meta.quelle] : meta.quellen ?? [],
      stellen: d.stellen,
      ergebnisse: d.ergebnisse,
      ...(bp ? { kontakte: d.kontakte } : {}),
      kreise: d.kreise,
      gemeinden: d.gemeinden,
    };
    laender.push({
      lkz, name: l.name, datei, gemeinden: Object.keys(d.gemeinden).length, sicherheit,
      ...(bp ? { kontakte: mitKontakt } : {}),
    });
  }
  const mitKontakten = Object.keys(kontakte?.meta?.laender ?? {}).length > 0;
  const index = {
    schema: SCHEMA,
    regeln: REGELN,
    daten: meta.stand ?? null,
    erzeugt,
    hinweis: HINWEIS,
    bundesportal: BUNDESPORTAL,
    quellen: mitKontakten ? [...(meta.quellen ?? []), kontakte.meta.quelle] : meta.quellen ?? [],
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
