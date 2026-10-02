"""Smoke: Paket importiert, Configs vollständig, CLI verdrahtet."""

from __future__ import annotations

from typer.testing import CliRunner

from zustkarte import __version__
from zustkarte.cli import app
from zustkarte.config import get_paths, load_yaml, quellen


def test_version_und_pfade() -> None:
    assert __version__
    p = get_paths()
    assert p.config.name == "config"
    assert p.attr_json.name == "gemeinden_attr.json"
    assert p.out.name == "zustaendigkeit"


def test_quellen_vollstaendig() -> None:
    for qid, q in quellen().items():
        for key in ("label", "url", "seite", "stand", "lizenz", "vermerk"):
            assert q.get(key), f"{qid}: `{key}` fehlt in sources.yaml"
    datasets = load_yaml("sources.yaml")["datasets"]
    assert datasets["zust_gemeinden"]["file"] == load_yaml("tiles.yaml")["ausgabe"]
    bp = load_yaml("sources.yaml")["dienste"]["bundesportal"]
    for key in ("label", "leistung", "laender_url", "kontakt_url", "seite", "lizenz", "vermerk"):
        assert bp.get(key), f"bundesportal: `{key}` fehlt in sources.yaml"


def test_pruefungen_lesbar() -> None:
    gks = load_yaml("pruefungen.yaml")["grosse_kreisstaedte"]
    assert set(gks) == {"BW", "BY", "SN"}


def test_cli_info() -> None:
    r = CliRunner().invoke(app, ["info"])
    assert r.exit_code == 0, r.output
    assert "quelle vg25" in r.output
