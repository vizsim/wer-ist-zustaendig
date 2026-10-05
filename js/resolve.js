// resolve.js — Zuständige Straßenverkehrsbehörde je Gemeinde und Straßenklasse. REIN.
// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Zwei Teile:
//  1. Build: `resolveGemeinde(gemeinde)` → Ergebnis je Straßenklasse (G, K, L, B) samt Stellen.
//     tools/build-laender.mjs schreibt daraus die Landesdateien (docs/VERTRAG.md).
//  2. Laufzeit: `auswahl(landesdatei, ars, klassen)` → eine zuständige Stelle für die Straßen
//     einer Auswahl (höchste Klasse gewinnt; Gemeindestraße ggf. als Alternative).
//
// Ohne Landesregel (Phase 1): Rückfall auf die Kreisebene mit amtlichem Namen; Stadtstaaten mit
// eigener Regel. Phase 2: Landesregeln je Land, eingetragen in `LANDESREGELN`.
// Kein Rechtsrat: Jede Aussage trägt Sicherheit und Quelle.

import { kreisBehoerde, mitZusatz, stadtName } from "./namen.js";
import { hoechsteKlasse } from "./strassenklasse.js";

export const REGELN = Object.freeze({ version: "0.8.0", phase: 2, stand: "2026-10-05" });

export const SICHERHEIT = Object.freeze({
  BELEGT: "belegt",
  VERMUTLICH: "vermutlich",
  NUR_EBENE: "nur Ebene",
});
const SICHER_RANG = Object.freeze({ "nur Ebene": 0, vermutlich: 1, belegt: 2 });

/** Klassen, für die der Build je Gemeinde ein Ergebnis erzeugt (A ist überall gleich). */
export const BAU_KLASSEN = Object.freeze(["G", "K", "L", "B"]);

export const BUNDESPORTAL =
  "https://verwaltung.bund.de/leistungsverzeichnis/de/leistung/99108014042000";

export const HINWEIS = "Vermutlich zuständig – kein Rechtsrat. Bitte vor dem Absenden prüfen.";

