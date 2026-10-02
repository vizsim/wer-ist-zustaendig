# CLAUDE.md – Wer ist zuständig?

Welche Straßenverkehrsbehörde ist an einer Straße zuständig? Dieses Repo baut die Antwort je
Gemeinde und Straßenklasse aus amtlichen Daten (BKG VG25, Destatis GV-ISys) und Landesregeln,
zeigt sie auf einer Karte und liefert Dateien an andere Anwendungen, zuerst die
[Unfallkarte](https://github.com/vizsim/unfallkarte).

Vor Änderungen lesen: [README.md](README.md), [docs/VERTRAG.md](docs/VERTRAG.md),
[docs/TODO.md](docs/TODO.md), [pipeline/README.md](pipeline/README.md).

## Aufbau

| Ort | Inhalt |
|---|---|
| `js/` | reine Module ohne Abhängigkeiten, in Browser und Node: `strassenklasse.js`, `namen.js`, `resolve.js`, `laender.js`, `lookup.js`, `ansicht.js` (Kartenhelfer) |
| `index.html`, `main.js`, `style.css` | die Karte: statische Seite ohne Build-Schritt |
| `tools/` | Node-Werkzeuge: Landesdateien bauen, Nachschlagen, Prüfungen, lokaler Server |
| `pipeline/` | Python (uv): Quellen laden, Gemeindetabelle, Grenzschicht, Manifest; CLI `zust` |
| `tests/` | `node --test` für `js/` und `tools/lib/`; `pipeline/tests/` für pytest |
| `docs/` | Vertrag mit Konsumenten, offene Punkte |

## Befehle

```bash
npm test                                   # JS-Tests
cd pipeline && uv run pytest               # Pipeline-Tests, inkl. Ende-zu-Ende (braucht tippecanoe)
cd pipeline && uvx ruff check && uvx ruff format --check
cd pipeline && uv run zust alles           # echter Build (lädt rund 320 MB)
npm run serve                              # Karte lokal auf :8080
```

## Leitplanken

- **Keyless, ohne Build-Schritt.** Die Karte lädt MapLibre und pmtiles als UMD von unpkg (Version
  gepinnt) und eigene ES-Module. Kein Bundler, kein Framework, keine API-Schlüssel. Geheimnisse
  gehören, falls je nötig, nur in `.env` und nie ins Git.
- **Reine Funktionen** in `js/`: kein DOM, kein `fetch`, keine Abhängigkeiten. Die Unfallkarte
  übernimmt `strassenklasse.js`, `namen.js` und `resolve.js` als gepinnte Kopie. Jede Änderung
  dort braucht Tests.
- **Vorberechnen (E2).** Regeln laufen im Build über alle Gemeinden; im Browser wird nur
  nachgeschlagen. Ergebnisse sind sortiert und deterministisch, damit Diffs lesbar bleiben.
- **Schlüssel immer als String:** ARS 12-stellig, Kreis 5-stellig, AGS 8-stellig. Nie in Zahlen
  umwandeln (führende Nullen; tippecanoe legt Zahlen teils als String ab).
- **CRS:** metrisch in EPSG:25832 rechnen, in EPSG:4326 ausgeben.
- **Daten:** Local-first, Rückfall auf den Bucket (`tiles.vizsim.de/file/unfallkarte-data-v2/zustaendigkeit/`).
  Stabile Dateinamen; Datenstand und Regelversion stehen in `index.json` bzw. im Manifest. Daten
  liegen nicht im Git (`pipeline/data/`), die Review-CSV auch nicht.
- **Ein Datenstand:** VG25 und GV-ISys zum selben Stichtag. Spätere Gebietsänderungen werden
  markiert (`aenderung`), nicht umgerechnet.
- **Vertrag:** [docs/VERTRAG.md](docs/VERTRAG.md). Felder werden nur ergänzt, nie umbenannt oder
  umgedeutet. Ein Bruch erhöht `schema`. Ids von Stellen bleiben stabil.
- **Regelversion:** `REGELN.version` in `js/resolve.js` bei jeder Änderung an Regeln oder Texten
  erhöhen (Patch: Text; Minor: neue Regel oder neues Land; Major: anderes Ergebnisformat).

## Rechtsaussagen

- **Kein Rechtsrat.** Jede Auskunft trägt `sicherheit` (belegt · vermutlich · nur Ebene), `grund`
  und `quelle`. „belegt" nur mit geprüfter Primärquelle und Golden-Tests mit echten ARS;
  „vermutlich" auch, wenn das Land im Bundesportal für die Gemeinde dieselbe Stelle nennt.
- **Primärquellen:** Gesetz- und Verordnungsblatt, amtliche Landesportale (z. B. revosax,
  recht.nrw.de), FIM-Behördentexte. Sekundärquellen als „[S]" kennzeichnen. Grokipedia nicht als
  Quelle verwenden oder zitieren; dort Gefundenes an der Primärquelle prüfen.
- Fundstelle mit Fassung und Datum in `TEXTE.quelle` (`js/resolve.js`).
- Die Recherche je Land steht im Konzept zum Analyse-Report der Unfallkarte (§ 6) und im Plan
  „Zuständigkeitstabelle" im Projekt; neue Befunde dort und in `docs/TODO.md` nachziehen.

## Arbeitsweise

- **Offene Punkte** nur in `docs/TODO.md`, und erst nach Abstimmung mit dem Repo-Owner.
- **Changelog:** Jede Änderung, die Nutzer der Karte oder der Dateien merken, unter
  „Unveröffentlicht" in [CHANGELOG.md](CHANGELOG.md) eintragen (auf Deutsch).
- **Commits** nach Conventional Commits und auf Englisch (`fix(map): …`, `feat: …`, `docs: …`).
- **Kein Netz zu BKG oder Destatis?** Dann die Abrufe als kleines Skript schreiben und vom Owner
  laufen lassen. Nicht raten, was eine Datei enthält; Felder an der Dokumentation prüfen.
- **Karte:** Bildsprache der Verkehrsbeschilderung (Antwort als Zusatzzeichen, Verkehrsblau,
  Verkehrsgelb, Schraffur für „nur Ebene"). Farben und Schrift als Tokens in `style.css`;
  Legende und Karte aus denselben Konstanten in `js/ansicht.js`.
- **Testpunkte:** `window.__karte` ist die MapLibre-Instanz (für Browser-Tests).
- Lizenz: AGPL-3.0-or-later. Quellenvermerke gesammelt im README und in den Landesdateien.
