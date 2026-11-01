# Messungen

Laufendes Protokoll. Es bleibt die Auswertung, nie das Bildmaterial.

## 31.10.2026 — Kameramodi

Mit `make kamera`, ohne die Kamera zu öffnen.

| Kamera | Auflösung | Bildrate |
|---|---|---|
| FaceTime HD (MacBookPro17,1) | 1280×720, 640×480 | fest 30 fps |
| iPhone 17 Pro Max, Kontinuitätskamera | 640×480 bis 1920×1440 | bis 60 fps |

Das sind die vom System gemeldeten Modi. Die tatsächliche Bildrate ist noch nicht gemessen.

## 31.10.2026 — iPhone im Browser

macOS meldet das iPhone als verbundene Kontinuitätskamera (Gerätetyp extern, nicht pausiert). Chrome 156 listet es trotzdem nicht:
Ein eigener Chrome-Start mit leerem Profil zeigte vor und nach der Kamerafreigabe nur FaceTime HD. Das passt zu zwei offenen
Fehlermeldungen bei Chromium (436126054, 534781935), die Safari als funktionierend nennen. Am Mac ist für das iPhone also Safari der
nächste Versuch.

## 31.10.2026 — Erster Lauf mit iPhone-Rückkamera

Safari, Knopf iPhone-Test, Optokinetik, iPhone in der Hand. Vergleich: ausführlicher Lauf mit FaceTime HD, ruhende Kamera. Nicht gleichwertig,
weil das iPhone nicht fest stand; Abstand nicht gemessen, eingestellt waren 40 cm.

| Kennwert | FaceTime HD | iPhone |
|---|---:|---:|
| Ausgehandelt | 1280×720, 30 fps | 1920×1080, 30 fps (gewünscht 60) |
| Bilder je Sekunde, gemessen | 30,0 | 29,5–30,0 |
| Bildabstand, Spanne der mittleren 90 % | 32–34 ms | 30–37 ms |
| Bildabstände über 50 ms | 1 von 1443 | 12 von 1432 |
| Irisdurchmesser | 37 px | 71 px |
| Rauschen je Bild, Mittel beider Augen, Irisdurchmesser | 0,0058 | 0,0131 |

**Die Bildrate war nicht höher.** Safari blieb trotz Wunsch bei 30 fps, über zeitliche Auflösung sagt der Lauf also nichts. Die Iris hatte fast doppelt so viele
Bildpunkte, das Rauschen war trotzdem höher. Das spricht nicht gegen die Kamera, denn die Hand bewegte das Bild: Der Kopf sprang von Bild zu Bild um 2,0 statt 0,4 px.
Ab rund 13 s wanderte das Gesicht aus dem Bild, die Augenmitte lag dabei bei 80 % der Bildhöhe. Ab rund 20 s gab es keine Erkennung mehr, von 62 s Lauf sind
nur die ersten rund 15 s brauchbar. Die Streifen nach rechts und die Kontrolle haben keine Daten, eine Aussage zum OKN ist nicht möglich.

Geändert: `getUserMedia` verlangt die Bildrate nun zuerst fest, die Seite warnt, wenn die Kamera weniger liefert.

**Zweiter Lauf, gleicher Abend, mit dieser Änderung:** wieder 1920×1080 mit 30 fps, gemessen 28,7–29,2 Bilder je Sekunde, Bildabstände über 50 ms 56 von 1390.
Safari liefert das iPhone hier also nicht mit 60 fps. Das Tracking lief dagegen durch: 96–100 % Bilder mit beiden Augen, Iris 90–97 px, Kopf von Bild zu Bild 1,3 px
oder 0,015 Irisdurchmesser (FaceTime 0,012). Das Rauschen je Bild lag trotzdem bei 0,0143 Irisdurchmessern gegen 0,0058 bei FaceTime. Mehr Bildpunkte haben es also
nicht gesenkt. Ein Sägezahn ist nicht zu sehen: Sprünge in beide Richtungen etwa gleich häufig, 16 zu 14 und 14 zu 13. Ob das iPhone dem Mac ohne Browser 60 fps liefert, klärt
`make kamera-takt`; das Werkzeug braucht die Kamerafreigabe im Terminal.

Erste Fassung des Werkzeugs: 30,0 Bilder je Sekunde, Abstand gleichmäßig 33,3 ms. Nicht beweisend, weil das 60-fps-Format vor dem Start gesetzt und nicht zurückgelesen
wurde. Die zweite Fassung setzt es nach dem Start und nennt, was aktiv ist.

**Zweite Fassung, iPhone 1920×1080:** aktiv 60 fps, 241 Bilder in 4 s, Rate 60,0, Abstand 16,7 ms, längster Abstand 17 ms. Ohne Browser kommen also echte 60 fps am Mac an.
Die Grenze im Safari-Lauf lag im Browser, nicht in der Kontinuitätskamera. Der zweite Teil mit 1280×720 stand nicht in der übermittelten Ausgabe.
Safari zeigte auch bei „1280×720, 60 fps“ nur 30 fps, ausgehandelt und in den Analysen je Sekunde.

## 31.10.2026 — Kamerabrücke mit Kunstbild

`tools/kamera_bruecke.swift` reicht Bilder über `ws://127.0.0.1:5601` an die Seite, ungepackt 1280×720, keine Speicherung. Geprüft nur mit Kunstbild, nicht mit dem iPhone.

| Prüfung | Ergebnis |
|---|---|
| Fremde Herkunft (`https://example.com`) | abgelehnt, 400 |
| Eigene Herkunft | angenommen, 101 |
| Node-Empfänger | 60,0 Bilder/s, 222 MB/s, 0 verworfen |
| Chrome 156 ohne Fenster, nur Empfang | 60,0 Bilder/s, Bild in die Fläche 0,24 ms |
| Chrome 156 ohne Fenster, mit MediaPipe | 56–60 Analysen/s, 6–7 ms je Analyse |
| Eingebautes Fenster der App | nur 6–15 Analysen/s, später keine Bilder |