export const TEXTE = Object.freeze({
  grund: Object.freeze({
    kreisfrei: "Kreisfreie Städte sind für ihr Gebiet untere Straßenverkehrsbehörde.",
    kreis:
      "Für kreisangehörige Gemeinden ist meist die Kreisverwaltung zuständig. Größere Städte, " +
      "in manchen Ländern auch Gemeinden, können selbst zuständig sein.",
    gemeindefrei: "Gemeindefreies Gebiet: zuständig ist der Kreis.",
    bremen: "In der Stadt Bremen ist das Amt für Straßen und Verkehr Straßenverkehrsbehörde.",
    bremerhaven: "In Bremerhaven ist der Magistrat als Ortspolizeibehörde Straßenverkehrsbehörde.",
    berlin:
      "In Berlin sind die Bezirksämter zuständig, für Straßen des übergeordneten Netzes die " +
      "Senatsverwaltung.",
    hamburg: "In Hamburg ist die Polizei Straßenverkehrsbehörde, örtlich das zuständige Polizeikommissariat.",
    autobahn: "Für Autobahnen ist das Fernstraßen-Bundesamt Straßenverkehrsbehörde.",
    kondominium:
      "Gemeinsames deutsch-luxemburgisches Hoheitsgebiet (Mosel, Sauer, Our). Genannt ist die " +
      "Stelle der angrenzenden deutschen Gemeinde; ob sie hier zuständig ist, ist nicht geprüft.",
    bundesportal:
      "Das Land nennt im Bundesportal für diese Gemeinde dieselbe Stelle. Die Landesregel selbst " +
      "ist noch nicht eingearbeitet.",
    byGemeinde: "In Bayern ist die Gemeinde für ihre Gemeindestraßen selbst Straßenverkehrsbehörde.",
    byGemeindeVg:
      "In Bayern ist die Gemeinde für ihre Gemeindestraßen selbst Straßenverkehrsbehörde; die " +
      "Verwaltungsarbeit dafür erledigt ihre Verwaltungsgemeinschaft.",
    byLandratsamt: "Für Kreis-, Staats- und Bundesstraßen ist in Bayern das Landratsamt Straßenverkehrsbehörde.",
    byGks: "Große Kreisstädte sind in Bayern für alle Straßen ihres Gebiets Straßenverkehrsbehörde.",
    thStadt:
      "In Thüringen sind Städte mit über 30.000 Einwohnern und große kreisangehörige Städte selbst " +
      "Straßenverkehrsbehörde – für alle Straßen außer Autobahnen.",
    thAntrag: "Diese Stadt ist in Thüringen auf Antrag Straßenverkehrsbehörde – für alle Straßen außer Bundesstraßen.",
    thBundesstrasse:
      "Für Bundesstraßen bleibt in Thüringen der Landkreis zuständig, auch wo die Stadt sonst " +
      "Straßenverkehrsbehörde ist.",
    thLandkreis: "In Thüringen ist für Gemeinden ohne eigene Straßenverkehrsbehörde der Landkreis zuständig.",
    thLandkreisPortal:
      "In Thüringen ist für Gemeinden ohne eigene Straßenverkehrsbehörde der Landkreis zuständig; " +
      "das Land nennt im Bundesportal für diese Gemeinde dieselbe Stelle.",
    shKreis:
      "In Schleswig-Holstein ist der Kreis Straßenverkehrsbehörde. Halten und Parken, Baustellen " +
      "und Veranstaltungen ordnet das Amt bzw. die amtsfreie Gemeinde an.",
    shKreisKnapp:
      "In Schleswig-Holstein ist der Kreis Straßenverkehrsbehörde, solange eine Gemeinde nicht mehr " +
      "als 20.000 Einwohner hat. Diese liegt knapp darunter; die maßgebliche Zahl kann abweichen.",
    shGemeinde: "In Schleswig-Holstein ordnen Gemeinden mit mehr als 20.000 Einwohnern Verkehrszeichen selbst an.",
    shGemeindeKnapp:
      "In Schleswig-Holstein ordnen Gemeinden mit mehr als 20.000 Einwohnern Verkehrszeichen selbst " +
      "an. Diese liegt knapp darüber; die maßgebliche Zahl kann abweichen.",
    shAntrag: "Diese Gemeinde ordnet in Schleswig-Holstein auf Antrag selbst Verkehrszeichen an.",
    niKreis:
      "In Niedersachsen ist der Landkreis Straßenverkehrsbehörde, in der Region Hannover die Region – " +
      "außer in den selbständigen Städten und Gemeinden.",
    niKreisGemeindestrasse:
      "Auch für Gemeindestraßen ist in Niedersachsen der Landkreis zuständig (in der Region Hannover " +
      "die Region), solange er die Aufgabe nicht auf Antrag übertragen hat. Ein Verzeichnis dieser " +
      "Übertragungen gibt es nicht.",
    niWieKreisfrei:
      "Die Landeshauptstadt Hannover und die Stadt Göttingen sind wie kreisfreie Städte für alle " +
      "Straßen Straßenverkehrsbehörde.",
    niSelbstaendig:
      "In Niedersachsen sind die großen selbständigen Städte und die selbständigen Gemeinden für alle " +
      "Straßen ihres Gebiets Straßenverkehrsbehörde.",
    niUebertragung:
      "Für Gemeindestraßen hat der Landkreis (in der Region Hannover die Region) die Aufgabe hier auf " +
      "Antrag übertragen – so steht es auf seiner Webseite.",
    niVereinbarung:
      "Burgdorf ist selbständige Gemeinde; die Aufgaben der Straßenverkehrsbehörde nimmt nach Angaben " +
      "der Region aber seit 2019 die Region Hannover wahr.",
    nwKreis:
      "In Nordrhein-Westfalen ist der Kreis Straßenverkehrsbehörde, außer in Mittleren und Großen " +
      "kreisangehörigen Städten.",
    nwAachen:
      "Die Stadt Aachen hat in der Städteregion die Rechtsstellung einer kreisfreien Stadt und ordnet " +
      "Verkehrszeichen auf ihrem Gebiet selbst an.",
    nwGrosse: "In Nordrhein-Westfalen ordnen Große kreisangehörige Städte Verkehrszeichen auf ihrem Gebiet selbst an.",
    nwMittlere: "In Nordrhein-Westfalen ordnen Mittlere kreisangehörige Städte Verkehrszeichen auf ihrem Gebiet selbst an.",
    bbKreis:
      "In Brandenburg ist der Landkreis Straßenverkehrsbehörde; nur einzelne, in der Verordnung genannte " +
      "Städte und Gemeinden sind es selbst.",
    bbGks:
      "In Brandenburg ist diese Große kreisangehörige Stadt selbst Straßenverkehrsbehörde – das gilt nur für " +
      "Eberswalde, Eisenhüttenstadt und Schwedt/Oder.",
    bbAntrag: "Diese Stadt ist in Brandenburg auf ihren Antrag selbst Straßenverkehrsbehörde – für alle Straßen außer Autobahnen.",
    bbTeil:
      "In Brandenburg ist der Landkreis Straßenverkehrsbehörde. Halten und Parken, Baustellen und " +
      "Veranstaltungen ordnet hier auf eigenen Antrag die Stadt, die Gemeinde bzw. das Amt an.",
    mvKreis:
      "In Mecklenburg-Vorpommern ist der Landkreis Straßenverkehrsbehörde; Städte mit mehr als 20.000 " +
      "Einwohnern und die großen kreisangehörigen Städte ordnen Verkehrszeichen selbst an.",
    mvGks:
      "In Mecklenburg-Vorpommern sind die großen kreisangehörigen Städte Greifswald, Neubrandenburg, " +
      "Stralsund und Wismar selbst Straßenverkehrsbehörde.",
    mvStadt: "In Mecklenburg-Vorpommern ordnen Städte mit mehr als 20.000 Einwohnern Verkehrszeichen selbst an.",
    mvStadtKnapp:
      "In Mecklenburg-Vorpommern ordnen Städte mit mehr als 20.000 Einwohnern Verkehrszeichen selbst an. " +
      "Diese liegt knapp darüber; die maßgebliche Zahl kann abweichen.",
    mvBestand:
      "In Mecklenburg-Vorpommern ordnen auch Städte Verkehrszeichen selbst an, die einmal mehr als 20.000 " +
      "Einwohner hatten und 2021 noch mindestens 17.000 – so wie diese.",
    mvKreisBestand:
      "In Mecklenburg-Vorpommern ist der Landkreis Straßenverkehrsbehörde. Städte mit 17.000 bis 20.000 " +
      "Einwohnern, die früher einmal mehr als 20.000 hatten, ordnen Verkehrszeichen selbst an.",
    rpOrt:
      "In Rheinland-Pfalz ordnet die Verbandsgemeinde bzw. die verbandsfreie Gemeinde Verkehrszeichen an – " +
      "auf Gemeindestraßen überall, auf Bundes-, Landes- und Kreisstraßen innerhalb geschlossener Ortschaften.",
    rpAnlage1:
      "In Rheinland-Pfalz ordnet die Verbandsgemeinde bzw. die verbandsfreie Gemeinde Verkehrszeichen an; " +
      "diese auch auf Landes- und Kreisstraßen außerhalb geschlossener Ortschaften.",
    rpGks: "In Rheinland-Pfalz ist die große kreisangehörige Stadt für alle Straßen selbst Straßenverkehrsbehörde.",
    snGemeinde: "In Sachsen ordnet die Gemeinde auf Gemeindestraßen Verkehrszeichen selbst an (örtliche Straßenverkehrsbehörde).",
    snVerwaltungsgemeinschaft:
      "In Sachsen ordnet die Gemeinde auf Gemeindestraßen Verkehrszeichen selbst an; in einer " +
      "Verwaltungsgemeinschaft übernimmt das die erfüllende Gemeinde.",
    snVerwaltungsverband:
      "In Sachsen ordnet die Gemeinde auf Gemeindestraßen Verkehrszeichen selbst an; in einem " +
      "Verwaltungsverband übernimmt das der Verband.",
    snLandratsamt: "Für Kreis-, Staats- und Bundesstraßen ist in Sachsen das Landratsamt Straßenverkehrsbehörde.",
    snGks: "Große Kreisstädte sind in Sachsen für alle Straßen ihres Gebiets Straßenverkehrsbehörde.",
    snGksVg:
      "Erfüllende Gemeinde dieser Verwaltungsgemeinschaft ist eine Große Kreisstadt – sie ist deshalb auch " +
      "hier für alle Straßen Straßenverkehrsbehörde.",
  }),
  bedingung: Object.freeze({
    gks: "Große Kreisstadt – sie kann selbst zuständig sein",
    gemeindestrasse: "falls nur die Gemeindestraße betroffen ist",
    unklar: "falls es eine Gemeindestraße ist",
    berlinNetz: "falls die Straße zum übergeordneten Straßennetz gehört",
    portalStvb: "laut Bundesportal ist die Gemeinde selbst Straßenverkehrsbehörde",
    thAntragMoeglich: "Gemeinde mit 10.000 bis 30.000 Einwohnern – sie kann auf Antrag selbst zuständig sein",
    shParken: "falls es nur um Halten und Parken, eine Baustelle oder eine Veranstaltung geht",
    niUebertragungMoeglich: "falls ihr die Aufgabe für Gemeindestraßen übertragen ist",
    bbTeil: "falls es nur um Halten und Parken, eine Baustelle oder eine Veranstaltung geht",
    bbTeilG:
      "falls es nur um Halten und Parken, eine Baustelle, eine Veranstaltung oder den Schutz der " +
      "Gemeindestraße vor außerordentlichen Schäden geht",
    mvBestandMoeglich: "Stadt mit 17.000 bis 20.000 Einwohnern – sie kann nach der Übergangsregel selbst zuständig sein",
    rpAusserorts: "falls die Strecke außerhalb geschlossener Ortschaften liegt",
  }),
  quelle: Object.freeze({
    phase1: "Rückfall auf die Kreisebene – die Regel dieses Landes ist noch nicht eingearbeitet",
    bremen:
      "Verordnung über die Zuständigkeiten nach der Straßenverkehrs-Ordnung (Bremen) vom " +
      "19.01.2016, zuletzt geändert 02.09.2025",
    berlin: "ASOG Bln, Zuständigkeitskatalog Ordnungsaufgaben Nr. 11 Abs. 4, Nr. 22b Abs. 3 (Wortlaut nur sekundär geprüft)",
    hamburg: "Zuständigkeitsanordnung Hamburg (Titel und Fassung noch nicht geprüft)",
    autobahn: "§ 45 Abs. 11 StVO",
    kondominium:
      "Rückfall: angrenzende Gemeinde laut VG25 (SDV_ARS); Grenzvertrag Deutschland–Luxemburg nicht ausgewertet",
    bundesportal:
      "Bundesportal, zuständige Stelle für „Aufstellung von Verkehrszeichen anregen\" (Angabe des Landes)",
    byOertlich: "Art. 2 Abs. 1 Nr. 1, Art. 3 Abs. 1 und Art. 6 ZustGVerk (Bayern), Fassung vom 17.12.2024",
    byOertlichVg:
      "Art. 2 Abs. 1 Nr. 1, Art. 3 Abs. 1 und Art. 6 ZustGVerk (Bayern), Fassung vom 17.12.2024; " +
      "§ 1 Nr. 5 der Verordnung über Aufgaben der Mitgliedsgemeinden von Verwaltungsgemeinschaften, " +
      "zuletzt geändert 04.06.2024; Art. 4 Abs. 2 VGemO",
    byUnter: "Art. 2 Abs. 1 Nr. 2 ZustGVerk (Bayern), Fassung vom 17.12.2024",
    byGks: "§ 2 Nr. 2 GrKrV (Bayern), Fassung ab 01.03.2025",
    thStadt:
      "§ 2 Abs. 3 Satz 1 Nr. 2 Buchst. a–c der Thüringer Verordnung über Zuständigkeiten auf dem " +
      "Gebiet des Straßenverkehrsrechts vom 13.02.2007, zuletzt geändert 20.05.2026 [S]; " +
      "Einwohner laut GV-ISys 31.12.2025",
    thAntrag:
      "§ 2 Abs. 3 Satz 1 Nr. 2 Buchst. d und Abs. 7 der Thüringer Verordnung über Zuständigkeiten " +
      "auf dem Gebiet des Straßenverkehrsrechts [S]; Stadt als Straßenverkehrsbehörde laut " +
      "Bundesportal bzw. Webseite",
    thLandkreis:
      "§ 2 Abs. 3 Satz 1 Nr. 2 Buchst. e der Thüringer Verordnung über Zuständigkeiten auf dem " +
      "Gebiet des Straßenverkehrsrechts vom 13.02.2007, zuletzt geändert 20.05.2026 [S]; " +
      "Gemeinden auf Antrag: Abs. 7; Einwohner laut GV-ISys 31.12.2025",
    shStadt: "§ 3 Abs. 1 Nr. 1 Buchst. a StrVRZustVO (Schleswig-Holstein) vom 08.11.2004, Fassung vom 01.12.2025",
    shKreis:
      "§ 3 Abs. 1 Nr. 1 Buchst. a und § 5 Abs. 1 StrVRZustVO (Schleswig-Holstein) vom 08.11.2004, " +
      "Fassung vom 01.12.2025; Einwohner laut GV-ISys 31.12.2025",
    shGemeinde:
      "§ 4 Abs. 1 StrVRZustVO (Schleswig-Holstein) vom 08.11.2004, Fassung vom 01.12.2025; " +
      "Einwohner laut GV-ISys 31.12.2025",
    shAntrag: "§ 4 Abs. 2 und Anlage Nr. 1 StrVRZustVO (Schleswig-Holstein) vom 08.11.2004, Fassung vom 01.12.2025",
    niStadt:
      "§ 2 Abs. 1 Nr. 1 ZustVO-Verkehr (Niedersachsen), Neubekanntmachung vom 25.08.2014, Fassung vom " +
      "30.06.2025; § 18 NKomVG",
    niKreis:
      "§ 2 Abs. 1 Nr. 1 ZustVO-Verkehr (Niedersachsen), Neubekanntmachung vom 25.08.2014, Fassung vom " +
      "30.06.2025; Region Hannover: § 159 Abs. 1 Nr. 2 NKomVG",
    niKreisGemeindestrasse:
      "§ 2 Abs. 1 Nr. 1 und Abs. 2 ZustVO-Verkehr (Niedersachsen), Neubekanntmachung vom 25.08.2014, " +
      "Fassung vom 30.06.2025",
    niGemeindefrei:
      "§ 2 Abs. 1 Nr. 1 ZustVO-Verkehr (Niedersachsen), Fassung vom 30.06.2025; für gemeindefreie " +
      "Gebiete nicht ausdrücklich geregelt",
    niWieKreisfrei:
      "§ 15 Abs. 2 und § 16 Abs. 2 NKomVG, Fassung ab 07.05.2026; § 2 Abs. 1 Nr. 1 ZustVO-Verkehr " +
      "(Niedersachsen), Fassung vom 30.06.2025",
    niSelbstaendig:
      "§ 14 Abs. 3 und 5, § 17 NKomVG (Region Hannover: § 159 Abs. 3 Nr. 3), Fassung ab 07.05.2026; " +
      "§ 2 Abs. 1 Nr. 1 ZustVO-Verkehr (Niedersachsen), Fassung vom 30.06.2025; selbständige Gemeinden " +
      "laut Bekanntmachung des Innenministeriums vom 09.11.2021 (Nds. MBl. S. 1690)",
    niUebertragung:
      "§ 2 Abs. 2 ZustVO-Verkehr (Niedersachsen), Fassung vom 30.06.2025; Übertragung laut Webseite " +
      "des Landkreises bzw. der Region [S]",
    niVereinbarung:
      "§ 17 und § 159 Abs. 3 Nr. 3 NKomVG; Wahrnehmung durch die Region laut hannover.de und Presse [S]",
    nwKreis:
      "§ 5 der Verordnung über Zuständigkeiten im Bereich Straßenverkehr und Güterbeförderung " +
      "(Nordrhein-Westfalen) vom 05.07.2016, Fassung vom 07.11.2025; § 3 Abs. 1 OBG NRW",
    nwAachen:
      "§ 4 Abs. 1 des Gesetzes zur Bildung der Städteregion Aachen, Fassung vom 14.10.2015; Stadt als " +
      "Straßenverkehrsbehörde laut ihrem Serviceportal (04.10.2026). Nicht geklärt: Anlage 2 Nr. 25 des " +
      "Gesetzes überträgt die Trägerschaft der Straßenverkehrsbehörde auf die Städteregion",
    nwGrosse:
      "§ 10 der Verordnung über Zuständigkeiten im Bereich Straßenverkehr und Güterbeförderung " +
      "(Nordrhein-Westfalen), Fassung vom 07.11.2025; § 1 der Verordnung zur Bestimmung der Großen und " +
      "Mittleren kreisangehörigen Städte nach § 4 GO NRW, Fassung vom 01.01.2025",
    nwMittlere:
      "§ 10 der Verordnung über Zuständigkeiten im Bereich Straßenverkehr und Güterbeförderung " +
      "(Nordrhein-Westfalen), Fassung vom 07.11.2025; § 2 der Verordnung zur Bestimmung der Großen und " +
      "Mittleren kreisangehörigen Städte nach § 4 GO NRW, Fassung vom 01.01.2025",
    bbKreis: "§ 4 Abs. 1 und Abs. 3 Nr. 2 StGÜZV (Brandenburg) vom 09.11.2018, zuletzt geändert 23.08.2024",
    bbGks: "§ 4 Abs. 3 Nr. 2 und Abs. 4 StGÜZV (Brandenburg) vom 09.11.2018, zuletzt geändert 23.08.2024",
    bbAntrag: "§ 4a Abs. 1 Nr. 2 StGÜZV (Brandenburg) vom 09.11.2018, zuletzt geändert 23.08.2024",
    bbTeil: "§ 4 Abs. 1 und § 4a Abs. 2 Nr. 2 StGÜZV (Brandenburg) vom 09.11.2018, zuletzt geändert 23.08.2024",
    mvKreis:
      "§ 3 Abs. 1 StVZustLVO M-V vom 12.08.2021 (GVOBl. M-V S. 1221); Städte über 20.000 Einwohner: § 4 " +
      "Abs. 2; Einwohner laut GV-ISys 31.12.2025",
    mvGks: "§ 3 Abs. 6 StVZustLVO M-V vom 12.08.2021 (GVOBl. M-V S. 1221); § 7 Abs. 2 KV M-V",
    mvStadt: "§ 4 Abs. 2 Satz 1 StVZustLVO M-V vom 12.08.2021 (GVOBl. M-V S. 1221); Einwohner laut GV-ISys 31.12.2025",
    mvBestand:
      "§ 4 Abs. 2 Satz 2 StVZustLVO M-V vom 12.08.2021 (GVOBl. M-V S. 1221); Einwohner 2021 und früher " +
      "laut Statistischem Amt M-V bzw. Stadt",
    mvBestandPortal:
      "§ 4 Abs. 2 Satz 2 StVZustLVO M-V vom 12.08.2021 (GVOBl. M-V S. 1221); Stadt als Straßenverkehrsbehörde " +
      "laut Bundesportal; Einwohner laut GV-ISys 31.12.2025",
    rpKreis:
      "§ 3 Abs. 1 Nr. 1 der Landesverordnung über Zuständigkeiten auf dem Gebiet des Straßenverkehrsrechts " +
      "(Rheinland-Pfalz) vom 12.03.1987 [S]",
    rpGks:
      "§ 3 Abs. 1 Nr. 1 und § 5 Abs. 1 der Landesverordnung über Zuständigkeiten auf dem Gebiet des " +
      "Straßenverkehrsrechts (Rheinland-Pfalz) vom 12.03.1987 [S]; große kreisangehörige Städte nach § 6 GemO",
    rpOrt:
      "§ 5 Abs. 1 Satz 1 und 2 der Landesverordnung über Zuständigkeiten auf dem Gebiet des " +
      "Straßenverkehrsrechts (Rheinland-Pfalz) vom 12.03.1987 [S]; außerhalb geschlossener Ortschaften § 3 Abs. 1 Nr. 1",
    rpAnlage1:
      "§ 5 Abs. 1 Satz 3 und Anlage 1 der Landesverordnung über Zuständigkeiten auf dem Gebiet des " +
      "Straßenverkehrsrechts (Rheinland-Pfalz) vom 12.03.1987 [S]",
    snUnter:
      "§§ 1 und 3 Sächsisches Straßenverkehrsrechtsgesetz (SächsStrVRG) vom 03.05.2019 (SächsGVBl. S. 317), " +
      "zuletzt geändert 24.06.2026",
    snOertlich: "§§ 1 und 2 SächsStrVRG vom 03.05.2019 (SächsGVBl. S. 317), zuletzt geändert 24.06.2026",
    snOertlichVerband:
      "§§ 2 und 24 SächsStrVRG vom 03.05.2019, zuletzt geändert 24.06.2026; § 7 Abs. 1 Nr. 1 und § 36 Abs. 3 " +
      "SächsKomZG, zuletzt geändert 09.02.2022",
    snGks:
      "§ 3 SächsStrVRG vom 03.05.2019; § 1 Nr. 2 SächsKomVerfRDVO vom 22.11.2022 (SächsGVBl. S. 634); Große " +
      "Kreisstädte laut Gemeindeverzeichnis der Landesdirektion Sachsen (01.08.2026), 53 laut Staatsministerium " +
      "des Innern (01.01.2026)",
    snGksVg:
      "§ 3 Abs. 2 Satz 3 SächsGemO, zuletzt geändert 27.06.2025; § 1 Nr. 2 SächsKomVerfRDVO vom 22.11.2022; " +
      "§ 3 SächsStrVRG vom 03.05.2019",
  }),
  hinweis: Object.freeze({
    autobahnDabei: "Für die Autobahn selbst ist das Fernstraßen-Bundesamt zuständig.",
    keineStrasse: "Keine Straße erkannt – bitte eine Straße anklicken, um die Klasse zu bestimmen.",
  }),
});

