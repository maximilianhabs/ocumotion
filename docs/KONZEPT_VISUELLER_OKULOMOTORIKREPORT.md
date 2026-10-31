# Konzept visueller Okulomotorikbericht, mit Prüfvermerk

Der Prüfvermerk stammt aus der Claude-Sitzung vom 31.10.2026. Der Entwurf darunter ist unverändert und ein
Zielbild, kein Bauauftrag. Bei Widerspruch gilt der Vermerk, darüber `CLAUDE.md`.

## Prüfvermerk

**Gebaut:** `testseite/bericht.html` mit `bericht-logik.js`, Etappe A in schlanker Form. Sie rechnet aus den
Rohdaten neu und zeigt Fixationsspur, neue Ziele, Sakkaden-Endlagen, Blickfolge, Ereignisstreifen und graue
Karten für alles Fehlende. Ausgabe als Entwicklungsdaten.

**Abweichungen vom Entwurf:**

| Thema | Entwurf | Entscheidung | Grund |
|---|---|---|---|
| Interpretation | Regelbasierte Hinweise, `interpretation-rules.js` | Ampel gegen benannte Grenzen auf Wunsch des Nutzers gebaut (`befund-logik.js`); keine Zentral-/Peripher-Aussage, ärztliche Einordnung bleibt von Hand | Für Forschung vertretbar. Vor Patienteneinsatz Medizinprodukte-Frage klären |
| Format | Vektor-PDF | Berichtsseite mit Druckansicht | Keine neue Abhängigkeit |
| Struktur | Neun Komponenten | Ein Berichtsmodell, eine Ansicht | Schnittstellen entstehen, wenn sie gebraucht werden |
| Blickfeldkarte | Richtungspfeile | Tabelle je Blickposition | Pfeile folgen, wenn echte Befunde vorliegen |
| Blickhalten | Teil aller Profile | Im Gütetest gebaut, ±15° h und ±10° v, Grenze im Bericht genannt | Bei 40 cm reicht der Bildschirm nur rund ±20° |

**Geprüft:** Die Zeitbudgets ergeben exakt 60, 180 und 360 s. Quelle [1] stimmt mit Titel, Jahr und DOI. Quelle
[2] ließ sich nicht öffnen und ist ungeprüft. Die Schnellkalibrierung (0,8 s Daten je Punkt) lag an drei
Läufen eines gesunden Probanden horizontal nah an der langen Variante; für Patienten ist das nicht belegt.

---

# Mac Vision – Visueller Okulomotorikbericht und adaptive Kurzprotokolle
Version 1.0 · 31.10.2026 · Neuer Konzeptentwurf zur Umsetzung durch eine andere KI

**Zielort im Projekt:** docs/KONZEPT_VISUELLER_OKULOMOTORIKREPORT.md  
**Status:** Produktspezifikation und Entwicklungsvorschlag; keine implementierte oder klinisch validierte Untersuchung.  
**Lokale Quelle:** /Users/maximilianhabs/Code/mac-vision. Zuerst CLAUDE.md, dann diesen Entwurf und die aktuellen Messnotizen lesen. Dieser Entwurf ersetzt keine Projektregel.

## 1. Auftrag und Leitentscheidung

Eine kurze, konzentrationsarme Untersuchung erzeugt einen visuell lesbaren Befundbericht. Drei Profile bedienen unterschiedliche Belastbarkeit: Kurz 60 s, Standard 180 s, Erweitert 360 s. Der Umfang wächst; eine kurze Untersuchung darf keine vollständige Languntersuchung vortäuschen.

Der Bericht soll auf einen Blick beantworten:
1. Was wurde tatsächlich untersucht?
2. Welche Bewegungsmuster wurden beobachtet?
3. Welche Messungen sind zuverlässig genug für welche Aussage?
4. Welche Muster verdienen ärztliche Aufmerksamkeit?
5. Welche Fragen bleiben offen?

**Keine Gesamtnote „gut/schlecht“, kein Prozentwert „zentral/peripher“.** Stattdessen ein Funktionsprofil mit belegten Beobachtungen, technischen Grenzen und ärztlich bestätigbarer Musterinterpretation. Ein unauffälliger Ausschnitt schließt eine zentrale oder periphere Erkrankung nicht aus.

Gütetest und Patiententest sind verschiedene Funktionen:
- Technischer Gütetest: Entwicklungs- und Geräteprüfung, ausführliche Kennwerte.
- Klinischer Untersuchungsentwurf: kurze Aufgaben, Beobachtungen und Befunddarstellung; keine normale Patientenleistung als Voraussetzung.
- Die Untersuchungssoftware und automatische klinische Aussagen müssen vor klinischer Anwendung separat validiert werden. Der aktuelle Stand bleibt Forschungsprototyp.

