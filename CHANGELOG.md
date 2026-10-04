# Changelog

Nennenswerte Änderungen für Nutzer der Karte und der Dateien ([docs/VERTRAG.md](docs/VERTRAG.md)).
Format nach [Keep a Changelog](https://keepachangelog.com/de/1.1.0/). Die Versionen folgen der
Regelversion (`REGELN.version` in `js/resolve.js`); mit jeder Veröffentlichung im Bucket kommt
ein Git-Tag `v<version>` dazu.

## [Unveröffentlicht]

– noch nichts –

## [0.7.1] – 2026-10-04

Erste öffentliche Version, als Testversion (Beta), unter
[vizsim.de/wer-ist-zustaendig](https://vizsim.de/wer-ist-zustaendig/). Regeln 0.7.1 · Schema 1 · Datenstand
31.12.2025 (BKG VG25, Destatis GV-ISys). Erster Lauf mit echten Daten.

### Hinzugefügt

- Landesregel Bayern (**belegt**): Gemeindestraßen – die Gemeinde selbst (Art. 3 ZustGVerk); in
  einer Verwaltungsgemeinschaft bleibt die Aufgabe bei der Gemeinde, die Gemeinschaft erledigt
  die Verwaltungsarbeit (§ 1 Nr. 5 AufVGem, Art. 4 VGemO). Kreis-, Staats- und Bundesstraßen –
  das Landratsamt. Große Kreisstädte und kreisfreie Städte für alle Straßen (§ 2 Nr. 2 GrKrV,
  Art. 2 ZustGVerk). 2 056 bayerische Gemeinden sind damit belegt, die 165 gemeindefreien
  Gebiete vermutlich.
- Landesregel Thüringen (**vermutlich** – die Zuständigkeitsverordnung ist nur aus einer
  Sekundärquelle gelesen): Städte über 30.000 Einwohner und Eisenach für alle Straßen; Städte,
  die auf Antrag Straßenverkehrsbehörde sind (§ 2 Abs. 7), für alle außer Bundesstraßen – erkannt
  am Bundesportal (Apolda, Eisenberg, Heilbad Heiligenstadt) oder von Hand (Arnstadt). Im
  Übrigen der Landkreis. Bei 20 Gemeinden mit 10.000 bis 30.000 Einwohnern, die auf Antrag
  zuständig sein könnten, steht die Gemeinde als Alternative.
- Landesregel Schleswig-Holstein (**belegt**, StrVRZustVO in der Fassung vom 01.12.2025): der
  Kreis bzw. die kreisfreie Stadt (§ 3); Gemeinden mit mehr als 20.000 Einwohnern ordnen
  Verkehrszeichen selbst an (§ 4 Abs. 1), auf Antrag auch Glinde (§ 4 Abs. 2, Anlage). Halten und
  Parken, Baustellen und Veranstaltungen ordnet das Amt bzw. die amtsfreie Gemeinde an (§ 5) – in
  der Karte als Alternative mit dem Kontakt des Amts. Drei Städte knapp unter 20.000 Einwohnern
  (Bad Schwartau, Schenefeld, Mölln) sind nur „vermutlich".
- Kontakt der zuständigen Stelle in Bayern, Thüringen und Schleswig-Holstein – für jede Gemeinde
  und jede Straßenklasse: Name, Anschrift, Telefon, E-Mail und Webseite, vorn in der
  Antwortkarte. Je Gemeinde gibt es zwei Kontakte, die Kreisebene und die Gemeinde selbst (bzw.
  ihr Amt); die Auskunft zeigt den Kontakt genau der Stelle, die zuständig ist, und eine
  Alternative mit ihrem eigenen Kontakt. Quelle ist das Bundesportal (nur Funktionspostfächer,
  keine Personen). Wo es keine passende Stelle nennt, gilt der Kreiskontakt der Nachbargemeinden,
  der Kontakt des Amts bzw. der Verwaltungsgemeinschaft oder ein Eintrag von Hand von der
  Webseite der Behörde, mit Datum. Neuer Pipeline-Schritt `zust kontakte`; in den Landesdateien
  die Tabelle `kontakte`, je Gemeinde `kontakt` und `kontakt_gemeinde` (und `nachbar` bei
  Kondominium-Flächen); `auswahl()` liefert `kontakt` und `alternative.kontakt`.
- Nennt das Land im Bundesportal für eine Gemeinde dieselbe Stelle wie unsere Regel, gilt die
  Auskunft auch ohne Landesregel als „vermutlich" statt „nur Ebene" – auf der Karte ohne
  Schraffur.
- Link ins Bundesportal direkt auf die Seite der Gemeinde (`bundesportal_region`), in allen
  Ländern, die die Leistung dort führen. In den übrigen (BW, BE, HB, HH, HE, SL, SN) steht statt
  eines Links ins Leere: „Kontaktdaten für … haben wir noch nicht." `auswahl()` liefert dort
  `bundesportal: null`.
- Willkommensfenster beim ersten Besuch: Testversion, welche Länder fertig sind (aus den Daten),
  kein Rechtsrat, Fehler melden. Danach über „Beta" im Kopf der Karte.
- Deutsch-luxemburgisches Kondominium (Mosel, Sauer, Our): Die 25 Flächen aus VG25 nennen die
  Stelle der angrenzenden Gemeinde, immer mit „nur Ebene". Neues Feld `kondominium` im
  Zwischenprodukt `gemeinden_attr.json`.
- Favicon: Fax-Symbol von SVG Repo (CC0).

### Geändert

- Karte: Die Antwortkarte zeigt zuerst, wen man anspricht – Behörde, Stelle, Anschrift und
  Buttons zum Anrufen, Schreiben und für die Webseite. Darunter steht, falls es eine gibt, die
  Alternative („Oder …") mit Bedingung und eigenem Kontakt. Sicherheit, Begründung und Quellen
  stehen eingeklappt unter „Wie sicher ist das?“. Die Karte antwortet auch ohne angeklickte
  Straße; die Schraffur ist leichter.
- Karte: Die Legende kennt „Gemeinde selbst"; „Stadt" umfasst auch Große Kreisstädte und Städte
  mit eigener Straßenverkehrsbehörde. Die Statuszeile nennt die Länder mit Landesregel.
- Karte: Unter Zoomstufe 7 färbt die Übersicht jeden Kreis nach dem, was für die meisten seiner
  Gemeinden gilt – Zuständigkeit und Sicherheit, mit Schraffur für „nur Ebene". Neue Felder `eg`
  und `sg` im Layer `kreise`.
- Quellenangaben: Der Rückfall auf die Kreisebene heißt jetzt so („die Regel dieses Landes ist
  noch nicht eingearbeitet"), für Autobahnen steht § 45 Abs. 11 StVO.
- Kontaktauswahl: Stellen ohne Behördennamen („Fachdienst Verkehr") erkennt sie an der Domain
  ihrer E-Mail oder Webseite.
- `tools/lookup.mjs` zeigt die Kontakte der zuständigen Stelle und der Alternative.
- Grenzschicht: Unter Zoomstufe 12 sind die Kacheln gröber aufgelöst (`low_detail` 10) – die
  Datei hat 30 statt 43 MB, eine Kachel bei Zoom 7 im Mittel 56 statt 126 KB. Nachgeschlagen
  wird weiter in z12 mit voller Auflösung.
- `zust tabelle`: Unbewohnte gemeindefreie Gebiete, die nur im GV-ISys stehen (Küstengewässer
  M-V, das Kondominium als Ganzes), ergeben eine Warnung statt eines Fehlers.
- Sachsen: Die Prüfung erwartet 0 Große Kreisstädte, weil das GV-ISys sie dort nicht mit
  Textkennzeichen 67 führt. Sächsische Gemeinden bekommen vorerst keine GKS-Alternative.
- Vertrag: Größen der Dateien aus dem echten Lauf statt Schätzungen.

### Behoben

- Karte: Ein geteilter Link, dessen Punkt außerhalb des Ausschnitts lag, meldete „Hier liegt
  keine Gemeinde". Die Karte springt jetzt erst zum Punkt.
- Karte: Bei kleinem Zoom lud sie die Straßenkacheln der Unfallkarte – bei Zoom 7 rund 20 MB.
  Straßen erscheinen jetzt ab Zoomstufe 10; bei Zoom 7 lädt die Karte insgesamt etwa 1,5 MB.

### Sicherheit

- Karte: `?daten=<url>` gilt nur noch für den eigenen Ursprung und den Bucket (auf localhost für
  jede http(s)-Quelle). Links ins Bundesportal und zum Meldeformular erscheinen nur mit
  `https://`.
- Karte: MapLibre und pmtiles von unpkg werden mit Integritäts-Hash (SRI) geladen.

## [0.1.0] – 2026-10-01

Phase 1, nicht veröffentlicht: Pipeline aus BKG VG25 und Destatis GV-ISys zum
31.12.2025, reine Module in `js/`, Landesdateien mit `index.json`, Grenzschicht
`gemeinden.pmtiles`, Karte ohne Build-Schritt, Prüfwerkzeuge und Vertrag. Nur mit Testdaten
gebaut.
