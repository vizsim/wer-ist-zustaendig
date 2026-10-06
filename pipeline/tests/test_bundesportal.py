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
    person = _stelle("Markt Essenbach - Bauverwaltung", [], ["mustermann@essenbach.de"])
    assert bp.waehle([person], weimarer_land) == (None, "keine"), "persönliche Adresse fällt weg"

    apolda = _stelle(
        "Stadtverwaltung Apolda - Straßenverkehrsbehörde",
        ["03644 65036"],
        ["strassenverkehrsbehoerde@apolda.de"],
    )
    assert bp.waehle([lra, apolda], weimarer_land) == (apolda, "stvb")
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
        "kanzlei@lra-aoe.de",
        "post.ordnungsamt@weimarerland.de",
        "infrastruktur@eisenach.de",
        "svb-da@bezirksamt-neukoelln.de",
        "sondernutzung_ag@ba-mh.berlin.de",
        "66.12@hannover-stadt.de",
        "fd32.1@goettingen.de",
    ):
        assert bp.funktionspostfach(m), m
    for m in (
        "mustermann@essenbach.de",
        "erika.mustermann@stadt-x.de",
        "k.mustermann@blankenhain.de",
        "66.mustermann@stadt-x.de",
    ):
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
    assert bp.waehle_gemeinde([lra, nachbar, vg], gemeinde) == vg, "VG der Gemeinde"
    assert bp.waehle_gemeinde([lra, nachbar], gemeinde) is None, "fremde Gemeinde, Kreis"
    assert bp.waehle_kreis([lra, nachbar, vg], gemeinde) == lra, "Landratsamt als Kreisstelle"
    lenggries = {"gen": "Lenggries", "verband": None, "kreis": {"gen": "Bad Tölz-Wolfratshausen"}}
    ordnung = _stelle(
        "Gemeinde Lenggries - 1.2 Standesamt, Amt für öffentliche Ordnung",
        ["08042 5008-0"],
        ["ordnungsamt@lenggries.de"],
    )
    assert bp.waehle_gemeinde([ordnung], lenggries) == ordnung, "Ordnung zählt mit Standesamt"

    grainau = {"gen": "Grainau", "verband": None, "kreis": {"gen": "Garmisch-Partenkirchen"}}
    buergerbuero = _stelle(
        "Gemeinde Grainau - Sg. 21: Bürgerbüro", ["+49 8821 9818-0"], ["buergeramt@grainau.de"]
    )
    lra_gap = _stelle("Landratsamt Garmisch-Partenkirchen - Sg. 52", ["08821 751-1"], [])
    gewaehlt = bp.waehle_gemeinde([lra_gap, buergerbuero], grainau)
    assert gewaehlt == {**buergerbuero, "name": "Gemeinde Grainau"}, "nur Fachbereich: ohne Namen"
    person = _stelle("Gemeinde Grainau - Verkehrsrecht", [], ["max.muster@grainau.de"])
    assert bp.waehle_gemeinde([person], grainau) is None, "persönliche Adresse bleibt draußen"


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

    kreis = {
        "ars": "07339",
        "name": "Landkreis Mainz-Bingen",
        "gen": "Mainz-Bingen",
        "kreisfrei": False,
    }
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
    assert bp.tabelle(attr)[0]["gemeinden"] == {}, "RP ist nicht freigegeben"
    daten, review = bp.tabelle(attr, laender=["RP"])
    rp = daten["meta"]["laender"]["RP"]
    assert rp["abgerufen"] == "2026-10-02"
    assert rp["region_url"].endswith("/herausgeber/RP-8958611/region/{ars}")
    assert daten["meta"]["portal"] == {"RP": rp["region_url"]}, "Länder laut Länderliste"
    g = daten["gemeinden"]
    assert g["073395001001"]["wahl"] == "passt"
    assert g["073395001001"]["kreis"]["email"] == ["verkehr@mainz-bingen.de"]
    assert g["073395001001"]["gemeinde"] is None
    assert g["079395001001"]["kreis"] == g["073395001001"]["kreis"], "Kondominium: Nachbar"
    assert "091620000000" not in g, "Land ohne Abruf"
    assert len(review) == 2 and review[0][:5] == [
        "RP",
        "073395001001",
        "Musterdorf",
        "Landkreis Mainz-Bingen",
        "passt",
    ]