/** Stellen, die nicht aus den Verwaltungsgebieten folgen. Ids sind Vertrag (docs/VERTRAG.md). */
export const FESTE_STELLEN = Object.freeze({
  fba: Object.freeze({ id: "fba", name: mitZusatz("Fernstraßen-Bundesamt"), ebene: "bund", art: "bund" }),
  "hb-asv": Object.freeze({
    id: "hb-asv", name: mitZusatz("Amt für Straßen und Verkehr Bremen"), ebene: "untere", art: "stadtstaat",
  }),
  "hb-bhv": Object.freeze({
    id: "hb-bhv", name: mitZusatz("Magistrat der Stadt Bremerhaven (Ortspolizeibehörde)"),
    ebene: "untere", art: "stadtstaat",
  }),
  "be-bezirk": Object.freeze({
    id: "be-bezirk", name: mitZusatz("Bezirksamt (Berlin)"), ebene: "untere", art: "stadtstaat",
  }),
  "be-senat": Object.freeze({
    id: "be-senat", name: mitZusatz("Senatsverwaltung Berlin, Abteilung Verkehrsmanagement"),
    ebene: "untere", art: "stadtstaat",
  }),
  "hh-pk": Object.freeze({
    id: "hh-pk", name: mitZusatz("Polizei Hamburg, zuständiges Polizeikommissariat"),
    ebene: "untere", art: "stadtstaat",
  }),
});

const ARS_RE = /^\d{12}$/;

function pruefeGemeinde(g) {
  if (!g || !ARS_RE.test(String(g.ars ?? ""))) throw new Error(`resolve: ungültiger ARS ${g?.ars}`);
  if (!g.land) throw new Error(`resolve: ${g.ars} ohne Land`);
  if (!g.kreis?.ars || !g.kreis?.gen) throw new Error(`resolve: ${g.ars} ohne Kreis`);
  if (!g.gen) throw new Error(`resolve: ${g.ars} ohne Namen (GEN)`);
}

function kreisStelle(g) {
  const k = g.kreis;
  return {
    id: `k${k.ars}`,
    name: mitZusatz(kreisBehoerde(k, g.land)),
    ebene: "untere",
    art: k.kreisfrei ? "stadt" : "kreis",
  };
}

function ergebnis(stelle, sicherheit, grund, quelle, alternative = null) {
  // Feste Schlüsselreihenfolge: Grundlage für stabile Ids (ergebnisId).
  return {
    stelle,
    sicherheit,
    grund: TEXTE.grund[grund],
    quelle: TEXTE.quelle[quelle],
    alternative: alternative
      ? { stelle: alternative.stelle, bedingung: TEXTE.bedingung[alternative.bedingung] }
      : null,
  };
}

/** Regel der Phase 1 → { ergebnis (mit Stellen-Objekten) }. */
function regelPhase1(g) {
  const { ars } = g;
  if (ars.startsWith("04011")) {
    return ergebnis(FESTE_STELLEN["hb-asv"], SICHERHEIT.BELEGT, "bremen", "bremen");
  }
  if (ars.startsWith("04012")) {
    return ergebnis(FESTE_STELLEN["hb-bhv"], SICHERHEIT.BELEGT, "bremerhaven", "bremen");
  }
  if (ars.startsWith("11")) {
    return ergebnis(FESTE_STELLEN["be-bezirk"], SICHERHEIT.NUR_EBENE, "berlin", "berlin", {
      stelle: FESTE_STELLEN["be-senat"], bedingung: "berlinNetz",
    });
  }
  if (ars.startsWith("02")) {
    return ergebnis(FESTE_STELLEN["hh-pk"], SICHERHEIT.NUR_EBENE, "hamburg", "hamburg");
  }
  const kreis = kreisStelle(g);
  if (g.kreis.kreisfrei) return ergebnis(kreis, SICHERHEIT.VERMUTLICH, "kreisfrei", "phase1");
  if (g.gemeindefrei) return ergebnis(kreis, SICHERHEIT.VERMUTLICH, "gemeindefrei", "phase1");
  const gks = Array.isArray(g.tkz) && g.tkz.includes(67);
  const alternative = gks
    ? {
      stelle: { id: `g${ars}`, name: mitZusatz(stadtName(g.gen)), ebene: "untere", art: "stadt" },
      bedingung: "gks",
    }
    : null;
  return ergebnis(kreis, SICHERHEIT.NUR_EBENE, "kreis", "phase1", alternative);
}

/** Die Gemeinde als Stelle (örtliche Straßenverkehrsbehörde bzw. Stadt als untere). */
function gemeindeStelle(g, art = "gemeinde", ebene = "oertliche") {
  const name = art === "stadt" ? stadtName(g.gen) : g.name ?? g.gen;
  return { id: `g${g.ars}`, name: mitZusatz(name), ebene, art };
}

