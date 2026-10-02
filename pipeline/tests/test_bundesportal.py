"""Bundesportal: Antworten normalisieren, eine Stelle wählen, Tabelle bauen – ohne Netz."""

from __future__ import annotations

import json

from zustkarte import bundesportal as bp


def _kontakt(name, telefon=(), web=(), disabled=False, personen=()):
    return {
        "disabled": disabled,
        "anschrift": [
            {"typ": "Postanschrift", "adresse": "85316 Freising"},
            {"typ": "Hausanschrift", "adresse": "Landshuter Str. 31, 85356 Freising"},
        ],
        "kontaktTelefon": list(telefon),
        "kontaktWeb": [{"key": w, "value": w} for w in web],
        "kontaktpersonen": list(personen),
        "name": name,
    }


def _antwort(*kontakte):
    return {"accordion-contact": {"contacts": list(kontakte)}}


def _stelle(name, telefon=(), email=(), web=()):
    return {
        "name": name,
        "adresse": None,
        "telefon": list(telefon),
        "email": list(email),
        "web": list(web),
    }


def test_stellen_aus_trennt_web_und_mail_und_laesst_personen_weg() -> None:
    lra = _kontakt(
        "Landratsamt Freising",
        telefon=["+49 8161 600-0"],
        web=["poststelle@kreis-fs.de", "https://www.kreis-freising.de"],
        personen=[{"name": "Erika Mustermann"}],
    )
    stellen = bp.stellen_aus(_antwort(lra, lra, _kontakt("Alt", disabled=True)))
    assert stellen == [
        {
            "name": "Landratsamt Freising",
            "adresse": "Landshuter Str. 31, 85356 Freising",
            "telefon": ["+49 8161 600-0"],
            "email": ["poststelle@kreis-fs.de"],
            "web": ["https://www.kreis-freising.de"],
        }
    ], "entdoppelt, ohne gesperrte Stelle, Hausanschrift vor Postanschrift, ohne Personen"
    assert bp.stellen_aus(None) == [] and bp.stellen_aus({}) == []


def test_keine_sozialen_netzwerke_als_webseite() -> None:
    nordhausen = _kontakt(
        "Landratsamt Nordhausen",
        telefon=["03631 911-0"],
        web=[
            "https://www.instagram.com/landkreisnordhausen/",
            "https://landkreis-nordhausen.de",
            "https://www.facebook.com/landkreisnordhausen",
            "ftp://landkreis-nordhausen.de",
        ],
    )
    assert bp.stellen_aus(_antwort(nordhausen))[0]["web"] == ["https://landkreis-nordhausen.de"]
    assert not bp.webseite("https://x.com/lra") and bp.webseite("https://www.example-x.com/")


def test_herausgeber_aus_laenderliste() -> None:
    api = "/leistungsverzeichnis/DE/api/zustaendigkeiten/99108014042000"
    antwort = {
        "gebietsliste": {
            "links": [
                {"url": f"{api}/BY/1806/090000000000"},
                {"url": f"{api}/TH/355360/160000000000"},
                {"url": "/kaputt"},
            ]
        }
    }
    assert bp.herausgeber_aus(antwort) == {"BY": "1806", "TH": "355360"}


def _gemeinde(kreis: str, kreisfrei: bool = False) -> dict:
    return {"kreis": {"gen": kreis, "kreisfrei": kreisfrei}}


