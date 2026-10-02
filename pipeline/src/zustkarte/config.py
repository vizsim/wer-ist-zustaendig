"""Zentrale Konfiguration: Pfade und YAML-Configs (Muster aus unfallkarte/svz).

Eine Quelle der Wahrheit dafür, wo Daten liegen und welche deklarativen Configs es gibt.
Pipeline-Module importieren von hier, statt Pfade selbst zu raten.
"""

from __future__ import annotations

from dataclasses import dataclass
from functools import lru_cache
from pathlib import Path
from typing import Any

import yaml


def pipeline_root() -> Path:
    """pipeline/: .../src/zustkarte/config.py -> parents[2]."""
    return Path(__file__).resolve().parents[2]


def repo_root() -> Path:
    """Repo-Wurzel (Viewer, js/, tools/) = eine Ebene über pipeline/."""
    return pipeline_root().parent


@dataclass(frozen=True)
class Paths:
    """Kanonische Pfade. `data/` ist gitignored (lokal + Bucket, nicht im Git)."""

    root: Path

    @property
    def config(self) -> Path:
        return self.root / "config"

    @property
    def data(self) -> Path:
        return self.root / "data"

    @property
    def raw(self) -> Path:
        return self.data / "raw"  # Downloads je Quelle: data/raw/<id>/

    @property
    def interim(self) -> Path:
        return self.data / "interim"  # gemeinden_attr.json, FlatGeobuf für tippecanoe

    @property
    def out(self) -> Path:
        return self.data / "zustaendigkeit"  # veröffentlichte Dateien (Vertrag)

    @property
    def review(self) -> Path:
        return self.data / "review"  # Review-CSV, Prüfberichte (nicht deployen)

    @property
    def attr_json(self) -> Path:
        return self.interim / "gemeinden_attr.json"

    @property
    def kontakte_json(self) -> Path:
        return self.interim / "kontakte.json"  # optional: `zust kontakte` (Bundesportal)

    def raw_quelle(self, qid: str) -> Path:
        return self.raw / qid

    def ensure(self) -> None:
        for p in (self.data, self.raw, self.interim, self.out, self.review):
            p.mkdir(parents=True, exist_ok=True)


@lru_cache
def get_paths() -> Paths:
    return Paths(root=pipeline_root())


def load_yaml(name: str, config_dir: Path | None = None) -> dict[str, Any]:
    """Lädt config/<name> (z. B. 'sources.yaml')."""
    path = (config_dir or get_paths().config) / name
    if not path.exists():
        raise FileNotFoundError(f"Config fehlt: {path}")
    with path.open(encoding="utf-8") as fh:
        data = yaml.safe_load(fh)
    if not isinstance(data, dict):
        raise ValueError(f"Config {name} ist kein Mapping")
    return data


def quellen() -> dict[str, dict[str, Any]]:
    return load_yaml("sources.yaml")["quellen"]
