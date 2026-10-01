"""Downloads der Quellen nach data/raw/<id>/ mit Metadaten; ZIPs werden entpackt.

Die Server von BKG und Destatis sind aus manchen Umgebungen (Sandboxen mit Netz-Allowlist) nicht
erreichbar. Dann `zust fetch` auf einem Rechner mit Netz laufen lassen oder die Dateien von Hand
nach data/raw/<id>/ legen – die übrigen Schritte lesen nur von dort.
"""

from __future__ import annotations

import hashlib
import json
import zipfile
from datetime import UTC, datetime
from pathlib import Path
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


def fetch(qid: str, *, force: bool = False, timeout: int = 300) -> Path:
    """Lädt die Quelle `qid` aus sources.yaml (falls nicht vorhanden) und entpackt ZIPs."""
    import requests

    q = quellen()[qid]
    ordner = get_paths().raw_quelle(qid)
    ordner.mkdir(parents=True, exist_ok=True)
    ziel = ordner / dateiname(q["url"])
    if ziel.exists() and not force:
        if ziel.suffix.lower() == ".zip":
            entpacke(ziel)
        return ziel

    tmp = ziel.with_name(ziel.name + ".part")
    sha = hashlib.sha256()
    n = 0
    with requests.get(
        q["url"], stream=True, timeout=timeout, headers={"User-Agent": USER_AGENT}
    ) as r:
        r.raise_for_status()
        ctype = r.headers.get("Content-Type", "")
        with tmp.open("wb") as fh:
            for chunk in r.iter_content(1 << 20):
                fh.write(chunk)
                sha.update(chunk)
                n += len(chunk)
        kopf = {k: r.headers.get(k) for k in ("Last-Modified", "ETag", "Content-Type")}
    # Destatis liefert bei veralteter Versionsnummer (v=N) eine HTML-Seite statt der Datei.
    if ctype.startswith("text/html") or (
        ziel.suffix.lower() == ".zip" and not zipfile.is_zipfile(tmp)
    ):
        tmp.unlink(missing_ok=True)
        raise RuntimeError(
            f"{qid}: Antwort ist keine Datei ({ctype or 'unbekannt'}). Link in sources.yaml "
            f"veraltet? Seite prüfen: {q.get('seite', q['url'])}"
        )
    tmp.replace(ziel)
    meta = {
        "quelle": qid,
        "url": q["url"],
        "datei": ziel.name,
        "bytes": n,
        "sha256": sha.hexdigest(),
        "abgerufen": datetime.now(UTC).isoformat(timespec="seconds"),
        "header": kopf,
    }
    ziel.with_name(ziel.name + ".meta.json").write_text(
        json.dumps(meta, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    if ziel.suffix.lower() == ".zip":
        entpacke(ziel)
    return ziel


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
