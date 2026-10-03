# TODO

Offene Punkte stehen nur hier, und erst nach Abstimmung mit dem Repo-Owner (CLAUDE.md).

> **Stand 2026-10-01: alles unten sind Vorschläge aus Teil A, noch nicht abgestimmt.** Nach der
> Freigabe in „Abgestimmt" verschieben oder streichen.

## Abgestimmt

– noch nichts –

## Vorschläge

### Teil A abschließen

- [x] **Echter Build** (2026-10-02, Regeln 0.2.0, `uv run zust alles`):
  - 10 974 Einträge: 10 949 Gemeinden und gemeindefreie Gebiete, dazu 25 Kondominium-Flächen
    (24 RP, 1 SL). Je Land: BB 413, BE 1, BW 1 103, BY 2 221, HB 2, HE 425, HH 1, MV 724,
    NI 964, NW 396, RP 2 324, SH 1 106, SL 53, SN 418, ST 218, TH 605.
  - Große Kreisstädte: BW 96, BY 29, SN 0 (siehe Phase 2).
  - `gemeinden.pmtiles` 43,0 MB, mit `low_detail` 10 (2026-10-03) 29,8 MB; Landesdateien
    zusammen 2 164 KB (gzip 221 KB), größte RP 448 KB (gzip 36 KB) und BY 437 KB (gzip 45 KB).
  - `zust pruefen`: 9/9 feste Punkte; 200/200 Zufallspunkte mit genau einem ARS; 195
    Grenzpaare ohne Überlappung, 5 davon außen leer (nach den Koordinaten Küste oder
    Staatsgrenze).
- [ ] **20 Grenzpunkte** aus `pipeline/data/review/grenzpunkte.csv` am BKG-Dienst (WMS VG25)
  gegenprüfen. Das Link-Format (GetFeatureInfo, `CRS:84`) ist aus der Bau-Umgebung nicht
  getestet.
- [ ] **GitHub-Repo** `vizsim/wer-ist-zustaendig` anlegen und pushen; CI prüfen.
- [ ] **Bucket:** Dateien unter `zustaendigkeit/` hochladen. CORS für den Ursprung der Karte
  (GitHub Pages) prüfen – für die eigenen Dateien und für die Straßenkacheln der Unfallkarte
  (`osm/maxspeed_major.pmtiles`, `osm/maxspeed_minor.pmtiles`).
- [ ] **Veröffentlichung:** GitHub Pages; öffentlich verlinken erst nach juristischer Freigabe.

### Teil B (Unfallkarte, nach Freigabe)

- [ ] Einbau nach Auftrag Teil B; Module als gepinnte Kopie mit Tag (`docs/VERTRAG.md`).

### Regeln je Land (Plan § 7)

- [x] **Bayern** (2026-10-03, Regeln 0.5.0, belegt an gesetze-bayern.de): Gemeinde für
  Gemeindestraßen, auch in Verwaltungsgemeinschaften (§ 1 Nr. 5 AufVGem); Landratsamt für K, St,
  B; GKS und kreisfreie Städte für alles. Golden-Tests mit Essenbach, Apfeldorf, Freising,
  München, Heinersreuther Forst.
- [x] **Thüringen** (2026-10-03, Regeln 0.5.0, vermutlich): Städte über 30.000 Einwohner und
  Eisenach für alles; Städte auf Antrag (§ 2 Abs. 7) für alles außer Bundesstraßen.
- [ ] **Thüringen belegen:** Zuständigkeitsverordnung Straßenverkehr (13.02.2007, zuletzt
  geändert 20.05.2026) an der Primärquelle lesen – landesrecht.thueringen.de lädt nur mit
  JavaScript; heute aus umwelt-online. Die Rechtsverordnung nach § 2 Abs. 8 mit der Liste der
  Städte auf Antrag beschaffen; heute erkannt am Bundesportal (Apolda, Eisenberg, Heilbad
  Heiligenstadt) oder von Hand (Arnstadt, `TH_STAEDTE_AUF_ANTRAG`); die übrigen 20 Gemeinden mit
  10.000 bis 30.000 Einwohnern stehen bis dahin als Alternative da. Die großen kreisangehörigen
  Städte nach ThürKO abgleichen – GV-ISys führt in Thüringen kein Textkennzeichen 67.