const istGks = (g) => Array.isArray(g.tkz) && g.tkz.includes(67);
const istStadt = (g) => Array.isArray(g.tkz) && (g.tkz.includes(63) || g.tkz.includes(67));

/**
 * Bayern (belegt): kreisangehörige Gemeinden sind örtliche Straßenverkehrsbehörde für ihre
 * Gemeindestraßen (Art. 3 ZustGVerk), sonst das Landratsamt; Große Kreisstädte und kreisfreie
 * Städte für alle Straßen (§ 2 Nr. 2 GrKrV, Art. 2 ZustGVerk). In einer Verwaltungsgemeinschaft
 * bleibt die Aufgabe bei der Gemeinde (§ 1 Nr. 5 AufVGem); die Gemeinschaft führt sie als deren
 * Behörde aus (Art. 4 Abs. 2 VGemO) – ihr Amt ist dann der Kontakt.
 */
function regelBayern(g, klasse) {
  const kreis = kreisStelle(g);
  if (g.kreis.kreisfrei) return ergebnis(kreis, SICHERHEIT.BELEGT, "kreisfrei", "byUnter");
  if (g.gemeindefrei) return ergebnis(kreis, SICHERHEIT.VERMUTLICH, "gemeindefrei", "byUnter");
  if (istGks(g)) return ergebnis(gemeindeStelle(g, "stadt", "untere"), SICHERHEIT.BELEGT, "byGks", "byGks");
  if (klasse === "G") {
    const vg = Boolean(g.verband);
    return ergebnis(gemeindeStelle(g), SICHERHEIT.BELEGT, vg ? "byGemeindeVg" : "byGemeinde", vg ? "byOertlichVg" : "byOertlich");
  }
  return ergebnis(kreis, SICHERHEIT.BELEGT, "byLandratsamt", "byUnter");
}

const TH_EISENACH = "160630105105";
/**
 * Thüringer Gemeinden, die auf Antrag Straßenverkehrsbehörde sind (§ 2 Abs. 7 und 8 der
 * Zuständigkeitsverordnung), soweit nicht schon das Bundesportal sie so nennt. Die Liste der
 * Rechtsverordnung liegt nicht vor (docs/TODO.md); jeder Eintrag mit Beleg.
 */
export const TH_STAEDTE_AUF_ANTRAG = Object.freeze({
  "160700004004": "Arnstadt – Webseite der Stadt und des Landratsamts Ilm-Kreis, 03.10.2026",
});

/**
 * Thüringen (vermutlich): Städte über 30.000 Einwohner, große kreisangehörige Städte und Eisenach
 * für alle Straßen; Städte auf Antrag für alle außer Bundesstraßen; im Übrigen der Landkreis.
 * Ob eine Gemeinde mit 10.000 bis 30.000 Einwohnern auf Antrag zuständig ist, wissen wir nur aus
 * Portal und Liste – sonst steht sie als Alternative da.
 */
function regelThueringen(g, klasse) {
  const kreis = kreisStelle(g);
  if (g.kreis.kreisfrei) return ergebnis(kreis, SICHERHEIT.VERMUTLICH, "kreisfrei", "thStadt");
  if (g.gemeindefrei) return null;
  const ew = g.ew ?? 0;
  const stadt = gemeindeStelle(g, "stadt", "untere");
  if (ew > 30000 || g.ars === TH_EISENACH) return ergebnis(stadt, SICHERHEIT.VERMUTLICH, "thStadt", "thStadt");
  const antrag = TH_STAEDTE_AUF_ANTRAG[g.ars] || (g.bundesportal === "stvb" && ew > 10000);
  if (antrag && klasse === "B") return ergebnis(kreis, SICHERHEIT.VERMUTLICH, "thBundesstrasse", "thAntrag");
  if (antrag) return ergebnis(stadt, SICHERHEIT.VERMUTLICH, "thAntrag", "thAntrag");
  const selbst = gemeindeStelle(g, istStadt(g) ? "stadt" : "gemeinde", "untere");
  let alternative = null;
  if (ew > 10000 && klasse !== "B") alternative = { stelle: selbst, bedingung: "thAntragMoeglich" };
  else if (g.bundesportal === "stvb") alternative = { stelle: selbst, bedingung: "portalStvb" };
  const grund = g.bundesportal === "passt" ? "thLandkreisPortal" : "thLandkreis";
  return ergebnis(kreis, SICHERHEIT.VERMUTLICH, grund, "thLandkreis", alternative);
}

/** Ein Verband (in Schleswig-Holstein und Brandenburg das Amt) als Stelle. */
function verbandStelle(g, ebene = "oertliche") {
  return { id: `v${g.verband.ars}`, name: mitZusatz(g.verband.name), ebene, art: "verband" };
}

/**
 * Schleswig-Holsteiner Gemeinden, die auf Antrag Straßenverkehrsbehörde nach § 45 StVO sind
 * (§ 4 Abs. 2 StrVRZustVO, Anlage Nr. 1).
 */
export const SH_AUF_ANTRAG = Object.freeze({ "010620018018": "Glinde" });

/**
 * Schleswig-Holstein (belegt, StrVRZustVO): Kreise und kreisfreie Städte sind Straßenverkehrs-
 * behörde (§ 3). Gemeinden mit mehr als 20.000 Einwohnern ordnen Verkehrszeichen selbst an
 * (§ 4 Abs. 1), auf Antrag auch kleinere (§ 4 Abs. 2, Anlage). Halten und Parken, Baustellen und
 * Veranstaltungen ordnen sonst das Amt bzw. die amtsfreie Gemeinde an (§ 5) – die Alternative.
 * Nahe an 20.000 Einwohnern hängt es von der maßgeblichen Zahl ab: dort nur „vermutlich".
 */
function regelSchleswigHolstein(g) {
  const kreis = kreisStelle(g);
  if (g.kreis.kreisfrei) return ergebnis(kreis, SICHERHEIT.BELEGT, "kreisfrei", "shStadt");
  if (g.gemeindefrei) return ergebnis(kreis, SICHERHEIT.VERMUTLICH, "gemeindefrei", "shKreis");
  const ew = g.ew ?? 0;
  const knapp = Math.abs(ew - 20000) <= 1000;
  const sicherheit = knapp ? SICHERHEIT.VERMUTLICH : SICHERHEIT.BELEGT;
  const selbst = gemeindeStelle(g, istStadt(g) ? "stadt" : "gemeinde", "oertliche");
  if (SH_AUF_ANTRAG[g.ars]) return ergebnis(selbst, SICHERHEIT.BELEGT, "shAntrag", "shAntrag");
  if (ew > 20000) return ergebnis(selbst, sicherheit, knapp ? "shGemeindeKnapp" : "shGemeinde", "shGemeinde");
  const ort = g.verband ? verbandStelle(g) : selbst;
  return ergebnis(kreis, sicherheit, knapp ? "shKreisKnapp" : "shKreis", "shKreis", { stelle: ort, bedingung: "shParken" });
}

/** Niedersachsen: wie kreisfreie Städte (§ 15 Abs. 2, § 16 Abs. 2 NKomVG). */
export const NI_WIE_KREISFREI = Object.freeze({ "031590016016": "Göttingen", "032410001001": "Hannover" });

/**
 * Niedersachsen: selbst für alle Straßen zuständig (§ 17 NKomVG) – die großen selbständigen Städte
 * und die selbständigen Gemeinden laut Bekanntmachung des Innenministeriums vom 09.11.2021
 * (Nds. MBl. S. 1690, Stand 01.01.2022, 64 Einträge; keine neuere Erklärung gefunden). GV-ISys
 * kennzeichnet den Status nicht. Selbständige Samtgemeinden mit ihrer Verbands-ARS.
 */
export const NI_SELBSTAENDIG = Object.freeze({
  // große selbständige Städte (§ 14 Abs. 5 NKomVG)
  "031530017017": "Goslar",
  "032520006006": "Hameln",
  "032540021021": "Hildesheim",
  "033510006006": "Celle",
  "033520011011": "Cuxhaven",
  "033550022022": "Lüneburg",
  "034540032032": "Lingen (Ems)",
  // selbständige Gemeinden (§ 14 Abs. 3 NKomVG; Bek. MI vom 09.11.2021)
  "031510009009": "Gifhorn",
  "031530012012": "Seesen",
  "031540028028": "Helmstedt",
  "031550011011": "Northeim",
  "031550013013": "Einbeck",
  "031570006006": "Peine",
  "031580037037": "Wolfenbüttel",
  "031590010010": "Duderstadt",
  "031590017017": "Hann. Münden",
  "031590026026": "Osterode am Harz",
  "032410002002": "Barsinghausen",
  "032410003003": "Burgdorf",
  "032410005005": "Garbsen",
  "032410008008": "Isernhagen",
  "032410009009": "Laatzen",
  "032410010010": "Langenhagen",
  "032410011011": "Lehrte",
  "032410012012": "Neustadt am Rübenberge",
  "032410014014": "Ronnenberg",
  "032410015015": "Seelze",
  "032410016016": "Sehnde",
  "032410017017": "Springe",
  "032410018018": "Uetze",
  "032410019019": "Wedemark",
  "032410021021": "Wunstorf",
  "032510037037": "Stuhr",
  "032510047047": "Weyhe",
  "032520003003": "Bad Pyrmont",
  "032540002002": "Alfeld (Leine)",
  "032550023023": "Holzminden",
  "032560022022": "Nienburg (Weser)",
  "032570031031": "Rinteln",
  "033520062062": "Geestland",
  "033530005005": "Buchholz in der Nordheide",
  "033530031031": "Seevetal",
  "033530040040": "Winsen (Luhe)",
  "033560007007": "Osterholz-Scharmbeck",
  "033580024024": "Walsrode",
  "033590010010": "Buxtehude",
  "033590038038": "Stade",
  "033600025025": "Uelzen",
  "033610001001": "Achim",
  "033610012012": "Verden (Aller)",
  "034510002002": "Bad Zwischenahn",
  "034520001001": "Aurich",
  "034520019019": "Norden",
  "034530004004": "Cloppenburg",
  "034530007007": "Friesoythe",
  "034540035035": "Meppen",
  "034540041041": "Papenburg",
  "034550015015": "Schortens",
  "034550026026": "Varel",
  "034560015015": "Nordhorn",
  "034570013013": "Leer (Ostfriesland)",
  "034580005005": "Ganderkesee",
  "034590014014": "Bramsche",
  "034590019019": "Georgsmarienhütte",
  "034590024024": "Melle",
  "034590033033": "Wallenhorst",
  "034600009009": "Vechta",
  "034610007007": "Nordenham",
  // selbständige Samtgemeinden: Verbands-ARS
  "033595403": "Samtgemeinde Harsefeld",
  "034595401": "Samtgemeinde Artland",
  "034595402": "Samtgemeinde Bersenbrück",
});

