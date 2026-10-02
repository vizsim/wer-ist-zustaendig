from __future__ import annotations

import json

import pyogrio

from zustkarte import grenzen, tiles


def test_profil_args_gemeinden() -> None:
    args = tiles.profil_args(tiles.profile()["gemeinden"])
    assert args[:3] == ["--force", "-l", "gemeinden"]
    for flag in (
        "--minimum-zoom=7",
        "--maximum-zoom=12",
        "--detect-shared-borders",
        "--no-tiny-polygon-reduction",
        "--no-feature-limit",
        "--no-tile-size-limit",
    ):
        assert flag in args
    assert "-l" in tiles.profil_args(tiles.profile()["kreise"])


def test_typen_aus_landesdateien(tmp_path) -> None:
    (tmp_path / "index.json").write_text(json.dumps({"laender": [{"datei": "by.json"}]}))
    (tmp_path / "by.json").write_text(
        json.dumps(
            {
                "stellen": {"k09178": {"art": "kreis"}},
                "ergebnisse": {"e1": {"stelle": "k09178", "sicherheit": "nur Ebene"}},
                "gemeinden": {"091780124124": {"z": {"G": "e1"}}},
            }
        )
    )
    assert grenzen.typen_aus_landesdateien(tmp_path) == {"091780124124": ("kreis", "nur Ebene")}
    assert grenzen.typen_aus_landesdateien(tmp_path / "fehlt") == {}


def test_schreibe_fgb(fixture_daten, tmp_path) -> None:
    gem, krs = tmp_path / "gemeinden.fgb", tmp_path / "kreise.fgb"
    alle = [p["ars"] for p in fixture_daten.punkte]
    typen = {ars: ("kreis", "nur Ebene") for ars in alle}
    n = grenzen.schreibe_fgb(fixture_daten.gpkg, gem, krs, typen)
    assert n == 10
    df = pyogrio.read_dataframe(gem)
    assert df.crs.to_epsg() == 4326
    assert set(df.columns) == {"ars", "gen", "eg", "sg", "geometry"}
    assert df["ars"].str.len().eq(12).all()
    k = pyogrio.read_dataframe(krs)
    assert "Landkreis Freising" in set(k["name"])
    art = dict(zip(k["ars"], k["art"], strict=True))
    assert art["09178"] == "kreis"
    assert art["09162"] == "stadt"
    assert art["11000"] == "stadtstaat" and art["04012"] == "stadtstaat"
    assert art["07939"] == "kreis", "Kondominium: eigener Kreis in VG25, Art kreis"


def test_schreibe_fgb_verlangt_vollstaendige_landesdateien(fixture_daten, tmp_path) -> None:
    import pytest

    with pytest.raises(RuntimeError, match="ohne Eintrag in den Landesdateien"):
        grenzen.schreibe_fgb(
            fixture_daten.gpkg,
            tmp_path / "g.fgb",
            tmp_path / "k.fgb",
            {"091620000000": ("stadt", "vermutlich")},
        )
