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

    koenigswalde = g["145215101340"]
    assert koenigswalde["gemeinde"]["name"] == "Gemeinde Königswalde", "die Gemeinde selbst"
    assert koenigswalde["verband"]["name"] == "Gemeinde Bärenstein", "erfüllende Gemeinde am Sitz"
    assert koenigswalde["verband"]["adresse"] == "Oberwiesenthaler Str. 14, 09471 Bärenstein"
    assert g["145215101060"]["gemeinde"] == koenigswalde["verband"]
    assert "verband" not in g["145215101060"], "der Sitz selbst"
    assert "verband" not in amtsberg, "ohne Verband"
    ohne_sitz = an.sachsen(_attr(), {k: v for k, v in zeilen.items() if k != "14521060"})
    assert ohne_sitz["145215101340"]["verband"] is None, "Sitz nicht im Verzeichnis: kein Kontakt"
    assert ohne_sitz["145215101340"]["gemeinde"]["name"] == "Gemeinde Königswalde"

    jesewitz = g["147305601140"]
    assert jesewitz["gemeinde"]["name"] == "Gemeinde Jesewitz"
    assert "verband" not in jesewitz, "Sitz gehört nicht zum Verband"
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
    koenigswalde = {**hand, "name": "Gemeinde Königswalde - Ordnungsamt"}
    jesewitz = {**hand, "rolle": "verband", "name": "Verwaltungsverband Eilenburg-West"}
    monkeypatch.setattr(
        an.bundesportal,
        "ergaenzungen",
        lambda: {
            "145210010010": hand,
            "14521": lra,
            "145215101340": koenigswalde,
            "147305601140": jesewitz,
        },
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
    im_verband = daten["gemeinden"]["145215101340"]
    assert im_verband["gemeinde"]["name"] == "Gemeinde Königswalde - Ordnungsamt"
    assert "verband" not in im_verband, "von Hand für die Gemeinde: gilt auch für den Verband"
    nur_verband = daten["gemeinden"]["147305601140"]
    assert nur_verband["verband"]["name"] == "Verwaltungsverband Eilenburg-West", "rolle: verband"
    assert nur_verband["gemeinde"]["name"] == "Gemeinde Jesewitz", "die Gemeinde behält ihren"
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


# Anschriftenverzeichnis der Statistischen Ämter: Aufbau wie das Blatt „Anschriften_31_01_2026"
# (Titelzeilen, Kopf, dann Land, Kreise, Gemeinden; Fläche und Bevölkerung dahinter).
VERZEICHNIS = [
    ["Anschriften der Gemeinde- und Stadtverwaltungen"],
    ["Land", "", "Satzart", "Textkennzeichen", "", "Amtlicher Regionalschlüssel (ARS)"],
    ["06", "Hessen", "10", "", "", "06", "", "Hessen", "Hessische Staatskanzlei",
     "Georg-August-Zinn-Straße 1", "65183", "Wiesbaden", "presse@stk.hessen.de"],
    ["06", "Hessen", "40", "41", "Kreisfreie Stadt", "06412", "", "Frankfurt am Main, Stadt",
     "Magistrat der Stadt Frankfurt am Main", "Römerberg 23", "60311", "Frankfurt am Main",
     "info@stadt-frankfurt.de"],
    ["06", "Hessen", "60", "61", "Kreisfreie Stadt", "064120000000", "06412000",
     "Frankfurt am Main, Stadt", "Magistrat der Stadt Frankfurt am Main", "Römerberg 23", "60311",
     "Frankfurt am Main", "info@stadt-frankfurt.de"],
    ["06", "Hessen", "40", "41", "Kreisfreie Stadt", "06415", "", "Hanau, Brüder-Grimm-Stadt",
     "Magistrat der Stadt Hanau", "Am Markt 14-18", "63450", "Hanau", "zentraledienste@hanau.de"],
    ["06", "Hessen", "60", "61", "Kreisfreie Stadt", "064150000000", "06415000",
     "Hanau, Brüder-Grimm-Stadt", "Magistrat der Stadt Hanau", "Am Markt 14 - 18", "63450", "Hanau",
     "zentraledienste@hanau.de"],
    ["06", "Hessen", "40", "44", "Landkreis", "06632", "", "Hersfeld-Rotenburg",
     "Kreisausschuss des Landkreises Hersfeld-Rotenburg", "Friedloser Straße 12", "36251",
     "Bad Hersfeld, Kreisstadt", "landkreis@hef-rof.de"],
    ["06", "Hessen", "40", "44", "Landkreis", "06633", "", "Kassel",
     "Kreisausschuss des Landkreises Kassel", "Wilhelmshöher Allee 19-21", "34117", "Kassel",
     "info@landkreiskassel.de"],
    # erst der Verband, dann die Gemeinde selbst (so in BW, BY, SN und TH)
    ["06", "Hessen", "60", "64", "Gemeinde", "066320004004", "06632004", "Breitenbach a. Herzberg",
     "Verband", "Verbandsstraße 1", "36287", "Breitenbach", "verband@breitenbach.de"],
    ["06", "Hessen", "60", "64", "Gemeinde", "066320004004", "06632004", "Breitenbach a. Herzberg",
     "Gemeindevorstand der Gemeinde Breitenbach a. Herzberg", "Hauptstraße 2", "36287",
     "Breitenbach a. Herzberg", "magistrat@breitenbach-herzberg.de"],
    ["06", "Hessen", "60", "63", "Stadt", "064380006006", "06438006", "Langen (Hessen), Stadt",
     "Magistrat der Stadt Langen", "Südliche Ringstraße 80", "63225", "Langen (Hessen)",
     "presse@langen.de"],
]  # fmt: skip


def _xlsx(pfad) -> None:
    import pandas as pd
    import pyogrio

    zeilen = [z + [""] * (15 - len(z)) for z in VERZEICHNIS]
    for z in zeilen[2:]:
        z[13:15] = ["100,5", "1234"]  # Fläche, Bevölkerung
    pfad.parent.mkdir(parents=True, exist_ok=True)
    df = pd.DataFrame(zeilen, columns=[f"Feld{i}" for i in range(15)])
    pyogrio.write_dataframe(df, pfad, layer="Anschriften_31_01_2026", driver="XLSX")


def _attr_he() -> dict:
    hef = {"ars": "06632", "gen": "Hersfeld-Rotenburg", "name": "Landkreis Hersfeld-Rotenburg"}
    mkk = {"ars": "06435", "gen": "Main-Kinzig-Kreis", "name": "Main-Kinzig-Kreis"}
    ks = {"ars": "06633", "gen": "Kassel", "name": "Landkreis Kassel"}
    ffm = {
        "ars": "06412",
        "gen": "Frankfurt am Main",
        "name": "Frankfurt am Main",
        "kreisfrei": True,
    }
    of = {"ars": "06438", "gen": "Offenbach", "name": "Landkreis Offenbach"}

    def g(ars: str, name: str, gen: str, kreis: dict, gemeindefrei: bool = False) -> dict:
        return {"ars": ars, "ags": ars[:5] + ars[9:], "name": name, "gen": gen, "land": "HE",
                "kreis": kreis, "verband": None, "gemeindefrei": gemeindefrei}  # fmt: skip

    return {
        "064120000000": g("064120000000", "Stadt Frankfurt am Main", "Frankfurt am Main", ffm),
        "064350014014": g("064350014014", "Stadt Hanau", "Hanau", mkk),
        "064380006006": g("064380006006", "Stadt Langen (Hessen)", "Langen (Hessen)", of),
        "066320004004": g(
            "066320004004", "Gemeinde Breitenbach a.Herzberg", "Breitenbach a.Herzberg", hef
        ),
        "066339200200": g(
            "066339200200", "Gutsbezirk Reinhardswald", "Gutsbezirk Reinhardswald", ks, True
        ),
    }


def test_lies_verzeichnis(tmp_path) -> None:
    pfad = tmp_path / "anschriften.xlsx"
    _xlsx(pfad)
    zeilen = an.lies_verzeichnis(pfad)
    assert "06" not in zeilen, "nur Kreise, Verbände und Gemeinden"
    assert set(zeilen) == {"06412", "064120000000", "06415", "064150000000", "06632", "06633",
                           "066320004004", "064380006006"}  # fmt: skip
    assert zeilen["06632"]["email"] == "landkreis@hef-rof.de"
    assert zeilen["066320004004"]["strasse"] == "Hauptstraße 2", (
        "die Gemeinde selbst, nicht der Verband"
    )
    assert zeilen["064120000000"]["plz"] == "60311", "Schlüssel und PLZ bleiben Text"


def test_verzeichnis_rollen(tmp_path) -> None:
    pfad = tmp_path / "anschriften.xlsx"
    _xlsx(pfad)
    g = an.verzeichnis(_attr_he(), an.lies_verzeichnis(pfad), "HE")
    breitenbach = g["066320004004"]
    assert breitenbach["gemeinde"] == {
        "name": "Gemeinde Breitenbach a.Herzberg",
        "adresse": "Hauptstraße 2, 36287 Breitenbach a. Herzberg",
        "telefon": [],
        "email": ["magistrat@breitenbach-herzberg.de"],
        "web": [],
        "allgemein": True,
    }
    assert breitenbach["kreis"]["name"] == "Landkreis Hersfeld-Rotenburg", "wie die Stelle"
    assert breitenbach["kreis"]["email"] == ["landkreis@hef-rof.de"]
    assert breitenbach["kreis"]["adresse"] == "Friedloser Straße 12, 36251 Bad Hersfeld", "Ort kurz"
    assert g["064120000000"]["kreis"]["name"] == "Stadt Frankfurt am Main", "kreisfrei: die Stadt"
    hanau = g["064350014014"]["gemeinde"]
    assert hanau["adresse"] == "Am Markt 14 - 18, 63450 Hanau", "umgeschlüsselt: nach dem Namen"
    assert g["064350014014"]["kreis"] is None, "Main-Kinzig-Kreis fehlt im Auszug"
    assert g["064380006006"]["gemeinde"]["email"] == [], "presse@ ist kein Weg für Anliegen"
    wald = g["066339200200"]
    assert wald["gemeinde"] is None and wald["kreis"]["name"] == "Landkreis Kassel"


def test_ergaenze_verzeichnis(tmp_path, monkeypatch) -> None:
    paths = Paths(root=tmp_path)
    monkeypatch.setattr(an, "get_paths", lambda: paths)
    monkeypatch.setattr(an.bundesportal, "ergaenzungen", lambda: {})
    url = an.quellen()[an.VERZEICHNIS]["url"]
    pfad = paths.raw_quelle(an.VERZEICHNIS) / fetch.dateiname(url)
    _xlsx(pfad)
    pfad.with_name(pfad.name + ".meta.json").write_text(
        json.dumps({"abgerufen": "2026-10-05T12:00:00+00:00"})
    )
    daten = {"meta": {"laender": {}}, "gemeinden": {}}
    review: list[list[str]] = []
    assert an.ergaenze(daten, review, _attr_he()) == 5, "nur Hessen hat Gemeinden in der Tabelle"
    he = daten["meta"]["laender"]["HE"]
    assert he["stand"] == "2026-01-31" and he["abgerufen"] == "2026-10-05"
    assert he["kurz"] == "Anschriftenverzeichnis der Statistischen Ämter"
    assert he["quelle"]["id"] == "anschriften" and "Quellenangabe" in he["quelle"]["lizenz"]
    assert "SL" not in daten["meta"]["laender"], "Land aus `laender` ohne Gemeinden hier"
    assert len(review) == 5 and review[0][0] == "HE"