/**
 * Niedersachsen: Gemeinden und Samtgemeinden (Verbands-ARS), denen der Landkreis bzw. die Region
 * die Aufgabe für Gemeindestraßen übertragen hat (§ 2 Abs. 2 ZustVO-Verkehr). Ein Verzeichnis gibt
 * es nicht; jeder Eintrag laut Webseite des Landkreises bzw. der Region [S], gelesen 04.10.2026.
 */
export const NI_GEMEINDESTRASSEN = Object.freeze({
  "032410006006": "Gehrden – hannover.de",
  "032410007007": "Hemmingen – hannover.de",
  "032410013013": "Pattensen – hannover.de",
  "032570009009": "Bückeburg – Serviceportal Niedersachsen, Landkreis Schaumburg",
  "032570035035": "Stadthagen – Serviceportal Niedersachsen, Landkreis Schaumburg",
  "032575403": "Samtgemeinde Nenndorf – Serviceportal Niedersachsen, Landkreis Schaumburg",
  "032575405": "Samtgemeinde Nienstädt – Serviceportal Niedersachsen, Landkreis Schaumburg",
  "032575406": "Samtgemeinde Rodenberg – Serviceportal Niedersachsen, Landkreis Schaumburg",
  "033610006006": "Langwedel – Webseite des Landkreises Verden",
  "033610008008": "Ottersberg – Webseite des Landkreises Verden",
  "033610009009": "Oyten – Webseite des Landkreises Verden",
  "034580007007": "Großenkneten – Webseite des Landkreises Oldenburg",
  "034580009009": "Hatten – Webseite des Landkreises Oldenburg",
  "034580010010": "Hude (Oldb) – Webseite des Landkreises Oldenburg",
  "034580013013": "Wardenburg – Webseite des Landkreises Oldenburg",
  "034580014014": "Wildeshausen – Webseite des Landkreises Oldenburg",
});

/** Niedersachsen: selbständige Gemeinden, deren Aufgabe per Vereinbarung die Region wahrnimmt [S]. */
export const NI_VEREINBARUNG = Object.freeze({
  "032410003003": "Burgdorf – Region Hannover seit 01.01.2019 (hannover.de, Presse)",
});

/**
 * Niedersachsen (ZustVO-Verkehr § 2, NKomVG §§ 14–18 und 159): Landkreise, die Region Hannover
 * und kreisfreie Städte sind Straßenverkehrsbehörde, Hannover und Göttingen wie kreisfreie Städte,
 * die großen selbständigen Städte und die selbständigen Gemeinden (auch drei Samtgemeinden) für
 * alle Straßen. Gemeindestraßen kann der Landkreis auf Antrag übertragen (§ 2 Abs. 2); ein
 * Verzeichnis fehlt – bekannte Fälle stehen in `NI_GEMEINDESTRASSEN` („vermutlich"), sonst die
 * Samtgemeinde bzw. die Gemeinde mit mehr als 10.000 Einwohnern als Alternative.
 */
function regelNiedersachsen(g, klasse) {
  const kreis = kreisStelle(g);
  if (g.kreis.kreisfrei) return ergebnis(kreis, SICHERHEIT.BELEGT, "kreisfrei", "niStadt");
  if (g.gemeindefrei) return ergebnis(kreis, SICHERHEIT.VERMUTLICH, "gemeindefrei", "niGemeindefrei");
  if (NI_WIE_KREISFREI[g.ars]) {
    return ergebnis(gemeindeStelle(g, "stadt", "untere"), SICHERHEIT.BELEGT, "niWieKreisfrei", "niWieKreisfrei");
  }
  if (NI_VEREINBARUNG[g.ars]) return ergebnis(kreis, SICHERHEIT.VERMUTLICH, "niVereinbarung", "niVereinbarung");
  const samtgemeinde = g.verband?.ars;
  const art = istStadt(g) ? "stadt" : "gemeinde";
  if (NI_SELBSTAENDIG[g.ars]) {
    return ergebnis(gemeindeStelle(g, art, "untere"), SICHERHEIT.BELEGT, "niSelbstaendig", "niSelbstaendig");
  }
  if (NI_SELBSTAENDIG[samtgemeinde]) {
    return ergebnis(verbandStelle(g, "untere"), SICHERHEIT.BELEGT, "niSelbstaendig", "niSelbstaendig");
  }
  if (klasse !== "G") return ergebnis(kreis, SICHERHEIT.BELEGT, "niKreis", "niKreis");
  const ort = samtgemeinde ? verbandStelle(g) : gemeindeStelle(g, art, "oertliche");
  if (NI_GEMEINDESTRASSEN[g.ars] || NI_GEMEINDESTRASSEN[samtgemeinde]) {
    return ergebnis(ort, SICHERHEIT.VERMUTLICH, "niUebertragung", "niUebertragung");
  }
  const alternative = samtgemeinde || (g.ew ?? 0) > 10000 ? { stelle: ort, bedingung: "niUebertragungMoeglich" } : null;
  return ergebnis(kreis, SICHERHEIT.VERMUTLICH, "niKreisGemeindestrasse", "niKreisGemeindestrasse", alternative);
}

/**
 * Die Stadt Aachen: in der Städteregion Aachen, aber mit der Rechtsstellung einer kreisfreien Stadt
 * (§ 4 Abs. 1 Aachen-Gesetz). Verkehrszeichen ordnet sie selbst an (Serviceportal der Stadt, § 45 StVO;
 * die Städteregion nennt sich Straßenverkehrsbehörde nur für Monschau, Roetgen und Simmerath). Anlage 2
 * Nr. 25 des Gesetzes überträgt aber die Trägerschaft der Straßenverkehrsbehörde auf die Städteregion –
 * bis das geklärt ist, nur „vermutlich".
 */
const NW_AACHEN = "053340002002";

/**
 * Große kreisangehörige Städte in Nordrhein-Westfalen: § 1 der Verordnung zur Bestimmung der Großen
 * kreisangehörigen Städte und der Mittleren kreisangehörigen Städte nach § 4 der Gemeindeordnung,
 * Fassung vom 01.01.2025 (recht.nrw.de, gelesen 04.10.2026). Name wie in der Verordnung.
 */
export const NW_GROSSE_KREISANGEHOERIGE_STAEDTE = Object.freeze({
  "051580028028": "Ratingen", "051580032032": "Velbert", "051620004004": "Dormagen",
  "051620008008": "Grevenbroich", "051620024024": "Neuss", "051660032032": "Viersen",
  "051700008008": "Dinslaken", "051700024024": "Moers", "051700048048": "Wesel",
  "053580008008": "Düren", "053620008008": "Bergheim", "053620032032": "Kerpen",
  "053780004004": "Bergisch Gladbach", "053820068068": "Troisdorf", "055540008008": "Bocholt",
  "055620004004": "Castrop-Rauxel", "055620012012": "Dorsten", "055620014014": "Gladbeck",
  "055620020020": "Herten", "055620024024": "Marl", "055620032032": "Recklinghausen",
  "055660076076": "Rheine", "057540008008": "Gütersloh", "057580012012": "Herford",
  "057660020020": "Detmold", "057700024024": "Minden", "057740032032": "Paderborn",
  "059540036036": "Witten", "059580004004": "Arnsberg", "059620024024": "Iserlohn",
  "059620032032": "Lüdenscheid", "059700040040": "Siegen", "059740028028": "Lippstadt",
  "059780024024": "Lünen", "059780036036": "Unna",
});

/** Mittlere kreisangehörige Städte in Nordrhein-Westfalen: § 2 derselben Verordnung (wie oben). */
export const NW_MITTLERE_KREISANGEHOERIGE_STAEDTE = Object.freeze({
  "051540008008": "Emmerich", "051540012012": "Geldern", "051540016016": "Goch",
  "051540032032": "Kevelaer", "051540036036": "Kleve", "051580004004": "Erkrath",
  "051580008008": "Haan", "051580012012": "Heiligenhaus", "051580016016": "Hilden",
  "051580020020": "Langenfeld (Rhld.)", "051580024024": "Mettmann", "051580026026": "Monheim",
  "051580036036": "Wülfrath", "051620012012": "Jüchen", "051620016016": "Kaarst",
  "051620020020": "Korschenbroich", "051620022022": "Meerbusch", "051660012012": "Kempen",
  "051660016016": "Nettetal", "051660028028": "Tönisvorst", "051660036036": "Willich",
  "051700012012": "Hamminkeln", "051700020020": "Kamp-Lintfort", "051700028028": "Neukirchen-Vluyn",
  "051700032032": "Rheinberg", "051700044044": "Voerde (Niederrhein)", "051700052052": "Xanten",
  "053340004004": "Alsdorf", "053340008008": "Baesweiler", "053340012012": "Eschweiler",
  "053340016016": "Herzogenrath", "053340032032": "Stolberg (Rhld.)", "053340036036": "Würselen",
  "053580024024": "Jülich", "053620004004": "Bedburg", "053620012012": "Brühl",
  "053620016016": "Elsdorf", "053620020020": "Erftstadt", "053620024024": "Frechen",
  "053620028028": "Hürth", "053620036036": "Pulheim", "053620040040": "Wesseling",
  "053660016016": "Euskirchen", "053660028028": "Mechernich", "053700004004": "Erkelenz",
  "053700012012": "Geilenkirchen", "053700016016": "Heinsberg", "053700020020": "Hückelhoven",
  "053700028028": "Übach-Palenberg", "053700040040": "Wegberg", "053740012012": "Gummersbach",
  "053740036036": "Radevormwald", "053740048048": "Wiehl", "053740052052": "Wipperfürth",
  "053780016016": "Leichlingen (Rhld.)", "053780024024": "Overath", "053780028028": "Rösrath",
  "053780032032": "Wermelskirchen", "053820008008": "Bad Honnef", "053820012012": "Bornheim",
  "053820020020": "Hennef (Sieg)", "053820024024": "Königswinter", "053820028028": "Lohmar",
  "053820032032": "Meckenheim", "053820044044": "Niederkassel", "053820048048": "Rheinbach",
  "053820056056": "Sankt Augustin", "053820060060": "Siegburg", "055540004004": "Ahaus",
  "055540012012": "Borken", "055540020020": "Gronau (Westf.)", "055580012012": "Coesfeld",
  "055580016016": "Dülmen", "055620008008": "Datteln", "055620016016": "Haltern",
  "055620028028": "Oer-Erkenschwick", "055620036036": "Waltrop", "055660008008": "Emsdetten",
  "055660012012": "Greven", "055660028028": "Ibbenbüren", "055660084084": "Steinfurt",
  "055700004004": "Ahlen", "055700008008": "Beckum", "055700028028": "Oelde",
  "055700052052": "Warendorf", "057540016016": "Harsewinkel", "057540028028": "Rheda-Wiedenbrück",
  "057540032032": "Rietberg", "057540036036": "Schloß Holte-Stukenbrock", "057540044044": "Verl",
  "057580004004": "Bünde", "057580024024": "Löhne", "057620020020": "Höxter",
  "057660008008": "Bad Salzuflen", "057660040040": "Lage", "057660044044": "Lemgo",
  "057700004004": "Bad Oeynhausen", "057700008008": "Espelkamp", "057700020020": "Lübbecke",
  "057700028028": "Petershagen", "057700032032": "Porta Westfalica", "057740020020": "Delbrück",
  "057740036036": "Salzkotten", "059540008008": "Ennepetal", "059540012012": "Gevelsberg",
  "059540016016": "Hattingen", "059540020020": "Herdecke", "059540024024": "Schwelm",
  "059540028028": "Sprockhövel", "059540032032": "Wetter (Ruhr)", "059580012012": "Brilon",
  "059580032032": "Meschede", "059580040040": "Schmallenberg", "059580044044": "Sundern (Sauerland)",
  "059620004004": "Altena", "059620016016": "Hemer", "059620040040": "Menden (Sauerland)",
  "059620052052": "Plettenberg", "059620060060": "Werdohl", "059660004004": "Attendorn",
  "059660020020": "Lennestadt", "059660024024": "Olpe", "059700024024": "Kreuztal",
  "059700032032": "Netphen", "059740040040": "Soest", "059740044044": "Warstein",
  "059740052052": "Werl", "059780004004": "Bergkamen", "059780020020": "Kamen",
  "059780028028": "Schwerte", "059780032032": "Selm", "059780040040": "Werne",
});