def test_ergaenze_von_hand(monkeypatch) -> None:
    """Berlin führt die Leistung nicht im Portal: Senat (Kreis-ARS) und Bezirke (ARS, Rolle
    gemeinde) nur von Hand, ohne Urteil des Portals; das Land mit eigener Quelle wie Sachsen."""
    senat = {
        "name": "Senatsverwaltung",
        "telefon": ["(030) 9025-0"],
        "email": ["post@senmvku.berlin.de"],
        "allgemein": True,
        "stand": "2026-10-05",
    }
    mitte = {
        "rolle": "gemeinde",
        "name": "Bezirksamt Mitte - Straßen- und Grünflächenamt",
        "email": ["sga@ba-mitte.berlin.de"],
        "stand": "2026-10-04",
    }
    monkeypatch.setattr(bp, "ergaenzungen", lambda: {"11000": senat, "110000000001": mitte})
    berlin = {"ars": "11000", "name": "Berlin", "gen": "Berlin", "kreisfrei": True}

    def eintrag(name: str, land: str = "BE") -> dict:
        return {"land": land, "name": name, "kreis": berlin, "kondominium": None}

    attr = {
        "110000000000": eintrag("Berlin"),
        "110000000001": eintrag("Bezirk Mitte"),
        "110000000004": eintrag("Bezirk Charlottenburg-Wilmersdorf"),
        "040110000000": eintrag("Bremen", "HB"),
    }
    daten = {"meta": {"laender": {}}, "gemeinden": {}}
    review: list[list[str]] = []
    assert bp.ergaenze_von_hand(daten, review, attr, ["BE", "HB"]) == 3
    assert daten["meta"]["laender"] == {
        "BE": {"abgerufen": "2026-10-05", "kurz": "Webseiten der Behörden", "quelle": bp.VON_HAND}
    }, "HB: keine Einträge von Hand, also kein Land mit Kontakten"
    g = daten["gemeinden"]
    assert set(g) == {"110000000000", "110000000001", "110000000004"}
    assert all(e["wahl"] is None and e["kreis"]["name"] == "Senatsverwaltung" for e in g.values())
    assert g["110000000000"]["kreis"]["allgemein"] is True, "Zentrale statt Verkehrsstelle"
    assert g["110000000001"]["gemeinde"]["email"] == ["sga@ba-mitte.berlin.de"]
    assert "allgemein" not in g["110000000001"]["gemeinde"]
    assert g["110000000001"]["gemeinde"]["quelle"] == "Webseite der Behörde, Stand 04.10.2026"
    assert g["110000000004"]["gemeinde"] is None, "Bezirk ohne Eintrag: kein Kontakt"
    assert [z[11] for z in review] == ["von Hand"] * 3
    vorher = json.dumps(daten, sort_keys=True)
    assert bp.ergaenze_von_hand(daten, review, attr, ["BE"]) == 0, "schon da: nichts doppelt"
    assert json.dumps(daten, sort_keys=True) == vorher


