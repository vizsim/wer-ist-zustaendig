"""Downloads der Quellen nach data/raw/<id>/ mit Metadaten; ZIPs werden entpackt.

Die Server von BKG und Destatis sind aus manchen Umgebungen (Sandboxen mit Netz-Allowlist) nicht
erreichbar. Dann `zust fetch` auf einem Rechner mit Netz laufen lassen oder die Dateien von Hand
übernehmen (`zust fetch <id> --datei <pfad>`) – die übrigen Schritte lesen nur von dort. Quellen
ohne Download-Link (`datei` statt `url` in sources.yaml) kommen immer so herein.
"""

from __future__ import annotations

import hashlib
import json
import zipfile
from datetime import UTC, datetime
from pathlib import Path
from typing import Any
from urllib.parse import unquote, urlparse

from zustkarte.config import get_paths, quellen

USER_AGENT = "wer-ist-zustaendig-pipeline (+https://github.com/vizsim/wer-ist-zustaendig)"


def dateiname(url: str) -> str:
    """Dateiname aus der URL ohne Query („GV100AD_31122025.zip")."""
    name = unquote(Path(urlparse(url).path).name)
    if not name:
        raise ValueError(f"URL ohne Dateinamen: {url}")
    return name


def entpacke(zip_pfad: Path) -> Path:
    """ZIP nach <ordner>/entpackt/ (einmalig; Pfade außerhalb des Ziels werden abgelehnt)."""
    ziel = zip_pfad.parent / "entpackt"
    marker = ziel / ".fertig"
    if marker.exists() and marker.stat().st_mtime >= zip_pfad.stat().st_mtime:
        return ziel
    ziel.mkdir(parents=True, exist_ok=True)
    basis = ziel.resolve()
    with zipfile.ZipFile(zip_pfad) as z:
        for info in z.infolist():
            pfad = (ziel / info.filename).resolve()
            if not pfad.is_relative_to(basis):
                raise RuntimeError(f"{zip_pfad.name}: unsicherer Pfad im ZIP: {info.filename}")
        z.extractall(ziel)
    marker.touch()
    return ziel