def test_waehle_stelle_unserer_behoerde() -> None:
    soemmerda = _gemeinde("Sömmerda")
    lra = _stelle("Landratsamt Sömmerda", ["03634 354-0"], ["poststelle@lra-soemmerda.de"])
    verkehr = _stelle(
        "Landratsamt Sömmerda - Tiefbau, Straßenverkehr",
        ["+49 3634 354-417"],
        ["verkehrsbehoerde@lra-soemmerda.de"],
    )
    assert bp.waehle([], soemmerda) == (None, "keine")
    assert bp.waehle([lra], soemmerda) == (lra, "passt")
    assert bp.waehle([lra, verkehr], soemmerda) == (verkehr, "passt"), "Verkehr im Namen zählt"
    gleich = _stelle("Landratsamt Sömmerda", ["+49 3634 3540"], ["info@lra-soemmerda.de"])
    assert bp.waehle([lra, gleich], soemmerda) == (lra, "passt"), "gleiche Nummer, anders notiert"
    standort2 = _stelle(
        "Landratsamt Sömmerda - Verkehrswesen (Standort 2)",
        ["03635 1234"],
        ["info@lra-soemmerda.de"],
    )
    standort1 = {**standort2, "name": "Landratsamt Sömmerda - Verkehrswesen (Standort 1)"}
    assert bp.waehle([standort2, standort1], soemmerda) == (standort1, "passt"), (
        "zwei Standorte derselben Behörde: der erste nach Namen"
    )
    stadt_a = _stelle("Stadt Apolda - Straßenverkehrsbehörde", ["03644 65036"], [])
    stadt_b = _stelle("Stadt Ilmenau - Straßenverkehrsbehörde", ["03677 600-0"], [])
    assert bp.waehle([stadt_a, stadt_b], soemmerda) == (None, "mehrdeutig"), "zwei Behörden"

    erfurt = _stelle(
        "Landeshauptstadt Erfurt, Stadtverwaltung - Straßenverkehrsrecht",
        ["0361 655-4330"],
        ["verkehr.tiefbau-verkehr@erfurt.de"],
    )
    assert bp.waehle([erfurt], _gemeinde("Erfurt", kreisfrei=True))[1] == "passt"
    gks = _stelle("Große Kreisstadt Freising", ["+49 8161 54-0"], ["stadtverwaltung@freising.de"])
    lra_fs = _stelle("Landratsamt Freising", ["+49 8161 600-0"], ["poststelle@kreis-fs.de"])
    assert bp.waehle([gks, lra_fs], _gemeinde("Freising")) == (lra_fs, "passt"), "GKS ≠ Kreis"
    vka = _stelle("Verkehrsamt", ["03628 738-800"], ["vka@ilm-kreis.de"])
    assert bp.waehle([vka], _gemeinde("Ilm-Kreis")) == (vka, "passt"), "Kreis aus der Mail"


def test_waehle_fremde_und_abweichende_stellen() -> None:
    weimarer_land = _gemeinde("Weimarer Land")
    lra = _stelle("Gewerbe und Verkehr", ["03644 540-761"], ["post.ordnungsamt@weimarerland.de"])
    assert bp.waehle([lra], weimarer_land) == (lra, "passt"), "Gewerbe zählt mit Verkehr nicht"
    gewerbe = _stelle(
        "Stadtverwaltung Suhl - Gewerbeangelegenheiten", ["03681 742971"], ["gewerbe@stadtsuhl.de"]
    )
    assert bp.waehle([gewerbe], _gemeinde("Suhl", kreisfrei=True)) == (None, "keine")
    person = _stelle("Markt Essenbach - Bauverwaltung", [], ["grassl@essenbach.de"])
    assert bp.waehle([person], weimarer_land) == (None, "keine"), "persönliche Adresse fällt weg"

    apolda = _stelle(
        "Stadtverwaltung Apolda - Straßenverkehrsbehörde",
        ["03644 65036"],
        ["strassenverkehrsbehoerde@apolda.de"],
    )
    assert bp.waehle([lra, apolda], weimarer_land) == ({**apolda, "abweichend": True}, "stvb")
    ordnungsamt = _stelle(
        "Landgemeinde Am Ohmberg - Ordnungsamt", ["036077 939013"], ["ordnungsamt@lg-am-ohmberg.de"]
    )
    assert bp.waehle([ordnungsamt], _gemeinde("Eichsfeld")) == (None, "fremd")


def test_funktionspostfach() -> None:
    for m in (
        "poststelle@kreis-fs.de",
        "verkehrsbehoerde@x.de",
        "kfz@rhoen-grabfeld.de",
        "vka@ilm-kreis.de",
        "info@vg-l.de",
        "post.ordnungsamt@weimarerland.de",
    ):
        assert bp.funktionspostfach(m), m
    for m in ("grassl@essenbach.de", "erika.mustermann@stadt-x.de", "k.gorski@blankenhain.de"):
        assert not bp.funktionspostfach(m), m


