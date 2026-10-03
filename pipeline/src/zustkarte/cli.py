"""CLI: `zust <befehl>` (aus pipeline/ heraus: `uv run zust …`).

Ablauf: fetch → tabelle → laender → grenzen → manifest → pruefen; `alles` macht alles.
Die Logik lebt in den gleichnamigen Modulen; hier nur das Typer-Wiring (Imports lazy).
"""

from __future__ import annotations

import subprocess
from shutil import which
from typing import Annotated

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
def kontakte(
    land: Annotated[
        list[str] | None,
        typer.Option(help="Länderkürzel, mehrfach möglich; ohne: alle Länder im Bundesportal"),
    ] = None,
    nur_cache: bool = typer.Option(False, "--nur-cache", help="nichts abrufen, nur neu auswerten"),
    force: bool = typer.Option(False, "--force", help="auch Gemeinden im Cache neu abrufen"),
) -> None:
    """Bundesportal: Kontakt der zuständigen Stelle je Gemeinde → data/interim/kontakte.json.

    Eine Anfrage je Gemeinde (gedrosselt, mit Cache); danach `zust laender` neu bauen.
    """
    import json
    from collections import Counter

    from zustkarte import bundesportal

    paths = get_paths()
    attr = json.loads(paths.attr_json.read_text(encoding="utf-8"))["gemeinden"]
    if not nur_cache:
        for lkz in [x.upper() for x in land] if land else sorted(bundesportal.herausgeber()):
            ars = sorted(a for a, g in attr.items() if g["land"] == lkz and not g["kondominium"])
            bundesportal.abrufen(lkz, ars, force=force, melde=typer.echo)
    daten, review = bundesportal.tabelle(attr)
    bundesportal.schreibe(daten, review, paths.kontakte_json, paths.review / "kontakte-review.csv")
    for lkz in daten["meta"]["laender"]:
        land_g = [g for a, g in daten["gemeinden"].items() if attr[a]["land"] == lkz]
        wahl = Counter(g["wahl"] for g in land_g)
        n = len(land_g)
        kreis = sum(g["kreis"] is not None for g in land_g)
        gemeinde = sum(g["gemeinde"] is not None for g in land_g)
        typer.echo(
            f"{lkz} {n:>5} Gemeinden · Kontakt Kreisebene {kreis} ({kreis / n:.0%}) · "
            f"Gemeinde selbst {gemeinde} · Portal: "
            + " · ".join(f"{k} {v}" for k, v in sorted(wahl.items()))
        )
    offen = [x for x in bundesportal.laender_im_cache() if x not in daten["meta"]["laender"]]
    if offen:
        typer.echo(f"Im Cache, aber nicht freigegeben (sources.yaml): {', '.join(offen)}")
    typer.secho(f"→ {paths.kontakte_json}", fg="green")


@app.command()
def laender() -> None:
    """gemeinden_attr.json (+ kontakte.json) → data/zustaendigkeit/<land>.json + index.json."""
    paths = get_paths()
    kontakte = ["--kontakte", str(paths.kontakte_json)] if paths.kontakte_json.exists() else []
    _node(
        "tools/build-laender.mjs",
        "--attr",
        str(paths.attr_json),
        "--aus",
        str(paths.out),
        "--review",
        str(paths.review / "zustaendigkeit-review.csv"),
        *kontakte,
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
