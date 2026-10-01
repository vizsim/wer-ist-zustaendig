# TODO

Offene Punkte stehen nur hier, und erst nach Abstimmung mit dem Repo-Owner (CLAUDE.md).

> **Stand 2026-10-01: alles unten sind Vorschläge aus Teil A, noch nicht abgestimmt.** Nach der
> Freigabe in „Abgestimmt" verschieben oder streichen.

## Abgestimmt

– noch nichts –

## Vorschläge

### Teil A abschließen

- [ ] **Echter Build** auf einem Rechner mit Zugang zu BKG und Destatis: `uv run zust alles`.
  Danach festhalten: Gemeindezahl je Land, Große Kreisstädte je Land (BY 29, SN um 53, BW um 96),
  Größe von `gemeinden.pmtiles` und der Landesdateien, Ergebnis von `zust pruefen`.
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

- [ ] **Phase 2 – belegte Länder:** BY und SN (Gemeinde nur bei Gemeindestraßen; GKS über
  Textkennzeichen 67), NW (Liste nach § 4 GO NRW), BB (13 namentliche Kommunen, abgestuft), BW
  (Landratsamt, GKS, Stadtkreise, Verwaltungsgemeinschaften; Offenes als Alternative). Je Land
  5–10 Golden-Tests mit echten ARS; Review-CSV durchsehen.
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
