"""Ende-zu-Ende mit Testdaten: Tabelle → Landesdateien (node) → Kacheln (tippecanoe) → Prüfpunkte.

Läuft nur, wenn tippecanoe, tile-join und node samt npm-Abhängigkeiten (Repo-Root) da sind.
"""

from __future__ import annotations

import json
import subprocess
from shutil import which

import pytest
from conftest import PRUEFUNGEN, QUELLEN_META

from zustkarte import grenzen, gv100ad, tabelle, tiles
from zustkarte.config import repo_root

ROOT = repo_root()
BRAUCHT = (
    which("tippecanoe")
    and which("tile-join")
    and which("node")
    and (ROOT / "node_modules" / "pmtiles").exists()
)


@pytest.mark.skipif(not BRAUCHT, reason="tippecanoe/node/npm-Abhängigkeiten fehlen")
def test_ende_zu_ende(fixture_daten, tmp_path) -> None:
    attr, bericht = tabelle.baue(
        fixture_daten.gpkg,
        gv100ad.lese(fixture_daten.gv100ad),
        vg25_stand="2025-12-31",
        quellen_meta=QUELLEN_META,
        pruefungen=PRUEFUNGEN,
        erzeugt="2026-10-01",
    )
    attr_pfad = tmp_path / "interim" / "gemeinden_attr.json"
    tabelle.schreibe(attr, bericht, attr_pfad, tmp_path / "review" / "bericht.json")

    aus = tmp_path / "zustaendigkeit"
    subprocess.run(
        [
            "node",
            "tools/build-laender.mjs",
            "--attr",
            str(attr_pfad),
            "--aus",
            str(aus),
            "--review",
            str(tmp_path / "review" / "review.csv"),
        ],
        check=True,
        cwd=ROOT,
    )
    index = json.loads((aus / "index.json").read_text(encoding="utf-8"))
    assert {land["lkz"] for land in index["laender"]} == {"BY", "HB", "BE", "SH", "NI", "RP"}

    typen = grenzen.typen_aus_landesdateien(aus)
    assert typen["091780124124"] == ("stadt", "belegt")  # Große Kreisstadt in Bayern
    assert typen["091785101201"] == ("gemeinde", "belegt")  # Bayern: Gemeindestraßen
    assert typen["073395001001"] == ("verband", "vermutlich")  # Rheinland-Pfalz: Verbandsgemeinde
    assert typen["040110000000"] == ("stadtstaat", "belegt")
    gem_fgb, krs_fgb = tmp_path / "gemeinden.fgb", tmp_path / "kreise.fgb"
    grenzen.schreibe_fgb(fixture_daten.gpkg, gem_fgb, krs_fgb, typen)
    teile = [
        tiles.tippecanoe("gemeinden", gem_fgb, tmp_path / "g.pmtiles"),
        tiles.tippecanoe("kreise", krs_fgb, tmp_path / "k.pmtiles"),
    ]
    archiv = tiles.tile_join(aus / "gemeinden.pmtiles", teile)

    punkte = tmp_path / "punkte.json"
    punkte.write_text(json.dumps(fixture_daten.punkte, ensure_ascii=False), encoding="utf-8")
    r = subprocess.run(
        ["node", "tools/check-golden.mjs", "--archiv", str(archiv), "--punkte", str(punkte)],
        cwd=ROOT,
        capture_output=True,
        text=True,
    )
    assert r.returncode == 0, r.stdout + r.stderr

    # Stichprobe um Freising: Ring mit Loch, Exklave im Loch, Nachbar Musterdorf.
    csv = tmp_path / "review" / "grenzpunkte.csv"
    r = subprocess.run(
        [
            "node",
            "tools/check-stichprobe.mjs",
            "--archiv",
            str(archiv),
            "--n",
            "100",
            "--bbox",
            "11.70,48.37,11.86,48.43",
            "--csv",
            str(csv),
        ],
        cwd=ROOT,
        capture_output=True,
        text=True,
    )
    assert r.returncode == 0, r.stdout + r.stderr
    assert "100 mit genau einem ARS, 0 mit mehreren" in r.stdout
    assert "Überlappung 0 · Fehler 0" in r.stdout
    zeilen = csv.read_text(encoding="utf-8-sig").splitlines()
    assert zeilen[0].startswith("lat;lon;erwartet;gemeinde")
    assert len(zeilen) == 21  # Kopf + 20 Grenzpunkte mit Nachbar
    assert all("sgx.geodatenzentrum.de/wms_vg25" in z for z in zeilen[1:])

    r = subprocess.run(
        ["node", "tools/lookup.mjs", "48.40", "11.71", "G", "--daten", str(aus)],
        cwd=ROOT,
        capture_output=True,
        text=True,
        check=True,
    )
    assert "Klasse G: Stadt Freising – Straßenverkehrsbehörde" in r.stdout  # Große Kreisstadt

    r = subprocess.run(
        ["node", "tools/lookup.mjs", "48.40", "11.82", "K", "G", "--daten", str(aus)],
        cwd=ROOT,
        capture_output=True,
        text=True,
        check=True,
    )
    assert "Klasse K: Landratsamt Freising – Straßenverkehrsbehörde" in r.stdout
    assert "Alternative: Musterdorf – Straßenverkehrsbehörde" in r.stdout
