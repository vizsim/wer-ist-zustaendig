"""Tippecanoe-/tile-join-Wrapper (Muster aus unfallkarte/svz).

Profile stehen in config/tiles.yaml. Fehlt das Binary oder ist dry_run gesetzt, werden die
Kommandos nur ausgegeben – so lässt sich die Pipeline auch ohne tippecanoe prüfen.
"""

from __future__ import annotations

import subprocess
from pathlib import Path
from shutil import which
from typing import Any

from zustkarte.config import load_yaml

_CFG = "tiles.yaml"


def profile() -> dict[str, Any]:
    return load_yaml(_CFG)["profiles"]


def profil_args(profil: dict[str, Any]) -> list[str]:
    """Übersetzt ein Profil in tippecanoe-Flags (ohne -o und Eingabe)."""
    args: list[str] = ["--force"]
    if profil.get("layer"):
        args += ["-l", profil["layer"]]
    if "minzoom" in profil:
        args.append(f"--minimum-zoom={profil['minzoom']}")
    if "maxzoom" in profil:
        args.append(f"--maximum-zoom={profil['maxzoom']}")
    if profil.get("detect_shared_borders"):
        args.append("--detect-shared-borders")
    if profil.get("no_tiny_polygon_reduction"):
        args.append("--no-tiny-polygon-reduction")
    if "simplification" in profil:
        args.append(f"--simplification={profil['simplification']}")
    if "low_detail" in profil:
        args.append(f"--low-detail={profil['low_detail']}")
    if profil.get("no_feature_limit"):
        args.append("--no-feature-limit")
    if profil.get("no_tile_size_limit"):
        args.append("--no-tile-size-limit")
    return args


def laeuft(befehl: str) -> bool:
    return which(befehl) is not None


def _run(cmd: list[str], *, dry_run: bool) -> None:
    text = " ".join(cmd)
    if dry_run or not laeuft(cmd[0]):
        grund = "dry-run" if dry_run else f"'{cmd[0]}' nicht installiert"
        print(f"  [{grund}] {text}")
        return
    print(f"  $ {text}")
    subprocess.run(cmd, check=True)


def tippecanoe(profil_name: str, eingabe: Path, ausgabe: Path, *, dry_run: bool = False) -> Path:
    ausgabe.parent.mkdir(parents=True, exist_ok=True)
    cmd = [
        "tippecanoe",
        "--no-progress-indicator",
        "-o",
        str(ausgabe),
        *profil_args(profile()[profil_name]),
        str(eingabe),
    ]
    _run(cmd, dry_run=dry_run)
    return ausgabe


def tile_join(ausgabe: Path, eingaben: list[Path], *, dry_run: bool = False) -> Path:
    ausgabe.parent.mkdir(parents=True, exist_ok=True)
    cmd = ["tile-join", "--force", "--no-tile-size-limit", "-o", str(ausgabe), *map(str, eingaben)]
    _run(cmd, dry_run=dry_run)
    return ausgabe
