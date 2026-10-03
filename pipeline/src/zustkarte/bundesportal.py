"""Bundesportal: zuständige Stellen mit Kontakt je Gemeinde (Leistung aus sources.yaml → dienste).

Die Länder pflegen im Portalverbund je Leistung und Gemeinde, welche Stelle zuständig ist – mit
Anschrift, Telefon und E-Mail. Für „Aufstellung von Verkehrszeichen anregen" gibt es Stand 10/2026
Einträge für BB, BY, MV, NI, NW, RP, SH, ST und TH.

Die API ist nicht dokumentiert, deshalb vorsichtig:
- je Gemeinde eine Anfrage, gedrosselt (`pause`), mit Cache unter data/raw/bundesportal/<LAND>/;
  ein abgebrochener Abruf setzt beim nächsten Mal fort;
- die Antwort wird roh abgelegt und erst beim Lesen normalisiert (`stellen_aus`);
- Kontaktpersonen werden nie übernommen (Datenschutz).
"""

from __future__ import annotations

import json
import re
import time
from collections import Counter, defaultdict
from datetime import UTC, datetime
from pathlib import Path
from typing import Any
from urllib.parse import urlparse

from zustkarte.config import get_paths, load_yaml

USER_AGENT = "wer-ist-zustaendig-pipeline (+https://github.com/vizsim/wer-ist-zustaendig)"
VERSUCHE = 3

# Auswahl der einen Stelle je Gemeinde (`waehle`): Verkehr im Namen zählt am meisten, fremde
# Fachbereiche (Gewerbe, Fahrerlaubnis …) scheiden aus – außer „Verkehr" oder „Ordnung" steht
# mit im Namen („Gewerbe und Verkehr").
VERKEHR = re.compile(r"verkehr", re.I)
BEHOERDE = re.compile(r"verkehrsbeh(ö|oe)rde|verkehrsamt", re.I)  # auch Straßenverkehrsamt
ORDNUNG = re.compile(r"ordnung", re.I)
FREMD = re.compile(
    r"fahrerlaubnis|f(ü|ue)hrerschein|zulassung|gewerbe|beitr(ag|ä|ae)|sport|standesamt|"
    r"meldebeh(ö|oe)rde|b(ü|ue)rgerb(ü|ue)ro|b(ü|ue)rgerdienst",
    re.I,
)
# Stelle der Kreisebene bzw. einer Gemeinde (Name oder Adresse), für den Abgleich mit der Stelle,
# die unsere Regeln nennen.
KREISEBENE = re.compile(r"landrats?amt|landkreis|kreisverwaltung|kreis\b|kreis-|lk-|lra", re.I)
GEMEINDEEBENE = re.compile(
    r"^(stadtverwaltung|stadt|gemeinde|landgemeinde|verwaltungsgemeinschaft|vg|markt|amt|"
    r"samtgemeinde|verbandsgemeinde|gro(ß|ss)e kreisstadt|gro(ß|ss)e kreisangeh(ö|oe)rige stadt)\b",
    re.I,
)
# E-Mail-Adressen nur als Funktionspostfach; Adressen mit Personennamen („k.gorski@",
# „grassl@") bleiben weg, kurze Kürzel („vka@", „kfz@") gelten als Postfach.
FUNKTIONSPOSTFACH = re.compile(
    r"post|info|verwaltung|verkehr|stra(ß|ss)e|ordnung|amt|b(ü|ue)rger|service|kontakt|stadt|"
    r"gemeinde|rathaus|lra|kreis|mail|office|zentrale|fachdienst|fachbereich|sekretariat|"
    r"tiefbau|bau|infrastruktur|sicherheit|kfz|aufsicht|abteilung|referat|organisation|kanzlei|"
    r"^fd|^sg|^vg",
    re.I,
)
ALLGEMEIN = {"kreis", "land", "landkreis", "stadt", "an", "am", "der", "im", "in", "bei", "und"}
# Ein Landratsamt, das die Stelle ausdrücklich nennt („Landratsamt Neustadt a.d.Waldnaab").
EXPLIZIT = re.compile(r"(landrats?amt|landkreis|kreisverwaltung)\s+\S", re.I)
# Wie im Browser (js/ansicht.js): keine Zeichen, mit denen sich ein mailto: erweitern ließe.
EMAIL = re.compile(r"^[^\s@<>\"'?&]+@[^\s@<>\"'?&]+\.[A-Za-z]{2,}$")
# Webadressen sozialer Netzwerke sind keine Kontaktseite der Behörde.
SOZIALE_NETZE = (
    "instagram.com", "facebook.com", "fb.com", "fb.me", "twitter.com", "x.com", "youtube.com",
    "youtu.be", "linkedin.com", "tiktok.com", "xing.com", "threads.net", "whatsapp.com", "wa.me",
    "t.me", "bsky.app", "mastodon.social", "flickr.com", "pinterest.com",
)  # fmt: skip


