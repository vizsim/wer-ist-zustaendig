from __future__ import annotations

import json
import re

import pyogrio
import pytest
from conftest import BEZIRKE

from zustkarte import berlin, grenzen, tiles
from zustkarte.config import repo_root


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
    bezirke = tiles.profil_args(tiles.profile()["bezirke"])
    assert bezirke[:3] == ["--force", "-l", "bezirke"], "Layer `bezirke` (Vertrag)"
    assert "--maximum-zoom=12" in bezirke and "--detect-shared-borders" in bezirke


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
    """Bayern im Kleinen: Freising (GKS), Gemeinden mit Gemeindestraßen bei sich selbst – eine mit
    Kontakt des Landratsamts, eine ohne Kontakt, eine nur mit der allgemeinen Anschrift ihres
    Rathauses und eine mit beidem."""
    kreis, gks = "e1", "e2"
    gemeinde = {f"0917851012{n:02d}": f"e2{n:02d}" for n in (1, 2, 3, 4)}

    def klassen(ars: str) -> dict:
        return {"G": gemeinde[ars], "K": kreis, "L": kreis, "B": kreis}

    return {
        **({"bundesportal_region": "https://…/region/{ars}"} if region else {}),
        "stellen": {},
        "ergebnisse": {
            kreis: {"stelle": "k09178"},
            gks: {"stelle": "g091780124124"},
            **{e: {"stelle": f"g{ars}"} for ars, e in gemeinde.items()},
        },
        "kontakte": {
            "c1": {"name": "Stadt Freising - Verkehrsamt"},
            "c2": {"name": "Landratsamt Freising - Straßenverkehr"},
            "c3": {"name": "Gemeinde Musterdorf", "allgemein": True},
        },
        "gemeinden": {
            "091780124124": {"z": dict.fromkeys("GKLB", gks), "kontakt_gemeinde": "c1"},
            "091785101201": {"z": klassen("091785101201"), "kontakt": "c2"},
            "091785101202": {"z": klassen("091785101202")},
            "091785101203": {"z": klassen("091785101203"), "kontakt_gemeinde": "c3"},
            "091785101204": {
                "z": klassen("091785101204"),
                "kontakt": "c2",
                "kontakt_gemeinde": "c3",
            },
        },
    }


def test_kontakt_status() -> None:
    d = _landesdatei(region=True)
    assert grenzen.kontakt_status(d, "091780124124") == "k", "Stadt mit eigenem Kontakt"
    assert grenzen.kontakt_status(d, "091785101201") == "t", "Kreis ja, Gemeinde nein"
    assert grenzen.kontakt_status(d, "091785101202") == "p", "kein Kontakt, aber Link ins Portal"
    assert grenzen.kontakt_status(d, "091785101203") == "a", "nur die allgemeine Anschrift"
    assert grenzen.kontakt_status(d, "091785101204") == "t", "Kreis ja, Gemeinde nur allgemein"
    assert grenzen.kontakt_status(_landesdatei(region=False), "091785101202") == "n"


def test_kontakt_status_berlin() -> None:
    """In Berlin hat der Senat (`be-senat`) den Kontakt der Kreisebene, der Bezirk den der
    Gemeinde; ohne Bezirk (`be-bezirk`) gibt es keinen – wie `kontaktRolle` in js/resolve.js."""
    assert grenzen.kontakt_rolle("be-senat", "110000000001") == "kreis"
    assert grenzen.kontakt_rolle("g110000000001", "110000000001") == "gemeinde"
    assert grenzen.kontakt_rolle("be-bezirk", "110000000000") is None

    def klassen(g: str) -> dict:
        return {"G": g, "K": "es", "L": "es", "B": "es"}

    d = {
        "ergebnisse": {
            "e1": {"stelle": "g110000000001"},
            "e4": {"stelle": "g110000000004"},
            "eb": {"stelle": "be-bezirk"},
            "es": {"stelle": "be-senat"},
        },
        "kontakte": {
            "cs": {"name": "Senat", "allgemein": True},
            "c1": {"name": "Bezirksamt Mitte"},
        },
        "gemeinden": {
            "110000000001": {"z": klassen("e1"), "kontakt": "cs", "kontakt_gemeinde": "c1"},
            "110000000004": {"z": klassen("e4"), "kontakt": "cs"},
            "110000000000": {"z": klassen("eb"), "kontakt": "cs"},
        },
    }
    assert grenzen.kontakt_status(d, "110000000001") == "t", "Bezirk ja, Senat nur allgemein"
    assert grenzen.kontakt_status(d, "110000000004") == "a", "Bezirk ohne Kontakt"
    assert grenzen.kontakt_status(d, "110000000000") == "a", "ganz Berlin: nur der Senat"