/**
 * Nordrhein-Westfalen (belegt): Straßenverkehrsbehörden sind die Kreisordnungsbehörden, also die
 * Kreise und kreisfreien Städte (§ 5 ZustVO Straßenverkehr, § 3 Abs. 1 OBG); die Stadt Aachen steht
 * einer kreisfreien Stadt gleich (vermutlich, siehe NW_AACHEN). Maßnahmen nach § 45 StVO treffen in
 * Mittleren und Großen kreisangehörigen Städten deren örtliche Ordnungsbehörden (§ 10 ZustVO) – für
 * alle Straßen. Maßgeblich ist die Liste der Verordnung nach § 4 GO NRW, nicht die Einwohnerzahl.
 */
function regelNordrheinWestfalen(g) {
  const kreis = kreisStelle(g);
  if (g.kreis.kreisfrei) return ergebnis(kreis, SICHERHEIT.BELEGT, "kreisfrei", "nwKreis");
  if (g.ars === NW_AACHEN) return ergebnis(gemeindeStelle(g, "stadt", "untere"), SICHERHEIT.VERMUTLICH, "nwAachen", "nwAachen");
  if (g.gemeindefrei) return ergebnis(kreis, SICHERHEIT.VERMUTLICH, "gemeindefrei", "nwKreis");
  const selbst = gemeindeStelle(g, istStadt(g) ? "stadt" : "gemeinde", "oertliche");
  if (NW_GROSSE_KREISANGEHOERIGE_STAEDTE[g.ars]) return ergebnis(selbst, SICHERHEIT.BELEGT, "nwGrosse", "nwGrosse");
  if (NW_MITTLERE_KREISANGEHOERIGE_STAEDTE[g.ars]) return ergebnis(selbst, SICHERHEIT.BELEGT, "nwMittlere", "nwMittlere");
  return ergebnis(kreis, SICHERHEIT.BELEGT, "nwKreis", "nwKreis");
}

// Brandenburg: Straßenverkehrsrechts- und Güterkraftverkehrs-Zuständigkeits-Verordnung (StGÜZV)
// vom 09.11.2018, zuletzt geändert 23.08.2024 (bravors.brandenburg.de, gelesen 04.10.2026). Namen wie
// in der Verordnung; ARS laut Wahlportal des Landes (wahlergebnisse.brandenburg.de, Bundestagswahl
// 2025) – Schwedt/Oder verwaltet Pinnow mit und hat deshalb einen Verbandsschlüssel. Die 2011 zu
// Großen kreisangehörigen Städten bestimmten Bernau bei Berlin, Falkensee und Oranienburg (BestGkSV)
// nennt die StGÜZV nicht – dort bleibt der Landkreis zuständig.

/** Große kreisangehörige Städte, die Straßenverkehrsbehörde sind wie ein Landkreis (§ 4 Abs. 4). */
export const BB_GROSSE_KREISANGEHOERIGE_STAEDTE = Object.freeze({
  "120600052052": "Eberswalde", "120670120120": "Eisenhüttenstadt", "120735051532": "Schwedt",
});

/** Städte, die auf ihren Antrag für alle Maßnahmen nach § 45 StVO zuständig sind (§ 4a Abs. 1). */
export const BB_AUF_ANTRAG = Object.freeze({
  "120690616616": "Teltow", "120690656656": "Werder", "120710160160": "Guben", "120730452452": "Prenzlau",
});

/**
 * Kommunen, die auf ihren Antrag nur Halten und Parken, Veranstaltungen, Arbeiten im Straßenraum und
 * den Schutz von Gemeindestraßen anordnen (§ 4a Abs. 2 Nr. 2): ARS der Gemeinde, beim Amt Schlieben
 * der Verbandsschlüssel (9 Stellen) – es gilt für alle seine Gemeinden.
 */
export const BB_AUF_ANTRAG_TEILWEISE = Object.freeze({
  "120610320320": "Luckau", "120620140140": "Finsterwalde", "120625209": "Amt Schlieben",
  "120680264264": "Kyritz", "120690304304": "Kleinmachnow", "120700424424": "Wittenberge",
});

/**
 * Brandenburg (belegt): Straßenverkehrsbehörden sind die Landkreise und kreisfreien Städte (§ 4 Abs. 1,
 * Abs. 3 Nr. 2 StGÜZV), dazu die Großen kreisangehörigen Städte (§ 4 Abs. 4) und auf Antrag vier
 * Städte (§ 4a Abs. 1) – jeweils für alle Straßen. Sechs weitere Kommunen ordnen auf Antrag nur
 * Halten und Parken, Baustellen, Veranstaltungen und den Schutz von Gemeindestraßen an (§ 4a Abs. 2):
 * dort bleibt der Landkreis zuständig, die Kommune steht als Alternative da.
 */
function regelBrandenburg(g, klasse) {
  const kreis = kreisStelle(g);
  if (g.kreis.kreisfrei) return ergebnis(kreis, SICHERHEIT.BELEGT, "kreisfrei", "bbKreis");
  if (g.gemeindefrei) return ergebnis(kreis, SICHERHEIT.VERMUTLICH, "gemeindefrei", "bbKreis");
  const selbst = gemeindeStelle(g, istStadt(g) ? "stadt" : "gemeinde", "untere");
  if (BB_GROSSE_KREISANGEHOERIGE_STAEDTE[g.ars]) return ergebnis(selbst, SICHERHEIT.BELEGT, "bbGks", "bbGks");
  if (BB_AUF_ANTRAG[g.ars]) return ergebnis(selbst, SICHERHEIT.BELEGT, "bbAntrag", "bbAntrag");
  const amt = g.verband && BB_AUF_ANTRAG_TEILWEISE[g.verband.ars] ? verbandStelle(g, "untere") : null;
  const teil = BB_AUF_ANTRAG_TEILWEISE[g.ars] ? selbst : amt;
  if (!teil) return ergebnis(kreis, SICHERHEIT.BELEGT, "bbKreis", "bbKreis");
  const bedingung = klasse === "G" ? "bbTeilG" : "bbTeil";
  return ergebnis(kreis, SICHERHEIT.BELEGT, "bbTeil", "bbTeil", { stelle: teil, bedingung });
}

/**
 * Große kreisangehörige Städte in Mecklenburg-Vorpommern (§ 7 Abs. 2 KV M-V in der Fassung des
 * Kreisstrukturgesetzes vom 12.07.2010): Straßenverkehrsbehörde wie ein Landkreis (§ 3 Abs. 6
 * StVZustLVO M-V, § 14 Landkreisneuordnungsgesetz).
 */
export const MV_GROSSE_KREISANGEHOERIGE_STAEDTE = Object.freeze({
  "130710107107": "Neubrandenburg", "130730088088": "Stralsund", "130740087087": "Wismar",
  "130750039039": "Greifswald",
});

/**
 * Städte, die nach § 4 Abs. 2 Satz 2 StVZustLVO M-V Verkehrszeichen selbst anordnen, auch wenn sie heute
 * 20.000 Einwohner nicht mehr erreichen: einmal mehr als 20.000, am 19.08.2021 (Inkrafttreten) noch
 * mindestens 17.000. Einwohner 30.06.2021 laut Statistischem Amt M-V (Bericht A123), Parchim laut Stadt.
 */
export const MV_STAEDTE_UEBERGANG = Object.freeze({
  "130710110110": "Neustrelitz – 30.06.2021: 20.108 Einwohner",
  "130710156156": "Waren (Müritz) – 30.06.2021: 21.197 Einwohner",
  "130760108108": "Parchim – 1991 rund 22.350, Ende 2019 18.128 Einwohner (Stadt Parchim, " +
    "Bevölkerungsprognose bis 2030); Zensus 2022: 17.814",
});

