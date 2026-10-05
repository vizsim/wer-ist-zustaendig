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
        "--low-detail=10",
    ):
        assert flag in args
    assert "--full-detail" not in " ".join(args), "z12 (Nachschlagen) bleibt voll aufgelöst"
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


def test_kreis_typen() -> None:
    typen = {
        "091780124124": ("stadt", "belegt"),
        "091785101201": ("gemeinde", "belegt"),
        "091785101202": ("gemeinde", "belegt"),
        "091620000000": ("stadt", "belegt"),
        "073395001001": ("kreis", "nur Ebene"),
        "073395001002": ("kreis", "vermutlich"),
    }
    assert grenzen.kreis_typen(typen) == {
        "09178": ("gemeinde", "belegt"),
        "09162": ("stadt", "belegt"),
        "07339": ("kreis", "nur Ebene"),  # Gleichstand: das erste Paar nach Name
    }


def _landesdatei(region: bool) -> dict:
    """Bayern im Kleinen: Freising (GKS) und eine Gemeinde mit Gemeindestraßen bei ihr selbst."""
    kreis, gks, gemeinde = "e1", "e2", "e3"
    return {
        **({"bundesportal_region": "https://…/region/{ars}"} if region else {}),
        "stellen": {},
        "ergebnisse": {
            kreis: {"stelle": "k09178"},
            gks: {"stelle": "g091780124124"},
            gemeinde: {"stelle": "g091785101201"},
        },
        "gemeinden": {
            "091780124124": {"z": dict.fromkeys("GKLB", gks), "kontakt_gemeinde": "c1"},
            "091785101201": {
                "z": {"G": gemeinde, "K": kreis, "L": kreis, "B": kreis},
                "kontakt": "c2",
            },
            "091785101202": {"z": {"G": gemeinde, "K": kreis, "L": kreis, "B": kreis}},
        },
    }


def test_kontakt_status() -> None:
    d = _landesdatei(region=True)
    assert grenzen.kontakt_status(d, "091780124124") == "k", "Stadt mit eigenem Kontakt"
    assert grenzen.kontakt_status(d, "091785101201") == "t", "Kreis ja, Gemeinde nein"
    assert grenzen.kontakt_status(d, "091785101202") == "p", "kein Kontakt, aber Link ins Portal"
    assert grenzen.kontakt_status(_landesdatei(region=False), "091785101202") == "n"


def test_kontakte_aus_landesdateien_und_mehrheit(tmp_path) -> None:
    (tmp_path / "index.json").write_text(json.dumps({"laender": [{"datei": "by.json"}]}))
    (tmp_path / "by.json").write_text(json.dumps(_landesdatei(region=True)))
    kontakte = grenzen.kontakte_aus_landesdateien(tmp_path)
    assert kontakte == {"091780124124": "k", "091785101201": "t", "091785101202": "p"}
    assert grenzen.mehrheit_je_kreis(kontakte) == {"09178": "k"}, "Gleichstand: der erste nach Name"
    assert grenzen.kontakte_aus_landesdateien(tmp_path / "fehlt") == {}


def test_schreibe_fgb(fixture_daten, tmp_path) -> None:
    gem, krs = tmp_path / "gemeinden.fgb", tmp_path / "kreise.fgb"
    alle = [p["ars"] for p in fixture_daten.punkte]
    typen = {ars: ("kreis", "nur Ebene") for ars in alle}
    typen["091785101201"] = ("gemeinde", "belegt")
    kontakte = dict.fromkeys(alle, "n") | {"091780124124": "k", "091785101201": "p"}
    n = grenzen.schreibe_fgb(fixture_daten.gpkg, gem, krs, typen, kontakte)
    assert n == 10
    df = pyogrio.read_dataframe(gem)
    assert df.crs.to_epsg() == 4326
    assert set(df.columns) == {"ars", "gen", "eg", "sg", "ko", "geometry"}
    assert dict(zip(df["ars"], df["ko"], strict=True))["091780124124"] == "k"
    assert df["ars"].str.len().eq(12).all()
    k = pyogrio.read_dataframe(krs)
    assert "Landkreis Freising" in set(k["name"])
    art = dict(zip(k["ars"], k["art"], strict=True))
    assert art["09178"] == "kreis"
    assert art["09162"] == "stadt"
    assert art["11000"] == "stadtstaat" and art["04012"] == "stadtstaat"
    assert art["07939"] == "kreis", "Kondominium: eigener Kreis in VG25, Art kreis"
    typ = {a: (e, s) for a, e, s in zip(k["ars"], k["eg"], k["sg"], strict=True)}
    assert typ["09178"] == ("gemeinde", "belegt"), "Freising und Musterdorf 1:1, Paar nach Name"
    assert typ["07339"] == ("kreis", "nur Ebene")
    ko = dict(zip(k["ars"], k["ko"], strict=True))
    assert ko["09178"] == "k", "Freising k, Musterdorf p – Gleichstand, der erste nach Name"
    assert ko["09162"] == "n"
    ohne = grenzen.schreibe_fgb(fixture_daten.gpkg, gem, krs, typen)
    assert ohne == 10 and "ko" not in pyogrio.read_dataframe(gem).columns, "ohne Kontakte kein Feld"


def test_schreibe_fgb_verlangt_vollstaendige_landesdateien(fixture_daten, tmp_path) -> None:
    import pytest

    with pytest.raises(RuntimeError, match="ohne Eintrag in den Landesdateien"):
        grenzen.schreibe_fgb(
            fixture_daten.gpkg,
            tmp_path / "g.fgb",
            tmp_path / "k.fgb",
            {"091620000000": ("stadt", "vermutlich")},
        )