## 2. Ausgangslage und übernommene Grenzen

Geprüfter Dokumentstand vom 31.10.2026:
- Browseranwendung mit MediaPipe, Augenpositionen und persönlicher Kalibrierung.
- Drei dokumentierte reale Güteläufe. Nach aktueller Nachauswertung horizontal brauchbarer als vertikal; vertikale Reproduzierbarkeit unzureichend.
- Aktuelle Voreinstellung laut Notizen: Modellglättung aus, Median 5; Rohspuren erhalten.
- Gemeinsame Fusion und Freigaben je Achse sind inzwischen beschrieben. Vor Umsetzung aktuellen Code prüfen; das Projekt wird parallel weiterentwickelt.
- Größenordnung der Kamera: 720p/30 Hz. Keine pauschale Freigabe für kleine Fixationsintrusionen oder Sakkadengeschwindigkeit.
- Bildschirmbreite und Abstand sind messtechnische Eingaben, keine automatisch bekannten Größen.
- Die bisherigen drei Läufe sind keine Normstichprobe und liefern keine klinischen Grenzwerte.

Wichtig: Ein Median über fünf Bilder kann kleine Ereignisse verändern. Ein zentrierter Offlinefilter benötigt Zukunftswerte; kausale Vorschau hat anderes Zeitverhalten. Filtertyp, Zeitfenster, Randbehandlung und Lückenbehandlung versionieren. Dynamische Ereignisse immer gegen Rohspur prüfen. Filter nicht über Blinzeln, Lücken oder Phasengrenzen hinweg anwenden. Kein angeblich korrigierter Sakkadenzeitpunkt durch pauschales Abziehen von 67 ms.

## 3. Drei Untersuchungsprofile

### 3.1 Zeitdefinition und Vorbereitung

Zeitbudget ab sichtbarer, betriebsbereiter Kamera und Beginn der Patientenanweisung. Modellstart, Messung des Abstands und Eingabe von Basisdaten erfolgen vorher durch Untersucher/Betreuung; deren Dauer muss separat sichtbar sein. Kein versteckter zusätzlicher Kalibrierungstest für die 60-s-Variante.

Alle Zeiten sind Entwurfsbudgets, keine normierten Untersuchungsdauern. Kurze Beobachtungen haben geringere Nachweischancen für intermittierende Befunde.

| Baustein | Kurz | Standard | Erweitert |
|---|---:|---:|---:|
| Position, Anweisung, ruhiger Start | 8 s | 10 s | 10 s |
| Kalibrierung und unabhängige Prüfung | 12 s | 30 s | 45 s |
| Primärposition/Fixation | 10 s | 25 s | 60 s |
| Exzentrisches Blickhalten einschließlich Rückkehr | 10 s | 40 s | 80 s |
| Zielsprünge/Sakkaden | 8 s | 30 s | 60 s |
| Blickfolge | 8 s | 30 s | 60 s |
| Gewählte Zusatzfrage | – | – | 25 s |
| Wechsel, kurze Ansagen, Reserve | 4 s | 15 s | 20 s |
| **Gesamt** | **60 s** | **180 s** | **360 s** |

Pausen sind zusätzlich, jederzeit möglich und getrennt von aktiver Untersuchungszeit dokumentiert. Abbruch führt immer zu einem Teilbericht. Keine Pflicht, alle Abschnitte zu Ende zu bringen.

### 3.2 Kurz – 60 Sekunden: horizontales Kernscreening

Ziel: verwertbare Beobachtungen bei nur etwa einer Minute Konzentrationsfähigkeit.

