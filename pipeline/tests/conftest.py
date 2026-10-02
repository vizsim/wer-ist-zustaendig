"""Testdaten: ein kleines VG25-GeoPackage und ein GV100AD-Auszug, aufgebaut nach der Dokumentation.

Die Schlüssel folgen dem echten Aufbau (ARS = Land 2 · RB 1 · Kreis 2 · VG 4 · Gemeinde 3), die
Flächen sind Rechtecke um bekannte Punkte (in EPSG:25832 abgelegt wie VG25). Fälle: kreisfreie
Stadt, Große Kreisstadt mit Loch, darin die Exklave einer Gemeinde einer Verwaltungsgemeinschaft,
Stadtstaaten, gemeindefreies Gebiet, Region Hannover (NBD ja), Verbandsgemeinde in RP und daneben
ein Stück des deutsch-luxemburgischen Kondominiums (nur VG25; im GV-ISys nur als Ganzes).
"""

from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path

import pytest

from zustkarte.gv100ad import zeile_gemeinde

STAND = "20251231"


@dataclass
class Fixture:
    gpkg: Path
    gv100ad: Path
    punkte: list[dict]


def _box(lon0: float, lat0: float, lon1: float, lat1: float):
    from shapely.geometry import box

    return box(lon0, lat0, lon1, lat1)


def _attrs(
    ade: int,
    ars: str,
    gen: str,
    bez: str,
    ibz: int,
    nbd: str,
    fk_s3: str = "R",
    sdv: str | None = None,
    gf: int = 9,
) -> dict:
    lkz = {"01": "SH", "03": "NI", "04": "HB", "07": "RP", "09": "BY", "11": "BE"}[ars[:2]]
    ags = ars[:5] + ars[9:] if len(ars) == 12 else ars
    return {
        "ADE": ade,
        "GF": gf,
        "BSG": 1,
        "ARS": ars,
        "AGS": ags,
        "SDV_ARS": sdv or ars.ljust(12, "0"),
        "GEN": gen,
        "BEZ": bez,
        "IBZ": ibz,
        "BEM": "--",
        "NBD": nbd,
        "FK_S3": fk_s3,
        "LKZ": lkz,
    }