def test_kontakt_status_bremen_hamburg() -> None:
    """Bremen: Amt bzw. Magistrat mit dem Kontakt der Kreisebene, die Polizei (Alternative) ohne;
    Hamburg: die Verkehrsdirektion wie die Kreisebene, das Kommissariat ohne."""
    assert grenzen.kontakt_rolle("hb-asv", "040110000000") == "kreis"
    assert grenzen.kontakt_rolle("hb-bhv", "040120000000") == "kreis"
    assert grenzen.kontakt_rolle("hb-pol", "040110000000") is None
    assert grenzen.kontakt_rolle("hh-vd", "020000000000") == "kreis"
    assert grenzen.kontakt_rolle("hh-pk", "020000000000") is None
    alle = {k: "e" for k in ("G", "K", "L", "B")}
    d = {
        "ergebnisse": {"e": {"stelle": "hb-asv"}, "h": {"stelle": "hh-pk"}},
        "kontakte": {"ca": {"name": "Amt für Straßen und Verkehr Bremen"}},
        "gemeinden": {
            "040110000000": {"z": alle, "kontakt": "ca"},
            "020000000000": {"z": dict.fromkeys(alle, "h"), "kontakt": "ca"},
        },
    }
    assert grenzen.kontakt_status(d, "040110000000") == "k"
    assert grenzen.kontakt_status(d, "020000000000") == "n", (
        "Kommissariat: nie der Kontakt der Kreisebene"
    )


def test_kontakt_rolle_wie_in_resolve_js() -> None:
    """Die festen Stellen mit dem Kontakt der Kreisebene stehen in js/resolve.js und in grenzen.py
    – gleich halten."""
    quelle = (repo_root() / "js" / "resolve.js").read_text(encoding="utf-8")
    m = re.search(r"const ROLLE_KREIS = new Set\(\[([^\]]*)\]\)", quelle)
    assert m, "ROLLE_KREIS fehlt in js/resolve.js"
    assert set(re.findall(r'"([^"]+)"', m.group(1))) == grenzen.ROLLE_KREIS


def test_kontakte_aus_landesdateien_und_mehrheit(tmp_path) -> None:
    (tmp_path / "index.json").write_text(json.dumps({"laender": [{"datei": "by.json"}]}))
    (tmp_path / "by.json").write_text(json.dumps(_landesdatei(region=True)))
    kontakte = grenzen.kontakte_aus_landesdateien(tmp_path)
    assert kontakte == {
        "091780124124": "k",
        "091785101201": "t",
        "091785101202": "p",
        "091785101203": "a",
        "091785101204": "t",
    }
    assert grenzen.mehrheit_je_kreis(kontakte) == {"09178": "t"}
    del kontakte["091785101204"]
    assert grenzen.mehrheit_je_kreis(kontakte) == {"09178": "a"}, "Gleichstand: der erste nach Name"
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


def test_schreibe_bezirke(fixture_daten, tmp_path) -> None:
    flaechen = berlin.flaechen(fixture_daten.bezirke, BEZIRKE, melde=lambda _: None)
    typen = {berlin.bezirk_ars(nr): ("stadtstaat", "vermutlich") for nr in BEZIRKE}
    ziel = tmp_path / "bezirke.fgb"
    assert grenzen.schreibe_bezirke(flaechen, ziel, typen) == 12
    df = pyogrio.read_dataframe(ziel)
    assert df.crs.to_epsg() == 4326
    assert set(df.columns) == {"bezirk", "name", "geometry"}, "Vertrag: Layer `bezirke`"
    assert sorted(df["bezirk"]) == [f"1100000000{nr}" for nr in BEZIRKE]
    assert df.loc[df["bezirk"] == "110000000007", "name"].item() == "Tempelhof-Schöneberg"
    del typen["110000000012"]
    with pytest.raises(RuntimeError, match="ohne Eintrag in den Landesdateien: 110000000012"):
        grenzen.schreibe_bezirke(flaechen, ziel, typen)
    assert grenzen.schreibe_bezirke(flaechen, ziel) == 12, "ohne Landesdateien keine Prüfung"


def test_schreibe_fgb_verlangt_vollstaendige_landesdateien(fixture_daten, tmp_path) -> None:
    with pytest.raises(RuntimeError, match="ohne Eintrag in den Landesdateien"):
        grenzen.schreibe_fgb(
            fixture_daten.gpkg,
            tmp_path / "g.fgb",
            tmp_path / "k.fgb",
            {"091620000000": ("stadt", "vermutlich")},
        )