def test_luecken_fuellen(monkeypatch) -> None:
    slf = {
        "name": "Landratsamt Saalfeld-Rudolstadt - Straßenverkehrsamt (Fachbereich 2)",
        "telefon": ["03671 823-341"],
        "email": ["fachbereich2@kreis-slf.de"],
        "stand": "2026-10-03",
    }
    arnstadt = {
        "rolle": "gemeinde",
        "name": "Stadtverwaltung Arnstadt - Sachgebiet Verkehr",
        "telefon": ["03628 745 879"],
        "stand": "2026-10-03",
    }
    monkeypatch.setattr(bp, "ergaenzungen", lambda: {"16073": slf, "160700004004": arnstadt})

    def gem(kreis: str, kreisfrei: bool = False) -> dict:
        return {"land": "TH", "kreis": {"ars": kreis, "kreisfrei": kreisfrei}}

    attr = {
        "160610001001": gem("16061"),
        "160610002002": gem("16061"),
        "160610116116": gem("16061"),  # Am Ohmberg: Portal nennt nur das eigene Ordnungsamt
        "160730077077": gem("16073"),  # Saalfeld: Portalfehler, Kontakt von Hand
        "160540000000": gem("16054", kreisfrei=True),  # ohne Ergänzung: bleibt leer
        "160700004004": gem("16070"),  # Arnstadt: Gemeindekontakt von Hand ersetzt das Portal
    }
    lra = _stelle(
        "Landratsamt Eichsfeld - Amt für Öffentliche Sicherheit und Ordnung", ["03606 650-3610"]
    )
    rathaus = _stelle("Stadtverwaltung Arnstadt", ["03628 7456"], ["rathaus@arnstadt.de"])
    vka = _stelle("Verkehrsamt", ["03628 738-800"], ["vka@ilm-kreis.de"])
    gemeinden = {
        "160610001001": {"wahl": "passt", "kreis": lra, "gemeinde": None},
        "160610002002": {"wahl": "passt", "kreis": lra, "gemeinde": None},
        "160610116116": {"wahl": "fremd", "kreis": None, "gemeinde": None},
        "160730077077": {"wahl": "fremd", "kreis": None, "gemeinde": None},
        "160540000000": {"wahl": "keine", "kreis": None, "gemeinde": None},
        "160700004004": {"wahl": "passt", "kreis": vka, "gemeinde": rathaus},
    }
    bp.luecken_fuellen(gemeinden, attr, "TH")
    assert gemeinden["160610116116"]["kreis"] == lra, "Kreiskontakt der Nachbargemeinden"
    assert gemeinden["160610116116"]["wahl"] == "fremd", "Urteil des Portals bleibt"
    hand = gemeinden["160730077077"]["kreis"]
    assert hand["quelle"] == "Webseite der Behörde, Stand 03.10.2026" and hand["web"] == []
    assert gemeinden["160540000000"]["kreis"] is None
    assert (
        gemeinden["160700004004"]["gemeinde"]["name"]
        == "Stadtverwaltung Arnstadt - Sachgebiet Verkehr"
    )
    assert gemeinden["160700004004"]["kreis"] == vka, "andere Rolle bleibt"


def test_luecken_fuellen_amt(monkeypatch) -> None:
    monkeypatch.setattr(bp, "ergaenzungen", lambda: {})
    amt = {"ars": "010585890", "gen": "Hüttener Berge"}

    def gem(verband: dict | None) -> dict:
        return {"land": "SH", "kreis": {"ars": "01058", "kreisfrei": False}, "verband": verband}

    attr = {
        "010585890008": gem(amt),
        "010585890025": gem(amt),
        "010585890031": gem(amt),
        "010580005005": gem(None),  # amtsfrei: kein Verband, keine Hilfe
    }
    amtsstelle = _stelle("Amt Hüttener Berge - FD III Ordnungsamt", ["+49 4356 9949-0"])
    buergermeister = _stelle("Gemeinde Ascheffel", ["04353 1234"])
    gemeinden = {
        "010585890008": {"wahl": "passt", "kreis": None, "gemeinde": amtsstelle},
        "010585890025": {"wahl": "passt", "kreis": None, "gemeinde": None},
        "010585890031": {"wahl": "passt", "kreis": None, "gemeinde": buergermeister},
        "010580005005": {"wahl": "passt", "kreis": None, "gemeinde": None},
    }
    bp.luecken_fuellen(gemeinden, attr, "SH")
    assert gemeinden["010585890025"]["gemeinde"] == amtsstelle, "Kontakt des Amts der Nachbarn"
    assert gemeinden["010585890031"]["gemeinde"] == buergermeister, "eigener Kontakt bleibt"
    assert gemeinden["010580005005"]["gemeinde"] is None