Das Kunstbild enthält kein Gesicht. Die 6–7 ms decken also die Gesichtspunkte nicht ab. Safari ist mit der Brücke nicht geprüft.

## 31.10.2026 — iPhone über die Brücke, Chrome, echter Lauf

Knopf iPhone-Test, Optokinetik, 64 s, eine Person, Abstand nicht gemessen, eingestellt 40 cm. Grober Maßstab aus Sprüngen, kein Normwert.

| Kennwert | MacBook, Chrome | iPhone, Safari | iPhone, Brücke |
|---|---:|---:|---:|
| Bilder je Sekunde im Lauf | 30,0 | 28,7–29,2 | 50,3–52,6 |
| Häufigster Bildabstand | 33,3 ms | 33 ms | 16,7 ms |
| Bildabstände über 50 ms | 1 von 1443 | 56 von 1390 | 3 von 2460 |
| Bilder mit beiden Augen | 99–100 % | 96–100 % | 99–100 % |
| Irisdurchmesser | 37 px | 90–97 px | 60–63 px |
| Rauschen je Bild, Irisdurchmesser | 0,0058 | 0,0143 | 0,0072 |
| Kopf von Bild zu Bild, Irisdurchmesser | 0,012 | 0,015 | 0,011 |
| Bilder je Sprung, Median | 3 | 3 | 6 |

**Die zeitliche Auflösung ist 1,7-mal so hoch wie am MacBook.** Die Anzeige von 60 Analysen gilt ohne Reiz; im Lauf fielen rund 15 % der Bilder aus, meist einzeln, sodass Abstände von 33 ms entstanden. Über die ganze
Kamerazeit verwarf die Seite 846 und die Brücke 196 Bilder. Die Seite analysiert im Hauptthread neben dem Reiz; ob das die Ursache ist, ist nicht geprüft. Das Rauschen je Bild halbierte sich gegen den Safari-Weg.

**OKN weiter nicht nachgewiesen.** Geschwindigkeit über 150 ms, langsame Abschnitte unter 20 °/s:

| Block, Reizrichtung | Median | Anteil in Reizrichtung |
|---|---:|---:|
| Muster nach links (−) | −1,2 °/s | 0,55 |
| Muster nach rechts (+) | +1,8 °/s | 0,58 |
| Kontrolle mit Fixationspunkt | +0,6 °/s | 0,54 |

Erstmals gingen beide Richtungen in Reizrichtung, die Werte liegen aber weit unter den 8 °/s des Reizes und innerhalb einer Streuung von 8–10 °/s; die Kontrolle ist kaum anders. Die Sprünge zeigen keine klare
Richtung (13 zu 14, 16 zu 24). Ein Lauf, nicht wiederholt.

## 31.10.2026 — Kameraeigenschaften

Mit `make kamera-details`, ohne die Kamera zu öffnen. FaceTime HD und iPhone melden über
AVFoundation weder feste noch automatische Belichtung, Fokus oder Weißabgleich. Der
Bildwinkel steht auf 0, ist also unbekannt. Das Verhalten im laufenden Betrieb ist ungeprüft.

## 31.10.2026 — Testseite, Modelle auf leerem Bild

MediaPipe Web 1.2.0, GPU, schwarzes Bild 1280×720, Median aus 12 Durchläufen, ohne Kamera.

| Modell | Laden | Durchlauf |
|---|---|---|
| Gesture Recognizer | 8,2 s (erster Aufruf) | 9,5 ms |
| Face Landmarker | 0,9 s | 6,2 ms |
| Pose Landmarker full | 4,7 s | 10,8 ms |

**Das ist nicht die Analyserate.** Ohne Treffer läuft nur der Detektor; die maßgebliche
Zahl mit Hand im Bild steht noch aus. Laut Protokoll rechnet der Gestenklassifikator trotz
GPU-Wahl auf der CPU, die Blendshapes ebenfalls.

## 31.10.2026 — Erster Live-Test

Testseite im normalen Browser mit echter Kamera: läuft und funktioniert laut Nutzer
„prinzipiell sehr gut“. Das ist ein Eindruck, keine Messung. Analysen/s mit Hand im Bild,
Bildrate bei wenig Licht und die Seitenzuordnung der Hände sind weiter offen.

## 31.10.2026 — Prüfung der überarbeiteten Testseite

Mit künstlichem Canvas-Video statt Kamera, ohne erkennbare Hand oder Gesicht. Bestätigt sind nur
Abläufe, keine Leistungswerte: Dreifachklick ergibt einen Start, Neustart und Stopp beenden alle
Videospuren, nach dem Stopp sind die Anzeigen leer. Die Zeitbasis war dabei `mediaTime`; ob die
echte Kamera `captureTime` liefert, ist offen. Modellwechsel lief ohne Fehler.

Bei ausgeblendetem Browserfenster blieben alle Bild-Callbacks aus, auch in einem unabhängigen
Zähler, obwohl die Seite als sichtbar galt und das Testvideo weiterlief. Die Erkennung läuft also
nur, solange das Fenster dargestellt wird. Die Seite meldet das nach 1,5 s und beendet das
Messsegment. Die Regel Analyserate ÷ 4 gilt hier als vorläufige Obergrenze.

## 31.10.2026 — Bildquelle unabhängig von der Darstellung

Chromium 152, Testvideo 30 Bilder/s, Browserfenster ausgeblendet: `MediaStreamTrackProcessor`
im Hauptthread lieferte 61 Bilder in 2 s, Zeitstempel streng steigend. Im Worker ist die Klasse
nicht verfügbar. Mit echter Kamera, normalem Chrome und Safari noch ungeprüft.

