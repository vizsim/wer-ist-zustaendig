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

- [ ] **Phase 2 – belegte Länder:** BY und SN (Gemeinde nur bei Gemeindestraßen; GKS in BY über
  Textkennzeichen 67), NW (Liste nach § 4 GO NRW), BB (13 namentliche Kommunen, abgestuft), BW
  (Landratsamt, GKS, Stadtkreise, Verwaltungsgemeinschaften; Offenes als Alternative). Je Land
  5–10 Golden-Tests mit echten ARS; Review-CSV durchsehen.
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

### Karte und Daten

- [ ] **Bundesportal mit Region:** Deep Link `…/leistung/99108014042000/herausgeber/{Land}-{ID}/region/{ARS}`
  für MV, TH, BY, NI, SH. Herausgeber-IDs beim Build aus der FIM-API ziehen, Links im CI prüfen;
  sonst der Link ohne Region (heute).
- [ ] **Meldelink im Antwortschild:** Issue-Formular mit ARS und Permalink vorbefüllt.
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