/**
 * Mecklenburg-Vorpommern (StVZustLVO M-V vom 12.08.2021, GVOBl. M-V S. 1221): Straßenverkehrsbehörden
 * sind die Landräte und die Oberbürgermeister der kreisfreien Städte (§ 3 Abs. 1), ebenso die großen
 * kreisangehörigen Städte (§ 3 Abs. 6). Städte mit mehr als 20.000 Einwohnern ordnen Verkehrszeichen
 * selbst an (§ 4 Abs. 2 Satz 1) – nahe 20.000 nur „vermutlich“. Nach Satz 2 auch Städte, die einmal
 * so groß waren und am 19.08.2021 noch mindestens 17.000 Einwohner hatten: belegt aus der Liste
 * `MV_STAEDTE_UEBERGANG`, vermutlich aus dem Bundesportal (`stvb`), sonst als Alternative.
 * Den Ämtern und amtsfreien Gemeinden gibt § 4 Abs. 1 Bewohnerparkausweise und den ruhenden Verkehr,
 * keine Anordnung nach § 45 StVO (was § 68 Abs. 2 FKrG ihnen darüber hinaus überträgt, ist nicht
 * geprüft).
 */
function regelMecklenburgVorpommern(g) {
  const kreis = kreisStelle(g);
  if (g.kreis.kreisfrei) return ergebnis(kreis, SICHERHEIT.BELEGT, "kreisfrei", "mvKreis");
  if (g.gemeindefrei) return ergebnis(kreis, SICHERHEIT.VERMUTLICH, "gemeindefrei", "mvKreis");
  if (MV_GROSSE_KREISANGEHOERIGE_STAEDTE[g.ars]) {
    return ergebnis(gemeindeStelle(g, "stadt", "untere"), SICHERHEIT.BELEGT, "mvGks", "mvGks");
  }
  if (!istStadt(g)) return ergebnis(kreis, SICHERHEIT.BELEGT, "mvKreis", "mvKreis");
  const ew = g.ew ?? 0;
  const stadt = gemeindeStelle(g, "stadt", "oertliche");
  // Übergangsregel: Stichtag ist der 19.08.2021, nicht der Datenstand – die Liste gilt unabhängig von `ew`.
  if (MV_STAEDTE_UEBERGANG[g.ars]) return ergebnis(stadt, SICHERHEIT.BELEGT, "mvBestand", "mvBestand");
  if (ew > 21000) return ergebnis(stadt, SICHERHEIT.BELEGT, "mvStadt", "mvStadt");
  if (ew > 20000) return ergebnis(stadt, SICHERHEIT.VERMUTLICH, "mvStadtKnapp", "mvStadt");
  if (ew >= 17000 && g.bundesportal === "stvb") {
    return ergebnis(stadt, SICHERHEIT.VERMUTLICH, "mvBestand", "mvBestandPortal");
  }
  if (ew >= 17000) {
    return ergebnis(kreis, SICHERHEIT.VERMUTLICH, "mvKreisBestand", "mvKreis", { stelle: stadt, bedingung: "mvBestandMoeglich" });
  }
  return ergebnis(kreis, SICHERHEIT.BELEGT, "mvKreis", "mvKreis");
}

// Rheinland-Pfalz: Landesverordnung über Zuständigkeiten auf dem Gebiet des Straßenverkehrsrechts vom
// 12.03.1987, zuletzt geändert 15.06.2026 (GVBl. 2026 Nr. 14, nur Anlage 3). Den Wortlaut von § 3 und
// § 5 haben wir nur aus einer Sekundärquelle (lexsoft, Fassung vom 08.12.2020): landesrecht.rlp.de war
// beim Einbau nicht erreichbar. Deshalb ist jede Auskunft nur „vermutlich“ (docs/TODO.md).

/** Große kreisangehörige Städte (§ 6 GemO): Die Stadtverwaltung ist für alle Straßen zuständig. */
export const RP_GROSSE_KREISANGEHOERIGE_STAEDTE = Object.freeze({
  "071330006006": "Bad Kreuznach", "071340045045": "Idar-Oberstein", "071370003003": "Andernach",
  "071370068068": "Mayen", "071380045045": "Neuwied", "071410075075": "Lahnstein",
  "073390005005": "Bingen am Rhein", "073390030030": "Ingelheim am Rhein",
});

/**
 * Anlage 1 zu § 5 Abs. 1 Satz 3: verbandsfreie Gemeinden (ARS, 12 Stellen) und Verbandsgemeinden
 * (Verbandsschlüssel, 9 Stellen), die auf Landes- und Kreisstraßen auch außerhalb geschlossener
 * Ortschaften zuständig sind. Noch leer – die Anlage ließ sich beim Einbau nicht lesen.
 */
export const RP_ANLAGE_1 = Object.freeze({});

/**
 * Rheinland-Pfalz (vermutlich): Straßenverkehrsbehörde ist die Kreisverwaltung, in kreisfreien und
 * großen kreisangehörigen Städten die Stadtverwaltung (§ 3 Abs. 1 Nr. 1). Maßnahmen nach § 45 StVO
 * trifft aber die Verbandsgemeinde bzw. die verbandsfreie Gemeinde (§ 5 Abs. 1 Satz 1) – auf Bundes-,
 * Landes- und Kreisstraßen nur innerhalb geschlossener Ortschaften (Satz 2), auf Landes- und
 * Kreisstraßen auch außerhalb, wenn sie in Anlage 1 steht (Satz 3). Ob eine Strecke innerorts liegt,
 * wissen wir nicht: Dort steht die Kreisverwaltung als Alternative.
 */
function regelRheinlandPfalz(g, klasse) {
  const kreis = kreisStelle(g);
  const sicher = SICHERHEIT.VERMUTLICH; // bis der Wortlaut an der Primärquelle geprüft ist
  if (g.kreis.kreisfrei) return ergebnis(kreis, sicher, "kreisfrei", "rpKreis");
  if (g.gemeindefrei) return ergebnis(kreis, sicher, "gemeindefrei", "rpKreis");
  if (RP_GROSSE_KREISANGEHOERIGE_STAEDTE[g.ars]) {
    return ergebnis(gemeindeStelle(g, "stadt", "untere"), sicher, "rpGks", "rpGks");
  }
  const ort = g.verband ? verbandStelle(g) : gemeindeStelle(g, istStadt(g) ? "stadt" : "gemeinde", "oertliche");
  if (klasse === "G") return ergebnis(ort, sicher, "rpOrt", "rpOrt");
  if (klasse !== "B" && RP_ANLAGE_1[g.verband?.ars ?? g.ars]) return ergebnis(ort, sicher, "rpAnlage1", "rpAnlage1");
  return ergebnis(ort, sicher, "rpOrt", "rpOrt", { stelle: kreis, bedingung: "rpAusserorts" });
}

/** AGS (8 Stellen) aus einem ARS: Land, Regierungsbezirk, Kreis und Gemeinde – ohne den Verband. */
const agsVon = (ars) => (ARS_RE.test(String(ars ?? "")) ? `${ars.slice(0, 5)}${ars.slice(9)}` : null);

/**
 * Große Kreisstädte in Sachsen (§ 3 Abs. 2 und 3 SächsGemO): 53 am 01.01.2026 laut Staatsministerium des
 * Innern (Kommunale Gliederung, Zahl je Landkreis). Namen und Schlüssel aus dem Gemeindeverzeichnis der
 * Landesdirektion Sachsen, Stand 01.08.2026: Status „Große Kreisstadt“, bei Stollberg/Erzgeb., Zschopau,
 * Mittweida, Rochlitz, Crimmitschau und Limbach-Oberfrohna fehlt er dort, sie führen aber einen
 * Oberbürgermeister und heißen in amt24 „Große Kreisstadt“. GV-ISys kennzeichnet sie in Sachsen nicht
 * (Textkennzeichen 63, nicht 67). Schlüssel ist der AGS – er bleibt gleich, wenn sich der Verband ändert.
 */
export const SN_GROSSE_KREISSTAEDTE = Object.freeze({
  // Erzgebirgskreis
  "14521020": "Annaberg-Buchholz", "14521035": "Aue-Bad Schlema", "14521390": "Marienberg",
  "14521550": "Schwarzenberg/Erzgeb.", "14521590": "Stollberg/Erzgeb.", "14521690": "Zschopau",
  // Mittelsachsen
  "14522050": "Brand-Erbisdorf", "14522080": "Döbeln", "14522140": "Flöha", "14522180": "Freiberg",
  "14522230": "Hainichen", "14522360": "Mittweida", "14522490": "Rochlitz",
  // Vogtlandkreis
  "14523020": "Auerbach/Vogtl.", "14523160": "Klingenthal", "14523300": "Oelsnitz/Vogtl.", "14523320": "Plauen",
  "14523340": "Reichenbach im Vogtland",
  // Zwickau
  "14524030": "Crimmitschau", "14524080": "Glauchau", "14524120": "Hohenstein-Ernstthal",
  "14524180": "Limbach-Oberfrohna", "14524300": "Werdau", "14524330": "Zwickau",
  // Bautzen
  "14625020": "Bautzen", "14625040": "Bischofswerda", "14625240": "Hoyerswerda", "14625250": "Kamenz",
  "14625480": "Radeberg",
  // Görlitz
  "14626110": "Görlitz", "14626290": "Löbau", "14626370": "Niesky", "14626600": "Weißwasser/O.L.",
  "14626610": "Zittau",
  // Meißen
  "14627010": "Coswig", "14627060": "Großenhain", "14627140": "Meißen", "14627210": "Radebeul",
  "14627230": "Riesa",
  // Sächsische Schweiz-Osterzgebirge
  "14628060": "Dippoldiswalde", "14628110": "Freital", "14628270": "Pirna", "14628360": "Sebnitz",
  // Leipzig (Landkreis)
  "14729050": "Borna", "14729150": "Geithain", "14729160": "Grimma", "14729260": "Markkleeberg",
  "14729410": "Wurzen",
  // Nordsachsen
  "14730070": "Delitzsch", "14730110": "Eilenburg", "14730230": "Oschatz", "14730270": "Schkeuditz",
  "14730310": "Torgau",
});

/**
 * Sachsen (belegt, SächsStrVRG): Die Gemeinden sind örtliche Straßenverkehrsbehörde für Maßnahmen nach
 * § 45 StVO, die ausschließlich Gemeindestraßen betreffen (§ 2), die Landkreise und Kreisfreien Städte
 * untere für alles Übrige (§ 3). Den Großen Kreisstädten ist der Vollzug nach § 3 übertragen (§ 1 Nr. 2
 * SächsKomVerfRDVO); ist eine von ihnen erfüllende Gemeinde einer Verwaltungsgemeinschaft, gilt das für
 * alle Beteiligten (§ 3 Abs. 2 Satz 3 SächsGemO). Die Aufgabe der örtlichen Behörde ist eine
 * Weisungsaufgabe (§ 24 SächsStrVRG) und geht damit auf den Verwaltungsverband bzw. die erfüllende
 * Gemeinde der Verwaltungsgemeinschaft über (§ 7 Abs. 1 Nr. 1, § 36 Abs. 3 SächsKomZG) – beide hier als
 * Stelle `v` + Verbands-ARS; die erfüllende Gemeinde ist `verband.sitz`.
 */
