![License: AGPL-3.0-or-later](https://img.shields.io/badge/License-AGPL--3.0--or--later-blue)

# Wer ist zuständig?

Welche **Straßenverkehrsbehörde** entscheidet an einer Straße über Schilder und Tempolimits?
Dieses Projekt beantwortet die Frage für jede Gemeinde in Deutschland: aus den amtlichen
Gemeindegrenzen (BKG), dem Gemeindeverzeichnis (Destatis) und Regeln je Land. Jede Auskunft
nennt, **wie sicher** sie ist und **woher** sie stammt.

Es gibt zwei Wege zu den Daten:

- eine **Karte** ([index.html](index.html)): Straße anklicken oder suchen, Auskunft lesen;
- **Dateien** für andere Anwendungen, zuerst die [Unfallkarte](https://github.com/vizsim/unfallkarte):
  Grenzschicht als PMTiles und eine JSON-Datei je Land. Der Vertrag steht in
  [docs/VERTRAG.md](docs/VERTRAG.md).

> **Kein Rechtsrat.** Die Auskunft ist eine begründete Vermutung mit Quelle. Vor einem Antrag
> oder einer Anregung bitte prüfen, ob die genannte Stelle wirklich zuständig ist.

## Stand: Phase 2 – Bayern und Thüringen

| Was | Stand |
|---|---|
| Gemeindegrenzen, Schlüssel, Kreise | ganz Deutschland, Gebietsstand 31.12.2025 |
| **Bayern** | **belegt**: Gemeindestraßen – die Gemeinde selbst (in einer Verwaltungsgemeinschaft erledigt die Gemeinschaft die Verwaltungsarbeit); Kreis-, Staats- und Bundesstraßen – das Landratsamt; Große Kreisstädte und kreisfreie Städte für alle Straßen |
| **Thüringen** | **vermutlich**: Städte über 30.000 Einwohner und Eisenach für alle Straßen; Städte, die auf Antrag Straßenverkehrsbehörde sind (Apolda, Arnstadt, Eisenberg, Heilbad Heiligenstadt), für alle außer Bundesstraßen; sonst der Landkreis |
| Bremen (Amt für Straßen und Verkehr, Bremerhaven: Magistrat) | **belegt** |
| Kreisfreie Städte der übrigen Länder | **vermutlich**: die Stadt |
| Alle übrigen Gemeinden | **nur Ebene**: Kreis (Landratsamt, Kreisverwaltung); Große Kreisstädte als Alternative |
| Berlin, Hamburg | **nur Ebene**: Bezirksamt bzw. Senatsverwaltung; zuständiges Polizeikommissariat |
| Autobahnen | Fernstraßen-Bundesamt, kein Brief an die Kommune |
| **Kontakt** (Telefon, E-Mail, Webseite) | **Thüringen und Bayern: jede Gemeinde, jede Straßenklasse** – der Kontakt genau der Stelle, die zuständig ist, aus dem Bundesportal; einzelne Lücken von den Webseiten der Behörden. Übrige Länder: Link ins Bundesportal; nennt das Land dort dieselbe Stelle wie unsere Regel, gilt die Auskunft als **vermutlich** |

Die Regeln der übrigen Länder folgen (siehe [docs/TODO.md](docs/TODO.md)): erst die voll
belegten Länder (BW, BB, NW, SN), dann die Stadtstaaten, dann der Rest. Bis dahin zeigt die Karte
für die meisten Gemeinden ehrlich nur die Kreisebene – schraffiert. Kontakte folgen Land für Land,
sobald die Daten aus dem Bundesportal durchgesehen sind.

## So funktioniert es

```text
BKG VG25 (Grenzen, ARS, Namen)   ─┐
Destatis GV-ISys (Status, EW)    ─┴─ zust tabelle ──→ gemeinden_attr.json ─┐
Bundesportal (Stellen, Kontakte) ─── zust kontakte ─→ kontakte.json ───────┴─ zust laender ─→ <land>.json (16×), index.json
                                                                               (js/resolve.js)          │
                                                     VG25-Flächen + Landesdateien ─ zust grenzen ─→ gemeinden.pmtiles
                                                                                                        ↓
                                                     Karte (index.html) · Unfallkarte · tools/lookup.mjs
```

- **Schlüssel ist der 12-stellige Regionalschlüssel (ARS):** Land, Regierungsbezirk, Kreis,
  Verwaltungsgemeinschaft, Gemeinde. Die 6. Stelle zeigt, ob die Gemeinde zu einem Verband
  gehört (wichtig für RP, BW, SH).
- **Die Straßenklasse gehört zur Frage:** In mehreren Ländern hängt die Zuständigkeit daran, ob
  nur Gemeindestraßen betroffen sind. [js/strassenklasse.js](js/strassenklasse.js) erkennt die
  Klasse aus OSM `ref` und `highway`, auch Bayerns und Mecklenburg-Vorpommerns Kreisstraßen mit
  Kfz-Kürzel („DAH 3", „VG 12").
- **Kontakt je Gemeinde:** Im Bundesportal pflegen die Länder für jede Gemeinde die zuständige
  Stelle mit Telefon und E-Mail. `zust kontakte` holt sie ab und wählt je Gemeinde zwei Kontakte:
  die Kreisebene und die Gemeinde selbst (Verkehr vor Ordnung, keine Personen). Lücken füllt es
  mit dem Kreiskontakt oder von Hand (`pipeline/config/kontakte_ergaenzt.yaml`, mit Quelle und
  Datum). Die Auskunft zeigt den Kontakt der Stelle, die für die Straße zuständig ist.
- **Vorberechnet:** Die Regeln laufen im Build einmal über alle Gemeinden. Heraus kommt eine
  Tabelle, die man lesen, stichprobenartig prüfen und freigeben kann; jede Änderung steht im
  Diff. Im Browser bleibt nur das Nachschlagen.

## Loslegen

Voraussetzungen: Node ≥ 20, [uv](https://docs.astral.sh/uv/), `tippecanoe` + `tile-join`.

```bash
npm install
cd pipeline && uv sync
uv run zust alles          # lädt VG25 (ca. 320 MB) und GV-ISys, baut und prüft alles
cd .. && npm run serve     # Karte auf http://127.0.0.1:8080/ (mit Range-Requests für PMTiles)
```

Einzelschritte, Ordner und Prüfungen: [pipeline/README.md](pipeline/README.md).
Auskunft auf der Kommandozeile:

```bash
node tools/lookup.mjs 48.4005 11.7448 G     # Punkt (lat lon) und Straßenklasse(n)
```

## Quellen und Lizenzen

| Daten | Quelle | Lizenz und Quellenvermerk |
|---|---|---|
| Gemeinde- und Kreisgrenzen, Schlüssel, Namen | [BKG, Verwaltungsgebiete 1:25 000 (VG25)](https://gdz.bkg.bund.de/index.php/default/verwaltungsgebiete-1-25-000-stand-31-12-vg25.html), Stand 31.12.2025 | CC BY 4.0 · © BKG (2026) CC BY 4.0, Datenquellen: [datenquellen_vg25.pdf](https://sgx.geodatenzentrum.de/web_public/gdz/datenquellen/datenquellen_vg25.pdf) |
| Große Kreisstädte, Einwohnerzahlen | [Destatis, Gemeindeverzeichnis GV-ISys](https://www.destatis.de/DE/Themen/Laender-Regionen/Regionales/Gemeindeverzeichnis/_inhalt.html), Jahresausgabe 31.12.2025 | Statistisches Bundesamt (Destatis); Vervielfältigung und Verbreitung mit Quellenangabe gestattet |
| Kontakte der Behörden (TH, BY) | [Bundesportal](https://verwaltung.bund.de/leistungsverzeichnis/de/leistung/99108014042000), Leistung „Aufstellung von Verkehrszeichen anregen“, Angaben der Länder; Ergänzungen von den Webseiten der Behörden | amtliche Kontaktangaben, nur Funktionspostfächer; Quelle und Abrufdatum in jeder Auskunft |
| Straßen in der Karte | Kacheln der [Unfallkarte](https://github.com/vizsim/unfallkarte) aus OpenStreetMap | © OpenStreetMap-Mitwirkende (ODbL) |
| Hintergrundkarte | [OpenFreeMap](https://openfreemap.org) Positron | © OpenMapTiles, © OpenStreetMap-Mitwirkende |
| Ortssuche | [Photon](https://photon.komoot.io) (komoot) | © OpenStreetMap-Mitwirkende |
| Schrift | [Barlow](https://github.com/jpt/barlow), selbst gehostet | SIL Open Font License 1.1 ([assets/fonts/OFL.txt](assets/fonts/OFL.txt)) |
| Rechtsgrundlagen | Fundstellen je Auskunft; Bayern aus [BAYERN.RECHT](https://www.gesetze-bayern.de) (ZustGVerk, GrKrV, AufVGem, VGemO); sonst Recherche im Konzept zum Analyse-Report der Unfallkarte (§ 6) | – |

Code: AGPL-3.0-or-later.

## Fehler gefunden?

Stimmt eine Auskunft nicht, oder kennst du die Regel deines Landes genauer?
**[Zuständigkeit melden](https://github.com/vizsim/wer-ist-zustaendig/issues/new?template=zustaendigkeit-falsch.yml)** –
am besten mit Link zur Karte (der Punkt steht im Link) und einer Fundstelle.

## Prüfen

```bash
npm test                                  # reine Module, Build der Landesdateien, Kartenhelfer
cd pipeline && uv run pytest && uvx ruff check   # Pipeline inkl. Ende-zu-Ende mit Testdaten
uv run zust pruefen                       # echte Grenzschicht: feste Punkte und Stichprobe
```

`zust pruefen` schlägt die neun festen Punkte aus [tests/golden-punkte.json](tests/golden-punkte.json)
nach, zieht 200 Zufallspunkte (jeder muss in genau einer Gemeinde liegen) und legt 20 Punkte
nahe Gemeindegrenzen mit Link zum BKG-Dienst in `pipeline/data/review/grenzpunkte.csv` ab – zum
Gegenprüfen von Hand.