def dienst() -> dict[str, Any]:
    return load_yaml("sources.yaml")["dienste"]["bundesportal"]


def cache_ordner(land: str) -> Path:
    return get_paths().raw_quelle("bundesportal") / land.upper()


def herausgeber_aus(antwort: dict[str, Any]) -> dict[str, str]:
    """Länderliste der Leistung → {Länderkürzel: Herausgeber-Id}."""
    ids: dict[str, str] = {}
    for link in antwort.get("gebietsliste", {}).get("links", []):
        m = re.search(r"/zustaendigkeiten/\d+/([A-Z]{2})/([^/]+)/", link.get("url", ""))
        if m:
            ids[m[1]] = m[2]
    return ids


def webseite(adresse: str) -> bool:
    """http(s)-Adresse, die nicht zu einem sozialen Netzwerk gehört."""
    if not adresse.lower().startswith(("https://", "http://")):
        return False
    host = (urlparse(adresse).hostname or "").lower()
    return bool(host) and not any(host == d or host.endswith(f".{d}") for d in SOZIALE_NETZE)


def _rang(text: str) -> int:
    """Reihenfolge für Nummern und Postfächer: Verkehr vor Ordnung vor Allgemeinem; Termine
    (Parkausweise) danach; fremde Fachbereiche (Zulassung, Fahrerlaubnis …) zuletzt."""
    if FREMD.search(text) and not VERKEHR.search(text):
        return 4
    if VERKEHR.search(text):
        return 1 if re.search(r"termin|park", text, re.I) else 0
    return 2 if ORDNUNG.search(text) else 3


def telefone(roh: list[str]) -> list[str]:
    """`kontaktTelefon` mischt Nummern und Beschriftungen; eine Beschriftung gehört zur Nummer
    davor („03631 911-6303", „Straßenverkehr"). Ergebnis: nur Nummern, nach `_rang` der
    Beschriftung – ohne Beschriftung nach Ordnung, vor fremden Fachbereichen."""
    paare: list[list[str]] = []
    for t in (str(x).strip() for x in roh):
        if re.match(r"^(\+|0)\d{5,}", re.sub(r"[^\d+]", "", t)):
            paare.append([t, ""])
        elif t and paare:
            paare[-1][1] = f"{paare[-1][1]} {t}".strip()
    return [n for n, b in sorted(paare, key=lambda p: _rang(p[1]) if p[1] else 3)]


def stellen_aus(antwort: dict[str, Any] | None) -> list[dict[str, Any]]:
    """Antwort der Kontakt-API → Stellen mit Name, Anschrift, Telefon, E-Mail, Web (entdoppelt).

    `kontaktWeb` mischt Webseiten und E-Mail-Adressen; Kontaktpersonen bleiben bewusst weg.
    """
    stellen: list[dict[str, Any]] = []
    gesehen: set[str] = set()
    for c in ((antwort or {}).get("accordion-contact") or {}).get("contacts") or []:
        if c.get("disabled"):
            continue
        werte = [str(w.get("value") or "").strip() for w in c.get("kontaktWeb") or []]
        anschriften = c.get("anschrift") or []
        haus = [a.get("adresse") for a in anschriften if a.get("typ") == "Hausanschrift"]
        alle = [a.get("adresse") for a in anschriften]
        stelle = {
            "name": str(c.get("name") or "").strip(),
            "adresse": next((a for a in haus + alle if a), None),
            "telefon": telefone(c.get("kontaktTelefon") or []),
            "email": sorted(
                (w for w in werte if EMAIL.match(w) and not w.lower().startswith("http")),
                key=lambda m: _rang(m.split("@")[0]),
            ),
            "web": [w for w in werte if webseite(w)],
        }
        schluessel = json.dumps(stelle, ensure_ascii=False, sort_keys=True)
        if stelle["name"] and schluessel not in gesehen:
            gesehen.add(schluessel)
            stellen.append(stelle)
    return stellen


def funktionspostfach(email: str) -> bool:
    lokal = email.split("@", 1)[0]
    if FUNKTIONSPOSTFACH.search(lokal):
        return True
    return not re.search(r"[._-]", lokal) and len(lokal) <= 4