def test_eigene_stelle_an_der_domain() -> None:
    elmshorn = {"gen": "Elmshorn", "verband": None, "kreis": {"gen": "Pinneberg"}}
    tiefbau = _stelle("Amt für Tiefbau und Verkehr", [], ["tiefbauundverkehr@elmshorn.de"])
    assert bp.eigene_stelle(tiefbau, elmshorn)
    hu = {"gen": "Henstedt-Ulzburg", "verband": None, "kreis": {"gen": "Segeberg"}}
    web = _stelle("Fachdienst Verkehr", [], [], ["https://www.henstedt-ulzburg.de/verkehr"])
    assert bp.eigene_stelle(web, hu)
    quickborn = _stelle("Stadt Quickborn - Verkehr", ["04106 6110"], ["verkehr@quickborn.de"])
    ascheberg = {"gen": "Ascheberg (Holstein)", "verband": None, "kreis": {"gen": "Plön"}}
    assert not bp.eigene_stelle(quickborn, ascheberg), "fremde Stadt im Portal (Kreis Plön)"
    segeberg = _stelle("Verkehrsaufsicht", ["+49 4551 951-8823"], ["verkehrsaufsicht@segeberg.de"])
    assert not bp.eigene_stelle(segeberg, elmshorn)


def test_eigene_stelle_nicht_der_gleichnamige_kreis() -> None:
    region = {"gen": "Region Hannover", "kreisfrei": False}
    hannover = {"gen": "Hannover", "verband": None, "kreis": region}
    team = _stelle(
        "86.01 - Team Verwaltung", [], ["info.verkehr@region-hannover.de"]
    )  # so nennt das Portal die Stelle für die Landeshauptstadt
    assert not bp.eigene_stelle(team, hannover), "Stelle der Region"
    assert bp.waehle_gemeinde([team], hannover) is None
    assert bp.waehle_kreis([team], hannover) == team
    stadt = _stelle("Fachbereich Tiefbau", [], ["tiefbau@hannover-stadt.de"])
    assert bp.eigene_stelle(stadt, hannover)
    ilm = {"gen": "Ilmenau", "verband": None, "kreis": {"gen": "Ilm-Kreis", "kreisfrei": False}}
    ilmenau = _stelle(
        "Stadtverwaltung Ilmenau - Straßenverkehrsbehörde", [], ["verkehr@ilmenau.de"]
    )
    assert bp.eigene_stelle(ilmenau, ilm), "„ilm“ steckt nur im Wort „Ilmenau“"
    albersdorf = {
        "gen": "Albersdorf",
        "verband": {"gen": "Mitteldithmarschen"},
        "kreis": {"gen": "Dithmarschen", "kreisfrei": False},
    }
    amt = _stelle("Amt Mitteldithmarschen - Fachdienst Ordnung", ["0481 0000-0"])
    assert bp.eigene_stelle(amt, albersdorf), "Amt, dessen Name den Kreisnamen enthält"


def test_kontakt_von_hand_eigene_quelle() -> None:
    """Ein Eintrag, der nicht von der Webseite der Behörde stammt, nennt seine Herkunft selbst."""
    basis = {"name": "Magistrat", "email": ["post@example.org"], "stand": "2026-10-05"}
    assert bp.kontakt_von_hand(basis)["quelle"] == "Webseite der Behörde, Stand 05.10.2026"
    brief = {**basis, "quelle": "Schreiben der Straßenverkehrsbehörde vom 03.04.2024"}
    assert bp.kontakt_von_hand(brief)["quelle"] == brief["quelle"]


def test_ergaenzungen_von_hand_sind_vollstaendig() -> None:
    for schluessel, k in bp.ergaenzungen().items():
        assert len(schluessel) in (5, 12) and schluessel.isdigit(), schluessel
        assert k.get("rolle", "kreis") in ("kreis", "gemeinde", "verband"), schluessel
        assert len(schluessel) == 12 or k.get("rolle", "kreis") == "kreis", schluessel
        assert k["name"] and k["stand"], schluessel
        assert "quelle" not in k or (isinstance(k["quelle"], str) and k["quelle"].strip()), (
            schluessel
        )
        assert k.get("telefon") or k.get("email") or k.get("web"), f"{schluessel}: kein Kontaktweg"
        for m in k.get("email") or []:
            assert bp.funktionspostfach(m), f"{schluessel}: {m} sieht nach Person aus"
        for w in k.get("web") or []:
            assert bp.webseite(w), f"{schluessel}: {w}"


