# Pipeline

Python-Paket `zustkarte` mit dem Befehl `zust`. Es lädt die amtlichen Quellen, baut die
Gemeindetabelle und die Grenzschicht und prüft beides. Die Landesdateien baut ein Node-Skript im
Repo-Root (`tools/build-laender.mjs`), damit dieselben Regeln (`js/resolve.js`) im Build und im
Browser laufen. Was herauskommt, beschreibt [docs/VERTRAG.md](../docs/VERTRAG.md).

## Voraussetzungen

- Python 3.11–3.13 mit [uv](https://docs.astral.sh/uv/)
- `tippecanoe` und `tile-join` (getestet mit 2.49); ohne sie gibt `zust grenzen` die Kommandos
  nur aus
- Node ≥ 20 und `npm install` im Repo-Root
- Netz zu `daten.gdz.bkg.bund.de` und `www.destatis.de` (nur für `zust fetch`)

```bash
cd pipeline
uv sync
uv run zust info          # Pfade, Quellen, Werkzeuge
uv run zust alles         # alles in einem Lauf
```

## Schritte

| Befehl | Was | Ergebnis |
|---|---|---|
| `zust fetch [id] [--force]` | Quellen aus `config/sources.yaml` laden, ZIPs entpacken; daneben `<datei>.meta.json` mit URL, Größe, SHA-256 und Abrufdatum | `data/raw/<id>/` |
| `zust tabelle` | VG25 + GV-ISys verknüpfen und prüfen | `data/interim/gemeinden_attr.json`, `data/review/tabelle-bericht.json` |
| `zust kontakte [--land TH] [--nur-cache]` | optional: Kontakt der zuständigen Stelle je Gemeinde aus dem Bundesportal (eine Anfrage je Gemeinde, gedrosselt, mit Cache) | `data/interim/kontakte.json`, `data/review/kontakte-review.csv` |
| `zust laender` | Regeln über alle Gemeinden (Node), mit Kontakten, falls vorhanden; Größen je Datei | `data/zustaendigkeit/<lkz>.json`, `index.json`, `data/review/zustaendigkeit-review.csv` |
| `zust grenzen [--dry-run]` | VG25-Flächen → FlatGeobuf → tippecanoe → tile-join; meldet die Größe, warnt über 100 MB | `data/zustaendigkeit/gemeinden.pmtiles` |
| `zust manifest` | Manifest mit Label, Quellenvermerk, Datenstand und Größe | `data/manifest.json` |
| `zust pruefen [--n 200] [--grenze 20]` | feste Punkte und Stichprobe gegen die Grenzschicht | Ausgabe, `data/review/grenzpunkte.csv` |
| `zust alles [--force]` | alle Schritte nacheinander | |

`zust laender` muss vor `zust grenzen` laufen: Die Grenzschicht übernimmt aus den Landesdateien
die Felder `eg` und `sg` für die Einfärbung.

### Kontakte aus dem Bundesportal

Für die Leistung „Aufstellung von Verkehrszeichen anregen" pflegen die Länder im Portalverbund,
welche Stelle für eine Gemeinde zuständig ist – Stand 10/2026 in BB, BY, MV, NI, NW, RP, SH, ST
und TH. `zust kontakte` fragt die (nicht dokumentierte) API des Bundesportals je Gemeinde ab, eine
Anfrage pro Sekunde; der Cache liegt in `data/raw/bundesportal/<LAND>/`, ein abgebrochener Lauf
setzt fort. `zust alles` ruft den Schritt nicht auf.

Je Gemeinde wird genau eine Stelle gewählt (`bundesportal.waehle`): Stellen mit fremdem
Fachbereich (Gewerbe, Fahrerlaubnis, Zulassung …) und ohne Telefon, E-Mail oder Web scheiden aus;
E-Mail-Adressen mit Personennamen und Links zu sozialen Netzwerken fallen weg, Kontaktpersonen
werden nie übernommen. Von den
übrigen gewinnt die mit „Verkehr" im Namen oder in der Adresse. Gleich gute Stellen mit
verschiedenen Behörden gelten als `mehrdeutig` und bekommen keinen Kontakt – die Review-CSV
zeigt alle Stellen mit Punkten. Daneben wird je Gemeinde die Stelle der Gemeinde selbst gesucht
(Rathaus oder Verwaltungsgemeinschaft, `waehle_gemeinde`); der Build übernimmt sie nur in Ländern,
in denen Gemeinden für Gemeindestraßen zuständig sein können (heute Bayern).

Lücken (`luecken_fuellen`): Fehlt einer Gemeinde der Kontakt, gilt zuerst ein Eintrag von Hand aus
`config/kontakte_ergaenzt.yaml` (Kreis oder Gemeinde, abgeschrieben von der Webseite der Behörde,
mit Datum), sonst der Kreiskontakt, den das Portal für die übrigen Gemeinden des Kreises nennt.
Im Telefonfeld des Portals steht die Beschriftung hinter der Nummer („03631 911-6303",
„Straßenverkehr"); Nummern und Postfächer für den Straßenverkehr kommen nach vorn.

In die Landesdateien gehen nur die Länder aus `freigegeben` in `sources.yaml` – weitere Länder
dürfen schon im Cache liegen.

## Ordner

```text
pipeline/
  config/
    sources.yaml      Quellen (URL, Stand, Lizenz, Quellenvermerk) und veröffentlichte Dateien
    tiles.yaml        tippecanoe-Profile der Layer gemeinden und kreise
    pruefungen.yaml   Erwartungen für die Prüfungen (Große Kreisstädte je Land)
  data/               nicht im Git
    raw/<id>/         Downloads; raw/bundesportal/<LAND>/ Antworten je Gemeinde
    interim/          gemeinden_attr.json, kontakte.json, FlatGeobuf
    zustaendigkeit/   veröffentlichte Dateien (Bucket-Präfix zustaendigkeit/)
    review/           Berichte, Review-CSV, Grenzpunkte (nicht veröffentlichen)
  src/zustkarte/      cli, fetch, vg25, gv100ad, tabelle, bundesportal, grenzen, tiles, manifest, config
  tests/              pytest mit kleinen Testdaten (VG25-GeoPackage und GV100AD-Auszug)
```

## Quellen pflegen

- **VG25** (BKG): Die URL zeigt auf `aktuell/` und liefert nach dem jährlichen Wechsel (2026 im
  Juli) den neuen Stand. Dann `stand` in `sources.yaml` anpassen – und das Gemeindeverzeichnis
  zum selben Stichtag nehmen.
- **GV-ISys** (Destatis): Die Download-Links tragen `?__blob=publicationFile&v=N`; das `v` ändert
  sich mit jeder Ausgabe. Liefert der Server eine HTML-Seite statt eines ZIPs, bricht `zust fetch`
  ab. Dann die Seite unter `seite` öffnen und den Link übernehmen.
- **Monatsausgabe** (`gv100ad_aktuell`, optional): nur zum Markieren von Gemeinden, die seit dem
  Datenstand aufgelöst, umgeschlüsselt oder umbenannt wurden. Destatis veröffentlicht sie vor dem
  Stichtag (die Ausgabe 31.10.2026 erschien am 28.09.2026).
- Sind BKG oder Destatis nicht erreichbar, `zust fetch` auf einem anderen Rechner laufen lassen
  oder die Dateien von Hand nach `data/raw/<id>/` legen; die übrigen Schritte lesen nur von dort.

## Prüfungen

`zust tabelle` bricht ab, statt halbe Daten durchzulassen:

- Datenstand VG25 = Datenstand GV-ISys;
- jeder ARS 12-stellig und eindeutig, Land passt zum Schlüssel;
- jede Gemeinde mit Kreis; Verband (6. Stelle `5`) und Regierungsbezirk (`FK_S3 = R`) vorhanden;
- VG25 und GV-ISys mit derselben Gemeindemenge, gemeindefreie Gebiete eingeschlossen. Ausnahmen:
  die Flächen des deutsch-luxemburgischen Kondominiums (nur VG25, `BEZ = Kondominium`; sie
  übernehmen die angrenzende Gemeinde aus `SDV_ARS`) und unbewohnte gemeindefreie Gebiete ohne
  Fläche (nur GV-ISys, Textkennzeichen 66; nur Warnung);
- kreisfreie Städte in beiden Quellen gleich, je kreisfreiem Kreis genau eine Gemeinde;
- Große Kreisstädte (Textkennzeichen 67) je Land in der Toleranz aus `pruefungen.yaml`, in
  anderen Ländern keine. Sachsen führt sie im GV-ISys nicht als 67 (siehe dort).

`zust grenzen` bricht ab, wenn Gemeinden in den Landesdateien fehlen. `zust pruefen` endet mit
Fehler, wenn ein fester Punkt den falschen ARS ergibt, ein Punkt in mehr als einer Fläche liegt
oder an einer Grenze eine Überlappung auftaucht.

## Tests

```bash
uv run pytest          # Einheiten und Ende-zu-Ende mit Testdaten (Ende-zu-Ende braucht tippecanoe, node, npm install)
uvx ruff check && uvx ruff format --check
```

Die Testdaten in `tests/conftest.py` folgen dem Aufbau der VG25-Dokumentation: kreisfreie Stadt,
Große Kreisstadt mit Loch und darin die Exklave einer Nachbargemeinde, Stadtstaaten,
gemeindefreies Gebiet, Region Hannover, Verbandsgemeinde in RP mit angrenzendem Kondominium,
ein Datensatz mit `GF = 8`.
