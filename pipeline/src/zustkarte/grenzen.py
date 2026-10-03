"""Grenzschicht bauen: VG25-Flächen → FlatGeobuf (EPSG:4326) → tippecanoe → gemeinden.pmtiles.

Layer (Vertrag, docs/VERTRAG.md):
- `gemeinden` (z7–z12): ars, gen, eg (Art der Stelle für Gemeindestraßen), sg (Sicherheit)
- `kreise` (z4–z10): ars, name, art (kreis | stadt | stadtstaat), eg, sg (was für die meisten
  Gemeinden des Kreises gilt – für die Übersicht unter Zoom 7, wo es keine Gemeinden gibt)
`eg`/`sg` kommen aus den Landesdateien (tools/build-laender.mjs), damit die Karte nach der
Zuständigkeit färben kann, ohne alle Landesdateien zu laden. Fehlen sie, bleiben die Felder weg.
"""

from __future__ import annotations

import json
from collections import Counter, defaultdict
from pathlib import Path

from zustkarte import tiles, vg25
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


def kreis_typen(typen: dict[str, tuple[str, str]]) -> dict[str, tuple[str, str]]:
    """Kreis-ARS → (eg, sg), die für die meisten Gemeinden des Kreises gelten (bei Gleichstand das
    erste Paar nach Name – deterministisch)."""
    je_kreis: dict[str, Counter] = defaultdict(Counter)
    for ars, typ in typen.items():
        je_kreis[ars[:5]][typ] += 1
    return {k: min(z.items(), key=lambda t: (-t[1], t[0]))[0] for k, z in je_kreis.items()}


def schreibe_fgb(
    gpkg: Path, ziel_gem: Path, ziel_krs: Path, typen: dict[str, tuple[str, str]]
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
    gpd.GeoDataFrame(spalten, geometry=krs.geometry.values, crs=4326).to_file(
        ziel_krs, driver="FlatGeobuf", engine="pyogrio"
    )
    return len(out)


def baue(gpkg: Path, *, dry_run: bool = False) -> Path:
    paths = get_paths()
    typen = typen_aus_landesdateien(paths.out)
    if not typen:
        print("  Hinweis: keine Landesdateien gefunden – Kacheln ohne eg/sg (erst `zust laender`).")
    gem_fgb = paths.interim / "gemeinden.fgb"
    krs_fgb = paths.interim / "kreise.fgb"
    n = schreibe_fgb(gpkg, gem_fgb, krs_fgb, typen)
    print(f"  {n} Gemeindeflächen → {gem_fgb.name}, Kreise → {krs_fgb.name}")
    ziel = paths.data / load_yaml("tiles.yaml")["ausgabe"]
    teil_gem = paths.interim / "gemeinden_tmp.pmtiles"
    teil_krs = paths.interim / "kreise_tmp.pmtiles"
    tiles.tippecanoe("gemeinden", gem_fgb, teil_gem, dry_run=dry_run)
    tiles.tippecanoe("kreise", krs_fgb, teil_krs, dry_run=dry_run)
    tiles.tile_join(ziel, [teil_gem, teil_krs], dry_run=dry_run)
    if not dry_run:
        for p in (teil_gem, teil_krs):
            p.unlink(missing_ok=True)
    return ziel
