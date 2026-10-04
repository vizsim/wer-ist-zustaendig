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
- [ ] **Niedersachsen:** Die Kontakte liegen im Cache (964 Gemeinden, abgerufen 03.10.2026).
  Landesregel recherchieren, Lücken schließen – ohne Kreiskontakt sind unter anderem die
  Landkreise Diepholz, Gifhorn, Stade und Hildesheim –, dann freigeben.
- [ ] **Weitere belegte Länder:** SN (Gemeinde nur bei Gemeindestraßen), NW (Liste nach
  § 4 GO NRW), BB (13 namentliche Kommunen, abgestuft), BW (Landratsamt, GKS, Stadtkreise,
  Verwaltungsgemeinschaften; Offenes als Alternative). Je Land 5–10 Golden-Tests mit echten
  ARS; Review-CSV durchsehen.
- [ ] **Große Kreisstädte in Sachsen** (abgestimmt 2026-10-02): GV-ISys führt sie als 63
  (Stadt), nicht 67; VG25 kennzeichnet sie nicht. Liste der rund 53 GKS mit ARS aus der
  Primärquelle als Konfiguration anlegen, dann `pruefungen.yaml` (SN, heute 0) anpassen. Bis
  dahin bekommen sächsische Gemeinden keine GKS-Alternative.
- [ ] **Deutsch-luxemburgisches Kondominium** (abgestimmt 2026-10-02): Die 25 Flächen auf Mosel,
  Sauer und Our nennen heute die Stelle der angrenzenden Gemeinde, „nur Ebene". Zuständigkeit
  nach dem Grenzvertrag prüfen.
- [ ] **Stadtstaaten:** Berlin (Netz-WFS: Straßen des übergeordneten Netzes,
  Bezirksgrenzen), Hamburg (Polizeikommissariate als Flächen).
- [ ] **Übrige Länder:** HE, MV; danach RP (Verbandsgemeinde über ARS-Stellen 6–9,
  innerorts/außerorts), SL, ST.
- [ ] **Fundstellen nachprüfen:** Berlin (Katalogwortlaut nur sekundär), Hamburg (Titel und
  Fassung der Zuständigkeitsanordnung). Die Texte in `js/resolve.js` sagen das bisher offen.
- [ ] **Aufsicht:** höhere Straßenverkehrsbehörde je Land mit Fundstelle; Feld `aufsicht`.
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
  Straßenverkehrsbehörde.
- [ ] **Schleswig-Holstein, Kontakte der Alternative:** Für 194 Gemeinden in Ämtern (etwa Amt
  Südtondern, Nordsee-Treene, Geltinger Bucht) und 34 amtsfreie Gemeinden nennt das Portal keinen
  Kontakt des Amts bzw. der Gemeinde – die Alternative steht dort ohne Kontakt. Von den
  Webseiten der Ämter ergänzen.
- [ ] **Die übrigen Bundesportal-Länder** (BB, MV, NW, RP, ST): abrufen (RP liegt im Cache, BB
  zu einem Viertel), Review-CSV durchsehen, Auswahlregel nachschärfen und in `freigegeben`
  aufnehmen. RP: Das Portal nennt meist die Verbandsgemeinde, die innerorts zuständig sein
  kann – Regel dafür klären, bevor RP freigegeben wird.
- [ ] **Fehler im Portal melden** – Redaktion Thüringen: Landkreis Saalfeld-Rudolstadt (für alle
  Gemeinden nur das Ordnungsamt der VG „Schwarzatal"), Landkreis Hildburghausen (für alle
  Gemeinden die Stadtverwaltung Hildburghausen), Suhl (nur „Gewerbeangelegenheiten").
  Redaktion Bayern: Landkreis Altötting (beim Landratsamt nur die Fahrerlaubnisbehörde),
  Würzburg („Verkehrsregelung" ohne Telefon und E-Mail), gemeindefreies Gebiet Heinersreuther
  Forst (Landratsamt Neustadt a.d.Waldnaab statt Bayreuth). Redaktion Schleswig-Holstein: Kreis
  Plön (für alle Gemeinden eine „Abteilung Verkehrsangelegenheiten" ohne Kontaktweg und die Stadt
  Quickborn aus dem Kreis Pinneberg); Norderstedt und Glinde (eigene Stelle ohne Kontaktweg,
  dafür der Kreis). Danach die Einträge in `config/kontakte_ergaenzt.yaml` löschen.
- [ ] **Länder ohne Bundesportal-Eintrag** (BW, BE, HB, HH, HE, SL, SN): Kontakte der rund 105
  Stellen der Kreisebene und der Stadtstaaten anders beschaffen (Landesportale oder von Hand).

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