def punkte(stelle: dict[str, Any]) -> int:
    """Wie gut passt eine Stelle als Kontakt für Schilder und Tempolimits? < 0: gar nicht."""
    name, mails = stelle["name"], " ".join(stelle["email"])
    p = 0
    if VERKEHR.search(name):
        p += 4
    if BEHOERDE.search(name):
        p += 2
    if VERKEHR.search(mails):
        p += 2
    if ORDNUNG.search(name) or ORDNUNG.search(mails):
        p += 1
    # „Gewerbe und Verkehr", „Standesamt, Amt für öffentliche Ordnung": der Teil zählt.
    if (FREMD.search(name) or FREMD.search(mails)) and not (
        VERKEHR.search(name) or ORDNUNG.search(name)
    ):
        p -= 10
    return p + bool(stelle["email"]) + bool(stelle["telefon"])


def _norm(s: str) -> str:
    s = s.lower()
    for a, b in (("ä", "ae"), ("ö", "oe"), ("ü", "ue"), ("ß", "ss")):
        s = s.replace(a, b)
    return s


def _woerter(gen: str) -> list[str]:
    """Kennwörter eines Kreis- oder Stadtnamens: „Saale-Orla-Kreis" → [saale, orla]."""
    teile = [re.sub(r"kreis$", "", t) for t in re.split(r"[-\s/().]+", _norm(gen))]
    return [t for t in teile if len(t) > 2 and t not in ALLGEMEIN] or [_norm(gen)]


def unsere_stelle(stelle: dict[str, Any], gemeinde: dict[str, Any]) -> bool:
    """Gehört die Stelle zur Behörde der Phase-1-Regel: Kreis bzw. kreisfreie Stadt?"""
    text = _norm(" ".join([stelle["name"], *stelle["email"], *stelle["web"]]))
    kreis = gemeinde["kreis"]
    if kreis.get("kreisfrei"):
        return all(w in text for w in _woerter(kreis["gen"]))
    if GEMEINDEEBENE.search(stelle["name"]):
        return False
    name = _norm(stelle["name"])
    if EXPLIZIT.search(name):  # ein bestimmtes Landratsamt – dann muss es unseres sein
        return any(w in name for w in _woerter(kreis["gen"]))
    return bool(KREISEBENE.search(text)) or all(w in text for w in _woerter(kreis["gen"]))


def ist_stvb(stelle: dict[str, Any]) -> bool:
    """Nennt sich die Stelle ausdrücklich Straßenverkehrsbehörde bzw. Verkehrsamt?"""
    return bool(BEHOERDE.search(stelle["name"]) or BEHOERDE.search(" ".join(stelle["email"])))


def eigene_stelle(stelle: dict[str, Any], gemeinde: dict[str, Any]) -> bool:
    """Stelle der Gemeinde selbst oder ihres Verbands (Rathaus, Verwaltungsgemeinschaft, Amt)?"""
    name = _norm(stelle["name"])
    if KREISEBENE.search(name):
        return False
    namen = [gemeinde["gen"]] + ([gemeinde["verband"]["gen"]] if gemeinde.get("verband") else [])
    return any(all(w in name for w in _woerter(n)) for n in namen if n)


def _kandidaten(stellen: list[dict[str, Any]], *, fremde: bool = False) -> list[dict[str, Any]]:
    """Ohne persönliche E-Mail-Adressen; nur Stellen mit Kontaktweg und (außer mit `fremde`)
    ohne fremden Fachbereich."""
    kandidaten = []
    for s in stellen:
        s = {**s, "email": [m for m in s["email"] if funktionspostfach(m)]}
        if (s["telefon"] or s["email"] or s["web"]) and (fremde or punkte(s) >= 0):
            kandidaten.append(s)
    return kandidaten


def _beste(stellen: list[dict[str, Any]]) -> dict[str, Any] | None:
    return sorted(stellen, key=lambda s: (-punkte(s), s["name"]))[0] if stellen else None