## 31.10.2026 — Augenseite, Prüfung ohne Auge

`make test`: 10 von 10 Prüfungen der Augenlogik bestanden, mit konstruierten Punkten. Die Seite
lief mit Testvideo ohne Gesicht fehlerfrei und meldete 0 % gültig mit Grund „kein Gesicht“. Die
Analyserate dort ist wegen des gedrosselten Fensters kein Messwert. Mit echtem Gesicht ungeprüft.

## 31.10.2026 — Kalibrierablauf, Prüfung ohne Auge

`make test`: 20 von 20 Prüfungen bestanden, mit konstruierten Daten. Im Browser lief der ganze Ablauf
mit Testvideo und simuliertem Vollbild: 12 Ziele symmetrisch platziert, Erkennung unter der
Vollbild-Fläche aktiv, Ende ohne Gesicht mit „nicht bestanden“ und ohne Gradanzeige. Echtes Vollbild
und die Kalibrierung mit echtem Gesicht sind ungeprüft. Antwortet das Vollbild nicht, gibt ein
Zeitlimit die Bedienung nach 2 s wieder frei.

## 31.10.2026 — Korrektur nach zweitem Review

`make test`: 28 von 28 bestanden, darunter die nachgestellten Gegenproben: 10° Fehler in der jeweils
anderen Achse, vertikale Unruhe, schwankende Einzelwerte, Lücken, geringer Gültigkeitsanteil und
Seitendifferenz. Mit Testvideo und simuliertem Vollbild geprüft: Abbruch durch Vollbildende, durch
das Sichtbarkeitsereignis und durch Kamerastopp sowie ein nicht antwortendes Vollbild. Nichts lief
danach weiter, alle Videospuren endeten. Der Zweig „bestanden“ braucht ein echtes Gesicht.

## 31.10.2026 — Positionierungshilfe, Prüfung ohne Gesicht

`make test`: 39 von 39 bestanden. Mit Testvideo: Zielrahmen wird gezeichnet, Hinweis „Kein Gesicht im
Bild“, Kalibrieren ohne gemerkte Position gesperrt, Stopp räumt alles ab. Hinweise, Merken, geschätzter
Abstand und Abbruch bei Bewegung sind in der Oberfläche mit echtem Gesicht ungeprüft.

## 31.10.2026 — Gütetest, Trockenlauf

`make test`: 50 von 50 bestanden. Ein vollständiger Trockenlauf mit simuliertem Gesicht, das dem Punkt
exakt folgt, lief durch alle fünf Teile: Kalibrierung bestanden, Zielfehler 0,0°, Blickfolge-Gain 1,00,
Sakkaden-Gain 1,00. Die Sakkadenlatenz blieb leer, weil das simulierte Auge ohne Latenz springt. Export
und Bericht geprüft, die Datei enthält keine Bilder. Das belegt nur den Ablauf, nichts über echte Augen.

## 31.10.2026 — Erster echter Gütetest

Vom Nutzer durchgeführt, ohne gespeicherte Datei. Rückmeldung: Der Test brach oft ab, sobald der Kopf
nicht mehr exakt in Position war. Deshalb gelten nun die Stufen 15 % / 2 Irisdurchmesser zum Vermerken
und 25 % / 4 Irisdurchmesser zum Abbrechen. Kennwerte dieses Laufs liegen nicht vor.

## 31.10.2026 — Erster gespeicherter Gütetest, Glättung an

Interne Kamera, 40 cm, 720p, Zeitbasis `captureTime`, ein Ziel mit Kopfmarke. Tiefe Auswertung mit
`tools/guetetest_auswertung.py`. Die Testperson wurde nicht klinisch untersucht.

| Größe | Rechts | Links | Mittel |
|---|---|---|---|
| Prüffehler Kalibrierung h / v | 0,5° / 1,3° | 1,6° / 0,7° | – |
| Neue Ziele h / v | 1,4° / 3,0° | 3,7° / 2,3° | 1,9° / 2,4° |
| Größter Fehler neue Ziele | 5,5° | 5,2° | 4,1° |
| Sakkaden-Gain h, Latenz | 0,98, 256 ms | 1,03, 256 ms | 1,00, 256 ms (8 von 8) |
| Sakkaden-Gain v | 1,07 | 1,15 | 1,13 (3 von 4) |
| Blickfolge langsam Gain | 1,08 | 1,17 | 1,12 |

Beobachtungen: Bildtakt 33,3 ms stabil, 100 % gültige Kalibrierbilder. Ruhe robust 0,95° h und 2,1° v,
alle gültigen Bilder 1,3° und 4,6°. Neun vertikale Ausschlagsepisoden über 3° mit 165 Bildern; ihre
Ursache ist in diesem Lauf nicht belegbar, weil er keine Lidwerte enthält. Bild-zu-Bild-Differenz 0,09°,
zugleich langsames Wandern; bei aktiver Glättung belegt das keine Präzision. Korrelation beider Augen
in Ruhe horizontal −0,29, vertikal 0,98: horizontal eher getrennte Fehler, vertikal ein gemeinsamer Einfluss,
der offen ist. Das Modell braucht im Vergleich zur idealen Geometrie die 1,6- bis 1,9-fache Verstärkung
horizontal und die 4- bis 5-fache vertikal. Das ist eine Näherung, kein Maß einer Modelldämpfung.

Blickfolge bei beiden Frequenzen rund 230 ms verzögert, Sakkaden-Latenz 256 ms. Eine mögliche Erklärung
ist eine geschwindigkeitsabhängige Modellglättung; das ist unbelegt. Die Datei blieb außerhalb des Repos.

