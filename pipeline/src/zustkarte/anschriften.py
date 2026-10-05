"""Anschriften der Verwaltungen für Länder ohne Bundesportal-Eintrag – heute Sachsen.

Das Gemeindeverzeichnis der Landesdirektion Sachsen (Quelle `lds_sachsen`, von Hand geladen mit
`zust fetch lds_sachsen --datei …`) nennt je Gemeinde und Landkreis Anschrift, Telefon, E-Mail und
Webseite der Verwaltung: das Rathaus bzw. das Landratsamt, nicht die Straßenverkehrsbehörde. Die
Kontakte tragen deshalb `allgemein`; die Karte sagt dazu, dass man dort nach der
Straßenverkehrsbehörde fragen muss. Bürgermeister werden nie übernommen, E-Mail-Adressen nur als
Funktionspostfach.

Rollen wie beim Bundesportal (`bundesportal.tabelle`):
- `kreis`: das Landratsamt (Zeile mit dem Kreisschlüssel) bzw. die kreisfreie Stadt;
- `gemeinde`: die Gemeinde selbst; in einer Verwaltungsgemeinschaft bzw. einem Verwaltungsverband
  die Verwaltung an dessen Sitz (`verband.sitz`, bei der Gemeinschaft die erfüllende Gemeinde),
  wenn der Sitz zum Verband gehört.
Einträge von Hand (`config/kontakte_ergaenzt.yaml`) gehen vor.
"""

from __future__ import annotations

import csv
import json
import re
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

from zustkarte import bundesportal
from zustkarte.config import get_paths, quellen

SACHSEN = "lds_sachsen"
# Postfächer, die weder ein Stichwort aus `bundesportal.FUNKTIONSPOSTFACH` tragen noch nach der
# Gemeinde heißen, aber keine Person meinen.
POSTFAECHER = {"briefkasten", "buero"}


def lies_sachsen(pfad: Path) -> dict[str, dict[str, str]]:
    """CSV der Landesdirektion → SCHLNR (AGS mit 8 Stellen, Landkreis mit 5) → Zeile."""
    with pfad.open(encoding="utf-8-sig", newline="") as fh:
        return {
            r["SCHLNR"].strip(): {k: (v or "").strip() for k, v in r.items() if k}
            for r in csv.DictReader(fh, delimiter=";")
        }


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


def kontakt(zeile: dict[str, str], name: str, gen: str) -> dict[str, Any]:
    """Zeile der CSV → Kontakt wie aus dem Bundesportal, mit `allgemein`. Fax, Postfach und die
    Spalten zum Bürgermeister bleiben weg."""
    email = zeile["E_MAIL"]
    web = webadresse(zeile["HOMEPAGE"])
    ort = " ".join(x for x in (zeile["PLZ"], zeile["ORT"]) if x)
    return {
        "name": name,
        "adresse": ", ".join(x for x in (zeile["STRASSE"], ort) if x) or None,
        "telefon": [f"{zeile['OKZ']} {zeile['TELEFON']}".strip()] if zeile["TELEFON"] else [],
        "email": [email] if bundesportal.EMAIL.match(email) and postfach(email, gen) else [],
        "web": [web] if web else [],
        "allgemein": True,
    }


def sachsen(attr: dict[str, Any], zeilen: dict[str, dict[str, str]]) -> dict[str, dict[str, Any]]:
    """Gemeindetabelle + CSV → ARS → {wahl, stellen, kreis, gemeinde} für jede Gemeinde in Sachsen.

    Fehlt eine Zeile, bleibt die Rolle leer (`None`)."""

    def aus(ags: str | None, name: str, gen: str) -> dict[str, Any] | None:
        zeile = zeilen.get(ags or "")
        return kontakt(zeile, name, gen) if zeile else None

    gemeinden: dict[str, dict[str, Any]] = {}
    for ars, g in sorted(attr.items()):
        if g["land"] != "SN":
            continue
        k = g["kreis"]
        if k.get("kreisfrei"):
            kreis = aus(g["ags"], g["name"], g["gen"])
        else:
            kreis = aus(k["ars"], f"Landratsamt {k['gen']}", k["gen"])
        ort = g
        verband = g.get("verband")
        sitz = attr.get((verband or {}).get("sitz") or "")
        if sitz and (sitz.get("verband") or {}).get("ars") == verband["ars"]:
            ort = sitz
        gemeinden[ars] = {
            "wahl": None,
            "stellen": 0,
            "kreis": kreis,
            "gemeinde": aus(ort["ags"], ort["name"], ort["gen"]),
        }
    return gemeinden


def _abgerufen(pfad: Path) -> str:
    """Abrufdatum aus <datei>.meta.json (`zust fetch`), sonst die Änderungszeit der Datei."""
    meta = pfad.with_name(pfad.name + ".meta.json")
    if meta.exists():
        return json.loads(meta.read_text(encoding="utf-8"))["abgerufen"][:10]
    return datetime.fromtimestamp(pfad.stat().st_mtime, UTC).date().isoformat()


def ergaenze(daten: dict[str, Any], review: list[list[str]], attr: dict[str, Any]) -> int:
    """Kontakte für Sachsen in `daten` (kontakte.json) und `review` eintragen, wenn die CSV der
    Landesdirektion unter data/raw/lds_sachsen/ liegt. Gibt die Zahl der Gemeinden zurück."""
    q = quellen()[SACHSEN]
    pfad = get_paths().raw_quelle(SACHSEN) / q["datei"]
    if not pfad.exists():
        return 0
    gemeinden = sachsen(attr, lies_sachsen(pfad))
    von_hand = bundesportal.ergaenzungen()
    for ars, e in gemeinden.items():
        if ars[:5] in von_hand:
            e["kreis"] = bundesportal.kontakt_von_hand(von_hand[ars[:5]])
        hand = von_hand.get(ars)
        if hand:
            e[hand.get("rolle", "kreis")] = bundesportal.kontakt_von_hand(hand)
    daten["gemeinden"].update(gemeinden)
    quelle = {"id": SACHSEN, "label": q["label"], "lizenz": q["lizenz"], "vermerk": q["vermerk"]}
    daten["meta"]["laender"]["SN"] = {
        "abgerufen": _abgerufen(pfad),
        "kurz": q["kurz"],
        "quelle": quelle,
    }
    leer = {"name": "", "telefon": [], "email": []}
    for ars, e in gemeinden.items():
        g = attr[ars]
        k, gm = e["kreis"] or leer, e["gemeinde"] or leer
        review.append(
            [
                "SN",
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
    return len(gemeinden)