- Schnellkalibrierung horizontal: Mitte/rechts/links als Anpassung, zwei unabhängige innere Prüfziele. Budget fünf Haltephasen von ungefähr 2 s plus 2 s Einstieg. Ob das ausreichend gültige Bilder liefert, ist zu validieren.
- Vertikal keine quantitative Kalibrierfreigabe. Vertikale Rohbewegung darf als nicht klassifizierter Ereigniskandidat erscheinen, niemals automatischer Upbeat-/Downbeat-Ausschluss.
- Primärposition 10 s: Suche nach deutlicher anhaltender Bewegung; geringe Beobachtungsdauer explizit angeben.
- Rechts-/Linksblick: je 4 s, jeweils 1 s zurück zur Mitte. Kein quantitativer Rebound-Ausschluss und keine zuverlässige Beurteilung selten auftretender Ereignisse.
- Vier horizontale Zielsprünge, Zeitpunkte leicht variiert. Endposition und grobe Nachkorrekturen, keine Normklassifikation aus wenigen Wiederholungen.
- Horizontale Blickfolge 8 s, beispielhaft ±10° und 0,25 Hz, sofern innerhalb geprüfter Kalibrierung.
- Keine Bewertung von vertikalen Sakkaden, vertikalem Blickhalten, Vergenz, OKN, VOR, Torsion oder Fixationsausschaltung.
- Keine berichtspflichtige SWJ-Rate aus 10 s ableiten. Kandidaten sind sichtbar; „keine SWJ“ ist nicht zulässig.

**Fehlgeschlagene Schnellkalibrierung:** kein automatisches Verlängern und kein Gradwert. Die verbleibende Zeit wird als qualitative, ärztlich überprüfbare Beobachtung genutzt. Kalibrierung mit Auslenkungsbegrenzung oder mangelhafter Mitarbeit nicht erzwingen.

Vorschlag für Titel: „Okulomotorisches Kurzprofil – 60 s, horizontaler Schwerpunkt“.

### 3.3 Standard – 180 Sekunden: horizontal und vertikal

- Zweiachsige Kalibrierung plus unabhängige Prüfziele, Freigabe je Auge und Achse.
- Primärposition 25 s; Ereigniszahl mit tatsächlicher Beobachtungsdauer angeben.
- Rechts/links/oben/unten je 8 s; Rückkehr zur Mitte je 2 s. Winkel beispielsweise ±15° h und ±10° v, nur innerhalb gültiger Geometrie.
- Etwa zwölf Zielsprünge, getrennte Richtungen; falls zu wenige gültig sind, keine quantitative Richtungsklassifikation.
- Blickfolge horizontal und vertikal je ungefähr 12 s bei niedriger Frequenz, Rest für Richtungswechsel.
- Klinisch relevante auffällige Abschnitte ärztlich prüfen. Vertikal darf auch im Standard vollständig „technisch nicht beurteilbar“ bleiben.

### 3.4 Erweitert – 360 Sekunden: Wiederholung und Asymmetrie

- Längere Kalibrierung mit wiederholten Zentren und räumlich unabhängigen Prüfpositionen.
- Primärposition insgesamt 60 s, beispielsweise 30 s zu Beginn und 30 s zum Ende.
- Vier exzentrische Positionen je 15 s, jeweils 5 s Rückkehr zur Mitte: Suche nach persistierendem Blickrichtungs- und Reboundmuster.
- Mehrere Amplituden und ausreichend wiederholte Sakkaden aller Richtungen; z. B. insgesamt 24 Versuche. Nur tatsächlich ausreichend besetzte Gruppen zusammenfassen.
- Blickfolge h/v, jeweils langsam und schneller, ungefähr vier Abschnitte zu 12 s plus Wechselreserve.
- Zusatzfenster 25 s: eine gezielte Wiederholung ODER ein separat validiertes Zusatzmodul wie OKN. Keine Pflicht, alle Erweiterungen unterzubringen.
- Separate Termine/Module für längere Fixation, Blick außerhalb des Bildschirms, Vergenz, Fixationsausschaltung und vestibuläre Untersuchungen.

## 4. Belastungsarme Bedienung

- Ein Punkt, eine kurze Anweisung, keine Zahlen oder Kurven während der Aufgabe.
- Auf Wunsch kurze akustische Ansage. Danach keine Ablenkung durch Sprachausgabe.
- Testprofil vor Beginn wählen; Testlänge in verständlicher Form anzeigen.
- Nicht automatisch „mehr testen“, wenn etwas auffällig ist. Untersucher entscheidet über Zusatzabschnitt.
- Wiederholung nur des betroffenen Bausteins, höchstens aus einer vorher festgelegten Reserve; sonst als neuer Abschnitt mit neuer Dauer.
- Pause stoppt Reize und Datensammlung; nach Fortsetzung Referenz/Kalibrierung prüfen, neues Segment.
- Selbstansicht nach Positionierung ausblenden. Keine wandernde Gesichtsschablone während Fixation.
- Kamera-/Tabverlust, Esc und Stop jederzeit wirksam; Teilbericht erhalten.
- Während eines Laufs keine stille Referenznachführung.
- Erschöpfung, Verständnisprobleme oder Sehbeeinträchtigung als Kontext dokumentieren, nicht als Krankheitsscore.

