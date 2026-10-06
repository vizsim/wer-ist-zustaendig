![License: AGPL-3.0-or-later](https://img.shields.io/badge/License-AGPL--3.0--or--later-blue)

# Wer ist zuständig?

Welche **Straßenverkehrsbehörde** entscheidet an einer Straße über Schilder und Tempolimits?
Dieses Projekt beantwortet die Frage für jede Gemeinde in Deutschland: aus den amtlichen
Gemeindegrenzen (BKG), dem Gemeindeverzeichnis (Destatis) und Regeln je Land. Jede Auskunft
nennt, **wie sicher** sie ist und **woher** sie stammt.

Es gibt zwei Wege zu den Daten:

- eine **Karte** unter [vizsim.de/wer-ist-zustaendig](https://vizsim.de/wer-ist-zustaendig/)
  ([index.html](index.html)): Straße anklicken oder suchen, Auskunft lesen; der Schalter
  „Kontakt vorhanden" zeigt, wo es schon einen Kontakt der zuständigen Stelle gibt;
- **Dateien** für andere Anwendungen, zuerst die [Unfallkarte](https://github.com/vizsim/unfallkarte):
  Grenzschicht als PMTiles und eine JSON-Datei je Land. Der Vertrag steht in
  [docs/VERTRAG.md](docs/VERTRAG.md).

> **Testversion, kein Rechtsrat.** Alle sechzehn Länder haben eine eigene Regel (siehe „Stand").
> Jede Auskunft ist eine begründete Vermutung mit Quelle. Vor einem Antrag oder einer Anregung
> bitte prüfen, ob die genannte Stelle wirklich zuständig ist.

## Stand: Phase 2 – Landesregeln für alle Länder

| Was | Stand |
|---|---|
| Gemeindegrenzen, Schlüssel, Kreise | ganz Deutschland, Gebietsstand 31.12.2025 |
| **Bayern** | **belegt**: Gemeindestraßen – die Gemeinde selbst (in einer Verwaltungsgemeinschaft erledigt die Gemeinschaft die Verwaltungsarbeit); Kreis-, Staats- und Bundesstraßen – das Landratsamt; Große Kreisstädte und kreisfreie Städte für alle Straßen |
| **Thüringen** | **vermutlich**: Städte über 30.000 Einwohner und Eisenach für alle Straßen; Städte, die auf Antrag Straßenverkehrsbehörde sind (Apolda, Arnstadt, Eisenberg, Heilbad Heiligenstadt), für alle außer Bundesstraßen; sonst der Landkreis, bei Gemeinden mit 10.000 bis 30.000 Einwohnern die Gemeinde als Alternative |
| **Schleswig-Holstein** | **belegt**: der Kreis bzw. die kreisfreie Stadt; Gemeinden über 20.000 Einwohner und Glinde selbst. Halten und Parken, Baustellen und Veranstaltungen: das Amt bzw. die amtsfreie Gemeinde (als Alternative). Knapp unter oder über 20.000 Einwohnern nur **vermutlich** |
| **Niedersachsen** | **belegt**: der Landkreis bzw. die Region Hannover; kreisfreie Städte, Hannover, Göttingen, die großen selbständigen Städte und die selbständigen Gemeinden (auch drei Samtgemeinden) für alle Straßen. Gemeindestraßen sonst nur **vermutlich** beim Landkreis – er kann sie auf Antrag übertragen, ein Verzeichnis fehlt: bekannte Fälle als Gemeinde bzw. Samtgemeinde, sonst Samtgemeinde oder Gemeinde über 10.000 Einwohner als Alternative |
| **Nordrhein-Westfalen** | **belegt**: der Kreis bzw. die kreisfreie Stadt; die 167 Mittleren und Großen kreisangehörigen Städte (Liste nach § 4 GO NRW) für alle Straßen selbst. Aachen selbst, nur **vermutlich** |
| **Brandenburg** | **belegt**: der Landkreis bzw. die kreisfreie Stadt; Eberswalde, Eisenhüttenstadt, Schwedt/Oder, Guben, Prenzlau, Teltow und Werder (Havel) selbst. Halten und Parken, Baustellen, Veranstaltungen: in Wittenberge, Kyritz, Finsterwalde, Luckau, Kleinmachnow und im Amt Schlieben die Kommune (als Alternative) |
| **Mecklenburg-Vorpommern** | **belegt**: der Landkreis bzw. die kreisfreie Stadt; Greifswald, Neubrandenburg, Stralsund, Wismar und Städte über 20.000 Einwohner selbst, nach der Übergangsregel auch Neustrelitz, Waren (Müritz) und Parchim |
| **Rheinland-Pfalz** | **vermutlich**: die Verbandsgemeinde bzw. verbandsfreie Gemeinde – auf Gemeindestraßen überall, sonst innerhalb geschlossener Ortschaften; außerorts die Kreisverwaltung (als Alternative). Kreisfreie und große kreisangehörige Städte für alle Straßen |
| **Sachsen** | **belegt**: Gemeindestraßen die Gemeinde (bzw. erfüllende Gemeinde oder Verwaltungsverband), sonst das Landratsamt; Kreisfreie Städte und 53 Große Kreisstädte für alle Straßen – als erfüllende Gemeinde auch für ihre Verwaltungsgemeinschaft |
| **Sachsen-Anhalt** | **vermutlich**: Gemeindestraßen die Gemeinde bzw. Verbandsgemeinde, außerorts der Landkreis als Alternative; sonst der Landkreis |
| **Hessen** | **belegt**: kreisfreie Städte und die sieben Sonderstatus-Städte für alle Straßen; sonst Gemeinde- und Kreisstraßen die Gemeinde, auch außerorts, Landesstraßen ab mehr als 7.500 Einwohnern; Bundesstraßen und Landesstraßen kleinerer Gemeinden der Landkreis. Überörtlich wirkende Anordnungen sowie Ampeln und Fußgängerüberwege an Landesstraßen: der Landkreis (als Alternative). Autobahnen und 14 Abschnitte von Bundesstraßen: Hessen Mobil, nur im Text |
| **Saarland** | **belegt**: Gemeindestraßen die Gemeinde, sonst der Landkreis bzw. der Regionalverband Saarbrücken; die Landeshauptstadt Saarbrücken für alle Straßen |
| **Berlin** | **vermutlich**: Gemeindestraßen das Bezirksamt des Bezirks, Kreis-, Landes- und Bundesstraßen die Senatsverwaltung – jeweils die andere Stelle als Alternative (maßgeblich ist das übergeordnete Straßennetz) |
| **Baden-Württemberg** | **belegt**: Stadtkreise und Große Kreisstädte für alle Straßen; das Landratsamt, wo nach den Einwohnern niemand anders zuständig sein kann. **vermutlich**: Verwaltungsgemeinschaften, die untere Verwaltungsbehörde sind (alle Straßen ihrer Gemeinden), und örtliche Straßenverkehrsbehörden (Gemeinde oder Gemeinschaft, nur Gemeindestraßen), bekannt von den Webseiten der Landratsämter. Wo eine Gemeinde oder Gemeinschaft es nach ihren Einwohnern sein könnte, steht sie als Alternative da |
| **Bremen** | **belegt**: in der Stadt Bremen das Amt für Straßen und Verkehr, für Baustellen, Veranstaltungen und Haltverbote für Wohnungsumzüge die Polizei Bremen (als Alternative); in Bremerhaven der Magistrat |
| **Hamburg** | **nur Ebene**: das zuständige Polizeikommissariat – welches, zeigt die Karte noch nicht; etwa für Ampeln, Kraftfahrstraßen, Ortstafeln, Wegweiser, technisch gesicherte Bahnübergänge, den Umbau von Hauptverkehrsstraßen und mehr als Tempo 50 innerorts die Verkehrsdirektion der Polizei (als Alternative) |
| Autobahnen | Fernstraßen-Bundesamt, kein Brief an die Kommune |
| **Kontakt** (Telefon, E-Mail, Webseite) | **Thüringen, Bayern und Schleswig-Holstein: jede Gemeinde, jede Straßenklasse** – der Kontakt genau der Stelle, die zuständig ist, aus dem Bundesportal; einzelne Lücken von den Webseiten der Behörden. **Niedersachsen:** 865 von 964 Gemeinden; es fehlen vor allem selbständige Städte und der Landkreis Hildesheim (dort der Link ins Portal). **Mecklenburg-Vorpommern:** 385 von 724 Gemeinden; für Schwerin und die Landkreise Rostock, Nordwestmecklenburg und Ludwigslust-Parchim nennt das Portal keine Stelle. **Sachsen-Anhalt:** der Landkreis für Kreis-, Landes- und Bundesstraßen in sechs Landkreisen (123 von 218 Gemeinden), für Gemeindestraßen kaum. Übrige Länder im Bundesportal (BB, NW, RP): Link auf die Seite der Gemeinde dort – für BB und NW nennt das Portal kaum Stellen, für RP oft nicht die eigene Verbandsgemeinde. **Sachsen:** jede Gemeinde, jede Straßenklasse, aber nur die **allgemeine Anschrift** von Rathaus bzw. Landratsamt aus dem Gemeindeverzeichnis der Landesdirektion – die Auskunft sagt das dazu. **Hessen, Saarland und Baden-Württemberg:** jede Gemeinde, jede Straßenklasse, die **allgemeine Anschrift** von Rathaus bzw. Kreisverwaltung mit E-Mail aus dem Anschriftenverzeichnis der Statistischen Ämter, ohne Telefon; in Baden-Württemberg fehlt die E-Mail für die meisten Gemeinden am Sitz einer Verwaltungsgemeinschaft. **Berlin:** alle zwölf Bezirksämter und die Senatsverwaltung (diese als allgemeine Anschrift), von den Webseiten der Behörden. **Bremen:** das Amt für Straßen und Verkehr und die Straßenverkehrsbehörde in Bremerhaven, von Hand. **Hamburg** steht nicht im Bundesportal: noch keine Kontakte |

Alle Länder haben eine eigene Regel. In Hamburg nennt die Karte nur die Ebene, bis die Flächen der
Polizeikommissariate eingebaut sind (siehe [docs/TODO.md](docs/TODO.md)). Kontakte folgen Land für
Land, sobald die Daten durchgesehen sind.

## So funktioniert es

```text
BKG VG25 (Grenzen, ARS, Namen)   ─┐
Destatis GV-ISys (Status, EW)    ─┴─ zust tabelle ──→ gemeinden_attr.json ─┐
Bundesportal (Stellen, Kontakte) ─┬─ zust kontakte ─→ kontakte.json ───────┴─ zust laender ─→ <land>.json (16×), index.json
Verzeichnisse (Anschriften)      ─┘                                            (js/resolve.js)          │
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
  Datum). Die Auskunft zeigt den Kontakt der Stelle, die für die Straße zuständig ist. Sachsen,
  Hessen, das Saarland und Baden-Württemberg stehen nicht im Portal; dort kommen die allgemeinen
  Anschriften der Verwaltungen aus dem Gemeindeverzeichnis der Landesdirektion Sachsen bzw. dem
  Anschriftenverzeichnis der Statistischen Ämter, als solche gekennzeichnet (`allgemein`).
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
| Bezirksgrenzen Berlin | [Geoportal Berlin, ALKIS Berlin Bezirke (WFS)](https://daten.berlin.de/datensaetze/alkis-berlin-bezirke-wfs-ced31d7d) | [Datenlizenz Deutschland – Zero – Version 2.0](https://www.govdata.de/dl-de/zero-2-0) |
| Große Kreisstädte, Einwohnerzahlen | [Destatis, Gemeindeverzeichnis GV-ISys](https://www.destatis.de/DE/Themen/Laender-Regionen/Regionales/Gemeindeverzeichnis/_inhalt.html), Jahresausgabe 31.12.2025 | Statistisches Bundesamt (Destatis); Vervielfältigung und Verbreitung mit Quellenangabe gestattet |
| Kontakte der Behörden (TH, BY, SH, NI, MV, ST) | [Bundesportal](https://verwaltung.bund.de/leistungsverzeichnis/de/leistung/99108014042000), Leistung „Aufstellung von Verkehrszeichen anregen“, Angaben der Länder; Ergänzungen von den Webseiten der Behörden | amtliche Kontaktangaben, nur Funktionspostfächer; Quelle und Abrufdatum in jeder Auskunft |
| Anschriften der Gemeinde- und Kreisverwaltungen in Sachsen | [Landesdirektion Sachsen, Gemeindeverzeichnis](https://www.lds.sachsen.de/?ID=2392&art_param=155) (CSV), abgerufen 05.10.2026 | [Datenlizenz Deutschland – Namensnennung – Version 2.0](https://www.govdata.de/dl-de/by-2-0) · Landesdirektion Sachsen, Gemeindeverzeichnis; Auszug (Anschrift, Telefon, E-Mail, Webseite), Daten geändert: nur Funktionspostfächer, ohne Bürgermeister |
| Anschriften der Gemeinde- und Kreisverwaltungen in Hessen, im Saarland und in Baden-Württemberg | [Statistische Ämter des Bundes und der Länder, Anschriften der Gemeinde- und Stadtverwaltungen](https://www.statistikportal.de/de/veroeffentlichungen/anschriftenverzeichnis), Stand 31.01.2026 | © Statistisches Bundesamt (Destatis), 2026, im Auftrag der Statistischen Ämter des Bundes und der Länder; Vervielfältigung und Verbreitung, auch auszugsweise, mit Quellenangabe gestattet. Auszug: Anschrift und E-Mail, nur Funktionspostfächer |
| Kontakte der Behörden in Berlin und Bremen | Webseiten der Bezirksämter, das [Service-Portal Berlin](https://service.berlin.de) und die Webseite des [Amts für Straßen und Verkehr Bremen](https://www.asv.bremen.de), für Bremerhaven ein Schreiben der Straßenverkehrsbehörde; von Hand (`pipeline/config/kontakte_ergaenzt.yaml`) | amtliche Kontaktangaben, nur Funktionspostfächer; Quelle und Datum in jeder Auskunft |
| Straßen in der Karte | Kacheln der [Unfallkarte](https://github.com/vizsim/unfallkarte) aus OpenStreetMap | © OpenStreetMap-Mitwirkende (ODbL) |
| Hintergrundkarte | [OpenFreeMap](https://openfreemap.org) Positron | © OpenMapTiles, © OpenStreetMap-Mitwirkende |
| Ortssuche | [Photon](https://photon.komoot.io) (komoot) | © OpenStreetMap-Mitwirkende |
| Schrift | [Barlow](https://github.com/jpt/barlow), selbst gehostet | SIL Open Font License 1.1 ([assets/fonts/OFL.txt](assets/fonts/OFL.txt)) |
| Rechtsgrundlagen | Fundstellen je Auskunft; Bayern aus [BAYERN.RECHT](https://www.gesetze-bayern.de) (ZustGVerk, GrKrV, AufVGem, VGemO), Schleswig-Holstein aus [Gesetze-Rechtsprechung Schleswig-Holstein](https://www.gesetze-rechtsprechung.sh.juris.de) (StrVRZustVO), Niedersachsen aus [NI-VORIS](https://voris.wolterskluwer-online.de) (ZustVO-Verkehr, NKomVG) und dem Niedersächsischen Ministerialblatt (selbständige Gemeinden), Nordrhein-Westfalen aus [RECHT.NRW.DE](https://recht.nrw.de), Brandenburg aus [BRAVORS](https://bravors.brandenburg.de), Mecklenburg-Vorpommern aus dem Gesetz- und Verordnungsblatt M-V, Sachsen aus [REVOSax](https://www.revosax.sachsen.de) und dem Gemeindeverzeichnis der Landesdirektion, Hessen aus [Bürgerservice Hessenrecht](https://www.rv.hessenrecht.hessen.de) (StVRZustV), das Saarland aus [Bürgerservice Saarland](https://recht.saarland.de) (StVZustG), Baden-Württemberg aus dem Gesetzblatt (StVO-Zuständigkeitsgesetz 2025, [GBl. 2025 Nr. 36](https://www.landtag-bw.de/resource/blob/573194/65b7760600f54fe49fcbe22f8d1789bd/GBl2025036.pdf)) und dem Landesverwaltungsgesetz, wer selbst zuständig ist nach den Webseiten der Landratsämter und Gemeinden, Bremen aus dem [Transparenzportal Bremen](https://www.transparenz.bremen.de) (Verordnung über die Zuständigkeiten nach der Straßenverkehrs-Ordnung), Rheinland-Pfalz, Sachsen-Anhalt, Berlin und Hamburg vorerst ohne Primärquelle (Berlin nach dem Service-Portal und den Bezirksämtern, Hamburg nach dem Handbuch der Behörde für Inneres und Sport); Fernstraßen-Bundesamt nach § 45 Abs. 11 StVO | – |
| Favicon | [Fax-Symbol](https://www.svgrepo.com/svg/299100/fax) von SVG Repo | CC0 |

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
cd .. && node tools/check-kontakte.mjs    # Kontakt der zuständigen Stelle je Gemeinde und Klasse
```

`zust pruefen` schlägt die 13 festen Punkte aus [tests/golden-punkte.json](tests/golden-punkte.json)
nach, zieht 200 Zufallspunkte (jeder muss in genau einer Gemeinde liegen) und legt 20 Punkte
nahe Gemeindegrenzen mit Link zum BKG-Dienst in `pipeline/data/review/grenzpunkte.csv` ab – zum
Gegenprüfen von Hand.
