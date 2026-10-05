"""Grenzschicht bauen: VG25-Flächen → FlatGeobuf (EPSG:4326) → tippecanoe → gemeinden.pmtiles.

Layer (Vertrag, docs/VERTRAG.md):
- `gemeinden` (z7–z12): ars, gen, eg (Art der Stelle für Gemeindestraßen), sg (Sicherheit),
  ko (Kontakt der zuständigen Stelle: k alle Klassen, t ein Teil, p nur Link ins Bundesportal,
  n nichts)
- `kreise` (z4–z10): ars, name, art (kreis | stadt | stadtstaat), eg, sg, ko (was für die meisten
  Gemeinden des Kreises gilt – für die Übersicht unter Zoom 7, wo es keine Gemeinden gibt)
- `bezirke` (z7–z12): die zwölf Berliner Bezirke aus dem Geoportal Berlin (zustkarte.berlin):
  bezirk (Schlüssel des Eintrags in der Landesdatei), name
`eg`/`sg`/`ko` kommen aus den Landesdateien (tools/build-laender.mjs), damit die Karte nach der
Zuständigkeit oder dem Kontakt färben kann, ohne alle Landesdateien zu laden. Fehlen sie, bleiben
die Felder weg. Berlin ist im Layer `gemeinden` eine Fläche, gefärbt wie die meisten Bezirke.
"""

from __future__ import annotations

import json
from collections import Counter, defaultdict
from pathlib import Path
from typing import Any

from zustkarte import berlin, tiles, vg25
from zustkarte.config import get_paths, load_yaml

STADTSTAATEN = {"02", "04", "11"}


def kreis_art(ars: str, bez: str | None, ibz: int | None) -> str:
    """Art der Kreisebene für die Übersichtskarte."""
    if ars[:2] in STADTSTAATEN:
        return "stadtstaat"
    return "stadt" if vg25.ist_kreisfrei(bez, ibz) else "kreis"


def typen_aus_landesdateien(ordner: Path) -> dict[str, tuple[str, str]]:
    """ARS → (art der Stelle für Gemeindestraßen, Sicherheit) aus zustaendigkeit/<land>.json."""
    typen: dict[str, tuple[str, str]] = {}
    index = ordner / "index.json"
    if not index.exists():
        return typen
    for land in json.loads(index.read_text(encoding="utf-8"))["laender"]:
        daten = json.loads((ordner / land["datei"]).read_text(encoding="utf-8"))
        for ars, g in daten["gemeinden"].items():
            e = daten["ergebnisse"][g["z"]["G"]]
            typen[ars] = (daten["stellen"][e["stelle"]]["art"], e["sicherheit"])
    return typen


def kontakt_rolle(stelle: str, ars: str) -> str | None:
    """Wie `kontaktRolle` in js/resolve.js: `gemeinde` (Feld `kontakt_gemeinde`) für die Gemeinde
    selbst (`g<ARS>`) und ihren Verband (`v…`), `kreis` (Feld `kontakt`) für die Kreisebene (`k…`)
    und in Berlin die Senatsverwaltung (`be-senat`), sonst None."""
    if stelle == f"g{ars}" or stelle.startswith("v"):
        return "gemeinde"
    if stelle.startswith("k") or stelle == "be-senat":
        return "kreis"
    return None


def kontakt_status(daten: dict[str, Any], ars: str) -> str:
    """Hat die zuständige Stelle einen Kontakt? `k` in allen Klassen (G, K, L, B), `t` in einem
    Teil, `a` in keiner, aber die allgemeine Anschrift der Verwaltung (`allgemein`), `p` nichts
    davon, aber das Land führt die Leistung im Bundesportal (die Karte verlinkt dorthin), `n`
    nichts. Welcher Kontakt zu welcher Stelle gehört, wie in `auswahl()` (`kontakt_rolle`)."""
    g = daten["gemeinden"][ars]
    kontakte = daten.get("kontakte") or {}
    feld = {"kreis": "kontakt", "gemeinde": "kontakt_gemeinde"}

    def kontakt(stelle: str) -> dict[str, Any] | None:
        rolle = kontakt_rolle(stelle, ars)
        return kontakte.get(g.get(feld[rolle]) or "") if rolle else None

    je_klasse = [kontakt(daten["ergebnisse"][g["z"][k]]["stelle"]) for k in ("G", "K", "L", "B")]
    eigen = [bool(k) and not k.get("allgemein") for k in je_klasse]
    if all(eigen):
        return "k"
    if any(eigen):
        return "t"
    if any(je_klasse):
        return "a"
    return "p" if daten.get("bundesportal_region") else "n"


