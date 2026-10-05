"""Gemeindetabelle bauen: VG25 + GV-ISys (Textkennzeichen, Bevölkerung) → gemeinden_attr.json.

Ein Eintrag je Gemeinde (Schlüssel ARS), Felder siehe docs/VERTRAG.md („Zwischenprodukt").
Die Prüfungen brechen den Build ab, statt halbe Daten durchzulassen:
ARS 12-stellig und eindeutig, jede Gemeinde mit Kreis und Land, VG25 und GV-ISys mit derselben
Gemeindemenge, kreisfreie Städte in beiden Quellen gleich, Große Kreisstädte plausibel.

Zwei bekannte Ausnahmen bei der Gemeindemenge (echte Daten 31.12.2025):
- Gemeinsames deutsch-luxemburgisches Hoheitsgebiet (Mosel, Sauer, Our): nur in VG25, als
  Flächen mit `BEZ = Kondominium`; `SDV_ARS` zeigt auf die angrenzende deutsche Gemeinde. Der
  Eintrag übernimmt deren Kreis, Verband und Regierungsbezirk (`kondominium.nachbar`).
- Unbewohnte gemeindefreie Gebiete ohne Fläche in VG25 (Küstengewässer M-V, das Kondominium
  als Ganzes): nur im GV-ISys, Textkennzeichen 66 ohne Einwohner – Warnung statt Fehler.

Dazu kommen die zwölf Berliner Bezirke als eigene Einträge (`bezirk`, zustkarte.berlin): Berlin
ist eine Gemeinde, Straßenverkehrsbehörde sind aber die Bezirksämter.
"""

from __future__ import annotations

import json
import re
from collections import Counter
from dataclasses import dataclass, field
from datetime import date
from pathlib import Path
from typing import Any

import pandas as pd

from zustkarte import berlin, vg25
from zustkarte.gv100ad import Gemeindeverzeichnis

SCHEMA = 1

LAENDER = {
    "01": "SH",
    "02": "HH",
    "03": "NI",
    "04": "HB",
    "05": "NW",
    "06": "HE",
    "07": "RP",
    "08": "BW",
    "09": "BY",
    "10": "SL",
    "11": "BE",
    "12": "BB",
    "13": "MV",
    "14": "SN",
    "15": "ST",
    "16": "TH",
}
TKZ_KREISFREI = {61, 62}
TKZ_GKS = 67
TKZ_UNBEWOHNT = 66
KONDOMINIUM = "Kondominium"
AUFGELOEST = "nicht mehr im aktuellen Gemeindeverzeichnis (aufgelöst oder umgeschlüsselt)"
ARS_RE = re.compile(r"^\d{12}$")


class PruefFehler(RuntimeError):
    def __init__(self, fehler: list[str]):
        self.fehler = fehler
        liste = "\n  - ".join(fehler[:40])
        mehr = f"\n  … und {len(fehler) - 40} weitere" if len(fehler) > 40 else ""
        super().__init__(f"Gemeindetabelle: {len(fehler)} Prüffehler\n  - {liste}{mehr}")


@dataclass
class Bericht:
    gemeinden_je_land: dict[str, int] = field(default_factory=dict)
    gks_je_land: dict[str, int] = field(default_factory=dict)
    kreise_bez: dict[str, int] = field(default_factory=dict)
    gemeinden_bez: dict[str, int] = field(default_factory=dict)
    warnungen: list[str] = field(default_factory=list)


def _de(d: date | str) -> str:
    d = date.fromisoformat(d) if isinstance(d, str) else d
    return d.strftime("%d.%m.%Y")


def _str(v: Any) -> str | None:
    if v is None or (not isinstance(v, str) and pd.isna(v)):
        return None
    s = str(v).strip()
    return s or None


def _int(v: Any) -> int | None:
    if v is None or pd.isna(v):
        return None
    return int(v)


