"""Anschriften der Verwaltungen für Länder ohne Bundesportal-Eintrag – Sachsen, Hessen, Saarland.

Zwei Verzeichnisse nennen je Gemeinde und Kreis die Anschrift der Verwaltung, also das Rathaus bzw.
das Landratsamt, nicht die Straßenverkehrsbehörde:
- das Gemeindeverzeichnis der Landesdirektion Sachsen (Quelle `lds_sachsen`, CSV, von Hand geladen
  mit `zust fetch lds_sachsen --datei …`) mit Telefon, E-Mail und Webseite;
- das Anschriftenverzeichnis der Statistischen Ämter des Bundes und der Länder (Quelle
  `anschriften`, xlsx, `zust fetch anschriften`) für ganz Deutschland, nur mit Anschrift und
  E-Mail; genutzt für die Länder unter `laender` in sources.yaml.
Die Kontakte tragen deshalb `allgemein`; die Karte sagt dazu, dass man dort nach der
Straßenverkehrsbehörde fragen muss. Bürgermeister werden nie übernommen, E-Mail-Adressen nur als
Funktionspostfach.

Rollen wie beim Bundesportal (`bundesportal.tabelle`):
- `kreis`: das Landratsamt bzw. die Kreisverwaltung (Zeile mit dem Kreisschlüssel) oder die
  kreisfreie Stadt;
- `gemeinde`: die Gemeinde selbst; in einer Verwaltungsgemeinschaft bzw. einem Verwaltungsverband
  die Verwaltung an dessen Sitz (`verband.sitz`, bei der Gemeinschaft die erfüllende Gemeinde),
  wenn der Sitz zum Verband gehört.
Einträge von Hand (`config/kontakte_ergaenzt.yaml`) gehen vor.
"""

from __future__ import annotations

import csv
import json
import re
from collections.abc import Callable
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

from zustkarte import bundesportal
from zustkarte.config import get_paths, quellen
from zustkarte.fetch import dateiname

SACHSEN = "lds_sachsen"
VERZEICHNIS = "anschriften"
# Postfächer, die weder ein Stichwort aus `bundesportal.FUNKTIONSPOSTFACH` tragen noch nach der
# Gemeinde heißen, aber keine Person meinen („magistrat@" ist in Hessen der Gemeindevorstand).
POSTFAECHER = {"briefkasten", "buero", "magistrat", "marktflecken", "vorzimmer"}
# Spalten im Blatt „Anschriften_…" des Anschriftenverzeichnisses, in dieser Reihenfolge.
SPALTEN = (
    "land", "landname", "satzart", "tkz", "tkzname", "ars", "ags", "name", "sitz", "strasse", "plz",
    "ort", "email",
)  # fmt: skip

Zeilen = dict[str, dict[str, str]]


def lies_sachsen(pfad: Path) -> Zeilen:
    """CSV der Landesdirektion → SCHLNR (AGS mit 8 Stellen, Landkreis mit 5) → Zeile."""
    with pfad.open(encoding="utf-8-sig", newline="") as fh:
        return {
            r["SCHLNR"].strip(): {k: (v or "").strip() for k, v in r.items() if k}
            for r in csv.DictReader(fh, delimiter=";")
        }


def lies_verzeichnis(pfad: Path) -> Zeilen:
    """Anschriftenverzeichnis (xlsx, über GDAL) → ARS → Zeile mit den Feldern aus `SPALTEN`, nur
    Kreise, Gemeindeverbände und Gemeinden (Satzart 40, 50, 60). Steht eine Gemeinde zweimal (erst
    der Verband, dann sie selbst), bleibt ihre eigene Anschrift."""
    import pyogrio

    blatt = next(name for name, _ in pyogrio.list_layers(pfad) if name.startswith("Anschriften"))
    df = pyogrio.read_dataframe(
        pfad, layer=blatt, read_geometry=False, HEADERS="DISABLE", FIELD_TYPES="STRING"
    )
    zeilen: Zeilen = {}
    for werte in df.itertuples(index=False):
        felder = (str(w).strip() if isinstance(w, str) else "" for w in werte[: len(SPALTEN)])
        z = dict(zip(SPALTEN, felder, strict=True))
        if re.fullmatch(r"\d{2}", z["land"]) and z["satzart"] in ("40", "50", "60"):
            zeilen[z["ars"]] = z
    return zeilen


def _ascii(text: str) -> str:
    """„Großschweidnitz" → „grossschweidnitz" (nur a–z und Ziffern)."""
    t = text.lower()
    for alt, neu in (("ä", "ae"), ("ö", "oe"), ("ü", "ue"), ("ß", "ss")):
        t = t.replace(alt, neu)
    return re.sub(r"[^a-z0-9]", "", t)


