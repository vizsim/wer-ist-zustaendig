"""Anschriften der Verwaltungen (Sachsen): CSV der Landesdirektion → Kontakte je Rolle."""

from __future__ import annotations

import json
import os

import pytest

from zustkarte import anschriften as an
from zustkarte import fetch
from zustkarte.config import Paths

KOPF = (
    "ID;SCHLNR;NR_KRS;GEMEINDE;STRASSE;PLZ;ORT;PLZ_PSF;ORT_PSF;NR_PSF;OKZ;TELEFON;TELEFAX;E_MAIL;"
    "HOMEPAGE;AMTSBEZ_BM;TITEL;BM_NACHNAME;BM_VORNAME;STATUS;ORTSTEILE;BEARB_STAND;"
)
# Aufbau wie die echte Datei (Semikolon, Strichpunkt am Zeilenende, CRLF); Bürgermeister erfunden.
ZEILEN = [
    "228;14511000;14511;Chemnitz, Stadt;Markt 1;09111;Chemnitz;09106;Chemnitz;;0371;4880;4881999 ;"
    "info@stadt-chemnitz.de;http://www.chemnitz.de;Oberbürgermeister;;Muster;Erika;hauptamtlich;;"
    "30.05.2023 16:07:09;",
    "229;14521;14521;Erzgebirgskreis;Paulus-Jenisius-Str. 24;09456;Annaberg-Buchholz;09446;"
    "Annaberg-Buchholz;10 06 35;03733;830;22164;info@kreis-erz.de;http://www.erzgebirgskreis.de;"
    "Landrat;;Muster;Max;hauptamtlich;;13.09.2022 14:50:50;",
    "230;14521010;14521;Amtsberg;Poststr. 30;09439;Amtsberg;;;;037209;6790;81672;"
    "info@amtsberg.eu;http://https://www.gemeinde-amtsberg.de;Bürgermeister;;Muster;Moritz;"
    "hauptamtlich;;27.05.2011 10:33:09;",
    "231;14521060;14521;Bärenstein;Oberwiesenthaler Str. 14;09471;Bärenstein;;;;037347;1840;;"
    "gemeinde@baerenstein-erzgebirge.de;http://www.baerenstein-erzgebirge.de;Bürgermeister;;"
    "Muster;Max;hauptamtlich;;01.01.2025 10:00:00;",
    "232;14521340;14521;Königswalde;Jöhstädter Str. 5;09471;Königswalde;;;;03733;18170;;"
    " koenigswalde@t-online.de;http://www.koenigswalde.de;Bürgermeister;;Muster;Max;ehrenamtlich;;"
    "01.01.2025 10:00:00;",
    "233;14730110;14730;Eilenburg, Große Kreisstadt;Marktplatz 1;04838;Eilenburg;;;;03423;6520;;"
    "stadtverwaltung@eilenburg.de;http://www.eilenburg.de;Oberbürgermeister;;Muster;Max;"
    "hauptamtlich;;01.01.2025 10:00:00;",
    "234;14730140;14730;Jesewitz;Alte Dorfstraße 1;04838;Jesewitz;;;;034241;50263;;"
    "muster@jesewitz.de;;Bürgermeister;;Muster;Max;ehrenamtlich;;01.01.2025 10:00:00;",
]


def _csv(pfad) -> None:
    pfad.parent.mkdir(parents=True, exist_ok=True)
    pfad.write_bytes(("﻿" + "\r\n".join([KOPF, *ZEILEN]) + "\r\n").encode())


