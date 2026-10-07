# TODO

Offene Punkte – neue kommen nur nach Abstimmung mit dem Repo-Owner hinein (CLAUDE.md). Was
erledigt ist, steht im [CHANGELOG](../CHANGELOG.md).

## Veröffentlichung

- [ ] **Rechtliches** (die Karte ist seit 04.10.2026 online): Nutzungsbedingungen des
  Bundesportals – übernommen sind die Kontakte fast aller Gemeinden dreier Länder
  (Datenbankrecht?); eine Lizenz für die Daten ist nicht zu finden, also bei der FITKO anfragen.
  Datenschutzhinweis: Die Karte fragt bei unpkg,
  OpenFreeMap, Photon (komoot) und dem Bucket an, setzt keine Cookies und merkt sich nur, dass
  das Willkommensfenster gelesen ist. Impressum – für diese Karte und die Unfallkarte gleich
  entscheiden. Juristische Durchsicht der Regeln vor dem aktiven Bewerben.
- [ ] **20 Grenzpunkte** aus `pipeline/data/review/grenzpunkte.csv` am BKG-Dienst (WMS VG25)
  gegenprüfen. Das Link-Format (GetFeatureInfo, `CRS:84`) ist aus der Bau-Umgebung nicht
  getestet.

## Regeln je Land

- [ ] **Thüringen, Hauptverordnung** (seit 0.14.0 sind die Städte auf Antrag, die großen
  kreisangehörigen Städte und Eisenach belegt): die Thüringer Verordnung zur Übertragung von
  Ermächtigungen und über Zuständigkeiten auf dem Gebiet des Straßenverkehrsrechts vom 13.02.2007
  (GVBl. S. 11) in der geltenden Fassung lesen – heute nur in der Fassung von 2007; die Buchstaben
  a–e, Abs. 7 und die Änderung vom 20.05.2026 stammen aus einer Sekundärquelle, spätere Änderungen
  haben § 2 umnummeriert. Bis dahin bleiben der Landkreis und die Bundesstraßen der Städte auf
  Antrag „vermutlich".
- [ ] **Niedersachsen, offen** (Regel seit 0.8.0): Übertragungen der Gemeindestraßen nach § 2
  Abs. 2 ZustVO-Verkehr je Landkreis erheben – es gibt kein Verzeichnis; bekannt sind nur 16
  Fälle von Webseiten der Kreise und der Region (`NI_GEMEINDESTRASSEN`, `[S]`); Sarstedt nennt
  nur eine archivierte Kreisseite von 2025. Burgdorf: Rechtsform der Vereinbarung mit der Region
  (§ 165 Abs. 2 NKomVG oder Zweckvereinbarung?) nicht an der Primärquelle geprüft. Nicht gefunden,
  also nicht ausgeschlossen: eine Rückübertragung für Göttingen (§ 168 Abs. 2 NKomVG),
  fortgeltende Modellkommunen-Vereinbarungen (§ 20a ZustVO-Verkehr, etwa Landkreis Cuxhaven),
  eine neuere Liste der selbständigen Gemeinden als die vom 01.01.2022. Alfeld, Seesen,
  Holzminden und Bad Pyrmont haben weniger als 20.001 Einwohner – ein Entzug des Status ist nicht
  bekannt.
