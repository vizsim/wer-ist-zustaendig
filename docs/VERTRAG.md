# Vertrag: Dateien für Konsumenten

Dieses Dokument ist die Schnittstelle zwischen „Wer ist zuständig?" und allen, die die Dateien
nutzen – zuerst die Karte in diesem Repo, dann die Unfallkarte.

Stand: **Schema 1** · Regeln 0.7.0 (Phase 2: Landesregeln für Bayern, Thüringen und Schleswig-Holstein) · Datenstand 31.12.2025

## Regeln für alle Dateien

- **Felder werden nur ergänzt, nie umbenannt oder umgedeutet.** Konsumenten ignorieren Felder,
  die sie nicht kennen.
- **Ein Bruch erhöht `schema`.** Konsumenten prüfen `schema` und fallen bei einem unbekannten
  Wert auf ihr bisheriges Verhalten zurück.
- **Stabile Dateinamen**, keine Version im Namen. Version und Datenstand stehen in den Dateien.
- **Schlüssel sind Strings:** ARS 12-stellig, Kreis 5-stellig (ARS-Präfix), AGS 8-stellig.
- **Ids von Stellen sind stabil** (siehe unten). Ids von Ergebnissen sind es nicht: Sie hängen am
  Inhalt und sind nur innerhalb einer Landesdatei gültig.

## Wo die Dateien liegen

| Ort | Pfad |
|---|---|
| lokal (Build) | `pipeline/data/zustaendigkeit/` |
| Bucket (geplant) | `https://tiles.vizsim.de/file/unfallkarte-data-v2/zustaendigkeit/` – eigener Präfix im Bucket der Unfallkarte |

Die Karte lädt lokal zuerst (auf `localhost`) und fällt sonst auf den Bucket zurück; mit
`?daten=<url>` lässt sich eine andere Basis setzen – nur auf demselben Ursprung wie die Karte
oder im Bucket, auf `localhost` beliebig.

| Datei | Inhalt | Größe |
|---|---|---|
| `gemeinden.pmtiles` | Grenzschicht: Layer `gemeinden` und `kreise` | 30 MB; über 100 MB erst abstimmen |
| `index.json` | Übersicht: Regel- und Datenstand, Quellen, Liste der Länder | wenige KB |
| `<lkz>.json` (16, z. B. `by.json`) | Zuständigkeit je Gemeinde und Straßenklasse | 2–1 858 KB je Land, gzip höchstens 188 KB |
| `../manifest.json` | Manifest der Pipeline (Muster Unfallkarte/SVZ) | wenige KB |

Größen aus dem Lauf vom 03.10.2026 (Datenstand 31.12.2025, Regeln 0.5.0, Kontakte für BY und TH):
Landesdateien zusammen 3 616 KB, gzip 368 KB. Am größten ist `by.json`, weil dort jede Gemeinde
für ihre Gemeindestraßen ein eigenes Ergebnis hat. `zust grenzen` und `zust laender` geben die
Größen bei jedem Lauf aus.

## `gemeinden.pmtiles`

PMTiles v3, Vektorkacheln (MVT) im Web-Mercator-Raster. Geometrie: VG25, nur Datensätze mit
`GF = 9`, nach EPSG:4326. Nachbarflächen teilen ihre Grenzen exakt (`--detect-shared-borders`),
kleine Flächen bleiben erhalten. Unter der höchsten Zoomstufe eines Layers sind die Kacheln
gröber aufgelöst (1024 statt 4096 Einheiten, `low_detail` in `pipeline/config/tiles.yaml`) –
für die Darstellung genügt das; nachgeschlagen wird in z12 mit voller Auflösung.

| Layer | Zoom | Feld | Typ | Inhalt |
|---|---|---|---|---|
| `gemeinden` | 7–12 | `ars` | String (12) | Amtlicher Regionalschlüssel |
| | | `gen` | String | Gemeindename (VG25 `GEN`) |
| | | `eg` | String | Art der Stelle für Gemeindestraßen: `kreis`, `stadt` (kreisfrei oder selbst zuständig), `gemeinde`, `stadtstaat`; später `verband` |
| | | `sg` | String | Sicherheit dieser Stelle: `belegt`, `vermutlich`, `nur Ebene` |
| `kreise` | 4–10 | `ars` | String (5) | Kreis (ARS-Präfix) |
| | | `name` | String | voller Name nach `NBD` („Landkreis Freising", „Region Hannover") |
| | | `art` | String | `kreis`, `stadt` (kreisfrei), `stadtstaat` |
| | | `eg`, `sg` | String | was für die meisten Gemeinden des Kreises gilt (Werte wie im Layer `gemeinden`); für die Übersicht unter Zoom 7, wo es keine Gemeinden gibt |