def _attr() -> dict:
    erz = {"ars": "14521", "gen": "Erzgebirgskreis", "name": "Erzgebirgskreis", "kreisfrei": False}
    nord = {"ars": "14730", "gen": "Nordsachsen", "name": "Nordsachsen", "kreisfrei": False}
    chemnitz = {"ars": "14511", "gen": "Chemnitz", "name": "Chemnitz", "kreisfrei": True}
    vg = {"ars": "145215101", "bez": "Verwaltungsgemeinschaft", "sitz": "145215101060"}
    vv = {"ars": "147305601", "bez": "Verwaltungsverband", "sitz": "147300110110"}

    def g(ars: str, name: str, kreis: dict, verband: dict | None = None) -> dict:
        return {
            "ars": ars,
            "ags": ars[:5] + ars[9:],
            "name": name,
            "gen": name.split(" ", 1)[1],
            "land": {"14": "SN", "09": "BY"}[ars[:2]],
            "kreis": kreis,
            "verband": verband,
        }

    return {
        "145110000000": g("145110000000", "Stadt Chemnitz", chemnitz),
        "145210010010": g("145210010010", "Gemeinde Amtsberg", erz),
        "145215101060": g("145215101060", "Gemeinde Bärenstein", erz, vg),
        "145215101340": g("145215101340", "Gemeinde Königswalde", erz, vg),
        "147300110110": g("147300110110", "Stadt Eilenburg", nord),
        "147305601140": g("147305601140", "Gemeinde Jesewitz", nord, vv),
        "091620000000": g("091620000000", "Stadt München", chemnitz),
    }


def test_postfach() -> None:
    assert an.postfach("info@amtsberg.eu", "Amtsberg")
    assert an.postfach("koenigswalde@t-online.de", "Königswalde"), "heißt wie die Gemeinde"
    assert an.postfach("grossschweidnitz@t-online.de", "Großschweidnitz")
    assert an.postfach("GV-Oybin@olbersdorf.de", "Kurort Oybin"), "Gemeindeverwaltung"
    assert an.postfach("gv-schoenbach-ol@t-online.de", "Schönbach")
    assert an.postfach("briefkasten@wilthen.de", "Wilthen")
    assert not an.postfach("clauss@roederaue.de", "Röderaue"), "Personenname"
    assert not an.postfach("e.r@kodersdorf.de", "Kodersdorf"), "zu kurz für den Namensvergleich"


def test_webadresse() -> None:
    assert an.webadresse("http://https://www.dorfchemnitz.eu") == "https://www.dorfchemnitz.eu"
    assert an.webadresse(" http://www.chemnitz.de") == "http://www.chemnitz.de"
    assert an.webadresse("") is None
    assert an.webadresse("www.ohne-schema.de") is None


def test_sachsen_rollen(tmp_path) -> None:
    pfad = tmp_path / "lds.csv"
    _csv(pfad)
    zeilen = an.lies_sachsen(pfad)
    assert set(zeilen) >= {"14511000", "14521", "14521010"}
    g = an.sachsen(_attr(), zeilen)
    assert "091620000000" not in g, "nur Sachsen"

    amtsberg = g["145210010010"]
    assert amtsberg["wahl"] is None and amtsberg["stellen"] == 0
    assert amtsberg["gemeinde"] == {
        "name": "Gemeinde Amtsberg",
        "adresse": "Poststr. 30, 09439 Amtsberg",
        "telefon": ["037209 6790"],
        "email": ["info@amtsberg.eu"],
        "web": ["https://www.gemeinde-amtsberg.de"],
        "allgemein": True,
    }
    assert amtsberg["kreis"]["name"] == "Landratsamt Erzgebirgskreis"
    assert amtsberg["kreis"]["adresse"] == "Paulus-Jenisius-Str. 24, 09456 Annaberg-Buchholz"
    assert "Muster" not in json.dumps(g, ensure_ascii=False), "keine Bürgermeister"

    chemnitz = g["145110000000"]
    assert chemnitz["kreis"]["name"] == "Stadt Chemnitz", "kreisfrei: die Stadt"
    assert chemnitz["kreis"]["telefon"] == ["0371 4880"]

    koenigswalde = g["145215101340"]["gemeinde"]
    assert koenigswalde["name"] == "Gemeinde Bärenstein", "erfüllende Gemeinde am Sitz"
    assert g["145215101060"]["gemeinde"] == koenigswalde

    jesewitz = g["147305601140"]
    assert jesewitz["gemeinde"]["name"] == "Gemeinde Jesewitz", "Sitz gehört nicht zum Verband"
    assert jesewitz["gemeinde"]["email"] == [], "Personenname"
    assert jesewitz["gemeinde"]["web"] == []
    assert jesewitz["kreis"] is None, "Landkreis fehlt in der Datei"


