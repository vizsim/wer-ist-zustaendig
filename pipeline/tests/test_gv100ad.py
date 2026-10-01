from __future__ import annotations

from datetime import date

import pytest

from zustkarte import gv100ad
from zustkarte.gv100ad import parse, zeile_gemeinde


def _zeile(**kw) -> str:
    werte = {
        "stand": "20251231",
        "ags": "09178124",
        "vb": "0124",
        "name": "Freising",
        "tkz": 67,
        "ew": 50721,
        "flaeche_ha": 8876,
    }
    werte.update(kw)
    return zeile_gemeinde(**werte)


def test_parse_gemeindesatz_und_ars() -> None:
    gv = parse(_zeile() + "\n")
    assert gv.stand == date(2025, 12, 31)
    g = gv.gemeinden["091780124124"]
    assert (g.ags, g.name, g.tkz, g.ew, g.flaeche_ha) == ("09178124", "Freising", 67, 50721, 8876)


def test_parse_ignoriert_andere_satzarten_und_leerzeilen() -> None:
    text = "10" + "20251231" + "09" + " " * 60 + "\n\n" + _zeile() + "\n"
    assert list(parse(text).gemeinden) == ["091780124124"]


def test_parse_fuellt_abgeschnittene_zeilen_auf() -> None:
    gv = parse(_zeile(tkz=66, ew=None, flaeche_ha=None).rstrip() + "\n")
    g = gv.gemeinden["091780124124"]
    assert g.ew is None and g.flaeche_ha is None and g.tkz == 66


@pytest.mark.parametrize(
    ("zeile", "meldung"),
    [
        ("99" + "20251231" + " " * 80, "unbekannte Satzart"),
        ("60" + "20251399" + " " * 80, "Gebietsstand"),
        ("60" + "20251231" + "0917812X0124" + " " * 70, "nicht numerisch"),
        ("60" + "20251231" + "0917", "zu kurz"),
    ],
)
def test_parse_fehler(zeile: str, meldung: str) -> None:
    with pytest.raises(ValueError, match=meldung):
        parse(zeile + "\n")


def test_parse_unbekanntes_textkennzeichen() -> None:
    with pytest.raises(ValueError, match="Textkennzeichen 12"):
        parse(_zeile(tkz=12))


def test_parse_doppelter_ars_und_mehrere_staende() -> None:
    with pytest.raises(ValueError, match="doppelt"):
        parse(_zeile() + "\n" + _zeile())
    with pytest.raises(ValueError, match="mehrere Gebietsstände"):
        parse(_zeile() + "\n" + _zeile(stand="20260630", ags="09178201", vb="5101"))


def test_parse_ohne_gemeinden() -> None:
    with pytest.raises(ValueError, match="keine Gemeindesätze"):
        parse("10" + "20251231" + " " * 70)


def test_lese_cp1252(tmp_path) -> None:
    p = tmp_path / "gv.txt"
    p.write_bytes(_zeile(name="Fürth").encode("cp1252"))
    assert gv100ad.lese(p).gemeinden["091780124124"].name == "Fürth"