`eg` und `sg` dienen nur der Einfärbung; die Auskunft kommt immer aus der Landesdatei.

**Nachschlagen am Punkt:** Kachel in `maxZoom` (12) bestimmen, Layer `gemeinden` dekodieren,
Punkt in Polygon nach der Gerade-Ungerade-Regel über alle Ringe eines Features
(`js/lookup.js`: `kachelFuerPunkt`, `featureAmPunkt`). Auflösung in z12 etwa 1–2 m. In einer
MapLibre-Karte genügt `queryRenderedFeatures` auf dem Flächenlayer.

**Grenzfälle:** VG25 schneidet Gemeinden an Nord-, Ostsee und Bodensee nicht an der Küste ab;
ein Punkt auf dem Wasser kann also einer Gemeinde zugeordnet sein. Außerhalb Deutschlands gibt
es keinen Treffer. Das gemeinsame deutsch-luxemburgische Hoheitsgebiet (Mosel, Sauer, Our) liegt
als 25 eigene Flächen mit eigenem ARS vor (VG25 `BEZ = Kondominium`, im Layer `kreise` drei
eigene Kreise); die Landesdatei nennt dort die Stelle der angrenzenden Gemeinde, „nur Ebene".

## `index.json`

```json
{
  "schema": 1,
  "regeln": { "version": "0.7.0", "phase": 2, "stand": "2026-10-03" },
  "daten": {
    "gebiet": "VG25 31.12.2025",
    "status": "GV-ISys 31.12.2025",
    "einwohner": "GV-ISys 31.12.2025",
    "aenderungen": "GV-ISys 31.10.2026"
  },
  "erzeugt": "2026-10-01",
  "hinweis": "Vermutlich zuständig – kein Rechtsrat. Bitte vor dem Absenden prüfen.",
  "bundesportal": "https://verwaltung.bund.de/leistungsverzeichnis/de/leistung/99108014042000",
  "quellen": [{ "id": "vg25", "label": "…", "lizenz": "CC BY 4.0", "vermerk": "© BKG (2026) CC BY 4.0, …" }],
  "laender": [
    { "lkz": "BY", "name": "Bayern", "datei": "by.json", "gemeinden": 2221,
      "sicherheit": { "belegt": 2056, "vermutlich": 165, "nur Ebene": 0 }, "kontakte": 2221 }
  ]
}
```

- `daten.aenderungen` ist `null`, wenn keine neuere Ausgabe des Gemeindeverzeichnisses
  eingelesen wurde.
- `laender[].sicherheit` zählt Gemeinden nach der Sicherheit für Gemeindestraßen.
- `laender[].kontakte` (optional): Zahl der Gemeinden mit Kontakt; nur bei Ländern, für die
  Kontakte abgerufen wurden (`zust kontakte`).
- `quellen[].vermerk` ist der Quellenvermerk, den Konsumenten anzeigen müssen.

## `<lkz>.json` – eine Datei je Land

Kopf wie `index.json` (`schema`, `regeln`, `daten`, `erzeugt`, `hinweis`, `bundesportal`,
`quellen`), dazu `land` (Kürzel) und `name`. Danach vier Tabellen, je ein Eintrag pro Zeile und
nach Schlüssel sortiert.

Länder, die die Leistung im Bundesportal führen (Stand 10/2026: BB, BY, MV, NI, NW, RP, SH, ST,
TH), haben im Kopf `bundesportal_region`: den Link auf die Seite der Leistung für eine Gemeinde,
`{ars}` wird ersetzt. Länder, deren Kontakte eingebunden sind (`zust kontakte`, `freigegeben` in
`sources.yaml`), haben zusätzlich:

- im Kopf `daten.kontakte` („Bundesportal 02.10.2026") und einen Eintrag in `quellen`;
- eine fünfte Tabelle `kontakte` (siehe unten) und je Gemeinde die Felder `kontakt` und
  `kontakt_gemeinde`.

Beispiel: eine bayerische Gemeinde, gekürzt. Für Gemeindestraßen ist sie selbst zuständig, für
die übrigen Klassen das Landratsamt. Die Kontaktangaben sind hier ausgelassen.

```json
{
  "stellen": {
    "fba":           { "id": "fba", "name": "Fernstraßen-Bundesamt – Straßenverkehrsbehörde", "ebene": "bund", "art": "bund" },
    "g092740128128": { "id": "g092740128128", "name": "Gemeinde Essenbach – Straßenverkehrsbehörde", "ebene": "oertliche", "art": "gemeinde" },
    "k09274":        { "id": "k09274", "name": "Landratsamt Landshut – Straßenverkehrsbehörde", "ebene": "untere", "art": "kreis" }
  },
  "ergebnisse": {
    "e874b7e9e": { "stelle": "g092740128128", "sicherheit": "belegt",
                   "grund": "In Bayern ist die Gemeinde für ihre Gemeindestraßen selbst Straßenverkehrsbehörde.",
                   "quelle": "Art. 2 Abs. 1 Nr. 1, Art. 3 Abs. 1 und Art. 6 ZustGVerk (Bayern), Fassung vom 17.12.2024",
                   "alternative": null },
    "ee99dca80": { "stelle": "k09274", "sicherheit": "belegt",
                   "grund": "Für Kreis-, Staats- und Bundesstraßen ist in Bayern das Landratsamt Straßenverkehrsbehörde.",
                   "quelle": "Art. 2 Abs. 1 Nr. 2 ZustGVerk (Bayern), Fassung vom 17.12.2024",
                   "alternative": null }
  },
  "kontakte": {
    "c7da9c47b": { "name": "Landratsamt Landshut - …", "adresse": "…", "telefon": ["…"], "email": ["…"], "web": ["…"] },
    "ca2304e20": { "name": "Markt Essenbach - …", "adresse": "…", "telefon": ["…"], "email": ["…"], "web": ["…"] }
  },
  "kreise": { "09274": "Landkreis Landshut" },
  "gemeinden": {
    "092740128128": { "name": "Gemeinde Essenbach", "kreis": "09274", "ew": 11970,
                      "z": { "G": "e874b7e9e", "K": "ee99dca80", "L": "ee99dca80", "B": "ee99dca80" },
                      "kontakt": "c7da9c47b", "kontakt_gemeinde": "ca2304e20" }
  }
}
```

### `stellen`

| Feld | Inhalt |
|---|---|
| `id` | stabile Id, siehe unten |
| `name` | amtlicher Name mit Zusatz „– Straßenverkehrsbehörde" |
| `ebene` | `bund`, `untere`, `oertliche` (Gemeinde oder Amt als örtliche Behörde, etwa in Bayern für Gemeindestraßen); später `obere` |
| `art` | `bund`, `kreis`, `stadt`, `gemeinde`, `verband`, `stadtstaat` |

| Id | Stelle |
|---|---|
| `fba` | Fernstraßen-Bundesamt (Autobahnen); in jeder Landesdatei |
| `k` + Kreis-ARS (5) | Kreisebene bzw. kreisfreie Stadt, z. B. `k09178`, `k09162` |
| `g` + ARS (12) | eine Gemeinde: Große Kreisstadt, Stadt mit eigener Straßenverkehrsbehörde, in Bayern jede kreisangehörige Gemeinde für ihre Gemeindestraßen |
| `v` + Verbands-ARS (9) | ein Verband: in Schleswig-Holstein das Amt (Halten und Parken, Baustellen, Veranstaltungen) |
| `hb-asv`, `hb-bhv` | Bremen: Amt für Straßen und Verkehr; Magistrat Bremerhaven |
| `be-bezirk`, `be-senat` | Berlin: Bezirksamt; Senatsverwaltung (übergeordnetes Netz) |
| `hh-pk` | Hamburg: Polizei, zuständiges Polizeikommissariat |

### `ergebnisse`

| Feld | Inhalt |
|---|---|
| `stelle` | Id in `stellen` |
| `sicherheit` | `belegt` (Primärquelle, getestete Regel; heute BY und HB) · `vermutlich` (Regel aus Sekundärquelle wie in TH, Eingabe unsicher – oder das Land nennt im Bundesportal dieselbe Stelle) · `nur Ebene` (Land noch offen) |
| `grund` | ein Satz für Popup und Report |
| `quelle` | Fundstelle mit Fassung bzw. Verweis auf das Konzept |
| `alternative` | `null` oder `{ stelle, bedingung }`; `bedingung` ist ein Satzteil („falls nur die Gemeindestraße betroffen ist") |

Die Id ist `e` + FNV-1a (32 bit, hex) über das JSON des Ergebnisses: gleiche Inhalte, gleiche Id.
Konsumenten lesen sie nur als Verweis.

### `gemeinden`

| Feld | Inhalt |
|---|---|
| Schlüssel | ARS (12) |
| `name` | voller Name nach `NBD` |
| `kreis` | Kreis-ARS (5), Name in `kreise` |
| `verband` | optional: voller Name des Verbands (nur bei 6. ARS-Stelle `5`) |
| `ew` | optional: Bevölkerung laut GV-ISys |
| `z` | Ergebnis-Id je Straßenklasse `G`, `K`, `L`, `B`. Autobahnen (`A`) sind überall gleich und stehen nicht in der Tabelle |
| `kontakt` | optional: Id in `kontakte` – Kontakt der Kreisebene (Landratsamt) bzw. der kreisfreien Stadt; nur, wenn diese Stelle (`k…`) in den Ergebnissen der Gemeinde vorkommt (Auswahl siehe `pipeline/README.md`) |
| `kontakt_gemeinde` | optional: Id in `kontakte` – Kontakt der Gemeinde selbst (Rathaus; in Bayern oft die Verwaltungsgemeinschaft, in Schleswig-Holstein das Amt); nur, wenn die Gemeinde (`g` + ARS) oder ihr Verband (`v` + ARS) in den Ergebnissen vorkommt, als Stelle oder Alternative |
| `nachbar` | optional: ARS der angrenzenden Gemeinde, nur bei Kondominium-Flächen |
| `aenderung` | optional: `{ art, stand, name_neu? }`, wenn die Gemeinde nach dem Datenstand aufgelöst, umgeschlüsselt oder umbenannt wurde |

### `kontakte` (optional)

| Feld | Inhalt |
|---|---|
| `name` | Name der Stelle laut Bundesportal, oft mit Fachbereich („Landratsamt Eichsfeld - Amt für Öffentliche Sicherheit und Ordnung"). Nennt eine Gemeinde dort nur einen allgemeinen Fachbereich (Bürgerbüro, Standesamt), steht nur ihr Name da |
| `adresse` | Hausanschrift oder `null` |
| `telefon`, `email`, `web` | Listen, können leer sein. Nummern und Postfächer für den Straßenverkehr stehen vorn, Zulassung und Fahrerlaubnis hinten. Nur Funktionspostfächer, keine Adressen mit Personennamen |
| `quelle` | optional: Herkunft, wenn der Kontakt nicht aus dem Bundesportal stammt („Webseite der Behörde, Stand 03.10.2026") |

Die Id ist `c` + FNV-1a über das JSON des Kontakts, gültig nur innerhalb der Landesdatei. Welcher
Kontakt zu welcher Stelle gehört, ordnet `auswahl` zu (siehe unten). Der Name des Kontakts nennt
oft den Fachbereich; Konsumenten zeigen ihn mit an.

### Nachschlagen

`auswahl(landesdatei, ars, klassen)` aus `js/resolve.js` macht aus den Klassen einer Auswahl
(`strassenklasse.js`: `A B L K G unklar`) eine Auskunft:

- nur Autobahn → Fernstraßen-Bundesamt, `keinBrief: true`;
- sonst die höchste Klasse ohne `A`; ist eine Autobahn dabei, ein Hinweis;
- `unklar` (z. B. `tertiary` ohne `ref`) → Ergebnis für `K`, die Stelle für Gemeindestraßen als
  Alternative; Sicherheit höchstens „vermutlich";
- Gemeindestraße in einer Auswahl mit höherer Klasse → deren Stelle als Alternative, wenn sie
  sich unterscheidet;
- leere Klassenliste → wie `unklar`, mit Hinweis „Keine Straße erkannt".

Rückgabe: `{ ars, gemeinde, verband, kreis, land, stand, regeln, aenderung, klasse, zustaendig,
sicherheit, grund, quelle, alternative, hinweise, keinBrief, kontakt, bundesportal }`:

- `zustaendig` ist ein Stellen-Objekt, `alternative` `null` oder `{ stelle, bedingung, kontakt }`.
- `kontakt` ist der Kontakt genau der zuständigen Stelle: `kontakt_gemeinde` für die Gemeinde
  (`g` + ARS) und ihren Verband (`v` + ARS), `kontakt` für die Kreisebene (`k…`). Für Bund und
  Stadtstaaten und ohne Daten ist er `null`, bei `keinBrief` immer. Den Kontakt einer anderen
  Stelle gibt `auswahl` nie aus.
- `alternative.kontakt` gilt ebenso für die Stelle der Alternative.
- `bundesportal` ist der Link auf die Seite der Gemeinde im Bundesportal, wenn das Land die
  Leistung dort führt (`bundesportal_region`); sonst `null`, ebenso bei `keinBrief`. Der
  allgemeine Link steht weiter im Kopf jeder Datei (`bundesportal`).

`aufsicht` folgt mit Phase 6.

## Zwischenprodukt `gemeinden_attr.json` (nicht veröffentlicht)

Ausgabe von `zust tabelle`, Eingabe von `tools/build-laender.mjs`. Liegt in
`pipeline/data/interim/`. Das Beispiel stammt aus den Testdaten; Zahlen wie `ibz` und `ew` sind
dort erfunden.

```json
{
  "schema": 1,
  "meta": { "erzeugt": "2026-10-01", "stand": { "gebiet": "…", "status": "…", "einwohner": "…", "aenderungen": null },
            "quellen": [{ "id": "vg25", "label": "…", "lizenz": "…", "vermerk": "…" }] },
  "gemeinden": {
    "091780124124": {
      "ars": "091780124124", "ags": "09178124", "gen": "Freising", "name": "Freising",
      "bez": "Große Kreisstadt", "ibz": 61, "land": "BY", "gemeindefrei": false,
      "kreis": { "ars": "09178", "gen": "Freising", "bez": "Landkreis", "ibz": 43, "nbd": "ja",
                 "name": "Landkreis Freising", "kreisfrei": false },
      "verband": null,
      "rb": { "ars": "091", "gen": "Oberbayern", "name": "Regierungsbezirk Oberbayern" },
      "tkz": [67], "ew": 50721, "gebietsaenderung": null, "kondominium": null
    }
  }
}
```

- `verband` nur bei 6. ARS-Stelle `5`: `{ ars (9), gen, bez, ibz, name, sitz }` (`sitz` =
  `SDV_ARS`, die Gemeinde, die die Verwaltung führt).
- `rb` nur bei `FK_S3 = R` und 3. ARS-Stelle ≠ `0`.
- `tkz`: Textkennzeichen aus GV-ISys. Genutzt werden 61/62 (kreisfreie Stadt, Stadtkreis), 63
  (Stadt), 65/66 (gemeindefreies Gebiet) und 67 (Große Kreisstadt); die übrigen Werte stehen in
  der Satzbeschreibung des GV100AD. Nicht mit `ibz` (Bezeichnungsliste des BKG) verwechseln.
- `ew`: Bevölkerung laut GV-ISys; die Thüringer Regel unterscheidet danach (über 30.000, über
  10.000 Einwohner).
- `gemeindefrei`: 6. ARS-Stelle `9`.
- `kondominium`: `null` oder `{ nachbar }` für die Flächen des deutsch-luxemburgischen
  Kondominiums (VG25 `BEZ = Kondominium`). `nachbar` ist der ARS der angrenzenden Gemeinde
  (`SDV_ARS`); `kreis`, `verband` und `rb` sind ihre, `tkz` ist leer, `ew` `null`.

## `manifest.json`

```json
{ "erzeugt": "2026-10-01", "stand": { "gebiet": "VG25 31.12.2025", … },
  "datasets": {
    "zust_gemeinden": { "file": "zustaendigkeit/gemeinden.pmtiles", "label": "…", "attribution": "…", "date": "VG25 31.12.2025", "bytes": 0 },
    "zust_index":     { "file": "zustaendigkeit/index.json", … } } }
```

## Versionen

| Was | Wo | Wann erhöhen |
|---|---|---|
| `schema` | alle Dateien | Feld entfällt, wird umbenannt oder bekommt eine andere Bedeutung |
| `regeln.version` | `js/resolve.js` → `index.json`, Landesdateien | Patch: Text; Minor: neue Regel oder neues Land; Major: anderes Ergebnisformat |
| `daten` | aus den Quellen | neuer Gebietsstand (jährlich) |
| Git-Tag `v<regeln.version>` | Repo | mit jeder Veröffentlichung im Bucket |

## Für die Unfallkarte (Teil B)

- Dateien unter dem Präfix `zustaendigkeit/` im eigenen Bucket; Quelle in
  `pipeline/config/sources.yaml` der Unfallkarte, Datum aus `index.json`.
- Module als gepinnte Kopie mit Tag, nicht zur Laufzeit von fremder URL: `strassenklasse.js`,
  `namen.js`, `resolve.js`, dazu `laender.js` (ARS → Landesdatei) und, für Werkzeuge ohne Karte,
  `lookup.js`.
- Quellenvermerke aus `index.json` → `quellen` anzeigen; den Hinweis „kein Rechtsrat" mit jeder
  Auskunft.