function regelSachsen(g, klasse) {
  const kreis = kreisStelle(g);
  if (g.kreis.kreisfrei) return ergebnis(kreis, SICHERHEIT.BELEGT, "kreisfrei", "snUnter");
  if (g.gemeindefrei) return ergebnis(kreis, SICHERHEIT.VERMUTLICH, "gemeindefrei", "snUnter");
  if (SN_GROSSE_KREISSTAEDTE[agsVon(g.ars)]) {
    return ergebnis(gemeindeStelle(g, "stadt", "untere"), SICHERHEIT.BELEGT, "snGks", "snGks");
  }
  const verband = g.verband;
  const verwaltungsverband = Boolean(verband) && /verband/i.test(verband.bez ?? verband.name ?? "");
  if (verband && !verwaltungsverband && SN_GROSSE_KREISSTAEDTE[agsVon(verband.sitz)]) {
    return ergebnis(verbandStelle(g, "untere"), SICHERHEIT.BELEGT, "snGksVg", "snGksVg");
  }
  if (klasse !== "G") return ergebnis(kreis, SICHERHEIT.BELEGT, "snLandratsamt", "snUnter");
  if (verband) {
    const grund = verwaltungsverband ? "snVerwaltungsverband" : "snVerwaltungsgemeinschaft";
    return ergebnis(verbandStelle(g), SICHERHEIT.BELEGT, grund, "snOertlichVerband");
  }
  return ergebnis(gemeindeStelle(g, istStadt(g) ? "stadt" : "gemeinde", "oertliche"), SICHERHEIT.BELEGT, "snGemeinde", "snOertlich");
}

/** Landesregeln: (Gemeinde, Klasse) → Ergebnis, oder null für den Rückfall auf Phase 1. */
export const LANDESREGELN = Object.freeze({
  BB: regelBrandenburg,
  BY: regelBayern,
  MV: regelMecklenburgVorpommern,
  NI: regelNiedersachsen,
  NW: regelNordrheinWestfalen,
  RP: regelRheinlandPfalz,
  SH: regelSchleswigHolstein,
  SN: regelSachsen,
  TH: regelThueringen,
});

/**
 * Regel samt Sonderfällen:
 * - Kondominium (VG25 `BEZ = Kondominium`): Der Eintrag trägt Kreis und Verband der angrenzenden
 *   Gemeinde, also deren Stelle – aber nie sicherer als „nur Ebene".
 * - Landesregel (`LANDESREGELN`), sonst Phase 1.
 * - Bundesportal (`g.bundesportal`, vom Build aus kontakte.json ergänzt): Nennt das Land dort für
 *   die Gemeinde dieselbe Stelle (`passt`), wird aus „nur Ebene" „vermutlich". Nennt es die
 *   Gemeinde selbst als Straßenverkehrsbehörde (`stvb`), steht sie als Alternative dabei.
 */
function regel(g, klasse) {
  if (g.kondominium) {
    const e = regelPhase1(g);
    return { ...e, sicherheit: SICHERHEIT.NUR_EBENE, grund: TEXTE.grund.kondominium, quelle: TEXTE.quelle.kondominium };
  }
  const landesregel = LANDESREGELN[g.land]?.(g, klasse);
  if (landesregel) return landesregel;
  const e = regelPhase1(g);
  if (g.bundesportal === "passt" && e.sicherheit === SICHERHEIT.NUR_EBENE) {
    return { ...e, sicherheit: SICHERHEIT.VERMUTLICH, grund: TEXTE.grund.bundesportal, quelle: TEXTE.quelle.bundesportal };
  }
  if (g.bundesportal === "stvb" && !e.alternative && !g.kreis.kreisfrei && e.stelle.art === "kreis") {
    const stelle = gemeindeStelle(g, istStadt(g) ? "stadt" : "gemeinde", "untere");
    return { ...e, alternative: { stelle, bedingung: TEXTE.bedingung.portalStvb } };
  }
  return e;
}

/**
 * Zuständigkeit einer Gemeinde je Straßenklasse (Build).
 * @param {object} g Eintrag aus gemeinden_attr.json (docs/VERTRAG.md, Abschnitt Zwischenprodukt)
 * @returns {{zust: Record<"G"|"K"|"L"|"B", object>, stellen: Record<string, object>}}
 *   zust[klasse] = { stelle: <id>, sicherheit, grund, quelle, alternative: {stelle: <id>, bedingung}|null }
 */
export function resolveGemeinde(g) {
  pruefeGemeinde(g);
  const stellen = {};
  const zust = {};
  for (const klasse of BAU_KLASSEN) {
    const e = regel(g, klasse);
    stellen[e.stelle.id] = e.stelle;
    if (e.alternative) stellen[e.alternative.stelle.id] = e.alternative.stelle;
    zust[klasse] = {
      stelle: e.stelle.id,
      sicherheit: e.sicherheit,
      grund: e.grund,
      quelle: e.quelle,
      alternative: e.alternative ? { stelle: e.alternative.stelle.id, bedingung: e.alternative.bedingung } : null,
    };
  }
  return { zust, stellen };
}

/** Stabile Kurz-Id eines Ergebnisses (FNV-1a, 32 bit) – gleiche Inhalte, gleiche Id. */
export function ergebnisId(erg) {
  const s = JSON.stringify(erg);
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return `e${h.toString(16).padStart(8, "0")}`;
}

/** Die schwächere zweier Sicherheiten. */
export function schwaecher(a, b) {
  return (SICHER_RANG[a] ?? 0) <= (SICHER_RANG[b] ?? 0) ? a : b;
}

/**
 * Laufzeit: zuständige Stelle für die Straßen einer Auswahl.
 * @param {object} daten Landesdatei (zustaendigkeit/<land>.json)
 * @param {string} ars 12-stelliger Regionalschlüssel der Gemeinde am Anker
 * @param {string[]} klassen Klassen der Straßen in der Auswahl (strassenklasse.js); leer = unbekannt
 * @returns {object|null} null, wenn die Gemeinde fehlt
 */
export function auswahl(daten, ars, klassen = []) {
  const eintrag = daten?.gemeinden?.[ars];
  if (!eintrag) return null;
  const stelle = (id) => daten.stellen[id] ?? FESTE_STELLEN[id] ?? null;
  // Kontakt einer Stelle: die Gemeinde selbst bzw. ihr Amt (`kontakt_gemeinde`) oder die
  // Kreisebene bzw. die kreisfreie Stadt (`kontakt`); Bund und Stadtstaaten haben keinen.
  const kontaktZu = (id) => {
    const s = String(id ?? "");
    const ref = s === `g${ars}` || s.startsWith("v") ? eintrag.kontakt_gemeinde : s.startsWith("k") ? eintrag.kontakt : null;
    return (ref && daten.kontakte?.[ref]) ?? null;
  };
  const erg = (k) => {
    const e = daten.ergebnisse[eintrag.z[k]];
    if (!e) throw new Error(`auswahl: ${ars} ohne Ergebnis für Klasse ${k}`);
    return e;
  };
  const basis = {
    ars,
    gemeinde: eintrag.name,
    verband: eintrag.verband ?? null,
    kreis: daten.kreise?.[eintrag.kreis] ?? null,
    land: daten.land,
    stand: daten.daten ?? null,
    regeln: daten.regeln ?? null,
    aenderung: eintrag.aenderung ?? null,
  };
  // Bundesportal: Seite der Gemeinde mit allen Stellen und Kontakten – nur in Ländern, die die
  // Leistung dort führen (`bundesportal_region`). Kondominium-Flächen kennt das Portal nicht –
  // dort die angrenzende Gemeinde.
  const portal = daten.bundesportal_region
    ? daten.bundesportal_region.replace("{ars}", eintrag.nachbar ?? ars)
    : null;
  const hinweise = [];
  const liste = klassen.length ? klassen : ["unklar"];
  if (!klassen.length) hinweise.push(TEXTE.hinweis.keineStrasse);
  const ohneA = liste.filter((k) => k !== "A");

  if (!ohneA.length) {
    return {
      ...basis,
      klasse: "A",
      zustaendig: FESTE_STELLEN.fba,
      sicherheit: SICHERHEIT.VERMUTLICH,
      grund: TEXTE.grund.autobahn,
      quelle: TEXTE.quelle.autobahn,
      alternative: null,
      hinweise,
      keinBrief: true,
      kontakt: null,
      bundesportal: null,
    };
  }
  if (liste.includes("A")) hinweise.push(TEXTE.hinweis.autobahnDabei);

  const top = hoechsteKlasse(ohneA);
  let e;
  let sicherheit;
  let alt = null;
  if (top === "unklar") {
    // Unbekannt, ob Gemeindestraße oder klassifizierte Straße: klassifiziert annehmen,
    // die Stelle für Gemeindestraßen als Alternative nennen.
    e = erg("K");
    sicherheit = schwaecher(e.sicherheit, SICHERHEIT.VERMUTLICH);
    const g = erg("G");
    if (g.stelle !== e.stelle) alt = { stelle: g.stelle, bedingung: TEXTE.bedingung.unklar };
  } else {
    e = erg(top);
    sicherheit = e.sicherheit;
    if (top !== "G" && ohneA.includes("G")) {
      const g = erg("G");
      if (g.stelle !== e.stelle) alt = { stelle: g.stelle, bedingung: TEXTE.bedingung.gemeindestrasse };
    }
  }
  const a = e.alternative ?? alt;
  return {
    ...basis,
    klasse: top,
    zustaendig: stelle(e.stelle),
    sicherheit,
    grund: e.grund,
    quelle: e.quelle,
    alternative: a ? { stelle: stelle(a.stelle), bedingung: a.bedingung, kontakt: kontaktZu(a.stelle) } : null,
    hinweise,
    keinBrief: false,
    kontakt: kontaktZu(e.stelle),
    bundesportal: portal,
  };
}