def waehle_gemeinde(
    stellen: list[dict[str, Any]], gemeinde: dict[str, Any]
) -> dict[str, Any] | None:
    """Die Stelle der Gemeinde selbst (Rathaus, Verwaltungsgemeinschaft), falls das Portal eine
    nennt; bei mehreren die beste nach `punkte`, dann nach Name.

    Kleine Verwaltungen hängen die Leistung oft an einen allgemeinen Fachbereich (Bürgerbüro,
    Standesamt, Kämmerei). Nennt das Portal für die Gemeinde nur so einen, ist er trotzdem ihr
    Kontakt für die Leistung – dann ohne den Namen des Fachbereichs, der nur verwirren würde.
    """
    s = _beste([s for s in _kandidaten(stellen) if eigene_stelle(s, gemeinde)])
    if s:
        return s
    s = _beste([s for s in _kandidaten(stellen, fremde=True) if eigene_stelle(s, gemeinde)])
    return {**s, "name": s["name"].split(" - ", 1)[0].strip()} if s else None


def waehle_kreis(stellen: list[dict[str, Any]], gemeinde: dict[str, Any]) -> dict[str, Any] | None:
    """Die Stelle der Kreisebene (Landratsamt bzw. kreisfreie Stadt), wenn das Portal eine nennt."""
    return _beste([s for s in _kandidaten(stellen) if unsere_stelle(s, gemeinde)])


def _ziffern(telefon: list[str]) -> set[str]:
    return {re.sub(r"\D", "", t).removeprefix("49").lstrip("0") for t in telefon}


def waehle(
    stellen: list[dict[str, Any]], gemeinde: dict[str, Any]
) -> tuple[dict[str, Any] | None, str]:
    """Genau eine Stelle als Kontakt → (Stelle oder None, Wahl).

    Persönliche E-Mail-Adressen fallen weg; Stellen ohne Telefon, E-Mail und Web und fremde
    Fachbereiche scheiden aus. Infrage kommen nur Stellen der Behörde, die unsere Regel nennt,
    oder solche, die sich ausdrücklich Straßenverkehrsbehörde nennen. Von ihnen gewinnt die mit
    den meisten `punkte`n.

    Wahl: `passt` (Stelle unserer Behörde), `stvb` (andere Stelle, die sich Straßenverkehrs-
    behörde nennt, meist die Stadt selbst), `mehrdeutig` (gleich gute Stellen verschiedener
    Behörden), `fremd` (nur andere Stellen, etwa ein Ordnungsamt), `keine`. Nur `passt` und
    `stvb` liefern eine Stelle. Gleich gute Stellen derselben Behörde (zwei Standorte eines
    Landratsamts) sind nicht mehrdeutig; dann gilt die erste nach Namen.

    Die Wahl geht als `bundesportal` in die Regeln (js/resolve.js); die Kontakte je Rolle wählen
    `waehle_kreis` und `waehle_gemeinde`.
    """
    kandidaten = _kandidaten(stellen)
    if not kandidaten:
        return None, "keine"
    geeignet = [s for s in kandidaten if unsere_stelle(s, gemeinde) or ist_stvb(s)]
    if not geeignet:
        return None, "fremd"
    beste = max(punkte(s) for s in geeignet)
    oben = sorted((s for s in geeignet if punkte(s) == beste), key=lambda s: s["name"])
    gleiche_nummer = all(_ziffern(s["telefon"]) & _ziffern(oben[0]["telefon"]) for s in oben)
    eine_behoerde = all(unsere_stelle(s, gemeinde) for s in oben)
    if not (gleiche_nummer or eine_behoerde):
        return None, "mehrdeutig"
    s = oben[0]
    return s, "passt" if unsere_stelle(s, gemeinde) else "stvb"


def _hole(session: Any, url: str) -> dict[str, Any]:
    """Eine Anfrage mit Wiederholung bei Netz- und Serverfehlern; Ergebnis samt Status."""
    import requests

    for versuch in range(1, VERSUCHE + 1):
        try:
            r = session.get(url, timeout=30)
        except requests.RequestException as e:
            if versuch == VERSUCHE:
                return {"status": None, "fehler": str(e), "antwort": None}
            time.sleep(2**versuch)
            continue
        if r.status_code >= 500 and versuch < VERSUCHE:
            time.sleep(2**versuch)
            continue
        try:
            antwort = r.json()
        except ValueError:
            return {"status": r.status_code, "fehler": "keine JSON-Antwort", "antwort": None}
        return {"status": r.status_code, "fehler": None, "antwort": antwort}
    raise AssertionError("unerreichbar")


def _session() -> Any:
    import requests

    session = requests.Session()
    session.headers.update({"User-Agent": USER_AGENT, "Accept": "application/json"})
    return session