def baue(
    gpkg: Path,
    gv: Gemeindeverzeichnis,
    *,
    vg25_stand: str,
    quellen_meta: list[dict[str, str]],
    pruefungen: dict[str, Any],
    gv_aktuell: Gemeindeverzeichnis | None = None,
    erzeugt: str | None = None,
    bezirke: dict[str, str] | None = None,
) -> tuple[dict[str, Any], Bericht]:
    """Liest VG25 und GV-ISys, verknüpft, prüft. Gibt (attr, bericht) zurück.

    `bezirke`: Nummer → Name der Berliner Bezirke (config/berlin.yaml); je Bezirk ein Eintrag
    neben Berlin."""
    fehler: list[str] = []
    bericht = Bericht()

    if date.fromisoformat(vg25_stand) != gv.stand:
        raise PruefFehler(
            [
                f"Datenstände passen nicht: VG25 {_de(vg25_stand)}, GV-ISys {_de(gv.stand)} – "
                "beide Quellen zum selben Stichtag laden (sources.yaml)."
            ]
        )

    gem = vg25.lese_ebene(gpkg, "gem")
    krs = vg25.lese_ebene(gpkg, "krs").set_index("ARS")
    vwg = vg25.lese_ebene(gpkg, "vwg").set_index("ARS")
    rbz = vg25.lese_ebene(gpkg, "rbz").set_index("ARS")

    bericht.kreise_bez = dict(Counter(f"{r.BEZ} (IBZ {r.IBZ})" for r in krs.itertuples()))
    bericht.gemeinden_bez = dict(Counter(f"{r.BEZ} (IBZ {r.IBZ})" for r in gem.itertuples()))

    gemeinden: dict[str, dict[str, Any]] = {}
    kondominium = []
    for r in gem.itertuples(index=False):
        ars = str(r.ARS)
        if not ARS_RE.fullmatch(ars):
            fehler.append(f"{ars}: kein 12-stelliger ARS")
            continue
        land = _str(getattr(r, "LKZ", None)) or LAENDER.get(ars[:2])
        if land != LAENDER.get(ars[:2]):
            fehler.append(f"{ars}: Land {land} passt nicht zum Schlüssel {ars[:2]}")
            continue
        if _str(r.BEZ) == KONDOMINIUM:
            kondominium.append(r)  # unten: braucht den Eintrag der angrenzenden Gemeinde
            continue
        if ars[:5] not in krs.index:
            fehler.append(f"{ars} ({r.GEN}): Kreis {ars[:5]} fehlt in vg25_krs")
            continue
        k = krs.loc[ars[:5]]
        kreis = {
            "ars": ars[:5],
            "gen": _str(k.GEN),
            "bez": _str(k.BEZ),
            "ibz": _int(k.get("IBZ")),
            "nbd": _str(k.get("NBD")),
            "name": vg25.voller_name(k.GEN, k.BEZ, k.get("NBD")),
            "kreisfrei": vg25.ist_kreisfrei(k.BEZ, k.get("IBZ")),
        }
        verband = None
        if ars[5] == "5":
            if ars[:9] not in vwg.index:
                fehler.append(
                    f"{ars} ({r.GEN}): Verwaltungsgemeinschaft {ars[:9]} fehlt in vg25_vwg"
                )
                continue
            v = vwg.loc[ars[:9]]
            verband = {
                "ars": ars[:9],
                "gen": _str(v.GEN),
                "bez": _str(v.BEZ),
                "ibz": _int(v.get("IBZ")),
                "name": vg25.voller_name(v.GEN, v.BEZ, v.get("NBD")),
                "sitz": _str(v.get("SDV_ARS")),
            }
        rb = None
        if _str(getattr(r, "FK_S3", None)) == "R" and ars[2] != "0":
            if ars[:3] in rbz.index:
                rb_row = rbz.loc[ars[:3]]
                rb = {
                    "ars": ars[:3],
                    "gen": _str(rb_row.GEN),
                    "name": vg25.voller_name(rb_row.GEN, rb_row.BEZ, rb_row.get("NBD")),
                }
            else:
                fehler.append(f"{ars} ({r.GEN}): Regierungsbezirk {ars[:3]} fehlt in vg25_rbz")
        gvg = gv.gemeinden.get(ars)
        if gvg is None:
            fehler.append(f"{ars} ({r.GEN}): fehlt im Gemeindeverzeichnis {_de(gv.stand)}")
            continue
        eintrag: dict[str, Any] = {
            "ars": ars,
            "ags": _str(getattr(r, "AGS", None)) or ars[:5] + ars[9:],
            "gen": _str(r.GEN),
            "name": vg25.voller_name(r.GEN, r.BEZ, getattr(r, "NBD", None)),
            "bez": _str(r.BEZ),
            "ibz": _int(getattr(r, "IBZ", None)),
            "land": land,
            "gemeindefrei": ars[5] == "9",
            "kreis": kreis,
            "verband": verband,
            "rb": rb,
            "tkz": [gvg.tkz] if gvg.tkz is not None else [],
            "ew": gvg.ew,
            "gebietsaenderung": None,
            "kondominium": None,
            "bezirk": None,
        }
        if gv_aktuell is not None:
            neu = gv_aktuell.gemeinden.get(ars)
            if neu is None:
                eintrag["gebietsaenderung"] = {
                    "art": AUFGELOEST,
                    "stand": gv_aktuell.stand.isoformat(),
                }
            elif neu.name != gvg.name:
                eintrag["gebietsaenderung"] = {
                    "art": "umbenannt",
                    "name_neu": neu.name,
                    "stand": gv_aktuell.stand.isoformat(),
                }
        gemeinden[ars] = eintrag

    for r in kondominium:
        ars = str(r.ARS)
        nachbar = _str(getattr(r, "SDV_ARS", None))
        n = gemeinden.get(nachbar or "")
        if n is None or nachbar[:2] != ars[:2]:
            fehler.append(
                f"{ars} ({r.GEN}): Kondominium ohne angrenzende Gemeinde (SDV_ARS {nachbar})"
            )
            continue
        gemeinden[ars] = {
            **n,
            "ars": ars,
            "ags": _str(getattr(r, "AGS", None)) or ars[:5] + ars[9:],
            "gen": _str(r.GEN),
            "name": vg25.voller_name(r.GEN, r.BEZ, getattr(r, "NBD", None)),
            "bez": _str(r.BEZ),
            "ibz": _int(getattr(r, "IBZ", None)),
            "gemeindefrei": False,
            "tkz": [],
            "ew": None,
            "gebietsaenderung": None,
            "kondominium": {"nachbar": nachbar},
            "bezirk": None,
        }

    if bezirke:
        if berlin.BERLIN in gemeinden:
            gemeinden.update(berlin.eintraege(gemeinden[berlin.BERLIN], bezirke))
        else:
            fehler.append(f"Berlin ({berlin.BERLIN}) fehlt – ohne die Stadt keine Bezirke")

    vg_ars = set(gem["ARS"].astype(str))
    for ars in sorted(set(gv.gemeinden) - vg_ars):
        g = gv.gemeinden[ars]
        if g.tkz == TKZ_UNBEWOHNT and not g.ew:
            bericht.warnungen.append(
                f"{ars} ({g.name}): unbewohntes gemeindefreies Gebiet ohne Fläche in VG25 – "
                "übersprungen"
            )
        else:
            fehler.append(f"{ars} ({g.name}): im Gemeindeverzeichnis, fehlt in VG25")

    _pruefe_kreisfrei(gemeinden, fehler, bericht)
    _pruefe_gks(gemeinden, pruefungen.get("grosse_kreisstaedte", {}), fehler, bericht)
    mindest = int(pruefungen.get("mindest_gemeinden", 1))
    je_land = Counter(g["land"] for g in gemeinden.values())
    bericht.gemeinden_je_land = dict(sorted(je_land.items()))
    for lkz in sorted(set(LAENDER.values())):
        if je_land.get(lkz, 0) < mindest:
            fehler.append(
                f"{lkz}: nur {je_land.get(lkz, 0)} Gemeinden (mindestens {mindest} erwartet)"
            )

    if fehler:
        raise PruefFehler(fehler)

    meta = {
        "erzeugt": erzeugt or date.today().isoformat(),
        "stand": {
            "gebiet": f"VG25 {_de(vg25_stand)}",
            "status": f"GV-ISys {_de(gv.stand)}",
            "einwohner": f"GV-ISys {_de(gv.stand)}",
            "aenderungen": f"GV-ISys {_de(gv_aktuell.stand)}" if gv_aktuell else None,
        },
        "quellen": quellen_meta,
    }
    attr = {"schema": SCHEMA, "meta": meta, "gemeinden": dict(sorted(gemeinden.items()))}
    return attr, bericht


