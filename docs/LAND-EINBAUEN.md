# Ein Land einbauen

So sind Bayern, Thüringen und Schleswig-Holstein in die Karte gekommen – als Ablauf für das
nächste Land, zuerst Niedersachsen. Grundregeln stehen in [CLAUDE.md](../CLAUDE.md), der Vertrag
mit den Konsumenten in [VERTRAG.md](VERTRAG.md).

**Fertig ist ein Land, wenn**

- `js/resolve.js` für jede Gemeinde und jede Straßenklasse (G, K, L, B) eine Stelle nennt, mit
  Sicherheit, Begründung und Fundstelle, und Golden-Tests mit echten ARS jeden Zweig der Regel
  abdecken;
- die zuständige Stelle überall einen Kontakt hat: `node tools/check-kontakte.mjs <LKZ>` meldet
  keine Lücke (Alternativen ohne Kontakt sind erlaubt, kommen aber in die TODO);
- README, CHANGELOG und TODO den neuen Stand zeigen und alles in kleinen Commits liegt.

## Die drei Länder im Überblick

| Land | Rechtsgrundlage und wo gelesen | Regel | Sicherheit |
|---|---|---|---|
| BY | ZustGVerk Art. 2, 3, 6; GrKrV § 2 Nr. 2; AufVGem § 1 Nr. 5; VGemO Art. 4 – [gesetze-bayern.de](https://www.gesetze-bayern.de) | Gemeindestraßen: die Gemeinde (in einer Verwaltungsgemeinschaft bleibt sie zuständig, die VG erledigt die Verwaltungsarbeit); Kreis-, Staats-, Bundesstraßen: das Landratsamt; Große Kreisstädte (Textkennzeichen 67) und kreisfreie Städte: alles | belegt; gemeindefreie Gebiete vermutlich |
| TH | Thüringer Zuständigkeitsverordnung Straßenverkehrsrecht vom 13.02.2007, Stand 20.05.2026 – nur bei umwelt-online, also Sekundärquelle `[S]`; das Landesportal lädt nur mit JavaScript und ließ sich nicht rendern | über 30.000 Einwohner und Eisenach: alles; Städte auf Antrag (§ 2 Abs. 7: 10.000–30.000 Einwohner, erkannt am Portal-Urteil `stvb` oder an `TH_STAEDTE_AUF_ANTRAG`): alles außer Bundesstraßen; sonst der Landkreis, Gemeinden mit 10.000–30.000 Einwohnern als Alternative | vermutlich |
| SH | StrVRZustVO §§ 3–5 und Anlage, Fassung 01.12.2025 – [gesetze-rechtsprechung.sh.juris.de](https://www.gesetze-rechtsprechung.sh.juris.de), im Browser gerendert | Kreis bzw. kreisfreie Stadt; über 20.000 Einwohner und Glinde (Anlage, `SH_AUF_ANTRAG`): die Gemeinde; Amt bzw. amtsfreie Gemeinde als Alternative für Halten und Parken, Baustellen, Veranstaltungen (neue Stellen-Id `v` + Amts-ARS) | belegt; ± 1.000 um 20.000 Einwohner vermutlich |

## 1. Rechtsgrundlage finden und lesen

Gesucht ist die Zuständigkeitsverordnung des Landes zum Straßenverkehrsrecht (Name je Land
anders) und, falls sie darauf verweist, Kommunalrecht (Kreisstädte, Verbände). Die Fragen:

- Wer ist untere Straßenverkehrsbehörde? Meist Kreise und kreisfreie Städte.
- Welche Gemeinden sind es selbst – nach Einwohnern (Schwelle, Stichtag?), nach Status (Große
  Kreisstadt, selbständige Gemeinde), nach einer Liste in der Verordnung oder einer Anlage, auf
  Antrag?
- Für welche Straßen oder Aufgaben – alles nach § 45 StVO, nur Gemeindestraßen, nur Halten und
  Parken? Bundesstraßen ausgenommen?
- Welche Rolle spielen Verbände (Verwaltungsgemeinschaft, Amt, Samtgemeinde,
  Verbandsgemeinde) – zuständig oder nur Verwaltungsarbeit?
- Autobahnen sind überall das Fernstraßen-Bundesamt (§ 45 Abs. 11 StVO); das macht `auswahl()`.

**Quellen.** „belegt" nur aus der Primärquelle: amtliches Landesrechtsportal oder Gesetz- und
Verordnungsblatt. Viele Portale laden nur mit JavaScript. Dann im Browser rendern (Playwright,
siehe Schritt 5); beim juris-Portal Schleswig-Holsteins half: echter User-Agent, `waitUntil:
"domcontentloaded"`, 15 Sekunden warten, dann `document.body.innerText` lesen. Sekundärquellen
wie umwelt-online nur mit `[S]` in der Fundstelle und höchstens „vermutlich". Fassung und Datum
der Fassung immer notieren.

**Einwohner** kommen aus GV-ISys 31.12.2025 (`g.ew`). Welche Zahl eine Verordnung meint, steht
selten darin; nahe an einer Schwelle ist die Auskunft deshalb nur „vermutlich" (SH: ± 1.000).

## 2. Die Regel in `js/resolve.js`

Eine Funktion je Land, eingetragen in `LANDESREGELN`. Sie bekommt den Eintrag aus
`gemeinden_attr.json` und die Klasse und gibt `ergebnis(…)` zurück – oder `null` für den
Rückfall auf die Kreisebene. Vorlagen: `regelBayern`, `regelThueringen`,
`regelSchleswigHolstein`.

```js
function regelXy(g, klasse) {
  const kreis = kreisStelle(g);                                  // k + Kreis-ARS
  if (g.kreis.kreisfrei) return ergebnis(kreis, SICHERHEIT.BELEGT, "kreisfrei", "xyStadt");
  if (g.gemeindefrei) return ergebnis(kreis, SICHERHEIT.VERMUTLICH, "gemeindefrei", "xyKreis");
  const selbst = gemeindeStelle(g, istStadt(g) ? "stadt" : "gemeinde", "untere");  // g + ARS
  if ((g.ew ?? 0) > 20000) return ergebnis(selbst, SICHERHEIT.BELEGT, "xyGemeinde", "xyGemeinde");
  return ergebnis(kreis, SICHERHEIT.BELEGT, "xyKreis", "xyKreis", { stelle: selbst, bedingung: "xyParken" });
}
```

- **Bausteine:** `kreisStelle(g)`, `gemeindeStelle(g, art, ebene)`, `verbandStelle(g)`
  (`v` + Verbands-ARS), `istGks(g)` (Textkennzeichen 67), `istStadt(g)` (63 oder 67), `g.ew`,
  `g.verband`, `g.gemeindefrei`, `g.kreis.kreisfrei` und `g.bundesportal` – das Urteil des
  Portals (`passt`, `stvb`, `fremd`, `keine`, `mehrdeutig`), das der Build aus `kontakte.json`
  ergänzt.
- **Texte** in `TEXTE`: `grund` ist ein Satz für die Karte, `quelle` die Fundstelle mit Fassung
  (bei Schwellen dazu „Einwohner laut GV-ISys 31.12.2025"), `bedingung` ein Satzteil („falls es
  nur um Halten und Parken … geht"). Schlüssel mit Länderkürzel davor (`shKreis`).
- **Listen** einzelner Gemeinden (auf Antrag, Anlage) als exportierte Konstante mit Beleg im
  Kommentar: `TH_STAEDTE_AUF_ANTRAG`, `SH_AUF_ANTRAG`.
- **`REGELN.version`** um eine Minor-Stelle erhöhen (neues Land).
- **Größe:** Steht eine Gemeinde (`g…`) oder ein Verband (`v…`) im Ergebnis, bekommt jede
  Gemeinde ein eigenes Ergebnis – `by.json` hat deshalb 1,9 MB (gzip 190 KB).

**Golden-Tests** in `tests/resolve.test.js` mit echten Gemeinden, je Zweig mindestens eine:
kreisfreie Stadt, gemeindefreies Gebiet, Gemeinde über und unter jeder Schwelle, knapp an der
Schwelle, Listen-Gemeinde, Verbandsgemeinde, jede Alternative, die Klassen, in denen sich
etwas ändert. Die Tests für den Rückfall („Phase 1") nehmen Länder ohne Regel – wenn das neue
Land darunter ist, auf ein anderes umstellen. Echte Schlüssel und Zahlen holen:

```bash
cd pipeline && uv run python -c "
import json
a = json.load(open('data/interim/gemeinden_attr.json'))['gemeinden']
for ars, g in sorted(a.items()):
    if g['land'] == 'NI' and (g.get('ew') or 0) > 20000 and not g['kreis']['kreisfrei']:
        print(ars, g['name'], g['ew'], g.get('tkz'), (g.get('verband') or {}).get('name'), g['kreis']['name'])
"
```

Neue Arten von Stellen oder Rollen brauchen auch einen Test in `tests/build.test.js` (dort zeigt
der Test zum Amt Hüttener Berge, wie ein Verband zu seinem Kontakt kommt).

## 3. Kontakte aus dem Bundesportal

Nur in Ländern, die die Leistung „Aufstellung von Verkehrszeichen anregen" im Bundesportal führen
(BB, BY, MV, NI, NW, RP, SH, ST, TH). Abruf: eine Anfrage je Gemeinde, gedrosselt, mit Cache in
`pipeline/data/raw/bundesportal/<LKZ>/` – ein abgebrochener Lauf setzt fort.

```bash
cd pipeline && uv run zust kontakte --land NI     # rund 1 000 Gemeinden: 20–40 Minuten, im Hintergrund
```

Der Lauf schreibt am Ende `kontakte.json` mit dem Code, der beim Start geladen war. Wer danach
`bundesportal.py` ändert, wertet mit `uv run zust kontakte --nur-cache` neu aus (Sekunden).

**Wie gewählt wird** (`pipeline/src/zustkarte/bundesportal.py`, Einzelheiten in
[pipeline/README.md](../pipeline/README.md)):

- Je Gemeinde zwei Kontakte, einer je Rolle: `kreis` (Landratsamt bzw. kreisfreie Stadt;
  `waehle_kreis`, `unsere_stelle`) und `gemeinde` (Rathaus, Verwaltungsgemeinschaft, Amt;
  `waehle_gemeinde`, `eigene_stelle`). Dazu das Urteil `wahl` (`waehle`) für die Regeln.
- Ohne Telefon, E-Mail oder Web fällt eine Stelle weg; E-Mail-Adressen mit Personennamen und
  Kontaktpersonen nie (`funktionspostfach`). Fremde Fachbereiche (Zulassung, Fahrerlaubnis,
  Gewerbe …, `FREMD`) zählen auf der Kreisebene nicht; für die Gemeinde zählt notfalls ihr
  allgemeiner Fachbereich, dann ohne dessen Namen.
- Stellen ohne Behördennamen („Verkehrsaufsicht") erkennt die Auswahl an der Domain der E-Mail
  oder Webseite (`_gehoert_zu`).
- Lücken (`luecken_fuellen`): erst Einträge von Hand, dann der Kreiskontakt der übrigen Gemeinden
  des Kreises, dann der Kontakt des Verbands, den das Portal für die übrigen Mitglieder nennt.
- Der Build (`tools/lib/laender.mjs`) übernimmt einen Kontakt nur, wenn seine Stelle in den
  Ergebnissen der Gemeinde vorkommt: `k…` → `kontakt`, `g…` und `v…` → `kontakt_gemeinde`.

## 4. Durchsehen und Lücken schließen

Vor dem Freigeben die Daten ansehen – das geht, ohne `kontakte.json` zu ändern:

```bash
cd pipeline && uv run python - <<'EOF'
import json
from collections import Counter
from zustkarte import bundesportal as bp
attr = json.load(open("data/interim/gemeinden_attr.json"))["gemeinden"]
daten, review = bp.tabelle(attr, laender=["NI"])
g = {k: v for k, v in daten["gemeinden"].items() if attr[k]["land"] == "NI"}
print("Urteil:", Counter(v["wahl"] for v in g.values()))
print("Kontakt Kreisebene:", sum(v["kreis"] is not None for v in g.values()), "von", len(g))
print("Kontakt Gemeinde:", sum(v["gemeinde"] is not None for v in g.values()))
print("ohne Kreiskontakt:", Counter(attr[k]["kreis"]["name"] for k, v in g.items() if not v["kreis"]).most_common())
EOF
```

Was das Portal für eine einzelne Gemeinde nennt und wie die Auswahl es bewertet:

```bash
cd pipeline && uv run python - <<'EOF'
import json
from pathlib import Path
from zustkarte import bundesportal as bp
attr = json.load(open("data/interim/gemeinden_attr.json"))["gemeinden"]
ars = "032410001001"
c = json.loads(Path(f"data/raw/bundesportal/NI/{ars}.json").read_text())
for s in bp.stellen_aus(c["antwort"]):
    print(s["name"], "|", s["telefon"][:1], "|", s["email"][:2], "| Punkte", bp.punkte(s),
          "| Kreis", bp.unsere_stelle(s, attr[ars]), "| eigene", bp.eigene_stelle(s, attr[ars]))
EOF
```

`zust kontakte` legt außerdem `pipeline/data/review/kontakte-review.csv` ab (alle Stellen mit
Punkten, je Gemeinde eine Zeile) – gut zum Durchsehen nach Kreisen.

**Fehler, die das Portal hatte:** die falsche Stelle für einen ganzen Kreis (Kreis Plön: eine
Stelle der Stadt Quickborn), beim Landratsamt nur Zulassung oder Fahrerlaubnis (Altötting), eine
Stelle ohne jeden Kontaktweg (Norderstedt, Glinde), nur eine persönliche Adresse (Burgkirchen),
eine Stadt als „Kreisstelle", weil die Domain gleich heißt (Pinneberg – dort harmlos, weil die
Stadt selbst zuständig ist). Solche Muster in der Auswahl beheben, wenn sie verallgemeinern
(mit Test in `pipeline/tests/test_bundesportal.py`, am echten Beispiel), sonst von Hand.

**Von Hand:** `pipeline/config/kontakte_ergaenzt.yaml`. Schlüssel ist ein Kreis-ARS (5 Stellen,
Kontakt der Kreisebene für den ganzen Kreis) oder eine Gemeinde-ARS (12 Stellen) mit `rolle:
kreis` oder `rolle: gemeinde`. Nur von der Webseite der Behörde selbst, mit `stand` (Datum) und
einem Kommentar, warum. Nur Funktionspostfächer und Zentralnummern – keine Namen, keine
persönlichen Durchwahlen; nennt eine Seite nur Personen, dann die Zentrale. Die Recherche lässt
sich gut an einen Agenten geben, mit genau diesen Regeln im Auftrag und der Bitte, zu jedem
Eintrag die Seite zu nennen und offen zu sagen, was nicht zu belegen war. Was unsicher bleibt,
kommt in die TODO („Kontakte nachprüfen"); Portalfehler unter „Fehler im Portal melden".

## 5. Freigeben, bauen, prüfen

```bash
# Land in pipeline/config/sources.yaml unter dienste.bundesportal.freigegeben eintragen, dann:
cd pipeline
uv run zust kontakte --nur-cache        # Kontakte neu auswerten
uv run zust laender                     # Landesdateien (nach jeder Regel- oder Kontaktänderung)
uv run zust grenzen                     # nur wenn sich Regeln geändert haben (Färbung eg/sg), ~5 Minuten
uv run zust manifest && uv run zust pruefen
cd .. && node tools/check-kontakte.mjs NI   # keine Lücke bei der zuständigen Stelle?
npm test && (cd pipeline && uv run pytest && uvx ruff check && uvx ruff format --check)
```

**Im Browser** (`npm run serve`, Karte auf `http://127.0.0.1:8080/`): Ein Permalink
`#karte=14/<lat>/<lon>&p=<lat>,<lon>` öffnet die Antwort für einen Punkt. Ansehen: kreisfreie
Stadt, Stadt über der Schwelle, kleine Gemeinde in einem Verband, Klick auf eine Bundesstraße,
eine Alternative mit Kontakt, die Übersicht bei Zoom 5,5 (das Land sollte nicht mehr schraffiert
sein) und das Handy-Format (390 × 844). Für Skripte: Playwright liegt im npx-Cache
(`createRequire("/home/simon/.npm/_npx/e41f203b7505f1fb/node_modules/")`,
`require("playwright-core")`); das Willkommensfenster vorher mit
`context.addInitScript(() => localStorage.setItem("wer-ist-zustaendig.willkommen", "1"))`
ausblenden; `window.__karte` ist die MapLibre-Instanz.

## 6. Doku, Commits, Veröffentlichung

- **CHANGELOG** (Deutsch, unter „Unveröffentlicht"): Landesregel mit Fundstelle und Sicherheit,
  Kontakte, Änderungen an der Auswahl.
- **README:** Zeile im „Stand", die Kontakt-Zeile, bei den Quellen das Rechtsportal.
- **VERTRAG** nur bei neuen Feldern, Ids oder Bedeutungen (die `v`-Ids kamen mit SH), sonst nur
  die Regelversion in der Stand-Zeile.
- **TODO:** Erledigtes streichen, Offenes eintragen (Lücken, unsichere Kontakte, Portalfehler).
- **Commits** nach Conventional Commits, auf Englisch, in kleinen Schritten (Regel und Kontakte,
  Änderungen an der Auswahl, Doku). Gemischte Dateien lassen sich hunkweise stagen.
- **Veröffentlichen** nur nach Rückfrage: Ein Push auf `main` bringt die Karte nach grüner CI
  auf GitHub Pages; die Daten gehen mit `b2 sync` in den Bucket (siehe „Veröffentlichen" in
  [pipeline/README.md](../pipeline/README.md)), danach das Tag `v<regeln.version>`.

## Niedersachsen: Ausgangslage

**Daten** (Abruf 03.10.2026, im Cache, nicht freigegeben): 964 Gemeinden. Portal-Urteil `passt`
708, `fremd` 145, `keine` 94, `stvb` 16, `mehrdeutig` 1. Kontakt der Kreisebene für 762 Gemeinden
(mit Kreiskontakt der Nachbarn); keiner in den Landkreisen Diepholz (45), Gifhorn (42), Stade
(40), Hildesheim (20), Oldenburg (15), Osterholz (11), Verden (11), Wesermarsch (9), Ammerland
(6) und in den kreisfreien Städten Braunschweig, Delmenhorst und Oldenburg (Oldb). 650 Gemeinden
gehören zu einer Samtgemeinde; einen Kontakt der Gemeinde selbst gibt es nur für 124.

**Zu klären** – Hinweise, nichts davon ist geprüft:

- Wie heißt die niedersächsische Zuständigkeitsverordnung zum Straßenverkehrsrecht, in welcher
  Fassung? Primärquelle ist das Landesrecht-Portal NI-VORIS (voris.niedersachsen.de).
- Welche Gemeinden sind selbst Straßenverkehrsbehörde – etwa die großen selbständigen Städte und
  die selbständigen Gemeinden nach dem NKomVG? Wer sind die 16 Gemeinden mit Urteil `stvb`?
- Sonderfälle: Region Hannover und Landeshauptstadt Hannover, die Stadt Göttingen im Landkreis
  Göttingen, Städte mit gleichnamigem Landkreis (Osnabrück, Oldenburg, Hildesheim) – dort kann
  die Domain-Erkennung Kreis und Stadt verwechseln. Beispiel: Für die Landeshauptstadt nennt das
  Portal nur „86.01 - Team Verwaltung" mit Adressen `@region-hannover.de`; die Auswahl hält das
  für eine Stelle der Region und zugleich der Stadt.
- Sind Samtgemeinden für einen Teil der Aufgaben zuständig (wie die Ämter in SH)?
- Die gemeindefreien Gebiete (zum Beispiel Harz, Giebel) gehen an den Landkreis, „vermutlich".
