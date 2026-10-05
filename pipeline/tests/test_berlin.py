"""Berlin: Bezirke als Einträge und als eigene Schicht (zustkarte.berlin), Flächen aus dem WFS."""

from __future__ import annotations

import json
import unicodedata

import pytest
from conftest import BEZIRKE, schreibe_bezirke

from zustkarte import berlin, fetch
from zustkarte.config import Paths, quellen


def test_bezirk_ars() -> None:
    assert berlin.bezirk_ars("01") == "110000000001"
    assert berlin.bezirk_ars("12") == "110000000012"
    for falsch in ("1", "00", "13", "x1"):
        with pytest.raises(ValueError):
            berlin.bezirk_ars(falsch)


def test_bezirke_aus_der_konfiguration(tmp_path) -> None:
    namen = berlin.bezirke()
    assert namen == BEZIRKE, "config/berlin.yaml: Nummern der Berliner Verwaltung"
    (tmp_path / "berlin.yaml").write_text('bezirke:\n  "01": Mitte\n  "02": Mitte\n')
    with pytest.raises(ValueError, match="doppelt: Mitte"):
        berlin.bezirke(tmp_path)
    (tmp_path / "berlin.yaml").write_text("bezirke:\n  1: Mitte\n")
    with pytest.raises(ValueError, match="falsch: 1"):
        berlin.bezirke(tmp_path)


def test_eintraege_wie_berlin_mit_eigenem_schluessel() -> None:
    stadt = {
        "ars": "110000000000",
        "ags": "11000000",
        "gen": "Berlin",
        "name": "Berlin",
        "land": "BE",
        "kreis": {"ars": "11000", "kreisfrei": True},
        "tkz": [61],
        "ew": 3685265,
        "bezirk": None,
    }
    e = berlin.eintraege(stadt, BEZIRKE)
    assert list(e) == [f"1100000000{nr}" for nr in BEZIRKE]
    tk = e["110000000009"]
    assert tk["ags"] == "11000009"
    assert (tk["gen"], tk["name"], tk["bez"]) == (
        "Treptow-Köpenick",
        "Bezirk Treptow-Köpenick",
        "Bezirk",
    )
    assert tk["bezirk"] == {"nr": "09", "name": "Treptow-Köpenick"}
    assert tk["kreis"] == stadt["kreis"] and tk["land"] == "BE"
    assert tk["tkz"] == [] and tk["ew"] is None, "GV-ISys kennt keine Bezirke"
    assert stadt["bezirk"] is None, "die Stadt selbst bleibt unverändert"


def test_flaechen_aus_der_quelle(fixture_daten, tmp_path) -> None:
    meldungen: list[str] = []
    f = berlin.flaechen(fixture_daten.bezirke, BEZIRKE, melde=meldungen.append)
    assert list(f["nr"]) == list(BEZIRKE)
    assert list(f["name"]) == list(BEZIRKE.values())
    assert f.crs.to_epsg() == 25833, "Koordinatensystem der Datei"
    assert meldungen == []

    unvollstaendig = schreibe_bezirke(tmp_path / "ohne.geojson", ohne=("03",))
    with pytest.raises(RuntimeError, match="Bezirke fehlen: Pankow"):
        berlin.flaechen(unvollstaendig, BEZIRKE)


def _geojson(pfad, features: list[tuple[dict, object]], crs: int = 25833) -> None:
    import geopandas as gpd

    gdf = gpd.GeoDataFrame([a for a, _ in features], geometry=[g for _, g in features], crs=4326)
    gdf.to_crs(crs).to_file(pfad, driver="GeoJSON", engine="pyogrio")


