"""data/manifest.json: Index der veröffentlichten Dateien mit Datenstand.

Muster aus unfallkarte/svz: Konsumenten wie die Unfallkarte spiegeln die Dateien und übernehmen
Label, Attribution und Datum von hier. Gespeist aus `datasets` in config/sources.yaml und dem Kopf
von gemeinden_attr.json.
"""

from __future__ import annotations

import json
from datetime import date
from pathlib import Path
from typing import Any

from zustkarte.config import get_paths, load_yaml


def erzeuge() -> Path:
    paths = get_paths()
    datasets = load_yaml("sources.yaml")["datasets"]
    stand: dict[str, Any] = {}
    if paths.attr_json.exists():
        stand = json.loads(paths.attr_json.read_text(encoding="utf-8"))["meta"]["stand"]
    eintraege: dict[str, Any] = {}
    for ds_id, ds in datasets.items():
        datei = paths.data / ds["file"]
        eintraege[ds_id] = {
            "file": ds["file"],
            "label": ds["label"],
            "attribution": ds["attribution"],
            "date": stand.get("gebiet"),
            "bytes": datei.stat().st_size if datei.exists() else None,
        }
    manifest = {"erzeugt": date.today().isoformat(), "stand": stand, "datasets": eintraege}
    ziel = paths.data / "manifest.json"
    ziel.parent.mkdir(parents=True, exist_ok=True)
    ziel.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    return ziel