- [x] **Schleswig-Holstein** (2026-10-03, Regeln 0.7.0, belegt an
  gesetze-rechtsprechung.sh.juris.de, StrVRZustVO Fassung 01.12.2025): Kreis bzw. kreisfreie
  Stadt; Gemeinden über 20.000 Einwohner und Glinde (Anlage) selbst; Amt bzw. amtsfreie Gemeinde
  für Halten und Parken, Baustellen, Veranstaltungen (Alternative). Knapp um 20.000 Einwohner
  (± 1.000) nur vermutlich – welche Einwohnerzahl maßgeblich ist, sagt die Verordnung nicht.
- [ ] **Phase 2 – weitere belegte Länder:** SN (Gemeinde nur bei Gemeindestraßen), NW (Liste nach
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
- [ ] **Phase 3 – Stadtstaaten:** Berlin (Netz-WFS: Straßen des übergeordneten Netzes,
  Bezirksgrenzen), Hamburg (Polizeikommissariate als Flächen).
- [ ] **Phase 4/5:** HE, NI, MV, SH, TH; danach RP (Verbandsgemeinde über ARS-Stellen 6–9,
  innerorts/außerorts), SL, ST.
- [ ] **Fundstellen nachprüfen:** Berlin (Katalogwortlaut nur sekundär), Hamburg (Titel und
  Fassung der Zuständigkeitsanordnung). Die Texte in `js/resolve.js` sagen das bisher offen.
- [ ] **Phase 6 – Aufsicht:** höhere StVB je Land mit Fundstelle; Feld `aufsicht`.
- [ ] **Phase 7 – Validierung:** etwa 10 Gemeinden je Land, geschichtet; Juristin prüft Regeln
  und Review-CSV; danach Version 1.0.

### Kontakte (Bundesportal)

- [x] **Thüringen und Bayern fertig** (2026-10-03, `freigegeben` in `sources.yaml`): Für jede
  Gemeinde und jede Straßenklasse hat die zuständige Stelle einen Kontakt. Kreisebene: TH 605/605,
  BY 2 221/2 221. Gemeinde selbst: TH 134, BY 2 055. Portal-Urteil TH: 533 bestätigt, 4 Städte, die
  sich selbst Straßenverkehrsbehörde nennen (Apolda, Eisenberg, Heilbad Heiligenstadt, Ilmenau).
  BY: 2 176 bestätigt, 19 mit eigener Straßenverkehrsbehörde. Von Hand
  (`config/kontakte_ergaenzt.yaml`): Kreise Saalfeld-Rudolstadt, Hildburghausen, Sonneberg, Suhl,
  Altötting, Würzburg; Städte Arnstadt, Gotha, Mühlhausen; Gemeinden Burgkirchen a.d.Alz, Bad
  Aibling, Lautertal, VG Dentlein a.Forst.
- [x] **Schleswig-Holstein fertig** (2026-10-03): Für jede Gemeinde und jede Straßenklasse hat die
  zuständige Stelle einen Kontakt (1 106/1 106). Portal-Urteil: 1 021 bestätigt, 68 fremd, 17
  keine Stelle. Von Hand: Kreis Plön, Städte Norderstedt, Eckernförde, Kaltenkirchen, Glinde.
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
- [ ] **Die übrigen Bundesportal-Länder** (BB, MV, NI, NW, RP, ST): abrufen (RP und NI liegen
  im Cache, BB zu einem Viertel), Review-CSV durchsehen, Auswahlregel nachschärfen und in
  `freigegeben` aufnehmen. RP: Das Portal nennt meist die Verbandsgemeinde (nach Konzept
  innerorts zuständig) – Regel dafür klären, bevor RP freigegeben wird.
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
- [ ] **Nutzungsbedingungen** des Bundesportals vor dem Veröffentlichen kurz prüfen (Seite
  „Rechtliche Hinweise"); einzelne Kontaktangaben sind Fakten, nur Funktionspostfächer.

### Karte und Daten

- [ ] **Bundesportal mit Region:** Für Länder mit abgerufenen Kontakten schon da
  (`bundesportal_region`, Herausgeber-Id aus der Länderliste der Leistung). Für die übrigen
  Bundesportal-Länder kommt er mit `zust kontakte`; Links im CI prüfen.
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

### Betrieb (Phase 8)

- [ ] Jährlich im Sommer: neuer Gebietsstand (VG25 im Juli, GV-ISys-Jahresausgabe im August);
  Diff „Gemeinden mit geänderter Zuständigkeit" aus der Review-CSV.
- [ ] Jährliche Rechtsdurchsicht; Link-Check der Bundesportal-Links.

### Anfragen (Plan Phase 0)

- [ ] PVOG-Zugang (FITKO/Dataport), örtliche StVB in BW (Regierungspräsidien), Lizenz der
  FIM-Texte und des Anschriftenverzeichnisses.