def test_flaechen_schreibweisen_und_fehler(tmp_path) -> None:
    """Namen in anderer Schreibweise, ein Punkt, die ganze Stadt, ein Bezirk in zwei Teilen; dann
    die Fehler: ein Objekt für zwei Bezirke, falsch angegebenes Koordinatensystem."""
    from shapely.geometry import Point, box

    def bezirk(nr: str, name: str) -> tuple[dict, object]:
        x = 13.1 + int(nr) * 0.05
        return {"name": name, "art": "Bezirk"}, box(x, 52.4, x + 0.05, 52.5)

    namen = dict(BEZIRKE)
    namen["07"] = unicodedata.normalize("NFD", "Bezirk Tempelhof-Schöneberg")
    namen["08"] = "NEUKÖLLN"
    features = [bezirk(nr, name) for nr, name in namen.items()]
    features.append(({"name": "Mitte", "art": "Rathaus"}, Point(13.17, 52.45)))
    features.append(({"name": "Berlin", "art": "Land"}, box(13.1, 52.4, 13.75, 52.6)))
    features.append(({"name": "Mitte", "art": "Bezirk"}, box(13.12, 52.5, 13.15, 52.52)))
    _geojson(tmp_path / "quelle.geojson", features)
    meldungen: list[str] = []
    f = berlin.flaechen(tmp_path / "quelle.geojson", BEZIRKE, melde=meldungen.append)
    assert list(f["nr"]) == list(BEZIRKE)
    assert f.loc[f["nr"] == "08", "name"].item() == "Neukölln", "Name aus berlin.yaml"
    assert f.geometry.iloc[0].geom_type == "MultiPolygon", "Mitte aus zwei Teilen"
    assert meldungen == [
        "  quelle.geojson: 1 Objekt(e) ohne Namen eines Bezirks übergangen (Berlin, Land)",
        "  quelle.geojson: Objekte vereinigt für Mitte",
    ]

    zwei = [({**features[0][0], "alt": "Pankow"}, features[0][1]), *features[1:12]]
    _geojson(tmp_path / "zwei.geojson", zwei)
    with pytest.raises(RuntimeError, match="passt zu mehreren Bezirken"):
        berlin.flaechen(tmp_path / "zwei.geojson", BEZIRKE)

    # UTM-Koordinaten, aber als WGS84 ausgewiesen (GeoJSON ohne Angabe gilt als WGS84).
    import geopandas as gpd

    falsch = gpd.read_file(tmp_path / "quelle.geojson").set_crs(4326, allow_override=True)
    falsch.to_file(tmp_path / "falsch.geojson", driver="GeoJSON", engine="pyogrio")
    with pytest.raises(RuntimeError, match="liegen nicht um Berlin"):
        berlin.flaechen(tmp_path / "falsch.geojson", BEZIRKE, melde=lambda _: None)


def test_bereinigt_nur_wo_sich_bezirke_ueberlappen() -> None:
    import geopandas as gpd
    from shapely.geometry import box

    roh = gpd.GeoDataFrame(
        {"nr": ["03", "01", "02"], "name": ["C", "A", "B"]},
        geometry=[box(3, 0, 4, 2), box(0, 0, 2, 2), box(1, 0, 3, 2)],
        crs=4326,
    )
    b = berlin.bereinigt(roh)
    assert list(b["nr"]) == ["01", "02", "03"]
    assert b.geometry.iloc[0].equals(box(0, 0, 2, 2))
    assert b.geometry.iloc[1].equals(box(2, 0, 3, 2)), "Überlappung gehört der kleineren Nummer"
    assert b.geometry.iloc[2].equals_exact(box(3, 0, 4, 2), 0), "ohne Überlappung unverändert"
    assert b.crs == roh.crs

    drin = roh.assign(geometry=[box(3, 0, 4, 2), box(0, 0, 2, 2), box(0.5, 0.5, 1, 1)])
    with pytest.raises(RuntimeError, match="Bezirk B liegt ganz in A"):
        berlin.bereinigt(drin)


def test_stadt_wie_bezirke() -> None:
    werte = {
        "091620000000": "p",
        "110000000000": "n",
        "110000000001": "k",
        "110000000002": "t",
        "110000000003": "k",
    }
    assert berlin.stadt_wie_bezirke(werte) == {**werte, "110000000000": "k"}
    gleich = {"110000000001": "t", "110000000002": "k"}
    assert berlin.stadt_wie_bezirke(gleich)["110000000000"] == "k", "Gleichstand: erster nach Name"
    ohne = {"110000000000": ("stadtstaat", "nur Ebene")}
    assert berlin.stadt_wie_bezirke(ohne) == ohne