def herausgeber(session: Any = None) -> dict[str, str]:
    """Länder mit Einträgen für die Leistung → {Länderkürzel: Herausgeber-Id} (eine Anfrage)."""
    d = dienst()
    antwort = _hole(session or _session(), d["laender_url"].format(leistung=d["leistung"]))
    return herausgeber_aus(antwort["antwort"] or {})


def abrufen(land: str, gemeinden: list[str], *, force: bool = False, melde=print) -> Path:
    """Kontakte aller `gemeinden` (ARS) eines Landes in den Cache holen."""
    d = dienst()
    land = land.upper()
    session = _session()
    ordner = cache_ordner(land)
    ordner.mkdir(parents=True, exist_ok=True)

    ids = herausgeber(session)
    if land not in ids:
        raise RuntimeError(
            f"{land}: im Bundesportal keine Zuständigkeiten für Leistung {d['leistung']} "
            f"(vorhanden: {', '.join(sorted(ids)) or 'keine'})"
        )
    (ordner / "_herausgeber.json").write_text(
        json.dumps({"abgerufen": _jetzt(), "ids": ids}, ensure_ascii=False, indent=1) + "\n",
        encoding="utf-8",
    )

    offen = [a for a in gemeinden if force or not (ordner / f"{a}.json").exists()]
    melde(f"{land}: {len(gemeinden)} Gemeinden, {len(offen)} abzurufen (Herausgeber {ids[land]})")
    for i, ars in enumerate(offen, start=1):
        url = d["kontakt_url"].format(land=land, id=ids[land], ars=ars)
        ergebnis = _hole(session, url)
        eintrag = {"ars": ars, "url": url, "abgerufen": _jetzt(), **ergebnis}
        (ordner / f"{ars}.json").write_text(
            json.dumps(eintrag, ensure_ascii=False) + "\n", encoding="utf-8"
        )
        if i % 50 == 0 or i == len(offen):
            melde(f"  {i}/{len(offen)}")
        time.sleep(float(d.get("pause", 1.0)))
    return ordner


def lies_cache(land: str) -> dict[str, dict[str, Any]]:
    """ARS → Cache-Eintrag (roh) eines Landes."""
    return {
        p.stem: json.loads(p.read_text(encoding="utf-8"))
        for p in sorted(cache_ordner(land).glob("[0-9]*.json"))
    }


def laender_im_cache() -> list[str]:
    basis = get_paths().raw_quelle("bundesportal")
    return sorted(p.name for p in basis.glob("[A-Z][A-Z]") if (p / "_herausgeber.json").exists())


def freigegeben() -> list[str]:
    """Länder, deren Kontakte in die Landesdateien gehen (sources.yaml)."""
    return list(dienst().get("freigegeben") or [])


def ergaenzungen() -> dict[str, dict[str, Any]]:
    """Kontakte von Hand (config/kontakte_ergaenzt.yaml); Schlüssel Kreis-ARS (5) oder ARS (12)."""
    return load_yaml("kontakte_ergaenzt.yaml").get("kontakte") or {}


def _von_hand(eintrag: dict[str, Any]) -> dict[str, Any]:
    datum = ".".join(reversed(str(eintrag["stand"]).split("-")))
    return {
        "name": eintrag["name"],
        "adresse": eintrag.get("adresse"),
        "telefon": list(eintrag.get("telefon") or []),
        "email": list(eintrag.get("email") or []),
        "web": list(eintrag.get("web") or []),
        "quelle": f"Webseite der Behörde, Stand {datum}",
    }


def luecken_fuellen(gemeinden: dict[str, Any], attr: dict[str, Any], land: str) -> None:
    """Kontakte je Rolle (`kreis`, `gemeinde`) ergänzen:
    - Einträge von Hand mit ARS einer Gemeinde (12 Stellen) und `rolle` ersetzen den Portalwert;
    - ein fehlender Kreiskontakt kommt von Hand (Kreis-ARS, 5 Stellen) oder ist der Kreiskontakt,
      den das Portal für die übrigen Gemeinden des Kreises nennt.
    """
    von_hand = ergaenzungen()
    je_kreis: dict[str, Counter] = defaultdict(Counter)
    for ars, e in gemeinden.items():
        g = attr[ars]
        if g["land"] == land and e["kreis"] and not g["kreis"].get("kreisfrei"):
            schluessel = json.dumps(e["kreis"], ensure_ascii=False, sort_keys=True)
            je_kreis[g["kreis"]["ars"]][schluessel] += 1
    for ars, e in gemeinden.items():
        g = attr[ars]
        if g["land"] != land:
            continue
        hand = von_hand.get(ars)
        if hand:
            e[hand.get("rolle", "kreis")] = _von_hand(hand)
        if e["kreis"] is None:
            if ars[:5] in von_hand:
                e["kreis"] = _von_hand(von_hand[ars[:5]])
            elif je_kreis.get(g["kreis"]["ars"]):
                e["kreis"] = json.loads(je_kreis[g["kreis"]["ars"]].most_common(1)[0][0])


