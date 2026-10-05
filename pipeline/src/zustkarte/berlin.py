"""Berlin: die zwölf Bezirke als eigene Einträge und als eigene Schicht.

Berlin ist eine Gemeinde (VG25, GV-ISys: ARS 110000000000). Straßenverkehrsbehörde sind aber die
Bezirksämter, für das übergeordnete Straßennetz die Senatsverwaltung (js/resolve.js). Damit die
Karte das Bezirksamt nennen kann:

- Gemeindetabelle: je Bezirk ein Eintrag neben dem für ganz Berlin, Schlüssel `1100000000` +
  Bezirksnummer (`110000000001` Mitte … `110000000012` Reinickendorf), gebildet wie ein ARS; AGS
  entsprechend `110000` + Nummer. Amtliche Gemeindeschlüssel sind das nicht. Nummern und Namen
  stehen in config/berlin.yaml.
- Grenzschicht: Der Layer `gemeinden` bleibt, wie er ist – Berlin eine Fläche. Die Bezirke kommen
  als eigener Layer `bezirke` dazu (Feld `bezirk` = Schlüssel des Eintrags). Wer in Berlin
  nachschlägt, sieht dort nach; ohne Treffer gilt der Eintrag für ganz Berlin.
- Die Flächen kommen aus dem Geoportal Berlin (`berlin_bezirke` in sources.yaml: WFS „ALKIS
  Berlin Bezirke", Datenlizenz Deutschland – Zero 2.0) und werden über den Namen zugeordnet. Sie
  werden nicht zugeschnitten: Wo sie ein paar Meter über die generalisierte Grenze aus VG25
  hinausragen, zählt nur, was im Layer `gemeinden` Berlin ist.
"""

from __future__ import annotations

import re
import unicodedata
from collections import Counter
from collections.abc import Callable
from pathlib import Path
from typing import Any

from zustkarte.config import load_yaml

BERLIN = "110000000000"
BEZIRK_NR = re.compile(r"^(0[1-9]|1[0-2])$")
UMGEBUNG = (13.0, 52.3, 13.9, 52.8)  # Rahmen um Berlin (Länge, Breite): Prüfung der Flächen


def bezirk_ars(nr: str) -> str:
    """Schlüssel eines Bezirks: „01" → „110000000001"."""
    if not BEZIRK_NR.fullmatch(str(nr)):
        raise ValueError(f"Bezirksnummer {nr!r}: erwartet 01 bis 12")
    return BERLIN[:10] + str(nr)


def bezirke(config_dir: Path | None = None) -> dict[str, str]:
    """Nummer → Name aus config/berlin.yaml, geprüft: Nummern 01–12, Namen eindeutig."""
    roh = load_yaml("berlin.yaml", config_dir).get("bezirke") or {}
    out = {str(nr): str(name or "").strip() for nr, name in roh.items()}
    fehler = [nr for nr, name in out.items() if not BEZIRK_NR.fullmatch(nr) or not name]
    doppelt = sorted({n for n in out.values() if list(out.values()).count(n) > 1})
    if fehler or doppelt or len(out) != 12:
        raise ValueError(
            f"berlin.yaml: zwölf Bezirke mit Nummer 01–12 und eindeutigem Namen erwartet "
            f"(falsch: {', '.join(fehler) or '–'}; doppelt: {', '.join(doppelt) or '–'}; "
            f"Anzahl {len(out)})"
        )
    return dict(sorted(out.items()))


def eintraege(berlin: dict[str, Any], namen: dict[str, str]) -> dict[str, dict[str, Any]]:
    """Einträge der Bezirke für die Gemeindetabelle: Land, Kreis und Regierungsbezirk wie Berlin,
    eigener Schlüssel und Name; ohne Textkennzeichen und Einwohner (GV-ISys kennt keine Bezirke)."""
    out = {}
    for nr, name in sorted(namen.items()):
        ars = bezirk_ars(nr)
        out[ars] = {
            **berlin,
            "ars": ars,
            "ags": ars[:5] + ars[9:],
            "gen": name,
            "name": f"Bezirk {name}",
            "bez": "Bezirk",
            "ibz": None,
            "tkz": [],
            "ew": None,
            "gebietsaenderung": None,
            "kondominium": None,
            "bezirk": {"nr": nr, "name": name},
        }
    return out


def _norm(s: Any) -> str:
    """Vergleichsform eines Namens: Unicode NFC, klein, Umlaute aufgelöst, nur Buchstaben und
    Ziffern („Treptow - Köpenick" → „treptowkoepenick")."""
    t = unicodedata.normalize("NFC", str(s or "")).casefold()
    for a, b in (("ä", "ae"), ("ö", "oe"), ("ü", "ue"), ("ß", "ss")):
        t = t.replace(a, b)
    return re.sub(r"[^a-z0-9]", "", t)