def _pruefe_kreisfrei(gemeinden: dict[str, dict], fehler: list[str], bericht: Bericht) -> None:
    echte = {ars: g for ars, g in gemeinden.items() if not g["kondominium"] and not g["bezirk"]}
    je_kreis = Counter(g["kreis"]["ars"] for g in echte.values())
    for ars, g in echte.items():
        tkz_frei = bool(set(g["tkz"]) & TKZ_KREISFREI)
        if tkz_frei and not g["kreis"]["kreisfrei"]:
            fehler.append(
                f"{ars} ({g['gen']}): laut GV-ISys kreisfrei, Kreis {g['kreis']['ars']} hat "
                f"in VG25 BEZ {g['kreis']['bez']!r}"
            )
        if g["kreis"]["kreisfrei"] and not tkz_frei:
            bericht.warnungen.append(
                f"{ars} ({g['gen']}): Kreis kreisfrei, Textkennzeichen {g['tkz']} (nicht 61/62)"
            )
        if g["kreis"]["kreisfrei"] and je_kreis[g["kreis"]["ars"]] != 1:
            fehler.append(
                f"Kreis {g['kreis']['ars']} ({g['kreis']['gen']}) ist kreisfrei, hat aber "
                f"{je_kreis[g['kreis']['ars']]} Gemeinden"
            )


def _pruefe_gks(
    gemeinden: dict[str, dict], erwartung: dict[str, dict], fehler: list[str], bericht: Bericht
) -> None:
    gks = Counter(g["land"] for g in gemeinden.values() if TKZ_GKS in g["tkz"])
    bericht.gks_je_land = dict(sorted(gks.items()))
    for lkz, n in gks.items():
        if lkz not in erwartung:
            fehler.append(
                f"{lkz}: {n} Gemeinden mit Textkennzeichen 67 (Große Kreisstadt) – unerwartet"
            )
    for lkz, e in erwartung.items():
        n = gks.get(lkz, 0)
        if abs(n - int(e["erwartet"])) > int(e["toleranz"]):
            fehler.append(
                f"{lkz}: {n} Große Kreisstädte, erwartet {e['erwartet']} ± {e['toleranz']} "
                f"({e.get('quelle', 'pruefungen.yaml')})"
            )


def schreibe(attr: dict[str, Any], bericht: Bericht, attr_pfad: Path, bericht_pfad: Path) -> None:
    attr_pfad.parent.mkdir(parents=True, exist_ok=True)
    attr_pfad.write_text(json.dumps(attr, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
    bericht_pfad.parent.mkdir(parents=True, exist_ok=True)
    bericht_pfad.write_text(
        json.dumps(bericht.__dict__, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