def test_telefone_und_postfaecher_nach_beschriftung() -> None:
    greiz = _kontakt(
        "Landratsamt Greiz - Straßenverkehrsbehörde",
        telefon=[
            "+49 36603 25520",
            "Zulassungsbehörde",
            "+49 36603 255554",
            "Straßenverkehrsbehörde (Terminvereinbarung für Parkausweise)",
            "+49 36603 25530",
            "Fahrerlaubnisbehörde",
            "+49 36603 25539",
            "Straßenverkehr",
        ],
        web=["zulassung@landkreis-greiz.de", "ordnungsamt@landkreis-greiz.de", "kaputt@x de."],
    )
    s = bp.stellen_aus(_antwort(greiz))[0]
    assert s["telefon"] == [
        "+49 36603 25539",
        "+49 36603 255554",
        "+49 36603 25520",
        "+49 36603 25530",
    ], "Straßenverkehr zuerst, Termine danach, Zulassung und Fahrerlaubnis zuletzt"
    assert s["email"] == ["ordnungsamt@landkreis-greiz.de", "zulassung@landkreis-greiz.de"]
    nordhausen = _kontakt(
        "Landratsamt Nordhausen - Fachgebiet Verkehrs- und Straßendienste",
        telefon=["03631 911-6000", "Sekretariat", "03631 911-6303", "Straßenverkehr"],
        web=["strassen@lrandh.thueringen.de", "verkehr@lrandh.thueringen.de"],
    )
    s = bp.stellen_aus(_antwort(nordhausen))[0]
    assert s["telefon"][0] == "03631 911-6303" and s["email"][0] == "verkehr@lrandh.thueringen.de"


def test_ausdruecklich_anderes_landratsamt_ist_nicht_unseres() -> None:
    bayreuth = _gemeinde("Bayreuth")
    fremd = _stelle("Landratsamt Neustadt a.d.Waldnaab - Verkehrswesen", ["+49 9602 79-3333"])
    eigen = _stelle("Landratsamt Bayreuth - Straßenverkehr", ["0921 728-0"])
    assert not bp.unsere_stelle(fremd, bayreuth)
    assert bp.unsere_stelle(eigen, bayreuth)
    assert bp.unsere_stelle(fremd, _gemeinde("Neustadt a.d.Waldnaab"))


def test_stadt_und_kreis_gleichen_namens() -> None:
    """NW: Stadt und Kreis Steinfurt bzw. Warendorf – die Domain verrät den Kreis, und was als
    Stelle der Stadt durchgeht, ist nicht die des Kreises."""
    kreis_st = {"gen": "Steinfurt", "kreisfrei": False}
    steinfurt = {"gen": "Steinfurt", "verband": None, "kreis": kreis_st}
    svb = _stelle("Straßenverkehrsbehörde", ["02551 69-0"], ["verkehr@kreis-steinfurt.de"])
    ordnung = _stelle("Ordnungsamt", ["02551 1-0"], ["ordnungsamt@stadt-steinfurt.de"])
    assert not bp.eigene_stelle(svb, steinfurt), "Stelle des Kreises (kreis-steinfurt.de)"
    assert bp.eigene_stelle(ordnung, steinfurt)
    assert bp.waehle_gemeinde([svb, ordnung], steinfurt) == ordnung
    assert bp.waehle_kreis([svb, ordnung], steinfurt) == svb
    lk = _stelle("Fachdienst Straßenverkehr", ["05141 916-0"], ["verkehr@lkcelle.de"])
    celle = {"gen": "Celle", "verband": None, "kreis": {"gen": "Celle", "kreisfrei": False}}
    assert not bp.eigene_stelle(lk, celle), "auch zusammengeschrieben (lkcelle.de)"

    kreis_wa = {"gen": "Warendorf", "kreisfrei": False}
    warendorf = {"gen": "Warendorf", "verband": None, "kreis": kreis_wa}
    stadt = _stelle("Straßenverkehrsbehörde", ["02581 54-0"], ["ordnungsamt@warendorf.de"])
    assert bp.eigene_stelle(stadt, warendorf) and not bp.unsere_stelle(stadt, warendorf)
    assert bp.waehle([stadt], warendorf) == (stadt, "stvb"), "die Stadt nennt sich selbst"
    amt = _stelle("Straßenverkehrsamt", ["02581 53-0"], ["verkehr@kreis-warendorf.de"])
    beelen = {"gen": "Beelen", "verband": None, "kreis": kreis_wa}
    assert bp.unsere_stelle(amt, warendorf) and bp.unsere_stelle(amt, beelen)
    assert bp.waehle([stadt, amt], beelen)[1] == "passt"


