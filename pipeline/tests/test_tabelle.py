from __future__ import annotations

import copy

import pytest
from conftest import PRUEFUNGEN, QUELLEN_META

from zustkarte import gv100ad, tabelle, vg25


def _baue(f, **kw):
    gv = kw.pop("gv", None) or gv100ad.lese(f.gv100ad)
    return tabelle.baue(
        f.gpkg,
        gv,
        vg25_stand=kw.pop("vg25_stand", "2025-12-31"),
        quellen_meta=QUELLEN_META,
        pruefungen=kw.pop("pruefungen", PRUEFUNGEN),
        erzeugt="2026-10-01",
        **kw,
    )


def test_vg25_ebenen_normalisiert(fixture_daten) -> None:
    gem = vg25.lese_ebene(fixture_daten.gpkg, "gem")
    assert len(gem) == 9, "GF = 8 wird verworfen"
    assert {"ARS", "GEN", "BEZ", "IBZ", "NBD", "FK_S3", "LKZ"} <= set(gem.columns)
    rbz = vg25.lese_ebene(fixture_daten.gpkg, "rbz")  # im Fixture mit kleinen Spaltennamen
    assert list(rbz["ARS"]) == ["091"]


def test_voller_name_und_kreisfrei() -> None:
    assert vg25.voller_name("Prignitz", "Landkreis", "ja") == "Landkreis Prignitz"
    assert vg25.voller_name("Salzlandkreis", "Landkreis", "nein") == "Salzlandkreis"
    assert vg25.ist_kreisfrei("Kreisfreie Stadt", 40)
    assert vg25.ist_kreisfrei("Stadtkreis", None)
    assert not vg25.ist_kreisfrei("Landkreis", 40), "BEZ geht vor IBZ"
    assert vg25.ist_kreisfrei("Sonstiges", 41)


def test_tabelle_felder(fixture_daten) -> None:
    attr, bericht = _baue(fixture_daten)
    g = attr["gemeinden"]
    assert attr["schema"] == 1
    assert list(g) == sorted(g)
    muc = g["091620000000"]
    assert muc["kreis"]["kreisfrei"] is True
    assert muc["kreis"]["name"] == "München"
    assert muc["rb"] == {"ars": "091", "gen": "Oberbayern", "name": "Regierungsbezirk Oberbayern"}
    assert muc["tkz"] == [61] and muc["ew"] == 1510378
    fs = g["091780124124"]
    assert fs["kreis"]["name"] == "Landkreis Freising" and fs["tkz"] == [67]
    assert fs["verband"] is None
    md = g["091785101201"]
    assert md["verband"]["name"] == "Verwaltungsgemeinschaft Musterberg"
    assert md["verband"]["sitz"] == "091785101201"
    sw = g["010539105105"]
    assert sw["gemeindefrei"] is True and sw["ew"] is None and sw["rb"] is None
    hn = g["032410001001"]
    assert hn["kreis"]["name"] == "Region Hannover" and hn["rb"] is None, "FK_S3 = K: kein RB"
    assert g["073395001001"]["verband"]["name"] == "Verbandsgemeinde Musterland"
    assert attr["meta"]["stand"]["gebiet"] == "VG25 31.12.2025"
    assert bericht.gks_je_land == {"BY": 1}
    assert bericht.gemeinden_je_land["BY"] == 3


def test_tabelle_datenstaende_muessen_passen(fixture_daten) -> None:
    with pytest.raises(tabelle.PruefFehler, match="Datenstände passen nicht"):
        _baue(fixture_daten, vg25_stand="2024-12-31")


def test_tabelle_gemeinde_fehlt_im_verzeichnis(fixture_daten) -> None:
    gv = gv100ad.lese(fixture_daten.gv100ad)
    gv.gemeinden.pop("110000000000")
    with pytest.raises(tabelle.PruefFehler, match="110000000000 .*fehlt im Gemeindeverzeichnis"):
        _baue(fixture_daten, gv=gv)


def test_tabelle_gemeinde_fehlt_in_vg25(fixture_daten) -> None:
    gv = gv100ad.lese(fixture_daten.gv100ad)
    extra = copy.copy(gv.gemeinden["110000000000"])
    object.__setattr__(extra, "ars", "160000000001")
    gv.gemeinden["160000000001"] = extra
    with pytest.raises(tabelle.PruefFehler, match="fehlt in VG25"):
        _baue(fixture_daten, gv=gv)


def test_tabelle_kreisfrei_widerspruch(fixture_daten) -> None:
    gv = gv100ad.lese(fixture_daten.gv100ad)
    hn = gv.gemeinden["032410001001"]
    object.__setattr__(hn, "tkz", 61)  # laut GV kreisfrei, in VG25 aber Region Hannover
    with pytest.raises(tabelle.PruefFehler, match="laut GV-ISys kreisfrei"):
        _baue(fixture_daten, gv=gv)


def test_tabelle_grosse_kreisstaedte_plausibel(fixture_daten) -> None:
    pruef = {"grosse_kreisstaedte": {"BY": {"erwartet": 29, "toleranz": 3}}, "mindest_gemeinden": 0}
    with pytest.raises(tabelle.PruefFehler, match="BY: 1 Große Kreisstädte, erwartet 29"):
        _baue(fixture_daten, pruefungen=pruef)
    with pytest.raises(tabelle.PruefFehler, match="unerwartet"):
        _baue(fixture_daten, pruefungen={"grosse_kreisstaedte": {}, "mindest_gemeinden": 0})


def test_tabelle_mindestzahl_je_land(fixture_daten) -> None:
    with pytest.raises(tabelle.PruefFehler, match="TH: nur 0 Gemeinden"):
        _baue(fixture_daten, pruefungen={**PRUEFUNGEN, "mindest_gemeinden": 1})


def test_tabelle_gebietsaenderungen(fixture_daten) -> None:
    gv = gv100ad.lese(fixture_daten.gv100ad)
    aktuell = gv100ad.Gemeindeverzeichnis(
        stand=gv.stand.replace(year=2026), gemeinden=dict(gv.gemeinden)
    )
    aktuell.gemeinden.pop("091785101201")
    neu = copy.copy(gv.gemeinden["091780124124"])
    object.__setattr__(neu, "name", "Freising an der Isar")
    aktuell.gemeinden["091780124124"] = neu
    attr, _ = _baue(fixture_daten, gv_aktuell=aktuell)
    g = attr["gemeinden"]
    assert g["091785101201"]["gebietsaenderung"]["art"].startswith("nicht mehr")
    assert g["091780124124"]["gebietsaenderung"] == {
        "art": "umbenannt",
        "name_neu": "Freising an der Isar",
        "stand": "2026-12-31",
    }
    assert g["091620000000"]["gebietsaenderung"] is None
    assert attr["meta"]["stand"]["aenderungen"] == "GV-ISys 31.12.2026"