def baue_fixture(ordner: Path) -> Fixture:
    import geopandas as gpd
    from shapely.geometry import MultiPolygon

    ordner.mkdir(parents=True, exist_ok=True)
    gpkg = ordner / "vg25_test.gpkg"

    # Freising: Rechteck mit Loch; im Loch eine Exklave von Musterdorf (gleiche VG-Ebene).
    freising_aussen = _box(11.70, 48.37, 11.78, 48.43)
    loch = _box(11.735, 48.395, 11.745, 48.405)
    freising = freising_aussen.difference(loch)
    musterdorf = MultiPolygon([_box(11.78, 48.37, 11.86, 48.43), loch])

    gemeinden = [
        (
            _attrs(6, "091620000000", "München", "Kreisfreie Stadt", 60, "nein"),
            _box(11.50, 48.10, 11.65, 48.18),
        ),
        (_attrs(6, "091780124124", "Freising", "Große Kreisstadt", 61, "nein"), freising),
        (
            _attrs(6, "091785101201", "Musterdorf", "Gemeinde", 64, "nein", sdv="091785101201"),
            musterdorf,
        ),
        (
            _attrs(6, "040110000000", "Bremen", "Kreisfreie Stadt", 60, "nein"),
            _box(8.70, 53.00, 8.90, 53.15),
        ),
        (
            _attrs(6, "040120000000", "Bremerhaven", "Kreisfreie Stadt", 60, "nein"),
            _box(8.50, 53.50, 8.65, 53.60),
        ),
        (
            _attrs(6, "110000000000", "Berlin", "Kreisfreie Stadt", 60, "nein"),
            _box(13.30, 52.45, 13.45, 52.57),
        ),
        (
            _attrs(6, "010539105105", "Sachsenwald", "gemeindefreies Gebiet", 65, "nein"),
            _box(10.33, 53.50, 10.43, 53.56),
        ),
        (
            _attrs(6, "032410001001", "Hannover", "Landeshauptstadt", 61, "nein", fk_s3="K"),
            _box(9.65, 52.33, 9.82, 52.42),
        ),
        (
            _attrs(6, "073395001001", "Musterdorf", "Ortsgemeinde", 64, "nein", fk_s3="K"),
            _box(7.95, 49.85, 8.05, 49.95),
        ),
        (
            _attrs(
                6,
                "079395001001",
                "Deutsch-Luxemburgisches Hoheitsgebiet [Musterdorf]",
                "Kondominium",
                69,
                "nein",
                fk_s3="D",
                sdv="073395001001",
            ),
            _box(8.05, 49.85, 8.07, 49.95),
        ),
    ]
    # Ein Datensatz mit GF = 8 (ohne Struktur) desselben ARS darf nicht stören.
    gemeinden.append(
        (
            _attrs(6, "040110000000", "Bremen", "Kreisfreie Stadt", 60, "nein", gf=8),
            _box(8.70, 53.15, 8.90, 53.20),
        )
    )
    kreise = [
        (
            _attrs(4, "09162", "München", "Kreisfreie Stadt", 40, "nein"),
            _box(11.50, 48.10, 11.65, 48.18),
        ),
        (_attrs(4, "09178", "Freising", "Landkreis", 43, "ja"), _box(11.70, 48.37, 11.86, 48.43)),
        (
            _attrs(4, "04011", "Bremen", "Kreisfreie Stadt", 40, "nein"),
            _box(8.70, 53.00, 8.90, 53.15),
        ),
        (
            _attrs(4, "04012", "Bremerhaven", "Kreisfreie Stadt", 40, "nein"),
            _box(8.50, 53.50, 8.65, 53.60),
        ),
        (
            _attrs(4, "11000", "Berlin", "Kreisfreie Stadt", 40, "nein"),
            _box(13.30, 52.45, 13.45, 52.57),
        ),
        (
            _attrs(4, "01053", "Herzogtum Lauenburg", "Kreis", 42, "ja"),
            _box(10.33, 53.50, 10.43, 53.56),
        ),
        (
            _attrs(4, "03241", "Hannover", "Region", 45, "ja", fk_s3="K"),
            _box(9.65, 52.33, 9.82, 52.42),
        ),
        (
            _attrs(4, "07339", "Mainz-Bingen", "Landkreis", 43, "ja", fk_s3="K"),
            _box(7.95, 49.85, 8.05, 49.95),
        ),
        (
            _attrs(
                4,
                "07939",
                "Deutsch-Luxemburgisches Hoheitsgebiet [Lkr. Mainz-Bingen]",
                "Kondominium",
                49,
                "nein",
                fk_s3="D",
            ),
            _box(8.05, 49.85, 8.07, 49.95),
        ),
    ]
    vwg = [
        (
            _attrs(5, "091620000", "München", "Kreisfreie Stadt", 50, "nein"),
            _box(11.50, 48.10, 11.65, 48.18),
        ),
        (_attrs(5, "091780124", "Freising", "Große Kreisstadt", 80, "nein"), freising),
        (
            _attrs(
                5,
                "091785101",
                "Musterberg",
                "Verwaltungsgemeinschaft",
                53,
                "ja",
                sdv="091785101201",
            ),
            musterdorf,
        ),
        (
            _attrs(
                5,
                "073395001",
                "Musterland",
                "Verbandsgemeinde",
                52,
                "ja",
                fk_s3="K",
                sdv="073395001001",
            ),
            _box(7.95, 49.85, 8.05, 49.95),
        ),
    ]
    rbz = [
        (_attrs(3, "091", "Oberbayern", "Regierungsbezirk", 30, "ja"), _box(11.4, 48.0, 12.0, 48.5))
    ]

    def schreibe(eintraege, layer, *, klein=False):
        attrs = [a for a, _ in eintraege]
        gdf = gpd.GeoDataFrame(attrs, geometry=[g for _, g in eintraege], crs=4326).to_crs(25832)
        if klein:  # Spaltennamen klein: die Pipeline normalisiert
            gdf = gdf.rename(columns={c: c.lower() for c in gdf.columns if c != "geometry"})
        gdf.to_file(gpkg, layer=layer, driver="GPKG", engine="pyogrio")

    schreibe(gemeinden, "vg25_gem")
    schreibe(kreise, "vg25_krs")
    schreibe(vwg, "vg25_vwg")
    schreibe(rbz, "vg25_rbz", klein=True)
    schreibe(
        [(_attrs(2, "09", "Bayern", "Freistaat", 21, "nein"), _box(9, 47, 14, 51))], "vg25_lan"
    )

    gv = ordner / "GV100AD_311225.txt"
    zeilen = [
        "10" + STAND + "09" + " " * 10 + "Bayern".ljust(50),
        "40" + STAND + "09162" + " " * 7 + "München".ljust(50),
    ]
    for ags, vb, name, tkz, ew in [
        ("09162000", "0000", "München", 61, 1510378),
        ("09178124", "0124", "Freising", 67, 50721),
        ("09178201", "5101", "Musterdorf", 64, 1200),
        ("04011000", "0000", "Bremen", 61, 569396),
        ("04012000", "0000", "Bremerhaven", 61, 113026),
        ("11000000", "0000", "Berlin", 61, 3685265),
        ("01053105", "9105", "Sachsenwald", 66, None),
        ("03241001", "0001", "Hannover", 63, 548186),
        ("07339001", "5001", "Musterdorf", 64, 800),
        ("07000999", "9999", "Gemeinsames deutsch-luxemburgisches Hoheitsgebiet", 66, 0),
    ]:
        zeilen.append(zeile_gemeinde(stand=STAND, ags=ags, vb=vb, name=name, tkz=tkz, ew=ew))
    gv.write_text("\n".join(zeilen) + "\n", encoding="utf-8")

    punkte = [
        {"name": "München", "lat": 48.1374, "lon": 11.5755, "ars": "091620000000"},
        {"name": "Freising (Ring)", "lat": 48.40, "lon": 11.71, "ars": "091780124124"},
        {"name": "Exklave im Loch", "lat": 48.40, "lon": 11.74, "ars": "091785101201"},
        {"name": "Musterdorf (BY)", "lat": 48.40, "lon": 11.82, "ars": "091785101201"},
        {"name": "Bremen", "lat": 53.0758, "lon": 8.8072, "ars": "040110000000"},
        {"name": "Bremerhaven", "lat": 53.55, "lon": 8.58, "ars": "040120000000"},
        {"name": "Berlin", "lat": 52.5163, "lon": 13.3777, "ars": "110000000000"},
        {"name": "Sachsenwald", "lat": 53.53, "lon": 10.38, "ars": "010539105105"},
        {"name": "Hannover", "lat": 52.3745, "lon": 9.7385, "ars": "032410001001"},
        {"name": "Musterdorf (RP)", "lat": 49.90, "lon": 8.00, "ars": "073395001001"},
        {"name": "Kondominium", "lat": 49.90, "lon": 8.06, "ars": "079395001001"},
    ]
    return Fixture(gpkg=gpkg, gv100ad=gv, punkte=punkte)


PRUEFUNGEN = {
    "grosse_kreisstaedte": {"BY": {"erwartet": 1, "toleranz": 0, "quelle": "Testdaten"}},
    "mindest_gemeinden": 0,
}
QUELLEN_META = [
    {"id": "vg25", "label": "VG25 (Test)", "lizenz": "CC BY 4.0", "vermerk": "© BKG (Test)"}
]


@pytest.fixture(scope="session")
def fixture_daten(tmp_path_factory) -> Fixture:
    return baue_fixture(tmp_path_factory.mktemp("vg25"))