def test_ergaenze(tmp_path, monkeypatch) -> None:
    paths = Paths(root=tmp_path)
    pfad = paths.raw_quelle(an.SACHSEN) / "LDS_Gemeindeverzeichnis_Sachsen.csv"
    _csv(pfad)
    monkeypatch.setattr(an, "get_paths", lambda: paths)
    hand = {
        "rolle": "gemeinde",
        "name": "Gemeinde Amtsberg - Ordnungsamt",
        "telefon": ["037209 679-12"],
        "stand": "2026-10-05",
    }
    lra = {"name": "Landratsamt Erzgebirgskreis - Straßenverkehr", "web": [], "stand": "2026-10-05"}
    monkeypatch.setattr(
        an.bundesportal, "ergaenzungen", lambda: {"145210010010": hand, "14521": lra}
    )
    daten = {"meta": {"laender": {}}, "gemeinden": {}}
    review: list[list[str]] = []
    os.utime(pfad, (1_790_000_000, 1_790_000_000))  # 2026-09-21
    assert an.ergaenze(daten, review, _attr()) == 6
    sn = daten["meta"]["laender"]["SN"]
    assert sn["abgerufen"] == "2026-09-21", "ohne meta.json: Änderungszeit"
    assert sn["kurz"] == "Landesdirektion Sachsen"
    assert sn["quelle"]["id"] == "lds_sachsen" and "dl-de/by-2-0" in sn["quelle"]["vermerk"]
    amtsberg = daten["gemeinden"]["145210010010"]
    assert amtsberg["gemeinde"]["name"] == "Gemeinde Amtsberg - Ordnungsamt", "von Hand vor"
    assert "allgemein" not in amtsberg["gemeinde"]
    assert amtsberg["kreis"]["name"] == "Landratsamt Erzgebirgskreis - Straßenverkehr"
    assert daten["gemeinden"]["145110000000"]["kreis"]["allgemein"], "andere Kreise unverändert"
    assert len(review) == 6
    assert review[0][:4] == ["SN", "145110000000", "Stadt Chemnitz", "Chemnitz"]

    fetch_meta = pfad.with_name(pfad.name + ".meta.json")
    fetch_meta.write_text(json.dumps({"abgerufen": "2026-10-05T10:37:09+00:00"}))
    daten = {"meta": {"laender": {}}, "gemeinden": {}}
    an.ergaenze(daten, [], _attr())
    assert daten["meta"]["laender"]["SN"]["abgerufen"] == "2026-10-05"

    pfad.unlink()
    assert an.ergaenze({"meta": {"laender": {}}, "gemeinden": {}}, [], _attr()) == 0


def test_datei_von_hand_uebernehmen(tmp_path, monkeypatch) -> None:
    paths = Paths(root=tmp_path)
    monkeypatch.setattr(fetch, "get_paths", lambda: paths)
    download = tmp_path / "Downloads" / "LDS_Gemeindeverzeichnis_Sachsen.csv"
    _csv(download)
    os.utime(download, (1_790_000_000, 1_790_000_000))
    with pytest.raises(FileNotFoundError, match=r"lds\.sachsen\.de.*--datei"):
        fetch.fetch(an.SACHSEN)
    ziel = fetch.uebernimm(an.SACHSEN, download)
    assert ziel == paths.raw_quelle(an.SACHSEN) / "LDS_Gemeindeverzeichnis_Sachsen.csv"
    assert ziel.read_bytes() == download.read_bytes()
    meta = json.loads(ziel.with_name(ziel.name + ".meta.json").read_text())
    assert meta["abgerufen"].startswith("2026-09-21") and meta["von_hand"] is True
    assert meta["url"] is None and meta["seite"].startswith("https://www.lds.sachsen.de/")
    assert fetch.fetch(an.SACHSEN) == ziel, "liegt schon da"
