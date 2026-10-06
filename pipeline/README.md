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
- Netz zu `daten.gdz.bkg.bund.de`, `www.destatis.de` und `gdi.berlin.de` (nur für `zust fetch`)

```bash
cd pipeline
uv sync
uv run zust info          # Pfade, Quellen, Werkzeuge
uv run zust alles         # alles in einem Lauf
```

## Schritte

| Befehl | Was | Ergebnis |
|---|---|---|
| `zust fetch [id] [--force]` | Quellen aus `config/sources.yaml` laden, ZIPs entpacken; daneben `<datei>.meta.json` mit URL, Größe, SHA-256 und Abrufdatum. Mit `--datei <pfad>` eine von Hand geladene Datei übernehmen (Abrufdatum: Änderungszeit der Datei) | `data/raw/<id>/` |
| `zust tabelle` | VG25 + GV-ISys verknüpfen und prüfen, dazu die Berliner Bezirke | `data/interim/gemeinden_attr.json`, `data/review/tabelle-bericht.json` |
| `zust kontakte [--land TH] [--nur-cache]` | optional: Kontakt der zuständigen Stelle je Gemeinde aus dem Bundesportal (eine Anfrage je Gemeinde, gedrosselt, mit Cache); für Sachsen, Hessen, das Saarland und Baden-Württemberg die allgemeinen Anschriften aus `lds_sachsen` und `anschriften`, für Berlin und Bremen die Einträge von Hand | `data/interim/kontakte.json`, `data/review/kontakte-review.csv` |
| `zust laender` | Regeln über alle Gemeinden (Node), mit Kontakten, falls vorhanden; Größen je Datei | `data/zustaendigkeit/<lkz>.json`, `index.json`, `data/review/zustaendigkeit-review.csv` |
| `zust grenzen [--dry-run]` | VG25-Flächen und Berliner Bezirke → FlatGeobuf → tippecanoe → tile-join; meldet die Größe, warnt über 100 MB | `data/zustaendigkeit/gemeinden.pmtiles` |
| `zust manifest` | Manifest mit Label, Quellenvermerk, Datenstand und Größe | `data/manifest.json` |
| `zust pruefen [--n 200] [--grenze 20]` | feste Punkte und Stichprobe gegen die Grenzschicht | Ausgabe, `data/review/grenzpunkte.csv` |
| `zust alles [--force]` | alle Schritte nacheinander | |

`zust laender` muss vor `zust grenzen` laufen: Die Grenzschicht übernimmt aus den Landesdateien
die Felder `eg`, `sg` und `ko` für die Einfärbung.

### Kontakte aus dem Bundesportal

Für die Leistung „Aufstellung von Verkehrszeichen anregen" pflegen die Länder im Portalverbund,
welche Stelle für eine Gemeinde zuständig ist – Stand 10/2026 in BB, BY, MV, NI, NW, RP, SH, ST
und TH. `zust kontakte` fragt die (nicht dokumentierte) API des Bundesportals je Gemeinde ab, eine
Anfrage pro Sekunde; der Cache liegt in `data/raw/bundesportal/<LAND>/`, ein abgebrochener Lauf
setzt fort. `zust alles` ruft den Schritt nicht auf.