def _kapazitaeten(*namen: str) -> bytes:
    arten = "".join(f"<wfs:FeatureType><wfs:Name>{n}</wfs:Name></wfs:FeatureType>" for n in namen)
    return (
        '<?xml version="1.0" encoding="UTF-8"?>'
        '<wfs:WFS_Capabilities version="2.0.0" xmlns:wfs="http://www.opengis.net/wfs/2.0">'
        f"<wfs:FeatureTypeList>{arten}</wfs:FeatureTypeList></wfs:WFS_Capabilities>"
    ).encode()


class _Antwort:
    """Antwort von requests.get – nur, was fetch braucht."""

    def __init__(self, inhalt: bytes, ctype: str) -> None:
        self.content, self.headers = inhalt, {"Content-Type": ctype}

    def __enter__(self):
        return self

    def __exit__(self, *_):
        return False

    def raise_for_status(self) -> None:
        pass

    def iter_content(self, _n):
        yield self.content


def test_bezirke_laden(fixture_daten, tmp_path, monkeypatch) -> None:
    """WFS: Objektart aus GetCapabilities, dann GetFeature als GeoJSON in EPSG:25833."""
    import requests

    paths = Paths(root=tmp_path)
    monkeypatch.setattr(fetch, "get_paths", lambda: paths)
    aufrufe: list[dict] = []
    dienst = {"arten": ("test:bezirke",), "daten": fixture_daten.bezirke.read_bytes()}

    def get(url, params=None, **_):
        aufrufe.append({"url": url, **(params or {})})
        if params and params.get("REQUEST") == "GetCapabilities":
            return _Antwort(_kapazitaeten(*dienst["arten"]), "application/xml")
        return _Antwort(dienst["daten"], "application/json")

    monkeypatch.setattr(requests, "get", get)
    q = quellen()["berlin_bezirke"]
    ziel = fetch.fetch("berlin_bezirke")
    assert ziel == paths.raw_quelle("berlin_bezirke") / "berlin_bezirke.geojson"
    assert [a["REQUEST"] for a in aufrufe] == ["GetCapabilities", "GetFeature"]
    abfrage = aufrufe[1]
    assert abfrage["url"] == q["url"] and abfrage["TYPENAMES"] == "test:bezirke"
    assert (abfrage["OUTPUTFORMAT"], abfrage["SRSNAME"]) == ("application/json", "EPSG:25833")
    meta = json.loads(ziel.with_name(ziel.name + ".meta.json").read_text(encoding="utf-8"))
    assert meta["objektart"] == "test:bezirke"
    assert len(berlin.flaechen(ziel, BEZIRKE)) == 12

    # Fehlermeldung des Dienstes statt GeoJSON, leere Sammlung: abbrechen, alte Datei bleibt.
    for antwort in (b"<ows:ExceptionReport/>", b'{"type": "FeatureCollection", "features": []}'):
        dienst["daten"] = antwort
        with pytest.raises(RuntimeError, match="nicht die erwartete Datei"):
            fetch.fetch("berlin_bezirke", force=True)
    assert ziel.read_bytes() == fixture_daten.bezirke.read_bytes()

    dienst["arten"] = ("test:bezirke", "test:beschriftung")
    with pytest.raises(RuntimeError, match=r"2 Objektarten .*test:beschriftung.*`objektart`"):
        fetch.fetch("berlin_bezirke", force=True)
    mit_art = {**quellen(), "berlin_bezirke": {**q, "objektart": "test:bezirke"}}
    monkeypatch.setattr(fetch, "quellen", lambda: mit_art)
    aufrufe.clear()
    dienst["daten"] = fixture_daten.bezirke.read_bytes()
    fetch.fetch("berlin_bezirke", force=True)
    assert [a["REQUEST"] for a in aufrufe] == ["GetFeature"], "Objektart aus sources.yaml"

    assert fetch.uebernimm("berlin_bezirke", fixture_daten.bezirke) == ziel, "von Hand"