## 5. Klinische Beobachtungsfelder und Messlogik

### 5.1 Primärposition und Nystagmus

Nystagmus erfordert eine langsame Phase. Beim Rucknystagmus ist die Schlagrichtung die der schnellen Phase [1].

Speichern je Auge und Blickposition:
- horizontal rechts-/linksschlagend;
- vertikal aufwärts-/abwärtsschlagend;
- gemischt, pendelförmig oder nicht klassifizierbar;
- persistent/intermittierend, beobachtete Dauer, schnelle und langsame Phasen als Kandidaten;
- Frequenz und langsame Phasengeschwindigkeit nur bei freigegebener Signal-/Phasenmessung;
- konjugiert oder dissoziiert, nur bei beidseits ausreichender Qualität.

Kein Nystagmusdetektor allein aus einem Spektralpeak. Bewegung der Lider oder des Kopfes kann eine Augenbewegung vortäuschen. Augenunterschiede nicht wegmitteln.

Eine helle Fläche bedeutet keine Fixationsausschaltung. Standardtext: „Beobachtung unter visueller Fixation“. Torsion explizit „nicht erfasst“.

### 5.2 Blickhalten

Blickposition und Schlagrichtung sind zwei getrennte Felder. Beispiel: „Rechtsblick: vertikal abwärtsschlagende Bewegung“ statt automatischem „rechtsgerichteter Nystagmus“.

Neuauftreten, Verstärkung eines Primärpositionsmusters, Richtungswechsel und Rückkehrreaktion getrennt beschreiben. Blickwinkel und Dauer dokumentieren; extremes Endstellen nicht als Standard provozieren. Kurze Beobachtung reicht nicht für Ausschluss eines Blickhaltefehlers.

### 5.3 Sakkaden

Getrennte Größen:
1. Erste Landung nach der Primärsakkade.
2. Zielabweichung dieser ersten Landung.
3. Korrekturrichtung und Anzahl weiterer Sakkaden.
4. Endposition nach Korrekturen.
5. Latenz nur mit geprüfter Zeitbasis.

Aktueller Endlagenwert bleibt „Endpositions-Gain“. Nicht in Primärsakkaden-Gain umbenennen. Bei fehlender Trennung beider Ereignisse keine automatische Hypo-/Hypermetriebehauptung.

Richtungen und Amplituden getrennt auswerten. Von +10° nach −10° sind 20° Sprung. Referenz ist die tatsächliche Zielsprungamplitude. Geschwindigkeitsprofil und Main Sequence nur mit gesondert validierter schneller Messkette.

### 5.4 Blickfolge

Zielkurve und Einzelaugenspuren erhalten. Glatte Komponente und schnelle Korrekturen getrennt modellieren. Sinus-Amplitudenverhältnis ist noch kein Smooth-Pursuit-Gain. Rauschbedingte Geschwindigkeitsspitzen sind keine bestätigten Aufholsakkaden.

Befundfelder: überwiegend glatt / durch Sakkaden unterbrochen / unklar; h/v, Richtung, Zielgeschwindigkeit, Frequenz, Amplitude. Phasenversatz kann biologische Reaktion und technische Verarbeitung enthalten.

### 5.5 Fixationsintrusionen

SWJ-Kandidat: Sakkade vom Ziel weg, Pause, Rücksakkade; von langsamer Drift mit Rückstellung unterscheiden. Kleine Ereignisse und eng aufeinanderfolgende Sakkaden können unter Auflösungs-/Zeitgrenze liegen [1].

Häufigkeit nur mit Beobachtungsdauer und Datenabdeckung. Keine scheinbar stabile Rate aus sehr kurzen Abschnitten; gelegentliche SWJ nicht pauschal pathologisch nennen. Ocular flutter/Opsoklonus zunächst nur ärztlich zu bestätigende Muster, keine autonome Klassifikation der aktuellen Kamera.

## 6. Visueller Bericht: eine Übersichtsseite, Details optional

### 6.1 Format und Gestaltung

Primär ein druckfähiger A4-Hochformatbericht als vektorbasierte PDF; optional interaktive Ansicht aus demselben Reportmodell. Keine Screenshots, Fotos oder Augenausschnitte. Alle Grafiken aus Messwerten.