## 31.10.2026 — Zweiter Gütetest, Wiederholbarkeit

Gleiche Einstellungen (Glättung an, Abstand im Menü 40 cm), aber andere Sitzposition: Irisbreite 35,9
statt 30,9 Bildpunkte, Lidwinkelabstand 0,201 statt 0,174. Die Person saß also rund 15 % näher an der
Kamera. Mindestens einer der beiden Abstände war damit nicht 40 cm, alle Grad beider Läufe stehen unter
diesem Vorbehalt.

| Größe (Mittel) | Lauf 1 | Lauf 2 |
|---|---|---|
| Neue Ziele h / v | 1,9° / 2,4° | 0,7° / 1,3° |
| Größter Fehler neue Ziele | 4,1° | 2,9° |
| Ruhe robust h / v | 0,95° / 2,1° | 0,29° / 1,49° |
| Bild-zu-Bild-Rauschen h | 0,09° | 0,04° |
| Lidschlag-Ausschläge | 9 | 2 |
| Blickfolge Gain langsam / schnell | 1,12 / 1,06 | 1,02 / 0,93 |
| Blickfolge Verzögerung langsam / schnell | 235 / 230 ms | 175 / 140 ms |
| Sakkaden h Gain, Latenz | 1,00, 256 ms | 0,94, 253 ms |
| Sakkaden v Gain | 1,13 | 1,60 |
| Abbildung Iris gegen Geometrie h / v | 57 % / 22 % | 88 % / 27 % |

Bewertung: Die Nähe ist der wahrscheinlichste Grund für die Verbesserung, belegt ist das nicht; auch
Licht, Lidöffnung und Blinzeln können sich geändert haben. Die reine Geometrie erklärt nur rund 16 % der
Änderung der Irisabbildung. Horizontal sind die Werte gut, die Vertikale ist nicht wiederholbar
(Sakkaden-Gain 1,13 gegen 1,60, nur vier Sprünge). Der Versatz rechts–links wechselte das Vorzeichen
(−1,9° gegen +0,8°), absolute Einzelaugenwerte sind also um einige Grad unsicher.

Nachprüfung beider Läufe: Eine Positionsabweichung von 1 Bildpunkt entspricht vertikal 5–9°, horizontal
2–3,5°. Bei einer Seitendifferenz-Sperre von 3° wären in Lauf 1 rund 19 % der Ruhebilder ausgesetzt, in
Lauf 2 0,7 %. In Lauf 2 hängen Irisbreite und Lidöffnung zusammen (Korrelation 0,90), die drei Ausreißer
liegen bei niedriger Lidöffnung (0,18 gegen 0,36), aber noch über der Sperrschwelle der Seite (0,14). Fast alle
Ruhebilder enthalten aber keine Lidsenkung, und die vertikale Position korreliert nur mit 0,12 mit
der Lidöffnung. Eine feste statt bildweiser Irisbreite änderte die Streuung in beiden Läufen praktisch
nicht; ein Eintrag des Lides über die Normierung ist damit keine Erklärung.

Die Hypothese zur Modellglättung bleibt offen: Die Verzögerung änderte sich trotz gleicher Einstellung
und ist bei schneller Bewegung nur in Lauf 2 kleiner. Ein Lauf ohne Glättung steht aus. Lauf 2 enthält
erstmals die Lidöffnung.

## 31.10.2026 — Dritter Gütetest, Modellglättung aus

Irisbreite 33,4 Bildpunkte, Menüabstand 40 cm, kein gemessener Abstand mitgeteilt. Die Seite war noch der
Stand vor den letzten Änderungen, deshalb fehlen Kopfereignisse, Ablehnungsgründe und Fehlerverstärkung.
Position also zwischen Lauf 1 und 2, der Vergleich ist kein reiner Einzelschritt. Der Kopf war ruhiger
(5 statt 14–19 Bildpunkte Spannweite).

| Größe | Lauf 2, Glättung an | Lauf 3, Glättung aus |
|---|---|---|
| Bild-zu-Bild-Differenz h / v | 0,04° / 0,08° | 0,48° / 0,89° |
| Ruhe SD h / v | 0,34° / 1,22° | 0,67° / 1,34° |
| Wandern, SD der 1-s-Mittel h / v | 0,23° / 1,08° | 0,31° / 0,57° |
| Neue Ziele h / v | 0,7° / 1,3° | 1,6° / 2,8° |
| Sakkaden-Anstieg 10–90 % | 133 ms | 34 ms |
| Blickfolge-Verzögerung langsam / schnell | 175 / 140 ms | 145 / 100 ms |
| Sakkaden-Gain h / v | 0,94 / 1,60 | 0,99 / 1,49 |

Die Kalibrierung fiel mit „Einzelwerte zu unruhig“ durch, obwohl die Prüffehler im Rahmen lagen: Die
Streuungsgrenze von 1,5° am unruhigsten Ziel passt nur zu geglätteten Daten. Die Zählung der
Aufholsakkaden ist ohne Glättung wertlos (7–18 je Zyklus), weil das Rauschen die Geschwindigkeitsschwelle
überschreitet. Die Glättung erklärt nur einen Teil der Blickfolge-Verzögerung; rund 100–145 ms bleiben.

Zentrierter Medianfilter, offline auf den Rohdaten von Lauf 3:

| Filter | Ruhe SD h | Bild-zu-Bild h | Sakkaden-Anstieg |
|---|---|---|---|
| keiner | 0,67° | 0,48° | 34 ms |
| Median 3 | 0,57° | 0,15° | 34 ms |
| Median 5 | 0,52° | 0,07° | 50 ms |
| Median 7 | 0,47° | 0,02° | 50 ms |
| gleitendes Mittel 5 | 0,47° | 0,12° | 134 ms |