def kontakte_aus_landesdateien(ordner: Path) -> dict[str, str]:
    """ARS → Kontaktstatus (`kontakt_status`) aus zustaendigkeit/<land>.json."""
    kontakte: dict[str, str] = {}
    index = ordner / "index.json"
    if not index.exists():
        return kontakte
    for land in json.loads(index.read_text(encoding="utf-8"))["laender"]:
        daten = json.loads((ordner / land["datei"]).read_text(encoding="utf-8"))
        for ars in daten["gemeinden"]:
            kontakte[ars] = kontakt_status(daten, ars)
    return kontakte


def mehrheit_je_kreis(werte: dict[str, Any]) -> dict[str, Any]:
    """Kreis-ARS → der Wert, der für die meisten Gemeinden des Kreises gilt (bei Gleichstand der
    erste nach Name – deterministisch)."""
    je_kreis: dict[str, Counter] = defaultdict(Counter)
    for ars, wert in werte.items():
        je_kreis[ars[:5]][wert] += 1
    return {k: min(z.items(), key=lambda t: (-t[1], t[0]))[0] for k, z in je_kreis.items()}


def kreis_typen(typen: dict[str, tuple[str, str]]) -> dict[str, tuple[str, str]]:
    """Kreis-ARS → (eg, sg), die für die meisten Gemeinden des Kreises gelten."""
    return mehrheit_je_kreis(typen)


def schreibe_fgb(
    gpkg: Path,
    ziel_gem: Path,
    ziel_krs: Path,
    typen: dict[str, tuple[str, str]],
    kontakte: dict[str, str] | None = None,
) -> int:
    import geopandas as gpd

    gem = vg25.lese_flaechen(gpkg, "gem").to_crs(4326)
    daten = {"ars": gem["ARS"].astype(str), "gen": gem["GEN"].astype(str)}
    if typen:
        fehlend = sorted(set(daten["ars"]) - set(typen))
        if fehlend:
            raise RuntimeError(
                f"{len(fehlend)} Gemeinden ohne Eintrag in den Landesdateien, z. B. "
                f"{', '.join(fehlend[:5])} – erst `zust laender` neu bauen."
            )
        daten["eg"] = daten["ars"].map(lambda a: typen[a][0])
        daten["sg"] = daten["ars"].map(lambda a: typen[a][1])
    if kontakte:
        daten["ko"] = daten["ars"].map(lambda a: kontakte.get(a, "n"))
    out = gpd.GeoDataFrame(daten, geometry=gem.geometry.values, crs=4326)
    ziel_gem.parent.mkdir(parents=True, exist_ok=True)
    out.to_file(ziel_gem, driver="FlatGeobuf", engine="pyogrio")

    krs = vg25.lese_flaechen(gpkg, "krs").to_crs(4326)
    nbd = krs["NBD"] if "NBD" in krs.columns else [None] * len(krs)
    ibz = krs["IBZ"] if "IBZ" in krs.columns else [None] * len(krs)
    namen = [vg25.voller_name(g, b, n) for g, b, n in zip(krs["GEN"], krs["BEZ"], nbd, strict=True)]
    arten = [kreis_art(str(a), b, i) for a, b, i in zip(krs["ARS"], krs["BEZ"], ibz, strict=True)]
    spalten = {"ars": krs["ARS"].astype(str), "name": namen, "art": arten}
    if typen:
        je_kreis = kreis_typen(typen)
        spalten["eg"] = [je_kreis.get(a, (None, None))[0] for a in spalten["ars"]]
        spalten["sg"] = [je_kreis.get(a, (None, None))[1] for a in spalten["ars"]]
    if kontakte:
        ko_kreis = mehrheit_je_kreis(kontakte)
        spalten["ko"] = [ko_kreis.get(a) for a in spalten["ars"]]
    gpd.GeoDataFrame(spalten, geometry=krs.geometry.values, crs=4326).to_file(
        ziel_krs, driver="FlatGeobuf", engine="pyogrio"
    )
    return len(out)