Einheitliche visuelle Hierarchie:
- Kopf: Profil, aktive Dauer, Beobachtungsbedingungen, Untersuchungs-ID.
- Direkt darunter: zwei bis drei priorisierte Aussagen in Klartext.
- Hauptfläche: Blickfeldkarte und drei Funktionskarten.
- Unterer Bereich: Musterhinweise, offene Fragen, ärztliche Freigabe.
- Fuß: Messqualität, Versionen, zentrale Einschränkungen, Seitenzahl.

Standard eine Übersichtsseite. Langprofil optional zweite Seite mit Einzelereignissen und erweiterten Kurven. Daten dürfen nicht unlesbar verkleinert werden.

Farben:
- Dunkelblau und Orange: rechtes/linkes Auge; zusätzlich Strichmuster und Legende.
- Violett: Ziel/Soll.
- Neutralgrau: nicht untersucht.
- Schraffur und Text: nicht auswertbar.
- Bernstein: prüfbedürftige Auffälligkeit.
- Rot nur für ärztlich bestätigten, bedeutsamen Befund, nicht für bloß schlechte Trackingqualität.
- „Unauffällig“ erst nach entsprechender Freigabe; keine grüne Fläche bei fehlenden Daten.
- Für Schwarzweißdruck unterscheidbar; keine alleinige Rot-Grün-Codierung.

Keine Radar-/Spinnennetzgrafik: verschiedene Einheiten und fehlende Module würden einen künstlichen Gesamteindruck erzeugen. Kein Tachometer „zentral 80 %“.

### 6.2 Kernvisualisierungen

| Grafik | Inhalt | Klinische Lesefrage | Schutz gegen Fehlinterpretation |
|---|---|---|---|
| Blickfeldkarte als Kreuzraster | Mitte, rechts, links, oben, unten; tatsächlicher Winkel und Beobachtungsdauer | Wo tritt welche Bewegung auf? | Graue Positionen bedeuten nicht untersucht |
| Richtungspfeile im Raster | h/v-Schlagrichtung; getrennte Symbole für kombinierte Komponenten | Richtungskonstant oder wechselnd? | Pfeil bezeichnet schnelle Phase; unklarer Kandidat gestrichelt |
| Fixationskarte | Reale Positionsspur h gegen v plus kurzer Zeitverlauf | Stabil, driftend, episodisch? | Ungültige Abschnitte fehlen; geometrische Wolke ist keine Konfidenzellipse |
| Sakkaden-Landekarte | Zielkreuz, Punkte der ersten Landungen; spätere Endpunkte als hohle Punkte | Unter-/Überschießen und Korrekturen? | Primärlandung nur bei validierter Segmentierung |
| Blickfolgekarte | Ziel und beide Augen auf identischer Zeitachse; markierte schnelle Ereignisse | Kontinuierliche Folge oder Unterbrechungen? | Keine Dekorationsglättung, kein Kurvenverbinden über Lücken |
| Ereignisstreifen | Blink-/Kopf-/Trackingereignisse und Nystagmus-/SWJ-Kandidaten | Passen Auffälligkeit und Artefakt zeitlich zusammen? | Status „Kandidat“ oder „bestätigt“ direkt sichtbar |
| Referenzbalken | Einzelversuche, Median und belegtes Vergleichsband | Wie liegen Wiederholungen zum Vergleich? | Ohne Normquelle kein klinisches Normalband |

Pfeillänge bedeutet nur dann Amplitude oder langsame Phasengeschwindigkeit, wenn eine gemeinsame Skala angegeben ist. Sonst feste Pfeillänge, Zahlen separat. Richtung und Intensität nie unbemerkt vermischen.

Im Kurzbericht: Primärposition + Rechts-/Linksblick belegt, obere/untere Zellen grau. Vertikale Komponente in der Mitte ggf. „technisch nicht beurteilbar“. Der Report soll Umfang und Grenzen auf den ersten Blick zeigen.

### 6.3 Referenzen, Grenzwerte und Unsicherheit

Drei Arten streng unterscheiden:
1. Technische Akzeptanzgrenze: Geräte-/Algorithmusprüfung; keine Patientennorm.
2. Klinische Referenz: externe, passende Norm mit Quelle, Alter, Aufgabe, Gerät und Methodik.
3. Individuelle Wiederholbarkeit: aus mehreren echten Durchgängen derselben Person.

Jeder Grenzwert hat Typ, Quelle, Version und Geltungsbereich. Experimentelle Schwellen werden gestrichelt mit „vorläufige technische Grenze“ gezeichnet. Fehlt eine klinische Referenz, zeigen wir Zielwert und Streuung, aber kein erfundenes grünes Normalband.