def postfach(email: str, gen: str) -> bool:
    """Funktionspostfach (`bundesportal.funktionspostfach`), ein Postfach aus `POSTFAECHER` oder
    eins, das nach der Gemeinde heißt („koenigswalde@", „gv-jonsdorf@" für Kurort Jonsdorf)."""
    lokal = email.split("@", 1)[0].lower()
    if bundesportal.funktionspostfach(email) or lokal in POSTFAECHER:
        return True
    name, ort = _ascii(re.sub(r"^gv[.-]", "", lokal)), _ascii(gen)
    return len(name) >= 4 and (name in ort or ort in name)


def webadresse(roh: str) -> str | None:
    """Webseite oder None; „http://https://…" wird zu „https://…"."""
    adresse = re.sub(r"^https?://(?=https?://)", "", roh.strip(), flags=re.I)
    return adresse if bundesportal.webseite(adresse) else None


def _anschrift(strasse: str, plz: str, ort: str) -> str | None:
    zeile = " ".join(x for x in (plz, ort) if x)
    return ", ".join(x for x in (strasse, zeile) if x) or None


def _email(email: str, gen: str) -> list[str]:
    return [email] if bundesportal.EMAIL.match(email) and postfach(email, gen) else []


def kontakt(zeile: dict[str, str], name: str, gen: str) -> dict[str, Any]:
    """Zeile der CSV aus Sachsen → Kontakt wie aus dem Bundesportal, mit `allgemein`. Fax, Postfach
    und die Spalten zum Bürgermeister bleiben weg."""
    web = webadresse(zeile["HOMEPAGE"])
    return {
        "name": name,
        "adresse": _anschrift(zeile["STRASSE"], zeile["PLZ"], zeile["ORT"]),
        "telefon": [f"{zeile['OKZ']} {zeile['TELEFON']}".strip()] if zeile["TELEFON"] else [],
        "email": _email(zeile["E_MAIL"], gen),
        "web": [web] if web else [],
        "allgemein": True,
    }


def kontakt_verzeichnis(zeile: dict[str, str], name: str, gen: str) -> dict[str, Any]:
    """Zeile des Anschriftenverzeichnisses → Kontakt mit Anschrift und E-Mail, mit `allgemein`. Der
    Ort ohne Zusatz („Saarbrücken, Landeshauptstadt" → „Saarbrücken")."""
    return {
        "name": name,
        "adresse": _anschrift(zeile["strasse"], zeile["plz"], zeile["ort"].split(",")[0].strip()),
        "telefon": [],
        "email": _email(zeile["email"], gen),
        "web": [],
        "allgemein": True,
    }


def _rollen(
    attr: dict[str, Any],
    land: str,
    zeile_gemeinde: Callable[[dict[str, Any]], dict[str, str] | None],
    zeile_kreis: Callable[[dict[str, Any]], dict[str, str] | None],
    kreisname: Callable[[dict[str, Any]], str],
    kontakt_aus: Callable[[dict[str, str], str, str], dict[str, Any]],
) -> dict[str, dict[str, Any]]:
    """ARS → {wahl, stellen, kreis, gemeinde} für jede Gemeinde des Landes; fehlt eine Zeile, bleibt
    die Rolle leer (`None`)."""

    def aus(zeile: dict[str, str] | None, name: str, gen: str) -> dict[str, Any] | None:
        return kontakt_aus(zeile, name, gen) if zeile else None

    gemeinden: dict[str, dict[str, Any]] = {}
    for ars, g in sorted(attr.items()):
        if g["land"] != land:
            continue
        k = g["kreis"]
        if k.get("kreisfrei"):
            kreis = aus(zeile_kreis(k) or zeile_gemeinde(g), g["name"], g["gen"])
        else:
            kreis = aus(zeile_kreis(k), kreisname(k), k["gen"])
        ort = g
        verband = g.get("verband")
        sitz = attr.get((verband or {}).get("sitz") or "")
        if sitz and (sitz.get("verband") or {}).get("ars") == verband["ars"]:
            ort = sitz
        gemeinden[ars] = {
            "wahl": None,
            "stellen": 0,
            "kreis": kreis,
            "gemeinde": aus(zeile_gemeinde(ort), ort["name"], ort["gen"]),
        }
    return gemeinden


def sachsen(attr: dict[str, Any], zeilen: Zeilen) -> dict[str, dict[str, Any]]:
    """Gemeindetabelle + CSV der Landesdirektion → Kontakte je Gemeinde in Sachsen (nach AGS)."""
    return _rollen(
        attr,
        "SN",
        lambda g: zeilen.get(g["ags"]),
        lambda k: zeilen.get(k["ars"]),
        lambda k: f"Landratsamt {k['gen']}",
        kontakt,
    )


def _praefix(attr: dict[str, Any], land: str) -> str | None:
    """Die beiden ersten ARS-Stellen eines Landes („06" für Hessen), None ohne Gemeinden."""
    return next((ars[:2] for ars, g in attr.items() if g["land"] == land), None)