def _meta(qid: str, ziel: Path, n: int, sha: str, abgerufen: str, **mehr) -> None:
    q = quellen()[qid]
    meta = {
        "quelle": qid,
        "url": q.get("url"),
        "datei": ziel.name,
        "bytes": n,
        "sha256": sha,
        "abgerufen": abgerufen,
        **mehr,
    }
    ziel.with_name(ziel.name + ".meta.json").write_text(
        json.dumps(meta, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )


def uebernimm(qid: str, pfad: Path) -> Path:
    """Datei von Hand übernehmen – für Quellen ohne Download-Link (`datei` statt `url`) oder ohne
    Netz: nach data/raw/<id>/ kopieren, Metadaten wie beim Download. Abrufdatum ist die
    Änderungszeit der Datei, also der Zeitpunkt des Downloads im Browser."""
    q = quellen()[qid]
    ordner = get_paths().raw_quelle(qid)
    ordner.mkdir(parents=True, exist_ok=True)
    ziel = ordner / (q.get("datei") or dateiname(q["url"]))
    inhalt = pfad.read_bytes()
    ziel.write_bytes(inhalt)
    abgerufen = datetime.fromtimestamp(pfad.stat().st_mtime, UTC).isoformat(timespec="seconds")
    _meta(
        qid,
        ziel,
        len(inhalt),
        hashlib.sha256(inhalt).hexdigest(),
        abgerufen,
        seite=q.get("seite"),
        von_hand=True,
    )
    if ziel.suffix.lower() == ".zip":
        entpacke(ziel)
    return ziel


def fetch(qid: str, *, force: bool = False, timeout: int = 300) -> Path:
    """Lädt die Quelle `qid` aus sources.yaml (falls nicht vorhanden) und entpackt ZIPs. Der
    Dateiname kommt aus `datei`, sonst aus der URL – `datei` braucht es, wo die URL keinen trägt.
    Mit `wfs: true` ist die URL ein WFS: Geladen werden alle Objekte als GeoJSON."""
    import requests

    q = quellen()[qid]
    ordner = get_paths().raw_quelle(qid)
    ordner.mkdir(parents=True, exist_ok=True)
    if not q.get("url"):
        ziel = ordner / q["datei"]
        if ziel.exists():
            return ziel
        raise FileNotFoundError(
            f"{qid}: ohne Download-Link – Datei auf {q.get('seite')} laden, dann "
            f"`zust fetch {qid} --datei <pfad>`"
        )
    ziel = ordner / (q.get("datei") or dateiname(q["url"]))
    if ziel.exists() and not force:
        if ziel.suffix.lower() == ".zip":
            entpacke(ziel)
        return ziel

    tmp = ziel.with_name(ziel.name + ".part")
    sha = hashlib.sha256()
    n = 0
    params = _wfs_abfrage(q, timeout) if q.get("wfs") else None
    with requests.get(
        q["url"],
        params=params,
        stream=True,
        timeout=timeout,
        headers={"User-Agent": USER_AGENT},
    ) as r:
        r.raise_for_status()
        ctype = r.headers.get("Content-Type", "")
        with tmp.open("wb") as fh:
            for chunk in r.iter_content(1 << 20):
                fh.write(chunk)
                sha.update(chunk)
                n += len(chunk)
        kopf = {k: r.headers.get(k) for k in ("Last-Modified", "ETag", "Content-Type")}
    # Destatis liefert bei veralteter Versionsnummer (v=N) eine HTML-Seite statt der Datei, ein
    # WFS bei falscher Abfrage eine Fehlermeldung (XML) statt GeoJSON.
    endung = ziel.suffix.lower()
    if (
        ctype.startswith("text/html")
        or (endung == ".zip" and not zipfile.is_zipfile(tmp))
        or (endung == ".geojson" and not _ist_geojson(tmp))
    ):
        tmp.unlink(missing_ok=True)
        raise RuntimeError(
            f"{qid}: Antwort ist nicht die erwartete Datei ({ctype or 'unbekannt'}). Link in "
            f"sources.yaml veraltet? Seite prüfen: {q.get('seite', q['url'])}"
        )
    tmp.replace(ziel)
    abgerufen = datetime.now(UTC).isoformat(timespec="seconds")
    mehr = {"objektart": params["TYPENAMES"]} if params else {}
    _meta(qid, ziel, n, sha.hexdigest(), abgerufen, header=kopf, **mehr)
    if ziel.suffix.lower() == ".zip":
        entpacke(ziel)
    return ziel


def _wfs_abfrage(q: dict[str, Any], timeout: int) -> dict[str, str]:
    """Parameter für GetFeature: alle Objekte als GeoJSON in ETRS89/UTM 33N (`crs`, metrisch, ohne
    Streit um die Achsenfolge). Die Objektart steht unter `objektart` – oder der Dienst bietet
    genau eine an, dann kommt sie aus GetCapabilities."""
    return {
        "SERVICE": "WFS",
        "VERSION": "2.0.0",
        "REQUEST": "GetFeature",
        "TYPENAMES": q.get("objektart") or _wfs_objektart(q["url"], timeout),
        "OUTPUTFORMAT": "application/json",
        "SRSNAME": q.get("crs") or "EPSG:25833",
    }


def _wfs_objektart(url: str, timeout: int) -> str:
    """Name der einzigen Objektart eines WFS laut GetCapabilities (`FeatureType/Name`)."""
    import xml.etree.ElementTree as ET

    import requests

    r = requests.get(
        url,
        params={"SERVICE": "WFS", "REQUEST": "GetCapabilities"},
        timeout=timeout,
        headers={"User-Agent": USER_AGENT},
    )
    r.raise_for_status()
    try:
        wurzel = ET.fromstring(r.content)
    except ET.ParseError as e:
        raise RuntimeError(f"{url}: GetCapabilities liefert kein XML") from e

    def lokal(tag: str) -> str:
        return tag.rsplit("}", 1)[-1]

    namen = [
        name.text.strip()
        for art in wurzel.iter()
        if lokal(art.tag) == "FeatureType"
        for name in art
        if lokal(name.tag) == "Name" and name.text and name.text.strip()
    ]
    if len(namen) != 1:
        raise RuntimeError(
            f"{url}: {len(namen)} Objektarten im Dienst ({', '.join(namen) or '–'}) – die "
            "richtige unter `objektart` in sources.yaml eintragen"
        )
    return namen[0]


def _ist_geojson(pfad: Path) -> bool:
    """Eine FeatureCollection mit mindestens einem Objekt? Ein WFS antwortet auf eine falsche
    Abfrage mit einer Fehlermeldung (XML) oder einer leeren Sammlung."""
    try:
        daten = json.loads(pfad.read_text(encoding="utf-8-sig"))
    except (UnicodeDecodeError, json.JSONDecodeError):
        return False
    return (
        isinstance(daten, dict)
        and daten.get("type") == "FeatureCollection"
        and bool(daten.get("features"))
    )


def finde(qid: str, endung: str, praefix: str = "") -> Path:
    """Genau eine Datei `<praefix>…<endung>` unter data/raw/<qid>/ (rekursiv, Groß-/Kleinschreibung
    egal), sonst eine klare Fehlermeldung."""
    ordner = get_paths().raw_quelle(qid)
    e, p = endung.lower(), praefix.lower()
    treffer = sorted(
        x
        for x in ordner.rglob("*")
        if x.is_file() and x.name.lower().endswith(e) and x.name.lower().startswith(p)
    )
    beschreibung = f"{praefix}*{endung}"
    if not treffer:
        raise FileNotFoundError(
            f"{qid}: keine Datei '{beschreibung}' unter {ordner}. Erst `zust fetch {qid}` "
            f"ausführen oder die Datei dort ablegen."
        )
    if len(treffer) > 1:
        namen = ", ".join(str(x.relative_to(ordner)) for x in treffer)
        raise RuntimeError(f"{qid}: mehrere Dateien '{beschreibung}': {namen} – eine entfernen.")
    return treffer[0]