Streuung einzelner Versuche, systematische Kalibrierunsicherheit und statistisches Konfidenzintervall sind verschieden. Beschriftung korrekt wählen. Einzelframes sind wegen zeitlicher Abhängigkeit keine unabhängigen Wiederholungen. Norm-/Konfidenzbänder nicht aus drei bisherigen Güteläufen erzeugen.

Punktwolken nie durch synthetische Punkte auffüllen. Einzelversuche und Zahl verwertbarer Versuche sichtbar. Lange Rohkurven für Darstellung allenfalls extrema-erhaltend reduzieren, nicht Analyse oder kurze Ereignisse wegmitteln.

## 7. Zentrale und periphere Muster: erklärbare Hinweise statt Klassifikator

Die App unterstützt die fachliche Einordnung. Sie entscheidet nicht allein über Läsionsort oder Ursache. Die bisherigen Projektregeln verbieten automatische Diagnose; jede diagnostische Interpretation wird als ärztliche Ergänzung geführt.

| Beobachtung nach technischer und ärztlicher Bestätigung | Erlaubter Hinweis | Was daraus nicht folgt |
|---|---|---|
| Reiner vertikaler Nystagmus in Primärposition, Upbeat/Downbeat | Zentral-okulomotorisches Muster erwägen [2] | Kein automatischer Schlaganfallnachweis und keine Lokalisation aus Webcamdaten |
| Persistierender richtungswechselnder Blickrichtungsnystagmus | Hinweis auf Blickhaltestörung; zentrale und medikamentöse Ursachen prüfen | Extreme Endstellung oder Artefakte sind damit nicht ausgeschlossen |
| Reproduzierbare Sakkadendysmetrie | Zentral-okulomotorischer Befund möglich [2] | Kalibrierfehler oder Korrekturen nicht als Primärdysmetrie etikettieren |
| Reproduzierbar sakkadierte Blickfolge | Unspezifischer okulomotorischer Hinweis | Alter, Sehvermögen, Aufmerksamkeit und Medikamente können beitragen |
| Richtungskonstanter horizontaler Spontannystagmus | Mit peripher-vestibulärem Muster vereinbar, klinisch ergänzen | Keine Bestätigung einer peripheren Ursache; zentrale Ursachen bleiben möglich |
| Dissoziierte Augenbewegung | Binokularen Unterschied ärztlich prüfen | Keine automatische INO-/Paresediagnose |
| SWJ-Kandidaten | Fixationsintrusionen überprüfen | Einzelne SWJ beweisen keine Erkrankung |

Keine „peripher“-Kennzeichnung aus fehlenden zentralen Zeichen. Torsion, Fixationssuppression und VOR fehlen im Standard-Webcamaufbau. Kein HINTS-Label, keine HINTS-plus-Aussage und keine Schlaganfall-Ausschlussfunktion.

Bei klinisch akutem Schwindel mit Verdacht auf zentrale Ursache darf die Durchführung des Prototyps keine etablierte Untersuchung/Versorgung verzögern. Der Befundkopf zeigt bei solchen Fragestellungen den begrenzten Umfang.

Form der Interpretationskarte:
- **Beobachtet:** objektiv beschriebene, prüfbare Bewegung.
- **Technische Sicherheit:** welche Teilmessung freigegeben ist und warum.
- **Ärztliche Einordnung:** bestätigte Interpretation oder „noch offen“.
- **Nicht abgedeckt:** konkrete fehlende Bausteine.
Keine synthetische Wahrscheinlichkeit.

## 8. Befundtext und Teilberichte

Deterministische Textbausteine aus strukturierten Feldern zuerst; ein Sprachmodell darf später formulieren, aber keine Kennwerte, Negativbefunde oder Diagnose ergänzen. Arztfreigabe und Herkunft jeder Aussage erhalten.

Beispiel Kurzprofil, ausdrücklich fiktiv:
„Okulomotorisches Kurzprofil, 60 s, unter visueller Fixation. Horizontal auswertbar, vertikale Komponente technisch eingeschränkt. In 10 s Primärpositionsbeobachtung kein anhaltendes horizontales Ruckmuster sicher erkannt; intermittierende oder kleine Bewegungen werden dadurch nicht ausgeschlossen. Rechts-/Linksblick jeweils 4 s untersucht. Horizontale Zielbewegungen im dargestellten Bereich verfolgt. Vertikale Sakkaden und Blickfolge, Torsion, Fixationsausschaltung und vestibulookuläre Funktionen nicht untersucht.“

