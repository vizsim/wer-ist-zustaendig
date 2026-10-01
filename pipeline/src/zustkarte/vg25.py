"""VG25 (BKG) lesen: Ebenen Land bis Gemeinde aus dem GeoPackage.

Grundlage: Dokumentation VG25, Stand 08.07.2026 (Produktstand 31.12.2025):
- Ebenen `vg25_lan`, `vg25_rbz`, `vg25_krs`, `vg25_vwg`, `vg25_gem` (Flächen) und `vg25_li`
  (Grenzlinien); Attribute u. a. ADE, GF, ARS, AGS, SDV_ARS, GEN, BEZ, IBZ, NBD, FK_S3, LKZ.
- Je Verwaltungseinheit genau ein Datensatz mit GF = 9 (Geofaktor „mit Struktur").
- ARS-Länge je Ebene: Land 2, Regierungsbezirk 3, Kreis 5, Verwaltungsgemeinschaft 9, Gemeinde 12.
Spaltennamen werden auf Großbuchstaben normalisiert; Schlüssel bleiben Strings.
"""

from __future__ import annotations

from pathlib import Path

import pandas as pd

EBENEN = {
    "lan": "vg25_lan",
    "rbz": "vg25_rbz",
    "krs": "vg25_krs",
    "vwg": "vg25_vwg",
    "gem": "vg25_gem",
}
ARS_LAENGE = {"lan": 2, "rbz": 3, "krs": 5, "vwg": 9, "gem": 12}
TEXT = ("ARS", "AGS", "SDV_ARS", "GEN", "BEZ", "NBD", "FK_S3", "LKZ")


def _layername(gpkg: Path, ebene: str) -> str:
    import pyogrio

    vorhanden = {str(n).lower(): str(n) for n, _ in pyogrio.list_layers(gpkg)}
    gesucht = EBENEN[ebene]
    if gesucht not in vorhanden:
        raise RuntimeError(
            f"{gpkg.name}: Ebene {gesucht} fehlt (vorhanden: {', '.join(sorted(vorhanden))})"
        )
    return vorhanden[gesucht]


def _normalisiere(df: pd.DataFrame, ebene: str) -> pd.DataFrame:
    df = df.rename(columns={c: c.upper() for c in df.columns if c != "geometry"})
    fehlend = {"ARS", "GEN", "BEZ"} - set(df.columns)
    if fehlend:
        raise RuntimeError(f"{EBENEN[ebene]}: Spalten fehlen: {', '.join(sorted(fehlend))}")
    if "GF" in df.columns:
        df = df[pd.to_numeric(df["GF"], errors="coerce") == 9]
    for c in TEXT:
        if c in df.columns:
            df[c] = df[c].astype("string").str.strip()
    if "IBZ" in df.columns:
        df["IBZ"] = pd.to_numeric(df["IBZ"], errors="coerce").astype("Int64")
    falsch = df[df["ARS"].str.len() != ARS_LAENGE[ebene]]
    if len(falsch):
        beispiele = ", ".join(falsch["ARS"].head(5).astype(str))
        raise RuntimeError(
            f"{EBENEN[ebene]}: {len(falsch)} ARS mit falscher Länge, z. B. {beispiele}"
        )
    doppelt = df[df["ARS"].duplicated()]["ARS"]
    if len(doppelt):
        raise RuntimeError(f"{EBENEN[ebene]}: ARS doppelt (GF = 9): {', '.join(doppelt.head(5))}")
    return df.reset_index(drop=True)


def lese_ebene(gpkg: Path, ebene: str) -> pd.DataFrame:
    """Attribute einer Ebene (ohne Geometrie), ein Datensatz je Verwaltungseinheit."""
    import pyogrio

    df = pyogrio.read_dataframe(gpkg, layer=_layername(gpkg, ebene), read_geometry=False)
    return _normalisiere(pd.DataFrame(df), ebene)


def lese_flaechen(gpkg: Path, ebene: str):
    """Flächen einer Ebene als GeoDataFrame (CRS der Quelle, i. d. R. EPSG:25832)."""
    import pyogrio

    gdf = pyogrio.read_dataframe(gpkg, layer=_layername(gpkg, ebene))
    if gdf.crs is None:
        raise RuntimeError(f"{EBENEN[ebene]}: kein Koordinatensystem angegeben")
    return _normalisiere(gdf, ebene)


def voller_name(gen: str, bez: str | None, nbd: str | None) -> str:
    """Wie js/namen.js: bei NBD = ja gehört BEZ zum Namen („Kreis Dithmarschen")."""
    g = str(gen or "").strip()
    if not g:
        raise ValueError("voller_name: GEN fehlt")
    b = str(bez or "").strip()
    return f"{b} {g}" if str(nbd or "").strip().lower() == "ja" and b else g


KREISFREI_BEZ = {"kreisfreie stadt", "stadtkreis"}
KREISANGEHOERIG_BEZ = {"landkreis", "kreis", "region", "regionalverband", "städteregion"}


def ist_kreisfrei(bez: str | None, ibz: int | None) -> bool:
    """Kreisfreie Stadt bzw. Stadtkreis auf Kreisebene: nach BEZ, nur bei unbekannter BEZ nach
    IBZ (40/41). tabelle.py gleicht das Ergebnis mit dem GV-ISys-Textkennzeichen ab."""
    b = str(bez or "").strip().lower()
    if b in KREISFREI_BEZ:
        return True
    if b in KREISANGEHOERIG_BEZ:
        return False
    return ibz in (40, 41) if ibz is not None and not pd.isna(ibz) else False
