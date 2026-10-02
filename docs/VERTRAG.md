# Vertrag: Dateien für Konsumenten

Dieses Dokument ist die Schnittstelle zwischen „Wer ist zuständig?" und allen, die die Dateien
nutzen – zuerst die Karte in diesem Repo, dann die Unfallkarte.

Stand: **Schema 1** · Regeln 0.2.0 (Phase 1) · Datenstand 31.12.2025

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
| `<lkz>.json` (16, z. B. `by.json`) | Zuständigkeit je Gemeinde und Straßenklasse | 2–448 KB je Land, gzip höchstens 45 KB |
| `../manifest.json` | Manifest der Pipeline (Muster Unfallkarte/SVZ) | wenige KB |

Größen aus dem ersten echten Lauf (Datenstand 31.12.2025, Regeln 0.2.0): Landesdateien zusammen
2 164 KB, gzip 221 KB. `zust grenzen` und `zust laender` geben die Größen bei jedem Lauf aus.

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
| | | `eg` | String | Art der Stelle für Gemeindestraßen: `kreis`, `stadt`, `stadtstaat`; ab Phase 2 auch `gemeinde`, `verband` |
| | | `sg` | String | Sicherheit dieser Stelle: `belegt`, `vermutlich`, `nur Ebene` |
| `kreise` | 4–10 | `ars` | String (5) | Kreis (ARS-Präfix) |
| | | `name` | String | voller Name nach `NBD` („Landkreis Freising", „Region Hannover") |
| | | `art` | String | `kreis`, `stadt` (kreisfrei), `stadtstaat` |

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
  "regeln": { "version": "0.2.0", "phase": 1, "stand": "2026-10-02" },
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
    { "lkz": "BY", "name": "Bayern", "datei": "by.json", "gemeinden": 2056,
      "sicherheit": { "belegt": 0, "vermutlich": 25, "nur Ebene": 2031 } }
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
nach Schlüssel sortiert (Beispiel aus den Testdaten, gekürzt):

Länder mit Kontakten aus dem Bundesportal (`zust kontakte`) haben zusätzlich:

- im Kopf `bundesportal_region`: Link auf die Seite der Leistung für eine Gemeinde, `{ars}` wird
  ersetzt; `daten.kontakte` („Bundesportal 02.10.2026") und einen Eintrag in `quellen`;
- eine fünfte Tabelle `kontakte` (siehe unten) und je Gemeinde das Feld `kontakt`.

```json
{
  "stellen": {
    "fba":           { "id": "fba", "name": "Fernstraßen-Bundesamt – Straßenverkehrsbehörde", "ebene": "bund", "art": "bund" },
    "g091780124124": { "id": "g091780124124", "name": "Stadt Freising – Straßenverkehrsbehörde", "ebene": "untere", "art": "stadt" },
    "k09178":        { "id": "k09178", "name": "Landratsamt Freising – Straßenverkehrsbehörde", "ebene": "untere", "art": "kreis" }
  },
  "ergebnisse": {
    "ed61ec08b": { "stelle": "k09178", "sicherheit": "nur Ebene",
                   "grund": "Für kreisangehörige Gemeinden ist meist die Kreisverwaltung zuständig. …",
                   "quelle": "Rückfall Phase 1: Kreisebene (Konzept § 6.1)",
                   "alternative": { "stelle": "g091780124124", "bedingung": "Große Kreisstadt – sie kann selbst zuständig sein" } }
  },
  "kreise": { "09178": "Landkreis Freising" },
  "gemeinden": {
    "091780124124": { "name": "Freising", "kreis": "09178", "ew": 50721,
                      "z": { "G": "ed61ec08b", "K": "ed61ec08b", "L": "ed61ec08b", "B": "ed61ec08b" } }
  }
}
```

### `stellen`

| Feld | Inhalt |
|---|---|
| `id` | stabile Id, siehe unten |
| `name` | amtlicher Name mit Zusatz „– Straßenverkehrsbehörde" |
| `ebene` | `bund`, `untere`; später `obere`, `oertliche` |
| `art` | `bund`, `kreis`, `stadt`, `stadtstaat`; ab Phase 2 auch `gemeinde`, `verband` |

| Id | Stelle |
|---|---|
| `fba` | Fernstraßen-Bundesamt (Autobahnen); in jeder Landesdatei |
| `k` + Kreis-ARS (5) | Kreisebene bzw. kreisfreie Stadt, z. B. `k09178`, `k09162` |
| `g` + ARS (12) | eine Gemeinde, z. B. eine Große Kreisstadt |
| `v` + Verbands-ARS (9) | ein Verband (Amt, Verbandsgemeinde, VG); ab Phase 2 |
| `hb-asv`, `hb-bhv` | Bremen: Amt für Straßen und Verkehr; Magistrat Bremerhaven |
| `be-bezirk`, `be-senat` | Berlin: Bezirksamt; Senatsverwaltung (übergeordnetes Netz) |
| `hh-pk` | Hamburg: Polizei, zuständiges Polizeikommissariat |

### `ergebnisse`

| Feld | Inhalt |
|---|---|
| `stelle` | Id in `stellen` |
| `sicherheit` | `belegt` (Primärquelle, getestete Regel) · `vermutlich` (Regel belegt, Eingabe unsicher) · `nur Ebene` (Land noch offen) |
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
| `kontakt` | optional: Id in `kontakte` – die eine Stelle, die das Bundesportal für die Gemeinde nennt (Auswahl siehe `pipeline/README.md`) |
| `nachbar` | optional: ARS der angrenzenden Gemeinde, nur bei Kondominium-Flächen |
| `aenderung` | optional: `{ art, stand, name_neu? }`, wenn die Gemeinde nach dem Datenstand aufgelöst, umgeschlüsselt oder umbenannt wurde |

### `kontakte` (optional)

| Feld | Inhalt |
|---|---|
| `name` | Name der Stelle laut Bundesportal, oft mit Fachbereich („Landratsamt Eichsfeld - Amt für Öffentliche Sicherheit und Ordnung") |
| `adresse` | Hausanschrift oder `null` |
| `telefon`, `email`, `web` | Listen, können leer sein. Nur Funktionspostfächer, keine Adressen mit Personennamen |

Die Id ist `c` + FNV-1a über das JSON des Kontakts, gültig nur innerhalb der Landesdatei. Die
Stelle des Kontakts kann von `zustaendig` abweichen, solange die Landesregeln fehlen; Konsumenten
zeigen ihren Namen deshalb mit an.

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
sicherheit, grund, quelle, alternative, hinweise, keinBrief, kontakt, bundesportal }`;
`zustaendig` und `alternative.stelle` sind Stellen-Objekte, `kontakt` ein Eintrag aus `kontakte`
oder `null` (immer `null` bei `keinBrief`), `bundesportal` der Link auf die Seite der Gemeinde,
sonst der allgemeine. `aufsicht` folgt mit Phase 6.

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
- `tkz`: Textkennzeichen aus GV-ISys. Genutzt werden 61/62 (kreisfreie Stadt, Stadtkreis),
  65/66 (gemeindefreies Gebiet) und 67 (Große Kreisstadt); die übrigen Werte stehen in der
  Satzbeschreibung des GV100AD. Nicht mit `ibz` (Bezeichnungsliste des BKG) verwechseln.
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