Ein fehlender Abschnitt bekommt eine graue Karte; ein misslungener eine schraffierte Karte mit Grund. Nicht pauschal „Okulomotorik unauffällig“. Unterhalb einer noch nicht validierten Nachweisgrenze keinen negativen Automatismus formulieren.

Abbruch nach 35 s: vorhandene Daten als Teilbericht, realer Zeitumfang und Gründe sichtbar. Kein Verlust aller Erkenntnisse durch ein späteres schlechtes Modul.

## 9. Datenmodell und technische Umsetzung

Aus dem bisherigen Prototyp schrittweise extrahieren; zuerst vorhandene Logik und letzte Änderungen lesen. Nicht parallel neu implementieren.

Vorgeschlagene Komponenten:
- protocol-config.js: deklarative Zeitbudgets, Zielpositionen, Wiederholungen und Reserven.
- protocol-runner.js: Zustandsautomat, Reize, Pause/Abbruch, tatsächlich abgeschlossene Abschnitte.
- signal-pipeline.js: eine versionierte Verarbeitung für Liveansicht und Nachauswertung.
- event-detectors.js: Nystagmus-/Sakkaden-/Intrusionskandidaten mit Gründen.
- quality-gates.js: Freigabe je Auge, Achse, Ereignistyp und Abschnitt.
- report-model.js: reine, unveränderliche Befundstruktur.
- report-charts.js: SVG-Grafiken aus Reportmodell und echten Messpunkten.
- report-view.js: Bildschirm-/Druckdarstellung; statischer PDF-Export später.
- interpretation-rules.js: versionierte, nachvollziehbare Hinweise, keine Diagnoseengine.

Reihenfolge der Daten:
Rohmessungen → Artefaktmarkierungen → geeignete Segmente → Kalibrierung/Freigaben →
Ereigniskandidaten/Kennwerte → Befundmodell → Visualisierung und Text.

Minimaler Ergebnisvertrag:
```js
{
  schemaVersion: "visual-oculomotor-1",
  protocol: { id: "short-60", plannedMs: 60000, actualActiveMs: 0,
              setupMs: 0, pauseMs: 0, completed: false },
  acquisition: { cameraProfile: {}, clockSource: "", frameStats: {},
                 detectorVersion: "", modelHash: "", filter: {} },
  calibration: { right: {}, left: {}, horizontalGate: {}, verticalGate: {} },
  sections: [{
    id: "primary-fixation",
    actualDurationMs: 0,
    status: "not_examined", // usable | limited | unusable | not_examined
    coverage: { horizontal: null, vertical: null },
    metrics: [], // value, unit, uncertaintyType, referenceId, gate, provenance
    events: [],  // onset/end, side, axis, kind, candidate/confirmed, artifactLinks
    observations: [],
    exclusions: [],
    traceRefs: []
  }],
  references: [], // technical | clinical | individual; source and applicability
  clinicalReview: { status: "pending", reviewer: null, overrides: [] }
}
```

Messdaten nur nach bewusstem Start, im RAM bis ausdrücklich benannt gespeichert/exportiert.
Keine Bilder/Videos/Augenausschnitte. Vorhandene JSON-Exporte verlustfrei importierbar halten;
alte Auswertungen nicht unbemerkt überschreiben, sondern mit Auswertungsversions-ID ergänzen.
Werte nie zwischen verschiedenen Filter-/Kalibrierzuständen ohne Segmentgrenze mischen.
Zeitstempel für Sensor-/Medienzeit, Callback, Analyse und Reiz getrennt führen; Unbekanntes als unbekannt.
Gültigkeit gegen Zeitabdeckung prüfen, nicht nur gegen Anzahl eingetroffener Frames.

Auflösung/FPS selbst prüfen; keine feste 30-Hz-Annahme in Ableitungen oder Filtern. Kameraprofilwechsel
invalidiert betroffene Referenzen. Vertikale Nichtfreigabe darf horizontale Ergebnisse nicht löschen.
Für Augenvergleich beide Einzelspuren erhalten, auch wenn Fusion ausgesetzt wird.

## 10. Konkrete Umsetzung in drei Etappen

### Etappe A – sichtbarer Report ohne neue medizinische Behauptung
1. Reportmodell und druckfähiges Layout mit vier Hauptkarten bauen.
2. Bestehende drei Güteläufe importieren; Ausgabe „Entwicklungsdaten“, keine Patientenbefunde.
3. Aktuelle Endpositionsmaße und Sinus-Amplitudenverhältnisse korrekt benennen.
4. Nicht untersuchte/ungültige Funktionen sichtbar machen.
5. Kurzprofil als deklaratives 60-s-Protokoll ergänzen, noch experimentell.