def schreibe_bezirke(flaechen, ziel: Path, typen: dict[str, Any] | None = None) -> int:
    """Berliner Bezirke (`berlin.flaechen`) → FlatGeobuf für den Layer `bezirke`: `bezirk`
    (Schlüssel des Eintrags in der Landesdatei) und `name`. Ohne Überlappung
    (`berlin.bereinigt`), nicht zugeschnitten. Mit `typen` (aus den Landesdateien) muss dort
    jeder Bezirk stehen – sonst fände die Karte zum Bezirk keinen Eintrag."""
    import geopandas as gpd

    b = berlin.bereinigt(flaechen).to_crs(4326)
    schluessel = [berlin.bezirk_ars(nr) for nr in b["nr"]]
    fehlend = sorted(set(schluessel) - set(typen)) if typen else []
    if fehlend:
        raise RuntimeError(
            f"Bezirke ohne Eintrag in den Landesdateien: {', '.join(fehlend)} – erst "
            "`zust tabelle` und `zust laender` neu bauen."
        )
    ziel.parent.mkdir(parents=True, exist_ok=True)
    gpd.GeoDataFrame(
        {"bezirk": schluessel, "name": list(b["name"])}, geometry=b.geometry.values, crs=4326
    ).to_file(ziel, driver="FlatGeobuf", engine="pyogrio")
    return len(b)


def baue(gpkg: Path, *, bezirke: Path | None = None, dry_run: bool = False) -> Path:
    """Grenzschicht bauen. `bezirke`: Datei mit den Berliner Bezirken (Quelle `berlin_bezirke`).
    Mit ihr ist Berlin im Layer `gemeinden` eingefärbt wie die meisten Bezirke; ohne sie fehlt der
    Layer `bezirke`, und die Karte nennt in Berlin Senat und Bezirksamt ohne Namen."""
    paths = get_paths()
    typen = typen_aus_landesdateien(paths.out)
    if not typen:
        print(
            "  Hinweis: keine Landesdateien gefunden – Kacheln ohne eg/sg/ko (erst `zust laender`)."
        )
    kontakte = kontakte_aus_landesdateien(paths.out)
    # Die Bezirke zuerst: Passt die Datei nicht, bricht es ab, bevor tippecanoe läuft.
    flaechen = berlin.flaechen(bezirke, berlin.bezirke()) if bezirke else None
    if flaechen is not None:
        typen, kontakte = berlin.stadt_wie_bezirke(typen), berlin.stadt_wie_bezirke(kontakte)
    gem_fgb = paths.interim / "gemeinden.fgb"
    krs_fgb = paths.interim / "kreise.fgb"
    bez_fgb = paths.interim / "bezirke.fgb"
    n = schreibe_fgb(gpkg, gem_fgb, krs_fgb, typen, kontakte)
    print(f"  {n} Gemeindeflächen → {gem_fgb.name}, Kreise → {krs_fgb.name}")
    eingaben = [("gemeinden", gem_fgb), ("kreise", krs_fgb)]
    if flaechen is not None:
        nb = schreibe_bezirke(flaechen, bez_fgb, typen)
        print(f"  {nb} Berliner Bezirke → {bez_fgb.name}")
        eingaben.append(("bezirke", bez_fgb))
    teile = [
        tiles.tippecanoe(layer, fgb, paths.interim / f"{layer}_tmp.pmtiles", dry_run=dry_run)
        for layer, fgb in eingaben
    ]
    ziel = paths.data / load_yaml("tiles.yaml")["ausgabe"]
    tiles.tile_join(ziel, teile, dry_run=dry_run)
    if not dry_run:
        for p in teile:
            p.unlink(missing_ok=True)
    return ziel