def verzeichnis(attr: dict[str, Any], zeilen: Zeilen, land: str) -> dict[str, dict[str, Any]]:
    """Gemeindetabelle + Anschriftenverzeichnis → Kontakte je Gemeinde eines Landes (nach ARS).

    Das Verzeichnis hat einen späteren Stichtag als die Gemeindetabelle: Fehlt der ARS (eine Stadt
    wurde kreisfrei und umgeschlüsselt, etwa Hanau 2026), gilt die einzige Gemeinde des Landes mit
    demselben Namen. Namen der Kontakte wie die der Stellen (`kreis.name`, `name`)."""
    praefix = _praefix(attr, land)
    if praefix is None:
        return {}
    je_name: dict[str, list[dict[str, str]]] = {}
    for z in zeilen.values():
        if z["satzart"] == "60" and z["ars"].startswith(praefix):
            je_name.setdefault(z["name"].split(",")[0].strip(), []).append(z)

    def zeile_gemeinde(g: dict[str, Any]) -> dict[str, str] | None:
        if g["ars"] in zeilen:
            return zeilen[g["ars"]]
        gleich = je_name.get(g["gen"], [])
        return gleich[0] if len(gleich) == 1 else None

    return _rollen(
        attr,
        land,
        zeile_gemeinde,
        lambda k: zeilen.get(k["ars"]),
        lambda k: k.get("name") or k["gen"],
        kontakt_verzeichnis,
    )


def _abgerufen(pfad: Path) -> str:
    """Abrufdatum aus <datei>.meta.json (`zust fetch`), sonst die Änderungszeit der Datei."""
    meta = pfad.with_name(pfad.name + ".meta.json")
    if meta.exists():
        return json.loads(meta.read_text(encoding="utf-8"))["abgerufen"][:10]
    return datetime.fromtimestamp(pfad.stat().st_mtime, UTC).date().isoformat()


def _eintragen(
    daten: dict[str, Any],
    review: list[list[str]],
    attr: dict[str, Any],
    land: str,
    gemeinden: dict[str, dict[str, Any]],
    qid: str,
    pfad: Path,
) -> None:
    """Kontakte eines Landes in kontakte.json (`daten`) und die Review-Zeilen übernehmen; Einträge
    von Hand gehen vor."""
    q = quellen()[qid]
    von_hand = bundesportal.ergaenzungen()
    for ars, e in gemeinden.items():
        if ars[:5] in von_hand:
            e["kreis"] = bundesportal.kontakt_von_hand(von_hand[ars[:5]])
        hand = von_hand.get(ars)
        if hand:
            e[hand.get("rolle", "kreis")] = bundesportal.kontakt_von_hand(hand)
    daten["gemeinden"].update(gemeinden)
    quelle = {"id": qid, "label": q["label"], "lizenz": q["lizenz"], "vermerk": q["vermerk"]}
    daten["meta"]["laender"][land] = {
        "abgerufen": _abgerufen(pfad),
        **({"stand": q["stand"]} if q.get("stand") else {}),
        "kurz": q["kurz"],
        "quelle": quelle,
    }
    leer = {"name": "", "telefon": [], "email": []}
    for ars, e in gemeinden.items():
        g = attr[ars]
        k, gm = e["kreis"] or leer, e["gemeinde"] or leer
        review.append(
            [
                land,
                ars,
                g["name"],
                g["kreis"]["name"],
                "",
                "",
                k["name"],
                " / ".join(k["telefon"]),
                " / ".join(k["email"]),
                gm["name"],
                " / ".join(gm["telefon"]),
                q["kurz"],
            ]
        )


def ergaenze(daten: dict[str, Any], review: list[list[str]], attr: dict[str, Any]) -> int:
    """Kontakte aus den Verzeichnissen in `daten` (kontakte.json) und `review` eintragen – für
    Sachsen, wenn die CSV der Landesdirektion unter data/raw/lds_sachsen/ liegt, für die Länder
    unter `laender` der Quelle `anschriften`, wenn deren Datei geladen ist. Gibt die Zahl der
    Gemeinden zurück."""
    n = 0
    q = quellen()[SACHSEN]
    pfad = get_paths().raw_quelle(SACHSEN) / q["datei"]
    if pfad.exists():
        gemeinden = sachsen(attr, lies_sachsen(pfad))
        _eintragen(daten, review, attr, "SN", gemeinden, SACHSEN, pfad)
        n += len(gemeinden)
    q = quellen()[VERZEICHNIS]
    pfad = get_paths().raw_quelle(VERZEICHNIS) / dateiname(q["url"])
    if pfad.exists():
        zeilen = lies_verzeichnis(pfad)
        for land in q.get("laender") or []:
            gemeinden = verzeichnis(attr, zeilen, land)
            if gemeinden:
                _eintragen(daten, review, attr, land, gemeinden, VERZEICHNIS, pfad)
                n += len(gemeinden)
    return n
