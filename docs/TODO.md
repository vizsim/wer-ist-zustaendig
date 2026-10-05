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

- [ ] **Thüringen belegen:** Zuständigkeitsverordnung Straßenverkehr (13.02.2007, zuletzt
  geändert 20.05.2026) an der Primärquelle lesen – landesrecht.thueringen.de lädt nur mit
  JavaScript; heute aus umwelt-online. Die Rechtsverordnung nach § 2 Abs. 8 mit der Liste der
  Städte auf Antrag beschaffen; heute erkannt am Bundesportal (Apolda, Eisenberg, Heilbad
  Heiligenstadt) oder von Hand (Arnstadt, `TH_STAEDTE_AUF_ANTRAG`); die übrigen 20 Gemeinden mit
  10.000 bis 30.000 Einwohnern stehen bis dahin als Alternative da. Die großen kreisangehörigen
  Städte nach ThürKO abgleichen – GV-ISys führt in Thüringen kein Textkennzeichen 67.
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
- [ ] **Rheinland-Pfalz belegen:** die Landesverordnung über Zuständigkeiten auf dem Gebiet des
  Straßenverkehrsrechts (BS 923-3) an landesrecht.rlp.de lesen, heute nur aus lexsoft (Fassung
  08.12.2020); offen sind die 29. und 31. Änderung (GVBl. 2025 S. 63, 2026 S. 86). Anlage 1 in
  `RP_ANLAGE_1` eintragen und klären, wer bei Bundesstraßen außerorts zuständig ist. Danach
  „belegt" statt „vermutlich" und `[S]` aus den Fundstellen.
- [ ] **Mecklenburg-Vorpommern:** was § 68 Abs. 2 FKrG den Ämtern und amtsfreien Gemeinden im
  Straßenverkehr überträgt (heute: keine Alternative); die konsolidierte Fassung der StVZustLVO
  M-V an landesrecht-mv.de gegenlesen (Änderungen nach 2021 nicht vollständig gesucht).
- [ ] **Brandenburg, § 4a Abs. 2 StGÜZV:** Veranstaltungen und Baustellen gelten nicht, wenn eine
  Anordnung mehrere Gemeinden betrifft – im Amt Schlieben also nicht für amtsweite Anordnungen;
  die Alternative bildet das nicht ab.