Je Gemeinde gibt es zwei Kontakte, einen je Rolle: die Kreisebene, also Landratsamt bzw.
kreisfreie Stadt (`waehle_kreis`), und die Gemeinde selbst, also Rathaus oder
Verwaltungsgemeinschaft (`waehle_gemeinde`). Stellen ohne Telefon, E-Mail oder Web scheiden aus.
E-Mail-Adressen mit Personennamen und Links zu sozialen Netzwerken fallen weg, Kontaktpersonen
werden nie übernommen. Auf der Kreisebene scheiden fremde Fachbereiche aus (Gewerbe,
Fahrerlaubnis, Zulassung …); von den übrigen gewinnt die Stelle mit „Verkehr" im Namen oder in der
Adresse. Hängt eine Gemeinde die Leistung nur an einen allgemeinen Fachbereich (Bürgerbüro,
Standesamt), gilt er trotzdem als ihr Kontakt, dann ohne den Namen des Fachbereichs. Stellen
ohne Behördennamen („Fachdienst Verkehr") erkennt die Auswahl an der Domain ihrer E-Mail oder
Webseite (`verkehr@henstedt-ulzburg.de`). Welche Rolle
eine Auskunft braucht, entscheiden die Regeln (`js/resolve.js`). Der Build übernimmt einen Kontakt
nur, wenn seine Stelle in den Ergebnissen der Gemeinde vorkommt.

Dazu kommt je Gemeinde das Urteil `wahl` (`bundesportal.waehle`). `passt` heißt, das Portal nennt
dieselbe Stelle wie die Kreisregel. `stvb` heißt, es nennt eine andere Stelle, die sich
Straßenverkehrsbehörde nennt. Die übrigen Werte sind `mehrdeutig` (gleich gute Stellen
verschiedener Behörden), `fremd` und `keine`. Die Regeln nutzen das Urteil: `passt` hebt „nur
Ebene" auf „vermutlich". `stvb` macht in Mecklenburg-Vorpommern eine Stadt mit 17.000 bis 20.000
Einwohnern zur zuständigen Stelle (Übergangsregel); sonst – auch in Thüringen, wo die Städte auf
Antrag in einer Liste stehen – steht die Gemeinde als Alternative da. Die Review-CSV zeigt alle
Stellen mit Punkten.

Lücken (`luecken_fuellen`): Fehlt einer Gemeinde ein Kontakt, gilt zuerst ein Eintrag von Hand aus
`config/kontakte_ergaenzt.yaml`. Er ist von der Webseite der Behörde abgeschrieben, mit Datum, und
gilt für einen ganzen Kreis (Kreis-ARS) oder für eine Gemeinde und eine Rolle (Gemeinde-ARS mit
`rolle`). Sonst gilt für die Kreisebene der Kontakt, den das Portal für die übrigen Gemeinden des
Kreises nennt, und für die Gemeinde in einem Amt oder einer Verwaltungsgemeinschaft der Kontakt
des Verbands, den es für die übrigen Mitglieder nennt.
Im Telefonfeld des Portals steht die Beschriftung hinter der Nummer („03631 911-6303",
„Straßenverkehr"); Nummern und Postfächer für den Straßenverkehr kommen nach vorn.

In die Landesdateien gehen nur die Kontakte der Länder aus `freigegeben` in `sources.yaml` –
weitere Länder dürfen schon im Cache liegen. Den Link auf die Seite der Gemeinde im Portal
(`bundesportal_region`) bekommt jedes Land aus der Länderliste der Leistung (`meta.portal` in
`kontakte.json`); Länder, die die Leistung nicht im Portal führen, bekommen keinen.

### Kontakte aus Verzeichnissen (Sachsen, Hessen, Saarland, Baden-Württemberg)

Sachsen, Hessen, das Saarland und Baden-Württemberg führen die Leistung nicht im Bundesportal. Für
sie nimmt `zust kontakte` die Anschriften der Gemeinde- und Kreisverwaltungen aus zwei
Verzeichnissen (`anschriften.py`), wenn deren Dateien unter `data/raw/` liegen:

- **Sachsen:** das Gemeindeverzeichnis der Landesdirektion (Quelle `lds_sachsen`) mit Anschrift,
  Telefon, E-Mail und Webseite. Die CSV gibt es nur über den Knopf „Download csv-File" auf der
  Seite; übernehmen mit `uv run zust fetch lds_sachsen --datei ~/Downloads/LDS_Gemeindeverzeichnis_Sachsen.csv`.
- **Hessen, Saarland und Baden-Württemberg** (`laender` der Quelle `anschriften`): das
  Anschriftenverzeichnis der Statistischen Ämter für ganz Deutschland, nur mit Anschrift und
  E-Mail; `uv run zust fetch anschriften` lädt es (xlsx, gelesen über GDAL). Zuordnung über den
  ARS; fehlt er (eine Stadt wurde nach dem Stichtag der Gemeindetabelle umgeschlüsselt, etwa
  Hanau), über den Namen.

```bash
uv run zust kontakte --nur-cache && uv run zust laender && uv run zust grenzen
```

Kreisebene ist das Landratsamt bzw. die Kreisverwaltung (Zeile mit Kreisschlüssel) oder die
kreisfreie Stadt, die Gemeinde ihr Rathaus. Gehört sie zu einer Verwaltungsgemeinschaft bzw. einem
Verwaltungsverband, dessen Sitz eine andere Gemeinde des Verbands ist, steht in `kontakte.json` dazu
die Rolle `verband`: das Rathaus am Sitz (`null`, wenn das Verzeichnis den Sitz nicht kennt). Der
Build nimmt sie, wenn von der Gemeinde nur der Verband in den Ergebnissen vorkommt (Stelle `v…`,
auch als Alternative), nicht die Gemeinde selbst (`g…`) – in Baden-Württemberg kann je nach Gemeinde
das eine oder das andere örtliche Straßenverkehrsbehörde sein. Ein Eintrag von Hand für die Rolle
`gemeinde` gilt auch für den Verband, einer mit `rolle: verband` nur für ihn. Das ist die
**allgemeine Anschrift**, nicht die der Straßenverkehrsbehörde: Die Kontakte tragen `allgemein`, die
Karte sagt das dazu. Bürgermeister und Fax bleiben weg; E-Mail-Adressen nur als Funktionspostfach
oder mit dem Namen der Gemeinde („koenigswalde@", „gv-jonsdorf@"), nicht `presse@` oder
`webmaster@`. Einträge von Hand (`config/kontakte_ergaenzt.yaml`) gehen vor – so lässt sich ein
Landratsamt durch seine Verkehrsstelle ersetzen. Datum (Abruf bzw. Stand des Verzeichnisses) und
Quellenvermerk gehen in die Landesdatei.

### Kontakte nur von Hand (Berlin, Bremen)

Länder ohne die Leistung im Bundesportal und ohne eigene Quelle stehen in
`config/kontakte_ergaenzt.yaml` unter `nur_von_hand` – heute Berlin und Bremen. Ihre Kontakte
kommen nur aus den Einträgen dort (`bundesportal.ergaenze_von_hand`): in Berlin die
Senatsverwaltung als Kreisebene (Schlüssel `11000`) und je Bezirk das Bezirksamt als Gemeinde
(Schlüssel des Bezirks, `rolle: gemeinde`); in Bremen das Amt für Straßen und Verkehr und der
Magistrat Bremerhaven als Kreisebene (`04011`, `04012`). Welche Stelle welche Rolle hat, sagt
`kontaktRolle` in `js/resolve.js` (in Python `grenzen.kontakt_rolle`); die Polizei Bremen, die
Alternative in der Stadt Bremen, hat keine. Wie bei Sachsen trägt das Land in `kontakte.json` unter
`meta.laender` `kurz` („Webseiten der Behörden") und `quelle`; `abgerufen` ist der Stand des
jüngsten Eintrags. Ein Eintrag mit `allgemein: true` ist nur die allgemeine Anschrift der
Verwaltung – in Berlin die Zentrale der Senatsverwaltung, weil die Abteilung Verkehrsmanagement nur
ein Postfach für Arbeitsstellen nennt. Stammt ein Eintrag nicht von der Webseite der Behörde, sagt
`quelle` woher (Bremerhaven: ein Schreiben der Straßenverkehrsbehörde). Hamburg fehlt: Welches
Polizeikommissariat zuständig ist, wissen wir nicht. Auch hierfür genügt `zust kontakte --nur-cache`.

### Berlin: die zwölf Bezirke

Berlin ist eine Gemeinde, Straßenverkehrsbehörde sind aber die Bezirksämter (für das
übergeordnete Straßennetz die Senatsverwaltung). Deshalb bekommt jeder Bezirk einen eigenen
Eintrag und eine eigene Fläche (`zustkarte.berlin`):

- Schlüssel `1100000000` + Bezirksnummer, also `110000000001` (Mitte) bis `110000000012`
  (Reinickendorf), Nummern und Namen in `config/berlin.yaml`. Amtliche Gemeindeschlüssel sind das
  nicht. Die Einträge übernehmen Land und Kreis von Berlin, haben aber kein Textkennzeichen und
  keine Einwohner; das Feld `bezirk` trägt Nummer und Namen. Der Eintrag für ganz Berlin
  (`110000000000`) bleibt.
- Die Flächen kommen amtlich aus dem Geoportal Berlin (Quelle `berlin_bezirke`: WFS „ALKIS
  Berlin Bezirke", Datenlizenz Deutschland – Zero 2.0) in einen eigenen Layer `bezirke`. Der
  Layer `gemeinden` bleibt, wie er ist: Berlin ist dort eine Fläche, eingefärbt wie die meisten
  Bezirke. In Berlin schlägt die Karte im Layer `bezirke` nach; wo dort nichts liegt (ein paar
  Meter am Stadtrand, wo die Bezirke aus ALKIS und das generalisierte VG25 voneinander
  abweichen), gilt der Eintrag für ganz Berlin.
- Zugeordnet wird über den Namen. `zust grenzen` liest die Bezirke vor allem anderen und bricht
  ab, wenn ein Bezirk fehlt, ein Objekt zu mehreren Bezirken passt oder die Flächen nicht um
  Berlin liegen (Koordinatensystem?). Fehlt die Datei, entstehen die Kacheln ohne Layer
  `bezirke`, Berlin bleibt eingefärbt wie sein eigener Eintrag, und die festen Punkte in Berlin
  schlagen fehl.

## Ordner

```text
pipeline/
  config/
    sources.yaml      Quellen (URL, Stand, Lizenz, Quellenvermerk) und veröffentlichte Dateien
    tiles.yaml        tippecanoe-Profile der Layer gemeinden, kreise und bezirke
    pruefungen.yaml   Erwartungen für die Prüfungen (Große Kreisstädte je Land)
    berlin.yaml       die zwölf Berliner Bezirke (Nummer, Name)
    kontakte_ergaenzt.yaml  Kontakte von Hand; Länder nur von Hand (`nur_von_hand`)
  data/               nicht im Git
    raw/<id>/         Downloads; raw/bundesportal/<LAND>/ Antworten je Gemeinde
    interim/          gemeinden_attr.json, kontakte.json, FlatGeobuf
    zustaendigkeit/   veröffentlichte Dateien (Bucket-Präfix zustaendigkeit/)
    review/           Berichte, Review-CSV, Grenzpunkte (nicht veröffentlichen)
  src/zustkarte/      cli, fetch, vg25, gv100ad, tabelle, berlin, bundesportal, anschriften, grenzen,
                      tiles, manifest, config
  tests/              pytest mit kleinen Testdaten (VG25-GeoPackage und GV100AD-Auszug)
```

## Veröffentlichen

Die Dateien aus `data/zustaendigkeit/` kommen unverändert in den Bucket der Unfallkarte, unter den
Präfix `zustaendigkeit/` (`b2` muss angemeldet sein):

```bash
b2 sync --no-progress data/zustaendigkeit b2://unfallkarte-data-v2/zustaendigkeit
```

Nur diesen Ordner spiegeln: `data/manifest.json` bleibt lokal, denn in der Wurzel des Buckets liegt
das Manifest der Unfallkarte. `b2 sync` lädt nur Geändertes und löscht nichts; mit `--dry-run`
zeigt er vorher, was er täte. Danach den Git-Tag `v<regeln.version>` setzen (CHANGELOG). Die Karte
selbst geht mit jedem grünen CI-Lauf auf `main` nach GitHub Pages.

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
- **Gemeindeverzeichnis Sachsen** (`lds_sachsen`, optional): ohne Download-Link, von Hand laden
  (siehe „Kontakte aus Verzeichnissen"). Einmal im Jahr neu laden, mit den übrigen Quellen.
- **Anschriftenverzeichnis** (`anschriften`, optional): erscheint jährlich zum Stichtag 31.01.,
  die URL ändert sich mit jeder Ausgabe. Dann `url` und `stand` in `sources.yaml` anpassen.
- **Berliner Bezirke** (`berlin_bezirke`, optional): WFS des Geoportals Berlin (`wfs: true`).
  `zust fetch` liest die Objektart aus GetCapabilities – bietet der Dienst mehrere an, steht die
  richtige unter `objektart` – und lädt alle Objekte als GeoJSON in ETRS89/UTM 33N; der
  Dateiname steht unter `datei`. Antwortet der Dienst mit einer Fehlermeldung statt GeoJSON,
  meldet `zust fetch` das und überspringt die Quelle. Die Bezirksgrenzen ändern sich selten; mit
  den übrigen Quellen einmal im Jahr neu laden (`--force`).
- Sind BKG, Destatis oder das Geoportal Berlin nicht erreichbar, `zust fetch` auf einem anderen
  Rechner laufen lassen oder die Dateien von Hand übernehmen (`zust fetch <id> --datei <pfad>`);
  die übrigen Schritte lesen nur von `data/raw/<id>/`.

## Prüfungen

`zust tabelle` bricht ab, statt halbe Daten durchzulassen:

- Datenstand VG25 = Datenstand GV-ISys;
- jeder ARS 12-stellig und eindeutig, Land passt zum Schlüssel;
- jede Gemeinde mit Kreis; Verband (6. Stelle `5`) und Regierungsbezirk (`FK_S3 = R`) vorhanden;
- VG25 und GV-ISys mit derselben Gemeindemenge, gemeindefreie Gebiete eingeschlossen. Ausnahmen:
  die Flächen des deutsch-luxemburgischen Kondominiums (nur VG25, `BEZ = Kondominium`; sie
  übernehmen die angrenzende Gemeinde aus `SDV_ARS`) und unbewohnte gemeindefreie Gebiete ohne
  Fläche (nur GV-ISys, Textkennzeichen 66; nur Warnung);
- kreisfreie Städte in beiden Quellen gleich, je kreisfreiem Kreis genau eine Gemeinde (die
  Berliner Bezirke zählen nicht mit);
- Große Kreisstädte (Textkennzeichen 67) je Land in der Toleranz aus `pruefungen.yaml`, in
  anderen Ländern keine. Sachsen führt sie im GV-ISys nicht als 67 (siehe dort).

`zust grenzen` bricht ab, wenn Gemeinden oder Berliner Bezirke in den Landesdateien fehlen oder
die Bezirksflächen nicht passen (siehe oben). `zust pruefen` endet mit Fehler, wenn ein fester
Punkt den falschen ARS oder in Berlin den falschen Bezirk ergibt, ein Punkt in mehr als einer
Fläche liegt oder an einer Grenze eine Überlappung auftaucht.

## Tests

```bash
uv run pytest          # Einheiten und Ende-zu-Ende mit Testdaten (Ende-zu-Ende braucht tippecanoe, node, npm install)
uvx ruff check && uvx ruff format --check
```

Die Testdaten in `tests/conftest.py` folgen dem Aufbau der VG25-Dokumentation: kreisfreie Stadt,
Große Kreisstadt mit Loch und darin die Exklave einer Nachbargemeinde, Stadtstaaten,
gemeindefreies Gebiet, Region Hannover, Verbandsgemeinde in RP mit angrenzendem Kondominium,
ein Datensatz mit `GF = 8`. Dazu die Berliner Bezirke als GeoJSON in EPSG:25833: ein Raster,
das nach Westen über Berlin hinausragt und im Osten einen Saum lässt.
