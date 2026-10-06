# Changelog

Nennenswerte Änderungen für Nutzer der Karte und der Dateien ([docs/VERTRAG.md](docs/VERTRAG.md)).
Format nach [Keep a Changelog](https://keepachangelog.com/de/1.1.0/). Die Versionen folgen der
Regelversion (`REGELN.version` in `js/resolve.js`); mit jeder Veröffentlichung im Bucket kommt
ein Git-Tag `v<version>` dazu.

## [Unveröffentlicht]

### Hinzugefügt

- Landesregeln für Bremen und Hamburg – damit hat jedes Land eine eigene Regel. Bremen (**belegt**,
  Verordnung über die Zuständigkeiten nach der Straßenverkehrs-Ordnung): in der Stadt Bremen das Amt
  für Straßen und Verkehr, für Baustellen, Veranstaltungen und Haltverbote für Wohnungsumzüge die
  Polizei Bremen (als Alternative); in Bremerhaven der Magistrat. Hamburg (**nur Ebene**): das
  zuständige Polizeikommissariat, etwa für Ampeln, Kraftfahrstraßen, Ortstafeln, Wegweiser und den
  Umbau von Hauptverkehrsstraßen die Verkehrsdirektion der Polizei (als Alternative).
- Kontakte in Bremen: das Amt für Straßen und Verkehr (Webseite) und die Straßenverkehrsbehörde
  in Bremerhaven (Schreiben der Behörde).

### Geändert

- Hamburg: Als Fundstelle steht die Anordnung über Zuständigkeiten auf dem Gebiet des
  Straßenverkehrsrechts vom 05.01.1999 (noch nicht an der Primärquelle geprüft), die Aufteilung nach
  dem Handbuch der Behörde für Inneres und Sport.
- Bremen: Fundstelle mit Absatz und Gesetzblatt. Die Stelle in Bremerhaven heißt „Magistrat der Stadt
  Bremerhaven", ohne „(Ortspolizeibehörde)".
- Karte: Das Willkommensfenster nennt Hamburg unter „Nur die Ebene", die Standzeile sagt
  „Landesregeln für alle Länder, in Hamburg nur die Ebene". In der Legende steht bei „nur Ebene":
  „Welche Stelle genau zuständig ist, ist offen".
- Für Konsumenten: neue feste Stellen `hb-pol` (Polizei Bremen) und `hh-vd` (Verkehrsdirektion
  Hamburg). „nur Ebene" heißt nicht mehr „Land offen", sondern: welche Stelle genau, ist offen. Die
  Kontakte in Bremen ordnet `kontaktRolle` erst ab Regeln 0.13.0 zu; eine gepinnte Kopie von
  `js/resolve.js` zeigt sie sonst nicht. Einträge von Hand können ihre Herkunft selbst angeben
  (`quelle`).

## [0.12.0] – 2026-10-06

Landesregel für Baden-Württemberg, zusammen vierzehn Länder – alle Flächenländer und Berlin; Kontakte
für jede Gemeinde als allgemeine Anschrift der Verwaltung. Regeln 0.12.0 · Schema 1 · Datenstand
31.12.2025.

### Hinzugefügt

- Landesregel Baden-Württemberg (StVO-Zuständigkeitsgesetz vom 29.04.2025): Stadtkreise und Große
  Kreisstädte sind für alle Straßen zuständig (**belegt**), sonst das Landratsamt – **belegt**, wo nach
  den Einwohnern niemand anders zuständig sein kann. Verwaltungsgemeinschaften, die untere
  Verwaltungsbehörde sind, sind für alle Straßen ihrer Gemeinden zuständig; Gemeinden und
  Gemeinschaften, die örtliche Straßenverkehrsbehörde sind, für ihre Gemeindestraßen
  (**vermutlich**, nach den Webseiten der Landratsämter und Gemeinden). Wo eine Gemeinde oder
  Gemeinschaft es nach ihren Einwohnern sein könnte, steht sie als Alternative da.
- Kontakte in Baden-Württemberg für jede Gemeinde: die allgemeine Anschrift von Rathaus bzw.
  Landratsamt aus dem Anschriftenverzeichnis der Statistischen Ämter. Ist die Verwaltungsgemeinschaft
  zuständig, nennt die Auskunft das Rathaus an ihrem Sitz, sonst das der Gemeinde. Für die meisten
  Gemeinden am Sitz einer Gemeinschaft hat das Verzeichnis keine E-Mail; dort steht nur die Anschrift.

### Geändert

- Willkommensfenster und Standzeile: Bremen zählt als geregelt (feste Zuordnung, belegt), offen ist
  nur noch Hamburg. Die Standzeile nennt statt aller Länder mit Regel nur noch die offenen.
- `js/resolve.js` erwartet in Baden-Württemberg je Verband `verband.ew` und `verband.mitglieder`; der
  Build ergänzt sie. Wer `resolveGemeinde` selbst aufruft statt die Landesdateien zu lesen, ergänzt
  sie ebenso ([docs/VERTRAG.md](docs/VERTRAG.md)).

## [0.11.0] – 2026-10-05

Landesregel für Berlin je Bezirk, zusammen dreizehn Länder; Kontakte für alle zwölf Bezirksämter und
die Senatsverwaltung. Regeln 0.11.0 · Schema 1 · Datenstand 31.12.2025.

### Hinzugefügt

- Landesregel Berlin (**vermutlich**): Auf Gemeindestraßen ordnet das Bezirksamt an, auf Kreis-,
  Landes- und Bundesstraßen die Senatsverwaltung (Abteilung Verkehrsmanagement) – jeweils mit der
  anderen Stelle als Alternative, denn maßgeblich ist, ob die Straße zum übergeordneten
  Straßennetz gehört. Die Karte nennt das Bezirksamt des Bezirks, in dem der Punkt liegt.
- Die zwölf Berliner Bezirke als eigene Einträge in `be.json` (`110000000001` bis
  `110000000012`, Feld `bezirk`) und als Layer `bezirke` in `gemeinden.pmtiles`, Grenzen aus dem
  Geoportal Berlin (ALKIS Berlin Bezirke, dl-de/zero-2.0).
- Kontakte in Berlin: alle zwölf Bezirksämter und die Senatsverwaltung als allgemeine Anschrift,
  von den Webseiten der Behörden (Quelle `von_hand`).

### Geändert

- Berlin als Ganzes (`110000000000`): für Kreis-, Landes- und Bundesstraßen jetzt die
  Senatsverwaltung (**vermutlich**) statt nur der Ebene.
- Die Auskunft nennt jeden Ort nur einmal („Bezirk Mitte, Berlin", „Stadt München, Bayern").

## [0.10.0] – 2026-10-05

Landesregeln für Hessen und das Saarland, beide belegt, zusammen zwölf Länder; Kontakte für beide als
allgemeine Anschrift der Verwaltung. Regeln 0.10.0 · Schema 1 · Datenstand 31.12.2025.

### Hinzugefügt

- Landesregel Hessen (**belegt**, § 10 der Verordnung zur Bestimmung verkehrsrechtlicher
  Zuständigkeiten, Fassung vom 28.01.2026): Kreisfreie Städte und die sieben Sonderstatus-Städte
  sind für alle Straßen zuständig. In den übrigen Gemeinden ordnet die Gemeinde auf Gemeinde- und
  Kreisstraßen an, auch außerorts, auf Landesstraßen ab mehr als 7.500 Einwohnern; sonst und auf
  Bundesstraßen der Landkreis. Als Alternative steht der Landkreis da, wenn eine Anordnung über das
  Gemeindegebiet hinaus wirkt, und an Landesstraßen für Ampeln und Fußgängerüberwege. Gemeinden bis
  10 % unter 7.500 Einwohnern können nach § 10a noch zuständig sein (**vermutlich**, mit der
  Gemeinde als Alternative). Auf Autobahnen und 14 Abschnitten von Bundesstraßen ordnet Hessen
  Mobil an – das steht nur im Text.
- Landesregel Saarland (**belegt**, §§ 7 und 12 Straßenverkehrszuständigkeitsgesetz): Auf
  Gemeindestraßen ordnet die Gemeinde an, sonst der Landkreis bzw. der Regionalverband Saarbrücken;
  die Landeshauptstadt Saarbrücken ist für alle Straßen zuständig.
- Kontakte in Hessen und im Saarland für jede Gemeinde und jede Straßenklasse aus dem
  Anschriftenverzeichnis der Statistischen Ämter des Bundes und der Länder (Stand 31.01.2026): die
  **allgemeine Anschrift** von Rathaus bzw. Kreisverwaltung mit E-Mail, ohne Telefon und Webseite –
  mit demselben Hinweis wie in Sachsen. Postfächer wie `presse@` oder `webmaster@` sind nicht
  übernommen; dann steht nur die Anschrift da (fünf Gemeinden, darunter Wiesbaden).
- Antwortkarte: Hat ein Kontakt nur eine Anschrift, steht nicht mehr „Kontaktdaten haben wir noch
  nicht" darunter.

## [0.9.0] – 2026-10-05

Landesregeln für Sachsen und Sachsen-Anhalt, zusammen zehn Länder; Kontakte für Sachsen-Anhalt und
– als allgemeine Anschrift der Verwaltung – für Sachsen; in der Karte der Schalter „Kontakt
vorhanden". Regeln 0.9.0 · Schema 1 · Datenstand 31.12.2025.

### Hinzugefügt

- Landesregel Sachsen (**belegt**, Sächsisches Straßenverkehrsrechtsgesetz): Auf Gemeindestraßen
  ordnet die Gemeinde Verkehrszeichen an – in einer Verwaltungsgemeinschaft die erfüllende Gemeinde,
  im Verwaltungsverband der Verband –, sonst das Landratsamt. Kreisfreie Städte und die 53 Großen
  Kreisstädte sind für alle Straßen zuständig; ist eine Große Kreisstadt erfüllende Gemeinde, auch für
  die übrigen Gemeinden ihrer Verwaltungsgemeinschaft.
- Kontakte in Sachsen für alle 418 Gemeinden und jede Straßenklasse aus dem Gemeindeverzeichnis
  der Landesdirektion Sachsen (Datenlizenz Deutschland – Namensnennung 2.0). Sachsen führt die
  Leistung nicht im Bundesportal; das Verzeichnis nennt die **allgemeine Anschrift** von Rathaus
  bzw. Landratsamt, nicht die der Straßenverkehrsbehörde. Die Antwortkarte sagt das dazu: „bitte
  nach der Straßenverkehrsbehörde fragen". In einer Verwaltungsgemeinschaft bzw. einem
  Verwaltungsverband steht die Verwaltung an deren Sitz da. Bürgermeister und E-Mail-Adressen mit
  Personennamen sind nicht übernommen.
- Neues Feld `allgemein` an Kontakten: `true`, wenn der Kontakt nur die allgemeine Anschrift der
  Verwaltung ist; in `index.json` je Land die Zahl solcher Gemeinden (`laender[].allgemein`). Die
  Kontakte eines Landes können eine eigene Quelle haben – `daten.kontakte` und `quellen` nennen sie
  („Landesdirektion Sachsen 05.10.2026").
- Landesregel Sachsen-Anhalt (**vermutlich** – die Vorschrift ist nur aus einer Entscheidung des
  BVerwG und den Webseiten der Behörden bekannt): Gemeindestraßen bei der Gemeinde bzw.
  Verbandsgemeinde, außerhalb geschlossener Ortschaften der Landkreis als Alternative; Kreis-,
  Landes- und Bundesstraßen beim Landkreis.
- Kontakte in Sachsen-Anhalt aus dem Bundesportal: der Landkreis für Kreis-, Landes- und
  Bundesstraßen in sechs Landkreisen (123 von 218 Gemeinden); für Gemeindestraßen nennt das Portal
  die Gemeinde bzw. Verbandsgemeinde nur in 13 Fällen.
- Karte: Schalter „Kontakt vorhanden" in der Legende. Er färbt die Gemeinden danach, ob es einen
  Kontakt der zuständigen Stelle gibt – für alle Straßen, für einen Teil, nur die allgemeine
  Anschrift der Verwaltung (blau, heute Sachsen), nur den Link ins Bundesportal oder noch nichts;
  unter Zoomstufe 7 je Kreis. Der Zustand steht im Link (`ansicht=kontakt`). Dafür das neue Feld
  `ko` in beiden Layern der Grenzschicht.

## [0.8.0] – 2026-10-05

Landesregeln für fünf weitere Länder – Niedersachsen, Nordrhein-Westfalen, Brandenburg,
Mecklenburg-Vorpommern und Rheinland-Pfalz, zusammen acht. Regeln 0.8.0 · Schema 1 · Datenstand
31.12.2025.

### Hinzugefügt

- Landesregel Niedersachsen (ZustVO-Verkehr in der Fassung vom 30.06.2025, NKomVG, gelesen in
  NI-VORIS): der Landkreis bzw. die Region Hannover (**belegt**); kreisfreie Städte, Hannover und
  Göttingen, die 7 großen selbständigen Städte und die 64 selbständigen Gemeinden – darunter die
  Samtgemeinden Artland, Bersenbrück und Harsefeld – für alle Straßen (**belegt**, Liste des
  Innenministeriums vom 09.11.2021). Gemeindestraßen kann der Landkreis auf Antrag übertragen; ein
  Verzeichnis gibt es nicht. Deshalb sind Gemeindestraßen sonst nur **vermutlich** beim Landkreis,
  mit der Samtgemeinde bzw. einer Gemeinde über 10.000 Einwohner als Alternative; 16 Übertragungen,
  die Landkreise oder die Region auf ihren Webseiten nennen, stehen als Gemeinde bzw. Samtgemeinde
  da. Burgdorf: laut Region nimmt sie die Aufgabe seit 2019 wahr (**vermutlich**). Regeln 0.8.0.
- Kontakte in Niedersachsen aus dem Bundesportal, für 12 Landkreise und kreisfreie Städte von den
  Webseiten der Behörden. 865 von 964 Gemeinden haben den Kontakt der zuständigen Stelle; es fehlen
  vor allem viele selbständige Städte (das Portal nennt dort den Landkreis oder nichts) und der
  Landkreis Hildesheim – dort führt die Karte ins Bundesportal.
- Landesregel Nordrhein-Westfalen (**belegt**): Straßenverkehrsbehörde ist der Kreis bzw. die
  kreisfreie Stadt (§ 5 der Zuständigkeitsverordnung Straßenverkehr, Fassung vom 07.11.2025).
  Mittlere und Große kreisangehörige Städte ordnen Verkehrszeichen für alle Straßen selbst an
  (§ 10) – 167 Städte nach der Verordnung zu § 4 GO NRW, Fassung vom 01.01.2025. Die Stadt Aachen
  ordnet ebenfalls selbst an, nur **vermutlich**: Das Aachen-Gesetz überträgt die Trägerschaft der
  Straßenverkehrsbehörde auf die Städteregion (Anlage 2 Nr. 25).
- Landesregel Brandenburg (**belegt**, StGÜZV, zuletzt geändert 23.08.2024): der Landkreis bzw. die
  kreisfreie Stadt; Eberswalde, Eisenhüttenstadt und Schwedt/Oder (§ 4 Abs. 4) sowie auf Antrag
  Guben, Prenzlau, Teltow und Werder (Havel) (§ 4a Abs. 1) für alle Straßen selbst. Wittenberge,
  Kyritz, Finsterwalde, Luckau, Kleinmachnow und das Amt Schlieben ordnen Halten und Parken,
  Baustellen, Veranstaltungen und den Schutz von Gemeindestraßen selbst an (§ 4a Abs. 2) – in der
  Karte als Alternative.
- Landesregel Mecklenburg-Vorpommern (**belegt**, StVZustLVO M-V vom 12.08.2021): der Landkreis bzw.
  die kreisfreie Stadt; die großen kreisangehörigen Städte Greifswald, Neubrandenburg, Stralsund und
  Wismar sowie Städte mit mehr als 20.000 Einwohnern ordnen Verkehrszeichen selbst an. Nach der
  Übergangsregel bleiben auch Neustrelitz, Waren (Müritz) und Parchim zuständig.
- Landesregel Rheinland-Pfalz (**vermutlich** – der Wortlaut ist nur aus einer Sekundärquelle
  gelesen, Anlage 1 fehlt): Verkehrszeichen ordnet die Verbandsgemeinde bzw. die verbandsfreie
  Gemeinde an, auf Gemeindestraßen überall, auf Bundes-, Landes- und Kreisstraßen innerhalb
  geschlossener Ortschaften; außerorts die Kreisverwaltung, in der Karte als Alternative.
  Kreisfreie und große kreisangehörige Städte für alle Straßen. Die Karte färbt RP als
  „Gemeindeverband".
- Kontakte in Mecklenburg-Vorpommern aus dem Bundesportal: 385 von 724 Gemeinden. Für Schwerin und
  die Landkreise Rostock, Nordwestmecklenburg und Ludwigslust-Parchim nennt das Portal keine Stelle.
  In Nordrhein-Westfalen, Brandenburg und Rheinland-Pfalz bleiben die Kontakte vorerst aus: Das
  Portal nennt dort kaum Stellen bzw. (RP) oft nicht die eigene Verbandsgemeinde.

### Geändert

- Karte: Die Statuszeile zählt die Länder mit Landesregel als „A, B und C" auf, nach Namen sortiert;
  das Willkommensfenster ebenso.
- Karte: Die Legende nennt den Gemeindeverband (Verbandsgemeinde, Samtgemeinde).
- Willkommensfenster: „Vermutlich" heißt jetzt „die Regel ist nicht für jede Gemeinde gesichert"
  statt „die Regel stammt aus einer Sekundärquelle" – in Niedersachsen liegt es an den
  unveröffentlichten Übertragungen, nicht an der Quelle.
- Kontaktauswahl: Eine Stelle mit dem Namen eines Kreises, der den Gemeindenamen enthält und mehr
  sagt, gilt nicht als Stelle der Gemeinde (`@region-hannover.de` ist nicht die Landeshauptstadt).

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
