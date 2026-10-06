# Ein Land einbauen

So sind die Länder mit eigener Regel in die Karte gekommen – als Ablauf für das nächste Land. Grundregeln stehen in [CLAUDE.md](../CLAUDE.md), der Vertrag
mit den Konsumenten in [VERTRAG.md](VERTRAG.md).

**Fertig ist ein Land, wenn**

- `js/resolve.js` für jede Gemeinde und jede Straßenklasse (G, K, L, B) eine Stelle nennt, mit
  Sicherheit, Begründung und Fundstelle, und Golden-Tests mit echten ARS jeden Zweig der Regel
  abdecken;
- die zuständige Stelle überall einen Kontakt hat: `node tools/check-kontakte.mjs <LKZ>` meldet
  keine Lücke (Alternativen ohne Kontakt sind erlaubt, kommen aber in die TODO);
- README, CHANGELOG und TODO den neuen Stand zeigen und alles in kleinen Commits liegt.

## Die Länder im Überblick

| Land | Rechtsgrundlage und wo gelesen | Regel | Sicherheit |
|---|---|---|---|
| BY | ZustGVerk Art. 2, 3, 6; GrKrV § 2 Nr. 2; AufVGem § 1 Nr. 5; VGemO Art. 4 – [gesetze-bayern.de](https://www.gesetze-bayern.de) | Gemeindestraßen: die Gemeinde (in einer Verwaltungsgemeinschaft bleibt sie zuständig, die VG erledigt die Verwaltungsarbeit); Kreis-, Staats-, Bundesstraßen: das Landratsamt; Große Kreisstädte (Textkennzeichen 67) und kreisfreie Städte: alles | belegt; gemeindefreie Gebiete vermutlich |
| TH | Thüringer Zuständigkeitsverordnung Straßenverkehrsrecht vom 13.02.2007, Stand 20.05.2026 – nur bei umwelt-online, also Sekundärquelle `[S]`; das Landesportal lädt nur mit JavaScript und ließ sich nicht rendern | über 30.000 Einwohner und Eisenach: alles; Städte auf Antrag (§ 2 Abs. 7: 10.000–30.000 Einwohner, erkannt am Portal-Urteil `stvb` oder an `TH_STAEDTE_AUF_ANTRAG`): alles außer Bundesstraßen; sonst der Landkreis, Gemeinden mit 10.000–30.000 Einwohnern als Alternative | vermutlich |
| SH | StrVRZustVO §§ 3–5 und Anlage, Fassung 01.12.2025 – [gesetze-rechtsprechung.sh.juris.de](https://www.gesetze-rechtsprechung.sh.juris.de), im Browser gerendert | Kreis bzw. kreisfreie Stadt; über 20.000 Einwohner und Glinde (Anlage, `SH_AUF_ANTRAG`): die Gemeinde; Amt bzw. amtsfreie Gemeinde als Alternative für Halten und Parken, Baustellen, Veranstaltungen (neue Stellen-Id `v` + Amts-ARS) | belegt; ± 1.000 um 20.000 Einwohner vermutlich |
| NI | ZustVO-Verkehr § 2, Fassung 30.06.2025; NKomVG §§ 14–18, 159 – [NI-VORIS](https://voris.wolterskluwer-online.de), gerendert; Liste der selbständigen Gemeinden: Nds. MBl. 2021 S. 1690 (PDF) | Landkreis bzw. Region Hannover; kreisfreie Städte, Hannover, Göttingen (`NI_WIE_KREISFREI`), große selbständige Städte und selbständige Gemeinden, auch drei Samtgemeinden (`NI_SELBSTAENDIG`, nach Liste – keine Schwelle): alles; Gemeindestraßen auf Antrag übertragbar, ohne Verzeichnis: bekannte Fälle (`NI_GEMEINDESTRASSEN`, `[S]`) die Gemeinde bzw. Samtgemeinde, sonst der Landkreis mit Samtgemeinde oder Gemeinde über 10.000 Einwohner als Alternative; Burgdorf per Vereinbarung bei der Region (`NI_VEREINBARUNG`) | belegt; Gemeindestraßen außerhalb der selbständigen Gemeinden vermutlich |
| NW | ZustVO Straßenverkehr §§ 5, 10, Fassung 07.11.2025; Verordnung nach § 4 GO NRW, Fassung 01.01.2025 – [recht.nrw.de](https://recht.nrw.de) | Kreis bzw. kreisfreie Stadt; 35 Große und 132 Mittlere kreisangehörige Städte (`NW_…`, nach Liste – keine Schwelle): alles; Aachen selbst | belegt; Aachen vermutlich (Aachen-Gesetz, Anlage 2 Nr. 25) |
| BB | StGÜZV §§ 4, 4a, zuletzt geändert 23.08.2024 – [BRAVORS](https://bravors.brandenburg.de) | Landkreis bzw. kreisfreie Stadt; 3 Große kreisangehörige Städte und 4 Städte auf Antrag: alles; 6 Kommunen, darunter das Amt Schlieben (`v`, `untere`), nur Halten und Parken, Baustellen, Veranstaltungen – als Alternative | belegt |
| MV | StVZustLVO M-V vom 12.08.2021 – GVOBl. M-V (PDF) | Landkreis bzw. kreisfreie Stadt; 4 große kreisangehörige Städte; Städte über 20.000 Einwohner; Übergangsregel als Liste (`MV_STAEDTE_UEBERGANG`) | belegt; bis 1.000 über 20.000 vermutlich |
| RP | Landesverordnung BS 923-3 – nur lexsoft `[S]`, landesrecht.rlp.de war nicht erreichbar | Verbandsgemeinde bzw. verbandsfreie Gemeinde: Gemeindestraßen, sonst innerorts; außerorts die Kreisverwaltung als Alternative; kreisfreie und 8 große kreisangehörige Städte: alles | vermutlich |
| SN | SächsStrVRG §§ 1–3, 24; SächsKomVerfRDVO § 1 Nr. 2; SächsGemO § 3 Abs. 2; SächsKomZG §§ 7, 36 – [REVOSax](https://www.revosax.sachsen.de) | Gemeindestraßen: die Gemeinde, in der Verwaltungsgemeinschaft die erfüllende Gemeinde, im Verwaltungsverband der Verband (`v`); sonst das Landratsamt; Kreisfreie Städte und 53 Große Kreisstädte (`SN_GROSSE_KREISSTAEDTE`, nach AGS): alles, als erfüllende Gemeinde auch für die Verwaltungsgemeinschaft | belegt |
| ST | Art. 3 § 1 Nr. 5 des Gesetzes zur Fortentwicklung der Verwaltungsgemeinschaften – nicht gelesen, Inhalt aus BVerwG 3 B 91.10 und Webseiten | Gemeindestraßen: Gemeinde bzw. Verbandsgemeinde, außerorts der Landkreis als Alternative; sonst der Landkreis | vermutlich |
| HE | StVRZustV § 10 Abs. 1 Nr. 2, § 10a; § 9 Abs. 2 (Hessen Mobil) – [Bürgerservice Hessenrecht](https://www.rv.hessenrecht.hessen.de) | kreisfreie Städte und Sonderstatus-Städte (`HE_SONDERSTATUS`): alles; sonst G und K die Gemeinde (Landkreis als Alternative bei überörtlicher Wirkung), L die Gemeinde mit mehr als 7.500 Einwohnern (Landkreis als Alternative für Ampeln und Fußgängerüberwege), sonst und B der Landkreis; 6.750–7.500 Einwohner (§ 10a) mit der Gemeinde als Alternative | belegt |
| SL | StVZustG §§ 7, 12 – [Bürgerservice Saarland](https://recht.saarland.de) | G: die Gemeinde; sonst der Landkreis bzw. der Regionalverband Saarbrücken; die Landeshauptstadt Saarbrücken alles | belegt |
| BE | ASOG Bln, Zuständigkeitskatalog Ordnungsaufgaben Nr. 11 Abs. 4, Nr. 22b Abs. 3 – nicht an der Primärquelle gelesen; Aufteilung laut Service-Portal Berlin und Bezirksämtern | G: das Bezirksamt des Bezirks (Layer `bezirke`, Einträge `1100000000` + Nummer), Senat als Alternative; K, L, B: die Senatsverwaltung, Bezirksamt als Alternative; ganz Berlin: Bezirksamt nur als Ebene | vermutlich |
| BW | StVO-Zuständigkeitsgesetz vom 29.04.2025 §§ 1–3 (GBl. 2025 Nr. 36, PDF beim Landtag); LVG §§ 15, 17, 19 | Stadtkreise und Große Kreisstädte: alles; Verwaltungsgemeinschaften als untere Verwaltungsbehörde (`BW_VG_UNTERE`, Gruppen je Gemeinschaft): alles für ihre Gemeinden; örtliche Straßenverkehrsbehörden (`BW_OERTLICH`, `BW_OERTLICH_VG`): Gemeindestraßen, das Landratsamt als Alternative; sonst das Landratsamt, die Gemeinde bzw. Gemeinschaft als Alternative ab 90 % der Schwellen (5.000 bzw. 20.000), außer in Kreisen mit vollständiger Liste (`BW_VOLLSTAENDIG`) | belegt: Stadtkreise, Große Kreisstädte, Landratsamt ohne mögliche andere Stelle; vermutlich: Listen [S] und Alternativen |
| HB | Verordnung über die Zuständigkeiten nach der Straßenverkehrs-Ordnung vom 19.01.2016 § 1 Abs. 3, 4 und Anlage, zuletzt geändert 02.09.2025 – [Transparenzportal Bremen](https://www.transparenz.bremen.de) | Stadt Bremen: das Amt für Straßen und Verkehr (`hb-asv`), die Polizei (`hb-pol`) als Alternative für Baustellen, Veranstaltungen, Haltverbote für Wohnungsumzüge; Bremerhaven: der Magistrat (`hb-bhv`) | belegt |
| HH | Anordnung über Zuständigkeiten auf dem Gebiet des Straßenverkehrsrechts vom 05.01.1999 – nicht gelesen, landesrecht-hamburg.de war nicht erreichbar; Aufteilung nach dem Handbuch der BIS (Datei vom 12.12.2022, FragDenStaat) | das zuständige Polizeikommissariat (`hh-pk`), die Verkehrsdirektion (`hh-vd`) als Alternative | nur Ebene |

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
  Kommentar: `TH_STAEDTE_AUF_ANTRAG`, `SH_AUF_ANTRAG`. Ohne Gemeindetabelle zur Hand auch nach
  Kreis und Namen, für Verbände als Gruppen je Gemeinschaft (BW). Der Build prüft sie mit
  `pruefeListen` und warnt.
- **`REGELN.version`** um eine Minor-Stelle erhöhen (neues Land).
- **Größe:** Steht eine Gemeinde (`g…`) oder ein Verband (`v…`) im Ergebnis, bekommt jede
  Gemeinde ein eigenes Ergebnis – `by.json` hat deshalb 1,9 MB (gzip 190 KB).

**Golden-Tests** in `tests/resolve.test.js` mit echten Gemeinden, je Zweig mindestens eine:
kreisfreie Stadt, gemeindefreies Gebiet, Gemeinde über und unter jeder Schwelle, knapp an der
Schwelle, Listen-Gemeinde, Verbandsgemeinde, jede Alternative, die Klassen, in denen sich
etwas ändert. Die Tests für den Rückfall („Phase 1") nehmen Gemeinden unter dem erfundenen
Kürzel „XX" (`ohneRegel`); seit Bremen und Hamburg hat jedes Land eine Regel. Echte Schlüssel und Zahlen
holen:

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

Länder ohne Portal-Eintrag brauchen eine eigene Quelle. Sachsen nimmt die Anschriften der
Verwaltungen aus dem Gemeindeverzeichnis der Landesdirektion (`anschriften.py`, „Kontakte in
Sachsen" in `pipeline/README.md`). Das ist nur die allgemeine Anschrift, deshalb tragen die
Kontakte `allgemein`, und die Karte sagt das dazu.

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
  Ergebnissen der Gemeinde vorkommt. Welcher Kontakt zu welcher Stelle gehört, sagt `kontaktRolle`
  in `js/resolve.js`: `k…`, in Berlin `be-senat`, in Bremen `hb-asv` und `hb-bhv`, in Hamburg
  `hh-vd` → `kontakt`; `g…` und `v…` → `kontakt_gemeinde`; aus den Anschriftenverzeichnissen für
  einen Verband, der allein vorkommt, das Rathaus am Sitz (Rolle `verband`). Eine neue feste Stelle
  mit Kontakt der Kreisebene gehört in `ROLLE_KREIS`, in `js/resolve.js` und in `grenzen.py`.

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
kreis`, `rolle: gemeinde` oder `rolle: verband` (nur der Verband, wenn die Gemeinde selbst einen
anderen Kontakt hat). Möglichst von der Webseite der Behörde selbst, mit `stand` (Datum) und
einem Kommentar, warum; stammt ein Eintrag von woanders (etwa aus einem Schreiben der Behörde),
sagt `quelle` woher. Nur Funktionspostfächer und Zentralnummern – keine Namen, keine
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
sein, mit dem Schalter „Kontakt vorhanden" zeigt sie die Lücken bei den Kontakten) und das Handy-Format (390 × 844). Für Skripte: Playwright liegt im npx-Cache
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

## Was beim Einbauen auffiel

- **Status statt Schwelle:** Wer selbst zuständig ist, folgt aus einer amtlichen Liste, nicht aus
  der Einwohnerzahl, und GV-ISys kennzeichnet den Status nicht. Die Liste als Konstante mit ARS
  anlegen, aus der Quelle erzeugt statt abgetippt, und ihre Länge im Test festhalten.
- **AGS statt ARS, wenn Gemeinden den Verband wechseln:** Die Großen Kreisstädte in Sachsen
  gehören teils einer Verwaltungsgemeinschaft an; deren Schlüssel steckt im ARS und ändert sich
  mit ihr. Eine Liste solcher Gemeinden führt deshalb den AGS (`agsVon(ars)`).
- **Zuständigkeit ohne Verzeichnis:** Übertragungen auf Antrag (hier die Gemeindestraßen) sind
  nirgends gesammelt. Dann „vermutlich" beim Kreis, die mögliche Stelle als Alternative, bekannte
  Fälle von Webseiten der Kreise mit `[S]` als eigene Liste.
- **Das Portal-Urteil `stvb` nicht ungeprüft übernehmen:** Im Landkreis Oldenburg heißt das
  Straßenverkehrsamt des Kreises im Portal nur „Straßenverkehrsamt", die Auswahl hielt es für eine
  Stelle der Gemeinden. Die Regel wertet `stvb` in Niedersachsen nicht aus; den Kreiskontakt gibt
  es von Hand. Dasselbe Muster (Kreisstelle ohne Behördennamen) in Ammerland, Diepholz, Lüneburg.
- **Vor jeder Änderung an der Auswahl** `pipeline/data/interim/kontakte.json` sichern und danach
  vergleichen, welche Kontakte sich in allen Ländern ändern. Der erste Versuch gegen die
  Verwechslung von Region und Landeshauptstadt Hannover hätte 98 Gemeinden in BY, SH und TH den
  Kontakt genommen, weil der Namensvergleich mit Teilwörtern arbeitet („ilm" in „Ilmenau").
- **Recherche knapp halten:** Ein Agent für die Rechtsgrundlage, einer für die Kontakte, mit
  den Regeln aus Schritt 4 im Auftrag. Was danach fehlt, kommt in die TODO, statt weiterzusuchen.