def test_verbandsgemeinde_und_kreis_gleichen_namens() -> None:
    """RP: Die Verbandsgemeinde Bad Kreuznach liegt im gleichnamigen Kreis."""
    hackenheim = {
        "gen": "Hackenheim",
        "verband": {"gen": "Bad Kreuznach"},
        "kreis": {"gen": "Bad Kreuznach", "kreisfrei": False},
    }
    vg = _stelle(
        "Verbandsgemeindeverwaltung Bad Kreuznach - Ordnungsamt",
        ["0671 8001-0"],
        ["ordnungsamt@vg-badkreuznach.de"],
    )
    kv = _stelle("Straßenverkehrsbehörde", ["0671 803-0"], ["verkehr@kreis-badkreuznach.de"])
    assert not bp.unsere_stelle(vg, hackenheim), "Verwaltung der Verbandsgemeinde"
    assert bp.eigene_stelle(vg, hackenheim) and not bp.eigene_stelle(kv, hackenheim)
    assert bp.waehle_gemeinde([kv, vg], hackenheim) == vg
    assert bp.waehle_kreis([kv, vg], hackenheim) == kv


def test_landesbehoerde_und_verbandsgemeinde_land() -> None:
    """RP: Für die Gemeinden der VG Trier-Land nennt das Portal auch den Landesbetrieb Mobilität
    Trier und die Stadt Trier; „Land“ unterscheidet die Verbandsgemeinde von der Stadt."""
    kordel = {
        "gen": "Kordel",
        "verband": {"gen": "Trier-Land"},
        "kreis": {"gen": "Trier-Saarburg", "kreisfrei": False},
    }
    lbm = _stelle(
        "Landesbetrieb Mobilität Trier - Straßenverkehrsbehörde",
        ["0651 9188-0"],
        ["lbm-trier@lbm.rlp.de"],
    )
    stadt = _stelle(
        "Stadtverwaltung Trier - Straßenverkehrsbehörde",
        ["0651 718-0"],
        ["strassenverkehrsbehoerde@trier.de"],
    )
    vg = _stelle("Ordnungsamt", ["0651 8279-0"], ["ordnungsamt@trier-land.de"])
    assert not bp.eigene_stelle(lbm, kordel) and not bp.unsere_stelle(lbm, kordel)
    assert not bp.ist_stvb(lbm), "Landesbetrieb"
    assert not bp.eigene_stelle(stadt, kordel), "Stadt Trier, nicht Trier-Land"
    assert bp.eigene_stelle(vg, kordel)
    assert bp.waehle_gemeinde([lbm, stadt, vg], kordel) == vg
    insheim = {
        "gen": "Insheim",
        "verband": {"gen": "Landau-Land"},
        "kreis": {"gen": "Südliche Weinstraße", "kreisfrei": False},
    }
    landau = _stelle("Stadtverwaltung Landau in der Pfalz", ["06341 13-0"], ["info@landau.de"])
    assert not bp.eigene_stelle(landau, insheim), "„Land“ steckt nur im Wort „Landau“"
    vg_ll = _stelle("Verbandsgemeinde Landau-Land", ["06341 143-0"], ["info@landau-land.de"])
    assert bp.eigene_stelle(vg_ll, insheim)