def flaechen(pfad: Path, namen: dict[str, str], *, melde: Callable[[str], None] = print):
    """Flächen der Bezirke aus einer Vektordatei (GeoJSON aus dem WFS) → GeoDataFrame mit `nr`,
    `name` und Geometrie im Koordinatensystem der Datei, sortiert nach Nummer.

    Zugeordnet wird über den Namen: Ein Attribut jedes Objekts trägt den Namen eines Bezirks aus
    berlin.yaml, auch mit vorangestelltem „Bezirk"; Groß- und Kleinschreibung, Umlaute,
    Leerzeichen und Bindestriche zählen nicht. Mehrere Objekte eines Bezirks werden vereinigt;
    Objekte ohne passenden Namen (etwa die ganze Stadt) bleiben mit einer Meldung weg, ebenso
    alles, was keine Fläche ist. Fehlt ein Bezirk, passt ein Objekt zu mehreren Bezirken oder
    liegen die Flächen nicht um Berlin (Koordinatensystem?), bricht es ab – lieber kein Bezirk
    als ein falscher.
    """
    import geopandas as gpd
    import pyogrio

    df = pyogrio.read_dataframe(pfad)
    if df.crs is None:
        raise RuntimeError(f"{pfad.name}: kein Koordinatensystem angegeben")
    df = df[df.geometry.notna() & df.geom_type.isin(["Polygon", "MultiPolygon"])]
    nach_name = {}
    for nr, name in namen.items():
        nach_name[_norm(name)] = nr
        nach_name[_norm(f"Bezirk {name}")] = nr
    nrn: list[str | None] = []
    uebergangen: list[str] = []
    for zeile in df.drop(columns="geometry").to_dict("records"):
        werte = [v for v in zeile.values() if isinstance(v, str)]
        treffer = {nach_name[w] for w in map(_norm, werte) if w in nach_name}
        if len(treffer) > 1:
            raise RuntimeError(
                f"{pfad.name}: ein Objekt passt zu mehreren Bezirken ({', '.join(werte)})"
            )
        if not treffer:
            uebergangen.append(", ".join(werte) or "ohne Namen")
        nrn.append(treffer.pop() if treffer else None)
    if uebergangen:
        n = len(uebergangen)
        liste = "; ".join(uebergangen[:5]) + ("; …" if n > 5 else "")
        melde(f"  {pfad.name}: {n} Objekt(e) ohne Namen eines Bezirks übergangen ({liste})")
    fehlend = [namen[nr] for nr in namen if nr not in nrn]
    if fehlend:
        raise RuntimeError(f"{pfad.name}: Bezirke fehlen: {', '.join(fehlend)}")
    gdf = gpd.GeoDataFrame({"nr": nrn}, geometry=df.geometry.make_valid().values, crs=df.crs)
    gdf = gdf[gdf["nr"].notna()]
    mehrfach = sorted(nr for nr, n in Counter(gdf["nr"]).items() if n > 1)
    if mehrfach:
        melde(f"  {pfad.name}: Objekte vereinigt für {', '.join(namen[nr] for nr in mehrfach)}")
        gdf = gdf.dissolve(by="nr").reset_index()
    out = gdf.sort_values("nr").reset_index(drop=True)
    x0, y0, x1, y1 = out.to_crs(4326).total_bounds
    if not (UMGEBUNG[0] <= x0 and x1 <= UMGEBUNG[2] and UMGEBUNG[1] <= y0 and y1 <= UMGEBUNG[3]):
        raise RuntimeError(
            f"{pfad.name}: Die Flächen liegen nicht um Berlin ({x0:.2f}, {y0:.2f} bis {x1:.2f}, "
            f"{y1:.2f}) – Koordinatensystem der Datei falsch angegeben?"
        )
    out["name"] = out["nr"].map(namen)
    return out[["nr", "name", "geometry"]]


def bereinigt(flaechen):
    """Bezirksflächen ohne Überlappung: Wo sich zwei überlappen, gehört die Fläche dem Bezirk mit
    der kleineren Nummer – so liefert das Nachschlagen genau einen Bezirk. Bezirke ohne
    Überlappung bleiben, wie sie sind: Nachbarn teilen sich in der Quelle die Grenzlinie, und
    genau daran erkennt tippecanoe die gemeinsame Grenze."""
    import geopandas as gpd
    import shapely

    out = flaechen.sort_values("nr").reset_index(drop=True)
    geoms = list(out.geometry.values)
    for i in range(len(geoms)):
        for j in range(i):
            if shapely.intersection(geoms[i], geoms[j]).area > 0:
                rest = shapely.difference(geoms[i], geoms[j])
                teile = [
                    t
                    for t in shapely.get_parts(rest)
                    if t.geom_type == "Polygon" and not t.is_empty
                ]
                if not teile:
                    raise RuntimeError(
                        f"Bezirk {out.at[i, 'name']} liegt ganz in {out.at[j, 'name']}"
                    )
                geoms[i] = teile[0] if len(teile) == 1 else shapely.MultiPolygon(teile)
    out["geometry"] = gpd.GeoSeries(geoms, index=out.index, crs=out.crs)
    return out


def stadt_wie_bezirke(werte: dict[str, Any]) -> dict[str, Any]:
    """Wert für ganz Berlin (ARS 110000000000) wie für die meisten Bezirke (bei Gleichstand der
    erste nach Name) – für die Einfärbung der einen Berliner Fläche im Layer `gemeinden`. Ohne
    Bezirke unverändert."""
    bezirke = Counter(w for k, w in werte.items() if k[:10] == BERLIN[:10] and k != BERLIN)
    if not bezirke:
        return werte
    return {**werte, BERLIN: min(bezirke.items(), key=lambda t: (-t[1], t[0]))[0]}