- [ ] **Sachsen-Anhalt belegen** (Regel seit 0.9.0 nur „vermutlich"): Art. 3 § 1 Nr. 5 des
  Gesetzes zur Fortentwicklung der Verwaltungsgemeinschaften vom 13.11.2003 (GVBl. LSA S. 318,
  neu gefasst 22.12.2004) an landesrecht.sachsen-anhalt.de lesen – heute nur aus BVerwG 3 B 91.10
  und Webseiten der Behörden. Zu klären: nur Gemeindestraßen, nur innerorts (dann bleibt der
  Landkreis als Alternative außerorts)? Wo steht, dass die Landkreise untere
  Straßenverkehrsbehörde sind (`TEXTE.quelle.stUnter`)? Vorbehalt in § 90 Abs. 2 KVG LSA?
  Tangermünde: laut Stadt ordnet der Landkreis Stendal auch dort an.
- [ ] **Sachsen, erfüllende Gemeinde:** Dass in 13 Verwaltungsgemeinschaften die Große Kreisstadt
  erfüllende Gemeinde ist, folgt aus `verband.sitz` (SDV_ARS) und dem Namen der Gemeinschaft; am
  Gemeindeverzeichnis des Statistischen Landesamts (Tabelle 4) bestätigen.
- [ ] **Weitere belegte Länder:** BW (Landratsamt, GKS, Stadtkreise, Verwaltungsgemeinschaften;
  Offenes als Alternative). 5–10 Golden-Tests mit echten ARS; Review-CSV durchsehen.
- [ ] **Deutsch-luxemburgisches Kondominium** (abgestimmt 2026-10-02): Die 25 Flächen auf Mosel,
  Sauer und Our nennen heute die Stelle der angrenzenden Gemeinde, „nur Ebene". Zuständigkeit
  nach dem Grenzvertrag prüfen.
- [ ] **Stadtstaaten:** Berlin (Netz-WFS: Straßen des übergeordneten Netzes,
  Bezirksgrenzen), Hamburg (Polizeikommissariate als Flächen).
- [ ] **Übrige Länder:** HE, SL.
- [ ] **Fundstellen nachprüfen:** Berlin (Katalogwortlaut nur sekundär), Hamburg (Titel und
  Fassung der Zuständigkeitsanordnung). Die Texte in `js/resolve.js` sagen das bisher offen.
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
- [ ] **Niedersachsen, Lücken:** 99 Gemeinden ohne Kontakt der zuständigen Stelle (`node
  tools/check-kontakte.mjs NI --alle`). Für die meisten selbständigen Städte nennt das Portal den
  Landkreis oder nichts (etwa Hameln, Hildesheim, Göttingen, Hannover, Garbsen, Nordhorn); der
  Landkreis Hildesheim (20 Gemeinden) nennt auf seiner Webseite nur die Zulassungsstelle; ohne
  Kontakt sind auch die Gemeinden und Samtgemeinden mit übertragenen Gemeindestraßen. Dazu 643
  Alternativen (meist Samtgemeinden) ohne Kontakt. Von den Webseiten ergänzen.
- [ ] **Schleswig-Holstein, Kontakte der Alternative:** Für 194 Gemeinden in Ämtern (etwa Amt
  Südtondern, Nordsee-Treene, Geltinger Bucht) und 34 amtsfreie Gemeinden nennt das Portal keinen
  Kontakt des Amts bzw. der Gemeinde – die Alternative steht dort ohne Kontakt. Von den
  Webseiten der Ämter ergänzen.
- [ ] **Mecklenburg-Vorpommern, Lücken:** 339 Gemeinden ohne Kontakt der zuständigen Stelle
  (`node tools/check-kontakte.mjs MV --alle`): Für Schwerin und die Landkreise Rostock,
  Nordwestmecklenburg und Ludwigslust-Parchim nennt das Portal keine Stelle, dazu fehlen Güstrow,
  Waren (Müritz), Neustrelitz und Wismar. Greifswald: das Portal nennt die Abteilung
  „Unterhaltung von Verkehrsanlagen" (Tiefbau) – prüfen. Von den Webseiten ergänzen.
- [ ] **Kontakte in NW, BB und RP** (abgerufen 05.10.2026, nicht freigegeben): NW – für 236 von
  396 Gemeinden nennt das Portal keine Stelle, auch nicht für die kreisfreien Städte; Stadt und
  Kreis gleichen Namens verwechselt die Auswahl (Steinfurt: als Kontakt der Stadt die Kreisstelle;
  Warendorf: die Stelle mit `@warendorf.de` gilt auch als Kreisstelle). BB – für 331 von 413
  Gemeinden leere Antworten. RP – den Kontakt der eigenen Verbandsgemeinde gibt es für 62 % der
  Gemeinden; das Portal nennt oft die Stellen anderer Verbandsgemeinden des Kreises; Fehlgriff
  „Landesbetrieb Mobilität Trier" für die VG Trier-Land (Domain mit „trier"); die Kreisverwaltung
  als Alternative meist ohne Kontakt. Auswahl nachschärfen (Domain-Teile wie `kreis-`,
  Landesbetriebe ausschließen), von Hand ergänzen, dann freigeben.
- [ ] **Sachsen-Anhalt, Lücken** (freigegeben seit 0.9.0): nur 9 von 218 Gemeinden mit Kontakt in
  jeder Klasse (`node tools/check-kontakte.mjs ST --alle`). Für Gemeindestraßen nennt das Portal
  die Gemeinde bzw. Verbandsgemeinde nur 13-mal; ohne Kreiskontakt sind die Landkreise
  Anhalt-Bitterfeld, Harz, Jerichower Land und Salzlandkreis, der Burgenlandkreis und die
  kreisfreien Städte Dessau-Roßlau, Halle (Saale) und Magdeburg. Von den Webseiten ergänzen.
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
- [ ] **Länder ohne Bundesportal-Eintrag** (BW, BE, HB, HH, HE, SL): Kontakte der Stellen der
  Kreisebene und der Stadtstaaten anders beschaffen (Landesportale oder von Hand).
- [ ] **Sachsen, Verkehrsstellen** (seit 0.9.0 die allgemeine Anschrift aus dem Gemeindeverzeichnis
  der Landesdirektion, `allgemein`): Die Straßenverkehrsämter der 10 Landratsämter und 3 Kreisfreien
  Städte von deren Webseiten in `config/kontakte_ergaenzt.yaml` (Kreis-ARS) eintragen – sie gehen
  dann vor. Für das Landratsamt Sächsische Schweiz-Osterzgebirge nennt das Verzeichnis als E-Mail
  nur `landrat@`, der Kontakt hat deshalb keine. Verwaltungsverbände stehen nicht im Verzeichnis:
  heute die Gemeinde am Sitz, beim Verwaltungsverband Eilenburg-West (Sitz in Eilenburg) die
  Gemeinde selbst.

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

- [ ] PVOG-Zugang (FITKO/Dataport), örtliche StVB in BW (Regierungspräsidien), Lizenz der
  FIM-Texte und des Anschriftenverzeichnisses.