Das spricht für Glättung aus plus Medianfilter: fast so ruhig wie die Modellglättung, Sprünge bleiben
erhalten. Belegt ist das an einem Lauf und offline. Live kommt beim Median 5 eine Verzögerung von rund
67 ms hinzu, die sich bei der Auswertung nach der Messung vermeiden lässt.

## 31.10.2026 — Neue Auswertung, an allen drei Läufen nachgerechnet

Median aus 5 Bildern, gemeinsame Zusammenführung, Freigabe je Achse, Seitendifferenz-Sperre 5°.

| Größe (Mittel) | Lauf 1 | Lauf 2 | Lauf 3 |
|---|---|---|---|
| Kalibrierung h | beide Augen | beide Augen | nur rechts |
| Kalibrierung v | beide Augen | beide Augen | beide Augen |
| Neue Ziele h / v | 1,3° / 2,4° | 0,7° / 1,2° | 1,3° / 2,5° |
| Ruhe robust h / v | 0,62° / 2,16° | 0,32° / 1,55° | 0,69° / 1,10° |
| Abdeckung h / v | 93 % / 98 % | 99 % / 99 % | 100 % / 100 % |
| Sakkaden-Endlage h / v | 0,98 / 1,13 | 0,96 / 1,61 | 0,84 / 1,49 |
| Bericht | horizontal nutzbar | horizontal nutzbar | horizontal nutzbar |

Alle drei Läufe ergeben: horizontal nutzbar, vertikal unzuverlässig. In Lauf 3 fiel das linke Auge horizontal
knapp durch (2,3° gegen die Grenze 2,0°). Die Endlage von 0,84 stammt daher vom rechten Auge allein; das
linke lag bei 1,16, das frühere einfache Mittel bei 0,99. Das spricht gegen zu frühes Aussortieren eines
Auges und muss an weiteren Läufen geprüft werden.

## 31.10.2026 — Umstellung auf Millisekunden

Filter (±70 ms), Datenmenge (330 ms) und Kopfgrenze (9 Irisdurchmesser je Sekunde) rechnen nun in Zeit. Alle
drei Läufe neu gerechnet: Bei 30 fps änderten sich nur zwei Werte um 0,01. `make test`: 60 von 60 bestanden.
Die Betriebsart mit 60 fps ist nur mit Testvideo und ohne echte Kamera geprüft.

## 31.10.2026 — Visueller Bericht

`make test`: 67 von 67 bestanden. `bericht.html` öffnete alle drei echten Läufe ohne Rechenfehler; alle drei
ergeben „horizontal nutzbar, vertikal unzuverlässig“. Die Dateien enthalten noch keine Kopfereignisse, Lauf 1
auch keine Lidwerte; der Bericht zeigt das als „nicht erfasst“. Der Weg über „Bericht ansehen“ nach einem echten
Lauf und die Druckausgabe sind noch nicht geprüft.

## 31.10.2026 — Vierter Gütetest und Hauptmessung Mittel

Glättung aus, Menüabstand 40 cm, Irisbreite 34,4 Bildpunkte. Mit Einzelaugen-Kalibrierung lief horizontal nur das
linke Auge, die Sakkaden-Endlage lag bei 1,26, das Mittel beider Augen bei 1,16.

| Lauf | Sakkaden h rechts / links / Mittel | Ruhe SD h rechts / links / Mittel | Prüffehler Mittel h / v |
|---|---|---|---|
| 1 | 0,98 / 1,03 / 1,00 | 1,52 / 1,69 / 1,03 | 0,8 / 1,1 |
| 2 | 0,88 / 1,00 / 0,93 | 0,44 / 0,51 / 0,31 | 1,1 / 1,6 |
| 3 | 0,84 / 1,16 / 0,97 | 0,74 / 0,86 / 0,52 | 1,0 / 1,3 |
| 4 | 1,08 / 1,26 / 1,16 | 0,85 / 0,65 / 0,61 | 1,2 / 1,2 |

Kalibrierung eines Laufs auf einen anderen übertragen, RMS an neuen Zielen: eigene 0,7–1,9° h und 1,3–3,5° v, fremde
1,1–4,4° h und 1,2–8,1° v, fremde mit Nullabgleich 1,1–4,5° h und 1,2–6,6° v.

Befundlogik an den vier Läufen (eine gesunde Testperson, nicht klinisch beurteilt): kein Spontannystagmus gemeldet,
kein falscher Treffer. Blickfolge-Gain 0,85–1,18. SWJ-Kandidaten mit Bestätigung beider Augen 3, 0, 6 und 9 je
Minute; 20 s sind dafür kurz. Die Nachweisgrenzen von 1,5° h und 3° v gelten nach dem Medianfilter. Ohne Glättung bleiben Sakkaden in der Blickfolge teils über der Arbeitsgrenze (Lauf 3).
Ob die Erkennung echten Nystagmus findet, ist nur an konstruierten Signalen geprüft, nie an einem echten Nystagmus.

## 31.10.2026 — OKN-Test H40, Trockenlauf

`make test`: 98 von 98 bestanden, darunter Ruhe, Rauschen, reiner Sinus, Antwort gegen die Reizrichtung und bekannter
Gain 0,4 bis 1,0. Trockenlauf mit simulierter Augenbewegung von 6 °/s: gemessen 6,1 und 6,0 °/s, Gain 0,76 und 0,75,
Schlagrichtung jeweils gegen den Reiz, keine Falschmeldung in der Kontrolle. Mit echten Augen noch nicht gelaufen.

## 31.10.2026 — Maßstab aus Sprüngen

An den vier Läufen, gegen die volle Kalibrierung: horizontal Faktor 0,98, 1,08, 1,03, 0,93, Zielfehler 1,2–2,8°;
vertikal Faktor 0,97, 0,70, 0,73, 1,12, Zielfehler 2,2–6,2°. Trockenlauf des Kurzlaufs dauerte 78 s.

