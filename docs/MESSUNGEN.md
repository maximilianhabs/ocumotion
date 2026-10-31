# Messungen

Laufendes Protokoll. Es bleibt die Auswertung, nie das Bildmaterial.

## 31.10.2026 — Kameramodi

Mit `make kamera`, ohne die Kamera zu öffnen.

| Kamera | Auflösung | Bildrate |
|---|---|---|
| FaceTime HD (MacBookPro17,1) | 1280×720, 640×480 | fest 30 fps |
| iPhone 17 Pro Max, Kontinuitätskamera | 640×480 bis 1920×1440 | bis 60 fps |

Das sind die vom System gemeldeten Modi. Die tatsächliche Bildrate ist noch nicht gemessen.

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