- [ ] **Aachen klären** (Regel seit 0.8.0 nur „vermutlich"): Die Stadt ordnet laut ihrem
  Serviceportal Verkehrszeichen selbst an, die Städteregion nennt sich Straßenverkehrsbehörde
  nur für Monschau, Roetgen und Simmerath – Anlage 2 Nr. 25 des Aachen-Gesetzes überträgt aber
  die Trägerschaft der Straßenverkehrsbehörde ohne Ausnahme auf die Städteregion. Bei Stadt oder
  Städteregion nachfragen.
- [ ] **Rheinland-Pfalz belegen:** den Schluss von § 3 Abs. 1 der Landesverordnung BS 923-3 („in
  kreisfreien und großen kreisangehörigen Städten die Stadtverwaltung") an der Primärquelle lesen –
  heute nur aus lexsoft; die 29. bis 31. Änderung waren nicht lesbar. Im GVBl. gelesen sind die
  Änderungen 14 bis 28 und 32 (bis 15.06.2026): Anlage 1 zu § 5 Abs. 1 ist seit 2010 leer,
  Bundesstraßen außerorts bleiben bei der Kreisverwaltung. Danach „belegt" statt „vermutlich" und
  `[S]` aus den Fundstellen.
- [ ] **Mecklenburg-Vorpommern:** den Wortlaut von § 68 Abs. 2 des Funktional- und
  Kreisstrukturreformgesetzes lesen – laut Bürgerportal Ludwigslust-Parchim und Amt Neuburg erteilen
  Ämter und amtsfreie Gemeinden danach die Erlaubnis für Veranstaltungen in ihrem Gebiet (§ 29 Abs. 2
  StVO); Verkehrszeichen nach § 45 ordnen sie nicht an (§ 4 Abs. 1 StVZustLVO, gelesen). Die geltende
  Fassung der StVZustLVO M-V an landesrecht-mv.de gegenlesen (Änderungen nach 2021 nicht gefunden).
  Kraftfahrstraße B 96 (§ 3 Abs. 3): welche Abschnitte gemeint sind und ob es Abschnitte außerhalb
  von Vorpommern-Rügen gibt, ist nicht geprüft.
- [ ] **Brandenburg, § 4a Abs. 2 StGÜZV:** Veranstaltungen und Baustellen gelten nicht, wenn eine
  Anordnung mehrere Gemeinden betrifft – im Amt Schlieben also nicht für amtsweite Anordnungen;
  die Alternative bildet das nicht ab.
- [ ] **Sachsen-Anhalt belegen** (Regel seit 0.9.0 nur „vermutlich"): Art. 3 § 1 Nr. 5 des
  Gesetzes zur Fortentwicklung der Verwaltungsgemeinschaften vom 13.11.2003 (GVBl. LSA S. 318),
  geändert durch Art. 2 des Ersten Funktionalreformgesetzes vom 22.12.2004 (GVBl. LSA S. 852), an
  landesrecht.sachsen-anhalt.de oder in PADOKA lesen – heute nur aus BVerwG 3 B 91.10, Rn. 2.
  Danach hat die Gemeinde nur die Aufgaben nach § 45 Abs. 1 bis 1d, 3, 4 und 6 bis 8 Satz 1 StVO
  (Fassung 2004); Verkehrseinrichtungen wie Poller ordnet wieder der Landkreis an – die Regel
  bildet das nicht ab. Zu klären: nur Gemeindestraßen, nur innerorts? Vorbehalt in § 90 Abs. 2
  KVG LSA? Tangermünde: laut Stadt ordnet der Landkreis Stendal auch dort an.
- [ ] **Sachsen, erfüllende Gemeinde:** Dass in 13 Verwaltungsgemeinschaften die Große Kreisstadt
  erfüllende Gemeinde ist, folgt aus `verband.sitz` (SDV_ARS) und dem Namen der Gemeinschaft; am
  Gemeindeverzeichnis des Statistischen Landesamts (Tabelle 4) bestätigen.
- [ ] **Baden-Württemberg, Listen vervollständigen** (Regel seit 0.12.0): Ein Verzeichnis, wer
  außer dem Landratsamt zuständig ist, gibt es nicht; die Listen in `js/resolve.js` stammen von den
  Webseiten der Landratsämter und Gemeinden [S]. Untere Verwaltungsbehörden nennen 12 Landratsämter
  nicht vollständig (Göppingen, Hohenlohekreis, Schwäbisch Hall, Main-Tauber-Kreis, Heidenheim,
  Neckar-Odenwald-Kreis, Enzkreis, Freudenstadt, Emmendingen, Lörrach, Tübingen, Alb-Donau-Kreis),
  örtliche Straßenverkehrsbehörden 20 (dieselben ohne Freudenstadt, dazu Ludwigsburg,
  Rems-Murr-Kreis, Ostalbkreis, Calw, Breisgau-Hochschwarzwald, Schwarzwald-Baar-Kreis, Konstanz,
  Reutlingen, Biberach) – dort steht die mögliche Stelle als Alternative. Weg: dieselbe Frage an die
  Landratsämter wie in Karlsruhe, Rastatt und im Rhein-Neckar-Kreis (FragDenStaat) oder an die
  Regierungspräsidien; das RP Karlsruhe nennt 24 örtliche Straßenverkehrsbehörden, in den Listen
  stehen 22 (Buchen nur nach dem GBl. 1991). Verwaltungsgemeinschaften als untere
  Verwaltungsbehörde: laut Innenministerium 38, bekannt 27.
- [ ] **Baden-Württemberg, Belege prüfen:** Rottweil – das Landratsamt nennt sich auch in den
  Großen Kreisstädten Rottweil und Schramberg für die klassifizierten Straßen zuständig (Seite von
  2022, gegen § 19 LVG); die Regel bleibt bei der Stadt. Achern – die eigene Seite nennt das
  Landratsamt, das Formular des Ortenaukreises die Stadt. Schwach belegt: Laupheim (Mitglieder
  nicht genannt), Herbrechtingen (nur „Straßenverkehrsbehörde" im Organigramm), Buchen (GBl.
  1991), Bad Säckingen (Rechtsform nicht genannt), Mössingen (nur „Ansprechpartner" für die
  Partner), Langenau (ohne ausdrückliche Erklärung), Fronreute und Wolpertswende (der Verband oder
  jede Gemeinde?), Oppenau (unter 5.000 Einwohnern). Annahme: Erklärungen aus der Zeit vor 2025
  gelten weiter, auch wenn die Einwohnerzahl gesunken ist (deshalb ab 90 % der Schwelle).
- [ ] **Deutsch-luxemburgisches Kondominium** (abgestimmt 2026-10-02): Die 25 Flächen auf Mosel,
  Sauer und Our nennen heute die Stelle der angrenzenden Gemeinde, „nur Ebene". Zuständigkeit
  nach dem Grenzvertrag prüfen.
- [ ] **Berlin, offen** (Regel seit 0.11.0 nur „vermutlich"): das übergeordnete Straßennetz als
  Zuständigkeit je Straße (Netz-WFS im Geoportal) – erst damit ist die Aufteilung Senat/Bezirk mehr
  als der Anhalt über die Straßenklasse. Die geltende Fassung von ASOG Bln, Zuständigkeitskatalog
  Ordnungsaufgaben Nr. 11 Abs. 3 und 4, Nr. 22b Abs. 3 bis 7 an gesetze.berlin.de prüfen – heute
  aus dem Gesetzentwurf Drs. 18/2410 (2020). Das Verwaltungsstrukturreformgesetz (GVBl. 2025
  S. 270) hebt den Katalog auf; sobald das gilt, die Regel neu lesen. Optional feste Punkte für
  die übrigen acht Bezirke.
- [ ] **Hamburg, Polizeikommissariate als Flächen** (Regel seit 0.13.0, nur Ebene): Welches
  Kommissariat zuständig ist, zeigt die Karte noch nicht. Laut Suchergebnissen gibt es den Datensatz
  „Polizeikommissariate Hamburg" im Transparenzportal und bei Metaver einen „WFS
  Polizeikommissariate Hamburg" bzw. „Gebietsgrenzen Polizeikommissariate" – nicht gelesen;
  Adresse, Feldnamen und Lizenz sind unbekannt, die Hamburger Server waren aus der Bau-Umgebung
  nicht erreichbar. Weg wie in Berlin: ein Eintrag je Kommissariat (`0200000000` + Nummer), ein
  Layer, Kontakte je Kommissariat von polizei.hamburg. Dafür GetCapabilities und DescribeFeatureType
  des Dienstes oder eine GeoJSON beschaffen.
- [ ] **Bremen, Anlage der Verordnung:** Die Straßen der Anlage trennen Amt und Polizei bei
  Baustellen und Veranstaltungen; die Polizei steht deshalb in jeder Klasse als Alternative.
  Abbilden erst mit der Zuständigkeit je Straße.
- [ ] **Hessen, offen** (Regel seit 0.10.0, belegt nach § 10 StVRZustV): Die 14 Abschnitte von Bundesstraßen mit
  besonderer Verkehrsbedeutung (§ 9 Abs. 2, Hessen Mobil) stehen nur im Text; abbilden erst mit der
  Zuständigkeit je Straße. Maßgeblich ist die Einwohnerzahl des Hessischen Statistischen Landesamts
  zum letzten Stichtag vor dem Haushaltsjahr (§ 10a Abs. 2) – heute GV-ISys 31.12.2025. Hanau ist
  seit 2026 kreisfrei (`HE_KREISFREI_SEIT_2026`; GV-ISys 31.10.2026: Kreis 06415); bis zum nächsten
  Datenstand heißt der Kreis noch Main-Kinzig-Kreis, danach meldet `pruefeListen` den alten
  Schlüssel.
- [ ] **Hamburg, Fundstelle:** die Anordnung über Zuständigkeiten auf dem Gebiet des
  Straßenverkehrsrechts (Abschnitte I bis IX) an landesrecht-hamburg.de lesen und spätere
  Änderungen suchen; prüfen, ob das Handbuch der Behörde für Inneres und Sport von 2022 noch gilt.
- [ ] **Aufsicht:** höhere Straßenverkehrsbehörde je Land mit Fundstelle; Feld `aufsicht`.
  Gefunden: NW die Bezirksregierungen (§ 6 ZustVO Straßenverkehr); NI das Verkehrsministerium
  über Landkreise, Region und Städte, der Landkreis über die übrigen Gemeinden (§ 171 Abs. 5
  NKomVG); SN die Landkreise über die Gemeinden als örtliche Straßenverkehrsbehörden (§ 24 Abs. 2
  SächsStrVRG). Die Listen der Länder (dazu die Großen Kreisstädte in SN) (§ 4 GO NRW, StGÜZV, selbständige Gemeinden in NI) gehören in
  die jährliche Rechtsdurchsicht.
- [ ] **Validierung:** etwa 10 Gemeinden je Land, geschichtet; juristische Durchsicht der Regeln
  und der Review-CSV; danach Version 1.0.

## Kontakte

- [ ] **Kontakte nachprüfen** (aus der Stichprobe vom 03.10.2026): Wartburgkreis – im Portal
  03695 61-6103, auf der Webseite 61-6106. Ebersberg – Postfach mit `.bayern.de` oder ohne.
  Sömmerda – Webseite nicht geprüft. Mühlhausen – die Stadt nennt keine eigene Verkehrsstelle,
  heute die allgemeine Adresse. Bei mehreren Landratsämtern nennt die Webseite nur die Zentrale.
  Flensburg – das Portal nennt das Technische Betriebszentrum (TBZ, info@tbz-flensburg.de);
  prüfen, ob die Straßenverkehrsbehörde dort sitzt oder in einer anderen Stelle der Stadt.
  Kreis Plön – die Verkehrsaufsicht nennt sich auf der Webseite nicht Straßenverkehrsbehörde;
  zugeordnet über die Nummer der „Abteilung Verkehrsangelegenheiten". Kaltenkirchen – die Seite
  nennt das Sachgebiet Verkehrswesen für Verkehrszeichen, nicht ausdrücklich als
  Straßenverkehrsbehörde. Niedersachsen (04.10.2026): Bei den Landkreisen Diepholz, Lüneburg und
  Osterholz ist die Nummer der Stelle zugleich eine persönliche Durchwahl; Wesermarsch hat nur
  `info@`; Landkreis Oldenburg – `verkehrslenkung@` steht nicht ausdrücklich bei Verkehrszeichen;
  Lüneburg – `av@` ist das Postfach der Allgemeinen Verkehrsangelegenheiten.
- [ ] **Niedersachsen, Lücken:** 75 Gemeinden ohne Kontakt der zuständigen Stelle (`node
  tools/check-kontakte.mjs NI --stellen`), vor allem Gemeinden und Samtgemeinden mit übertragenen
  Gemeindestraßen und selbständige Samtgemeinden (Bersenbrück, Artland). Die selbständigen Städte
  Hannover, Göttingen, Hildesheim, Hameln, Garbsen und Nordhorn stehen seit 0.14.0 von Hand da, der
  Landkreis Hildesheim nur mit der allgemeinen Anschrift – seine Webseite nennt keine Stelle für
  Verkehrszeichen. Dazu 644 Alternativen (meist Samtgemeinden) ohne Kontakt. Von den Webseiten
  ergänzen.
- [ ] **Schleswig-Holstein, Kontakte der Alternative:** Für 194 Gemeinden in Ämtern (etwa Amt
  Südtondern, Nordsee-Treene, Geltinger Bucht) und 34 amtsfreie Gemeinden nennt das Portal keinen
  Kontakt des Amts bzw. der Gemeinde – die Alternative steht dort ohne Kontakt. Von den
  Webseiten der Ämter ergänzen.
- [ ] **Mecklenburg-Vorpommern, Kontakte:** Für die Landkreise Rostock und Nordwestmecklenburg gibt es
  nur die allgemeine Anschrift (seit 0.15.0, 193 Gemeinden). Die Straßenverkehrsbehörde selbst
  ergänzen, sobald die Webseiten lesbar sind: in Rostock das Amt für Straßenbau und Verkehr, in
  Nordwestmecklenburg laut Amt Schönberger Land Langer Steinschlag 4, Grevesmühlen, ohne eigenes
  Postfach.
- [ ] **Kontakte in NW, BB und RP** (abgerufen 05.10.2026, nicht freigegeben): NW – für 236 von
  396 Gemeinden nennt das Portal keine Stelle, auch nicht für die kreisfreien Städte; Aachen steht
  von Hand bereit. BB – für 331 von 413 Gemeinden leere Antworten. RP – den Kontakt der eigenen
  Verbandsgemeinde gibt es für 62 % der Gemeinden; das Portal nennt oft die Stellen anderer
  Verbandsgemeinden des Kreises; die Kreisverwaltung als Alternative meist ohne Kontakt. Seit
  0.14.0 trennt die Auswahl Stadt und Kreis gleichen Namens (Steinfurt, Warendorf) und lässt
  Landesbehörden weg (Landesbetrieb Mobilität Trier). Von Hand ergänzen, dann freigeben.
- [ ] **Sachsen-Anhalt, Lücken** (freigegeben seit 0.9.0): nur 14 von 218 Gemeinden mit Kontakt in
  jeder Klasse (`node tools/check-kontakte.mjs ST --stellen`). Für Gemeindestraßen nennt das Portal
  die Gemeinde bzw. Verbandsgemeinde nur 13-mal; ohne Kreiskontakt sind noch der Burgenlandkreis
  und die Landkreise Anhalt-Bitterfeld und Jerichower Land (51 Gemeinden) – ihre Webseiten waren
  aus der Bau-Umgebung nicht erreichbar. Dessau-Roßlau (ohne Telefon, aus den Antragsformularen),
  Halle (Saale), Magdeburg, der Landkreis Harz und der Salzlandkreis stehen seit 0.14.0 von Hand
  da. Von den Webseiten ergänzen.
- [ ] **Fehler im Portal melden** – Redaktion Thüringen: Landkreis Saalfeld-Rudolstadt (für alle
  Gemeinden nur das Ordnungsamt der VG „Schwarzatal"), Landkreis Hildburghausen (für alle
  Gemeinden die Stadtverwaltung Hildburghausen), Suhl (nur „Gewerbeangelegenheiten").
  Redaktion Bayern: Landkreis Altötting (beim Landratsamt nur die Fahrerlaubnisbehörde),
  Würzburg („Verkehrsregelung" ohne Telefon und E-Mail), gemeindefreies Gebiet Heinersreuther
  Forst (Landratsamt Neustadt a.d.Waldnaab statt Bayreuth). Redaktion Schleswig-Holstein: Kreis
  Plön (für alle Gemeinden eine „Abteilung Verkehrsangelegenheiten" ohne Kontaktweg und die Stadt
  Quickborn aus dem Kreis Pinneberg); Norderstedt und Glinde (eigene Stelle ohne Kontaktweg,
  dafür der Kreis). Redaktion Niedersachsen: für die meisten selbständigen Städte die Stelle des
  Landkreises bzw. der Region, für Hannover die Region; Göttingen (Stelle der Stadt Hann. Münden);
  Landkreis Stade (Stellen von Buxtehude und Harsefeld für die übrigen Gemeinden); Landkreise
  Oldenburg, Ammerland, Diepholz und Lüneburg (Straßenverkehrsamt ohne Behördennamen, teils ohne
  Kontaktweg oder nur mit persönlicher Adresse); Landkreis Wesermarsch (Tiefbau der Gemeinde
  Berne); Landkreis Gifhorn (nur die Zulassungsstelle). Danach die Einträge in
  `config/kontakte_ergaenzt.yaml` löschen.
- [ ] **Hamburg, Kontakte** (kein Bundesportal-Eintrag): für die Verkehrsdirektion ein
  Funktionspostfach von polizei.hamburg finden, dann `"02000"` von Hand und `HH` in `nur_von_hand`;
  die Kommissariate erst mit ihren Flächen.
- [ ] **Bremerhaven, Kontakt:** Anschrift und Postfach stammen aus einem Schreiben der
  Straßenverkehrsbehörde vom 03.04.2024 (FragDenStaat); die Seite auf bremerhaven.de lehnt
  automatische Abrufe ab (403). Hausnummer am Stadthaus 5 und Telefon im Browser nachtragen, dann
  `quelle` streichen und `stand` setzen.
- [ ] **Kontakte fester Stellen** (Vorschlag): ein neues Feld, etwa `kontakte_stellen` (feste
  Stelle → Kontakt), damit auch die Polizei Bremen als Alternative einen Kontakt bekommt (Zentrale:
  In der Vahr 76, 28329 Bremen, 0421 362-0, `office@polizei.bremen.de`, laut Service-Portal
  Bremen). Betrifft `auswahl`, Build, Pipeline und VERTRAG; `kontakt_gemeinde` dafür umzudeuten
  wäre ein Bruch.
- [ ] **Verkehrsstellen statt allgemeiner Anschrift** (Sachsen, Hessen, Saarland,
  Baden-Württemberg, `allgemein`): Seit 0.14.0 stehen für die Kreisebene 75 Straßenverkehrsbehörden
  von Hand da. Ohne eigene Stelle, also mit der allgemeinen Anschrift, sind noch Chemnitz, Dresden
  und Leipzig; der Lahn-Dill-Kreis, die Landkreise Bergstraße und Offenbach und der Wetteraukreis;
  die Stadtkreise Freiburg, Heilbronn und Ulm, der Alb-Donau-Kreis, der Enzkreis, die Landkreise
  Emmendingen und Neckar-Odenwald-Kreis und der Rems-Murr-Kreis. Im Browser gegenlesen – in
  `config/kontakte_ergaenzt.yaml` mit „PRÜFEN" markiert, schwächer belegt: Frankfurt am Main
  (Antragsformular von 2022), die Landkreise Marburg-Biedenkopf (allgemeine Kontaktdaten), Fulda
  (keine eigenen Kontaktdaten) und Hersfeld-Rotenburg (Zuordnung über Abteilung und Postfach),
  Baden-Baden (Abteilung mit Zulassung und Fahrerlaubnis), Calw und Ravensburg (nur Dienstleistungs-
  bzw. Bürgerportal), die Anschriften in Zwickau und Kamenz, das Telefon in Aachen. Für die
  Gemeinden bleibt die allgemeine Anschrift: Sachsen – Verwaltungsverbände stehen nicht im
  Verzeichnis, heute die Gemeinde am Sitz, beim Verwaltungsverband Eilenburg-West (Sitz in
  Eilenburg) die Gemeinde selbst. Hessen und Saarland – das Anschriftenverzeichnis hat kein Telefon
  und keine Webseite; für Langen, Heusenstamm, Zwingenberg und Kirtorf nennt es nur `presse@`,
  `webmaster@` bzw. die Marketinggesellschaft, dort steht nur die Anschrift.
  Baden-Württemberg – für 207 der 270 Gemeinden am Sitz einer Verwaltungsgemeinschaft hat das
  Verzeichnis nur die Zeile der Gemeinschaft, ohne E-Mail; für 8 weitere nennt es nur ein
  persönliches Postfach oder die Pressestelle (etwa Ravensburg). Für Gemeindestraßen hat deshalb bei
  163 Gemeinden die zuständige Stelle nur eine Anschrift (meist die Gemeinde am Sitz oder die
  Gemeinschaft).

## Karte und Daten

- [ ] **Meldelink im Antwortschild:** Issue-Formular mit ARS und Permalink vorbefüllt.
- [ ] **Größe `by.json`** (1,86 MB, gzip 188 KB): Jede bayerische Gemeinde hat ein eigenes
  Ergebnis für Gemeindestraßen, weil die Stelle `g<ARS>` darin steht. Ein Platzhalter für „die
  Gemeinde selbst" würde die Ergebnisse wieder entdoppeln – Bruch, also Schema 2.
- [ ] **Einwohner aus VG250-EW**, sobald für 31.12.2025 erschienen (heute: GV-ISys).
- [ ] **Gebietsänderungen** zusätzlich aus der Destatis-Liste der Namens- und
  Gebietsänderungen (heute: Vergleich mit der Monatsausgabe).
- [ ] **Stufe 2 – Zuständigkeit je Straße:** Straßen an Gemeindegrenzen schneiden, Stelle je
  Stück; eigene Straßenkacheln.
- [ ] **Modus „Baulast"** (wer baut um) auf derselben Gemeindetabelle.

## Unfallkarte

- [ ] Einbau: Module als gepinnte Kopie mit Tag (`docs/VERTRAG.md`).

## Betrieb

- [ ] Jährlich im Sommer: neuer Gebietsstand (VG25 im Juli, GV-ISys-Jahresausgabe im August);
  Diff „Gemeinden mit geänderter Zuständigkeit" aus der Review-CSV.
- [ ] Jährliche Rechtsdurchsicht; Link-Check der Bundesportal-Links.

## Anfragen

- [ ] PVOG-Zugang (FITKO/Dataport), örtliche StVB in BW (Regierungspräsidien),
  Verwaltungsgemeinschaften als untere Verwaltungsbehörde (Innenministerium BW), Lizenz der
  FIM-Texte und des Anschriftenverzeichnisses.