## 31.10.2026 — Erster Kurzlauf, echte Augen

Ohne Kalibrierung, Menüabstand 40 cm, gemessener Abstand nicht mitgeteilt, Irisbreite 27,8 Bildpunkte, also weiter weg als
in den früheren Läufen. 100 % Abdeckung, keine Kopfmarke. Maßstab aus Sprüngen: horizontal 86 °/Irisdurchmesser, im
Bereich der früheren Kalibrierungen.

Primärposition und alle vier Blickrichtungen ohne Ruckmuster; das ist der erste echte Lauf des Blickhaltens, ohne
Falschmeldung. SWJ 1 in 16 s. Blickfolge Gain 1,06, 2,3 Sakkaden je Zyklus, über der Arbeitsgrenze; acht Sekunden sind dafür kurz.

**Optokinetik: kein Sägezahn nachweisbar.** Sprünge über 1° je 5,5 s: 5 rechts und 5 links bei Reiz nach rechts, 7 rechts und 9
links bei Reiz nach links. Mittlere Augengeschwindigkeit −0,4 und −2,4 °/s statt nahe +6 und −6 °/s. Die Rohkurve zeigt
unregelmäßiges Wandern. Die Erkennung hat damit noch immer keinen echten Nystagmus gesehen. Ob ein Reizproblem
(Dauer, Abstand, Aufgabe) oder eine Messgrenze vorliegt, ist offen; der ausführliche Lauf mit 12 s und Kontrolle steht aus.

Der erste Bericht nannte dazu „3 Schläge, 6,0 °/s“ aus zwei Phasen. Das war zu sicher formuliert; ohne einheitliche Richtung
gibt es nun keinen Wert mehr.

## 31.10.2026 — Zweiter Kurzlauf, echte Augen

Wieder Kurzlauf, kein ausführlicher Lauf. Menüabstand 40 cm, gemessener Abstand nicht mitgeteilt, Irisbreite 35,2 statt 27,8
Bildpunkte, also deutlich näher als im ersten Kurzlauf. 100 % Abdeckung, keine Kopfmarke. Maßstab aus Sprüngen 95 °/Irisdurchmesser.

Primärposition und alle Blickrichtungen ohne Ruckmuster, SWJ 2 in 16 s. Blickfolge glatt: Gain 1,02, 0,0 Sakkaden je Zyklus
statt 2,3. Das Ruherauschen wurde dabei nicht besser, robust 0,84° statt 0,70°; die Nähe erklärt die bessere Folge also nicht
sicher.

**Optokinetik: wieder kein Sägezahn.** Eine eigene Zerlegung nach Geschwindigkeit (schnell ab 30 °/s, dazwischen Regression) für
beide Kurzläufe, ohne Änderung am Code:

| Lauf, Block | Schnelle Sprünge rechts/links | Langsame Phasen |
|---|---|---|
| 1, Muster rechts | 0 / 1 | 0,0 und 0,0 °/s |
| 1, Muster links | 1 / 0 | −0,7 und 0,1 °/s |
| 2, Muster rechts | 0 / 1 | 0,0 und 0,1 °/s |
| 2, Muster links | 3 / 3 | 6 Abschnitte, 1 mit und 3 gegen den Reiz, Betrag bis 4,6 °/s |

**Einordnung:** Eine Messgrenze ist damit unwahrscheinlich. Dieselbe Messung folgte im selben Lauf einem Punkt mit bis zu 15,7 °/s
(10° bei 0,25 Hz) mit Gain 1,02; langsame Bewegung um 8 °/s wäre also sichtbar. Das Auge stand in den Streifenblöcken überwiegend
still. Plausibler ist deshalb, dass Reiz oder Aufgabe in dieser Form keinen OKN auslösen; 7 s sind zudem kurz. Bewiesen ist das
nicht, weil das Empfinden beim Lauf fehlt und der ausführliche Lauf mit 12 s und Kontrolle aussteht.

Im Block „Muster links“ von Lauf 2 meldet der Bericht 14 Sprünge, die Zerlegung nach Geschwindigkeit nur 6. Die großen Sprünge bis
11,8° in beide Richtungen sehen nach Blickwechseln aus, nicht nach Rückstellungen. `detectJumps` zählt dort vermutlich doppelt;
ungeprüft, für die Aussage „kein Sägezahn“ ohne Folgen.

## 31.10.2026 — Erster ausführlicher Lauf, echte Augen

Dauer 248 s ab Kalibrierung, vom Nutzer als sehr anstrengend beschrieben. Menüabstand 40 cm, gemessener Abstand nicht mitgeteilt,
Irisbreite 35–37 Bildpunkte. Kalibrierung freigegeben (Prüffehler 0,95°/1,31°), Bericht trotzdem „beide Achsen unzuverlässig“:
neue Ziele 3,5°/3,3°, schlimmstes Ziel 9,5°. Primärposition, Blickrichtungen und SWJ ohne Befund. Blickfolge Gain 0,96 und 0,98,
schnell 4,3 Sakkaden je Zyklus. Sakkaden rechts und links metrisch (1,03–1,07), vertikal nicht beurteilbar.

**Kopf und Nullpunkt wandern.** Die Kopfposition im Bild sank stetig von y 390 auf 455 Bildpunkte, x von 684 auf 700. Kopfmarken ab 110 s.
Der Blick auf die Mitte wanderte mit:

| Zeitpunkt | h | v |
|---|---|---|
| Ruhe, 57 s | −0,3° | 0,5° |
| OKN Ausgangslage, 198 s | 0,9° | 2,1° |
| OKN Kontrolle, 240 s | 2,0° | 5,7° |

