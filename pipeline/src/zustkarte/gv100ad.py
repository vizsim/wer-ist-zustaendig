"""GV100AD lesen: Gemeindeverzeichnis von Destatis im Format fester Satzlänge.

Satzaufbau laut Datensatzbeschreibung (liegt dem ZIP als PDF bei); die Positionen hier folgen
dem Parser gv100ad-py (MIT, STÜBER SYSTEMS / openpotato), 0-basiert, Zeichen statt Bytes:

    [0:2]     Satzart: 10 Land · 20 Regierungsbezirk · 30 Region · 40 Kreis · 50 Gemeindeverband
              · 60 Gemeinde
    [2:10]    Gebietsstand JJJJMMTT
    [10:18]   Regionalschlüssel (EF3): Land 2, RB 1, Kreis 2, Gemeinde 3 (= AGS)
    [18:22]   Gemeindeverband (EF4)
    [22:72]   Name
    [122:124] Textkennzeichen (Satzart 60): 60 Markt · 61 kreisfreie Stadt · 62 Stadtkreis ·
              63 Stadt · 64 kreisangehörige Gemeinde · 65/66 gemeindefreies Gebiet
              (bewohnt/unbewohnt) · 67 Große Kreisstadt
    [128:139] Fläche in ha · [139:150] Bevölkerung insgesamt · [150:161] männlich

Der 12-stellige ARS einer Gemeinde ist AGS[0:5] + Gemeindeverband + AGS[5:8].
Jede Zeile wird streng geprüft; ein unerwartetes Format bricht ab, statt still zu raten.
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import date, datetime
from pathlib import Path

SATZARTEN = {"10", "20", "30", "40", "50", "60"}
TEXTKENNZEICHEN_GEMEINDE = {60, 61, 62, 63, 64, 65, 66, 67}


@dataclass(frozen=True)
class GvGemeinde:
    ars: str
    ags: str
    name: str
    tkz: int | None
    flaeche_ha: int | None
    ew: int | None


@dataclass(frozen=True)
class Gemeindeverzeichnis:
    stand: date
    gemeinden: dict[str, GvGemeinde]


def _zahl(feld: str, was: str, zeile: int) -> int | None:
    s = feld.strip()
    if not s:
        return None
    if not s.isdigit():
        raise ValueError(f"GV100AD Zeile {zeile}: {was} ist keine Zahl: {feld!r}")
    return int(s)


def _text(pfad: Path) -> str:
    roh = pfad.read_bytes()
    try:
        return roh.decode("utf-8")
    except UnicodeDecodeError:
        # Ältere Ausgaben: Windows-1252. Fixe Positionen zählen Zeichen, nicht Bytes.
        return roh.decode("cp1252")


def parse(text: str) -> Gemeindeverzeichnis:
    staende: set[date] = set()
    gemeinden: dict[str, GvGemeinde] = {}
    for nr, roh in enumerate(text.splitlines(), start=1):
        zeile = roh.rstrip("\r\n")
        if not zeile.strip():
            continue
        satzart = zeile[0:2]
        if satzart not in SATZARTEN:
            raise ValueError(f"GV100AD Zeile {nr}: unbekannte Satzart {satzart!r}")
        try:
            staende.add(datetime.strptime(zeile[2:10], "%Y%m%d").date())
        except ValueError as e:
            raise ValueError(f"GV100AD Zeile {nr}: Gebietsstand {zeile[2:10]!r} ungültig") from e
        if satzart != "60":
            continue
        if len(zeile) < 72:
            raise ValueError(f"GV100AD Zeile {nr}: Gemeindesatz zu kurz ({len(zeile)} Zeichen)")
        # Feste Satzlänge; abgeschnittene Leerzeichen am Ende wieder auffüllen.
        zeile = zeile.ljust(220)
        ags = zeile[10:18]
        vb = zeile[18:22]
        if not (ags.isdigit() and vb.isdigit()):
            raise ValueError(f"GV100AD Zeile {nr}: Schlüssel {ags!r}/{vb!r} nicht numerisch")
        tkz = _zahl(zeile[122:124], "Textkennzeichen", nr)
        if tkz is not None and tkz not in TEXTKENNZEICHEN_GEMEINDE:
            raise ValueError(f"GV100AD Zeile {nr}: Textkennzeichen {tkz} unbekannt")
        ars = ags[:5] + vb + ags[5:]
        if ars in gemeinden:
            raise ValueError(f"GV100AD Zeile {nr}: ARS {ars} doppelt")
        gemeinden[ars] = GvGemeinde(
            ars=ars,
            ags=ags,
            name=zeile[22:72].strip(),
            tkz=tkz,
            flaeche_ha=_zahl(zeile[128:139], "Fläche", nr),
            ew=_zahl(zeile[139:150], "Bevölkerung", nr),
        )
    if not gemeinden:
        raise ValueError("GV100AD: keine Gemeindesätze (Satzart 60) gefunden")
    if len(staende) != 1:
        raise ValueError(f"GV100AD: mehrere Gebietsstände {sorted(staende)}")
    return Gemeindeverzeichnis(stand=staende.pop(), gemeinden=gemeinden)


def lese(pfad: Path) -> Gemeindeverzeichnis:
    return parse(_text(pfad))


def zeile_gemeinde(
    *,
    stand: str,
    ags: str,
    vb: str,
    name: str,
    tkz: int | None,
    ew: int | None,
    flaeche_ha: int | None = None,
) -> str:
    """Baut einen Gemeindesatz (Satzart 60) – für Tests und Fixtures."""
    z = [" "] * 190

    def setze(start: int, wert: str) -> None:
        z[start : start + len(wert)] = list(wert)

    setze(0, "60")
    setze(2, stand)
    setze(10, ags)
    setze(18, vb)
    setze(22, name[:50].ljust(50))
    if tkz is not None:
        setze(122, f"{tkz:02d}")
    if flaeche_ha is not None:
        setze(128, f"{flaeche_ha:11d}")
    if ew is not None:
        setze(139, f"{ew:11d}")
    return "".join(z)