REVIEW_KOPF = [
    "land",
    "ars",
    "gemeinde",
    "kreis",
    "wahl",
    "stellen",
    "kreis_kontakt",
    "kreis_telefon",
    "kreis_email",
    "gemeinde_kontakt",
    "gemeinde_telefon",
    "alle_stellen",
]


def tabelle(
    attr: dict[str, Any], laender: list[str] | None = None
) -> tuple[dict[str, Any], list[list[str]]]:
    """Cache + Gemeindetabelle → (kontakte.json, Review-Zeilen) für die freigegebenen Länder.

    Je Gemeinde: das Urteil des Portals (`waehle` → `wahl`, für die Regeln), der Kontakt der
    Kreisebene (`waehle_kreis`) und der Gemeinde selbst (`waehle_gemeinde`), danach
    `luecken_fuellen`. Kondominium-Flächen übernehmen die Kreisstelle der angrenzenden Gemeinde.
    """
    d = dienst()
    laender = freigegeben() if laender is None else laender
    meta: dict[str, Any] = {}
    gemeinden: dict[str, Any] = {}
    review: list[list[str]] = []
    for land in [x for x in laender_im_cache() if x in laender]:
        cache = lies_cache(land)
        if not cache:
            continue
        ids = json.loads((cache_ordner(land) / "_herausgeber.json").read_text(encoding="utf-8"))
        hid = ids["ids"][land]
        meta[land] = {
            "herausgeber": hid,
            "abgerufen": max(e["abgerufen"] for e in cache.values())[:10],
            "region_url": f"{d['seite']}/herausgeber/{land}-{hid}/region/{{ars}}",
        }
        stellen_je: dict[str, list[dict[str, Any]]] = {}
        for ars, g in sorted(attr.items()):
            if g["land"] != land:
                continue
            e = cache.get((g.get("kondominium") or {}).get("nachbar") or ars)
            if e is None:
                continue
            stellen = stellen_je[ars] = stellen_aus(e["antwort"])
            _, wahl = waehle(stellen, g)
            gemeinden[ars] = {
                "wahl": wahl,
                "stellen": len(stellen),
                "kreis": waehle_kreis(stellen, g),
                "gemeinde": None if g.get("kondominium") else waehle_gemeinde(stellen, g),
            }
        luecken_fuellen(gemeinden, attr, land)
        for ars, stellen in stellen_je.items():
            g, e = attr[ars], gemeinden[ars]
            k = e["kreis"] or {"name": "", "telefon": [], "email": []}
            gm = e["gemeinde"] or {"name": "", "telefon": []}
            review.append(
                [
                    land,
                    ars,
                    g["name"],
                    g["kreis"]["name"],
                    e["wahl"],
                    str(len(stellen)),
                    k["name"],
                    " / ".join(k["telefon"]),
                    " / ".join(k["email"]),
                    gm["name"],
                    " / ".join(gm["telefon"]),
                    " | ".join(f"{s['name']} ({punkte(s)})" for s in stellen),
                ]
            )
    daten = {
        "schema": 1,
        "meta": {
            "quelle": {
                "id": "bundesportal",
                "label": d["label"],
                "lizenz": d["lizenz"],
                "vermerk": d["vermerk"],
            },
            "leistung": d["leistung"],
            "laender": meta,
        },
        "gemeinden": gemeinden,
    }
    return daten, review


def schreibe(daten: dict[str, Any], review: list[list[str]], pfad: Path, review_pfad: Path) -> None:
    pfad.parent.mkdir(parents=True, exist_ok=True)
    pfad.write_text(json.dumps(daten, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
    review_pfad.parent.mkdir(parents=True, exist_ok=True)

    def zelle(v: str) -> str:
        return f'"{v.replace(chr(34), chr(34) * 2)}"' if re.search(r'[;"\n]', v) else v

    zeilen = [";".join(zelle(v) for v in z) for z in [REVIEW_KOPF, *review]]
    review_pfad.write_text("﻿" + "\n".join(zeilen) + "\n", encoding="utf-8")


def _jetzt() -> str:
    return datetime.now(UTC).isoformat(timespec="seconds")