Eine Kalibrierung gilt damit nur am Anfang, vertikal besonders. Ein zweiter Fehler ist nicht durch diese Wanderung erklärt: Ziele
rechts lagen schon bei 80 s zu weit außen und zu hoch (Soll 15/0, Ist 19,6/5,6; bei 134 s Soll 10/7, Ist 17,3/13,2), links und unten
stimmten sie. Ursache offen.

**Optokinetik: weiter kein Sägezahn, aber ein wiederholbarer Hinweis.**

| Block | Schnelle Sprünge rechts/links | Langsame Abschnitte |
|---|---|---|
| Muster rechts | 1 / 1 | um 0 °/s |
| Muster links | 7 / 1, Schlagrichtung passt zum Reiz | meist −0,4 bis −1,0 °/s, also Gain um 0,1 |
| Kontrolle mit Punkt | 0 / 0 | 0,2 °/s über 7 s |

Die Zerlegung erfasst nur Sprünge ab etwa 3° je 100 ms, kleinere Schläge bleiben ihr verborgen. `detectJumps` findet in denselben
Blöcken mehr Sprünge, bei Muster rechts aber in beide Richtungen gleich viele, auch das ist kein Sägezahn.
Die mittlere Augengeschwindigkeit lag in allen drei Läufen bei Muster links in Reizrichtung (−2,4, −2,5, −1,9 °/s), bei Muster rechts
nahe null (−0,4, 0,6, 0,5 °/s). Das kann eine schwache Antwort oder eine Folge der festen Reihenfolge sein; rechts kam immer zuerst.
In der Kontrolle ruhte das Auge, und die Messung zeigte trotz Muster Ruhe. Das spricht in diesem Lauf gegen ein Streifenartefakt, ist aber
kein validierter Ausschluss.

**Rechnerische Kürzung am selben Lauf:** Ruhe 12 statt 20 s ergibt bessere Streuung (0,59°/0,99° statt 0,82°/1,63°; vertikal kippt es ab
10 s), aber SWJ nicht beurteilbar. Blickhalten 4 statt 7 s ändert nichts. Blickfolge 8 statt 16 s kippt auf grenzwertig. Die
horizontalen Sakkaden bleiben mit den ersten acht Sprüngen gleich. Kalibrierfenster 2,0 statt 2,8 s: Prüffehler 0,98°/1,41°, vertikal
keine Freigabe mehr, also nicht kürzen. Gültig nur für diesen einen Lauf ohne Nystagmus.

## 01.11.2026 — Erster Lauf der App aus `app/`, MacBook-Kamera

Kurzlauf in Chrome, FaceTime HD, nach Etappe 1 des Produktplans. Eingestellt 40 cm, Abstand nicht gemessen. Eine Person, Vergleich mit den Kurzläufen vom 31.10.

| Kennwert | 31.10., zwei Läufe | 01.11. |
|---|---:|---:|
| Ausgehandelt | 1280×720, 30 fps | 1280×720, 30 fps |
| Bildabstand, Median | 33,3 ms | 33,3 ms |
| Bildabstand, Spanne der mittleren 90 % | 31,5–35,2 ms | 32,5–34,5 ms |
| Bilder mit beiden Augen | 100 % | 99,9 % |
| Irisdurchmesser | 30–35 px | 32 px |
| Rauschen je Bild, Irisdurchmesser | 0,0048–0,0061 | 0,0051 |
| Rauschen je Bild, grob horizontal, vertikal | 0,45–0,52°, 0,69–0,82° | 0,42°, 0,77° |
| Bildwiederholungen | 0 | 0 |

**Der Umbau ändert die Messung sichtbar nicht.** Das Server-Protokoll zeigt Laufzeit und Modell aus `vendor/`; einziger Fehler ist das fehlende Seitensymbol. Der Bericht rechnet ohne Fehler, Blickfolge glatt
mit Gain 1,06 und 1,2 Sakkaden je Zyklus.

**Etappen erstmals am echten Gesicht:** 5 Etappen, keine Wiederholung, Wartezeit auf den Karten 2–5 s. Der Kopf wanderte von 0,7 auf 2,5 Irisdurchmesser, mit einer Kopfmarke, aber ohne Abbruch.
Die Frage nach der Anstrengung wurde übersprungen.

## 01.11.2026 — Stellung beider Augen im ausführlichen Lauf

Nachrechnung aus dem Lauf vom 31.10., kalibriert, eine Person ohne bekannte Fehlstellung, ruhiger Blick 16 s. Differenz rechtes minus linkes Auge.

| Achse | Rauschen je Bild | Mittel je Sekunde, Streuung | Spanne dieser Mittel |
|---|---:|---:|---:|
| Horizontal | 0,82° | 0,91° | 3,2° |
| Vertikal | 0,76° | 0,82° | 2,8° |

Vertikaler Median zu drei Zeitpunkten: +0,09° zu Beginn, +0,86° in Ruhe, −1,07° vor der Optokinetik. Mitteln beseitigt also nicht alles, die Differenz wandert. Kleine Fehlstellungen sind so nicht von Messfehlern zu trennen.

## 01.11.2026 — Erkennung im Worker, ohne echtes Gesicht

Chrome ohne Fenster mit Kunstkamera, 20 fps, Bild ohne Gesicht. Worker 19,0–19,3 Analysen/s bei 9,2–9,7 ms, Hauptthread (`?hauptthread`) 20,0 Analysen/s bei 8,0 ms. Trockenlauf-Kurzlauf: alle Phasen gefüllt, Bilder in richtiger Reihenfolge.
Das sagt nichts über Rauschen oder Takt mit echtem Gesicht; der Vergleichslauf steht aus. Safari ist nicht geprüft.

