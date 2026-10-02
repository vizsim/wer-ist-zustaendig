# Changelog

Nennenswerte Änderungen für Nutzer der Karte und der Dateien ([docs/VERTRAG.md](docs/VERTRAG.md)).
Format nach [Keep a Changelog](https://keepachangelog.com/de/1.1.0/). Die Versionen folgen der
Regelversion (`REGELN.version` in `js/resolve.js`); mit jeder Veröffentlichung im Bucket kommt
ein Git-Tag `v<version>` dazu.

## [Unveröffentlicht]

Regeln 0.2.0 · Schema 1 · Datenstand 31.12.2025. Erster Lauf mit echten Daten (BKG, Destatis).

### Hinzugefügt

- Deutsch-luxemburgisches Kondominium (Mosel, Sauer, Our): Die 25 Flächen aus VG25 nennen die
  Stelle der angrenzenden Gemeinde, immer mit „nur Ebene". Neues Feld `kondominium` im
  Zwischenprodukt `gemeinden_attr.json`.

### Geändert

- `zust tabelle`: Unbewohnte gemeindefreie Gebiete, die nur im GV-ISys stehen (Küstengewässer
  M-V, das Kondominium als Ganzes), ergeben eine Warnung statt eines Fehlers.
- Sachsen: Die Prüfung erwartet 0 Große Kreisstädte, weil das GV-ISys sie dort nicht mit
  Textkennzeichen 67 führt. Sächsische Gemeinden bekommen vorerst keine GKS-Alternative.
- Vertrag: Größen der Dateien aus dem echten Lauf statt Schätzungen.

### Behoben

- Karte: Ein geteilter Link, dessen Punkt außerhalb des Ausschnitts lag, meldete „Hier liegt
  keine Gemeinde". Die Karte springt jetzt erst zum Punkt.

### Sicherheit

- Karte: `?daten=<url>` gilt nur noch für den eigenen Ursprung und den Bucket (auf localhost für
  jede http(s)-Quelle). Der Bundesportal-Link erscheint nur mit `https://`.

## [0.1.0] – 2026-10-01

Teil A, Phase 1 (nicht veröffentlicht): Pipeline aus BKG VG25 und Destatis GV-ISys zum
31.12.2025, reine Module in `js/`, Landesdateien mit `index.json`, Grenzschicht
`gemeinden.pmtiles`, Karte ohne Build-Schritt, Prüfwerkzeuge und Vertrag. Nur mit Testdaten
gebaut.