def test_waehle_gemeinde_eigene_stelle() -> None:
    gemeinde = {
        "gen": "Adelschlag",
        "verband": {"gen": "Nassenfels"},
        "kreis": {"gen": "Eichstätt", "kreisfrei": False},
    }
    lra = _stelle("Landratsamt Eichstätt - SG 16", ["08421 70-0"], ["poststelle@lra-ei.bayern.de"])
    vg = _stelle(
        "Verwaltungsgemeinschaft Nassenfels", ["+49 8424 8911-0"], ["poststelle@nassenfels.de"]
    )
    nachbar = _stelle("Markt Kipfenberg - Ordnungsamt", ["08465 9410-0"], ["ordnung@kipfenberg.de"])
    assert bp.waehle_gemeinde([lra, nachbar, vg], gemeinde, lra) == vg, "VG der Gemeinde"
    assert bp.waehle_gemeinde([lra, nachbar], gemeinde, lra) is None, "fremde Gemeinde, Kreis"
    assert bp.waehle_gemeinde([vg], gemeinde, vg) is None, "schon Hauptkontakt"
    lenggries = {"gen": "Lenggries", "verband": None, "kreis": {"gen": "Bad Tölz-Wolfratshausen"}}
    ordnung = _stelle(
        "Gemeinde Lenggries - 1.2 Standesamt, Amt für öffentliche Ordnung",
        ["08042 5008-0"],
        ["ordnungsamt@lenggries.de"],
    )
    assert bp.waehle_gemeinde([ordnung], lenggries, None) == ordnung, "Ordnung zählt mit Standesamt"


def test_tabelle_aus_cache(tmp_path, monkeypatch) -> None:
    ordner = tmp_path / "RP"
    ordner.mkdir()
    (ordner / "_herausgeber.json").write_text(json.dumps({"ids": {"RP": "8958611"}}))
    antwort = _antwort(
        _kontakt(
            "Kreisverwaltung Mainz-Bingen - Straßenverkehr",
            telefon=["06132 787-0"],
            web=["verkehr@mainz-bingen.de"],
        )
    )
    eintrag = {"ars": "073395001001", "abgerufen": "2026-10-02T22:00:00+00:00", "antwort": antwort}
    (ordner / "073395001001.json").write_text(json.dumps(eintrag))
    monkeypatch.setattr(bp, "cache_ordner", lambda land: tmp_path / land)
    monkeypatch.setattr(bp, "laender_im_cache", lambda: ["RP"])

    kreis = {"name": "Landkreis Mainz-Bingen", "gen": "Mainz-Bingen", "kreisfrei": False}
    attr = {
        "073395001001": {"land": "RP", "name": "Musterdorf", "kreis": kreis, "kondominium": None},
        "079395001001": {
            "land": "RP",
            "name": "Deutsch-Luxemburgisches Hoheitsgebiet [Musterdorf]",
            "kreis": kreis,
            "kondominium": {"nachbar": "073395001001"},
        },
        "091620000000": {"land": "BY", "name": "München", "kreis": kreis, "kondominium": None},
    }
    daten, review = bp.tabelle(attr)
    rp = daten["meta"]["laender"]["RP"]
    assert rp["abgerufen"] == "2026-10-02"
    assert rp["region_url"].endswith("/herausgeber/RP-8958611/region/{ars}")
    g = daten["gemeinden"]
    assert g["073395001001"]["wahl"] == "passt"
    assert g["073395001001"]["kontakt"]["email"] == ["verkehr@mainz-bingen.de"]
    assert g["079395001001"]["kontakt"] == g["073395001001"]["kontakt"], "Kondominium: Nachbar"
    assert "091620000000" not in g, "Land ohne Abruf"
    assert len(review) == 2 and review[0][:5] == [
        "RP",
        "073395001001",
        "Musterdorf",
        "Landkreis Mainz-Bingen",
        "passt",
    ]