## 01.11.2026 — Vergleich Hauptthread gegen Worker, echtes Gesicht

Zwei Kurzläufe in Chrome, MacBook-Kamera, eine Person, wenige Minuten auseinander. Eingestellt 40 cm, Abstand nicht gemessen. Ein Paar, also nur ein erster Hinweis.

| Kennwert | Hauptthread | Worker |
|---|---:|---:|
| Bilder im Lauf | 1913 | 1897 |
| Abstände über 50 ms | 44 von 1903, 2,3 % | 58 von 1887, 3,1 % |
| Vom Programm verworfene Bilder, ganze Kamerazeit | nicht erfasst | 91 |
| Bilder mit beiden Augen | 99,9 % | 99,8 % |
| Irisdurchmesser | 32 px | 35 px |
| Rauschen je Bild, Irisdurchmesser | 0,0051 | 0,0047 |
| Rauschen je Bild, grob horizontal, vertikal | 0,42°, 0,77° | 0,39°, 0,70° |
| Blickfolge, Gain | 1,06 | 0,97 |

**Der Worker verschlechtert die Messung nicht erkennbar.** Rauschen gleich oder knapp besser, Aussetzer ähnlich. Die Aussetzer kommen in beiden Läufen gebündelt in einzelnen Phasen, bei wechselnden Aufgaben: im ersten Lauf Blickfolge 13 und Sprünge 31, im zweiten Ruhe 40 und Blickfolge 17.
Die Streifen liefen beide Male ohne Lücke. Die Ursache ist offen. Der Worker hat sie nicht beseitigt, die Hauptthread-Erkennung ist also nicht die alleinige Ursache. Die Lücken betragen rund 66 ms, also ein fehlendes Bild.

## 01.11.2026 — Neue Oberfläche, nur Trockenlauf

Chrome ohne Fenster, Trockenlauf und Kunstkamera, kein echtes Gesicht. Module Blickfolge und Sakkaden nacheinander: Maßstabsetappe nur beim ersten Modul, beide landen im Bericht, der Rest steht als nicht untersucht. Die geparkte Kamera in der Seitenleiste lief weiter (19,7–20,0 Analysen/s bei 20 fps), keine Abrufe nach außen. Ein Lauf am echten Gesicht steht aus, ebenso die Prüfung der Maßstabsetappe mit nur sieben Sprüngen.

## 01.11.2026 — Kurze Kalibrierung, Nachrechnung am ausführlichen Lauf

Nachrechnung eines einzigen Laufs vom 31.10., eine Person, Kopf wanderte im Lauf. Neue Ziele: sechs Punkte, die nicht in die Kalibrierung eingingen. Die kurze Fassung wurde aus demselben Lauf herausgeschnitten, nicht echt gemessen.

| Variante | Prüffehler h / v | Neue Ziele RMS h / v | Gain langsam / schnell |
|---|---:|---:|---:|
| 8 Lern- und 6 Prüfpunkte, je 2,8 s | 0,95° / 1,31° | 3,48° / 3,34° | 1,01 / 0,99 |
| 5 Lern- und 3 Prüfpunkte, je 1,1 s | 0,43° / 1,94° | 3,15° / 2,48° | 0,99 / 0,98 |
| Grober Maßstab aus Sprüngen, ohne Kalibrierung | – | 2,60° / 2,22° | 0,96 / 0,95 |

**Die kurze Fassung ist hier nicht schlechter.** Gebaut sind deshalb 8 Punkte mit rund 18 s statt rund 75 s. Der grobe Maßstab war an neuen Zielen sogar genauer als jede Kalibrierung. Das ist ein Hinweis, kein Beweis: ein Lauf, und der Kopf bewegte sich, was spätere Ziele benachteiligt. Der Prüffehler der kurzen Fassung ruht auf nur drei Punkten. Eine echte Messreihe steht als B7 im Backlog.

## 01.11.2026 — Warum die Blickfolge streng ausfiel

Sitzung 08:46 mit Kalibrierung (Prüffehler horizontal 1,57°), Blickfolge ±15°, 0,2 und 0,4 Hz, Vergleich mit früheren Läufen bei ±10°. Eine Person, Kopf von Bild zu Bild ruhig.

| Lauf | Spitzen­geschwindigkeit | Gain aus Amplitude | glatter Gain | Sakkaden je Zyklus | Rest um den Sinus |
|---|---:|---:|---:|---:|---:|
| ±15°, 0,2 Hz | 18,8 °/s | 0,79 | 0,70 | 3,2 | 1,55° |
| ±15°, 0,4 Hz | 37,7 °/s | 0,83 | 0,68 | 4,3 | 1,65° |
| ±10°, 0,25 Hz | 15,7 °/s | 1,01 | 0,96 | 1,3 | 0,88° |
| ±10°, 0,5 Hz | 31,4 °/s | 1,01 | 0,98 | 4,3 | 1,21° |

Die breitere Bahn senkte den Gain deutlich. Ob das Auge wirklich nicht folgte oder die Messung am Rand nachgibt, trennen diese Läufe nicht. Geändert: ±12° bei 0,2 und 0,4 Hz, also 15,1 und 30,2 °/s wie in den guten Läufen. Arbeitsgrenzen großzügiger: Blickfolge Gain 0,7 und 0,5, Sakkaden 4 und 7 je Zyklus; Sakkaden 0,75 bis 1,25 normal, 0,6 bis 1,4 Tendenz. Die Vertikale hatte im alten Lauf nur zwei Sprünge je Richtung, bei drei nötigen, darum „nichts“; das Modul hat nun vier je Richtung, und sie zählt höchstens als Tendenz, solange sie unsicher ist. Ohne Kalibrierung wird die erste Landung bewertet, weil der Maßstab aus den Endlagen stammt.