### Etappe B – Aufgaben und Qualität stabilisieren
1. Schnellkalibrierung und Zeitbudget real testen; keine Freigabe aus Zeitplan allein.
2. Kopf-/Blink-/Trackingereignisse lokal pro Zeitabschnitt protokollieren.
3. Kurze Realtests auf Wiederholbarkeit, Abbruch, Ermüdung und Verständnis prüfen.
4. Gleiche RAM-Bilder für Filter-/Detektorvergleich, ohne Speicherung von Bildern.
5. Synthetische Signale mit langsamer Drift, schnellen Rückstellungen, SWJ-ähnlichen Paaren,
   Blickfolgetreppe, gemeinsamen Fehlern beider Augen und Lücken. Erwartete Ausgabe vorab festlegen.

### Etappe C – klinische Begriffe und Referenzen freigeben
1. Referenzvergleich mit geeigneter VOG für die jeweiligen Kennwerte/Ereignisse.
2. Geräte-/Aufgaben-/Altersabhängigkeit und ausreichend unabhängige Wiederholungen prüfen.
3. Erst danach automatische klinische Klassifikation einzelner Befunde erwägen.
4. Normquelle und Algorithmusversion im Report verpflichtend.
5. Ärztliche Korrektur und Freigabe unterstützen; kein Training auf ungeprüften Eigenlabels.

## 11. Abnahmekriterien für die andere KI

- Zeitbudgets addieren sich exakt; kalte Modellladezeit und Pausen werden nicht versteckt.
- Ein 60-s-Lauf erzeugt keine erfundene vertikale Volluntersuchung.
- Ein Abbruch erzeugt einen korrekt beschrifteten Teilbericht.
- Ungültige Kalibrierung erzeugt keine freigegebenen Grad-/Geschwindigkeitskennwerte.
- Fehlende Daten erzeugen keine unauffällige/„periphere“ Interpretation.
- Alle dargestellten Punkte stammen aus echten Messungen oder sind unübersehbar als Simulation markiert.
- Jede Richtungspfeil-Karte ist mit der zugehörigen Zeitspur verknüpft.
- Norm-, Technik- und Wiederholbarkeitsgrenzen sind visuell und semantisch getrennt.
- Endlage und erste Landung bleiben verschieden.
- Rohspuren sind im Detailbericht verfügbar, grafisch erkennbare Lücken bleiben Lücken.
- Kalibrierung, Filter und Fusion sind zwischen Ansicht, Export und Nachauswertung konsistent.
- Keine Diagnoseschlussfolgerung aus Gesamtpunktzahl; keine scheinpräzisen Wahrscheinlichkeiten.
- Bericht im A4-Ausdruck und in Schwarzweiß lesbar; Text erklärt Farben und Symbole.
- Keine personenbezogenen Rohdaten oder Bilder ins Repository; keine Installation, Commits oder Pushes ohne Ansage.

## 12. Fachliche Quellen und Evidenzstatus

Die folgenden Quellen begründen Untersuchungsdomänen und Musterbegriffe, nicht die vorgeschlagenen
Zeitbudgets, eine Webcam-Nachweisgrenze oder klinische Grenzwerte des Prototyps.

[1] Eggers SDZ et al. Classification of vestibular signs and examination techniques: Nystagmus and
nystagmus-like movements. Bárány Society consensus, J Vestib Res 2019;29:57–87.
DOI: 10.3233/VES-190658. https://pubmed.ncbi.nlm.nih.gov/31256095/
Grundlage für Abgrenzung Nystagmus/sakkadische Intrusionen und Beschreibung der Blickabhängigkeit.

[2] Strupp M et al. Central ocular motor disorders, including gaze palsy and nystagmus.
J Neurol 2014;261 Suppl 2:S542–558. DOI: 10.1007/s00415-014-7385-9.
https://pmc.ncbi.nlm.nih.gov/articles/PMC4141156/
Grundlage für systematische Untersuchungsdomänen und klinische Musterinterpretation.

Projektquellen: CLAUDE.md; docs/KONZEPT_OKULOMOTORIK.md; docs/KONZEPT_GUETETEST.md;
docs/MESSUNGEN.md, insbesondere drei reale Güteläufe und deren aktuelle Nachauswertung.
Vor Übernahme aktuelle Dateien lesen; dieser Entwurf ist kein Beleg für inzwischen implementierte Funktionen.

