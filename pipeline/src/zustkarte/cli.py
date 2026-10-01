"""CLI: `zust <befehl>` (aus pipeline/ heraus: `uv run zust …`).

Ablauf: fetch → tabelle → laender → grenzen → manifest → pruefen; `alles` macht alles.
Die Logik lebt in den gleichnamigen Modulen; hier nur das Typer-Wiring (Imports lazy).
"""

from __future__ import annotations

import subprocess
from shutil import which

import typer

from zustkarte import __version__
from zustkarte.config import get_paths, load_yaml, quellen, repo_root

app = typer.Typer(no_args_is_help=True, add_completion=False, help="Wer ist zuständig? – Pipeline")

GRENZE_MB = 100  # Grenzschicht darüber: erst abstimmen (Auftrag A1)


def _node(*args: str) -> None:
    if which("node") is None:
        typer.secho(
            "node fehlt (>= 20) – wird für Landesdateien und Prüfungen gebraucht.", fg="red"
        )
        raise typer.Exit(1)
    subprocess.run(["node", *args], check=True, cwd=repo_root())


@app.command()
def info() -> None:
    """Pfade, Quellen und Werkzeuge anzeigen (Smoke-Check)."""
    from zustkarte import tiles

    paths = get_paths()
    typer.echo(f"zustkarte {__version__}")
    typer.echo(f"pipeline: {paths.root}")
    typer.echo(f"data:     {paths.data}")
    for qid, q in quellen().items():
        typer.echo(f"quelle {qid:<16} Stand {q['stand']}  {q['lizenz']}")
    for b in ("tippecanoe", "tile-join", "node"):
        typer.echo(f"{b:<10} {'ok' if tiles.laeuft(b) else 'FEHLT'}")


@app.command()
def fetch(
    quelle: str = typer.Argument("all", help="Quellen-Id aus sources.yaml oder 'all'"),
    force: bool = typer.Option(False, "--force", help="erneut laden, auch wenn vorhanden"),
) -> None:
    """Quellen nach data/raw/<id>/ laden (ZIPs entpacken)."""
    from zustkarte import fetch as fetch_mod

    alle = quellen()
    ids = list(alle) if quelle == "all" else [quelle]
    for qid in ids:
        try:
            ziel = fetch_mod.fetch(qid, force=force)
            typer.secho(f"{qid}: {ziel}", fg="green")
        except Exception as e:  # noqa: BLE001 – optionale Quellen dürfen fehlen
            if alle[qid].get("optional"):
                typer.secho(f"{qid} (optional) übersprungen: {e}", fg="yellow")
            else:
                raise


@app.command()
def tabelle() -> None:
    """VG25 + GV-ISys → data/interim/gemeinden_attr.json (mit Prüfungen)."""
    from zustkarte import fetch as fetch_mod
    from zustkarte import gv100ad
    from zustkarte import tabelle as tabelle_mod

    q = quellen()
    paths = get_paths()
    gpkg = fetch_mod.finde("vg25", ".gpkg")
    gv = gv100ad.lese(fetch_mod.finde("gv100ad", ".txt", "GV100AD"))
    gv_aktuell = None
    try:
        gv_aktuell = gv100ad.lese(fetch_mod.finde("gv100ad_aktuell", ".txt", "GV100AD"))
    except FileNotFoundError:
        typer.secho("gv100ad_aktuell fehlt – Gebietsänderungen werden nicht markiert.", fg="yellow")
    quellen_meta = [
        {
            "id": qid,
            "label": q[qid]["label"],
            "lizenz": q[qid]["lizenz"],
            "vermerk": q[qid]["vermerk"],
        }
        for qid in ("vg25", "gv100ad")
    ]
    attr, bericht = tabelle_mod.baue(
        gpkg,
        gv,
        vg25_stand=q["vg25"]["stand"],
        quellen_meta=quellen_meta,
        pruefungen=load_yaml("pruefungen.yaml"),
        gv_aktuell=gv_aktuell,
    )
    tabelle_mod.schreibe(attr, bericht, paths.attr_json, paths.review / "tabelle-bericht.json")
    typer.secho(f"{len(attr['gemeinden'])} Gemeinden → {paths.attr_json}", fg="green")
    for lkz, n in bericht.gemeinden_je_land.items():
        typer.echo(f"  {lkz} {n:>5}  Große Kreisstädte: {bericht.gks_je_land.get(lkz, 0)}")
    for w in bericht.warnungen[:20]:
        typer.secho(f"  Warnung: {w}", fg="yellow")


@app.command()
def laender() -> None:
    """gemeinden_attr.json → data/zustaendigkeit/<land>.json + index.json (node)."""
    paths = get_paths()
    _node(
        "tools/build-laender.mjs",
        "--attr",
        str(paths.attr_json),
        "--aus",
        str(paths.out),
        "--review",
        str(paths.review / "zustaendigkeit-review.csv"),
    )


@app.command()
def grenzen(dry_run: bool = typer.Option(False, "--dry-run")) -> None:
    """VG25-Flächen → data/zustaendigkeit/gemeinden.pmtiles (Layer gemeinden + kreise)."""
    from zustkarte import fetch as fetch_mod
    from zustkarte import grenzen as grenzen_mod

    get_paths().ensure()
    ziel = grenzen_mod.baue(fetch_mod.finde("vg25", ".gpkg"), dry_run=dry_run)
    if ziel.exists():
        mb = ziel.stat().st_size / 1e6
        typer.secho(f"{ziel} ({mb:.1f} MB)", fg="green")
        if mb > GRENZE_MB:
            typer.secho(
                f"Größer als {GRENZE_MB} MB: vor dem Hochladen abstimmen (Auftrag A1) – "
                "z. B. maxzoom 11 oder simplification in config/tiles.yaml.",
                fg="yellow",
            )


@app.command()
def manifest() -> None:
    """data/manifest.json (Dateien, Label, Attribution, Datenstand)."""
    from zustkarte import manifest as manifest_mod

    typer.secho(str(manifest_mod.erzeuge()), fg="green")


@app.command()
def pruefen(
    n: int = typer.Option(200, "--n", help="Zufallspunkte für die Stichprobe"),
    grenze: int = typer.Option(20, "--grenze", help="Grenzpunkte zum Gegenprüfen am BKG-Dienst"),
) -> None:
    """Feste Punkte und Stichprobe gegen die Grenzschicht (tools/check-golden, check-stichprobe)."""
    paths = get_paths()
    archiv = str(paths.out / "gemeinden.pmtiles")
    _node("tools/check-golden.mjs", "--archiv", archiv)
    _node(
        "tools/check-stichprobe.mjs",
        "--archiv",
        archiv,
        "--n",
        str(n),
        "--grenze",
        str(grenze),
        "--csv",
        str(paths.review / "grenzpunkte.csv"),
    )


@app.command()
def alles(force: bool = typer.Option(False, "--force", help="Quellen neu laden")) -> None:
    """fetch → tabelle → laender → grenzen → manifest → pruefen."""
    fetch(quelle="all", force=force)
    tabelle()
    laender()
    grenzen(dry_run=False)
    manifest()
    pruefen(n=200, grenze=20)


if __name__ == "__main__":
    app()
